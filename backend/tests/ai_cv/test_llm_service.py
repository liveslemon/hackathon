from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from services.llm_service import (
    LLMServiceError,
    UnifiedLLMClient,
    generate_completion,
)


@pytest.mark.anyio
async def test_llm_no_providers_configured_raises_error():
    """Verify UnifiedLLMClient raises LLMServiceError when no providers are configured."""
    client = UnifiedLLMClient()
    client.providers = []
    with pytest.raises(LLMServiceError, match="No LLM providers configured"):
        await client.generate_text("Hello")


@pytest.mark.anyio
async def test_llm_first_provider_success():
    """Verify first provider success returns immediately and stops failover."""
    client = UnifiedLLMClient()

    p1 = MagicMock()
    p1_response = MagicMock()
    p1_response.choices = [MagicMock(message=MagicMock(content="Response from Provider 1"))]
    p1.chat.completions.create = AsyncMock(return_value=p1_response)

    p2 = MagicMock()
    p2.chat.completions.create = AsyncMock()

    client.providers = [
        {"name": "Gemini", "client": p1, "model": "gemini-2.0-flash"},
        {"name": "Groq", "client": p2, "model": "llama-3.3-70b-versatile"},
    ]

    result = await client.generate_text("Test prompt")
    assert result == "Response from Provider 1"
    p1.chat.completions.create.assert_called_once()
    p2.chat.completions.create.assert_not_called()


@pytest.mark.anyio
async def test_llm_failover_on_provider_error():
    """Verify first provider failure fails over gracefully to second provider."""
    client = UnifiedLLMClient()

    p1 = MagicMock()
    p1.chat.completions.create = AsyncMock(side_effect=Exception("API rate limit exceeded"))

    p2 = MagicMock()
    p2_response = MagicMock()
    p2_response.choices = [MagicMock(message=MagicMock(content="Response from Provider 2"))]
    p2.chat.completions.create = AsyncMock(return_value=p2_response)

    client.providers = [
        {"name": "Gemini", "client": p1, "model": "gemini-2.0-flash"},
        {"name": "Groq", "client": p2, "model": "llama-3.3-70b-versatile"},
    ]

    result = await client.generate_text("Test prompt")
    assert result == "Response from Provider 2"
    p1.chat.completions.create.assert_called_once()
    p2.chat.completions.create.assert_called_once()


@pytest.mark.anyio
async def test_llm_all_providers_failed_raises_user_friendly_error():
    """Verify all providers failing raises clean user-friendly LLMServiceError."""
    client = UnifiedLLMClient()

    p1 = MagicMock()
    p1.chat.completions.create = AsyncMock(side_effect=Exception("503 Service Unavailable"))

    p2 = MagicMock()
    p2.chat.completions.create = AsyncMock(side_effect=Exception("401 Unauthorized"))

    client.providers = [
        {"name": "Gemini", "client": p1, "model": "gemini-2.0-flash"},
        {"name": "Groq", "client": p2, "model": "llama-3.3-70b-versatile"},
    ]

    with pytest.raises(LLMServiceError, match="temporarily unavailable"):
        await client.generate_text("Test prompt")


@pytest.mark.anyio
async def test_llm_json_mode_parameter_passed():
    """Verify json_mode=True passes response_format={'type': 'json_object'}."""
    client = UnifiedLLMClient()

    p1 = MagicMock()
    p1_response = MagicMock()
    p1_response.choices = [MagicMock(message=MagicMock(content='{"status": "ok"}'))]
    p1.chat.completions.create = AsyncMock(return_value=p1_response)

    client.providers = [
        {"name": "Gemini", "client": p1, "model": "gemini-2.0-flash"},
    ]

    await client.generate_text("Extract JSON", json_mode=True)
    call_kwargs = p1.chat.completions.create.call_args[1]
    assert call_kwargs.get("response_format") == {"type": "json_object"}


@pytest.mark.anyio
async def test_generate_completion_wrapper():
    """Verify generate_completion function routes to UnifiedLLMClient."""
    with patch("services.llm_service.llm_client.generate_text", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = "Mocked LLM completion"
        res = await generate_completion("My prompt")
        assert res == "Mocked LLM completion"
        mock_gen.assert_called_with("My prompt", "You are a helpful assistant.", model="", json_mode=False)
