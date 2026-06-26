"""
app/services/llm_client.py

A thin, retry-wrapped client around the Featherless AI API
(OpenAI-compatible). This is the only place in the service that
knows the API key or the base URL.

All other services call `LLMClient.chat()` or `LLMClient.chat_json()`.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx
from openai import AsyncOpenAI, APIStatusError, APITimeoutError, APIConnectionError
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)

from app.config import get_settings

logger = logging.getLogger(__name__)

# Exceptions worth retrying
_RETRYABLE = (APITimeoutError, APIConnectionError)


def _build_openai_client() -> AsyncOpenAI:
    cfg = get_settings()
    return AsyncOpenAI(
        api_key=cfg.featherless_api_key,
        base_url=cfg.featherless_base_url,
        timeout=httpx.Timeout(60.0, connect=10.0),
        max_retries=0,  # We handle retries via tenacity for better control
    )


class LLMClient:
    """
    Singleton-ish wrapper. Instantiate once at startup (via dependency injection)
    and inject where needed.
    """

    def __init__(self) -> None:
        self._client = _build_openai_client()
        cfg = get_settings()
        self.chat_model = cfg.featherless_chat_model
        self.advisory_model = cfg.featherless_advisory_model
        self.temperature = cfg.llm_temperature
        self.max_tokens = cfg.llm_max_tokens
        self.advisory_max_tokens = cfg.llm_advisory_max_tokens

    @retry(
        retry=retry_if_exception_type(_RETRYABLE),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """
        Send a chat completion and return the assistant text content.

        Args:
            system_prompt: Sets the model's persona and output rules.
            user_prompt: The task-specific content.
            model: Override the default chat model.
            temperature: Override the default temperature.
            max_tokens: Override the default token limit.

        Returns:
            The raw assistant message text.
        """
        response = await self._client.chat.completions.create(
            model=model or self.chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature if temperature is not None else self.temperature,
            max_tokens=max_tokens or self.max_tokens,
        )
        content = response.choices[0].message.content or ""
        return content.strip()

    async def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> dict[str, Any]:
        """
        Like `chat()` but guarantees a parsed dict back.
        The system prompt must instruct the model to return ONLY JSON.

        Raises:
            ValueError: if the response cannot be parsed as JSON after cleanup.
        """
        raw = await self.chat(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return _parse_json_response(raw)

    async def advisory_chat(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> dict[str, Any]:
        """Convenience wrapper that uses the heavier advisory model."""
        return await self.chat_json(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model=self.advisory_model,
            max_tokens=self.advisory_max_tokens,
        )


# ── JSON cleanup helpers ──────────────────────────────────────────────

def _parse_json_response(raw: str) -> dict[str, Any]:
    """
    Normalise a model response down to a parsed JSON dict.

    Handles three things LLMs do that break json.loads:
      1. Reasoning models (Qwen3, DeepSeek-R1, ...) prepend a
         <think>...</think> chain-of-thought before the answer.
      2. Models wrap JSON in ```json ... ``` fences.
      3. Models add a sentence of preamble before/after the object.
    """
    # 1. Drop any <think>...</think> reasoning block(s) (non-greedy, any case).
    cleaned = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE)
    # A reasoning model can also emit an *unclosed* <think> (truncated before it
    # closed) followed by nothing useful; strip a leading open tag defensively.
    cleaned = re.sub(r"^\s*<think>", "", cleaned, flags=re.IGNORECASE).strip()

    # 2. Strip markdown code fences.
    cleaned = re.sub(r"```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "").strip()

    # 3a. Try direct parse first.
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3b. Attempt to extract the first JSON object or array.
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", cleaned)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    logger.error("Failed to parse LLM response as JSON.\nRaw:\n%s", raw)
    raise ValueError(f"LLM did not return valid JSON. Raw response (first 300 chars): {raw[:300]}")
