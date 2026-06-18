"""
BabelDOC × Chrome Gemini Nano Bridge — 資料模型定義
符合 OpenAI Chat Completion API 格式
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field
import uuid
import time


# ── 請求格式（BabelDOC 送過來的格式） ─────────────────────────────


class ChatMessage(BaseModel):
    """OpenAI 格式的單一訊息"""
    role: Literal["system", "user", "assistant"]
    content: str


class ChatCompletionRequest(BaseModel):
    """POST /v1/chat/completions 的請求主體"""
    model: str = "chrome-gemini"
    messages: list[ChatMessage]
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    stream: Optional[bool] = False
    # BabelDOC 可能傳入的其他欄位，忽略即可
    top_p: Optional[float] = None
    n: Optional[int] = 1


# ── 回應格式（回傳給 BabelDOC 的格式） ───────────────────────────


class ChatCompletionChoice(BaseModel):
    """選項（OpenAI 格式）"""
    index: int = 0
    message: ChatMessage
    finish_reason: Literal["stop", "length", "error"] = "stop"


class ChatCompletionUsage(BaseModel):
    """Token 使用量（估算值，Gemini Nano 不回傳精確值）"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatCompletionResponse(BaseModel):
    """符合 OpenAI 格式的 chat completion 回應"""
    id: str = Field(default_factory=lambda: f"chatcmpl-{uuid.uuid4().hex[:12]}")
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str = "chrome-gemini"
    choices: list[ChatCompletionChoice]
    usage: ChatCompletionUsage = Field(default_factory=ChatCompletionUsage)


class ErrorResponse(BaseModel):
    """錯誤回應（OpenAI 格式）"""
    error: dict[str, Any]

    @classmethod
    def from_message(cls, message: str, code: str = "server_error") -> "ErrorResponse":
        return cls(error={"message": message, "type": code, "code": code})


# ── WebSocket 訊息格式（Bridge Server ↔ Extension） ──────────────


class WSTranslateTask(BaseModel):
    """Bridge Server 派發給 Extension 的翻譯任務"""
    task_id: str
    system_prompt: Optional[str] = None
    user_prompt: str
    temperature: Optional[float] = None


class WSTranslateResult(BaseModel):
    """Extension 完成翻譯後回傳的結果"""
    task_id: str
    success: bool
    result: Optional[str] = None    # 翻譯結果文字
    error: Optional[str] = None     # 若 success=False，錯誤訊息
    elapsed_ms: Optional[float] = None  # 翻譯耗時（毫秒）
