"""Smoke check for full PDF upload translation route wiring."""

from __future__ import annotations

from fastapi.testclient import TestClient

import server
from backends.base import TranslationBackend
from models import ChatCompletionRequest
from pdf_ocr import OcrTextBlock, PdfOcrPageResult, PdfOcrResult


class EchoTranslationBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        user_text = "\n".join(message.content for message in request.messages if message.role == "user")
        return f"TRANSLATED: {user_text}"

    @property
    def name(self) -> str:
        return "echo"


def fake_run_pdf_ocr(_pdf_path):
    return PdfOcrResult(
        pages=[
            PdfOcrPageResult(
                page_index=0,
                blocks=[
                    OcrTextBlock(page_index=0, block_index=0, text="Hello full PDF", confidence=0.99),
                ],
            )
        ]
    )


def fake_resolve_backend(_model: str) -> TranslationBackend:
    return EchoTranslationBackend()


def main() -> None:
    original_run_pdf_ocr = server.run_pdf_ocr
    original_resolve_backend = server.resolve_backend
    server.run_pdf_ocr = fake_run_pdf_ocr
    server.resolve_backend = fake_resolve_backend

    try:
        client = TestClient(server.app)
        response = client.post(
            "/pdf/translate-file?model=openai/gpt-5-mini&target_language=Traditional%20Chinese&output_mode=bilingual-markdown",
            content=b"%PDF-1.4\n",
            headers={"Content-Type": "application/pdf"},
        )
    finally:
        server.run_pdf_ocr = original_run_pdf_ocr
        server.resolve_backend = original_resolve_backend

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["model"] == "openai/gpt-5-mini"
    assert "TRANSLATED: Hello full PDF" in payload["markdown"]
    print("pdf file translation route ok")


if __name__ == "__main__":
    main()
