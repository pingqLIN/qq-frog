"""PDF OCR translation flow for the QQ Frog local bridge."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from backends.base import TranslationBackend
from models import ChatCompletionRequest, ChatMessage
from pdf_ocr import PdfOcrResult, OcrTextBlock


PdfOutputMode = Literal["bilingual-markdown", "text-layer"]


class PdfTranslateRequest(BaseModel):
    model: str = "chrome-gemini"
    target_language: str = "Traditional Chinese"
    output_mode: PdfOutputMode = "bilingual-markdown"
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    ocr: PdfOcrResult


class TranslatedTextBlock(BaseModel):
    page_index: int
    block_index: int
    source_text: str
    translated_text: str
    confidence: float | None = None


class PdfTranslateResponse(BaseModel):
    model: str
    output_mode: PdfOutputMode
    pages: list[list[TranslatedTextBlock]]
    markdown: str


def _build_translation_request(
    *,
    model: str,
    target_language: str,
    temperature: float | None,
    text: str,
) -> ChatCompletionRequest:
    return ChatCompletionRequest(
        model=model,
        temperature=temperature,
        messages=[
            ChatMessage(
                role="system",
                content=(
                    "You are a professional PDF translation engine. "
                    f"Translate the user text into {target_language}. "
                    "Preserve numbers, URLs, code, and math notation. "
                    "Return only the translated text."
                ),
            ),
            ChatMessage(role="user", content=text),
        ],
    )


async def _translate_block(
    *,
    block: OcrTextBlock,
    backend: TranslationBackend,
    model: str,
    target_language: str,
    temperature: float | None,
) -> TranslatedTextBlock:
    translated_text = await backend.translate(
        _build_translation_request(
            model=model,
            target_language=target_language,
            temperature=temperature,
            text=block.text,
        )
    )
    return TranslatedTextBlock(
        page_index=block.page_index,
        block_index=block.block_index,
        source_text=block.text,
        translated_text=translated_text,
        confidence=block.confidence,
    )


def _render_markdown(pages: list[list[TranslatedTextBlock]], output_mode: PdfOutputMode) -> str:
    lines: list[str] = ["# QQ Frog PDF Translation", ""]

    for page_index, blocks in enumerate(pages):
        lines.append(f"## Page {page_index + 1}")
        lines.append("")

        for block in blocks:
            if output_mode == "text-layer":
                lines.append(block.translated_text)
                lines.append("")
                continue

            lines.append(f"### Block {block.block_index + 1}")
            lines.append("")
            lines.append("Source:")
            lines.append("")
            lines.append(block.source_text)
            lines.append("")
            lines.append("Translation:")
            lines.append("")
            lines.append(block.translated_text)
            lines.append("")

    return "\n".join(lines).strip() + "\n"


async def translate_pdf_ocr_result(
    request: PdfTranslateRequest,
    backend: TranslationBackend,
) -> PdfTranslateResponse:
    translated_pages: list[list[TranslatedTextBlock]] = []

    for page in request.ocr.pages:
        translated_blocks: list[TranslatedTextBlock] = []
        for block in page.blocks:
            if not block.text.strip():
                continue
            translated_blocks.append(
                await _translate_block(
                    block=block,
                    backend=backend,
                    model=request.model,
                    target_language=request.target_language,
                    temperature=request.temperature,
                )
            )
        translated_pages.append(translated_blocks)

    return PdfTranslateResponse(
        model=request.model,
        output_mode=request.output_mode,
        pages=translated_pages,
        markdown=_render_markdown(translated_pages, request.output_mode),
    )
