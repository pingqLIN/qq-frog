import { afterEach, describe, expect, it, vi } from "vitest"
import { googleTranslate, splitGoogleTranslateText } from "../google"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("googleTranslate", () => {
  it("splits long text on useful boundaries", () => {
    const source = `${"A".repeat(3500)}. ${"B".repeat(3500)}`

    const chunks = splitGoogleTranslateText(source)

    expect(chunks).toHaveLength(2)
    expect(chunks.join("")).toBe(source)
    expect(chunks.every(chunk => chunk.length <= 4000)).toBe(true)
  })

  it("translates long text sequentially in chunks", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as [[[string], string, string], string]
      return new Response(JSON.stringify([[`translated:${body[0][0][0].length}`]]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    })
    vi.stubGlobal("fetch", fetchMock)

    const source = `${"A".repeat(3500)}. ${"B".repeat(3500)}`
    const result = await googleTranslate(source, "en", "zh-TW")

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toBe("translated:3502translated:3500")
  })
})
