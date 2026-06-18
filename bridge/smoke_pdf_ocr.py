"""Run a real PaddleOCR smoke test against a generated one-page PDF."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from pdf_ocr import run_pdf_ocr


SAMPLE_TEXT = "Hello PDF translation"


def _write_sample_pdf(path: Path) -> None:
    path.write_text(
        """%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 55 >>
stream
BT
/F1 36 Tf
72 700 Td
(Hello PDF translation) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000311 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
416
%%EOF
""",
        encoding="ascii",
    )


def main() -> None:
    os.environ.setdefault("PADDLE_PDX_MODEL_SOURCE", "bos")
    os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")
    os.environ.setdefault("PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT", "0")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        pdf_path = Path(temp_file.name)

    try:
        _write_sample_pdf(pdf_path)
        result = run_pdf_ocr(pdf_path)
    finally:
        pdf_path.unlink(missing_ok=True)

    text = "\n".join(block.text for page in result.pages for block in page.blocks)
    assert SAMPLE_TEXT in text, f"Expected {SAMPLE_TEXT!r} in OCR text, got {text!r}"
    print("pdf ocr smoke ok")
    print(result.model_dump())


if __name__ == "__main__":
    main()
