import type { TestSeriesObject } from "./types"
import { testSeries as v072TestSeries } from "./v072"

const pdfTranslation = {
  enabled: false,
  serviceUrl: "http://localhost:8001",
  provider: "chrome-gemini",
  outputMode: "bilingual-markdown",
}

export const testSeries = Object.fromEntries(
  Object.entries(v072TestSeries).map(([key, value]) => [
    key,
    {
      ...value,
      config: {
        ...value.config,
        pdfTranslation,
      },
    },
  ]),
) satisfies TestSeriesObject
