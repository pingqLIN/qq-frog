"""Smoke checks for the approved PDF translation provider routing."""

from __future__ import annotations

from fastapi.testclient import TestClient

from models import ChatCompletionRequest, ChatMessage
from server import app, resolve_backend


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

    client = TestClient(app)
    model_ids = [model["id"] for model in client.get("/v1/models").json()["data"]]
    assert model_ids == [
        "chrome-gemini",
        "lm-studio/local-model",
        "openai/gpt-5-mini",
        "gemini/gemini-2.5-flash",
    ]

    print("provider routing ok")


if __name__ == "__main__":
    main()
