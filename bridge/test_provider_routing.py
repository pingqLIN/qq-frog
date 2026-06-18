"""Smoke checks for the approved PDF translation provider routing."""

from __future__ import annotations

from models import ChatCompletionRequest, ChatMessage
from server import resolve_backend


def _request(model: str) -> ChatCompletionRequest:
    return ChatCompletionRequest(
        model=model,
        messages=[ChatMessage(role="user", content="Hello")],
    )


def main() -> None:
    expected = {
        "chrome-gemini": "chrome-ai",
        "lm-studio/local-model": "lm-studio",
        "openai/gpt-5-mini": "openai",
        "gemini/gemini-2.5-flash": "gemini-api",
    }

    for model, backend_name in expected.items():
        backend = resolve_backend(_request(model).model)
        assert backend.name == backend_name, f"{model} routed to {backend.name}, expected {backend_name}"

    try:
        resolve_backend("deepseek-chat")
    except ValueError:
        pass
    else:
        raise AssertionError("Unsupported provider should raise ValueError")

    print("provider routing ok")


if __name__ == "__main__":
    main()
