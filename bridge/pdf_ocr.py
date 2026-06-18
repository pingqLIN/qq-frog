"""
PaddleOCR-based OCR helpers for the QQ Frog local PDF translation bridge.

Imports for PaddleOCR and PDF rendering stay lazy so the bridge can start and
report actionable setup status before the OCR runtime is installed.
"""

from __future__ import annotations

import importlib.util
import platform
import tempfile
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


SUPPORTED_PADDLE_PYTHON_MIN = (3, 9)
SUPPORTED_PADDLE_PYTHON_MAX = (3, 13)


class DependencyStatus(BaseModel):
    name: str
    installed: bool


class PdfOcrHealth(BaseModel):
    status: str
    python_version: str
    dependencies: list[DependencyStatus]
    warnings: list[str] = Field(default_factory=list)


class OcrBoundingBox(BaseModel):
    points: list[list[float]]


class OcrTextBlock(BaseModel):
    page_index: int
    block_index: int
    text: str
    confidence: float | None = None
    bbox: OcrBoundingBox | None = None


class PdfOcrPageResult(BaseModel):
    page_index: int
    blocks: list[OcrTextBlock]


class PdfOcrResult(BaseModel):
    pages: list[PdfOcrPageResult]


def _is_installed(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def get_pdf_ocr_health() -> PdfOcrHealth:
    python_version = platform.python_version()
    version_parts = platform.python_version_tuple()
    py_major_minor = (int(version_parts[0]), int(version_parts[1]))

    dependencies = [
        DependencyStatus(name="paddle", installed=_is_installed("paddle")),
        DependencyStatus(name="paddleocr", installed=_is_installed("paddleocr")),
        DependencyStatus(name="pypdfium2", installed=_is_installed("pypdfium2")),
    ]

    warnings: list[str] = []
    if py_major_minor < SUPPORTED_PADDLE_PYTHON_MIN or py_major_minor > SUPPORTED_PADDLE_PYTHON_MAX:
        warnings.append(
            "PaddlePaddle currently supports Python 3.9 through 3.13. "
            f"Detected Python {python_version}."
        )

    missing = [dependency.name for dependency in dependencies if not dependency.installed]
    if missing:
        warnings.append(f"Missing OCR dependencies: {', '.join(missing)}.")

    return PdfOcrHealth(
        status="ready" if not missing and not warnings else "needs_setup",
        python_version=python_version,
        dependencies=dependencies,
        warnings=warnings,
    )


def assert_pdf_ocr_ready() -> None:
    health = get_pdf_ocr_health()
    missing = [dependency.name for dependency in health.dependencies if not dependency.installed]
    if missing:
        raise RuntimeError(
            "PDF OCR runtime is not ready. Missing dependencies: "
            f"{', '.join(missing)}. Install PaddlePaddle for this platform, then install paddleocr and pypdfium2."
        )


def _normalize_bbox(raw_bbox: Any) -> OcrBoundingBox | None:
    if not isinstance(raw_bbox, list):
        return None

    points: list[list[float]] = []
    for point in raw_bbox:
        if (
            isinstance(point, (list, tuple))
            and len(point) >= 2
            and isinstance(point[0], (int, float))
            and isinstance(point[1], (int, float))
        ):
            points.append([float(point[0]), float(point[1])])

    return OcrBoundingBox(points=points) if points else None


def _normalize_ocr_lines(raw_result: Any, page_index: int) -> list[OcrTextBlock]:
    blocks: list[OcrTextBlock] = []

    if raw_result is None:
        return blocks

    # PaddleOCR v2-style result: [[[bbox], (text, confidence)], ...]
    if isinstance(raw_result, list):
        for item in raw_result:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue

            raw_bbox = item[0]
            raw_text = item[1]
            text = ""
            confidence: float | None = None
            if isinstance(raw_text, (list, tuple)) and raw_text:
                text = str(raw_text[0])
                if len(raw_text) > 1 and isinstance(raw_text[1], (int, float)):
                    confidence = float(raw_text[1])
            elif isinstance(raw_text, str):
                text = raw_text

            if not text:
                continue

            blocks.append(
                OcrTextBlock(
                    page_index=page_index,
                    block_index=len(blocks),
                    text=text,
                    confidence=confidence,
                    bbox=_normalize_bbox(raw_bbox),
                )
            )
        return blocks

    # PaddleOCR v3-style dict result. Keep this intentionally tolerant because
    # minor output keys differ by pipeline.
    if isinstance(raw_result, dict):
        texts = raw_result.get("rec_texts") or raw_result.get("texts") or []
        scores = raw_result.get("rec_scores") or raw_result.get("scores") or []
        boxes = raw_result.get("rec_boxes") or raw_result.get("dt_polys") or raw_result.get("boxes") or []

        if isinstance(texts, list):
            for index, text_value in enumerate(texts):
                text = str(text_value)
                if not text:
                    continue

                score = scores[index] if isinstance(scores, list) and index < len(scores) else None
                box = boxes[index] if isinstance(boxes, list) and index < len(boxes) else None
                blocks.append(
                    OcrTextBlock(
                        page_index=page_index,
                        block_index=len(blocks),
                        text=text,
                        confidence=float(score) if isinstance(score, (int, float)) else None,
                        bbox=_normalize_bbox(box),
                    )
                )

    return blocks


def _render_pdf_page_to_png(pdf_path: Path, page_index: int, scale: float) -> Path:
    import pypdfium2 as pdfium

    pdf = pdfium.PdfDocument(str(pdf_path))
    if page_index < 0 or page_index >= len(pdf):
        raise ValueError(f"page_index {page_index} is outside the PDF page range 0..{len(pdf) - 1}.")

    page = pdf[page_index]
    bitmap = page.render(scale=scale)
    image = bitmap.to_pil()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as temp_file:
        output = Path(temp_file.name)
    image.save(output)
    return output


def run_pdf_page_ocr(pdf_path: Path, page_index: int = 0, scale: float = 2.0) -> PdfOcrResult:
    assert_pdf_ocr_ready()

    from paddleocr import PaddleOCR

    image_path = _render_pdf_page_to_png(pdf_path, page_index, scale)
    try:
        ocr = PaddleOCR(use_angle_cls=True, lang="en")
        if hasattr(ocr, "ocr"):
            raw_result = ocr.ocr(str(image_path), cls=True)
        else:
            raw_result = ocr.predict(str(image_path))

        page_result = raw_result[0] if isinstance(raw_result, list) and raw_result else raw_result
        blocks = _normalize_ocr_lines(page_result, page_index)
        return PdfOcrResult(pages=[PdfOcrPageResult(page_index=page_index, blocks=blocks)])
    finally:
        image_path.unlink(missing_ok=True)
