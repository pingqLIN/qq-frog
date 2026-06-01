# Release Checklist

狀態：本機單機版審查基準。

## 本機開發

- [ ] `pnpm install --frozen-lockfile` 可在 Windows PowerShell 正常完成。
- [ ] `SKIP_FREE_API=true pnpm test` 通過。
- [ ] `pnpm type-check` 通過。
- [ ] `pnpm build` 通過。
- [ ] Chrome 載入 build output 後 popup、options、side panel、translation hub、DevTools panel 可開啟。

## 外部服務

- [ ] Runtime target 僅限 localhost 或使用者明確設定的自有服務。
- [ ] Google 等第三方 provider 保留且只在使用者設定或啟用時使用。
- [ ] `.env.production` 不包含私人 API key。
- [ ] provider base URL 與 headers 不會被公開文件誤導為內建服務。

## Store Readiness

- [ ] extension name、description、icons、screenshots 與目前 QQ Frog 行為一致。
- [ ] `host_permissions` 有公開發布可接受的最小化說明。
- [ ] `cookies`、`identity`、`tabs`、`webNavigation` 權限有明確使用者價值與審查理由。
- [ ] privacy disclosure 覆蓋頁面文字、選取文字、字幕、provider requests、Google Drive sync、analytics。
- [ ] build output 不包含 `docs/`、內部計畫、開發時程或本機研究筆記。

## 目前已知注意事項

- `postinstall` 使用 `scripts/wxt-prepare.mjs` 設定 `WXT_SKIP_ENV_VALIDATION=true`，避免 Windows PowerShell 無法解析 POSIX env assignment。
