import "@/utils/zod-config"
import { defineContentScript } from "#imports"
import { getLocalConfig } from "@/utils/config/storage"
import { isExtensionContextInvalidatedError } from "@/utils/extension-context"
import { clearEffectiveSiteControlUrl, getEffectiveSiteControlUrl, isSiteEnabled } from "@/utils/site-control"

declare global {
  interface Window {
    __READ_FROG_HOST_INJECTED__?: boolean
  }
}

export default defineContentScript({
  matches: ["*://*/*", "file:///*"],
  cssInjectionMode: "manual",
  async main(ctx) {
    // Prevent double injection (manifest-based + programmatic injection)
    if (window.__READ_FROG_HOST_INJECTED__)
      return
    window.__READ_FROG_HOST_INJECTED__ = true

    try {
      const initialConfig = await getLocalConfig()
      const siteControlUrl = getEffectiveSiteControlUrl(window.location.href)

      if (!isSiteEnabled(siteControlUrl, initialConfig)) {
        window.__READ_FROG_HOST_INJECTED__ = false
        clearEffectiveSiteControlUrl()
        return
      }

      const { bootstrapHostContent } = await import("./runtime")
      await bootstrapHostContent(ctx, initialConfig)
    }
    catch (error) {
      window.__READ_FROG_HOST_INJECTED__ = false
      clearEffectiveSiteControlUrl()

      if (isExtensionContextInvalidatedError(error))
        return

      throw error
    }
  },
})
