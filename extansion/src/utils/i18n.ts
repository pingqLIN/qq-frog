import { browser, i18n as browserI18n } from "#imports"
import { z } from "zod"
import { storageAdapter } from "./atoms/storage-adapter"

export const APP_LOCALE_STORAGE_KEY = "appLocale"

export const appLocaleSchema = z.enum(["system", "en", "zh_TW", "zh_CN"])

export type AppLocale = z.infer<typeof appLocaleSchema>

type RuntimeLocale = Exclude<AppLocale, "system">
interface ChromeMessage { message?: string }
type ChromeMessages = Record<string, ChromeMessage>
type LocaleChangeListener = () => void
type I18nSubstitution = string | number
type GetNativeMessage = (messageName: string, substitutions?: string | string[]) => string

const DEFAULT_APP_LOCALE: AppLocale = "system"
const DEFAULT_RUNTIME_LOCALE: RuntimeLocale = "en"
const SUPPORTED_RUNTIME_LOCALES = ["en", "zh_TW", "zh_CN"] as const

let currentLocale: AppLocale = DEFAULT_APP_LOCALE
let activeRuntimeLocale: RuntimeLocale = DEFAULT_RUNTIME_LOCALE
let activeMessages: ChromeMessages | null = null
const localeMessagesCache = new Map<RuntimeLocale, ChromeMessages>()
const listeners = new Set<LocaleChangeListener>()

function normalizeLocale(locale: string | undefined): string {
  return locale?.replace("-", "_").toLowerCase() ?? ""
}

function resolveSystemRuntimeLocale(): RuntimeLocale {
  const candidates = [
    browser.i18n.getUILanguage?.(),
    browserI18n.t("@@ui_locale"),
    globalThis.navigator?.language,
    ...Array.from(globalThis.navigator?.languages ?? []),
  ]

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate)
    if (!normalized)
      continue

    if (normalized === "zh_tw" || normalized === "zh_hant" || normalized.includes("hant"))
      return "zh_TW"
    if (normalized === "zh_cn" || normalized === "zh_hans" || normalized.includes("hans"))
      return "zh_CN"
    if (normalized.startsWith("zh"))
      return "zh_TW"
    if (normalized.startsWith("en"))
      return "en"
  }

  return DEFAULT_RUNTIME_LOCALE
}

function resolveRuntimeLocale(locale: AppLocale): RuntimeLocale {
  if (locale === "system")
    return resolveSystemRuntimeLocale()
  return locale
}

function formatMessage(message: string, substitutions?: I18nSubstitution[]): string {
  if (!substitutions?.length)
    return message

  let formattedMessage = message
  substitutions.forEach((substitution, index) => {
    formattedMessage = formattedMessage.replaceAll(`$${index + 1}`, String(substitution))
  })
  return formattedMessage
}

async function loadLocaleMessages(locale: RuntimeLocale): Promise<ChromeMessages | null> {
  if (localeMessagesCache.has(locale))
    return localeMessagesCache.get(locale) ?? null

  try {
    const getRuntimeUrl = browser.runtime.getURL as (path: string) => string
    const response = await fetch(getRuntimeUrl(`/_locales/${locale}/messages.json`))
    if (!response.ok)
      return null

    const messages = await response.json() as ChromeMessages
    localeMessagesCache.set(locale, messages)
    return messages
  }
  catch {
    return null
  }
}

function notifyLocaleChange() {
  listeners.forEach(listener => listener())
}

export async function setAppLocale(locale: AppLocale): Promise<void> {
  currentLocale = locale
  activeRuntimeLocale = resolveRuntimeLocale(locale)
  activeMessages = await loadLocaleMessages(activeRuntimeLocale)
  await storageAdapter.set(APP_LOCALE_STORAGE_KEY, locale, appLocaleSchema)
  notifyLocaleChange()
}

export async function initAppLocale(): Promise<AppLocale> {
  currentLocale = await storageAdapter.get(APP_LOCALE_STORAGE_KEY, DEFAULT_APP_LOCALE, appLocaleSchema)
  activeRuntimeLocale = resolveRuntimeLocale(currentLocale)
  activeMessages = await loadLocaleMessages(activeRuntimeLocale)
  return currentLocale
}

export function getAppLocale(): AppLocale {
  return currentLocale
}

export function getActiveRuntimeLocale(): RuntimeLocale {
  return activeRuntimeLocale
}

export function subscribeAppLocale(listener: LocaleChangeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const APP_LOCALE_OPTIONS: Array<{ value: AppLocale, labelKey: string }> = [
  { value: "system", labelKey: "options.general.appLanguage.options.system" },
  { value: "zh_TW", labelKey: "options.general.appLanguage.options.zhTW" },
  { value: "zh_CN", labelKey: "options.general.appLanguage.options.zhCN" },
  { value: "en", labelKey: "options.general.appLanguage.options.en" },
]

export const i18n = {
  t(key: string, ...args: Array<number | I18nSubstitution[] | null | undefined>) {
    let substitutions: I18nSubstitution[] | undefined
    let count: number | undefined

    args.forEach((arg) => {
      if (arg == null)
        return
      if (typeof arg === "number")
        count = arg
      else if (Array.isArray(arg))
        substitutions = arg
      else
        throw new Error("Unknown i18n argument. Expected number or substitution array.")
    })

    if (count != null && substitutions == null)
      substitutions = [String(count)]

    const messageName = key.replaceAll(".", "_")
    const customMessage = activeMessages?.[messageName]?.message
    const getNativeMessage = browser.i18n.getMessage as GetNativeMessage
    const nativeMessage = getNativeMessage(messageName, substitutions?.map(String))
    const message = customMessage
      ? formatMessage(customMessage, substitutions)
      : nativeMessage || key

    if (count == null)
      return message

    const plural = message.split(" | ")
    switch (plural.length) {
      case 1:
        return plural[0]
      case 2:
        return plural[count === 1 ? 0 : 1]
      case 3:
        return plural[count === 0 || count === 1 ? count : 2]
      default:
        return message
    }
  },
  supportedLocales: SUPPORTED_RUNTIME_LOCALES,
}
