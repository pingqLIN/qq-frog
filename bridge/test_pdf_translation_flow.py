"""Smoke checks for OCR JSON to translated PDF output."""

from __future__ import annotations

import asyncio

from backends.base import TranslationBackend
from models import ChatCompletionRequest
from pdf_ocr import PdfOcrPageResult, PdfOcrResult, OcrTextBlock
from pdf_translate import PdfTranslateRequest, translate_pdf_ocr_result


class EchoTranslationBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        user_text = "\n".join(message.content for message in request.messages if message.role == "user")
        return f"TRANSLATED: {user_text}"

    @property
    def name(self) -> str:
        return "echo"


async def smoke() -> None:
    ocr = PdfOcrResult(
        pages=[
            PdfOcrPageResult(
                page_index=0,
                blocks=[
                    OcrTextBlock(page_index=0, block_index=0, text="Hello PDF", confidence=0.98),
                    OcrTextBlock(page_index=0, block_index=1, text="Second line", confidence=0.91),
                ],
            )
        ]
    )

    response = await translate_pdf_ocr_result(
        PdfTranslateRequest(model="openai/gpt-5-mini", ocr=ocr),
        EchoTranslationBackend(),
    )

    assert response.model == "openai/gpt-5-mini"
    assert response.pages[0][0].translated_text == "TRANSLATED: Hello PDF"
    assert "Source:" in response.markdown
    assert "Translation:" in response.markdown
    assert "TRANSLATED: Second line" in response.markdown
    print("pdf translation flow ok")


if __name__ == "__main__":
    asyncio.run(smoke())
