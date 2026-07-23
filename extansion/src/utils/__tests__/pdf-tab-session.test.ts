import { describe, expect, it } from "vitest"
import {
  createPdfTabSessionFromTab,
  detectPdfSourceFromUrl,
  getPdfTabSessionStorageKey,
} from "../pdf-tab-session"

describe("pdf tab session utilities", () => {
  it("detects direct https PDF URLs", () => {
    expect(detectPdfSourceFromUrl("https://example.com/report.pdf?download=1#page=2")).toEqual({
      sourceUrl: "https://example.com/report.pdf?download=1#page=2",
      sourceKind: "remote-url",
    })
  })

  it("detects local file PDF URLs", () => {
    expect(detectPdfSourceFromUrl("file:///C:/Users/miles/Documents/sample.pdf")).toEqual({
      sourceUrl: "file:///C:/Users/miles/Documents/sample.pdf",
      sourceKind: "file-url",
    })
  })

  it("recovers PDF URLs from Chrome PDF viewer URLs", () => {
    const sourceUrl = "https://example.com/docs/guide.pdf"
    const viewerUrl = `chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/index.html?src=${encodeURIComponent(sourceUrl)}`

    expect(detectPdfSourceFromUrl(viewerUrl)).toEqual({
      sourceUrl,
      sourceKind: "chrome-pdf-viewer",
    })
  })

  it("ignores non-PDF URLs", () => {
    expect(detectPdfSourceFromUrl("https://example.com/article.html")).toBeNull()
  })

  it("creates a session from a browser tab", () => {
    expect(createPdfTabSessionFromTab({
      id: 12,
      windowId: 34,
      title: "Quarterly report",
      url: "https://example.com/report.pdf",
    }, 1000)).toEqual({
      sessionId: "12-1000",
      tabId: 12,
      windowId: 34,
      title: "Quarterly report",
      originalUrl: "https://example.com/report.pdf",
      sourceUrl: "https://example.com/report.pdf",
      sourceKind: "remote-url",
      detectedAt: 1000,
      status: "detected",
    })
  })

  it("names tab session storage keys by tab id", () => {
    expect(getPdfTabSessionStorageKey(123)).toBe("pdfTranslation.tabSession.123")
  })
})
