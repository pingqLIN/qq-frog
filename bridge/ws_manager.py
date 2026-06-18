"""
QQ Frog local PDF translation bridge — WebSocket connection manager.

管理 Chrome Extension 的 WebSocket 連線，
以及任務的派發與結果等待機制。
"""

import asyncio
import json
import logging
import uuid
from typing import Optional

from fastapi import WebSocket, WebSocketDisconnect
from models import WSTranslateResult, WSTranslateTask

logger = logging.getLogger(__name__)

# 單一翻譯任務的等待逾時（秒）
TASK_TIMEOUT_SECONDS = 60


class PendingTask:
    """代表一個等待中的翻譯任務"""

    def __init__(self, task_id: str, user_prompt: str, system_prompt: Optional[str] = None, temperature: Optional[float] = None):
        self.task_id = task_id
        self.user_prompt = user_prompt
        self.system_prompt = system_prompt
        self.temperature = temperature
        # asyncio.Future 用來等待 Extension 回傳結果
        self.future: asyncio.Future[WSTranslateResult] = asyncio.get_event_loop().create_future()


class WSManager:
    """
    管理 Chrome Extension 的 WebSocket 連線，
    及翻譯任務的 FIFO queue 派發邏輯。

    架構：
      - Extension 連線後，Server 可派發翻譯任務
      - 任務以 task_id 追蹤，防止回應錯亂
      - 同時支援多個並發任務（Extension 端決定是否支援並發）
    """

    def __init__(self):
        # 目前連線的 Extension（只保留最新的一個）
        self._extension_ws: Optional[WebSocket] = None
        # 等待中的任務 {task_id: PendingTask}
        self._pending: dict[str, PendingTask] = {}
        # 連線事件：用來讓 HTTP 端等待 Extension 上線
        self._connected_event = asyncio.Event()

    @property
    def is_connected(self) -> bool:
        return self._extension_ws is not None

    async def connect_extension(self, ws: WebSocket) -> None:
        """Extension 連線進來時呼叫"""
        await ws.accept()
        if self._extension_ws is not None:
            logger.warning("新的 Extension 連線進來，取代舊連線")
            try:
                await self._extension_ws.close()
            except Exception:
                pass
        self._extension_ws = ws
        self._connected_event.set()
        logger.info("✅ Extension WebSocket 已連線")

    def disconnect_extension(self) -> None:
        """Extension 斷線時清理狀態"""
        self._extension_ws = None
        self._connected_event.clear()
        logger.warning("⚠️  Extension WebSocket 斷線")

        # 讓所有等待中的任務都收到錯誤
        for task in self._pending.values():
            if not task.future.done():
                task.future.set_exception(
                    RuntimeError("Extension 斷線，無法完成翻譯")
                )
        self._pending.clear()

    async def dispatch_task(
        self,
        user_prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
    ) -> WSTranslateResult:
        """
        派發一個翻譯任務給 Extension，並等待結果。

        如果 Extension 未連線，最多等待 10 秒。
        任務執行最多等待 TASK_TIMEOUT_SECONDS 秒。
        """
        # 等待 Extension 連線（最多 10 秒）
        try:
            await asyncio.wait_for(
                asyncio.shield(self._connected_event.wait()),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            raise RuntimeError(
                "Extension 未連線。請確認 QQ Frog Extension 已啟動，且 local PDF translation bridge 設定正確。"
            )

        task_id = str(uuid.uuid4())
        task = PendingTask(task_id, user_prompt, system_prompt, temperature)
        self._pending[task_id] = task

        # 封裝成 WSTranslateTask JSON 送出
        ws_task = WSTranslateTask(
            task_id=task_id,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
        )

        try:
            await self._extension_ws.send_text(ws_task.model_dump_json())
            logger.info(f"📤 派發任務 {task_id[:8]}... (prompt 長度: {len(user_prompt)})")
        except Exception as e:
            del self._pending[task_id]
            raise RuntimeError(f"WebSocket 傳送失敗：{e}")

        # 等待 Extension 回傳結果
        try:
            result = await asyncio.wait_for(task.future, timeout=TASK_TIMEOUT_SECONDS)
            logger.info(f"📥 收到結果 {task_id[:8]}... ({result.elapsed_ms:.0f}ms)")
            return result
        except asyncio.TimeoutError:
            del self._pending[task_id]
            raise RuntimeError(
                f"翻譯逾時（>{TASK_TIMEOUT_SECONDS}s）。Gemini Nano 可能正忙碌或模型尚未就緒。"
            )

    async def handle_extension_message(self, raw: str) -> None:
        """處理 Extension 回傳的 WebSocket 訊息"""
        try:
            data = json.loads(raw)
            result = WSTranslateResult(**data)
        except Exception as e:
            logger.error(f"無法解析 Extension 訊息：{e}  raw={raw[:200]}")
            return

        task = self._pending.pop(result.task_id, None)
        if task is None:
            logger.warning(f"收到未知 task_id 的結果：{result.task_id}")
            return

        if task.future.done():
            return

        if result.success:
            task.future.set_result(result)
        else:
            task.future.set_exception(RuntimeError(result.error or "翻譯失敗（未知錯誤）"))

    async def listen_extension(self, ws: WebSocket) -> None:
        """持續接收 Extension 傳來的訊息（在背景跑）"""
        try:
            while True:
                raw = await ws.receive_text()
                await self.handle_extension_message(raw)
        except WebSocketDisconnect:
            self.disconnect_extension()


# 全域單例
ws_manager = WSManager()
