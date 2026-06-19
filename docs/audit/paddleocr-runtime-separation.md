# PaddleOCR Runtime Separation

狀態：PDF OCR runtime 分隔與授權治理基準。

## Design Boundary

QQ Frog keeps the browser extension, PDF bridge, and OCR runtime as three separable layers:

| Layer              | Location                                                            | License posture                                         | User choice                                                       |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| Browser extension  | `extansion/`                                                        | QQ Frog project license, GPL-3.0-only                   | Always required for extension features.                           |
| PDF bridge service | `bridge/server.py` and bridge support files                         | QQ Frog project license, GPL-3.0-only                   | Optional local service; users can leave PDF translation disabled. |
| PaddleOCR runtime  | `paddleocr`, `paddlepaddle`, downloaded OCR models, and `pypdfium2` | Third-party runtime dependency; PaddleOCR is Apache-2.0 | Installed only when the user chooses local PDF OCR.               |

The extension bundle does not include PaddleOCR, PaddlePaddle, OCR model files, or user API keys.

## Dependency Profiles

- `bridge/requirements-base.txt` installs only the FastAPI bridge shell and provider plumbing.
- `bridge/requirements-paddleocr.txt` adds PDF rendering and PaddleOCR runtime dependencies.
- `bridge/requirements.txt` remains a backward-compatible full PDF translation install and delegates to `requirements-paddleocr.txt`.

This keeps the default historical setup working while making the OCR dependency boundary explicit.

## Runtime Behavior

- `/pdf/health` reports missing OCR dependencies as `needs_setup` instead of preventing the bridge from starting.
- OCR execution runs in `bridge/pdf_ocr_worker.py`, a separate Python worker process, so the FastAPI service can keep health checks and WebSocket traffic responsive.
- The extension PDF UI treats the service as ready only when the bridge responds, OCR health is `ready`, and the selected provider can actually run. For `chrome-gemini`, that also means the extension-side WebSocket agent and Prompt API are connected.

## Licensing Notes

- QQ Frog remains GPL-3.0-only as declared in the project `LICENSE`.
- PaddleOCR is a third-party project under Apache-2.0. Keep its copyright and license notices with any redistributed PaddleOCR material.
- QQ Frog should not vendor PaddleOCR source, PaddlePaddle wheels, or model files into the extension bundle.
- Users choose whether to install and run the PaddleOCR stack locally. Alternative providers can still be selected for translation after OCR is available.

Reference inputs:

- `official-doc`: `https://github.com/PaddlePaddle/PaddleOCR/blob/main/LICENSE` - confirmed PaddleOCR license text and Apache-2.0 notice requirements.
- `official-doc`: `https://www.apache.org/licenses/LICENSE-2.0` - confirmed SPDX identifier and Apache-2.0 license baseline.
