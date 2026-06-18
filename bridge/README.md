# QQ Frog Local PDF Translation Bridge Prototype

本目錄目前是 PDF 翻譯工作的 Phase 0 橋接原型，用來驗證本機服務如何以 OpenAI-compatible API 串接 Chrome 內建 Gemini、LM Studio、OpenAI 與 Gemini API。

此目錄尚不是最終的 QQ Frog PDF 翻譯功能。目標架構仍需加入 PaddlePaddle/PaddleOCR 作為 OCR 核心，並把 PDF 翻譯設定與一般網頁翻譯 provider 分開建模。

## 架構說明

```
PDF translation client / local PDF service
    │  POST /v1/chat/completions
    ▼
bridge/server.py  (FastAPI, port 8001)
    │  WebSocket
    ▼
QQ Frog Extension (Chrome Extension Background SW)
    │  window.ai.languageModel Prompt API
    ▼
Chrome Gemini Nano（本地推論）
```

## 前置環境要求

### Chrome Extension 端

1. Chrome 瀏覽器版本 **148 或更新**
2. 開啟 `chrome://flags/#prompt-api-for-gemini-nano`，設定為 **Enabled**
3. 重新啟動 Chrome，並等待 Gemini Nano 模型下載完成（約 4 GB）
4. 安裝 **QQ Frog Extension**。完整設定入口會在後續 PDF 翻譯 Gate 中補齊。

### Bridge Server 端

- Python 3.9-3.13 is recommended for PaddlePaddle compatibility.
- PaddlePaddle installed for your platform and accelerator.

## 安裝與啟動

### 1. 安裝依賴套件

```bash
cd bridge
# Install PaddlePaddle first by following the official PaddlePaddle guide for your platform.
pip install -r requirements.txt
```

### 2. 啟動 Bridge Server

```bash
python server.py
```

或使用 uvicorn 直接啟動：

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

啟動後，Server 會在 `http://localhost:8001` 提供服務。

### 3. 在 Chrome 中啟用 Extension Bridge

- 目前 extension 端仍是原型接入，會依 provider/config 狀態建立 WebSocket。
- 後續 Gate 會補上 PDF 翻譯專用設定頁、health check 與手動連線狀態。

### 4. 執行 OpenAI-compatible PDF 翻譯客戶端

```bash
babeldoc input.pdf \
  --openai-base-url http://localhost:8001/v1 \
  --openai-api-key dummy \
  --openai-model chrome-gemini
```

## 多後端支援與設定

本 Bridge Server 原型支援四種 PDF 翻譯後端，會依據 OpenAI-compatible request 的 `model` 參數進行明確路由。未知 provider 會回傳錯誤，不會自動 fallback。

1. **`chrome-gemini`（預設）**
   - 路由條件：model 為 `chrome-gemini`、`chrome-ai`、`gemini-nano`，或以 `chrome-gemini/` 開頭。
   - 運作模式：將任務透過 WebSocket 派發給 Chrome Extension 或 `/ui` 代理網頁，利用 Chrome 本地的 Gemini Nano 進行離線翻譯。
   - 限制：提供 LaTeX 公式保護與自動 2000 字元分段翻譯。

2. **`lm-studio/<model>`**
   - 路由條件：model 為 `lm-studio` 或以 `lm-studio/` 開頭。
   - 運作模式：呼叫本機執行的 LM Studio OpenAI-compatible API。
   - 設定：LM Studio 預設 API 位址為 `http://localhost:1234/v1`，可透過 `LM_STUDIO_BASE_URL` 環境變數調整。

3. **`openai/<model>`**
   - 路由條件：model 為 `openai` 或以 `openai/` 開頭。
   - 運作模式：直接呼叫 OpenAI 官方 API。
   - 設定：需在啟動 Server 前設定 `OPENAI_API_KEY` 環境變數。

4. **`gemini/<model>`**
   - 路由條件：model 為 `gemini` 或以 `gemini/` 開頭。
   - 運作模式：直接呼叫 Gemini API。
   - 設定：需在啟動 Server 前設定 `GEMINI_API_KEY` 環境變數。

### 環境變數設定

啟動 Server 前可設定以下環境變數來自訂後端行為：

| 環境變數             | 說明                                     | 預設值                                             |
| -------------------- | ---------------------------------------- | -------------------------------------------------- |
| `OPENAI_API_KEY`     | OpenAI API 金鑰 (使用 openai 後端時必填) | (無)                                               |
| `OPENAI_BASE_URL`    | OpenAI API 端點                          | `https://api.openai.com/v1`                        |
| `GEMINI_API_KEY`     | Gemini API 金鑰 (使用 gemini 後端時必填) | (無)                                               |
| `GEMINI_BASE_URL`    | Gemini API 端點                          | `https://generativelanguage.googleapis.com/v1beta` |
| `LM_STUDIO_BASE_URL` | LM Studio API 端點                       | `http://localhost:1234/v1`                         |
| `REQUEST_TIMEOUT`    | API 請求逾時時間 (秒)                    | `60`                                               |
| `DEFAULT_BACKEND`    | 預設 provider 標記                       | `chrome-gemini`                                    |

---

## 獨立本機小工具（Web 代理）

若您因環境限制不方便載入 Extension，可使用本機小工具網頁作為 Gemini Nano 代理：

1. 啟動 Bridge Server。
2. 用 Chrome 瀏覽器打開 `http://localhost:8001/ui`。
3. 頁面將自動檢測 Gemini Nano 並連線至 Bridge Server 進行註冊。
4. **保持該分頁開啟**，local PDF translation bridge 發送的 `chrome-gemini` 任務即會透過該網頁由本地 GPU/NPU 處理。

---

## 翻譯品質測試（Phase 0）

在開始完整整合前，建議先驗證瀏覽器的 Gemini Nano 是否就緒：

1. 用 Chrome 開啟 `bridge/test-quality.html`（可直接拖進瀏覽器）
2. 確認環境狀態為綠燈（✅ Gemini Nano 就緒）
3. 點擊「執行全部測試」，確認 5/5 通過

---

## API 端點

| 端點                   | 方法      | 說明                                                          |
| ---------------------- | --------- | ------------------------------------------------------------- |
| `/ui`                  | GET       | 本機獨立小工具網頁                                            |
| `/health`              | GET       | 健康狀態檢查，回傳 Extension/UI 連線與佇列狀態                |
| `/pdf/health`          | GET       | PaddleOCR / PDF runtime health check                          |
| `/pdf/ocr`             | POST      | Run PaddleOCR for one PDF page and return normalized OCR JSON |
| `/pdf/translate`       | POST      | Translate normalized OCR JSON and return MVP Markdown output  |
| `/v1/models`           | GET       | OpenAI 相容的模型清單                                         |
| `/v1/chat/completions` | POST      | 原型翻譯端點（自動執行多後端分流與 Chrome AI 分段）           |
| `/ws`                  | WebSocket | Extension/UI 連線入口                                         |

### PDF OCR health check

```bash
curl http://localhost:8001/pdf/health
```

If dependencies are missing, the bridge still starts and returns a `needs_setup` status with the missing modules.

### Single-page OCR smoke

```bash
curl -X POST "http://localhost:8001/pdf/ocr?page_index=0" \
  -H "Content-Type: application/pdf" \
  --data-binary "@input.pdf"
```

### OCR JSON translation smoke

```bash
curl -X POST http://localhost:8001/pdf/translate \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"openai/gpt-5-mini\",\"target_language\":\"Traditional Chinese\",\"output_mode\":\"bilingual-markdown\",\"ocr\":{\"pages\":[{\"page_index\":0,\"blocks\":[{\"page_index\":0,\"block_index\":0,\"text\":\"Hello PDF\",\"confidence\":0.98}]}]}}"
```

---

## 執行 OpenAI-compatible PDF 翻譯客戶端範例

### 1. 使用 Chrome AI (Gemini Nano) 本地翻譯

```bash
babeldoc input.pdf --openai-base-url http://localhost:8001/v1 --openai-api-key dummy --openai-model chrome-gemini
```

### 2. 使用 OpenAI 後端 (需先設定 `OPENAI_API_KEY`)

```bash
babeldoc input.pdf --openai-base-url http://localhost:8001/v1 --openai-api-key sk-xxx --openai-model openai/gpt-5-mini
```

### 3. 使用 LM Studio 本地模型 (需先啟動 LM Studio 載入模型)

```bash
babeldoc input.pdf --openai-base-url http://localhost:8001/v1 --openai-api-key dummy --openai-model lm-studio/llama-3.2-3b
```

### 4. 使用 Gemini API (需先設定 `GEMINI_API_KEY`)

```bash
babeldoc input.pdf --openai-base-url http://localhost:8001/v1 --openai-api-key dummy --openai-model gemini/gemini-2.5-flash
```
