import type { browser } from "#imports"
import type { onMessage } from "@/utils/message"
import type { PdfTabLike } from "@/utils/pdf-tab-session"
import {
  clearPdfTabSession,
  createPdfTabSessionFromTab,
  getPdfTabSession,
  setActivePdfTabSession,
} from "@/utils/pdf-tab-session"

const SIDE_PANEL_PATH = "sidepanel.html"

interface PdfTabSessionLogger {
  error: (...args: any[]) => void
  warn: (...args: any[]) => void
}

interface SidePanelOptionsApi {
  setOptions?: (options: { tabId: number, path?: string, enabled?: boolean }) => Promise<void> | void
}

interface GetActivePdfTabSessionMessage {
  data?: {
    tabId?: number
    windowId?: number
  }
}

function getSidePanelOptionsApi(extensionBrowser: typeof browser): SidePanelOptionsApi | null {
  const browserWithSidePanel = extensionBrowser as typeof extensionBrowser & { sidePanel?: SidePanelOptionsApi }
  if (typeof browserWithSidePanel.sidePanel?.setOptions === "function")
    return browserWithSidePanel.sidePanel

  const globalWithChrome = globalThis as typeof globalThis & {
    chrome?: { sidePanel?: SidePanelOptionsApi }
  }
  if (typeof globalWithChrome.chrome?.sidePanel?.setOptions === "function")
    return globalWithChrome.chrome.sidePanel

  return null
}

function toPdfTabLike(tab: PdfTabLike | undefined, fallback: Partial<PdfTabLike> = {}): PdfTabLike {
  return {
    id: tab?.id ?? fallback.id,
    windowId: tab?.windowId ?? fallback.windowId,
    title: tab?.title ?? fallback.title,
    url: fallback.url ?? tab?.url,
    pendingUrl: fallback.pendingUrl ?? tab?.pendingUrl,
  }
}

async function enablePdfSidePanelForTab(extensionBrowser: typeof browser, tabId: number, logger: PdfTabSessionLogger) {
  const sidePanel = getSidePanelOptionsApi(extensionBrowser)
  if (!sidePanel?.setOptions)
    return

  try {
    await sidePanel.setOptions({
      tabId,
      path: SIDE_PANEL_PATH,
      enabled: true,
    })
  }
  catch (error) {
    logger.warn("[Background] Failed to enable PDF side panel for tab", tabId, error)
  }
}

export function setupPdfTabSessionTracker({
  extensionBrowser,
  logger,
  registerMessageHandler,
}: {
  extensionBrowser: typeof browser
  logger: PdfTabSessionLogger
  registerMessageHandler: typeof onMessage
}) {
  const storageArea = extensionBrowser.storage.session

  async function refreshPdfTabSession(tab: PdfTabLike) {
    const session = createPdfTabSessionFromTab(tab)
    if (session) {
      await setActivePdfTabSession(storageArea, session)
      await enablePdfSidePanelForTab(extensionBrowser, session.tabId, logger)
      return session
    }

    if (typeof tab.id === "number")
      await clearPdfTabSession(storageArea, tab.id)

    return null
  }

  async function refreshActiveTabPdfSession(target?: { tabId?: number, windowId?: number }) {
    if (typeof target?.tabId === "number") {
      const tab = await extensionBrowser.tabs.get(target.tabId)
      if (typeof target.windowId === "number" && tab.windowId !== target.windowId)
        return null

      return await refreshPdfTabSession(toPdfTabLike(tab))
    }

    const [tab] = await extensionBrowser.tabs.query({ active: true, currentWindow: true })
    if (!tab)
      return null

    return await refreshPdfTabSession(toPdfTabLike(tab))
  }

  registerMessageHandler("getActivePdfTabSession", async (message: GetActivePdfTabSessionMessage = {}) => {
    try {
      const refreshedSession = await refreshActiveTabPdfSession(message.data)
      if (refreshedSession)
        return refreshedSession

      if (typeof message.data?.tabId === "number")
        return await getPdfTabSession(storageArea, message.data.tabId)

      return null
    }
    catch (error) {
      logger.error("[Background] Failed to read active PDF tab session", error)
      return null
    }
  })

  extensionBrowser.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      const tab = await extensionBrowser.tabs.get(activeInfo.tabId)
      await refreshPdfTabSession(toPdfTabLike(tab))
    })().catch(error => logger.error("[Background] Failed to refresh PDF tab session on activation", error))
  })

  extensionBrowser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!changeInfo.url && changeInfo.status !== "complete")
      return

    void refreshPdfTabSession(toPdfTabLike(tab, {
      id: tabId,
      url: changeInfo.url,
    })).catch(error => logger.error("[Background] Failed to refresh PDF tab session on update", error))
  })
}
