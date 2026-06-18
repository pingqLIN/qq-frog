"""
Bridge Server 設定模組
支援環境變數與 config.yaml
"""
import os

class BridgeConfig:
    # chrome-ai 後端
    WS_PATH: str = "/ws"

    # OpenAI 後端
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # Gemini API 後端
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_BASE_URL: str = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")

    # LM Studio 後端
    LM_STUDIO_BASE_URL: str = os.getenv("LM_STUDIO_BASE_URL", "http://localhost:1234/v1")

    # 請求設定
    REQUEST_TIMEOUT: float = float(os.getenv("REQUEST_TIMEOUT", "60"))
    DEFAULT_BACKEND: str = os.getenv("DEFAULT_BACKEND", "chrome-gemini")

config = BridgeConfig()
