import { storage } from "#imports"
import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  chromeAIGenerateTextMock,
  generateTextMock,
  getModelByIdMock,
  loggerErrorMock,
  onMessageMock,
  storageGetItemMock,
} = vi.hoisted(() => ({
  chromeAIGenerateTextMock: vi.fn(),
  generateTextMock: vi.fn(),
  getModelByIdMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  onMessageMock: vi.fn(),
  storageGetItemMock: vi.fn(),
}))

vi.mock("@/utils/message", () => ({
  onMessage: onMessageMock,
}))

vi.mock("@/utils/providers/model", () => ({
  getModelById: getModelByIdMock,
}))

vi.mock("@/utils/host/translate/api/chrome-ai", () => ({
  chromeAIGenerateText: chromeAIGenerateTextMock,
}))

vi.mock("ai", () => ({
  generateText: generateTextMock,
}))

vi.mock("@/utils/logger", () => ({
  logger: {
    error: loggerErrorMock,
  },
}))

function getRegisteredMessageHandler(name: string) {
  const registration = onMessageMock.mock.calls.find(call => call[0] === name)
  if (!registration) {
    throw new Error(`Message handler not registered: ${name}`)
  }
  return registration[1] as (message: { data: Record<string, unknown> }) => Promise<{ text: string }>
}

describe("llm-generate-text", () => {
  beforeEach(() => {
    vi.resetModules()
    onMessageMock.mockReset()
    getModelByIdMock.mockReset()
    generateTextMock.mockReset()
    chromeAIGenerateTextMock.mockReset()
    loggerErrorMock.mockReset()
    storageGetItemMock.mockReset()
    ;(storage.getItem as unknown as ReturnType<typeof vi.fn>) = storageGetItemMock
    storageGetItemMock.mockResolvedValue(undefined)
  })

  it("runs generateText with resolved model in background", async () => {
    getModelByIdMock.mockResolvedValue("mock-model")
    generateTextMock.mockResolvedValue({ text: "eng" })

    const { runGenerateTextInBackground } = await import("../llm-generate-text")
    const result = await runGenerateTextInBackground({
      providerId: "openai-default",
      system: "system",
      prompt: "hello world",
      temperature: 0.2,
      maxRetries: 0,
    })

    expect(getModelByIdMock).toHaveBeenCalledWith("openai-default")
    expect(generateTextMock).toHaveBeenCalledWith({
      model: "mock-model",
      system: "system",
      prompt: "hello world",
      temperature: 0.2,
      maxRetries: 0,
    })
    expect(result).toEqual({ text: "eng" })
  })

  it("routes Chrome built-in AI providers through the Prompt API adapter", async () => {
    storageGetItemMock.mockResolvedValue({
      providersConfig: [
        {
          id: "chrome-ai-default",
          enabled: true,
          name: "Chrome AI (Gemini Nano)",
          provider: "chrome-ai",
        },
      ],
    })
    chromeAIGenerateTextMock.mockResolvedValue("cmn")

    const { runGenerateTextInBackground } = await import("../llm-generate-text")
    const result = await runGenerateTextInBackground({
      providerId: "chrome-ai-default",
      system: "language detection system prompt",
      prompt: "你好世界",
      maxRetries: 0,
    })

    expect(storageGetItemMock).toHaveBeenCalledWith("local:config")
    expect(chromeAIGenerateTextMock).toHaveBeenCalledWith("language detection system prompt", "你好世界")
    expect(getModelByIdMock).not.toHaveBeenCalled()
    expect(generateTextMock).not.toHaveBeenCalled()
    expect(result).toEqual({ text: "cmn" })
  })

  it("registers backgroundGenerateText message handler", async () => {
    getModelByIdMock.mockResolvedValue("mock-model")
    generateTextMock.mockResolvedValue({ text: "cmn" })

    const { setupLLMGenerateTextMessageHandlers } = await import("../llm-generate-text")
    setupLLMGenerateTextMessageHandlers()

    const handler = getRegisteredMessageHandler("backgroundGenerateText")
    const result = await handler({
      data: {
        providerId: "openai-default",
        prompt: "你好",
      },
    })

    expect(result).toEqual({ text: "cmn" })
  })

  it("logs and rethrows handler errors", async () => {
    getModelByIdMock.mockRejectedValue(new Error("provider unavailable"))

    const { setupLLMGenerateTextMessageHandlers } = await import("../llm-generate-text")
    setupLLMGenerateTextMessageHandlers()
    const handler = getRegisteredMessageHandler("backgroundGenerateText")

    await expect(handler({
      data: {
        providerId: "openai-default",
        prompt: "test",
      },
    })).rejects.toThrow("provider unavailable")

    expect(loggerErrorMock).toHaveBeenCalled()
  })
})
