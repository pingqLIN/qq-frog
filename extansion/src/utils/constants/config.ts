import type { Config } from "@/types/config/config"
import type { FloatingButtonSide } from "@/types/config/floating-button"
import type { PageTranslateRange } from "@/types/config/translate"
import defaultConfigSeed from "./default-config.seed.json"

export const CONFIG_STORAGE_KEY = "config"
export const LAST_SYNCED_CONFIG_STORAGE_KEY = "lastSyncedConfig"
export const GOOGLE_DRIVE_TOKEN_STORAGE_KEY = "__googleDriveToken"

export const THEME_STORAGE_KEY = "theme"
export const DEFAULT_DETECTED_CODE = "eng" as const
export const CONFIG_SCHEMA_VERSION = 73

export const DEFAULT_FLOATING_BUTTON_POSITION = 0.66
export const DEFAULT_FLOATING_BUTTON_SIDE: FloatingButtonSide = "right"

export const DEFAULT_CONFIG = defaultConfigSeed as Config

export const PAGE_TRANSLATE_RANGE_ITEMS: Record<
  PageTranslateRange,
  { label: string }
> = {
  main: { label: "Main" },
  all: { label: "All" },
}
