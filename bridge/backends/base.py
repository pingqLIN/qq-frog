"""翻譯後端抽象基底類別"""
from abc import ABC, abstractmethod
from models import ChatCompletionRequest

class TranslationBackend(ABC):
    @abstractmethod
    async def translate(self, request: ChatCompletionRequest) -> str:
        """執行翻譯，回傳翻譯結果文字"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """後端名稱"""
        pass
