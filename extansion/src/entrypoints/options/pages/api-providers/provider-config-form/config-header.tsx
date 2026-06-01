import type { APIProviderTypes } from "@/types/config/provider"
import ProviderIcon from "@/components/provider-icon"
import { useTheme } from "@/components/providers/theme-provider"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"

export function ConfigHeader({ providerType }: { providerType: APIProviderTypes }) {
  const { theme } = useTheme()

  return (
    <div className="flex items-start justify-between">
      <a href={PROVIDER_ITEMS[providerType].website} className="flex items-center gap-2" target="_blank" rel="noreferrer">
        <ProviderIcon
          logo={PROVIDER_ITEMS[providerType].logo(theme)}
          name={PROVIDER_ITEMS[providerType].name}
          size="base"
          className="group hover:cursor-pointer"
          textClassName="font-medium group-hover:text-link"
        />
      </a>
    </div>
  )
}
