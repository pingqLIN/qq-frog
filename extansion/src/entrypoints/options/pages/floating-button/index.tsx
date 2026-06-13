import { i18n } from "@/utils/i18n"
import { PageLayout } from "../../components/page-layout"
import { FloatingButtonClickAction } from "./floating-button-click-action"
import { FloatingButtonDisabledSites } from "./floating-button-disabled-sites"
import { FloatingButtonGlobalToggle } from "./floating-button-global-toggle"

export function FloatingButtonPage() {
  return (
    <PageLayout title={i18n.t("options.overlayTools.floatingButton.title")}>
      <div className="*:border-b [&>*:last-child]:border-b-0">
        <FloatingButtonGlobalToggle />
        <FloatingButtonClickAction />
        <FloatingButtonDisabledSites />
      </div>
    </PageLayout>
  )
}
