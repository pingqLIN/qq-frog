# Permissions Review

狀態：本機單機版審查基準。

## Manifest 來源

目前 permissions 由 `wxt.config.ts` 產生，而不是手寫 `manifest.json`。

## 已宣告權限

| 權限            | 用途                                                                       | 審查狀態                                                                               |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `storage`       | 儲存本機設定、provider 設定、快取狀態、使用者偏好。                        | 保留。                                                                                 |
| `tabs`          | 讀取與操作目前分頁，支援 popup、side panel、translation hub 等跨分頁流程。 | 後續可檢查是否能以 `activeTab` 部分替代。                                              |
| `alarms`        | 排程背景工作，例如備份或週期性狀態處理。                                   | 保留，需維持用途文件。                                                                 |
| `cookies`       | 本機服務或登入狀態相關流程使用。                                           | 高敏感，若本機版不需要登入同步，應列入後續收斂。                                       |
| `contextMenus`  | 右鍵選單翻譯與選取文字操作。                                               | 保留。                                                                                 |
| `identity`      | Google Drive OAuth / sync 等使用者主動啟用功能。                           | 保留；只在使用者點擊 Google Drive 同步時觸發，登出會清 token 與 last-synced metadata。 |
| `scripting`     | 對頁面注入翻譯/字幕/互動 UI。                                              | 保留。                                                                                 |
| `webNavigation` | 追蹤頁面導覽以維持翻譯狀態。                                               | 保留，後續可確認是否可縮窄事件使用面。                                                 |
| `offscreen`     | Chrome/Edge 非 Firefox 環境的 offscreen document。                         | 保留。                                                                                 |
| `sidePanel`     | Chrome/Edge side panel UI。                                                | 保留。                                                                                 |

## Host Permissions

目前設定：

```json
["*://*/*"]
```

理由：既有頁面翻譯、字幕、選取文字與 `scripting.executeScript` 需要在使用者瀏覽的頁面中運作。

風險：這是 Chrome Web Store 審查成本最高的範圍之一。若準備公開發布，應先評估：

- 是否能改成 `activeTab` 加使用者手動觸發。
- 是否能以 options 中的 allowlist 產生較窄 host scope。
- 是否能把字幕功能限制在 `https://www.youtube.com/*`。
- 是否能把內容腳本延後到使用者明確啟用後再執行。

## 未決事項

- `cookies` 權限是否仍為本機單機版必要權限。
- `tabs` 與 `webNavigation` 是否可縮窄。
- `*://*/*` 是否可在公開版分支中拆成更窄 host patterns。
