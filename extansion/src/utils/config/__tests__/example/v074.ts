import type { TestSeriesObject } from "./types"
import { testSeries as v073TestSeries } from "./v073"

const chromeAIProvider = {
  id: "chrome-ai-default",
  name: "Chrome AI (Gemini Nano)",
  description: "使用 Chrome 內建 Gemini Nano / Prompt API 進行本機翻譯，不需要 API Key",
  enabled: false,
  provider: "chrome-ai",
  bridgeUrl: "ws://localhost:8001/ws",
}

export const testSeries = Object.fromEntries(
  Object.entries(v073TestSeries).map(([key, value]) => [
    key,
    {
      ...value,
      config: {
        ...value.config,
        providersConfig: Array.isArray(value.config.providersConfig) && value.config.providersConfig.length > 0
          ? [value.config.providersConfig[0], chromeAIProvider, ...value.config.providersConfig.slice(1)]
          : [chromeAIProvider],
      },
    },
  ]),
) satisfies TestSeriesObject
