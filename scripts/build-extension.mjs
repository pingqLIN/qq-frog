import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { promisify } from "node:util"
import { build, zip } from "wxt"
import {
  BUILD_CONTRACT_VERSION,
  REQUIRED_FEATURES,
  verifyExtensionBuild,
  verifySourceContract,
} from "./extension-build-contract.mjs"

const execFileAsync = promisify(execFile)
const SUPPORTED_BROWSERS = new Set(["chrome", "edge", "firefox"])
const LEGACY_ROOT_ENTRIES = [
  ".output",
  "_locales",
  "chunks",
  "content-scripts",
  "icon",
  "background.js",
  "devtools.html",
  "manifest.json",
  "offscreen.html",
  "options.html",
  "pdf-result.html",
  "popup.html",
  "sidepanel.html",
  "translation-hub.html",
]

function parseArguments(argv) {
  let browser = "chrome"
  let createZip = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === "--zip") {
      createZip = true
    }
    else if (argument === "--browser") {
      browser = argv[index + 1]
      index += 1
    }
    else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (!SUPPORTED_BROWSERS.has(browser)) {
    throw new Error(`Unsupported browser: ${browser}`)
  }

  return { browser, createZip }
}

async function exists(target) {
  return stat(target).then(() => true, () => false)
}

async function getGitMetadata(repoRoot) {
  const runGit = async args => (await execFileAsync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  })).stdout.trim()

  const commit = await runGit(["rev-parse", "HEAD"])
  const status = await runGit(["status", "--porcelain"])

  return {
    commit,
    dirty: status.length > 0,
  }
}

function createBuildId(browser) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${timestamp}-${browser}-${process.pid}`
}

async function moveIfPresent(source, destination) {
  if (!await exists(source)) {
    return false
  }

  await mkdir(path.dirname(destination), { recursive: true })
  await rename(source, destination)
  return true
}

async function listFiles(root) {
  if (!await exists(root)) {
    return []
  }

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

async function archiveLegacyGeneratedAssets(repoRoot, archiveRoot) {
  const extensionRoot = path.join(repoRoot, "extansion")
  const legacyOutputAssets = path.join(extensionRoot, ".output", "chrome-mv3", "assets")
  const rootAssets = path.join(extensionRoot, "assets")
  const generatedRelativePaths = new Set(
    (await listFiles(legacyOutputAssets)).map(file => path.relative(legacyOutputAssets, file)),
  )
  const trackedOutput = await execFileAsync("git", ["ls-files", "extansion/assets"], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  const trackedAssets = new Set(
    trackedOutput.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map(file => path.resolve(repoRoot, file)),
  )
  const archived = []
  const hashedAssetPattern = /-[\w-]{8,}\.(?:css|png|svg)$/

  for (const file of await listFiles(rootAssets)) {
    if (!trackedAssets.has(path.resolve(file)) && hashedAssetPattern.test(path.basename(file))) {
      generatedRelativePaths.add(path.relative(rootAssets, file))
    }
  }

  for (const relativePath of generatedRelativePaths) {
    const source = path.join(rootAssets, relativePath)

    if (trackedAssets.has(path.resolve(source))) {
      continue
    }

    const destination = path.join(archiveRoot, "assets", relativePath)
    if (await moveIfPresent(source, destination)) {
      archived.push(path.join("assets", relativePath))
    }
  }

  return archived
}

async function archiveLegacyRoot(repoRoot, buildId) {
  const extensionRoot = path.join(repoRoot, "extansion")
  const archiveRoot = path.join(extensionRoot, ".del", `legacy-generated-root-${buildId}`)
  const archived = await archiveLegacyGeneratedAssets(repoRoot, archiveRoot)

  for (const entry of LEGACY_ROOT_ENTRIES) {
    const source = path.join(extensionRoot, entry)
    const destination = path.join(archiveRoot, entry)

    if (await moveIfPresent(source, destination)) {
      archived.push(entry)
    }
  }

  return { archiveRoot, archived }
}

async function promoteBuild(stagedOutput, canonicalOutput, buildId) {
  const distRoot = path.dirname(canonicalOutput)
  const previousOutput = path.join(distRoot, ".del", `${path.basename(canonicalOutput)}-${buildId}`)
  const hadPreviousOutput = await moveIfPresent(canonicalOutput, previousOutput)

  try {
    await mkdir(path.dirname(canonicalOutput), { recursive: true })
    await rename(stagedOutput, canonicalOutput)
    await verifyExtensionBuild(canonicalOutput, { requireBuildInfo: true })
  }
  catch (error) {
    const failedOutput = path.join(distRoot, ".del", `failed-${path.basename(canonicalOutput)}-${buildId}`)
    await moveIfPresent(canonicalOutput, failedOutput)

    if (hadPreviousOutput) {
      await rename(previousOutput, canonicalOutput)
    }

    throw error
  }

  return hadPreviousOutput ? previousOutput : undefined
}

async function promotePackages(zipPaths, packagesRoot, buildId) {
  const promoted = []

  for (const zipPath of zipPaths) {
    const destination = path.join(packagesRoot, path.basename(zipPath))
    const previous = path.join(packagesRoot, ".del", `${buildId}-${path.basename(zipPath)}`)
    await moveIfPresent(destination, previous)
    await mkdir(packagesRoot, { recursive: true })
    await rename(zipPath, destination)
    promoted.push(destination)
  }

  return promoted
}

async function main() {
  const repoRoot = process.cwd()
  const { browser, createZip } = parseArguments(process.argv.slice(2))
  const buildId = createBuildId(browser)
  const stagingRoot = path.join(repoRoot, ".build", "extension", buildId)
  const outputName = `${browser}-mv3`
  const stagedOutput = path.join(stagingRoot, outputName)
  const canonicalOutput = path.join(repoRoot, "dist", outputName)

  await verifySourceContract(repoRoot)

  const inlineConfig = {
    browser,
    manifestVersion: 3,
    mode: "production",
    outDir: stagingRoot,
  }
  const zipPaths = createZip ? await zip(inlineConfig) : []

  if (!createZip) {
    await build(inlineConfig)
  }

  const git = await getGitMetadata(repoRoot)
  const buildInfo = {
    browser,
    builtAt: new Date().toISOString(),
    buildId,
    contractVersion: BUILD_CONTRACT_VERSION,
    git,
    manifestVersion: 3,
    output: `dist/${outputName}`,
    requiredFeatures: REQUIRED_FEATURES,
  }

  await writeFile(
    path.join(stagedOutput, "BUILD_INFO.json"),
    `${JSON.stringify(buildInfo, null, 2)}\n`,
    "utf8",
  )
  await verifyExtensionBuild(stagedOutput, { requireBuildInfo: true })

  const previousOutput = await promoteBuild(stagedOutput, canonicalOutput, buildId)
  const packages = createZip
    ? await promotePackages(zipPaths, path.join(repoRoot, "dist", "packages"), buildId)
    : []
  const legacy = browser === "chrome"
    ? await archiveLegacyRoot(repoRoot, buildId)
    : { archived: [] }
  const finalBuildInfo = JSON.parse(await readFile(path.join(canonicalOutput, "BUILD_INFO.json"), "utf8"))

  console.log(`Verified extension: ${canonicalOutput}`)
  console.log(`Source commit: ${finalBuildInfo.git.commit}${finalBuildInfo.git.dirty ? " (dirty worktree)" : ""}`)
  console.log(`Required features: ${finalBuildInfo.requiredFeatures.join(", ")}`)

  if (previousOutput) {
    console.log(`Previous build archived: ${previousOutput}`)
  }
  if (legacy.archived.length > 0) {
    console.log(`Legacy root archived: ${legacy.archiveRoot}`)
  }
  for (const packagePath of packages) {
    console.log(`Verified package: ${packagePath}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
