"""
QQ Frog local PDF translation bridge prototype — FastAPI main.

提供 OpenAI 相容的 /v1/chat/completions 端點，
並透過 WebSocket 橋接至 Chrome Extension 執行 Chrome 內建 Gemini 翻譯。

啟動方式：
    python server.py

或手動指定本機服務：
    uvicorn server:app --host 127.0.0.1 --port 8001

若要提供給信任的內網裝置，需明確使用：
    uvicorn server:app --host 0.0.0.0 --port 8001
"""

import asyncio
import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path
import tempfile

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse

from models import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionChoice,
    ChatMessage,
    ChatCompletionUsage,
    ErrorResponse,
)
from ws_manager import ws_manager

# ── 翻譯後端 ──────────────────────────────────────────────────────
from backends.base import TranslationBackend
from backends.chrome_ai import ChromeAIBackend
from backends.gemini_api import GeminiAPIBackend
from backends.openai_api import OpenAIAPIBackend
from backends.lm_studio import LMStudioBackend
from pdf_ocr import PdfOcrResult, get_pdf_ocr_health, run_pdf_ocr, run_pdf_page_ocr
from pdf_translate import PdfOutputMode, PdfTranslateRequest, translate_pdf_ocr_result

def resolve_backend(model: str) -> TranslationBackend:
    """Resolve one of the approved PDF translation providers from the model token."""
    model_lower = model.lower()
    if model_lower in {"chrome-gemini", "chrome-ai", "gemini-nano"} or model_lower.startswith("chrome-gemini/"):
        return ChromeAIBackend()
    elif model_lower == "lm-studio" or model_lower.startswith("lm-studio/"):
        return LMStudioBackend()
    elif model_lower == "openai" or model_lower.startswith("openai/"):
        return OpenAIAPIBackend()
    elif model_lower == "gemini" or model_lower.startswith("gemini/"):
        return GeminiAPIBackend()

    raise ValueError(
        "Unsupported PDF translation provider. Use one of: "
        "chrome-gemini, lm-studio/<model>, openai/<model>, gemini/<model>."
    )


# ── 日誌設定 ──────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("bridge")
PDF_OCR_WORKER_TIMEOUT_SECONDS = int(os.getenv("QQ_FROG_PDF_OCR_WORKER_TIMEOUT", "900"))
_ORIGINAL_RUN_PDF_OCR = run_pdf_ocr
_ORIGINAL_RUN_PDF_PAGE_OCR = run_pdf_page_ocr


def parse_bool_env(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


BRIDGE_HOST = os.getenv("QQ_FROG_BRIDGE_HOST", "127.0.0.1")
BRIDGE_PORT = int(os.getenv("QQ_FROG_BRIDGE_PORT", "8001"))
BRIDGE_RELOAD = parse_bool_env("QQ_FROG_BRIDGE_RELOAD", False)


def get_display_host(host: str) -> str:
    return "localhost" if host in {"0.0.0.0", "127.0.0.1"} else host


def resolve_cors_origins() -> list[str]:
    raw_origins = os.getenv("QQ_FROG_BRIDGE_CORS_ORIGINS")
    if raw_origins:
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    origins = [
        f"http://localhost:{BRIDGE_PORT}",
        f"http://127.0.0.1:{BRIDGE_PORT}",
    ]
    extension_id = os.getenv("QQ_FROG_EXTENSION_ID")
    if extension_id:
        origins.append(f"chrome-extension://{extension_id}")
    return origins


DISPLAY_HOST = get_display_host(BRIDGE_HOST)


# ── FastAPI 應用 ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期"""
    logger.info("QQ Frog local PDF translation bridge 啟動中...")
    logger.info(f"   等待 Chrome Extension 連線至 ws://{DISPLAY_HOST}:{BRIDGE_PORT}/ws")
    logger.info(f"   OpenAI-compatible client 請設定：--openai-base-url http://{DISPLAY_HOST}:{BRIDGE_PORT}/v1")
    yield
    logger.info("Bridge Server 關閉")


app = FastAPI(
    title="QQ Frog Local PDF Translation Bridge Prototype",
    version="0.1.0",
    description="將 OpenAI-compatible PDF translation requests 橋接至 QQ Frog 支援的本機或 API provider",
    lifespan=lifespan,
)

# 允許本機 PDF 翻譯客戶端跨來源存取。若要放寬給其他來源，可設定
# QQ_FROG_BRIDGE_CORS_ORIGINS="*" 或逗號分隔的 origin 清單。
app.add_middleware(
    CORSMiddleware,
    allow_origins=resolve_cors_origins(),
    allow_origin_regex=r"^chrome-extension://[a-p]{32}$",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 健康檢查 ──────────────────────────────────────────────────────

@app.get("/ui")
async def serve_ui():
    """提供獨立本機小工具 HTML 頁面"""
    return FileResponse(Path(__file__).with_name("ui.html"))


@app.get("/")
async def root():
    """Send browser users to the built-in bridge UI."""
    return RedirectResponse(url="/ui")


@app.get("/health")
async def health():
    """橋接服務健康狀態"""
    return {
        "status": "ok",
        "extension_connected": ws_manager.is_connected,
        "pending_tasks": len(ws_manager._pending),
        "pdf_ocr": get_pdf_ocr_health().model_dump(),
    }


@app.get("/pdf/health")
async def pdf_ocr_health():
    """PDF OCR runtime health check."""
    return get_pdf_ocr_health().model_dump()


def _is_supported_pdf_content_type(content_type: str | None) -> bool:
    if content_type is None:
        return True
    return content_type.split(";")[0].strip().lower() in {"application/pdf", "application/octet-stream"}


async def _write_request_pdf(request: Request) -> Path:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
        temp_path = Path(temp_file.name)
        temp_file.write(await request.body())
    return temp_path


async def _run_pdf_ocr_worker(pdf_path: Path, page_index: int | None = None) -> PdfOcrResult:
    command = [sys.executable, str(Path(__file__).with_name("pdf_ocr_worker.py")), str(pdf_path)]
    if page_index is not None:
        command.extend(["--page-index", str(page_index)])

    process = await asyncio.create_subprocess_exec(
        *command,
        cwd=Path(__file__).resolve().parent,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    try:
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=PDF_OCR_WORKER_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        process.kill()
        await process.wait()
        raise RuntimeError(f"PDF OCR timed out after {PDF_OCR_WORKER_TIMEOUT_SECONDS} seconds.")

    if process.returncode != 0:
        error_text = stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(error_text or f"PDF OCR worker exited with code {process.returncode}.")

    stdout_text = stdout.decode("utf-8", errors="replace").strip()
    json_line = stdout_text.splitlines()[-1] if stdout_text else ""

    try:
        payload = json.loads(json_line)
    except json.JSONDecodeError as error:
        stderr_text = stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"PDF OCR worker returned invalid JSON: {error}. {stderr_text}")

    if not payload.get("ok"):
        message = payload.get("message") or "PDF OCR worker failed."
        if payload.get("error_type") == "ValueError":
            raise ValueError(message)
        raise RuntimeError(message)

    return PdfOcrResult(**payload["result"])


async def _run_request_pdf_ocr(pdf_path: Path, page_index: int | None = None) -> PdfOcrResult:
    # Preserve existing tests that monkeypatch server.run_pdf_ocr directly.
    if page_index is not None and run_pdf_page_ocr is not _ORIGINAL_RUN_PDF_PAGE_OCR:
        return run_pdf_page_ocr(pdf_path, page_index=page_index)
    if page_index is None and run_pdf_ocr is not _ORIGINAL_RUN_PDF_OCR:
        return run_pdf_ocr(pdf_path)
    return await _run_pdf_ocr_worker(pdf_path, page_index)


@app.post("/pdf/ocr")
async def pdf_ocr(request: Request, page_index: int | None = None):
    """Run PaddleOCR for one page or the full PDF and return normalized OCR JSON."""
    content_type = request.headers.get("content-type")
    if not _is_supported_pdf_content_type(content_type):
        return JSONResponse(
            status_code=400,
            content={"error": {"message": f"Unsupported content type: {content_type}", "type": "invalid_request_error"}},
        )

    temp_path = await _write_request_pdf(request)

    try:
        result = await _run_request_pdf_ocr(temp_path, page_index)
        return result.model_dump()
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": {"message": str(e), "type": "invalid_request_error"}})
    except RuntimeError as e:
        return JSONResponse(status_code=503, content={"error": {"message": str(e), "type": "server_error"}})
    finally:
        temp_path.unlink(missing_ok=True)


@app.post("/pdf/translate")
async def pdf_translate(request: PdfTranslateRequest):
    """Translate normalized PaddleOCR JSON and return the MVP Markdown output."""
    try:
        backend = resolve_backend(request.model)
        result = await translate_pdf_ocr_result(request, backend)
        return result.model_dump()
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": {"message": str(e), "type": "invalid_request_error"}})
    except RuntimeError as e:
        return JSONResponse(status_code=503, content={"error": {"message": str(e), "type": "server_error"}})


@app.post("/pdf/translate-file")
async def pdf_translate_file(
    request: Request,
    model: str = "chrome-gemini",
    target_language: str = "Traditional Chinese",
    output_mode: PdfOutputMode = "bilingual-markdown",
):
    """Run PaddleOCR on the full PDF, translate OCR text, and return Markdown output."""
    content_type = request.headers.get("content-type")
    if not _is_supported_pdf_content_type(content_type):
        return JSONResponse(
            status_code=400,
            content={"error": {"message": f"Unsupported content type: {content_type}", "type": "invalid_request_error"}},
        )

    temp_path = await _write_request_pdf(request)

    try:
        ocr_result = await _run_request_pdf_ocr(temp_path)
        backend = resolve_backend(model)
        translate_request = PdfTranslateRequest(
            model=model,
            target_language=target_language,
            output_mode=output_mode,
            ocr=ocr_result,
        )
        result = await translate_pdf_ocr_result(translate_request, backend)
        return result.model_dump()
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": {"message": str(e), "type": "invalid_request_error"}})
    except RuntimeError as e:
        return JSONResponse(status_code=503, content={"error": {"message": str(e), "type": "server_error"}})
    finally:
        temp_path.unlink(missing_ok=True)



@app.get("/v1/models")
async def list_models():
    """符合 OpenAI 格式的模型清單（讓 OpenAI-compatible clients 可以查詢）"""
    return {
        "object": "list",
        "data": [
            {
                "id": "chrome-gemini",
                "object": "model",
                "created": 1749000000,
                "owned_by": "chrome-built-in",
                "description": "Chrome built-in Gemini via Prompt API",
            },
            {
                "id": "lm-studio/local-model",
                "object": "model",
                "created": 1749000000,
                "owned_by": "lm-studio",
                "description": "LM Studio OpenAI-compatible API",
            },
            {
                "id": "openai/gpt-5-mini",
                "object": "model",
                "created": 1749000000,
                "owned_by": "openai",
                "description": "OpenAI API",
            },
            {
                "id": "gemini/gemini-2.5-flash",
                "object": "model",
                "created": 1749000000,
                "owned_by": "google",
                "description": "Gemini API",
            }
        ],
    }


# ── OpenAI 相容翻譯端點（核心）────────────────────────────────────

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI Chat Completion 相容端點。
    根據傳入的 model 分流至 Chrome built-in Gemini, LM Studio, OpenAI 或 Gemini API。
    """
    start_time = time.time()

    # 為了計算 tokens，先簡化提取 user prompt 的總字數
    user_prompt = ""
    for msg in request.messages:
        if msg.role == "user":
            user_prompt += msg.content + "\n"

    logger.info(
        f"收到翻譯請求 | model={request.model} | "
        f"prompt_len={len(user_prompt)} | ext_connected={ws_manager.is_connected}"
    )

    try:
        backend = resolve_backend(request.model)
        result_text = await backend.translate(request)
    except ValueError as e:
        logger.error(f"參數錯誤：{e}")
        err = ErrorResponse.from_message(str(e), "invalid_request_error")
        return JSONResponse(status_code=400, content=err.model_dump())
    except RuntimeError as e:
        logger.error(f"翻譯失敗：{e}")
        err = ErrorResponse.from_message(str(e), "server_error")
        return JSONResponse(status_code=503, content=err.model_dump())

    # 估算 token 數（粗略：英文約 1 token/4 字元）
    prompt_tokens = max(1, len(user_prompt) // 4)
    completion_tokens = max(1, len(result_text) // 4)
    elapsed_ms = (time.time() - start_time) * 1000

    response = ChatCompletionResponse(
        model=request.model,
        choices=[
            ChatCompletionChoice(
                message=ChatMessage(role="assistant", content=result_text),
                finish_reason="stop",
            )
        ],
        usage=ChatCompletionUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        ),
    )

    logger.info(f"翻譯完成 | backend={backend.name} | output_len={len(result_text)} | elapsed={elapsed_ms:.0f}ms")
    return response.model_dump()



# ── WebSocket 端點（Extension 連線用）────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Chrome Extension 連線至此 WebSocket，
    接收翻譯任務並回傳結果。
    """
    await ws_manager.connect_extension(ws)
    try:
        await ws_manager.listen_extension(ws)
    except WebSocketDisconnect:
        ws_manager.disconnect_extension()
    except Exception as e:
        logger.error(f"WebSocket 異常：{e}")
        ws_manager.disconnect_extension()


# ── 全域錯誤處理 ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"未處理的例外：{exc}", exc_info=True)
    err = ErrorResponse.from_message(f"Server 內部錯誤：{exc}", "server_error")
    return JSONResponse(status_code=500, content=err.model_dump())


# ── 主程式進入點 ──────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info(f"啟動 Bridge Server — http://{DISPLAY_HOST}:{BRIDGE_PORT}")
    uvicorn.run(
        "server:app",
        host=BRIDGE_HOST,
        port=BRIDGE_PORT,
        reload=BRIDGE_RELOAD,
        log_level="info",
    )
