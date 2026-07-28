import logging
import json
import re
import asyncio
from openai import AsyncOpenAI
from core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

# Global semaphore to limit concurrent LLM calls (prevents Groq free-tier 429s)
_LLM_SEMAPHORE = asyncio.Semaphore(2)

class UnifiedLLMClient:
    """
    Provides a fallback mechanism for chat completions:
    Groq -> Together AI -> OpenRouter -> NVIDIA LLaMA (Original)
    """
    
    def __init__(self):
        self.providers = []
        
        timeout_config = settings.LLM_TIMEOUT
        
        if settings.GROQ_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1", timeout=timeout_config),
                "model": "llama-3.3-70b-versatile",
                "name": "Groq"
            })
        if settings.TOGETHER_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.TOGETHER_API_KEY, base_url="https://api.together.xyz/v1", timeout=timeout_config),
                "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                "name": "Together"
            })
        if settings.OPENROUTER_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1", timeout=timeout_config),
                "model": "meta-llama/llama-3.3-70b-instruct",
                "name": "OpenRouter"
            })
        # Legacy fallback
        if settings.NVIDIA_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.NVIDIA_API_KEY, base_url="https://integrate.api.nvidia.com/v1", timeout=timeout_config),
                "model": "meta/llama-3.1-70b-instruct",
                "name": "NVIDIA"
            })

    async def generate_text(self, prompt: str, system_message: str = "You are a helpful assistant.", model: str = "", json_mode: bool = False) -> str:
        if not self.providers:
            raise ValueError("No LLM providers configured. Set at least one API key.")

        async with _LLM_SEMAPHORE:
            messages = [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
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
                    # Groq, Together, and OpenRouter support JSON mode via response_format
                    if json_mode:
                        kwargs["response_format"] = {"type": "json_object"}
                    response = await provider["client"].chat.completions.create(**kwargs)
                    content = response.choices[0].message.content
                    logger.info(f"[LLM] Success with {provider['name']}.")
                    return content
                except Exception as e:
                    logger.warning(f"[LLM] {provider['name']} failed: {e}")
                    last_error = e

            raise ValueError(f"All LLM providers failed. Last error: {last_error}")

    async def generate_text_stream(self, prompt: str, system_message: str = "You are a helpful assistant.", model: str = ""):
        if not self.providers:
            raise ValueError("No LLM providers configured. Set at least one API key.")

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
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
                    stream=True
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

        raise ValueError(f"All LLM providers failed. Last error: {last_error}")

llm_client = UnifiedLLMClient()

@retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=1, max=5))
async def generate_completion(prompt: str, system_message: str = "You are a helpful assistant.", model: str = "", json_mode: bool = False) -> str:
    return await llm_client.generate_text(prompt, system_message, model=model, json_mode=json_mode)

async def generate_completion_stream(prompt: str, system_message: str = "You are a helpful assistant.", model: str = ""):
    async for chunk in llm_client.generate_text_stream(prompt, system_message, model=model):
        yield chunk
