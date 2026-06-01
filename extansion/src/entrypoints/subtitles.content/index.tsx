import "@/utils/zod-config"
import { defineContentScript } from "#imports"
import { getLocalConfig } from "@/utils/config/storage"
import { isExtensionContextInvalidatedError } from "@/utils/extension-context"

declare global {
  interface Window {
    __READ_FROG_SUBTITLES_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*.youtube.com/*", "*://*.youtube-nocookie.com/*"],
  allFrames: true,
  cssInjectionMode: "manifest",
  async main(ctx) {
    if (window.__READ_FROG_SUBTITLES_INJECTED__)
      return
    window.__READ_FROG_SUBTITLES_INJECTED__ = true

    try {
      const config = await getLocalConfig()
      if (!config?.videoSubtitles?.enabled) {
        window.__READ_FROG_SUBTITLES_INJECTED__ = false
        return
      }

      ctx.onInvalidated(() => {
        window.__READ_FROG_SUBTITLES_INJECTED__ = false
      })

      const { bootstrapSubtitlesRuntime } = await import("./runtime")
      await bootstrapSubtitlesRuntime()
    }
    catch (error) {
      window.__READ_FROG_SUBTITLES_INJECTED__ = false

      if (isExtensionContextInvalidatedError(error))
        return

      throw error
    }
  },
})
