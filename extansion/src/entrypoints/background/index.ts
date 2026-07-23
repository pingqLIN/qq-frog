import "@/utils/zod-config"
import type { PdfBridgeNativeHostResponse } from "@/utils/message"
import { browser, defineBackground } from "#imports"
import { initChromeAIBridge } from "@/utils/chrome-ai-bridge"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { openOptionsPage } from "@/utils/navigation"
import { runAiSegmentSubtitles } from "./ai-segmentation"
import { dispatchBackgroundStreamPort } from "./background-stream"
import { ensureInitializedConfig } from "./config"
import { setUpConfigBackup } from "./config-backup"
import { initializeContextMenu, registerContextMenuListeners } from "./context-menu"
import { cleanupAllAiSegmentationCache, cleanupAllSummaryCache, cleanupAllTranslationCache, setUpDatabaseCleanup } from "./db-cleanup"
import { setupIframeInjection } from "./iframe-injection"
import { setupLLMGenerateTextMessageHandlers } from "./llm-generate-text"
import { initMockData } from "./mock-data"
import { setupPdfTabSessionTracker } from "./pdf-tab-session"
import { proxyFetch } from "./proxy-fetch"
import { setupSidePanelMessageHandler } from "./side-panel"
import { setUpSubtitlesTranslationQueue, setUpWebPageTranslationQueue } from "./translation-queues"
import { translationMessage } from "./translation-signal"

export default defineBackground({
  type: "module",
  main: () => {
    logger.info("Hello background!", { id: browser.runtime.id })
    initChromeAIBridge()

    browser.runtime.onInstalled.addListener(async () => {
      await ensureInitializedConfig()
    })

    onMessage("openPage", async (message) => {
      const { url, active } = message.data
      logger.info("openPage", { url, active })
      await browser.tabs.create({ url, active: active ?? true })
    })

    onMessage("openOptionsPage", async () => {
      logger.info("openOptionsPage")
      await openOptionsPage()
    })

    onMessage("pdfBridgeNativeHost", async (message) => {
      const hostName = "com.qq_frog.pdf_bridge"
      try {
        const response = await browser.runtime.sendNativeMessage(hostName, message.data)
        return response as PdfBridgeNativeHostResponse
      }
      catch (error) {
        logger.error("[Background] PDF bridge native host failed", error)
        const messageText = error instanceof Error ? error.message : String(error)
        const response: PdfBridgeNativeHostResponse = {
          ok: false,
          status: "error",
          message: messageText,
          hint: getPdfBridgeNativeHostHint(messageText, browser.runtime.id),
          extensionId: browser.runtime.id,
        }
        return response
      }
    })

    setupSidePanelMessageHandler({
      extensionBrowser: browser,
      logger,
      registerMessageHandler: onMessage,
    })
    setupPdfTabSessionTracker({
      extensionBrowser: browser,
      logger,
      registerMessageHandler: onMessage,
    })

    onMessage("aiSegmentSubtitles", async (message) => {
      try {
        return await runAiSegmentSubtitles(message.data)
      }
      catch (error) {
        logger.error("[Background] aiSegmentSubtitles failed", error)
        throw error
      }
    })

    browser.runtime.onConnect.addListener((port) => {
      dispatchBackgroundStreamPort(port)
    })

    onMessage("clearAllTranslationRelatedCache", async () => {
      await cleanupAllTranslationCache()
      await cleanupAllSummaryCache()
    })

    onMessage("clearAiSegmentationCache", async () => {
      await cleanupAllAiSegmentationCache()
    })

    translationMessage()

    // Register context menu listeners synchronously
    // This ensures listeners are registered before Chrome completes initialization
    registerContextMenuListeners()

    // Initialize context menu items asynchronously
    void initializeContextMenu()

    void setUpWebPageTranslationQueue()
    void setUpSubtitlesTranslationQueue()
    void setUpDatabaseCleanup()
    setUpConfigBackup()

    proxyFetch()
    setupLLMGenerateTextMessageHandlers()
    void initMockData()

    // Setup on-demand iframe injection after page translation is enabled.
    setupIframeInjection()
  },
})

function getPdfBridgeNativeHostHint(message: string, extensionId: string) {
  const normalizedMessage = message.toLowerCase()
  if (
    normalizedMessage.includes("native messaging")
    || normalizedMessage.includes("host")
    || normalizedMessage.includes("forbidden")
    || normalizedMessage.includes("not found")
  ) {
    return `Native Messaging host may be missing or registered for a different extension ID. Current extension ID: ${extensionId}. From the repo bridge folder, run: .\\repair_native_host_windows.ps1 -ExtensionId ${extensionId} -Browser Chrome`
  }

  return null
}
