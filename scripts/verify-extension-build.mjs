import path from "node:path"
import process from "node:process"
import {
  hasLegacyExtensionRoot,
  verifyExtensionBuild,
  verifySourceContract,
} from "./extension-build-contract.mjs"

async function main() {
  const repoRoot = process.cwd()
  const outputRoot = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(repoRoot, "dist", "chrome-mv3")

  await verifySourceContract(repoRoot)

  if (await hasLegacyExtensionRoot(repoRoot)) {
    throw new Error(
      "Source contract violation: extansion/manifest.json recreates the legacy load root; use dist/chrome-mv3 only",
    )
  }

  const result = await verifyExtensionBuild(outputRoot, { requireBuildInfo: true })

  console.log(`Extension contract verified: ${result.outputRoot}`)
  console.log(`Checked ${result.htmlFiles} HTML files and ${result.javascriptFiles} JavaScript files`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
