export function protectSelectAllShadowRoot(shadowHost: HTMLElement, wrapper: HTMLElement) {
  // ① 追蹤鼠標是否在組件上
  let pointerInside = false
  shadowHost.addEventListener("pointerenter", () => {
    pointerInside = true
  })
  shadowHost.addEventListener("pointerleave", () => {
    pointerInside = false
  })

  window.addEventListener(
    "keydown",
    (e) => {
      // 只處理 Ctrl+A (Windows/Linux) 或 Cmd+A (Mac)
      // metaKey 是 Mac 的 Command 鍵
      // ctrlKey 是 Windows 的 Ctrl 鍵
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !e.shiftKey) {
        const active = document.activeElement

        /* --- 分四種情況 --- */
        if (shadowHost.contains(active)) {
          // A. 焦點已經在組件裡 → 放行默認行為
          return
        }

        if (isEditableElement(active)) {
          // B. 焦點在可編輯元素中（輸入框、文本區域等）→ 放行默認行為
          return
        }

        // C. 當焦點在其他 shadow root 內（active 是其他 shadow host）→ 放行默認行為
        if (active && (active as HTMLElement).shadowRoot) {
          return
        }

        if (pointerInside) {
          // D. 鼠標懸停在組件裡 → 自定義"組件專選"
          e.preventDefault()
          e.stopPropagation()
          requestAnimationFrame(() => selectAllInside(wrapper))
          return
        }

        // E. 其它情況（宿主頁面全選，但排除組件）
        // 沒有任何交互時 → active = document.body
        // 只有當焦點在 body 或無焦點時，才執行"排除組件的全選"
        // 如果焦點在其他元素上（如 canvas 等），可能有應用自己的處理邏輯，不應幹預
        // 點擊了 canvas（如 Excalidraw） → <canvas> 元素
        if (active === document.body || !active) {
          e.preventDefault()
          e.stopPropagation()
          requestAnimationFrame(() => rebuildSelectionWithoutHost(shadowHost))
        }
      }
    },
    true, // capture
  )
}

/* 檢查元素是否可編輯 */
function isEditableElement(element: Element | null): boolean {
  if (!element)
    return false

  const tagName = element.tagName.toLowerCase()

  // 檢查 input 元素（排除非文本類型）
  if (tagName === "input") {
    const inputType = (element as HTMLInputElement).type.toLowerCase()
    const textInputTypes = ["text", "password", "search", "tel", "url", "email"]
    return textInputTypes.includes(inputType)
  }

  // 檢查 textarea
  if (tagName === "textarea") {
    return true
  }

  // 檢查 contenteditable
  const contentEditable = element.getAttribute("contenteditable")
  if (contentEditable === "true" || contentEditable === "") {
    return true
  }

  return false
}

/* 全選組件內部（只需 1 個 Range） */
function selectAllInside(root: HTMLElement) {
  const sel = window.getSelection()
  if (!sel)
    return
  sel.removeAllRanges()

  const range = document.createRange()
  range.selectNodeContents(root) // 選中整個 wrapper ⭐
  sel.addRange(range) // 立即呈現高亮
}

// 選中整個頁面，但跳過你的 shadow host 組件。
function rebuildSelectionWithoutHost(shadowHost: HTMLElement) {
  const sel = window.getSelection()
  if (!sel)
    return
  sel.removeAllRanges()

  const before = document.createRange()
  before.setStart(document.body, 0)
  before.setEndBefore(shadowHost)

  const after = document.createRange()
  after.setStartAfter(shadowHost)
  after.setEnd(document.body, document.body.childNodes.length)

  sel.addRange(before)
  sel.addRange(after)
}
