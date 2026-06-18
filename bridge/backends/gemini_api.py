"""Gemini API translation backend."""

from __future__ import annotations

import logging

import httpx

from backends.base import TranslationBackend
from config import config
from models import ChatCompletionRequest


logger = logging.getLogger(__name__)


def _content_from_messages(request: ChatCompletionRequest) -> tuple[str | None, list[dict]]:
    system_prompt: str | None = None
    contents: list[dict] = []

    for message in request.messages:
        if message.role == "system":
            system_prompt = message.content
            continue

        role = "model" if message.role == "assistant" else "user"
        contents.append({
            "role": role,
            "parts": [{"text": message.content}],
        })

    return system_prompt, contents


class GeminiAPIBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        if not config.GEMINI_API_KEY:
            raise ValueError("Gemini API key is not configured. Set GEMINI_API_KEY.")

        model = request.model
        if model.startswith("gemini/"):
            model = model[len("gemini/"):]
        elif model == "gemini":
            model = "gemini-2.5-flash"

        system_prompt, contents = _content_from_messages(request)
        if not contents:
            raise ValueError("messages must include at least one non-system message for Gemini API.")

        payload: dict = {"contents": contents}
        generation_config: dict = {}
        if request.temperature is not None:
            generation_config["temperature"] = request.temperature
        if request.max_tokens is not None:
            generation_config["maxOutputTokens"] = request.max_tokens
        if generation_config:
            payload["generationConfig"] = generation_config
        if system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": system_prompt}]}

        url = f"{config.GEMINI_BASE_URL}/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": config.GEMINI_API_KEY,
        }

        logger.info(f"[{self.name}] sending request to Gemini API | model={model}")

        async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except Exception as e:
                raise RuntimeError(f"Unable to connect to Gemini API: {e}")

        if response.status_code != 200:
            err_msg = f"Gemini API returned {response.status_code}: {response.text}"
            logger.error(err_msg)
            raise RuntimeError(err_msg)

        try:
            data = response.json()
            parts = data["candidates"][0]["content"]["parts"]
            return "".join(str(part.get("text", "")) for part in parts).strip()
        except (KeyError, IndexError, ValueError, TypeError) as e:
            raise RuntimeError(f"Failed to parse Gemini API response: {e} | response: {response.text[:200]}")

    @property
    def name(self) -> str:
        return "gemini-api"
