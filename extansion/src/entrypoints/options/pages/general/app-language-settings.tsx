import type { AppLocale } from "@/utils/i18n"
import { Icon } from "@iconify/react"
import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { APP_LOCALE_OPTIONS, getActiveRuntimeLocale, getAppLocale, i18n, setAppLocale, subscribeAppLocale } from "@/utils/i18n"
import { ConfigCard } from "../../components/config-card"

const LOCALE_ICON: Record<AppLocale, string> = {
  system: "tabler:device-desktop",
  en: "tabler:letter-e",
  zh_TW: "tabler:language",
  zh_CN: "tabler:language",
}

export function AppLanguageSettings() {
  const [locale, setLocale] = useState<AppLocale>(() => getAppLocale())
  const [version, setVersion] = useState(0)

  void version

  useEffect(() => {
    return subscribeAppLocale(() => {
      setLocale(getAppLocale())
      setVersion(version => version + 1)
    })
  }, [])

  const activeLocale = getActiveRuntimeLocale()

  return (
    <ConfigCard
      id="app-language"
      title={i18n.t("options.general.appLanguage.title")}
      description={i18n.t("options.general.appLanguage.description", [
        i18n.t(`options.general.appLanguage.runtime.${activeLocale}`),
      ])}
    >
      <div className="w-full flex justify-start md:justify-end">
        <Select
          value={locale}
          onValueChange={(value) => {
            void setAppLocale(value as AppLocale)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue render={<span />}>
              <span className="flex items-center gap-2">
                <Icon icon={LOCALE_ICON[locale]} className="size-4" />
                {i18n.t(APP_LOCALE_OPTIONS.find(option => option.value === locale)?.labelKey ?? "options.general.appLanguage.options.system")}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {APP_LOCALE_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <Icon icon={LOCALE_ICON[option.value]} className="size-4" />
                    {i18n.t(option.labelKey)}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </ConfigCard>
  )
}
