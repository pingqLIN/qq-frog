import { describe, expect, it } from "vitest"
import { getDefaultAnalyticsEnabled } from "../analytics"

describe("analytics constants", () => {
  it("disables analytics by default on Chromium browsers", () => {
    expect(getDefaultAnalyticsEnabled("chrome")).toBe(false)
    expect(getDefaultAnalyticsEnabled("edge")).toBe(false)
  })

  it("disables analytics by default on Firefox", () => {
    expect(getDefaultAnalyticsEnabled("firefox")).toBe(false)
  })
})
