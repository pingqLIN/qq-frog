"""OpenAI API 翻譯後端"""
import logging
import httpx
from backends.base import TranslationBackend
from models import ChatCompletionRequest
from config import config

logger = logging.getLogger(__name__)

class OpenAIAPIBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        if not config.OPENAI_API_KEY:
            raise ValueError(
                "OpenAI API 金鑰未設定。請設定 OPENAI_API_KEY 環境變數。"
            )

        target_model = request.model
        if target_model.startswith("openai/"):
            target_model = target_model[len("openai/"):]
        elif target_model == "openai":
            target_model = "gpt-5-mini"

        # 整理 Payload，排除自訂或多餘欄位，確保符合標準 API
        payload = {
            "model": target_model,
            "messages": [msg.model_dump() for msg in request.messages],
        }
        if request.temperature is not None:
            payload["temperature"] = request.temperature
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens

        headers = {
            "Authorization": f"Bearer {config.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }

        logger.info(f"[{self.name}] 正在發送請求至 {config.OPENAI_BASE_URL} | model={target_model}")

        async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT) as client:
            try:
                response = await client.post(
                    f"{config.OPENAI_BASE_URL}/chat/completions",
                    json=payload,
                    headers=headers,
                )
            except Exception as e:
                raise RuntimeError(f"無法連線至 OpenAI API: {e}")

            if response.status_code != 200:
                err_msg = f"OpenAI API 回傳錯誤碼 {response.status_code}: {response.text}"
                logger.error(err_msg)
                raise RuntimeError(err_msg)

            try:
                data = response.json()
                translated_text = data["choices"][0]["message"]["content"]
                return translated_text
            except (KeyError, IndexError, ValueError) as e:
                raise RuntimeError(f"解析 OpenAI 回應失敗: {e} | 回應內容: {response.text[:200]}")

    @property
    def name(self) -> str:
        return "openai"
