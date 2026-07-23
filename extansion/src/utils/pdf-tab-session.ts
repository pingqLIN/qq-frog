export const ACTIVE_PDF_TAB_SESSION_KEY = "pdfTranslation.activeTabSession"
const PDF_TAB_SESSION_KEY_PREFIX = "pdfTranslation.tabSession."
const PDF_TRANSLATION_RESULT_DB_NAME = "qq-frog-pdf-translation-results"
const PDF_TRANSLATION_RESULT_STORE = "results"
const PDF_TRANSLATION_RESULT_DB_VERSION = 1
const PDF_TRANSLATION_RESULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

export type PdfTabSourceKind = "file-url" | "remote-url" | "chrome-pdf-viewer"
export type PdfTabSessionStatus = "detected" | "loaded" | "translating" | "complete" | "failed"

export interface PdfDetectedSource {
  sourceUrl: string
  sourceKind: PdfTabSourceKind
}

export interface PdfTabLike {
  id?: number
  windowId?: number
  pendingUrl?: string
  title?: string
  url?: string
}

export interface PdfTabSession {
  sessionId: string
  tabId: number
  windowId: number
  sourceUrl: string
  sourceKind: PdfTabSourceKind
  originalUrl: string
  title?: string
  detectedAt: number
  status: PdfTabSessionStatus
}

export interface PdfTranslationResultRecord {
  id: string
  sessionId?: string
  sourceUrl?: string
  sourceTitle?: string
  sourceFileName: string
  downloadFileName: string
  targetLanguage: string
  markdown: string
  createdAt: number
}

interface ExtensionStorageArea {
  get: (keys?: string | string[] | Record<string, unknown> | null) => Promise<Record<string, unknown>>
  remove: (keys: string | string[]) => Promise<void>
  set: (items: Record<string, unknown>) => Promise<void>
}

function hasPdfPath(url: URL) {
  const path = decodeURIComponent(url.pathname).toLowerCase()
  return path.endsWith(".pdf")
}

function getChromeViewerSourceUrl(url: URL) {
  const candidates = [
    url.searchParams.get("src"),
    url.searchParams.get("file"),
    url.searchParams.get("url"),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const decoded = decodeURIComponent(candidate!)
      const parsed = new URL(decoded)
      if (isSupportedPdfUrl(parsed))
        return decoded
    }
    catch {}
  }

  return null
}

function isSupportedPdfUrl(url: URL) {
  return ["file:", "http:", "https:"].includes(url.protocol) && hasPdfPath(url)
}

export function detectPdfSourceFromUrl(value: string | undefined): PdfDetectedSource | null {
  if (!value)
    return null

  try {
    const url = new URL(value)
    if (url.protocol === "file:" && hasPdfPath(url)) {
      return {
        sourceUrl: url.toString(),
        sourceKind: "file-url",
      }
    }

    if ((url.protocol === "http:" || url.protocol === "https:") && hasPdfPath(url)) {
      return {
        sourceUrl: url.toString(),
        sourceKind: "remote-url",
      }
    }

    if (url.protocol === "chrome-extension:" || url.protocol === "chrome:") {
      const sourceUrl = getChromeViewerSourceUrl(url)
      if (sourceUrl) {
        return {
          sourceUrl,
          sourceKind: "chrome-pdf-viewer",
        }
      }
    }
  }
  catch {}

  return null
}

export function createPdfTabSessionFromTab(tab: PdfTabLike, detectedAt = Date.now()): PdfTabSession | null {
  if (typeof tab.id !== "number" || typeof tab.windowId !== "number")
    return null

  const originalUrl = tab.url || tab.pendingUrl
  const detectedSource = detectPdfSourceFromUrl(originalUrl)
  if (!detectedSource || !originalUrl)
    return null

  return {
    sessionId: `${tab.id}-${detectedAt}`,
    tabId: tab.id,
    windowId: tab.windowId,
    originalUrl,
    sourceUrl: detectedSource.sourceUrl,
    sourceKind: detectedSource.sourceKind,
    title: tab.title,
    detectedAt,
    status: "detected",
  }
}

export async function getActivePdfTabSession(storageArea: ExtensionStorageArea) {
  const values = await storageArea.get(ACTIVE_PDF_TAB_SESSION_KEY)
  const session = values[ACTIVE_PDF_TAB_SESSION_KEY]
  return isPdfTabSession(session) ? session : null
}

export async function setActivePdfTabSession(storageArea: ExtensionStorageArea, session: PdfTabSession) {
  await storageArea.set({
    [ACTIVE_PDF_TAB_SESSION_KEY]: session,
    [getPdfTabSessionStorageKey(session.tabId)]: session,
  })
}

export async function clearActivePdfTabSession(storageArea: ExtensionStorageArea) {
  await storageArea.remove(ACTIVE_PDF_TAB_SESSION_KEY)
}

export async function getPdfTabSession(storageArea: ExtensionStorageArea, tabId: number) {
  const values = await storageArea.get(getPdfTabSessionStorageKey(tabId))
  const session = values[getPdfTabSessionStorageKey(tabId)]
  return isPdfTabSession(session) ? session : null
}

export async function clearPdfTabSession(storageArea: ExtensionStorageArea, tabId: number) {
  const activeSession = await getActivePdfTabSession(storageArea)
  await storageArea.remove(getPdfTabSessionStorageKey(tabId))
  if (activeSession?.tabId === tabId)
    await clearActivePdfTabSession(storageArea)
}

export function getPdfTabSessionStorageKey(tabId: number) {
  return `${PDF_TAB_SESSION_KEY_PREFIX}${tabId}`
}

export function createPdfTranslationResultId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID()

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function savePdfTranslationResult(result: PdfTranslationResultRecord) {
  const database = await openPdfTranslationResultDatabase()
  try {
    await runResultStoreTransaction(database, "readwrite", store => store.put(result))
    await deleteExpiredPdfTranslationResults(database, Date.now() - PDF_TRANSLATION_RESULT_MAX_AGE_MS)
  }
  finally {
    database.close()
  }
}

export async function getPdfTranslationResult(id: string) {
  const database = await openPdfTranslationResultDatabase()
  try {
    const result = await runResultStoreTransaction(database, "readonly", store => store.get(id))
    return isPdfTranslationResultRecord(result) ? result : null
  }
  finally {
    database.close()
  }
}

function isPdfTabSession(value: unknown): value is PdfTabSession {
  return Boolean(
    value
    && typeof value === "object"
    && "sessionId" in value
    && typeof value.sessionId === "string"
    && "tabId" in value
    && typeof value.tabId === "number"
    && "windowId" in value
    && typeof value.windowId === "number"
    && "sourceUrl" in value
    && typeof value.sourceUrl === "string",
  )
}

function isPdfTranslationResultRecord(value: unknown): value is PdfTranslationResultRecord {
  return Boolean(
    value
    && typeof value === "object"
    && "id" in value
    && typeof value.id === "string"
    && "markdown" in value
    && typeof value.markdown === "string"
    && "downloadFileName" in value
    && typeof value.downloadFileName === "string",
  )
}

function openPdfTranslationResultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDF_TRANSLATION_RESULT_DB_NAME, PDF_TRANSLATION_RESULT_DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(PDF_TRANSLATION_RESULT_STORE)) {
        const store = database.createObjectStore(PDF_TRANSLATION_RESULT_STORE, { keyPath: "id" })
        store.createIndex("createdAt", "createdAt")
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Failed to open PDF translation result database."))
  })
}

function runResultStoreTransaction<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PDF_TRANSLATION_RESULT_STORE, mode)
    const request = operation(transaction.objectStore(PDF_TRANSLATION_RESULT_STORE))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("PDF translation result database request failed."))
    transaction.onerror = () => reject(transaction.error ?? new Error("PDF translation result database transaction failed."))
  })
}

function deleteExpiredPdfTranslationResults(database: IDBDatabase, olderThan: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PDF_TRANSLATION_RESULT_STORE, "readwrite")
    const store = transaction.objectStore(PDF_TRANSLATION_RESULT_STORE)
    const index = store.index("createdAt")
    const request = index.openCursor(IDBKeyRange.upperBound(olderThan))

    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor)
        return

      cursor.delete()
      cursor.continue()
    }
    request.onerror = () => reject(request.error ?? new Error("Failed to clean up PDF translation results."))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error("PDF translation result cleanup failed."))
  })
}
