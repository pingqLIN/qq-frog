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

export const pdfTranslationConfigSchema = z.object({
  enabled: z.boolean(),
  serviceUrl: z.string().url(),
  provider: z.enum(PDF_TRANSLATION_PROVIDERS),
  outputMode: z.enum(PDF_TRANSLATION_OUTPUT_MODES),
})

export type PdfTranslationProvider = typeof PDF_TRANSLATION_PROVIDERS[number]
export type PdfTranslationOutputMode = typeof PDF_TRANSLATION_OUTPUT_MODES[number]
export type PdfTranslationConfig = z.infer<typeof pdfTranslationConfigSchema>
