import { afterEach, describe, expect, it, vi } from "vitest"
import { chromeAIGenerateText, chromeAITranslate } from "../chrome-ai"

const promptResolver = vi.fn().mockResolvedValue({
  systemPrompt: "system",
  prompt: "prompt",
})

function clearBuiltInAIStubs() {
  delete (globalThis as any).LanguageModel
  delete (globalThis as any).ai
  delete (globalThis as any).chrome
}

describe("chromeAITranslate", () => {
  afterEach(() => {
    vi.clearAllMocks()
    clearBuiltInAIStubs()
  })

  it("uses the current LanguageModel Prompt API with system initial prompts", async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue("你好"),
      destroy: vi.fn().mockResolvedValue(undefined),
    }
    const languageModel = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(session),
    }
    ;(globalThis as any).LanguageModel = languageModel

    await expect(chromeAITranslate("hello", "Traditional Mandarin Chinese", promptResolver)).resolves.toBe("你好")

    expect(languageModel.availability).toHaveBeenCalled()
    expect(languageModel.create).toHaveBeenCalledWith({
      initialPrompts: [{ role: "system", content: "system" }],
    })
    expect(promptResolver).toHaveBeenCalledWith("Traditional Mandarin Chinese", "hello", undefined)
    expect(session.prompt).toHaveBeenCalledWith("prompt")
    expect(session.destroy).toHaveBeenCalled()
  })

  it("rejects when Chrome reports the built-in model is unavailable", async () => {
    ;(globalThis as any).LanguageModel = {
      availability: vi.fn().mockResolvedValue("unavailable"),
      create: vi.fn(),
    }

    await expect(chromeAITranslate("hello", "Traditional Mandarin Chinese", promptResolver)).rejects.toThrow(
      "Chrome built-in AI is unavailable",
    )
  })

  it("generates text directly with the current LanguageModel Prompt API", async () => {
    const session = {
      prompt: vi.fn().mockResolvedValue("jpn"),
      destroy: vi.fn().mockResolvedValue(undefined),
    }
    const languageModel = {
      availability: vi.fn().mockResolvedValue("available"),
      create: vi.fn().mockResolvedValue(session),
    }
    ;(globalThis as any).LanguageModel = languageModel

    await expect(chromeAIGenerateText("Return only ISO 639-3.", "こんにちは")).resolves.toBe("jpn")

    expect(languageModel.create).toHaveBeenCalledWith({
      initialPrompts: [{ role: "system", content: "Return only ISO 639-3." }],
    })
    expect(session.prompt).toHaveBeenCalledWith("こんにちは")
    expect(session.destroy).toHaveBeenCalled()
  })
})
