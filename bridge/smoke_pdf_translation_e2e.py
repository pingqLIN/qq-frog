"""Run real PaddleOCR and translate the OCR result with a local echo backend."""

from __future__ import annotations

import asyncio
import os
import tempfile
from pathlib import Path

from backends.base import TranslationBackend
from models import ChatCompletionRequest
from pdf_ocr import run_pdf_ocr
from pdf_translate import PdfTranslateRequest, translate_pdf_ocr_result
from smoke_pdf_ocr import SAMPLE_TEXT, _write_sample_pdf


class EchoTranslationBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        user_text = "\n".join(message.content for message in request.messages if message.role == "user")
        return f"TRANSLATED: {user_text}"

    @property
    def name(self) -> str:
        return "echo"


async def main() -> None:
    os.environ.setdefault("PADDLE_PDX_MODEL_SOURCE", "bos")
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        pdf_path = Path(temp_file.name)

    try:
        _write_sample_pdf(pdf_path)
        ocr_result = run_pdf_ocr(pdf_path)
    finally:
        pdf_path.unlink(missing_ok=True)

    response = await translate_pdf_ocr_result(
        PdfTranslateRequest(model="openai/gpt-5-mini", ocr=ocr_result),
        EchoTranslationBackend(),
    )

    assert SAMPLE_TEXT in response.markdown, response.markdown
    assert f"TRANSLATED: {SAMPLE_TEXT}" in response.markdown, response.markdown
    print("pdf translation e2e smoke ok")
    print(response.markdown)


if __name__ == "__main__":
    asyncio.run(main())
