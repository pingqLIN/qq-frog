import type { ChangeEvent } from "react"
import type { PdfTranslationOutputMode, PdfTranslationProvider } from "@/types/config/pdf-translation"
import { IconDownload, IconHeartbeat, IconPlayerPlayFilled, IconUpload, IconX } from "@tabler/icons-react"
import { deepmerge } from "deepmerge-ts"
import { saveAs } from "file-saver"
import { useAtom } from "jotai"
import { useRef, useState } from "react"
import { HelpTooltip } from "@/components/help-tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/base-ui/alert"
import { Button } from "@/components/ui/base-ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/base-ui/field"
import { Input } from "@/components/ui/base-ui/input"
import { Label } from "@/components/ui/base-ui/label"
import { Progress, ProgressLabel } from "@/components/ui/base-ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { Switch } from "@/components/ui/base-ui/switch"
import { Textarea } from "@/components/ui/base-ui/textarea"
import { PDF_TRANSLATION_OUTPUT_MODES, PDF_TRANSLATION_PROVIDERS } from "@/types/config/pdf-translation"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { ConfigCard } from "../../components/config-card"
import { PageLayout } from "../../components/page-layout"

export function PdfTranslationPage() {
  return (
    <PageLayout title={i18n.t("options.pdfTranslation.title")}>
      <div className="*:border-b [&>*:last-child]:border-b-0">
        <PdfTranslationConfig />
        <PdfTranslationTool />
      </div>
    </PageLayout>
  )
}

function PdfTranslationConfig() {
  const [pdfTranslationConfig, setPdfTranslationConfig] = useAtom(configFieldsAtomMap.pdfTranslation)

  const updateConfig = (patch: Partial<typeof pdfTranslationConfig>) => {
    void setPdfTranslationConfig(deepmerge(pdfTranslationConfig, patch))
  }

  const handleProviderChange = (provider: PdfTranslationProvider | null) => {
    if (!provider)
      return
    updateConfig({ provider })
  }

  const handleOutputModeChange = (outputMode: PdfTranslationOutputMode | null) => {
    if (!outputMode)
      return
    updateConfig({ outputMode })
  }

  return (
    <ConfigCard
      id="pdf-translation-config"
      title={i18n.t("options.pdfTranslation.config.title")}
      description={i18n.t("options.pdfTranslation.config.description")}
    >
      <div className="space-y-6">
        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel htmlFor="pdf-translation-toggle">
              {i18n.t("options.pdfTranslation.config.enable")}
              <HelpTooltip>{i18n.t("options.pdfTranslation.config.enableDescription")}</HelpTooltip>
            </FieldLabel>
          </FieldContent>
          <Switch
            id="pdf-translation-toggle"
            checked={pdfTranslationConfig.enabled}
            onCheckedChange={checked => updateConfig({ enabled: checked })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="pdf-translation-service-url">
            {i18n.t("options.pdfTranslation.config.serviceUrl")}
            <HelpTooltip>{i18n.t("options.pdfTranslation.config.serviceUrlDescription")}</HelpTooltip>
          </FieldLabel>
          <Input
            id="pdf-translation-service-url"
            value={pdfTranslationConfig.serviceUrl}
            onChange={event => updateConfig({ serviceUrl: event.target.value })}
          />
        </Field>

        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel>{i18n.t("options.pdfTranslation.config.provider")}</FieldLabel>
          </FieldContent>
          <Select value={pdfTranslationConfig.provider} onValueChange={handleProviderChange}>
            <SelectTrigger className="w-56">
              <SelectValue render={<span />}>
                {i18n.t(`options.pdfTranslation.config.providers.${pdfTranslationConfig.provider}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_PROVIDERS.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {i18n.t(`options.pdfTranslation.config.providers.${provider}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel>{i18n.t("options.pdfTranslation.config.outputMode")}</FieldLabel>
          </FieldContent>
          <Select value={pdfTranslationConfig.outputMode} onValueChange={handleOutputModeChange}>
            <SelectTrigger className="w-56">
              <SelectValue render={<span />}>
                {i18n.t(`options.pdfTranslation.config.outputModes.${pdfTranslationConfig.outputMode}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_OUTPUT_MODES.map(outputMode => (
                  <SelectItem key={outputMode} value={outputMode}>
                    {i18n.t(`options.pdfTranslation.config.outputModes.${outputMode}`)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </ConfigCard>
  )
}

type PdfTranslationStage = "idle" | "health" | "ocr" | "translate" | "success" | "error"

interface PdfHealthResponse {
  status?: string
  python?: string
  dependencies?: Record<string, string>
  warnings?: string[]
}

interface PdfOcrResponse {
  pages?: unknown[]
}

interface PdfTranslateResponse {
  markdown?: string
}

const PDF_TRANSLATION_PROGRESS: Record<PdfTranslationStage, number> = {
  idle: 0,
  health: 15,
  ocr: 45,
  translate: 80,
  success: 100,
  error: 100,
}

function PdfTranslationTool() {
  const [pdfTranslationConfig] = useAtom(configFieldsAtomMap.pdfTranslation)
  const [file, setFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState("Traditional Chinese")
  const [pageIndex, setPageIndex] = useState(0)
  const [stage, setStage] = useState<PdfTranslationStage>("idle")
  const [statusMessage, setStatusMessage] = useState(i18n.t("options.pdfTranslation.tool.status.idle"))
  const [errorMessage, setErrorMessage] = useState("")
  const [healthSummary, setHealthSummary] = useState("")
  const [markdown, setMarkdown] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)

  const isRunning = stage === "health" || stage === "ocr" || stage === "translate"
  const canTranslate = Boolean(file) && !isRunning

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setErrorMessage("")
    setMarkdown("")
    setStatusMessage(selectedFile ? i18n.t("options.pdfTranslation.tool.status.ready") : i18n.t("options.pdfTranslation.tool.status.idle"))
  }

  const handlePageIndexChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextPageIndex = Number.parseInt(event.target.value, 10)
    setPageIndex(Number.isFinite(nextPageIndex) && nextPageIndex >= 0 ? nextPageIndex : 0)
  }

  const checkHealth = async () => {
    setStage("health")
    setErrorMessage("")
    setStatusMessage(i18n.t("options.pdfTranslation.tool.status.health"))

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const health = await fetchJson<PdfHealthResponse>(`${trimTrailingSlash(pdfTranslationConfig.serviceUrl)}/pdf/health`, {
        signal: controller.signal,
      })
      const dependencies = health.dependencies
        ? Object.entries(health.dependencies).map(([name, value]) => `${name}: ${value}`).join(", ")
        : ""
      const warnings = health.warnings?.length ? ` ${health.warnings.join(" ")}` : ""
      setHealthSummary(`${health.status ?? "unknown"}${health.python ? ` / Python ${health.python}` : ""}${dependencies ? ` / ${dependencies}` : ""}${warnings}`)
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.healthDone"))
      setStage("idle")
    }
    catch (error) {
      if (isAbortError(error)) {
        setStatusMessage(i18n.t("options.pdfTranslation.tool.status.cancelled"))
        setStage("idle")
        return
      }
      setErrorMessage(getErrorMessage(error))
      setStage("error")
    }
    finally {
      abortControllerRef.current = null
    }
  }

  const translatePdf = async () => {
    if (!file)
      return

    const controller = new AbortController()
    abortControllerRef.current = controller
    setErrorMessage("")
    setMarkdown("")

    try {
      const baseUrl = trimTrailingSlash(pdfTranslationConfig.serviceUrl)
      setStage("ocr")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.ocr"))

      const ocrResult = await fetchJson<PdfOcrResponse>(`${baseUrl}/pdf/ocr?page_index=${pageIndex}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
        signal: controller.signal,
      })

      if (!ocrResult.pages?.length) {
        throw new Error(i18n.t("options.pdfTranslation.tool.emptyOcr"))
      }

      setStage("translate")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.translate"))

      const translateResult = await fetchJson<PdfTranslateResponse>(`${baseUrl}/pdf/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: pdfTranslationConfig.provider,
          target_language: targetLanguage,
          output_mode: pdfTranslationConfig.outputMode,
          ocr: ocrResult,
        }),
        signal: controller.signal,
      })

      if (!translateResult.markdown) {
        throw new Error(i18n.t("options.pdfTranslation.tool.emptyTranslation"))
      }

      setMarkdown(translateResult.markdown)
      setStage("success")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.success"))
    }
    catch (error) {
      if (isAbortError(error)) {
        setStatusMessage(i18n.t("options.pdfTranslation.tool.status.cancelled"))
        setStage("idle")
        return
      }
      setErrorMessage(getErrorMessage(error))
      setStage("error")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.error"))
    }
    finally {
      abortControllerRef.current = null
    }
  }

  const cancelTranslation = () => {
    abortControllerRef.current?.abort()
  }

  const downloadMarkdown = () => {
    if (!markdown)
      return
    const baseName = file ? sanitizeFilename(file.name.replace(/\.pdf$/i, "")) : "qq-frog-pdf-translation"
    saveAs(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), `${baseName}.translated.md`)
  }

  return (
    <ConfigCard
      id="pdf-translation-tool"
      title={i18n.t("options.pdfTranslation.tool.title")}
      description={i18n.t("options.pdfTranslation.tool.description")}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" className="p-0" disabled={isRunning}>
            <Label htmlFor="pdf-translation-file" className="w-full px-3">
              <IconUpload className="size-4" />
              {i18n.t("options.pdfTranslation.tool.chooseFile")}
            </Label>
            <Input
              id="pdf-translation-file"
              type="file"
              className="hidden"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
            />
          </Button>
          {file && (
            <span className="min-w-0 truncate text-sm text-muted-foreground">
              {file.name}
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="pdf-translation-target-language">
              {i18n.t("options.pdfTranslation.tool.targetLanguage")}
            </FieldLabel>
            <Input
              id="pdf-translation-target-language"
              value={targetLanguage}
              onChange={event => setTargetLanguage(event.target.value)}
              disabled={isRunning}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="pdf-translation-page-index">
              {i18n.t("options.pdfTranslation.tool.pageIndex")}
            </FieldLabel>
            <Input
              id="pdf-translation-page-index"
              type="number"
              min={0}
              value={pageIndex}
              onChange={handlePageIndexChange}
              disabled={isRunning}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={checkHealth} disabled={isRunning}>
            <IconHeartbeat className="size-4" />
            {i18n.t("options.pdfTranslation.tool.checkHealth")}
          </Button>
          <Button onClick={translatePdf} disabled={!canTranslate}>
            <IconPlayerPlayFilled className="size-4" />
            {i18n.t("options.pdfTranslation.tool.translate")}
          </Button>
          <Button variant="destructive" onClick={cancelTranslation} disabled={!isRunning}>
            <IconX className="size-4" />
            {i18n.t("options.pdfTranslation.tool.cancel")}
          </Button>
          <Button variant="secondary" onClick={downloadMarkdown} disabled={!markdown || isRunning}>
            <IconDownload className="size-4" />
            {i18n.t("options.pdfTranslation.tool.downloadMarkdown")}
          </Button>
        </div>

        <Progress value={PDF_TRANSLATION_PROGRESS[stage]}>
          <ProgressLabel>{statusMessage}</ProgressLabel>
          <span className="ml-auto text-sm tabular-nums text-muted-foreground">
            {`${PDF_TRANSLATION_PROGRESS[stage]}%`}
          </span>
        </Progress>

        {healthSummary && (
          <Alert>
            <AlertTitle>{i18n.t("options.pdfTranslation.tool.healthResult")}</AlertTitle>
            <AlertDescription>{healthSummary}</AlertDescription>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>{i18n.t("options.pdfTranslation.tool.errorTitle")}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {markdown && (
          <Textarea
            readOnly
            value={markdown}
            className="min-h-64 resize-y font-mono text-xs"
            aria-label={i18n.t("options.pdfTranslation.tool.preview")}
          />
        )}
      </div>
    </ConfigCard>
  )
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const responseText = await response.text()
  const payload = responseText ? JSON.parse(responseText) as unknown : null

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload) ?? `${response.status} ${response.statusText}`)
  }

  return payload as T
}

function extractErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === "string")
      return detail
  }
  return null
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function sanitizeFilename(value: string) {
  const withoutControlCharacters = Array.from(value).filter(char => char.charCodeAt(0) >= 32).join("")
  return withoutControlCharacters.replace(/[<>:"/\\|?*]/g, "_") || "qq-frog-pdf-translation"
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
