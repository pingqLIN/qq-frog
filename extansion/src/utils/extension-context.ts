const EXTENSION_CONTEXT_INVALIDATED_PATTERNS = [
  "Extension context invalidated",
  "Extension context was invalidated",
]

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return [
      error.name,
      error.message,
      error.stack,
    ].filter(Boolean).join("\n")
  }

  return String(error)
}

export function isExtensionContextInvalidatedError(error: unknown): boolean {
  const errorText = getErrorText(error)
  return EXTENSION_CONTEXT_INVALIDATED_PATTERNS.some(pattern => errorText.includes(pattern))
}
