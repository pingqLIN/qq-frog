import { describe, expect, it } from "vitest"

import { API_PROVIDER_TYPES } from "@/types/config/provider"
import {
  API_PROVIDER_ITEMS,
  DEFAULT_PROVIDER_CONFIG,
  PROVIDER_GROUPS,
} from "@/utils/constants/providers"

describe("chrome Built-in AI provider contract", () => {
  it("keeps chrome-ai visible and configured as an API provider", () => {
    expect(API_PROVIDER_TYPES).toContain("chrome-ai")
    expect(API_PROVIDER_ITEMS["chrome-ai"]).toBeDefined()
    expect(PROVIDER_GROUPS.chromeBuiltInProviders.types).toContain("chrome-ai")
    expect(DEFAULT_PROVIDER_CONFIG["chrome-ai"]).toMatchObject({
      id: "chrome-ai-default",
      provider: "chrome-ai",
    })
  })
})
