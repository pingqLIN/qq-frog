import { describe, expect, it } from "vitest"
import { z } from "zod"
import {
  createExtensionClientEnvSchema,
  LOCAL_EXTENSION_ENV_DEFAULTS,
  PRODUCTION_EXTENSION_ENV_DEFAULTS,
  resolveExtensionEnv,
} from "../shared"

const PRODUCTION_REQUIRED_ENV = {
  WXT_GOOGLE_CLIENT_ID: "test-google-client-id",
} as const

function parseResolvedExtensionEnv(
  rawEnv: Record<string, string | boolean | undefined>,
  isProd = false,
  skipRequiredProductionEnv = false,
) {
  return z.object(createExtensionClientEnvSchema(isProd, skipRequiredProductionEnv)).parse(resolveExtensionEnv(rawEnv))
}

describe("extension env resolution", () => {
  it("uses production defaults when local packages are disabled", () => {
    expect(resolveExtensionEnv({})).toEqual(PRODUCTION_EXTENSION_ENV_DEFAULTS)
    expect(resolveExtensionEnv({
      WXT_USE_LOCAL_PACKAGES: "false",
    })).toMatchObject({
      ...PRODUCTION_EXTENSION_ENV_DEFAULTS,
      WXT_USE_LOCAL_PACKAGES: "false",
    })
  })

  it("uses localhost defaults when local packages are enabled", () => {
    expect(resolveExtensionEnv({
      WXT_USE_LOCAL_PACKAGES: "true",
    })).toMatchObject({
      ...LOCAL_EXTENSION_ENV_DEFAULTS,
      WXT_USE_LOCAL_PACKAGES: "true",
    })
  })

  it("lets explicit env vars override the selected defaults", () => {
    expect(resolveExtensionEnv({
      WXT_USE_LOCAL_PACKAGES: "true",
      WXT_API_URL: "https://api.example.test",
      WXT_AUTH_COOKIE_DOMAINS: "example.test",
    })).toMatchObject({
      ...LOCAL_EXTENSION_ENV_DEFAULTS,
      WXT_USE_LOCAL_PACKAGES: "true",
      WXT_API_URL: "https://api.example.test",
      WXT_AUTH_COOKIE_DOMAINS: "example.test",
    })
  })

  it("passes through unrelated env vars untouched", () => {
    expect(resolveExtensionEnv({
      WXT_WEBSITE_URL: "https://www.example.test",
    })).toMatchObject({
      ...PRODUCTION_EXTENSION_ENV_DEFAULTS,
      WXT_WEBSITE_URL: "https://www.example.test",
    })
  })
})

describe("extension env parsing", () => {
  it("accepts canonical urls, origins, and cookie domains", () => {
    expect(parseResolvedExtensionEnv({
      WXT_WEBSITE_URL: "https://www.example.test",
      WXT_OFFICIAL_SITE_ORIGINS: "https://example.test,https://www.example.test",
      WXT_AUTH_COOKIE_DOMAINS: "example.test,localhost",
    })).toEqual({
      WXT_API_URL: PRODUCTION_EXTENSION_ENV_DEFAULTS.WXT_API_URL,
      WXT_WEBSITE_URL: "https://www.example.test",
      WXT_OFFICIAL_SITE_ORIGINS: ["https://example.test", "https://www.example.test"],
      WXT_AUTH_COOKIE_DOMAINS: ["example.test", "localhost"],
      WXT_GOOGLE_CLIENT_ID: undefined,
    })
  })

  it("rejects urls with trailing slashes", () => {
    expect(() => parseResolvedExtensionEnv({
      WXT_API_URL: "https://api.example.test/",
    })).toThrowError("must not end with a trailing slash")
  })

  it("rejects origin entries that include a trailing slash or path", () => {
    expect(() => parseResolvedExtensionEnv({
      WXT_OFFICIAL_SITE_ORIGINS: "https://example.test/,https://www.example.test",
    })).toThrowError("must be an origin without a trailing slash or path")

    expect(() => parseResolvedExtensionEnv({
      WXT_OFFICIAL_SITE_ORIGINS: "https://example.test/docs",
    })).toThrowError("must be an origin without a trailing slash or path")
  })

  it("rejects cookie domains with leading dots", () => {
    expect(() => parseResolvedExtensionEnv({
      WXT_AUTH_COOKIE_DOMAINS: ".example.test,localhost",
    })).toThrowError("must not start with '.'")
  })

  it("rejects comma-separated entries with spaces", () => {
    expect(() => parseResolvedExtensionEnv({
      WXT_OFFICIAL_SITE_ORIGINS: "https://example.test, https://www.example.test",
    })).toThrowError("must not include leading or trailing whitespace")
  })

  it("requires Google env var when PROD is true", () => {
    expect(() => parseResolvedExtensionEnv({}, true)).toThrowError("expected string, received undefined")
  })

  it("accepts Google env var when PROD is true", () => {
    expect(parseResolvedExtensionEnv({
      ...PRODUCTION_REQUIRED_ENV,
    }, true)).toEqual({
      WXT_API_URL: PRODUCTION_EXTENSION_ENV_DEFAULTS.WXT_API_URL,
      WXT_WEBSITE_URL: PRODUCTION_EXTENSION_ENV_DEFAULTS.WXT_WEBSITE_URL,
      WXT_OFFICIAL_SITE_ORIGINS: ["https://localhost:8877"],
      WXT_AUTH_COOKIE_DOMAINS: ["localhost"],
      WXT_GOOGLE_CLIENT_ID: PRODUCTION_REQUIRED_ENV.WXT_GOOGLE_CLIENT_ID,
    })
  })

  it("lets production parsing skip only the required Google env var", () => {
    expect(parseResolvedExtensionEnv({
      WXT_OFFICIAL_SITE_ORIGINS: "https://example.test,https://www.example.test",
    }, true, true)).toEqual({
      WXT_API_URL: PRODUCTION_EXTENSION_ENV_DEFAULTS.WXT_API_URL,
      WXT_WEBSITE_URL: PRODUCTION_EXTENSION_ENV_DEFAULTS.WXT_WEBSITE_URL,
      WXT_OFFICIAL_SITE_ORIGINS: ["https://example.test", "https://www.example.test"],
      WXT_AUTH_COOKIE_DOMAINS: ["localhost"],
      WXT_GOOGLE_CLIENT_ID: undefined,
    })
  })

  it("parses WXT_USE_LOCAL_PACKAGES strictly with zod stringbool", () => {
    expect(resolveExtensionEnv({
      WXT_USE_LOCAL_PACKAGES: true,
    })).toMatchObject({
      ...LOCAL_EXTENSION_ENV_DEFAULTS,
      WXT_USE_LOCAL_PACKAGES: true,
    })

    expect(() => resolveExtensionEnv({
      WXT_USE_LOCAL_PACKAGES: "yes",
    })).toThrowError()
  })
})
