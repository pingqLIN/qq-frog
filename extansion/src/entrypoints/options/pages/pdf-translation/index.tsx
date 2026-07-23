import type { ChangeEvent } from "react"
import type { PdfTranslationOutputMode, PdfTranslationProvider } from "@/types/config/pdf-translation"
import type { PdfTabSourceKind } from "@/utils/pdf-tab-session"
import { browser } from "#imports"
import { IconActivity, IconDownload, IconHeartbeat, IconPlayerPlayFilled, IconPower, IconRefresh, IconServer, IconUpload, IconX } from "@tabler/icons-react"
import { deepmerge } from "deepmerge-ts"
import { saveAs } from "file-saver"
import { useAtom } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"
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
import { PDF_TRANSLATION_OUTPUT_MODES, PDF_TRANSLATION_PROVIDER_RULES, PDF_TRANSLATION_PROVIDERS } from "@/types/config/pdf-translation"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"
import { createPdfTranslationResultId, savePdfTranslationResult } from "@/utils/pdf-tab-session"
import { ConfigCard } from "../../components/config-card"
import { PageLayout } from "../../components/page-layout"

const PDF_TRANSLATION_OUTPUT_MODE_I18N_KEYS: Record<PdfTranslationOutputMode, string> = {
  "bilingual-markdown": "bilingualMarkdown",
  "text-layer": "textLayer",
}

const BRIDGE_HEALTH_TIMEOUT_MS = 5000
const PDF_OCR_TIMEOUT_MS = 15 * 60 * 1000
const PDF_TRANSLATE_TIMEOUT_MS = 15 * 60 * 1000
const PDF_SOURCE_LOAD_TIMEOUT_MS = 30 * 1000
const PDF_SOURCE_LOAD_MAX_BYTES = 50 * 1024 * 1024

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
                {getPdfTranslationProviderLabel(pdfTranslationConfig.provider)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_PROVIDERS.map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {getPdfTranslationProviderLabel(provider)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Alert>
          <AlertTitle>{i18n.t("options.pdfTranslation.config.providerRouteTitle")}</AlertTitle>
          <AlertDescription>
            {i18n.t(
              `options.pdfTranslation.config.providerRoutes.${PDF_TRANSLATION_PROVIDER_RULES[pdfTranslationConfig.provider].i18nKey}`,
            )}
          </AlertDescription>
        </Alert>

        <Field orientation="horizontal">
          <FieldContent className="self-center">
            <FieldLabel>{i18n.t("options.pdfTranslation.config.outputMode")}</FieldLabel>
          </FieldContent>
          <Select value={pdfTranslationConfig.outputMode} onValueChange={handleOutputModeChange}>
            <SelectTrigger className="w-56">
              <SelectValue render={<span />}>
                {i18n.t(`options.pdfTranslation.config.outputModes.${PDF_TRANSLATION_OUTPUT_MODE_I18N_KEYS[pdfTranslationConfig.outputMode]}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {PDF_TRANSLATION_OUTPUT_MODES.map(outputMode => (
                  <SelectItem key={outputMode} value={outputMode}>
                    {i18n.t(`options.pdfTranslation.config.outputModes.${PDF_TRANSLATION_OUTPUT_MODE_I18N_KEYS[outputMode]}`)}
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
  python_version?: string
  dependencies?: Array<{ name: string, installed: boolean }>
  warnings?: string[]
}

interface BridgeRuntimeHealthResponse {
  status?: string
  extension_connected?: boolean
  pending_tasks?: number
  pdf_ocr?: PdfHealthResponse
}

interface PdfTranslateResponse {
  markdown?: string
}

type PdfOcrResponse = unknown

interface PdfBridgeNativeHostResponse {
  ok: boolean
  status: "running" | "stopped" | "starting" | "error"
  message: string
  pid?: number | null
  error?: string | null
  hint?: string | null
  extensionId?: string | null
  logPath?: string
}

interface PromptApiAdapter {
  name: string
  model: any
}

export interface PdfTranslationInitialSource {
  kind: "tab-url"
  tabId: number
  sourceUrl: string
  sourceKind: PdfTabSourceKind
  title?: string
}

export interface PdfTranslationResultBehavior {
  kind: "replace-source-tab"
  tabId: number
  sessionId: string
  sourceUrl: string
  sourceTitle?: string
}

interface PdfTranslationToolProps {
  initialSource?: PdfTranslationInitialSource | null
  resultBehavior?: PdfTranslationResultBehavior
}

interface WSTranslateTask {
  task_id: string
  system_prompt?: string
  user_prompt: string
}

type BridgeAgentStatus = "disconnected" | "connecting" | "connected" | "error"
type BridgeReadiness = "unknown" | "checking" | "ready" | "blocked" | "error"

const PDF_TRANSLATION_PROGRESS: Record<PdfTranslationStage, number> = {
  idle: 0,
  health: 15,
  ocr: 45,
  translate: 80,
  success: 100,
  error: 100,
}

export function PdfTranslationTool({
  initialSource = null,
  resultBehavior,
}: PdfTranslationToolProps = {}) {
  const [pdfTranslationConfig] = useAtom(configFieldsAtomMap.pdfTranslation)
  const [file, setFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState("Traditional Chinese")
  const [stage, setStage] = useState<PdfTranslationStage>("idle")
  const [statusMessage, setStatusMessage] = useState(i18n.t("options.pdfTranslation.tool.status.idle"))
  const [errorMessage, setErrorMessage] = useState("")
  const [healthSummary, setHealthSummary] = useState("")
  const [nativeHostSummary, setNativeHostSummary] = useState("")
  const [bridgeRuntimeSummary, setBridgeRuntimeSummary] = useState("")
  const [isNativeHostRunning, setIsNativeHostRunning] = useState(false)
  const [bridgeReadiness, setBridgeReadiness] = useState<BridgeReadiness>("unknown")
  const [bridgeAgentStatus, setBridgeAgentStatus] = useState<BridgeAgentStatus>("disconnected")
  const [promptApiSummary, setPromptApiSummary] = useState("")
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([])
  const [bridgeLogs, setBridgeLogs] = useState<string[]>([])
  const [markdown, setMarkdown] = useState("")
  const [lastDownloadedFileName, setLastDownloadedFileName] = useState("")
  const abortControllerRef = useRef<AbortController | null>(null)
  const bridgeSocketRef = useRef<WebSocket | null>(null)
  const attemptedInitialSourceKeyRef = useRef("")

  const isRunning = stage === "health" || stage === "ocr" || stage === "translate"
  const canTranslate = Boolean(file) && !isRunning
  const canUseNativeHost = isLocalBridgeServiceUrl(pdfTranslationConfig.serviceUrl)
  const providerRule = PDF_TRANSLATION_PROVIDER_RULES[pdfTranslationConfig.provider]
  const isChromeGeminiProvider = providerRule.requiresBridgeAgent
  const downloadFileName = getDownloadFileName(file)
  const extensionId = browser.runtime.id
  const nativeHostRepairCommand = `.\\repair_native_host_windows.ps1 -ExtensionId ${extensionId} -Browser Chrome`

  const appendBridgeLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString("zh-TW", { hour12: false })
    setBridgeLogs(previous => [...previous.slice(-79), `[${time}] ${message}`])
  }, [])

  const disconnectBridgeAgent = useCallback(() => {
    const socket = bridgeSocketRef.current
    bridgeSocketRef.current = null
    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close()
    }
    setBridgeAgentStatus("disconnected")
    setActiveTaskIds([])
  }, [])

  useEffect(() => {
    return () => disconnectBridgeAgent()
  }, [disconnectBridgeAgent])

  useEffect(() => {
    if (!initialSource) {
      attemptedInitialSourceKeyRef.current = ""
      return
    }

    if (isRunning)
      return

    const sourceKey = getPdfInitialSourceKey(initialSource)
    if (attemptedInitialSourceKeyRef.current === sourceKey)
      return

    attemptedInitialSourceKeyRef.current = sourceKey
    const controller = new AbortController()
    let cancelled = false

    async function loadInitialSource() {
      if (!initialSource)
        return

      setErrorMessage("")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.autoLoading"))

      const timeoutId = window.setTimeout(() => controller.abort(), PDF_SOURCE_LOAD_TIMEOUT_MS)
      try {
        const loadedFile = await fetchPdfSourceAsFile(initialSource, controller.signal)
        if (cancelled)
          return

        setFile(loadedFile)
        setMarkdown("")
        setLastDownloadedFileName("")
        setStatusMessage(i18n.t("options.pdfTranslation.tool.status.autoReady", [loadedFile.name]))
      }
      catch (error) {
        if (cancelled)
          return

        setFile(null)
        setErrorMessage(i18n.t("options.pdfTranslation.tool.autoLoadFailed", [getPdfSourceLoadErrorMessage(error)]))
        setStatusMessage(i18n.t("options.pdfTranslation.tool.status.idle"))
      }
      finally {
        window.clearTimeout(timeoutId)
      }
    }

    void loadInitialSource()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [initialSource, isRunning])

  const runNativeHostAction = async (action: "status" | "start" | "stop") => {
    setStage("health")
    setErrorMessage("")
    setStatusMessage(i18n.t(`options.pdfTranslation.nativeHost.status.${action}`))

    try {
      const response = await sendMessage("pdfBridgeNativeHost", {
        action,
        serviceUrl: pdfTranslationConfig.serviceUrl,
      }) as PdfBridgeNativeHostResponse

      setIsNativeHostRunning(response.status === "running")
      setNativeHostSummary(formatNativeHostSummary(response))
      if (!response.ok) {
        setErrorMessage(formatNativeHostFailure(response))
        setStatusMessage(i18n.t("options.pdfTranslation.nativeHost.status.error"))
        setStage("error")
        return
      }
      setStatusMessage(i18n.t("options.pdfTranslation.nativeHost.status.done"))
      setStage("idle")
    }
    catch (error) {
      setIsNativeHostRunning(false)
      setErrorMessage(getErrorMessage(error))
      setStatusMessage(i18n.t("options.pdfTranslation.nativeHost.status.error"))
      setStage("error")
    }
  }

  const checkPromptApi = async () => {
    appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.promptApiChecking"))
    const promptApi = getPromptApi()
    if (!promptApi) {
      const message = i18n.t("options.pdfTranslation.bridgeAgent.promptApiUnavailable")
      setPromptApiSummary(message)
      appendBridgeLog(message)
      throw new Error(message)
    }

    const availability = await getPromptAvailability(promptApi)
    const summary = `${promptApi.name}: ${availability}`
    setPromptApiSummary(summary)
    appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.promptApiFound")} ${summary}`)

    if (isPromptUnavailable(availability)) {
      throw new Error(i18n.t("options.pdfTranslation.bridgeAgent.promptApiUnavailable"))
    }

    return promptApi
  }

  const connectBridgeAgent = async (throwOnError = false) => {
    try {
      disconnectBridgeAgent()

      const promptApi = await checkPromptApi()
      const wsUrl = toBridgeWebSocketUrl(pdfTranslationConfig.serviceUrl)
      appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.connecting")} ${wsUrl}`)
      setBridgeAgentStatus("connecting")

      const socket = new WebSocket(wsUrl)
      bridgeSocketRef.current = socket
      appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.socketOpening"))

      await new Promise<void>((resolve, reject) => {
        let opened = false
        const timeout = window.setTimeout(() => {
          if (!opened)
            socket.close()
          reject(new Error(i18n.t("options.pdfTranslation.bridgeAgent.socketError")))
        }, BRIDGE_HEALTH_TIMEOUT_MS)

        socket.onopen = () => {
          opened = true
          window.clearTimeout(timeout)
          setBridgeAgentStatus("connected")
          appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.connected"))
          resolve()
        }

        socket.onclose = () => {
          window.clearTimeout(timeout)
          if (bridgeSocketRef.current === socket) {
            bridgeSocketRef.current = null
            setBridgeAgentStatus("disconnected")
            setActiveTaskIds([])
          }
          appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.disconnected"))
          if (!opened)
            reject(new Error(i18n.t("options.pdfTranslation.bridgeAgent.disconnected")))
        }

        socket.onerror = () => {
          window.clearTimeout(timeout)
          setBridgeAgentStatus("error")
          appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.socketError"))
          if (!opened)
            reject(new Error(i18n.t("options.pdfTranslation.bridgeAgent.socketError")))
        }
      })

      socket.onmessage = (event) => {
        void handleBridgeTask(event, promptApi, socket, appendBridgeLog, setActiveTaskIds)
      }
    }
    catch (error) {
      setBridgeAgentStatus("error")
      const message = getErrorMessage(error)
      setErrorMessage(message)
      appendBridgeLog(message)
      if (throwOnError)
        throw error
    }
  }

  async function checkRealBridgeStatus(signal?: AbortSignal) {
    const health = await fetchBridgeHealth(pdfTranslationConfig.serviceUrl, signal, BRIDGE_HEALTH_TIMEOUT_MS)
    const summary = formatBridgeHealthSummary(health)
    setHealthSummary(summary)
    appendBridgeLog(`${i18n.t("options.pdfTranslation.tool.healthResult")}: ${summary}`)

    let runtime: BridgeRuntimeHealthResponse | null = null
    try {
      runtime = await fetchBridgeRuntimeHealth(pdfTranslationConfig.serviceUrl, signal, BRIDGE_HEALTH_TIMEOUT_MS)
      const runtimeSummary = formatBridgeRuntimeSummary(runtime)
      setBridgeRuntimeSummary(runtimeSummary)
      appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.runtimeStatus")}: ${runtimeSummary}`)
    }
    catch (error) {
      const message = getErrorMessage(error)
      setBridgeRuntimeSummary(message)
      appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.runtimeStatus")}: ${message}`)
    }

    const hasChromeGeminiAgent = !isChromeGeminiProvider
      || runtime?.extension_connected === true
      || bridgeAgentStatus === "connected"

    return {
      health,
      runtime,
      summary,
      ready: health.status === "ready" && hasChromeGeminiAgent,
      needsChromeGeminiAgent: health.status === "ready" && isChromeGeminiProvider && !hasChromeGeminiAgent,
    }
  }

  function markBridgeReady() {
    setStatusMessage(i18n.t("options.pdfTranslation.tool.status.ensureDone"))
    setBridgeReadiness("ready")
    setStage("idle")
  }

  const ensureBridgeService = async () => {
    setBridgeReadiness("checking")
    setStage("health")
    setErrorMessage("")
    setStatusMessage(i18n.t("options.pdfTranslation.tool.status.ensureService"))
    appendBridgeLog(i18n.t("options.pdfTranslation.tool.status.ensureService"))

    try {
      try {
        const currentStatus = await checkRealBridgeStatus()
        if (currentStatus.ready) {
          markBridgeReady()
          return true
        }

        if (currentStatus.needsChromeGeminiAgent) {
          await connectBridgeAgent(true)
          const connectedStatus = await checkRealBridgeStatus()
          if (connectedStatus.ready) {
            markBridgeReady()
            return true
          }
        }
      }
      catch (error) {
        appendBridgeLog(getErrorMessage(error))
      }

      if (canUseNativeHost) {
        const status = await sendMessage("pdfBridgeNativeHost", {
          action: "status",
          serviceUrl: pdfTranslationConfig.serviceUrl,
        }) as PdfBridgeNativeHostResponse

        if (!status.ok)
          throw new Error(status.message || status.error || i18n.t("options.pdfTranslation.tool.status.error"))

        setIsNativeHostRunning(status.status === "running")
        setNativeHostSummary(formatNativeHostSummary(status))
        appendBridgeLog(formatNativeHostSummary(status))

        if (status.status !== "running") {
          const start = await sendMessage("pdfBridgeNativeHost", {
            action: "start",
            serviceUrl: pdfTranslationConfig.serviceUrl,
          }) as PdfBridgeNativeHostResponse
          if (!start.ok)
            throw new Error(start.message || start.error || i18n.t("options.pdfTranslation.tool.status.error"))

          setIsNativeHostRunning(start.status === "running")
          setNativeHostSummary(formatNativeHostSummary(start))
          appendBridgeLog(formatNativeHostSummary(start))
        }
      }
      else {
        appendBridgeLog(i18n.t("options.pdfTranslation.bridgeAgent.lanMode"))
      }

      const serviceStatus = await checkRealBridgeStatus()
      if (serviceStatus.needsChromeGeminiAgent) {
        await connectBridgeAgent(true)
      }
      const finalStatus = serviceStatus.needsChromeGeminiAgent
        ? await checkRealBridgeStatus()
        : serviceStatus

      if (!finalStatus.ready) {
        setErrorMessage(finalStatus.summary)
        setStatusMessage(i18n.t("options.pdfTranslation.tool.status.blocked"))
        setBridgeReadiness("blocked")
        setStage("error")
        return false
      }

      markBridgeReady()
      return true
    }
    catch (error) {
      setErrorMessage(getErrorMessage(error))
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.error"))
      setBridgeReadiness("error")
      setStage("error")
      return false
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    setFile(selectedFile)
    setErrorMessage("")
    setMarkdown("")
    setLastDownloadedFileName("")
    setStatusMessage(selectedFile ? i18n.t("options.pdfTranslation.tool.status.ready") : i18n.t("options.pdfTranslation.tool.status.idle"))
  }

  const checkHealth = async () => {
    setStage("health")
    setErrorMessage("")
    setStatusMessage(i18n.t("options.pdfTranslation.tool.status.health"))

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const serviceStatus = await checkRealBridgeStatus(controller.signal)
      setBridgeReadiness(serviceStatus.ready ? "ready" : "blocked")
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
    setLastDownloadedFileName("")

    try {
      if (bridgeReadiness !== "ready") {
        const isReady = await ensureBridgeService()
        if (!isReady)
          return
      }

      const baseUrl = trimTrailingSlash(pdfTranslationConfig.serviceUrl)
      setStage("ocr")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.ocr"))
      appendBridgeLog(i18n.t("options.pdfTranslation.tool.status.ocr"))

      const ocrResult = await fetchJson<PdfOcrResponse>(`${baseUrl}/pdf/ocr`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/pdf",
        },
        body: file,
        signal: controller.signal,
      }, PDF_OCR_TIMEOUT_MS)

      setStage("translate")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.translate"))
      appendBridgeLog(i18n.t("options.pdfTranslation.tool.status.translate"))

      const translateResult = await fetchJson<PdfTranslateResponse>(`${baseUrl}/pdf/translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: providerRule.model,
          target_language: targetLanguage,
          output_mode: pdfTranslationConfig.outputMode,
          ocr: ocrResult,
        }),
        signal: controller.signal,
      }, PDF_TRANSLATE_TIMEOUT_MS)

      if (!translateResult.markdown) {
        throw new Error(i18n.t("options.pdfTranslation.tool.emptyTranslation"))
      }

      setMarkdown(translateResult.markdown)
      setStage("success")
      setStatusMessage(i18n.t("options.pdfTranslation.tool.status.success"))
      try {
        await openTranslationResult({
          file,
          markdown: translateResult.markdown,
          resultBehavior,
          targetLanguage,
          downloadFileName,
        })
      }
      catch (error) {
        setErrorMessage(i18n.t("options.pdfTranslation.tool.resultOpenFailed", [getErrorMessage(error)]))
      }
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

  async function refreshBridgeRuntime(signal?: AbortSignal) {
    try {
      const runtime = await fetchBridgeRuntimeHealth(pdfTranslationConfig.serviceUrl, signal, BRIDGE_HEALTH_TIMEOUT_MS)
      const summary = formatBridgeRuntimeSummary(runtime)
      setBridgeRuntimeSummary(summary)
      appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.runtimeStatus")}: ${summary}`)
    }
    catch (error) {
      const message = getErrorMessage(error)
      setBridgeRuntimeSummary(message)
      appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.runtimeStatus")}: ${message}`)
    }
  }

  const downloadMarkdown = () => {
    if (!markdown)
      return
    saveAs(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), downloadFileName)
    setLastDownloadedFileName(downloadFileName)
    setStatusMessage(i18n.t("options.pdfTranslation.tool.status.downloaded", [downloadFileName]))
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

        <div className="grid gap-4">
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
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void ensureBridgeService()} disabled={isRunning}>
            <IconActivity className="size-4" />
            {i18n.t("options.pdfTranslation.tool.ensureService")}
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

        <Alert variant={bridgeReadiness === "ready" ? "default" : bridgeReadiness === "error" ? "destructive" : "default"}>
          <AlertTitle>{i18n.t("options.pdfTranslation.tool.readiness")}</AlertTitle>
          <AlertDescription>
            {i18n.t(`options.pdfTranslation.tool.readinessStates.${bridgeReadiness}`)}
          </AlertDescription>
        </Alert>

        {healthSummary && (
          <Alert>
            <AlertTitle>{i18n.t("options.pdfTranslation.tool.healthResult")}</AlertTitle>
            <AlertDescription>{healthSummary}</AlertDescription>
          </Alert>
        )}

        {nativeHostSummary && (
          <Alert>
            <AlertTitle>{i18n.t("options.pdfTranslation.nativeHost.title")}</AlertTitle>
            <AlertDescription>{nativeHostSummary}</AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertTitle>{i18n.t("options.pdfTranslation.nativeHost.installTitle")}</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>{i18n.t("options.pdfTranslation.nativeHost.extensionId", [extensionId])}</div>
            <div>{i18n.t("options.pdfTranslation.nativeHost.installDescription")}</div>
            <code className="block overflow-x-auto rounded bg-muted px-2 py-1 text-xs">
              {nativeHostRepairCommand}
            </code>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertTitle>{i18n.t("options.pdfTranslation.tool.outputLocationTitle")}</AlertTitle>
          <AlertDescription className="space-y-1">
            <div>
              {markdown
                ? i18n.t("options.pdfTranslation.tool.outputLocationReady", [downloadFileName])
                : i18n.t("options.pdfTranslation.tool.outputLocationPending")}
            </div>
            {lastDownloadedFileName && (
              <div>{i18n.t("options.pdfTranslation.tool.outputLocationDownloaded", [lastDownloadedFileName])}</div>
            )}
          </AlertDescription>
        </Alert>

        {isChromeGeminiProvider && (
          <Alert>
            <AlertTitle>{i18n.t("options.pdfTranslation.bridgeAgent.title")}</AlertTitle>
            <AlertDescription>{i18n.t("options.pdfTranslation.bridgeAgent.exclusiveDescription")}</AlertDescription>
          </Alert>
        )}

        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            {i18n.t("options.pdfTranslation.tool.advanced")}
          </summary>
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => void runNativeHostAction("status")} disabled={isRunning || !canUseNativeHost}>
                <IconRefresh className="size-4" />
                {i18n.t("options.pdfTranslation.nativeHost.checkStatus")}
              </Button>
              <Button variant="outline" onClick={() => void runNativeHostAction("start")} disabled={isRunning || isNativeHostRunning || !canUseNativeHost}>
                <IconPower className="size-4" />
                {i18n.t("options.pdfTranslation.nativeHost.start")}
              </Button>
              <Button variant="outline" onClick={() => void runNativeHostAction("stop")} disabled={isRunning || !isNativeHostRunning || !canUseNativeHost}>
                <IconServer className="size-4" />
                {i18n.t("options.pdfTranslation.nativeHost.stop")}
              </Button>
              <Button variant="outline" onClick={checkHealth} disabled={isRunning}>
                <IconHeartbeat className="size-4" />
                {i18n.t("options.pdfTranslation.tool.checkHealth")}
              </Button>
              <Button variant="outline" onClick={() => void refreshBridgeRuntime()} disabled={isRunning}>
                <IconActivity className="size-4" />
                {i18n.t("options.pdfTranslation.bridgeAgent.refreshRuntime")}
              </Button>
              <Button variant="outline" onClick={() => void connectBridgeAgent()} disabled={isRunning || !isChromeGeminiProvider || bridgeAgentStatus === "connected"}>
                <IconServer className="size-4" />
                {i18n.t("options.pdfTranslation.bridgeAgent.connect")}
              </Button>
              <Button variant="outline" onClick={disconnectBridgeAgent} disabled={isRunning || bridgeAgentStatus === "disconnected"}>
                <IconX className="size-4" />
                {i18n.t("options.pdfTranslation.bridgeAgent.disconnect")}
              </Button>
            </div>

            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{i18n.t("options.pdfTranslation.bridgeAgent.title")}</div>
                  <div className="text-xs text-muted-foreground">
                    {i18n.t(`options.pdfTranslation.bridgeAgent.status.${bridgeAgentStatus}`)}
                    {promptApiSummary ? ` / ${promptApiSummary}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i18n.t("options.pdfTranslation.bridgeAgent.currentProcess")}
                    :
                    {" "}
                    {formatBridgeAgentProcess(bridgeAgentStatus, activeTaskIds)}
                  </div>
                  {bridgeRuntimeSummary && (
                    <div className="text-xs text-muted-foreground">
                      {i18n.t("options.pdfTranslation.bridgeAgent.runtimeStatus")}
                      :
                      {" "}
                      {bridgeRuntimeSummary}
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {i18n.t("options.pdfTranslation.bridgeAgent.queue")}
                  :
                  {activeTaskIds.length}
                </div>
              </div>
              <div className="min-h-24 max-h-48 overflow-y-auto rounded-md bg-muted p-3 font-mono text-xs">
                {bridgeLogs.length
                  ? bridgeLogs.map(entry => <div key={entry}>{entry}</div>)
                  : <div className="text-muted-foreground">{i18n.t("options.pdfTranslation.bridgeAgent.emptyLog")}</div>}
              </div>
            </div>
          </div>
        </details>

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

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = PDF_TRANSLATE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const parentSignal = init?.signal
  const abortFromParent = () => controller.abort()
  parentSignal?.addEventListener("abort", abortFromParent, { once: true })

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const responseText = await response.text()
    const payload = responseText ? JSON.parse(responseText) as unknown : null

    if (!response.ok) {
      throw new Error(extractErrorMessage(payload) ?? `${response.status} ${response.statusText}`)
    }

    return payload as T
  }
  catch (error) {
    if (timedOut) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
    }
    throw error
  }
  finally {
    window.clearTimeout(timeout)
    parentSignal?.removeEventListener("abort", abortFromParent)
  }
}

function getPdfTranslationProviderLabel(provider: PdfTranslationProvider) {
  return i18n.t(`options.pdfTranslation.config.providers.${PDF_TRANSLATION_PROVIDER_RULES[provider].i18nKey}`)
}

function getPdfInitialSourceKey(source: PdfTranslationInitialSource) {
  return `${source.kind}:${source.tabId}:${source.sourceUrl}`
}

async function fetchPdfSourceAsFile(source: PdfTranslationInitialSource, signal: AbortSignal) {
  if (source.sourceUrl.startsWith("file:") && !await isFileSchemeAccessAllowed())
    throw new Error(i18n.t("options.pdfTranslation.tool.autoLoadAccessHint"))

  const response = await fetch(source.sourceUrl, {
    credentials: "include",
    signal,
  })
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`)

  const contentLength = getContentLength(response)
  if (contentLength !== null && contentLength > PDF_SOURCE_LOAD_MAX_BYTES) {
    throw new Error(i18n.t("options.pdfTranslation.tool.autoLoadTooLarge", [
      formatBytes(PDF_SOURCE_LOAD_MAX_BYTES),
    ]))
  }

  const blob = await response.blob()
  if (blob.size > PDF_SOURCE_LOAD_MAX_BYTES) {
    throw new Error(i18n.t("options.pdfTranslation.tool.autoLoadTooLarge", [
      formatBytes(PDF_SOURCE_LOAD_MAX_BYTES),
    ]))
  }

  if (!await isPdfBlob(response, blob))
    throw new Error(i18n.t("options.pdfTranslation.tool.autoLoadNotPdf"))

  return new File([blob], getPdfSourceFileName(source), {
    type: blob.type || "application/pdf",
  })
}

async function isFileSchemeAccessAllowed() {
  const extensionApi = (browser as any).extension ?? (globalThis as any).chrome?.extension
  if (typeof extensionApi?.isAllowedFileSchemeAccess !== "function")
    return false

  try {
    const directResult = extensionApi.isAllowedFileSchemeAccess()
    if (directResult && typeof directResult.then === "function")
      return await directResult

    if (typeof directResult === "boolean")
      return directResult
  }
  catch {}

  return await new Promise<boolean>((resolve) => {
    extensionApi.isAllowedFileSchemeAccess((allowed: boolean) => resolve(allowed))
  })
}

function getContentLength(response: Response) {
  const rawLength = response.headers.get("content-length")
  if (!rawLength)
    return null

  const parsed = Number.parseInt(rawLength, 10)
  return Number.isFinite(parsed) ? parsed : null
}

async function isPdfBlob(response: Response, blob: Blob) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? ""
  if (contentType.includes("application/pdf"))
    return true

  const header = await blob.slice(0, 5).text()
  return header.startsWith("%PDF")
}

function getPdfSourceFileName(source: Pick<PdfTranslationInitialSource, "sourceUrl" | "title">) {
  const title = source.title?.trim()
  if (title && title.toLowerCase().endsWith(".pdf"))
    return sanitizeFilename(title)

  try {
    const url = new URL(source.sourceUrl)
    const lastPathPart = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "")
    if (lastPathPart)
      return sanitizeFilename(lastPathPart.toLowerCase().endsWith(".pdf") ? lastPathPart : `${lastPathPart}.pdf`)
  }
  catch {}

  return "qq-frog-source.pdf"
}

async function openTranslationResult({
  file,
  markdown,
  resultBehavior,
  targetLanguage,
  downloadFileName,
}: {
  file: File | null
  markdown: string
  resultBehavior?: PdfTranslationResultBehavior
  targetLanguage: string
  downloadFileName: string
}) {
  if (resultBehavior?.kind !== "replace-source-tab")
    return

  const resultId = createPdfTranslationResultId()
  await savePdfTranslationResult({
    id: resultId,
    sessionId: resultBehavior.sessionId,
    sourceUrl: resultBehavior.sourceUrl,
    sourceTitle: resultBehavior.sourceTitle,
    sourceFileName: file?.name ?? getPdfSourceFileName({
      sourceUrl: resultBehavior.sourceUrl,
      title: resultBehavior.sourceTitle,
    }),
    downloadFileName,
    targetLanguage,
    markdown,
    createdAt: Date.now(),
  })

  await browser.tabs.update(resultBehavior.tabId, {
    url: getExtensionPageUrl(`/pdf-result.html?id=${encodeURIComponent(resultId)}`),
  })
}

async function fetchBridgeHealth(serviceUrl: string, signal?: AbortSignal, timeoutMs = BRIDGE_HEALTH_TIMEOUT_MS) {
  return await fetchJson<PdfHealthResponse>(`${trimTrailingSlash(serviceUrl)}/pdf/health`, { signal }, timeoutMs)
}

async function fetchBridgeRuntimeHealth(serviceUrl: string, signal?: AbortSignal, timeoutMs = BRIDGE_HEALTH_TIMEOUT_MS) {
  return await fetchJson<BridgeRuntimeHealthResponse>(`${trimTrailingSlash(serviceUrl)}/health`, { signal }, timeoutMs)
}

function formatBridgeHealthSummary(health: PdfHealthResponse) {
  const dependencies = health.dependencies
    ? health.dependencies.map(dependency => `${dependency.name}: ${dependency.installed ? "installed" : "missing"}`).join(", ")
    : ""
  const warnings = health.warnings?.length ? ` ${health.warnings.join(" ")}` : ""
  return `${health.status ?? "unknown"}${health.python_version ? ` / Python ${health.python_version}` : ""}${dependencies ? ` / ${dependencies}` : ""}${warnings}`
}

function formatBridgeRuntimeSummary(runtime: BridgeRuntimeHealthResponse) {
  return [
    `server=${runtime.status ?? "unknown"}`,
    `extension=${runtime.extension_connected ? "connected" : "disconnected"}`,
    `pending=${runtime.pending_tasks ?? "unknown"}`,
    `ocr=${runtime.pdf_ocr?.status ?? "unknown"}`,
  ].join(" / ")
}

function formatBridgeAgentProcess(status: BridgeAgentStatus, activeTaskIds: string[]) {
  if (activeTaskIds.length > 0)
    return `processing ${activeTaskIds.map(taskId => taskId.slice(0, 8)).join(", ")}`
  if (status === "connected")
    return "idle/listening"
  if (status === "connecting")
    return "connecting"
  if (status === "error")
    return "error"
  return "disconnected"
}

function toBridgeWebSocketUrl(serviceUrl: string) {
  const url = new URL(trimTrailingSlash(serviceUrl))
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/ws"
  url.search = ""
  url.hash = ""
  return url.toString()
}

function getPromptApi(): PromptApiAdapter | null {
  const root = globalThis as any

  if (root.LanguageModel && typeof root.LanguageModel.create === "function") {
    return { name: "LanguageModel", model: root.LanguageModel }
  }

  const aiObj = root.chrome?.ai || root.ai
  if (aiObj?.languageModel && typeof aiObj.languageModel.create === "function") {
    return { name: "chrome.ai.languageModel", model: aiObj.languageModel }
  }

  return null
}

async function getPromptAvailability(promptApi: PromptApiAdapter) {
  if (typeof promptApi.model.availability === "function") {
    return await promptApi.model.availability() as string
  }

  if (typeof promptApi.model.capabilities === "function") {
    const capabilities = await promptApi.model.capabilities()
    return capabilities.available as string
  }

  return "available"
}

function isPromptUnavailable(availability: string) {
  return availability === "no" || availability === "unavailable"
}

async function createPromptSession(promptApi: PromptApiAdapter, systemPrompt: string) {
  if (promptApi.name === "LanguageModel") {
    return await promptApi.model.create({
      initialPrompts: [{ role: "system", content: systemPrompt }],
    })
  }

  return await promptApi.model.create({ systemPrompt })
}

async function handleBridgeTask(
  event: MessageEvent,
  promptApi: PromptApiAdapter,
  socket: WebSocket,
  appendBridgeLog: (message: string) => void,
  setActiveTaskIds: (updater: (previous: string[]) => string[]) => void,
) {
  const task = JSON.parse(event.data) as WSTranslateTask
  const taskLabel = task.task_id.slice(0, 8)
  setActiveTaskIds(previous => [...previous, task.task_id])
  appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.taskReceived")} ${taskLabel}`)

  const startedAt = performance.now()
  let session: any = null

  try {
    const systemPrompt = task.system_prompt || "You are a professional translator. Translate the following text into Traditional Chinese. Output only the translated text."
    session = await createPromptSession(promptApi, systemPrompt)
    const result = await session.prompt(task.user_prompt)
    const elapsedMs = Math.round(performance.now() - startedAt)
    socket.send(JSON.stringify({
      task_id: task.task_id,
      success: true,
      result,
      elapsed_ms: elapsedMs,
    }))
    appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.taskSucceeded")} ${taskLabel} / ${elapsedMs}ms`)
  }
  catch (error) {
    const elapsedMs = Math.round(performance.now() - startedAt)
    const message = getErrorMessage(error)
    socket.send(JSON.stringify({
      task_id: task.task_id,
      success: false,
      error: message,
      elapsed_ms: elapsedMs,
    }))
    appendBridgeLog(`${i18n.t("options.pdfTranslation.bridgeAgent.taskFailed")} ${taskLabel}: ${message}`)
  }
  finally {
    if (session && typeof session.destroy === "function") {
      try {
        await session.destroy()
      }
      catch {}
    }
    setActiveTaskIds(previous => previous.filter(taskId => taskId !== task.task_id))
  }
}

function extractErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail
    if (typeof detail === "string")
      return detail
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error
    if (error && typeof error === "object" && "message" in error) {
      const message = (error as { message?: unknown }).message
      if (typeof message === "string")
        return message
    }
  }
  return null
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function isLocalBridgeServiceUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
  }
  catch {
    return false
  }
}

function sanitizeFilename(value: string) {
  const withoutControlCharacters = Array.from(value).filter(char => char.charCodeAt(0) >= 32).join("")
  return withoutControlCharacters.replace(/[<>:"/\\|?*]/g, "_") || "qq-frog-pdf-translation"
}

function formatBytes(value: number) {
  return `${Math.round(value / 1024 / 1024)} MB`
}

function getDownloadFileName(file: File | null) {
  const baseName = file ? sanitizeFilename(file.name.replace(/\.pdf$/i, "")) : "qq-frog-pdf-translation"
  return `${baseName}.translated.md`
}

function formatNativeHostSummary(response: PdfBridgeNativeHostResponse) {
  const details = [
    response.message,
    response.hint ? `Hint: ${response.hint}` : "",
    response.pid ? `PID: ${response.pid}` : "",
    response.error ? `Error: ${response.error}` : "",
    response.logPath ? `Log: ${response.logPath}` : "",
  ].filter(Boolean)
  return details.join(" ")
}

function formatNativeHostFailure(response: PdfBridgeNativeHostResponse) {
  return [response.message, response.hint].filter(Boolean).join(" ")
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError"
}

function getErrorMessage(error: unknown) {
  if (error instanceof TypeError && error.message === "Failed to fetch")
    return i18n.t("options.pdfTranslation.tool.connectionFailedHint")
  if (error instanceof Error)
    return error.message
  return String(error)
}

function getPdfSourceLoadErrorMessage(error: unknown) {
  if (isAbortError(error))
    return i18n.t("options.pdfTranslation.tool.autoLoadTimeout")

  if (error instanceof TypeError && error.message === "Failed to fetch")
    return i18n.t("options.pdfTranslation.tool.autoLoadAccessHint")

  return getErrorMessage(error)
}

function getExtensionPageUrl(path: string) {
  return browser.runtime.getURL(path as any)
}
