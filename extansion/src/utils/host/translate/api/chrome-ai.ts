import type { PromptResolver } from "./ai"

interface PromptApiAdapter {
  name: "LanguageModel" | "legacy"
  model: any
}

function getPromptApi(): PromptApiAdapter | null {
  const root = globalThis as any

  if (root.LanguageModel && typeof root.LanguageModel.create === "function") {
    return { name: "LanguageModel", model: root.LanguageModel }
  }

  const legacyAi = root.chrome?.ai || root.ai
  if (legacyAi?.languageModel && typeof legacyAi.languageModel.create === "function") {
    return { name: "legacy", model: legacyAi.languageModel }
  }

  return null
}

async function getPromptAvailability(promptApi: PromptApiAdapter): Promise<string> {
  if (typeof promptApi.model.availability === "function") {
    return await promptApi.model.availability()
  }

  if (typeof promptApi.model.capabilities === "function") {
    const capabilities = await promptApi.model.capabilities()
    return capabilities.available
  }

  return "available"
}

function isPromptUnavailable(availability: string): boolean {
  return availability === "no" || availability === "unavailable"
}

async function createPromptSession(promptApi: PromptApiAdapter, systemPrompt: string) {
  if (promptApi.name === "LanguageModel") {
    return await promptApi.model.create({
      initialPrompts: [{ role: "system", content: systemPrompt }],
    })
  }

  return await promptApi.model.create({ systemPrompt })
}

async function destroyPromptSession(session: any): Promise<void> {
  if (!session || typeof session.destroy !== "function")
    return

  await session.destroy()
}

export async function chromeAITranslate<TContext>(
  text: string,
  targetLangName: string,
  promptResolver: PromptResolver<TContext>,
  options?: { isBatch?: boolean, context?: TContext },
): Promise<string> {
  const { systemPrompt, prompt } = await promptResolver(targetLangName, text, options)
  return chromeAIGenerateText(systemPrompt, prompt)
}

export async function chromeAIGenerateText(systemPrompt: string, prompt: string): Promise<string> {
  const promptApi = getPromptApi()
  if (!promptApi) {
    throw new Error("Chrome built-in AI is unavailable. Use Chrome with the LanguageModel Prompt API enabled.")
  }

  const availability = await getPromptAvailability(promptApi)
  if (isPromptUnavailable(availability)) {
    throw new Error(`Chrome built-in AI is unavailable (availability: ${availability}).`)
  }

  let session: any = null

  try {
    session = await createPromptSession(promptApi, systemPrompt)
    const generatedText = await session.prompt(prompt)
    if (typeof generatedText !== "string") {
      throw new TypeError("Chrome built-in AI returned a non-text response.")
    }
    return generatedText
  }
  finally {
    await destroyPromptSession(session)
  }
}
