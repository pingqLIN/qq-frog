import { describe, expect, it } from "vitest"

describe("default config", () => {
  it("uses the sanitized app reference config as reset defaults", async () => {
    const { configSchema } = await import("@/types/config/config")
    const { DEFAULT_CONFIG } = await import("../config")

    expect(() => configSchema.parse(DEFAULT_CONFIG)).not.toThrow()

    expect(DEFAULT_CONFIG.providersConfig.map(provider => provider.id)).toEqual([
      "microsoft-translate-default",
      "google-translate-default",
      "openai-default",
      "google-default",
      "deeplx-default",
      "16892eeb-1717-416f-954c-64d0f3b17728",
      "594e29c9-e68d-4b9c-9879-6a8203707b2a",
    ])
    for (const providerConfig of DEFAULT_CONFIG.providersConfig) {
      expect(providerConfig).not.toHaveProperty("apiKey")
      expect(providerConfig).not.toHaveProperty("headers")
    }

    expect(DEFAULT_CONFIG.selectionToolbar.customActions.map(action => action.id)).toEqual([
      "default-dictionary",
      "92f316c4-a0ba-4587-a7de-a2b3e8c26a21",
      "e89a4eb7-57b7-4ba9-986f-17a076eba6ab",
      "7a3750f6-0de9-4e0a-a4c1-fbe903c4e57c",
    ])
    for (const action of DEFAULT_CONFIG.selectionToolbar.customActions) {
      expect(action).not.toHaveProperty("notebaseConnection")
      expect(action.outputSchema.every(field => field.id.length > 0)).toBe(true)
    }
  })
})
