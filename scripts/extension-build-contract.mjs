import { access, readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"

export const BUILD_CONTRACT_VERSION = 1
export const REQUIRED_FEATURES = [
  "chrome-built-in-ai",
  "pdf-translation",
]

const REQUIRED_OUTPUT_FILES = [
  "manifest.json",
  "background.js",
  "devtools.html",
  "offscreen.html",
  "options.html",
  "pdf-result.html",
  "popup.html",
  "sidepanel.html",
  "translation-hub.html",
]

const SOURCE_ASSERTIONS = [
  {
    file: "extansion/src/types/config/provider/constants.ts",
    pattern: /API_PROVIDER_TYPES\s*=\s*\[[^\]]*["']chrome-ai["']/,
    message: "chrome-ai must remain an API provider",
  },
  {
    file: "extansion/src/utils/constants/providers.ts",
    pattern: /chromeBuiltInProviders\s*:\s*\{[\s\S]*?types:\s*\[\s*["']chrome-ai["']\s*\]/,
    message: "Chrome Built-in AI must remain visible in the provider dialog",
  },
  {
    file: "extansion/src/utils/host/translate/api/chrome-ai.ts",
    pattern: /LanguageModel/,
    message: "Chrome Built-in AI must retain its Prompt API adapter",
  },
  {
    file: "extansion/src/entrypoints/pdf-result/index.html",
    pattern: /<div\s+id=["']root["']/,
    message: "PDF translation must retain its result entrypoint",
  },
]

function normalizeManifestPath(value) {
  return value.replace(/^\/+/, "")
}

async function pathExists(target) {
  try {
    await access(target)
    return true
  }
  catch {
    return false
  }
}

async function assertFile(target, description = target) {
  const targetStat = await stat(target).catch(() => undefined)

  if (!targetStat?.isFile()) {
    throw new Error(`Build contract violation: missing ${description}`)
  }
}

async function listFiles(root) {
  const files = []

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        await visit(absolutePath)
      }
      else if (entry.isFile()) {
        files.push(absolutePath)
      }
    }
  }

  await visit(root)
  return files
}

function collectManifestReferences(manifest) {
  const references = new Set()
  const add = (value) => {
    if (typeof value === "string" && value.length > 0) {
      references.add(normalizeManifestPath(value))
    }
  }
  const addValues = (value) => {
    if (typeof value === "string") {
      add(value)
    }
    else if (Array.isArray(value)) {
      value.forEach(add)
    }
    else if (value && typeof value === "object") {
      Object.values(value).forEach(add)
    }
  }

  add(manifest.background?.service_worker)
  add(manifest.options_page)
  add(manifest.options_ui?.page)
  add(manifest.action?.default_popup)
  addValues(manifest.action?.default_icon)
  add(manifest.side_panel?.default_path)
  add(manifest.devtools_page)
  addValues(manifest.icons)

  for (const contentScript of manifest.content_scripts ?? []) {
    addValues(contentScript.js)
    addValues(contentScript.css)
  }

  return references
}

async function assertPngDimensions(file, expectedWidth, expectedHeight) {
  const buffer = await readFile(file)
  const pngSignature = "89504e470d0a1a0a"

  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`Build contract violation: ${file} is not a valid PNG`)
  }

  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)

  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `Build contract violation: ${file} is ${width}x${height}; expected ${expectedWidth}x${expectedHeight}`,
    )
  }
}

async function verifyManifest(outputRoot) {
  const manifestPath = path.join(outputRoot, "manifest.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))

  if (manifest.manifest_version !== 3) {
    throw new Error(`Build contract violation: expected Manifest V3, got ${manifest.manifest_version}`)
  }

  if (!manifest.action) {
    throw new Error("Build contract violation: manifest.action is required")
  }

  if (!manifest.side_panel?.default_path) {
    throw new Error("Build contract violation: side panel entrypoint is required")
  }

  if (!(manifest.permissions ?? []).includes("tabs")) {
    throw new Error("Build contract violation: tabs permission is required by the current tab workflows")
  }

  for (const reference of collectManifestReferences(manifest)) {
    if (reference.includes("*")) {
      continue
    }

    await assertFile(path.join(outputRoot, reference), `manifest reference ${reference}`)
  }

  for (const [size, iconPath] of Object.entries(manifest.icons ?? {})) {
    const numericSize = Number(size)
    if (Number.isInteger(numericSize)) {
      await assertPngDimensions(path.join(outputRoot, normalizeManifestPath(iconPath)), numericSize, numericSize)
    }
  }

  return manifest
}

async function verifyHtml(outputRoot, htmlPath) {
  const html = await readFile(htmlPath, "utf8")
  const relativeHtmlPath = path.relative(outputRoot, htmlPath)

  if (/<link[^>]+rel=["']modulepreload["']/i.test(html)) {
    throw new Error(`Build contract violation: ${relativeHtmlPath} contains modulepreload`)
  }

  if (/<script(?![^>]+src=)[^>]*>[\s\S]*?<\/script>/i.test(html)) {
    throw new Error(`Build contract violation: ${relativeHtmlPath} contains an inline script`)
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    throw new Error(`Build contract violation: ${relativeHtmlPath} contains an inline event handler`)
  }

  const localReferencePattern = /\b(?:src|href)=["']([^"'#?]+)["']/gi
  for (const match of html.matchAll(localReferencePattern)) {
    const reference = match[1]

    if (/^(?:[a-z]+:|\/\/)/i.test(reference)) {
      continue
    }

    const resolved = reference.startsWith("/")
      ? path.join(outputRoot, normalizeManifestPath(reference))
      : path.resolve(path.dirname(htmlPath), reference)

    await assertFile(resolved, `${relativeHtmlPath} reference ${reference}`)
  }
}

export async function verifySourceContract(repoRoot) {
  for (const assertion of SOURCE_ASSERTIONS) {
    const absolutePath = path.join(repoRoot, assertion.file)
    const contents = await readFile(absolutePath, "utf8").catch(() => undefined)

    if (!contents || !assertion.pattern.test(contents)) {
      throw new Error(`Source contract violation: ${assertion.message} (${assertion.file})`)
    }
  }
}

export async function verifyExtensionBuild(outputRoot, options = {}) {
  const absoluteOutputRoot = path.resolve(outputRoot)

  for (const requiredFile of REQUIRED_OUTPUT_FILES) {
    await assertFile(path.join(absoluteOutputRoot, requiredFile), requiredFile)
  }

  await verifyManifest(absoluteOutputRoot)

  const files = await listFiles(absoluteOutputRoot)
  const htmlFiles = files.filter(file => file.endsWith(".html"))
  await Promise.all(htmlFiles.map(file => verifyHtml(absoluteOutputRoot, file)))

  const javascriptFiles = files.filter(file => file.endsWith(".js"))
  const javascript = (await Promise.all(javascriptFiles.map(file => readFile(file, "utf8")))).join("\n")

  for (const token of ["chrome-ai", "chrome-ai-default"]) {
    if (!javascript.includes(token)) {
      throw new Error(`Build contract violation: compiled JavaScript is missing ${token}`)
    }
  }

  if (options.requireBuildInfo) {
    const buildInfoPath = path.join(absoluteOutputRoot, "BUILD_INFO.json")
    const buildInfo = JSON.parse(await readFile(buildInfoPath, "utf8"))

    if (buildInfo.contractVersion !== BUILD_CONTRACT_VERSION) {
      throw new Error("Build contract violation: BUILD_INFO.json has the wrong contract version")
    }

    if (!REQUIRED_FEATURES.every(feature => buildInfo.requiredFeatures?.includes(feature))) {
      throw new Error("Build contract violation: BUILD_INFO.json is missing required features")
    }
  }

  return {
    htmlFiles: htmlFiles.length,
    javascriptFiles: javascriptFiles.length,
    outputRoot: absoluteOutputRoot,
  }
}

export async function hasLegacyExtensionRoot(repoRoot) {
  return pathExists(path.join(repoRoot, "extansion", "manifest.json"))
}
