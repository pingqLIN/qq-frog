import { cp, mkdir, rm, stat } from "node:fs/promises"
import path from "node:path"
import process from "node:process"

const repoRoot = process.cwd()
const extensionRoot = path.resolve(repoRoot, "extansion")
const outputRoot = path.resolve(extensionRoot, ".output", "chrome-mv3")

const rootGeneratedEntries = [
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

function assertInside(child, parent) {
  const relativePath = path.relative(parent, child)
  if (relativePath === "" || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to operate outside ${parent}: ${child}`)
  }
}

async function copyEntry(name) {
  const source = path.join(outputRoot, name)
  const target = path.join(extensionRoot, name)
  assertInside(target, extensionRoot)
  await rm(target, { recursive: true, force: true })
  await cp(source, target, { recursive: true })
}

async function main() {
  await stat(path.join(outputRoot, "manifest.json"))
  await mkdir(extensionRoot, { recursive: true })

  for (const name of rootGeneratedEntries) {
    await copyEntry(name)
  }

  await cp(path.join(outputRoot, "assets"), path.join(extensionRoot, "assets"), {
    recursive: true,
    force: true,
  })

  console.log(`Synced Chrome extension output to ${extensionRoot}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
