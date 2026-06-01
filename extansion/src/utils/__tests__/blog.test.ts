import { describe, expect, it } from "vitest"
import { buildBilibiliEmbedUrl, extractBilibiliVideoId, getLatestBlogDate, hasNewBlogPost, resolveBlogLocale } from "../blog"

describe("local blog helpers", () => {
  it("keeps update fetching disabled", async () => {
    await expect(getLatestBlogDate()).resolves.toBeNull()
    expect(buildBilibiliEmbedUrl("https://example.test/video")).toBeNull()
    expect(extractBilibiliVideoId("https://example.test/video")).toBeNull()
  })

  it("keeps the date comparison helper deterministic for stale local state", () => {
    expect(hasNewBlogPost(null, null)).toBe(false)
    expect(hasNewBlogPost(null, new Date("2026-01-01"))).toBe(true)
    expect(hasNewBlogPost(new Date("2026-01-02"), new Date("2026-01-01"))).toBe(false)
  })

  it("keeps locale resolution local and simple", () => {
    expect(resolveBlogLocale("zh-TW")).toBe("zh")
    expect(resolveBlogLocale("en-US")).toBe("en")
    expect(resolveBlogLocale(undefined)).toBe("en")
  })
})
