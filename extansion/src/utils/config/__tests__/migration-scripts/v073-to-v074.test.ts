import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v073-to-v074"

describe("v073-to-v074 migration", () => {
  it("adds Chrome built-in AI provider after the first existing provider", () => {
    const migrated = migrate({
      providersConfig: [
        { id: "google-translate-default", name: "Google Translate", enabled: true, provider: "google-translate" },
        { id: "openai-default", name: "OpenAI", enabled: true, provider: "openai" },
      ],
    })

    expect(migrated.providersConfig).toEqual([
      { id: "google-translate-default", name: "Google Translate", enabled: true, provider: "google-translate" },
      {
        id: "chrome-ai-default",
        name: "Chrome AI (Gemini Nano)",
        description: "使用 Chrome 內建 Gemini Nano / Prompt API 進行本機翻譯，不需要 API Key",
        enabled: false,
        provider: "chrome-ai",
        bridgeUrl: "ws://localhost:8001/ws",
      },
      { id: "openai-default", name: "OpenAI", enabled: true, provider: "openai" },
    ])
  })

  it("preserves configs that already have a Chrome AI provider", () => {
    const config = {
      providersConfig: [
        {
          id: "custom-chrome-ai",
          name: "Local Gemini",
          enabled: true,
          provider: "chrome-ai",
          bridgeUrl: "ws://127.0.0.1:9000/ws",
        },
      ],
    }

    expect(migrate(config)).toBe(config)
  })
})
