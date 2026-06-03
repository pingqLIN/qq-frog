import "@/utils/zod-config"
import type { ContentScriptContext } from "#imports"
import type { ThemeMode } from "@/types/config/theme"
import { browser, createShadowRootUi, defineContentScript } from "#imports"
import { QueryClientProvider } from "@tanstack/react-query"
import { kebabCase } from "case-anything"
import { Provider as JotaiProvider } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import ReactDOM from "react-dom/client"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/base-ui/tooltip"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { getLocalConfig } from "@/utils/config/storage"
import { APP_NAME } from "@/utils/constants/app"
import { isExtensionContextInvalidatedError } from "@/utils/extension-context"
import { ensureIconifyBackgroundFetch } from "@/utils/iconify/setup-background-fetch"
import { protectSelectAllShadowRoot } from "@/utils/select-all"
import { insertShadowRootUIWrapperInto } from "@/utils/shadow-root"
import { clearEffectiveSiteControlUrl, getEffectiveSiteControlUrl, isSiteEnabled } from "@/utils/site-control"
import { addStyleToShadow } from "@/utils/styles"
import { queryClient } from "@/utils/tanstack-query"
import { getLocalThemeMode } from "@/utils/theme"
import App from "./app"
import "@/assets/styles/theme.css"

function HydrateAtoms({
  initialValues,
  children,
}: {
  initialValues: [[typeof baseThemeModeAtom, ThemeMode]]
  children: React.ReactNode
}) {
  useHydrateAtoms(initialValues)
  return children
}

// eslint-disable-next-line import/no-mutable-exports
export let shadowWrapper: HTMLElement | null = null

declare global {
  interface Window {
    __READ_FROG_SELECTION_INJECTED__?: boolean
  }
}

const SIDE_PANEL_SELECTION_CHANGED_MESSAGE = "qq-frog:side-panel-selection-changed"
const SIDE_PANEL_GET_CURRENT_SELECTION_MESSAGE = "qq-frog:side-panel-get-current-selection"

interface SidePanelSelectionChangedMessage {
  type: typeof SIDE_PANEL_SELECTION_CHANGED_MESSAGE
  text: string
  title: string
  url: string
}

interface SidePanelGetCurrentSelectionMessage {
  type: typeof SIDE_PANEL_GET_CURRENT_SELECTION_MESSAGE
}

function readCurrentPageSelection() {
  const text = window.getSelection()?.toString().trim() ?? ""
  if (!text)
    return null

  return {
    text,
    title: document.title,
    url: window.location.href,
  }
}

function isSidePanelGetCurrentSelectionMessage(message: unknown): message is SidePanelGetCurrentSelectionMessage {
  return Boolean(
    message
    && typeof message === "object"
    && "type" in message
    && message.type === SIDE_PANEL_GET_CURRENT_SELECTION_MESSAGE,
  )
}

function installSidePanelSelectionBridge(ctx: ContentScriptContext) {
  let lastSentText = ""
  let sendTimerId: number | null = null

  const sendCurrentSelection = () => {
    const selection = readCurrentPageSelection()
    if (!selection || selection.text === lastSentText)
      return

    lastSentText = selection.text
    const message: SidePanelSelectionChangedMessage = {
      type: SIDE_PANEL_SELECTION_CHANGED_MESSAGE,
      ...selection,
    }

    void browser.runtime.sendMessage(message).catch((error) => {
      if (isExtensionContextInvalidatedError(error))
        return

      console.warn("[QQ Frog] Failed to send side panel selection", error)
    })
  }

  const scheduleSendCurrentSelection = () => {
    if (sendTimerId !== null)
      window.clearTimeout(sendTimerId)

    sendTimerId = window.setTimeout(sendCurrentSelection, 120)
  }

  const handleMouseUp = () => {
    requestAnimationFrame(scheduleSendCurrentSelection)
  }

  const handleSelectionChange = () => {
    scheduleSendCurrentSelection()
  }

  const handleMessage = (message: unknown) => {
    if (!isSidePanelGetCurrentSelectionMessage(message))
      return undefined

    return readCurrentPageSelection()
  }

  document.addEventListener("mouseup", handleMouseUp)
  document.addEventListener("selectionchange", handleSelectionChange)
  browser.runtime.onMessage.addListener(handleMessage)

  ctx.onInvalidated(() => {
    if (sendTimerId !== null)
      window.clearTimeout(sendTimerId)

    document.removeEventListener("mouseup", handleMouseUp)
    document.removeEventListener("selectionchange", handleSelectionChange)
    browser.runtime.onMessage.removeListener(handleMessage)
  })
}

async function mountSelectionUI(ctx: ContentScriptContext) {
  ensureIconifyBackgroundFetch()

  const themeMode = await getLocalThemeMode()

  const ui = await createShadowRootUi(ctx, {
    name: `${kebabCase(APP_NAME)}-selection`,
    position: "overlay",
    anchor: "body",
    onMount: (container, shadow, shadowHost) => {
      const wrapper = insertShadowRootUIWrapperInto(container)
      shadowWrapper = wrapper
      addStyleToShadow(shadow)
      protectSelectAllShadowRoot(shadowHost, wrapper)

      const root = ReactDOM.createRoot(wrapper)
      root.render(
        <QueryClientProvider client={queryClient}>
          <JotaiProvider>
            <HydrateAtoms initialValues={[[baseThemeModeAtom, themeMode]]}>
              <ThemeProvider container={wrapper}>
                <TooltipProvider>
                  <App uiContainer={container} />
                </TooltipProvider>
              </ThemeProvider>
            </HydrateAtoms>
          </JotaiProvider>
        </QueryClientProvider>,
      )
      return root
    },
    onRemove: (root) => {
      root?.unmount()
      shadowWrapper = null
    },
  })

  ui.mount()
}

export default defineContentScript({
  matches: ["*://*/*", "file:///*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    // Prevent double injection (manifest-based + programmatic injection)
    if (window.__READ_FROG_SELECTION_INJECTED__)
      return
    window.__READ_FROG_SELECTION_INJECTED__ = true

    try {
      ctx.onInvalidated(() => {
        window.__READ_FROG_SELECTION_INJECTED__ = false
        clearEffectiveSiteControlUrl()
      })

      // Check global site control
      const config = await getLocalConfig()
      const siteControlUrl = getEffectiveSiteControlUrl(window.location.href)
      if (!isSiteEnabled(siteControlUrl, config)) {
        window.__READ_FROG_SELECTION_INJECTED__ = false
        clearEffectiveSiteControlUrl()
        return
      }

      installSidePanelSelectionBridge(ctx)
      void mountSelectionUI(ctx)
    }
    catch (error) {
      window.__READ_FROG_SELECTION_INJECTED__ = false
      clearEffectiveSiteControlUrl()

      if (isExtensionContextInvalidatedError(error))
        return

      throw error
    }
  },
})
