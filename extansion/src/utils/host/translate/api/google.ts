import { attachRequestErrorMeta } from "@/utils/request/retry-policy"

const GOOGLE_TRANSLATE_HTML_URL = "https://translate-pa.googleapis.com/v1/translateHtml"
const GOOGLE_TRANSLATE_HTML_API_KEY = "AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520"
const GOOGLE_TRANSLATE_HTML_CLIENT = "wt_lib"
export const GOOGLE_TRANSLATE_MAX_CHARS_PER_REQUEST = 4000

const GOOGLE_TRANSLATE_BREAKPOINTS = [
  "\n\n",
  "\n",
  ". ",
  "! ",
  "? ",
  "; ",
  "。",
  "！",
  "？",
  "；",
  " ",
]

export function splitGoogleTranslateText(
  sourceText: string,
  maxChars = GOOGLE_TRANSLATE_MAX_CHARS_PER_REQUEST,
): string[] {
  if (sourceText.length <= maxChars) {
    return [sourceText]
  }

  const chunks: string[] = []
  let rest = sourceText

  while (rest.length > maxChars) {
    const windowText = rest.slice(0, maxChars)
    const minimumUsefulBreak = Math.floor(maxChars * 0.6)
    let splitAt = -1

    for (const breakpoint of GOOGLE_TRANSLATE_BREAKPOINTS) {
      const index = windowText.lastIndexOf(breakpoint)
      if (index >= minimumUsefulBreak) {
        splitAt = index + breakpoint.length
        break
      }
    }

    if (splitAt <= 0) {
      splitAt = maxChars
    }

    chunks.push(rest.slice(0, splitAt))
    rest = rest.slice(splitAt)
  }

  if (rest) {
    chunks.push(rest)
  }

  return chunks
}

export async function googleTranslate(
  sourceText: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  const chunks = splitGoogleTranslateText(sourceText)
  if (chunks.length > 1) {
    const translatedChunks: string[] = []
    for (const chunk of chunks) {
      translatedChunks.push(await googleTranslateSingle(chunk, fromLang, toLang))
    }
    return translatedChunks.join("")
  }

  return googleTranslateSingle(sourceText, fromLang, toLang)
}

async function googleTranslateSingle(
  sourceText: string,
  fromLang: string,
  toLang: string,
): Promise<string> {
  const resp = await fetch(
    GOOGLE_TRANSLATE_HTML_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json+protobuf",
        "X-Goog-API-Key": GOOGLE_TRANSLATE_HTML_API_KEY,
      },
      body: JSON.stringify([
        [[sourceText], fromLang, toLang],
        GOOGLE_TRANSLATE_HTML_CLIENT,
      ]),
    },
  ).catch((error) => {
    throw attachRequestErrorMeta(
      new Error(`Network error during translation: ${error.message}`),
      { kind: "network", isRetryable: true },
    )
  })

  if (!resp.ok) {
    const errorText = await resp
      .text()
      .catch(() => "Unable to read error response")
    throw attachRequestErrorMeta(
      new Error(`Translation request failed: ${resp.status} ${resp.statusText}${
        errorText ? ` - ${errorText}` : ""
      }`),
      {
        statusCode: resp.status,
        responseHeaders: resp.headers,
      },
    )
  }

  try {
    const result = await resp.json()

    if (!Array.isArray(result) || !Array.isArray(result[0]) || typeof result[0][0] !== "string") {
      throw new TypeError("Unexpected response format from translation API")
    }

    return result[0][0]
  }
  catch (error) {
    throw new Error(
      `Failed to parse translation response: ${(error as Error).message}`,
    )
  }
}
