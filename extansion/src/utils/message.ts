import type { LangCodeISO6393 } from "@read-frog/definitions"
import type {
  BackgroundGenerateTextPayload,
  BackgroundGenerateTextResponse,
} from "@/types/background-generate-text"
import type { Config } from "@/types/config/config"
import type { ProviderConfig } from "@/types/config/provider"
import type { BatchQueueConfig, RequestQueueConfig } from "@/types/config/translate"
import type {
  EdgeTTSHealthStatus,
  EdgeTTSSynthesizeRequest,
  EdgeTTSSynthesizeWireResponse,
} from "@/types/edge-tts"
import type { ProxyRequest, ProxyResponse } from "@/types/proxy-fetch"
import type {
  TTSOffscreenStopRequest,
  TTSPlaybackStartRequest,
  TTSPlaybackStartResponse,
  TTSPlaybackStopRequest,
} from "@/types/tts-playback"
import type { PdfTabSession } from "@/utils/pdf-tab-session"
import type { EdgeTTSVoice } from "@/utils/server/edge-tts/types"
import { defineExtensionMessaging } from "@webext-core/messaging"

interface ProtocolMap {
  // navigation
  openPage: (data: { url: string, active?: boolean }) => void
  openOptionsPage: () => void
  toggleSidePanel: (data?: { source?: "content-script" | "extension-user-action" }) => Promise<{ ok: true, action: "opened" | "closed" } | { ok: false, reason: "missing-window" | "unsupported" | "toggle-failed" | "requires-extension-user-action" }>
  // config
  getInitialConfig: () => Config | null
  // local PDF bridge
  pdfBridgeNativeHost: (data: PdfBridgeNativeHostRequest) => Promise<PdfBridgeNativeHostResponse>
  getActivePdfTabSession: (data?: { tabId?: number, windowId?: number }) => Promise<PdfTabSession | null>
  // translation state
  getEnablePageTranslationByTabId: (data: { tabId: number }) => boolean | undefined
  getEnablePageTranslationFromContentScript: () => Promise<boolean>
  tryToSetEnablePageTranslationByTabId: (data: { tabId: number, enabled: boolean }) => void
  tryToSetEnablePageTranslationOnContentScript: (data: { enabled: boolean }) => void
  setAndNotifyPageTranslationStateChangedByManager: (data: { enabled: boolean, url?: string }) => void
  notifyTranslationStateChanged: (data: { enabled: boolean }) => void
  ensureIframeHostContentInjected: (data: { tabId?: number }) => void
  injectCurrentIframesAfterTopFrameNodeTranslation: () => void
  reportDetectedPageLanguage: (data: { detectedCodeOrUnd: LangCodeISO6393 | "und", url: string }) => void
  refreshDetectedPageLanguage: () => void
  getDetectedCode: () => LangCodeISO6393
  detectedPageLanguageChanged: (data: { detectedCode: LangCodeISO6393 }) => void
  // ask host to start page translation
  askManagerToTogglePageTranslation: (data: { enabled: boolean }) => void
  openSelectionTranslationFromContextMenu: (data: { selectionText: string }) => void
  openSelectionCustomActionFromContextMenu: (data: { actionId: string, selectionText: string }) => void
  // user guide
  pinStateChanged: (data: { isPinned: boolean }) => void
  getPinState: () => boolean
  returnPinState: (data: { isPinned: boolean }) => void
  // request
  enqueueTranslateRequest: (data: { text: string, langConfig: Config["language"], providerConfig: ProviderConfig, scheduleAt: number, hash: string, webTitle?: string | null, webContent?: string | null, webSummary?: string | null }) => Promise<string>
  getOrGenerateWebPageSummary: (data: { webTitle: string, webContent: string, providerConfig: ProviderConfig }) => Promise<string | null>
  enqueueSubtitlesTranslateRequest: (data: { text: string, langConfig: Config["language"], providerConfig: ProviderConfig, scheduleAt: number, hash: string, videoTitle?: string | null, summary?: string | null }) => Promise<string>
  getSubtitlesSummary: (data: { videoTitle: string, subtitlesContext: string, providerConfig: ProviderConfig }) => Promise<string | null>
  backgroundGenerateText: (data: BackgroundGenerateTextPayload) => Promise<BackgroundGenerateTextResponse>
  // AI subtitle segmentation
  aiSegmentSubtitles: (data: { jsonContent: string, providerId: string }) => Promise<string>
  setTranslateRequestQueueConfig: (data: Partial<RequestQueueConfig>) => void
  setTranslateBatchQueueConfig: (data: Partial<BatchQueueConfig>) => void
  // Subtitle-specific queue config messages
  setSubtitlesRequestQueueConfig: (data: Partial<RequestQueueConfig>) => void
  setSubtitlesBatchQueueConfig: (data: Partial<BatchQueueConfig>) => void
  // network proxy
  backgroundFetch: (data: ProxyRequest) => Promise<ProxyResponse>
  // cache management
  clearAllTranslationRelatedCache: () => Promise<void>
  clearAiSegmentationCache: () => Promise<void>
  // edge tts
  edgeTtsSynthesize: (data: EdgeTTSSynthesizeRequest) => Promise<EdgeTTSSynthesizeWireResponse>
  edgeTtsListVoices: () => Promise<EdgeTTSVoice[]>
  edgeTtsHealthCheck: () => Promise<EdgeTTSHealthStatus>
  // tts playback
  ttsPlaybackEnsureOffscreen: () => Promise<{ ok: true }>
  ttsPlaybackStart: (data: TTSPlaybackStartRequest) => Promise<TTSPlaybackStartResponse>
  ttsPlaybackStop: (data: TTSPlaybackStopRequest) => Promise<{ ok: true }>
  // offscreen internal
  ttsOffscreenPlay: (data: TTSPlaybackStartRequest) => Promise<TTSPlaybackStartResponse>
  ttsOffscreenStop: (data: TTSOffscreenStopRequest) => Promise<{ ok: true }>
}

export interface PdfBridgeNativeHostRequest {
  action: "status" | "start" | "stop"
  serviceUrl: string
}

export interface PdfBridgeNativeHostResponse {
  ok: boolean
  status: "running" | "stopped" | "starting" | "error"
  message: string
  pid?: number | null
  health?: unknown
  error?: string | null
  hint?: string | null
  extensionId?: string | null
  logPath?: string
}

export const { sendMessage, onMessage }
  = defineExtensionMessaging<ProtocolMap>()
