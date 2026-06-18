# 專案資料夾結構

本專案是既有 WXT / Manifest V3 擴充功能，不使用 starter 的極簡 `src/popup`、`src/options` 目錄形狀。Chrome extension 程式碼集中在 `extansion/` 目錄；以下文件作為 `$start-chrome-extension-project` 標準與目前程式碼的對照。

## 根目錄

- `wxt.config.ts`: Manifest V3、permissions、host permissions、build/dev 設定來源。
- `package.json`: pnpm scripts、dependencies、Chrome extension build/test 指令。
- `.env.example`: 本機單機版 runtime URL 範例。
- `README.md` / `README.zh-TW.md`: 專案用途、開發指令、外部服務邊界。
- `docs/audit/`: Chrome extension security、privacy、permissions、release 審查文件。
- `docs/audit/local-service-ports.md`: 本機服務 port 登記與臨時 smoke port 治理規則。
- `extansion/`: Chrome extension 工作目錄；`pnpm build` 後此目錄根層會同步 `manifest.json` 與可載入產物。
- `extansion/.output/chrome-mv3/`: WXT 原始 build output，供同步腳本產生 `extansion/` 根層可載入版本。

## 擴充功能入口

- `extansion/src/entrypoints/background/`: background service worker 與跨頁面協調。
- `extansion/src/entrypoints/popup/`: toolbar popup UI。
- `extansion/src/entrypoints/options/`: 設定頁與 provider/config UI。
- `extansion/src/entrypoints/devtools.*`: DevTools 面板入口，載入擴充設定介面。
- `extansion/src/entrypoints/sidepanel/`: Chrome side panel 入口。
- `extansion/src/entrypoints/translation-hub/`: 獨立翻譯工作臺。
- `extansion/src/entrypoints/*.content/`: content scripts 與頁面內 UI。
- `extansion/src/entrypoints/offscreen/`: offscreen document 入口。

## 共用模組

- `extansion/src/utils/`: translation、config、storage、request、host DOM、subtitles 等共用邏輯。
- `extansion/src/types/`: config schema 與 provider 型別。
- `extansion/src/hooks/`: React hooks。
- `extansion/src/components/`: 跨入口共用 UI。
- `extansion/src/locales/`: i18n 文案。

## 靜態資源

- `extansion/public/`: WXT 打包用 public assets。
- `extansion/src/assets/`: provider icon、avatar、UI 圖示等程式內引用資產。
- `extansion/assets/`: 專案層級素材與輔助資源。

## 建置與測試

- `scripts/`: 維護與資料產生腳本。
- `vitest.config.ts` / `vitest.setup.ts`: 測試設定。
- `tsconfig.json`: TypeScript 設定。
- `eslint.config.mjs`: lint 設定。

Chrome 開發者模式載入 unpacked extension 時，請先執行 `pnpm build`，再選 `extansion/`。

## 本機單機版邊界

- 預設 runtime URL 指向 localhost。
- Runtime service target 僅限 localhost 或使用者明確設定的自有服務。
- Google、Microsoft、OpenAI-compatible 與使用者自行設定的 provider 屬於保留的第三方整合。
