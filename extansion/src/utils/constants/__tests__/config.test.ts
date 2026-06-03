import { afterEach, describe, expect, it, vi } from "vitest"

describe("default config", () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: originalCrypto,
    })
    vi.resetModules()
  })

  it("initializes when crypto.randomUUID is unavailable but crypto.getRandomValues exists", async () => {
    const getRandomValues = vi.fn((array: Uint8Array<ArrayBuffer>) => originalCrypto.getRandomValues(array))

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues,
      } as unknown as Crypto,
    })
    vi.resetModules()

    const { DEFAULT_CONFIG } = await import("../config")
    const defaultDictionaryAction = DEFAULT_CONFIG.selectionToolbar.customActions[0]

    expect(defaultDictionaryAction).toEqual(expect.objectContaining({
      id: "default-dictionary",
    }))
    expect(defaultDictionaryAction?.outputSchema).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "default-dictionary-term" }),
    ]))
    expect(defaultDictionaryAction?.outputSchema.every(field => typeof field.id === "string" && field.id.length > 0)).toBe(true)
    expect(getRandomValues).toHaveBeenCalled()
  })

  it("uses sanitized app reference providers and custom AI actions", async () => {
    const { DEFAULT_CONFIG } = await import("../config")

    expect(DEFAULT_CONFIG.providersConfig.length).toBeGreaterThan(0)
    for (const providerConfig of DEFAULT_CONFIG.providersConfig) {
      expect(providerConfig).not.toHaveProperty("apiKey")
      expect(providerConfig).not.toHaveProperty("headers")
      expect(providerConfig).not.toHaveProperty("providerOptions")
    }

    expect(DEFAULT_CONFIG.selectionToolbar.customActions.map(action => action.id)).toEqual([
      "default-dictionary",
      "default-improve-writing",
    ])
    for (const action of DEFAULT_CONFIG.selectionToolbar.customActions) {
      expect(action.providerId).toBe("openai-default")
      expect(action).not.toHaveProperty("notebaseConnection")
      expect(action.outputSchema.every(field => field.id.startsWith(`${action.id}-`))).toBe(true)
    }
  })
})
