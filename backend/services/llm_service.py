import asyncio
import json
import logging
import re
from openai import AsyncOpenAI
from core.config import settings

logger = logging.getLogger(__name__)

# Global semaphore to limit concurrent LLM calls (prevents rate limit spikes)
_LLM_SEMAPHORE = asyncio.Semaphore(2)


class LLMServiceError(Exception):
    """Raised when all configured LLM providers fail or are unavailable."""
    pass


class UnifiedLLMClient:
    """
    Provides a resilient multi-provider fallback mechanism for chat completions:
    Gemini -> Groq -> OpenRouter (free) -> Cohere -> NVIDIA -> Together
    """

    def __init__(self):
        self.providers = []
        timeout_config = getattr(settings, "LLM_TIMEOUT", 30.0)

        # Provider priority order: generous free tiers first, then specialized fallbacks.
        if settings.GEMINI_API_KEY:
            # AI Studio auth keys (AQ.…) require x-goog-api-key header; send both api_key and header.
            gemini_model = getattr(settings, "GEMINI_MODEL", "") or "gemini-2.0-flash"
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.GEMINI_API_KEY,
                    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                    default_headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": gemini_model,
                "name": "Gemini",
            })

        if settings.GROQ_API_KEY:
            # Valid Groq model name: llama-3.3-70b-versatile
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.GROQ_API_KEY,
                    base_url="https://api.groq.com/openai/v1",
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": "llama-3.3-70b-versatile",
                "name": "Groq",
            })

        if settings.OPENROUTER_API_KEY:
            openrouter_model = getattr(settings, "OPENROUTER_FREE_MODEL", "") or "meta-llama/llama-3.3-70b-instruct:free"
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.OPENROUTER_API_KEY,
                    base_url="https://openrouter.ai/api/v1",
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": openrouter_model,
                "name": "OpenRouter",
            })

        if settings.COHERE_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.COHERE_API_KEY,
                    base_url="https://api.cohere.ai/compatibility/v1",
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": "command-r-08-2024",
                "name": "Cohere",
            })

        if settings.NVIDIA_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.NVIDIA_API_KEY,
                    base_url="https://integrate.api.nvidia.com/v1",
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": "meta/llama-3.3-70b-instruct",
                "name": "NVIDIA",
            })

        if settings.TOGETHER_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(
                    api_key=settings.TOGETHER_API_KEY,
                    base_url="https://api.together.xyz/v1",
                    timeout=timeout_config,
                    max_retries=0,
                ),
                "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                "name": "Together",
            })

    async def generate_text(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        model: str = "",
        json_mode: bool = False,
    ) -> str:
        if not self.providers:
            raise LLMServiceError("No LLM providers configured. Set at least one AI API key.")

        async with _LLM_SEMAPHORE:
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ]

            last_error = None
            for provider in self.providers:
                try:
                    logger.info(f"[LLM] Attempting generation with {provider['name']}...")
                    use_model = model if model else provider["model"]
                    kwargs = {
                        "model": use_model,
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 2048,
                    }
                    if json_mode:
                        kwargs["response_format"] = {"type": "json_object"}

                    response = await provider["client"].chat.completions.create(**kwargs)
                    content = response.choices[0].message.content
                    if content:
                        logger.info(f"[LLM] Success with {provider['name']}.")
                        return content
                    logger.warning(f"[LLM] {provider['name']} returned empty content, trying next.")
                except Exception as e:
                    logger.warning(f"[LLM] {provider['name']} failed: {e}")
                    last_error = e

            logger.error(f"[LLM] All providers failed. Last error: {last_error}")
            raise LLMServiceError(
                "Our AI service is temporarily unavailable. Please try again shortly."
            )

    async def generate_text_stream(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        model: str = "",
    ):
        if not self.providers:
            raise LLMServiceError("No LLM providers configured. Set at least one AI API key.")

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt},
        ]

        last_error = None
        for provider in self.providers:
            try:
                logger.info(f"[LLM] Attempting stream with {provider['name']}...")
                use_model = model if model else provider["model"]
                response = await provider["client"].chat.completions.create(
                    model=use_model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=2048,
                    stream=True,
                )
                async for chunk in response:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                logger.info(f"[LLM] Success with {provider['name']} stream.")
                return
            except Exception as e:
                logger.warning(f"[LLM] {provider['name']} stream failed: {e}")
                last_error = e

        logger.error(f"[LLM] All stream providers failed. Last error: {last_error}")
        raise LLMServiceError(
            "Our AI service is temporarily unavailable. Please try again shortly."
        )

    async def check_providers(self) -> list[dict]:
        """Ping every configured provider once; used by the admin health endpoint."""
        import time

        async def ping(provider: dict) -> dict:
            started = time.monotonic()
            try:
                response = await provider["client"].chat.completions.create(
                    model=provider["model"],
                    messages=[{"role": "user", "content": "Reply with OK."}],
                    max_tokens=100,
                )
                reply = (response.choices[0].message.content or "").strip()
                return {
                    "name": provider["name"],
                    "model": provider["model"],
                    "ok": True,
                    "reply": reply[:50],
                    "ms": int((time.monotonic() - started) * 1000),
                }
            except Exception as e:
                return {
                    "name": provider["name"],
                    "model": provider["model"],
                    "ok": False,
                    "error": str(e)[:300],
                    "ms": int((time.monotonic() - started) * 1000),
                }

        return await asyncio.gather(*(ping(p) for p in self.providers))


llm_client = UnifiedLLMClient()


async def generate_completion(
    prompt: str,
    system_message: str = "You are a helpful assistant.",
    model: str = "",
    json_mode: bool = False,
) -> str:
    """Generate completion using configured failover providers without outer retry storms."""
    return await llm_client.generate_text(prompt, system_message, model=model, json_mode=json_mode)


async def generate_completion_stream(
    prompt: str,
    system_message: str = "You are a helpful assistant.",
    model: str = "",
):
    """Generate streaming completion using configured failover providers."""
    async for chunk in llm_client.generate_text_stream(prompt, system_message, model=model):
        yield chunk
