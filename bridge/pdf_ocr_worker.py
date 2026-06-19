"""Isolated OCR worker for the QQ Frog PDF bridge.

PaddleOCR can spend a long time in native initialization or inference. Running
it outside the FastAPI process keeps health checks and WebSocket traffic alive.
"""

from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

from pdf_ocr import run_pdf_ocr, run_pdf_page_ocr


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf_path")
    parser.add_argument("--page-index", type=int)
    args = parser.parse_args()

    try:
        pdf_path = Path(args.pdf_path)
        result = run_pdf_page_ocr(pdf_path, page_index=args.page_index) if args.page_index is not None else run_pdf_ocr(pdf_path)
        print(json.dumps({"ok": True, "result": result.model_dump()}), flush=True)
        return 0
    except Exception as error:
        print(
            json.dumps({
                "ok": False,
                "error_type": type(error).__name__,
                "message": str(error),
                "traceback": traceback.format_exc(),
            }),
            flush=True,
        )
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
