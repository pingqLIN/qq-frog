# QQ Frog

本機單機版瀏覽器擴充，用於閱讀、翻譯與語言學習流程。

## 開發

```bash
pnpm install
SKIP_FREE_API=true pnpm test
pnpm type-check
pnpm build
```

本機 runtime URL 預設指向 localhost。只有在你明確啟動自有服務時，才需要透過 `.env.development` 或 `.env.production` 覆寫。

## 擴充介面

- Popup
- Options 設定頁
- Side panel
- Translation hub
- Content scripts
- DevTools panel

## 專案結構與審查

- [專案資料夾結構](./docs/project-structure.md)
- [Security review](./docs/audit/security-review.md)
- [Privacy review](./docs/audit/privacy-review.md)
- [Permissions review](./docs/audit/permissions-review.md)
- [Release checklist](./docs/audit/release-checklist.md)

## 外部服務

本機版保留 Google、Microsoft、OpenAI 相容提供者，以及其他由使用者設定的 AI/翻譯提供者。Runtime 服務目標應為 localhost 或使用者明確設定的自有服務。
