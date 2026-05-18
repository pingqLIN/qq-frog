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

已移除作為 runtime service target 的原始 Read Frog 外部服務：

- Read Frog website/API/blog/survey。
- Read Frog Discord/community links。
- upstream GitHub project links。

## Analytics

程式中仍存在 PostHog analytics 相關模組與設定。公開發布前需要確認：

- analytics 是否預設關閉。
- 使用者是否能清楚看到並控制 analytics 偏好。
- 傳送事件是否不包含頁面文字、選取文字、API key、OAuth token 或私人 URL。

## 敏感資訊

- API keys 不應寫入 repository。
- production build 會阻擋非白名單 `WXT_*_API_KEY` 被打包。
- `.env.example` 只保留 localhost 與公開範例值。

## 未決事項

- 本機單機版是否完全停用 analytics。
- Google Drive sync 的 token retention 與撤銷流程是否需要補充 UI 說明。
- 若未來要發布到 Chrome Web Store，需要撰寫對應 store privacy disclosure。
