# Privacy Review

狀態：本機單機版審查基準。

## 資料處理摘要

本擴充功能會處理使用者正在閱讀或選取的網頁文字，用於翻譯、詞彙解析、字幕翻譯、自訂 AI action、文字轉語音與相關 UI 顯示。

## 本機儲存

可能儲存在 Chrome extension storage 的資料包含：

- 擴充功能設定。
- API provider 設定與模型選項。
- 使用者自訂 prompt / action。
- 介面偏好、語言偏好、快捷鍵設定。
- 翻譯快取、字幕快取、備份中繼資料。
- Google Drive sync 啟用後的 OAuth token 或同步中繼資料。

## 外部資料傳送

保留的第三方整合：

- Google / Google Drive / Google Translate / Google AI provider。
- Microsoft、DeepL、OpenAI-compatible、OpenRouter、Ollama、本機或使用者自訂 provider。
- 使用者明確設定的 translation / AI / TTS API endpoint。

不保留專案來源站台、社群、更新文章或問卷入口作為 runtime service target。

## Google 服務邊界

- Google Drive sync 僅使用 `drive.appdata` scope，檔名為 `qq-frog-config.json`，用途限於同步本擴充功能設定、使用者自訂 prompt/action、語言偏好、provider 設定與同步中繼資料。
- Google Drive sync 使用使用者個人 Google 帳號授權；build 需提供 Chrome extension OAuth client ID，runtime 由 `chrome.identity.getAuthToken` 或 `browser.identity.launchWebAuthFlow` 觸發 Google 帳號選擇與 consent。
- Google Drive sync 會讀取 Google userinfo email，用於判斷目前同步帳號與 last-synced metadata 是否一致；不會將 email 寫入遠端備份檔內容。
- Google Drive OAuth token 只存於 extension local storage 的 `__googleDriveToken`，登出時會同時清除 token 與 `lastSyncedConfig` metadata。
- Google Translate 只接收使用者要求翻譯的文字 chunk、來源語言與目標語言；不應傳送 extension 設定、API key、OAuth token 或 Google Drive 備份內容。
- Google AI provider 只在使用者選擇或設定對應 provider 時使用。

## Analytics

公開發布前需要確認：

- analytics 是否預設關閉。
- 使用者是否能清楚看到並控制 analytics 偏好。
- 傳送事件是否不包含頁面文字、選取文字、API key、OAuth token 或私人 URL。

## 敏感資訊

- API keys 不應寫入 repository。
- production build 會阻擋非白名單 `WXT_*_API_KEY` 被打包。
- `.env.example` 只保留 localhost 與公開範例值。

## 未決事項

- 本機單機版是否完全停用 analytics。
- Google Drive sync 若要提供 token revoke UI，需另行審查 Google revoke endpoint 與錯誤處理。
- 若未來要發布到 Chrome Web Store，需要撰寫對應 store privacy disclosure。
