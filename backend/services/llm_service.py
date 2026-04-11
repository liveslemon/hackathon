import logging
import json
import re
from openai import AsyncOpenAI
from core.config import settings
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class UnifiedLLMClient:
    """
    Provides a fallback mechanism for chat completions:
    Groq -> Together AI -> OpenRouter -> NVIDIA LLaMA (Original)
    """
    
    def __init__(self):
        self.providers = []
        
        # We set an aggressive timeout to ensure it cycles through fallbacks rapidly instead of hanging
        timeout_config = 10.0
        
        if settings.GROQ_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1", timeout=timeout_config),
                "model": "llama-3.3-70b-versatile",
                "name": "Groq"
            })
        if settings.TOGETHER_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.TOGETHER_API_KEY, base_url="https://api.together.xyz/v1", timeout=timeout_config),
                "model": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                "name": "Together"
            })
        if settings.OPENROUTER_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1", timeout=timeout_config),
                "model": "meta-llama/llama-3.1-8b-instruct:free",
                "name": "OpenRouter"
            })
        # Legacy fallback
        if settings.NVIDIA_API_KEY:
            self.providers.append({
                "client": AsyncOpenAI(api_key=settings.NVIDIA_API_KEY, base_url="https://integrate.api.nvidia.com/v1", timeout=timeout_config),
                "model": "meta/llama-3.1-70b-instruct",
                "name": "NVIDIA"
            })

    async def generate_text(self, prompt: str, system_message: str = "You are a helpful assistant.", model: str = "") -> str:
        if not self.providers:
            logger.warning("[AI/LLM] No API keys provided. Returning mock response.")
            return "Placeholder Generation (No API Key Configured)."

        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ]

        last_error = None
        for provider in self.providers:
            try:
                logger.info(f"[LLM] Attempting generation with {provider['name']}...")
                use_model = model if model else provider["model"]
                response = await provider["client"].chat.completions.create(
                    model=use_model,
                    messages=messages,
                    temperature=0.3,
                    max_tokens=600
                )
                content = response.choices[0].message.content
                logger.info(f"[LLM] Success with {provider['name']}.")
                return content
            except Exception as e:
                logger.warning(f"[LLM] {provider['name']} failed: {e}")
                last_error = e

        raise ValueError(f"All LLM providers failed. Last error: {last_error}")

llm_client = UnifiedLLMClient()

@retry(stop=stop_after_attempt(1))
async def generate_completion(prompt: str, system_message: str = "You are a helpful assistant.", model: str = "") -> str:
    return await llm_client.generate_text(prompt, system_message, model=model)
