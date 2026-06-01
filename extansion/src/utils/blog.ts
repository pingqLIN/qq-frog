import { browser, storage } from "#imports"

const LAST_VIEWED_BLOG_DATE_KEY = "lastViewedBlogDate"
const DEFAULT_BLOG_LOCALE = "en"

export type BlogLocale = "en" | "zh"

export interface LatestBlogPost {
  date: Date
  title: string
  description: string
  url: string
  videoUrl?: string
  extensionVersion?: string
}

export async function saveLastViewedBlogDate(date: Date): Promise<void> {
  await storage.setItem(`local:${LAST_VIEWED_BLOG_DATE_KEY}`, date.toISOString())
}

export async function getLastViewedBlogDate(): Promise<Date | null> {
  const dateStr = await storage.getItem<string>(`local:${LAST_VIEWED_BLOG_DATE_KEY}`)
  return dateStr ? new Date(dateStr) : null
}

export function hasNewBlogPost(
  latestViewedDate: Date | null,
  latestDate: Date | null,
): boolean {
  if (!latestDate)
    return false

  if (!latestViewedDate)
    return true
  return latestDate > latestViewedDate
}

export function extractBilibiliVideoId(_url?: string): string | null {
  return null
}

export function buildBilibiliEmbedUrl(_url?: string): string | null {
  return null
}

export function resolveBlogLocale(uiLocale?: string | null): BlogLocale {
  const normalizedLocale = uiLocale?.trim().toLowerCase()
  return normalizedLocale?.startsWith("zh") ? "zh" : DEFAULT_BLOG_LOCALE
}

export function getBlogLocaleFromUILanguage(): BlogLocale {
  const uiLocale = browser.i18n.getUILanguage?.()
    || browser.i18n.getMessage?.("@@ui_locale")
    || globalThis.navigator?.language
    || DEFAULT_BLOG_LOCALE

  return resolveBlogLocale(uiLocale)
}

export async function getLatestBlogDate(
  _apiUrl?: string,
  _locale?: string,
  _extensionVersion?: string,
  _useCache?: boolean,
): Promise<LatestBlogPost | null> {
  return null
}
