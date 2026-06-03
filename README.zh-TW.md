# QQ Frog

![QQ Frog 輕量化版本 banner](./extansion/assets/readme-banner.jpg)

QQ Frog 是基於 Read Frog / 伴讀蛙的輕量化、本機優先個人 fork，用於日常閱讀與翻譯。

英文主文件請見 [README.md](./README.md)。

## 原始樣板與目的

QQ Frog 是基於原始 Read Frog 瀏覽器擴充樣板，也就是「伴讀蛙」所建立的個人備份 fork。本專案主要用於自用備份、本機實驗，以及保留符合維護者自身瀏覽與翻譯流程的單機設定。

感謝原始 Read Frog / 伴讀蛙專案與貢獻者提供擴充功能基礎、產品想法與實作模式，讓此 fork 能在其成果上延伸。

## 輕量化版本

此 fork 將擴充功能收斂在自用的小型流程：快速閱讀網頁、選取翻譯、本機設定，以及可選的個人 provider 設定。

專案不打包個人憑證，並盡量降低 hosted/runtime 假設。

## 畫面預覽

![選取工具列](./extansion/src/assets/demo/selection-toolbar.png)

![浮動按鈕](./extansion/src/assets/demo/floating-button.png)

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

## 授權與致謝

此 fork 以 GNU General Public License v3.0 only 授權散布。請見 [LICENSE](./LICENSE)。

本專案修改自原始 Read Frog / 伴讀蛙瀏覽器擴充樣板。此 repository 內的修改是 2026 年為輕量化個人備份與本機自用版本所做。
