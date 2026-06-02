import { describe, expect, it } from "vitest"
import { escapeDriveQueryStringLiteral } from "../api"

describe("google Drive API helpers", () => {
  it("escapes Drive query string literals", () => {
    expect(escapeDriveQueryStringLiteral("qq-frog-config.json")).toBe("qq-frog-config.json")
    expect(escapeDriveQueryStringLiteral("qq'frog\\config.json")).toBe("qq\\'frog\\\\config.json")
  })
})
