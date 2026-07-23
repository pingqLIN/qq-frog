/**
 * Migration script from v073 to v074
 * - Adds Chrome built-in AI (Gemini Nano) as a configurable translation provider.
 *
 * IMPORTANT: All values are hardcoded inline. Migration scripts are frozen
 * snapshots -- never import constants or helpers that may change.
 */
const CHROME_AI_PROVIDER = {
  id: "chrome-ai-default",
  name: "Chrome AI (Gemini Nano)",
  description: "使用 Chrome 內建 Gemini Nano / Prompt API 進行本機翻譯，不需要 API Key",
  enabled: false,
  provider: "chrome-ai",
  bridgeUrl: "ws://localhost:8001/ws",
}

export function migrate(oldConfig: any): any {
  if (!Array.isArray(oldConfig?.providersConfig)) {
    return {
      ...oldConfig,
      providersConfig: [CHROME_AI_PROVIDER],
    }
  }

  if (oldConfig.providersConfig.some((provider: any) => provider?.provider === "chrome-ai")) {
    return oldConfig
  }

  if (oldConfig.providersConfig.length === 0) {
    return {
      ...oldConfig,
      providersConfig: [CHROME_AI_PROVIDER],
    }
  }

  const [firstProvider, ...remainingProviders] = oldConfig.providersConfig
  return {
    ...oldConfig,
    providersConfig: [
      firstProvider,
      CHROME_AI_PROVIDER,
      ...remainingProviders,
    ],
  }
}
