"""LM Studio 翻譯後端"""
import logging
import httpx
from backends.base import TranslationBackend
from models import ChatCompletionRequest
from config import config

logger = logging.getLogger(__name__)

class LMStudioBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        target_model = request.model
        if target_model.startswith("lm-studio/"):
            target_model = target_model[len("lm-studio/"):]
        elif target_model == "lm-studio":
            target_model = "local-model"

        payload = {
            "model": target_model,
            "messages": [msg.model_dump() for msg in request.messages],
        }
        if request.temperature is not None:
            payload["temperature"] = request.temperature
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens

        # LM Studio 本地連線通常不需要 API Key，但帶個 dummy header 是安全的
        headers = {
            "Authorization": "Bearer lm-studio",
            "Content-Type": "application/json",
        }

        logger.info(f"[{self.name}] 正在發送請求至 {config.LM_STUDIO_BASE_URL} | model={target_model}")

        async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
            try:
                response = await client.post(
                    f"{config.LM_STUDIO_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
            except Exception as e:
                raise RuntimeError(
                    f"無法連線至 LM Studio (請確認服務已啟動於 {config.LM_STUDIO_BASE_URL}): {e}"
                )

            if response.status_code != 200:
                err_msg = f"LM Studio 回傳錯誤碼 {response.status_code}: {response.text}"
                logger.error(err_msg)
                raise RuntimeError(err_msg)

            try:
                data = response.json()
                translated_text = data["choices"][0]["message"]["content"]
                return translated_text
            except (KeyError, IndexError, ValueError) as e:
                raise RuntimeError(f"解析 LM Studio 回應失敗: {e} | 回應內容: {response.text[:200]}")

    @property
    def name(self) -> str:
        return "lm-studio"
