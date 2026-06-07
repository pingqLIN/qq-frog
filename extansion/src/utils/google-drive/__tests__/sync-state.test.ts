import { describe, expect, it, vi } from "vitest"
import { clearLastSyncConfigAndMeta } from "@/utils/config/sync"
import { clearAccessToken } from "../auth"
import { clearGoogleDriveSyncState } from "../sync-state"

vi.mock("@/utils/config/sync", () => ({
  clearLastSyncConfigAndMeta: vi.fn(),
}))

vi.mock("../auth", () => ({
  clearAccessToken: vi.fn(),
}))

describe("clearGoogleDriveSyncState", () => {
  it("clears OAuth token and last-synced metadata together", async () => {
    await clearGoogleDriveSyncState()

    expect(clearAccessToken).toHaveBeenCalledTimes(1)
    expect(clearLastSyncConfigAndMeta).toHaveBeenCalledTimes(1)
  })
})
