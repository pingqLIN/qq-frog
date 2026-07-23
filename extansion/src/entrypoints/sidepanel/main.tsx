import "@/utils/zod-config"
import type { Config } from "@/types/config/config"
import type { ThemeMode } from "@/types/config/theme"
import type { PdfTabSession } from "@/utils/pdf-tab-session"
import { browser } from "#imports"
import { Icon } from "@iconify/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Provider as JotaiProvider, useAtom, useSetAtom } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import * as React from "react"
import readFrogLogo from "@/assets/icons/qq-frog.png?url&no-inline"
import FrogToast from "@/components/frog-toast"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Button } from "@/components/ui/base-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/base-ui/tabs"
import { Textarea } from "@/components/ui/base-ui/textarea"
import { TooltipProvider } from "@/components/ui/base-ui/tooltip"
import { PdfTranslationTool } from "@/entrypoints/options/pages/pdf-translation"
import { ClearAiSegmentationCache } from "@/entrypoints/options/pages/video-subtitles/clear-ai-segmentation-cache"
import { SubtitlesConfig } from "@/entrypoints/options/pages/video-subtitles/subtitles-config"
import { SubtitlesRequestBatch } from "@/entrypoints/options/pages/video-subtitles/subtitles-request-batch"
import { SubtitlesRequestRate } from "@/entrypoints/options/pages/video-subtitles/subtitles-request-rate"
import { SubtitlesStyleSettings } from "@/entrypoints/options/pages/video-subtitles/subtitles-style-settings"
import { configAtom } from "@/utils/atoms/config"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { getLocalConfig } from "@/utils/config/storage"
import { APP_NAME } from "@/utils/constants/app"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import { renderPersistentReactRoot } from "@/utils/react-root"
import { cn } from "@/utils/styles/utils"
import { queryClient } from "@/utils/tanstack-query"
import { applyTheme, getLocalThemeMode, isDarkMode } from "@/utils/theme"
import { inputTextAtom, sourceLangCodeAtom, targetLangCodeAtom, translateRequestAtom } from "../translation-hub/atoms"
import { LanguageControlPanel } from "../translation-hub/components/language-control-panel"
import { PromptSelector } from "../translation-hub/components/prompt-selector"
import { TranslationPanel } from "../translation-hub/components/translation-panel"
import { TranslationPanelActions } from "../translation-hub/components/translation-panel-actions"
import { TranslationServiceDropdown } from "../translation-hub/components/translation-service-dropdown"
import "@/assets/styles/text-small.css"
import "@/assets/styles/theme.css"

const SIDE_PANEL_SELECTION_CHANGED_MESSAGE = "qq-frog:side-panel-selection-changed"
const SIDE_PANEL_GET_CURRENT_SELECTION_MESSAGE = "qq-frog:side-panel-get-current-selection"
const SIDE_PANEL_TAB_TRANSLATE = "translate"
const SIDE_PANEL_TAB_SUBTITLES = "subtitles"
const SIDE_PANEL_TAB_PDF = "pdf"

interface SidePanelSelectionMessage {
  type: typeof SIDE_PANEL_SELECTION_CHANGED_MESSAGE
  text: string
  title?: string
  url?: string
}

interface PageSelectionSnapshot {
  text: string
  title?: string
  url?: string
}

type SidePanelTab = typeof SIDE_PANEL_TAB_TRANSLATE | typeof SIDE_PANEL_TAB_SUBTITLES | typeof SIDE_PANEL_TAB_PDF

function HydrateAtoms({
  initialValues,
  children,
}: {
  initialValues: [
    [typeof configAtom, Config],
    [typeof baseThemeModeAtom, ThemeMode],
  ]
  children: React.ReactNode
}) {
  useHydrateAtoms(initialValues)
  return children
}

function isSidePanelSelectionMessage(message: unknown): message is SidePanelSelectionMessage {
  return Boolean(
    message
    && typeof message === "object"
    && "type" in message
    && message.type === SIDE_PANEL_SELECTION_CHANGED_MESSAGE
    && "text" in message
    && typeof message.text === "string",
  )
}

function useSelectedPageTextBridge() {
  const setInputText = useSetAtom(inputTextAtom)
  const activeTabIdRef = React.useRef<number | null>(null)

  const applySelection = React.useCallback((selection: PageSelectionSnapshot | null | undefined) => {
    const text = selection?.text?.trim()
    if (!text)
      return

    setInputText(text)
  }, [setInputText])

  const refreshCurrentSelection = React.useCallback(async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    activeTabIdRef.current = typeof tab?.id === "number" ? tab.id : null
    if (typeof tab?.id !== "number")
      return

    const selection = await browser.tabs.sendMessage(tab.id, {
      type: SIDE_PANEL_GET_CURRENT_SELECTION_MESSAGE,
    }).catch(() => null)

    applySelection(selection as PageSelectionSnapshot | null)
  }, [applySelection])

  React.useEffect(() => {
    void refreshCurrentSelection()

    const handleMessage = (message: unknown, sender: { tab?: { id?: number } }) => {
      if (!isSidePanelSelectionMessage(message))
        return undefined

      const activeTabId = activeTabIdRef.current
      if (activeTabId !== null && sender.tab?.id !== activeTabId)
        return undefined

      applySelection(message)
      return undefined
    }

    const handleTabActivated = () => {
      void refreshCurrentSelection()
    }

    browser.runtime.onMessage.addListener(handleMessage)
    browser.tabs.onActivated.addListener(handleTabActivated)

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage)
      browser.tabs.onActivated.removeListener(handleTabActivated)
    }
  }, [applySelection, refreshCurrentSelection])
}

function SidePanelTextInput() {
  const [value, setValue] = useAtom(inputTextAtom)
  const setTranslateRequest = useSetAtom(translateRequestAtom)
  const [sourceLangCode] = useAtom(sourceLangCodeAtom)
  const [targetLangCode] = useAtom(targetLangCodeAtom)

  const handleTranslate = React.useCallback(() => {
    const inputText = value.trim()
    if (!inputText)
      return

    setTranslateRequest({
      inputText,
      sourceLanguage: sourceLangCode,
      targetLanguage: targetLangCode,
      timestamp: Date.now(),
    })
  }, [setTranslateRequest, sourceLangCode, targetLangCode, value])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      handleTranslate()
    }
  }

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={event => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={i18n.t("translationHub.inputPlaceholder")}
        className="h-40 min-h-32 resize-none pr-20 text-sm leading-relaxed"
        style={{ userSelect: "text" }}
      />
      <Button
        onClick={handleTranslate}
        disabled={!value.trim()}
        size="sm"
        className="absolute bottom-2 right-2"
      >
        {i18n.t("translationHub.translate")}
      </Button>
    </div>
  )
}

function SidePanelTranslationTab() {
  useSelectedPageTextBridge()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <LanguageControlPanel />

      <div className="flex flex-wrap items-center gap-2">
        <PromptSelector />
        <TranslationServiceDropdown />
        <TranslationPanelActions />
      </div>

      <SidePanelTextInput />

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <TranslationPanel />
      </div>
    </div>
  )
}

function isVideoSubtitlesUrl(url: string | undefined) {
  if (!url)
    return false

  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname
    return (
      (hostname === "www.youtube.com" || hostname === "youtube.com" || hostname === "m.youtube.com")
      && parsedUrl.pathname === "/watch"
    ) || (
      (hostname === "www.youtube.com" || hostname === "youtube.com" || hostname === "www.youtube-nocookie.com")
      && parsedUrl.pathname.startsWith("/embed/")
    )
  }
  catch {
    return false
  }
}

function useAutoSidePanelTab() {
  const [activeTab, setActiveTab] = React.useState<SidePanelTab>(SIDE_PANEL_TAB_TRANSLATE)
  const [activePdfSession, setActivePdfSession] = React.useState<PdfTabSession | null>(null)

  const refreshActiveTab = React.useCallback(async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    const pdfSession = await sendMessage("getActivePdfTabSession", {
      tabId: tab?.id,
      windowId: tab?.windowId,
    }).catch(() => null)
    const isCurrentPdfSession = Boolean(
      pdfSession
      && typeof tab?.id === "number"
      && pdfSession.tabId === tab.id,
    )

    setActivePdfSession(isCurrentPdfSession ? pdfSession : null)
    if (isCurrentPdfSession) {
      setActiveTab(SIDE_PANEL_TAB_PDF)
      return
    }

    if (isVideoSubtitlesUrl(tab?.url))
      setActiveTab(SIDE_PANEL_TAB_SUBTITLES)
  }, [])

  React.useEffect(() => {
    void refreshActiveTab()

    const handleActivated = () => {
      void refreshActiveTab()
    }
    const handleUpdated = (_tabId: number, changeInfo: { url?: string }) => {
      if (changeInfo.url)
        void refreshActiveTab()
    }

    browser.tabs.onActivated.addListener(handleActivated)
    browser.tabs.onUpdated.addListener(handleUpdated)

    return () => {
      browser.tabs.onActivated.removeListener(handleActivated)
      browser.tabs.onUpdated.removeListener(handleUpdated)
    }
  }, [refreshActiveTab])

  return [activeTab, setActiveTab, activePdfSession] as const
}

function SidePanelVideoSubtitlesTab() {
  const openFullSettings = () => {
    void browser.tabs.create({
      url: browser.runtime.getURL("/options.html#/video-subtitles"),
    })
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {i18n.t("options.videoSubtitles.title")}
          </h2>
          <p className="text-muted-foreground text-xs">
            {i18n.t("options.videoSubtitles.description")}
          </p>
        </div>
        <Button variant="outline" size="icon-sm" onClick={openFullSettings} title={i18n.t("popup.options")}>
          <Icon icon="tabler:external-link" className="size-4" />
        </Button>
      </div>

      <div className={cn(
        "space-y-0 *:border-b [&>*:last-child]:border-b-0",
        "[&_section]:py-4 [&_section]:gap-y-3",
        "[&_section>div:first-child]:basis-auto [&_section>div:first-child]:shrink",
        "[&_section_h2]:text-sm [&_section_h2]:leading-snug",
        "[&_section_[data-slot=card]]:rounded-lg [&_section_[data-slot=card]]:py-3",
        "[&_section_[data-slot=field-group]]:gap-4",
        "[&_section_[data-slot=field]]:gap-2",
      )}
      >
        <SubtitlesConfig />
        <SubtitlesStyleSettings />
        <SubtitlesRequestRate />
        <SubtitlesRequestBatch />
        <ClearAiSegmentationCache />
      </div>
    </div>
  )
}

function SidePanelPdfTranslationTab({ activePdfSession }: { activePdfSession: PdfTabSession | null }) {
  const openFullSettings = () => {
    void browser.tabs.create({
      url: browser.runtime.getURL("/options.html#/pdf-translation"),
    })
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {i18n.t("options.pdfTranslation.title")}
          </h2>
          <p className="text-muted-foreground text-xs">
            {i18n.t("options.pdfTranslation.tool.description")}
          </p>
        </div>
        <Button variant="outline" size="icon-sm" onClick={openFullSettings} title={i18n.t("popup.options")}>
          <Icon icon="tabler:external-link" className="size-4" />
        </Button>
      </div>

      <div className={cn(
        "space-y-0 *:border-b [&>*:last-child]:border-b-0",
        "[&_section]:py-4 [&_section]:gap-y-3",
        "[&_section>div:first-child]:basis-auto [&_section>div:first-child]:shrink",
        "[&_section_h2]:text-sm [&_section_h2]:leading-snug",
        "[&_section_[data-slot=card]]:rounded-lg [&_section_[data-slot=card]]:py-3",
        "[&_section_[data-slot=field]]:gap-2",
      )}
      >
        <PdfTranslationTool
          initialSource={activePdfSession
            ? {
                kind: "tab-url",
                tabId: activePdfSession.tabId,
                sourceUrl: activePdfSession.sourceUrl,
                sourceKind: activePdfSession.sourceKind,
                title: activePdfSession.title,
              }
            : null}
          resultBehavior={activePdfSession
            ? {
                kind: "replace-source-tab",
                tabId: activePdfSession.tabId,
                sessionId: activePdfSession.sessionId,
                sourceUrl: activePdfSession.sourceUrl,
                sourceTitle: activePdfSession.title,
              }
            : undefined}
        />
      </div>
    </div>
  )
}

function SidePanelShell() {
  const [activeTab, setActiveTab, activePdfSession] = useAutoSidePanelTab()

  return (
    <main className="bg-background text-foreground flex h-screen min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src={readFrogLogo} alt={APP_NAME} className="size-7 shrink-0 rounded-full" />
          <h1 className="truncate text-sm font-semibold">{APP_NAME}</h1>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={value => setActiveTab(value as SidePanelTab)} className="min-h-0 flex-1 px-3 py-3">
        <TabsList className="mb-2 w-full">
          <TabsTrigger value={SIDE_PANEL_TAB_TRANSLATE} className={cn("min-w-0")}>
            {i18n.t("popup.translate")}
          </TabsTrigger>
          <TabsTrigger value={SIDE_PANEL_TAB_SUBTITLES} className={cn("min-w-0")}>
            {i18n.t("options.videoSubtitles.title")}
          </TabsTrigger>
          <TabsTrigger value={SIDE_PANEL_TAB_PDF} className={cn("min-w-0")}>
            {i18n.t("options.pdfTranslation.title")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value={SIDE_PANEL_TAB_TRANSLATE} className="min-h-0">
          <SidePanelTranslationTab />
        </TabsContent>
        <TabsContent value={SIDE_PANEL_TAB_SUBTITLES} className="min-h-0">
          <SidePanelVideoSubtitlesTab />
        </TabsContent>
        <TabsContent value={SIDE_PANEL_TAB_PDF} className="min-h-0">
          <SidePanelPdfTranslationTab activePdfSession={activePdfSession} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

async function initApp() {
  const root = document.getElementById("root")!
  root.className = "min-h-screen bg-background text-base antialiased"

  const [configValue, themeMode] = await Promise.all([
    getLocalConfig(),
    getLocalThemeMode(),
  ])
  const config = configValue ?? DEFAULT_CONFIG

  applyTheme(document.documentElement, isDarkMode(themeMode) ? "dark" : "light")

  renderPersistentReactRoot(root, (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <HydrateAtoms initialValues={[[configAtom, config], [baseThemeModeAtom, themeMode]]}>
            <I18nProvider>
              <ThemeProvider>
                <TooltipProvider>
                  <SidePanelShell />
                  <FrogToast />
                </TooltipProvider>
              </ThemeProvider>
            </I18nProvider>
          </HydrateAtoms>
        </JotaiProvider>
      </QueryClientProvider>
    </React.StrictMode>
  ))
}

void initApp()
