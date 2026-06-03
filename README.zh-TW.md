# QQ Frog

QQ Frog 是本機優先的瀏覽器擴充功能，用於閱讀外語網頁、翻譯選取文字，並把日常瀏覽變成更輕量的語言學習流程。

英文主文件請見 [README.md](./README.md)。

## 原始樣板與目的

QQ Frog 是基於原始 Read Frog 瀏覽器擴充樣板，也就是「伴讀蛙」所建立的個人備份 fork。本專案主要用於自用備份、本機實驗，以及保留符合維護者自身瀏覽與翻譯流程的單機設定。

感謝原始 Read Frog / 伴讀蛙專案與貢獻者提供擴充功能基礎、產品想法與實作模式，讓此 fork 能在其成果上延伸。

## 功能

- 翻譯選取文字、完整網頁、輸入欄位與影片字幕。
- 保留 Google Translate 與 Microsoft Translate，提供不需 API key 的快速翻譯。
- 可使用自己的 AI 提供商，取得自訂提示詞、語意說明或字幕分段能力。
- 可儲存選取工具列的自訂 AI 動作，例如字典查詢與寫作修飾。
- 支援設定備份、匯出、匯入，以及透過 Google Drive app data 同步。

## 本機優先預設

QQ Frog 設計為可單機執行的瀏覽器擴充。Runtime 服務 URL 預設指向 localhost，API keys 由使用者在設定頁輸入，不會打包進 production build。

原始碼中的 App 參考設定只包含提供商定義與範例 AI 動作，不包含個人 API key、自訂 headers、provider options 或外部筆記資料庫連線。

## Google Drive 同步

設定可透過 Chrome extension OAuth flow 同步到使用者 Google Drive 的 `appDataFolder`。

若要在 build 中啟用，請建立 Chrome 擴充功能用的 Google OAuth client，並設定：

```bash
WXT_GOOGLE_CLIENT_ID=your-google-client-id
```

擴充功能會要求 Drive app-data 存取權，並讀取帳號 email 以區分同步 metadata。

## 開發

```bash
pnpm install
SKIP_FREE_API=true pnpm test
pnpm type-check
pnpm build
```

本機 agent 驗證建議設定 `SKIP_FREE_API=true`，因為 `free-api.test.ts` 依賴即時外部翻譯服務。

## 擴充介面

- Popup
- Options 設定頁
- Side panel
- Translation hub
- Content scripts
- DevTools panel

## 專案參考

- [專案資料夾結構](./docs/project-structure.md)
- [Security review](./docs/audit/security-review.md)
- [Privacy review](./docs/audit/privacy-review.md)
- [Permissions review](./docs/audit/permissions-review.md)
- [Release checklist](./docs/audit/release-checklist.md)
