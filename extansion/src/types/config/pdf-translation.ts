import { z } from "zod"

export const PDF_TRANSLATION_PROVIDERS = [
  "chrome-gemini",
  "lm-studio",
  "openai",
  "gemini",
] as const

export const PDF_TRANSLATION_OUTPUT_MODES = [
  "bilingual-markdown",
  "text-layer",
] as const

export const PDF_TRANSLATION_PROVIDER_RULES = {
  "chrome-gemini": {
    i18nKey: "chromeGemini",
    model: "chrome-gemini",
    category: "browser-agent",
    requiresBridgeAgent: true,
    usesExternalApiKey: false,
  },
  "lm-studio": {
    i18nKey: "lmStudio",
    model: "lm-studio",
    category: "openai-compatible",
    requiresBridgeAgent: false,
    usesExternalApiKey: false,
  },
  "openai": {
    i18nKey: "openai",
    model: "openai",
    category: "cloud-llm",
    requiresBridgeAgent: false,
    usesExternalApiKey: true,
  },
  "gemini": {
    i18nKey: "gemini",
    model: "gemini",
    category: "cloud-llm",
    requiresBridgeAgent: false,
    usesExternalApiKey: true,
  },
} as const satisfies Record<typeof PDF_TRANSLATION_PROVIDERS[number], {
  i18nKey: string
  model: string
  category: "browser-agent" | "openai-compatible" | "cloud-llm"
  requiresBridgeAgent: boolean
  usesExternalApiKey: boolean
}>

export const pdfTranslationConfigSchema = z.object({
  enabled: z.boolean(),
  serviceUrl: z.string().url(),
  provider: z.enum(PDF_TRANSLATION_PROVIDERS),
  outputMode: z.enum(PDF_TRANSLATION_OUTPUT_MODES),
})

export type PdfTranslationProvider = typeof PDF_TRANSLATION_PROVIDERS[number]
export type PdfTranslationOutputMode = typeof PDF_TRANSLATION_OUTPUT_MODES[number]
export type PdfTranslationConfig = z.infer<typeof pdfTranslationConfigSchema>
