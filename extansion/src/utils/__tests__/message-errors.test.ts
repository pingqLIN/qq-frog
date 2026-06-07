import { beforeEach, describe, expect, it, vi } from "vitest"
import { isMissingMessageReceiverError, logOptionalMessageError } from "../message-errors"

const { loggerWarnMock } = vi.hoisted(() => ({
  loggerWarnMock: vi.fn(),
}))

vi.mock("../logger", () => ({
  logger: {
    warn: loggerWarnMock,
  },
}))

describe("message error helpers", () => {
  beforeEach(() => {
    loggerWarnMock.mockClear()
  })

  it("detects missing extension message receivers", () => {
    expect(isMissingMessageReceiverError(
      new Error("Could not establish connection. Receiving end does not exist."),
    )).toBe(true)
  })

  it("does not warn when an optional receiver is missing", () => {
    logOptionalMessageError(
      "Failed to send optional message",
      new Error("Could not establish connection. Receiving end does not exist."),
    )

    expect(loggerWarnMock).not.toHaveBeenCalled()
  })

  it("warns for non-receiver errors", () => {
    const error = new Error("Unexpected failure")

    logOptionalMessageError("Failed to send optional message", error)

    expect(loggerWarnMock).toHaveBeenCalledWith("Failed to send optional message", error)
  })
})
