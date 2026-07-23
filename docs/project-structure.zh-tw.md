# 專案架構

本專案使用 WXT 與 Manifest V3，並且只保留一個原始碼邊界與一個正式
canonical artifact：

```text
extansion/src + extansion/public
              |
              v
       隔離的 WXT staging build
              |
              v
   manifest、功能與資產契約驗證
              |
              v
       dist/chrome-mv3
```

未加語言後綴的英文文件 [`project-structure.md`](./project-structure.md) 是
權威版本；本文件是繁體中文參考版。

## 權威邊界

- `extansion/src/`：擴充功能原始碼與 WXT entrypoints。
- `extansion/public/`：直接複製進擴充功能的靜態檔案。
- `extansion/src/assets/`：由 bundler 處理的應用程式資產。
- `extansion/assets/`：repository 文件與輔助素材，不是 extension output。
- `dist/chrome-mv3/`：唯一支援的正式 unpacked-extension 載入位置。
- `dist/dev/`：WXT 開發產物，不是正式產物。
- `.build/extension/`：隔離的 staging build，禁止從 Chrome 載入。
- `extansion/.del/`：舊根目錄建置產物的可復原封存區。

`extansion/` 本身不能再當作 extension 載入。若該目錄根層再次出現
`manifest.json`，代表舊建置流程復發，審查必須失敗。

## 建置交易

`pnpm build` 會依序執行：

1. 驗證原始碼層的必要功能契約。
2. 在唯一的 `.build/extension/<build-id>` 目錄進行 staging build。
3. 驗證 Manifest V3、manifest references、icon 尺寸、extension HTML、
   禁止 `modulepreload`、Chrome 內建 AI 與 PDF result 產物。
4. 寫入 `BUILD_INFO.json`，記錄來源 Git commit 與 dirty 狀態。
5. 將前一份正式產物移到 `dist/.del/`。
6. 將通過驗證的 staging artifact 提升為 `dist/chrome-mv3`。
7. 將舊根目錄產物移到 `extansion/.del/`。

驗證失敗時，前一份正式產物不會被覆蓋。若 promotion 失敗，建置流程會
還原前一份正式產物。

## 必要功能契約

缺少下列任一項時，正式建置必須失敗：

- `chrome-ai` 仍是 API provider。
- Provider dialog 仍有 Chrome Built-in AI 群組。
- Prompt API adapter 仍然存在。
- PDF result entrypoint 仍然存在。
- 編譯後 JavaScript 仍包含 Chrome AI provider identifiers。

如此可把「功能默默消失」改成明確的 build failure。

## 指令

```bash
pnpm build
pnpm verify:extension
pnpm build:edge
pnpm build:firefox
pnpm zip
```

請從 `chrome://extensions` 載入 `dist/chrome-mv3`。每次建置成功後，重新
載入該 extension。

## 原始碼區域

- `extansion/src/entrypoints/background/`：Manifest V3 service worker 與
  跨介面協調。
- `extansion/src/entrypoints/popup/`：toolbar popup。
- `extansion/src/entrypoints/options/`：設定與 provider UI。
- `extansion/src/entrypoints/sidepanel/`：Chrome side panel。
- `extansion/src/entrypoints/translation-hub/`：翻譯工作臺。
- `extansion/src/entrypoints/*.content/`：content scripts。
- `extansion/src/entrypoints/offscreen/`：offscreen document。
- `extansion/src/utils/`：翻譯、設定、儲存與 runtime helpers。
- `extansion/src/types/`：設定 schema 與 provider types。

## Commit Gate

`lint-staged.config.mjs` 會把檔案路徑分批，避免超過 Windows command-line
長度限制。大型版本恢復也能使用與一般提交相同的 lint gate，不必繞過。
