"""Chrome AI (Gemini Nano) 翻譯後端"""
import logging
from backends.base import TranslationBackend
from models import ChatCompletionRequest
from ws_manager import ws_manager

logger = logging.getLogger(__name__)

class ChromeAIBackend(TranslationBackend):
    async def translate(self, request: ChatCompletionRequest) -> str:
        # 從 messages 提取 system prompt 與 user prompt
        system_prompt: str | None = None
        user_prompt_parts: list[str] = []

        for msg in request.messages:
            if msg.role == "system":
                system_prompt = msg.content
            elif msg.role == "user":
                user_prompt_parts.append(msg.content)

        user_prompt = "\n\n".join(user_prompt_parts)

        if not user_prompt:
            raise ValueError("messages 中未找到 user 角色的內容")

        logger.info(f"[{self.name}] 派遣任務到 WebSocket, len={len(user_prompt)}")

        from chunker import translate_with_chunking

        async def do_translate(chunk: str) -> str:
            res = await ws_manager.dispatch_task(
                user_prompt=chunk,
                system_prompt=system_prompt,
                temperature=request.temperature,
            )
            return res.result or ""

        # 透過 chunker 進行分段翻譯與 LaTeX 保護
        translated_text = await translate_with_chunking(user_prompt, do_translate)
        return translated_text

    @property
    def name(self) -> str:
        return "chrome-ai"
