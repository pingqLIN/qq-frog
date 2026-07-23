import { describe, expect, it, vi } from "vitest"
import { setupPdfTabSessionTracker } from "../pdf-tab-session"

function createStorageSession() {
  const values = new Map<string, unknown>()

  return {
    async get(keys?: string | string[] | Record<string, unknown> | null) {
      if (typeof keys === "string")
        return { [keys]: values.get(keys) }
      if (Array.isArray(keys))
        return Object.fromEntries(keys.map(key => [key, values.get(key)]))
      if (keys && typeof keys === "object") {
        return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [
          key,
          values.has(key) ? values.get(key) : fallback,
        ]))
      }
      return Object.fromEntries(values.entries())
    },
    async remove(keys: string | string[]) {
      for (const key of Array.isArray(keys) ? keys : [keys])
        values.delete(key)
    },
    async set(items: Record<string, unknown>) {
      for (const [key, value] of Object.entries(items))
        values.set(key, value)
    },
  }
}

function createLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
  }
}

describe("background pdf tab session tracker", () => {
  it("returns and stores the active PDF tab session", async () => {
    const activeTab = {
      id: 12,
      windowId: 34,
      title: "Quarterly report",
      url: "https://example.com/report.pdf",
    }
    const storageSession = createStorageSession()
    const sidePanel = {
      setOptions: vi.fn().mockResolvedValue(undefined),
    }
    const messageHandlers = new Map<string, () => Promise<unknown>>()

    setupPdfTabSessionTracker({
      extensionBrowser: {
        storage: { session: storageSession },
        tabs: {
          query: vi.fn().mockResolvedValue([activeTab]),
          get: vi.fn(),
          onActivated: { addListener: vi.fn() },
          onUpdated: { addListener: vi.fn() },
        },
        sidePanel,
      } as any,
      logger: createLogger(),
      registerMessageHandler: ((type: string, handler: () => Promise<unknown>) => {
        messageHandlers.set(type, handler)
      }) as any,
    })

    const session = await messageHandlers.get("getActivePdfTabSession")?.()

    expect(session).toMatchObject({
      tabId: 12,
      windowId: 34,
      title: "Quarterly report",
      sourceUrl: "https://example.com/report.pdf",
      sourceKind: "remote-url",
      status: "detected",
    })
    expect(sidePanel.setOptions).toHaveBeenCalledWith({
      tabId: 12,
      path: "sidepanel.html",
      enabled: true,
    })
  })

  it("does not prepare the side panel for a non-PDF active tab", async () => {
    const storageSession = createStorageSession()
    const sidePanel = {
      setOptions: vi.fn().mockResolvedValue(undefined),
    }
    const messageHandlers = new Map<string, () => Promise<unknown>>()

    setupPdfTabSessionTracker({
      extensionBrowser: {
        storage: { session: storageSession },
        tabs: {
          query: vi.fn().mockResolvedValue([{ id: 12, windowId: 34, url: "https://example.com/" }]),
          get: vi.fn(),
          onActivated: { addListener: vi.fn() },
          onUpdated: { addListener: vi.fn() },
        },
        sidePanel,
      } as any,
      logger: createLogger(),
      registerMessageHandler: ((type: string, handler: () => Promise<unknown>) => {
        messageHandlers.set(type, handler)
      }) as any,
    })

    await expect(messageHandlers.get("getActivePdfTabSession")?.()).resolves.toBeNull()
    expect(sidePanel.setOptions).not.toHaveBeenCalled()
  })
})
