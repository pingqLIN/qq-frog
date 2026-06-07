import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing"

const mocks = vi.hoisted(() => {
  const storageItems = new Map<string, unknown>()
  return {
    env: {
      WXT_GOOGLE_CLIENT_ID: "test-google-client-id",
    },
    storageItems,
    storage: {
      getItem: vi.fn(async (key: string) => storageItems.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: unknown) => {
        storageItems.set(key, value)
      }),
      removeItem: vi.fn(async (key: string) => {
        storageItems.delete(key)
      }),
    },
  }
})

vi.mock("@/env", () => ({
  env: mocks.env,
}))

vi.mock("wxt/browser", () => ({
  browser: fakeBrowser,
}))

vi.mock("wxt/utils/storage", () => ({
  storage: mocks.storage,
}))

describe("google drive auth", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fakeBrowser.reset()
    mocks.storageItems.clear()
    mocks.storage.getItem.mockClear()
    mocks.storage.setItem.mockClear()
    mocks.storage.removeItem.mockClear()
  })

  it("uses Chrome extension identity when getAuthToken is available", async () => {
    const getAuthToken = vi.fn((_details, callback: (token: string) => void) => {
      callback("native-token")
    })
    const removeCachedAuthToken = vi.fn()

    vi.stubGlobal("chrome", {
      identity: {
        getAuthToken,
        removeCachedAuthToken,
      },
    })

    const { authenticateGoogleDriveAndSaveTokenToStorage, clearAccessToken } = await import("../auth")

    await expect(authenticateGoogleDriveAndSaveTokenToStorage()).resolves.toBe("native-token")

    expect(getAuthToken).toHaveBeenCalledWith(
      expect.objectContaining({
        interactive: true,
        scopes: [
          "https://www.googleapis.com/auth/drive.appdata",
          "https://www.googleapis.com/auth/userinfo.email",
        ],
      }),
      expect.any(Function),
    )
    expect(mocks.storage.setItem).toHaveBeenCalledWith(
      "local:__googleDriveToken",
      expect.objectContaining({ access_token: "native-token" }),
    )

    await clearAccessToken()

    expect(removeCachedAuthToken).toHaveBeenCalledWith({ token: "native-token" })
    expect(mocks.storage.removeItem).toHaveBeenCalledWith("local:__googleDriveToken")
  })

  it("falls back to launchWebAuthFlow when native extension identity is unavailable", async () => {
    const launchWebAuthFlow = vi.spyOn(fakeBrowser.identity, "launchWebAuthFlow").mockResolvedValue(
      "https://mock-extension.chromiumapp.org/#access_token=web-flow-token&token_type=Bearer&expires_in=3600",
    )

    const { authenticateGoogleDriveAndSaveTokenToStorage } = await import("../auth")

    await expect(authenticateGoogleDriveAndSaveTokenToStorage()).resolves.toBe("web-flow-token")

    expect(launchWebAuthFlow).toHaveBeenCalledWith({
      interactive: true,
      url: expect.stringContaining("response_type=token"),
    })
    expect(mocks.storage.setItem).toHaveBeenCalledWith(
      "local:__googleDriveToken",
      expect.objectContaining({ access_token: "web-flow-token" }),
    )
  })
})
