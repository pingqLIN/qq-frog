import "@/utils/zod-config"
import type { Config } from "@/types/config/config"
import type { ThemeMode } from "@/types/config/theme"
import { browser } from "#imports"
import { Icon } from "@iconify/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Provider as JotaiProvider, useAtom, useSetAtom } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import * as React from "react"
import FrogToast from "@/components/frog-toast"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Button } from "@/components/ui/base-ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/base-ui/tabs"
import { Textarea } from "@/components/ui/base-ui/textarea"
import { TooltipProvider } from "@/components/ui/base-ui/tooltip"
import { configAtom } from "@/utils/atoms/config"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { getLocalConfig } from "@/utils/config/storage"
import { APP_NAME } from "@/utils/constants/app"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
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

function SidePanelShell() {
  return (
    <main className="bg-background text-foreground flex h-screen min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon icon="tabler:language" className="size-4 shrink-0" />
          <h1 className="truncate text-sm font-semibold">{APP_NAME}</h1>
        </div>
      </header>

      <Tabs defaultValue="translate" className="min-h-0 flex-1 px-3 py-3">
        <TabsList className="mb-2">
          <TabsTrigger value="translate" className={cn("min-w-20")}>
            {i18n.t("popup.translate")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="translate" className="min-h-0">
          <SidePanelTranslationTab />
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
