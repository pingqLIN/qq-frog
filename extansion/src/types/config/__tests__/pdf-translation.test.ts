import { describe, expect, it } from "vitest"
import { PDF_TRANSLATION_PROVIDER_RULES, PDF_TRANSLATION_PROVIDERS, pdfTranslationConfigSchema } from "../pdf-translation"

describe("pdf translation config", () => {
  const baseConfig = {
    enabled: true,
    serviceUrl: "http://localhost:8001",
    provider: "chrome-gemini",
    outputMode: "bilingual-markdown",
  }

  it("limits PDF translation providers to the supported local bridge backends", () => {
    expect(PDF_TRANSLATION_PROVIDERS).toEqual([
      "chrome-gemini",
      "lm-studio",
      "openai",
      "gemini",
    ])
  })

  it.each(PDF_TRANSLATION_PROVIDERS)("accepts %s as a PDF translation provider", (provider) => {
    const result = pdfTranslationConfigSchema.safeParse({
      ...baseConfig,
      provider,
    })

    expect(result.success).toBe(true)
  })

  it("keeps provider routing metadata aligned with the provider list", () => {
    expect(Object.keys(PDF_TRANSLATION_PROVIDER_RULES)).toEqual([...PDF_TRANSLATION_PROVIDERS])
    expect(PDF_TRANSLATION_PROVIDER_RULES["chrome-gemini"]).toMatchObject({
      model: "chrome-gemini",
      category: "browser-agent",
      requiresBridgeAgent: true,
    })
    expect(PDF_TRANSLATION_PROVIDER_RULES.openai.requiresBridgeAgent).toBe(false)
    expect(PDF_TRANSLATION_PROVIDER_RULES.gemini.usesExternalApiKey).toBe(true)
  })

  it("rejects general translation providers that are not supported by the PDF bridge", () => {
    const result = pdfTranslationConfigSchema.safeParse({
      ...baseConfig,
      provider: "deepseek",
    })

    expect(result.success).toBe(false)
  })
})
