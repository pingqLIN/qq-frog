# 介面導覽

QQ Frog 是由多個小型 Chrome extension 介面組成，而不是單一大型 app 視窗。本導覽依據本機 `appsrc/` intake 資料夾內已檢視的介面截圖整理。

原始 intake 截圖會保留在本機，因為內容包含瀏覽器外框、即時網頁與影音播放脈絡。若需要公開展示圖片，應另行整理成可發布素材並放在 `extansion/src/assets/demo/`。

## Options 設定頁

Options 是此本機優先 fork 的主要設定中心。

- General 將各功能對應到啟用中的 provider，包括頁面翻譯、影片字幕、選取工具列翻譯、輸入翻譯、自訂 AI actions 與語言偵測。
- API Providers 存放使用者自行管理的 provider entries，例如 Google Translate、Gemini、DeepLX、OpenAI 與 OpenAI-compatible providers。API keys 由使用者自行輸入，不會打包在 repository 內。
- Custom AI Actions 定義可重複使用的選取文字結構化動作。已檢視設定特別偏向台灣繁體中文的出版品質翻譯、術語保留與忠於來源。
- Overlay Tools 設定頁面內入口，例如浮動按鈕、選取工具列與右鍵選單。

## Popup

Toolbar popup 是頁面翻譯的快速入口。

- 選擇來源語言與目標語言。
- 選擇翻譯模式，例如雙語顯示。
- 指定目前動作用的翻譯服務。
- 切換站台層級行為，包括在目前網站停用 extension、永遠翻譯此網站、hover 翻譯與 AI smart context。
- 從底部列進入 Options 或 More actions。

## 頁面覆蓋工具

QQ Frog 提供輕量的頁面內控制，不必離開目前分頁即可閱讀與翻譯。

- 右鍵選單加入 QQ Frog Translate 指令，可用於選取文字或目前頁面動作。
- 選取工具列會出現在 highlighted text 附近，將選取段落送入翻譯流程。
- 浮動按鈕提供快速頁面內翻譯控制。

## Side Panel 與 Translation Hub

Side panel 適合較長段落與 provider 比較。

- Translate tab 可輸入來源文字、目標語言、翻譯模式與 provider preset。
- Provider rows 可用不同服務比較或重新執行翻譯。
- Panel 會保留原始頁面可見，適合需要上下文的閱讀與校對。

## 影片字幕

影片字幕介面聚焦在 YouTube subtitle workflow。

- Player overlay 可啟用或停用 QQ Frog video subtitles，並開啟字幕工具。
- Side panel 的 Video Subtitles tab 可設定字幕啟用、自動啟用、AI segmentation、display mode、position、opacity 與 font styling。
- 已檢視流程顯示可在影片播放時疊加雙語字幕，並把樣式控制留在 side panel。

## 文件位置

- README 只保留精簡、對外可讀的畫面入口。
- 本文件負責完整介面地圖與使用流程說明。
- 原始截圖批次保留在 `appsrc/` 或其他 ignored intake folder，等需要公開素材時再另外整理。
