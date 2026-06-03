import { browser } from "#imports"
import { Icon } from "@iconify/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/base-ui/dropdown-menu"
import { i18n } from "@/utils/i18n"
import { sendMessage } from "@/utils/message"

interface ChromiumSidePanelApi {
  open?: (options: { windowId: number }) => Promise<void> | void
}

async function openSidePanelFromPopup() {
  try {
    const currentWindow = await browser.windows.getCurrent()
    const windowId = currentWindow.id
    const globalWithChrome = globalThis as typeof globalThis & {
      chrome?: { sidePanel?: ChromiumSidePanelApi }
    }
    const chromeSidePanel = globalWithChrome.chrome?.sidePanel

    if (typeof windowId === "number" && typeof chromeSidePanel?.open === "function") {
      await chromeSidePanel.open({ windowId })
      return
    }
  }
  catch (error) {
    console.warn("Failed to open side panel directly from popup", error)
  }

  await sendMessage("toggleSidePanel", { source: "extension-user-action" })
}

export function MoreMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-300 dark:hover:bg-neutral-700"
          />
        )}
      >
        <Icon icon="tabler:dots" className="size-4" strokeWidth={1.6} />
        <span className="text-[13px] font-medium">{i18n.t("popup.more.title")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-fit">
        <DropdownMenuItem
          onClick={() => void browser.tabs.create({ url: browser.runtime.getURL("/translation-hub.html") })}
          className="cursor-pointer"
        >
          <Icon icon="tabler:language-hiragana" className="size-4" strokeWidth={1.6} />
          {i18n.t("popup.more.translationHub")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void openSidePanelFromPopup()}
          className="cursor-pointer"
        >
          <Icon icon="tabler:layout-sidebar-right" className="size-4" strokeWidth={1.6} />
          {i18n.t("popup.more.sidePanel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
