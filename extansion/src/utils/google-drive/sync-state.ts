import { clearLastSyncConfigAndMeta } from "../config/sync"
import { clearAccessToken } from "./auth"

export async function clearGoogleDriveSyncState(): Promise<void> {
  await Promise.all([
    clearAccessToken(),
    clearLastSyncConfigAndMeta(),
  ])
}
