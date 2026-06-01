# Security Review

狀態：本機單機版審查基準。

## 基準

- Manifest V3。
- 使用 WXT 產生 manifest。
- Runtime target 僅限 localhost 或使用者明確設定的自有服務。
- 不應在 extension bundle 中打包使用者 API key。

## 主要攻擊面

- Content script 讀取與修改網頁 DOM。
- Background service worker 與 content/popup/options/side panel 之間的 message channel。
- 使用者自訂 API provider、base URL、headers、provider options。
- Google OAuth / Google Drive sync。
- 字幕擷取與第三方影片平臺 DOM 變動。
- DevTools panel 載入 options UI。

## 目前保護措施

- production build 會檢查可能被打包的 `WXT_*_API_KEY`。
- runtime URL 預設改為 localhost。
- 自訂 provider 設定由 schema 驗證。

## 後續審查重點

- 檢查所有 message handler 是否驗證 payload shape 與呼叫來源。
- 檢查所有外部資料進入 React/DOM 前是否經過適當 escaping 或結構化處理。
- 檢查 content script 是否避免執行遠端程式碼、`eval` 或 runtime script loader。
- 檢查 `host_permissions: ["*://*/*"]` 是否能縮窄。
- 檢查 `cookies`、`identity` 權限是否只在必要流程中使用。

## 未決事項

- 針對公開發布版建立更窄權限設定。
- 對 Google Drive sync 與 analytics 做一次獨立資料流審查。
- 以實際 build 後的 manifest 做最終 permission diff。
