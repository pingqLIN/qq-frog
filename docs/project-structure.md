# 專案資料夾結構

本專案是既有 WXT / Manifest V3 擴充功能，不使用 starter 的極簡 `src/popup`、`src/options` 目錄形狀。以下文件作為 `$start-chrome-extension-project` 標準與目前程式碼的對照。

## 根目錄

- `wxt.config.ts`: Manifest V3、permissions、host permissions、build/dev 設定來源。
- `package.json`: pnpm scripts、dependencies、Chrome extension build/test 指令。
- `.env.example`: 本機單機版 runtime URL 範例。
- `README.md` / `README.zh-TW.md`: 專案用途、開發指令、外部服務邊界。
- `docs/audit/`: Chrome extension security、privacy、permissions、release 審查文件。

## 擴充功能入口

- `src/entrypoints/background/`: background service worker 與跨頁面協調。
- `src/entrypoints/popup/`: toolbar popup UI。
- `src/entrypoints/options/`: 設定頁與 provider/config UI。
- `src/entrypoints/devtools.*`: DevTools 面板入口，載入擴充設定介面。
- `src/entrypoints/sidepanel/`: Chrome side panel 入口。
- `src/entrypoints/translation-hub/`: 獨立翻譯工作臺。
- `src/entrypoints/*.content/`: content scripts 與頁面內 UI。
- `src/entrypoints/offscreen/`: offscreen document 入口。

## 共用模組

- `src/utils/`: translation、config、storage、request、host DOM、subtitles 等共用邏輯。
- `src/types/`: config schema 與 provider 型別。
- `src/hooks/`: React hooks。
- `src/components/`: 跨入口共用 UI。
- `src/locales/`: i18n 文案。

## 靜態資源

- `public/`: WXT 打包用 public assets。
- `src/assets/`: provider icon、avatar、UI 圖示等程式內引用資產。
- `assets/`: 專案層級素材與輔助資源。

## 建置與測試

- `scripts/`: 維護與資料產生腳本。
- `vitest.config.ts` / `vitest.setup.ts`: 測試設定。
- `tsconfig.json`: TypeScript 設定。
- `eslint.config.mjs`: lint 設定。

## 本機單機版邊界

- 預設 runtime URL 指向 localhost。
- 原始 Read Frog website/API/blog/survey/Discord/upstream links 不作為 runtime service target。
- Google、Microsoft、OpenAI-compatible 與使用者自行設定的 provider 屬於保留的第三方整合。
