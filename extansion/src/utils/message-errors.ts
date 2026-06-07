import { logger } from "./logger"

const MISSING_MESSAGE_RECEIVER_PATTERNS = [
  "Could not establish connection",
  "Receiving end does not exist",
  "No response",
]

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function isMissingMessageReceiverError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return MISSING_MESSAGE_RECEIVER_PATTERNS.some(pattern => message.includes(pattern))
}

export function logOptionalMessageError(message: string, error: unknown): void {
  if (isMissingMessageReceiverError(error)) {
    return
  }

  logger.warn(message, error)
}

export function handleOptionalMessage(result: unknown, message: string): void {
  void Promise.resolve(result)
    .catch(error => logOptionalMessageError(message, error))
}
