import { describe, expect, it } from "vitest"
import { isExtensionContextInvalidatedError } from "../extension-context"

describe("isExtensionContextInvalidatedError", () => {
  it("detects Chrome extension context invalidation errors", () => {
    expect(isExtensionContextInvalidatedError(
      new Error("Extension context invalidated."),
    )).toBe(true)
  })

  it("detects alternate browser wording", () => {
    expect(isExtensionContextInvalidatedError(
      "Extension context was invalidated.",
    )).toBe(true)
  })

  it("detects WXT storage runtime unavailability errors", () => {
    expect(isExtensionContextInvalidatedError(
      new Error("'wxt/storage' must be loaded in a web extension environment"),
    )).toBe(true)
  })

  it("does not hide unrelated runtime errors", () => {
    expect(isExtensionContextInvalidatedError(
      new Error("Could not establish connection. Receiving end does not exist."),
    )).toBe(false)
  })
})
