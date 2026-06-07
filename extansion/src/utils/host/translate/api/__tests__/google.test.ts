import { afterEach, describe, expect, it, vi } from "vitest"
import { googleTranslate, splitGoogleTranslateText } from "../google"

afterEach(() => {
  vi.unstubAllGlobals()
})

function createLongText(targetLength: number): string {
  const paragraphs: string[] = []
  let index = 0

  while (paragraphs.join("\n\n").length < targetLength) {
    paragraphs.push(`Paragraph ${index}. ${"x".repeat(180)}.`)
    index += 1
  }

  return paragraphs.join("\n\n").slice(0, targetLength)
}

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

  it.each([20_000, 50_000, 100_000])(
    "dry-runs %i characters without live Google requests",
    async (length) => {
      let activeRequests = 0
      let maxActiveRequests = 0
      let translatedCharacters = 0

      const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
        activeRequests += 1
        maxActiveRequests = Math.max(maxActiveRequests, activeRequests)

        const body = JSON.parse(String(init?.body)) as [[[string], string, string], string]
        const chunk = body[0][0][0]
        translatedCharacters += chunk.length

        await Promise.resolve()
        activeRequests -= 1

        return new Response(JSON.stringify([[chunk]]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      })
      vi.stubGlobal("fetch", fetchMock)

      const source = createLongText(length)
      const chunks = splitGoogleTranslateText(source)
      const result = await googleTranslate(source, "en", "zh-TW")

      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks.every(chunk => chunk.length <= 4000)).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(chunks.length)
      expect(translatedCharacters).toBe(source.length)
      expect(maxActiveRequests).toBe(1)
      expect(result).toBe(source)
    },
  )
})
