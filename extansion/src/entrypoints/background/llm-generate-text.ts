import type {
  BackgroundGenerateTextPayload,
  BackgroundGenerateTextResponse,
} from "@/types/background-generate-text"
import type { Config } from "@/types/config/config"
import { storage } from "#imports"
import { generateText } from "ai"
import { isChromeAIProvider } from "@/types/config/provider"
import { getProviderConfigById } from "@/utils/config/helpers"
import { CONFIG_STORAGE_KEY } from "@/utils/constants/config"
import { chromeAIGenerateText } from "@/utils/host/translate/api/chrome-ai"
import { logger } from "@/utils/logger"
import { onMessage } from "@/utils/message"
import { getModelById } from "@/utils/providers/model"

async function getProviderTypeById(providerId: string): Promise<string | undefined> {
  const config = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  const providerConfig = config
    ? getProviderConfigById(config.providersConfig, providerId)
    : undefined

  return providerConfig?.provider
}

export async function runGenerateTextInBackground(
  payload: BackgroundGenerateTextPayload,
): Promise<BackgroundGenerateTextResponse> {
  const { providerId, system, prompt, ...generateTextParams } = payload
  const providerType = await getProviderTypeById(providerId)

  if (providerType && isChromeAIProvider(providerType)) {
    return {
      text: await chromeAIGenerateText(system ?? "", prompt),
    }
  }

  const model = await getModelById(providerId)

  const { text } = await generateText({
    ...generateTextParams,
    system,
    prompt,
    model,
  })

  return { text }
}

export function setupLLMGenerateTextMessageHandlers() {
  onMessage("backgroundGenerateText", async (message) => {
    try {
      return await runGenerateTextInBackground(message.data)
    }
    catch (error) {
      logger.error("[Background] backgroundGenerateText failed", error)
      throw error
    }
  })
}
