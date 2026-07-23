import "@/utils/zod-config"
import type { Config } from "@/types/config/config"
import type { ThemeMode } from "@/types/config/theme"
import type { PdfTranslationResultRecord } from "@/utils/pdf-tab-session"
import { browser } from "#imports"
import { IconArrowBackUp, IconDownload } from "@tabler/icons-react"
import { saveAs } from "file-saver"
import { Provider as JotaiProvider } from "jotai"
import { useHydrateAtoms } from "jotai/utils"
import * as React from "react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { I18nProvider } from "@/components/providers/i18n-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/base-ui/alert"
import { Button } from "@/components/ui/base-ui/button"
import { TooltipProvider } from "@/components/ui/base-ui/tooltip"
import { configAtom } from "@/utils/atoms/config"
import { baseThemeModeAtom } from "@/utils/atoms/theme"
import { getLocalConfig } from "@/utils/config/storage"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { i18n } from "@/utils/i18n"
import { getPdfTranslationResult } from "@/utils/pdf-tab-session"
import { renderPersistentReactRoot } from "@/utils/react-root"
import { applyTheme, getLocalThemeMode, isDarkMode } from "@/utils/theme"
import "@/assets/styles/theme.css"

interface HydrateAtomsProps {
  initialValues: [
    [typeof configAtom, Config],
    [typeof baseThemeModeAtom, ThemeMode],
  ]
  children: React.ReactNode
}

function HydrateAtoms({ initialValues, children }: HydrateAtomsProps) {
  useHydrateAtoms(initialValues)
  return children
}

function getResultId() {
  return new URLSearchParams(window.location.search).get("id")
}

function PdfResultPage() {
  const [result, setResult] = React.useState<PdfTranslationResultRecord | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function loadResult() {
      const resultId = getResultId()
      if (!resultId) {
        setIsLoading(false)
        return
      }

      const storedResult = await getPdfTranslationResult(resultId)
      if (cancelled)
        return

      setResult(storedResult)
      setIsLoading(false)
    }

    void loadResult()

    return () => {
      cancelled = true
    }
  }, [])

  const downloadMarkdown = React.useCallback(() => {
    if (!result)
      return

    saveAs(
      new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }),
      result.downloadFileName,
    )
  }, [result])

  const openSource = React.useCallback(() => {
    if (!result?.sourceUrl)
      return

    void browser.tabs.update({ url: result.sourceUrl })
  }, [result])

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">
              {i18n.t("options.pdfTranslation.result.title")}
            </h1>
            {result && (
              <p className="text-muted-foreground mt-1 truncate text-sm">
                {result.sourceTitle || result.sourceFileName}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openSource} disabled={!result?.sourceUrl}>
              <IconArrowBackUp className="size-4" />
              {i18n.t("options.pdfTranslation.result.openSource")}
            </Button>
            <Button onClick={downloadMarkdown} disabled={!result}>
              <IconDownload className="size-4" />
              {i18n.t("options.pdfTranslation.result.downloadMarkdown")}
            </Button>
          </div>
        </header>

        {isLoading && (
          <Alert>
            <AlertTitle>{i18n.t("options.pdfTranslation.result.loadingTitle")}</AlertTitle>
            <AlertDescription>{i18n.t("options.pdfTranslation.result.loadingDescription")}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !result && (
          <Alert variant="destructive">
            <AlertTitle>{i18n.t("options.pdfTranslation.result.missingTitle")}</AlertTitle>
            <AlertDescription>{i18n.t("options.pdfTranslation.result.missingDescription")}</AlertDescription>
          </Alert>
        )}

        {result && (
          <article className="min-h-[60vh] rounded-md border bg-card p-4">
            <MarkdownRenderer content={result.markdown} />
          </article>
        )}
      </div>
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
      <JotaiProvider>
        <HydrateAtoms initialValues={[[configAtom, config], [baseThemeModeAtom, themeMode]]}>
          <I18nProvider>
            <ThemeProvider>
              <TooltipProvider>
                <PdfResultPage />
              </TooltipProvider>
            </ThemeProvider>
          </I18nProvider>
        </HydrateAtoms>
      </JotaiProvider>
    </React.StrictMode>
  ))
}

void initApp()
