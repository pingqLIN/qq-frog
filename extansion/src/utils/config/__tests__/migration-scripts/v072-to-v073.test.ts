import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v072-to-v073"

describe("v072-to-v073 migration", () => {
  it("adds default PDF translation settings", () => {
    expect(migrate({})).toEqual({
      pdfTranslation: {
        enabled: false,
        serviceUrl: "http://localhost:8001",
        provider: "chrome-gemini",
        outputMode: "bilingual-markdown",
      },
    })
  })

  it("preserves existing PDF translation settings", () => {
    expect(migrate({
      pdfTranslation: {
        enabled: true,
        serviceUrl: "http://127.0.0.1:9000",
        provider: "lm-studio",
        outputMode: "text-layer",
      },
    }).pdfTranslation).toEqual({
      enabled: true,
      serviceUrl: "http://127.0.0.1:9000",
      provider: "lm-studio",
      outputMode: "text-layer",
    })
  })
})
