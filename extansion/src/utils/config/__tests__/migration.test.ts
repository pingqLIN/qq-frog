import { describe, expect, it } from "vitest"
import { CONFIG_SCHEMA_VERSION, DEFAULT_CONFIG } from "@/utils/constants/config"
import { ConfigVersionTooNewError } from "../errors"
import { migrateConfig } from "../migration"

describe("migrateConfig", () => {
  it("should throw ConfigVersionTooNewError when schema version is newer than current", async () => {
    const futureVersion = CONFIG_SCHEMA_VERSION + 1
    const config = {}

    await expect(migrateConfig(config, futureVersion))
      .rejects
      .toThrow(ConfigVersionTooNewError)
  })

  it("should remove retired local fork providers from legacy v72 backups", async () => {
    const config = structuredClone(DEFAULT_CONFIG) as any
    config.providersConfig = [
      ...config.providersConfig,
      {
        id: "retired-local-provider-a",
        name: "Retired local provider A",
        enabled: false,
        provider: "tensdaq",
      },
      {
        id: "retired-local-provider-b",
        name: "Retired local provider B",
        enabled: false,
        provider: "ai302",
      },
    ]

    const migratedConfig = await migrateConfig(config, CONFIG_SCHEMA_VERSION)

    expect(migratedConfig.providersConfig).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ provider: "tensdaq" }),
        expect.objectContaining({ provider: "ai302" }),
      ]),
    )
    expect(migratedConfig.providersConfig.some(provider => provider.id === "openai-default")).toBe(true)
  })
})
