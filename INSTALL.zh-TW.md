# QQ Frog 安裝與使用教學

## 1. 環境需求

- Node.js `>= 22.0.0`
- `pnpm` 10.x（建議使用 Node 內建 corepack 管理）
- Chrome / Edge / Firefox 桌面瀏覽器（安裝與驗證）
- 選配：Python 3.11（本機 PDF 翻譯橋接服務與 OCR）
- Git（建置與開發）

## 2. 取得原始碼

```bash
git clone <your-forked-repo-url>
cd qq-frog
```

## 3. 安裝擴充套件相依套件

```bash
pnpm install --frozen-lockfile
```

## 4. 開發模式啟動擴充功能

```bash
pnpm dev
```

1. 開啟 `chrome://extensions`（或對應瀏覽器的擴充管理頁）。
2. 開啟 **Developer mode**。
3. 載入專案的 `extansion/` 目錄（或你本機對應路徑）。

若要先確保輸出一致，再跑：

```bash
pnpm build
```

## 5. 打包

```bash
pnpm build
pnpm zip              # Chrome 套件
pnpm zip:firefox      # Firefox 套件
pnpm zip:edge         # Edge 套件
```

## 6. 選配：本機 PDF 翻譯 Bridge

若未安裝，本機 PDF 翻譯功能會關閉，但一般網頁翻譯可正常使用。

### 6.1 安裝 Python 套件

```bash
cd bridge
py -3.11 -m venv ..\.venv-paddleocr
..\.venv-paddleocr\Scripts\python.exe -m pip install --upgrade pip setuptools wheel
..\.venv-paddleocr\Scripts\python.exe -m pip install paddlepaddle -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
..\.venv-paddleocr\Scripts\python.exe -m pip install -r requirements-paddleocr.txt
```

完成 `requirements-paddleocr.txt` 安裝後，才可使用 local OCR 的 PDF 翻譯。

### 6.2 啟動 bridge 服務

```bash
..\.venv-paddleocr\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001
```

檢查頁面：

- `http://localhost:8001/ui`（可選：Gemini Nano 輔助頁）
- `http://localhost:8001/pdf/health`（健康檢查）

### 6.3 可選：安裝 Native Messaging（本機自動啟動）

如果要讓 QQ Frog 從設定頁一鍵啟動本機橋接程式：

1. 至 `chrome://extensions` 複製 32 字元 extension ID
2. 執行：

```powershell
cd bridge
.\install_native_host_windows.ps1 -ExtensionId "<QQ_FROG_EXTENSION_ID>"
```

3. 回到 QQ Frog 的 Options → PDF Translation，設定 localhost URL 並驗證 bridge 狀態。

## 7. 檢查

```bash
curl http://localhost:8001/pdf/health
```

回應中若看到健康狀態且 OCR 可用，表示橋接服務可進入擴充端的進一步驗證。

## 8. 開發驗證

- `SKIP_FREE_API=true pnpm test`：避免本地驗證時依賴外部即時翻譯 API。
- `pnpm type-check`、`pnpm lint`：可作為發布前檢查。

## 9. 公開 repo 準備提醒

- 不要提交本機輸出（如 `extansion/pdf-result.html`、`node_modules`、`bridge/logs`、`.output`、`.audit`）與個資/私鑰。
- 第三方整合請保留可配置欄位並明確記錄用途，不要寫死為單一雲端帳號。

橋接服務與多後端路由說明請參考 [bridge/README.md](./bridge/README.md)。
