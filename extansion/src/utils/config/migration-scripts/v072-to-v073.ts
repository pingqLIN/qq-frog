/**
 * Migration script from v072 to v073
 * - Adds PDF translation settings for the local PaddleOCR service workflow.
 *
 * IMPORTANT: All values are hardcoded inline. Migration scripts are frozen
 * snapshots — never import constants or helpers that may change.
 */
export function migrate(oldConfig: any): any {
  return {
    ...oldConfig,
    pdfTranslation: {
      enabled: false,
      serviceUrl: "http://localhost:8001",
      provider: "chrome-gemini",
      outputMode: "bilingual-markdown",
      ...oldConfig?.pdfTranslation,
    },
  }
}
