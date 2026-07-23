# Project Structure

This repository uses WXT and Manifest V3. It has one source boundary and one
canonical production artifact:

```text
extansion/src + extansion/public
              |
              v
      isolated WXT staging build
              |
              v
 manifest + feature + asset verification
              |
              v
       dist/chrome-mv3
```

The unsuffixed English document is authoritative. See
[`project-structure.zh-tw.md`](./project-structure.zh-tw.md) for the Traditional
Chinese companion.

## Authoritative Boundaries

- `extansion/src/`: extension source code and WXT entrypoints.
- `extansion/public/`: static files copied into the extension.
- `extansion/src/assets/`: bundled application assets.
- `extansion/assets/`: repository documentation and auxiliary assets; never an
  extension output root.
- `dist/chrome-mv3/`: the only supported production unpacked-extension path.
- `dist/dev/`: WXT development output; never a production artifact.
- `.build/extension/`: isolated staging builds; never load this path in Chrome.
- `extansion/.del/`: recoverable archives of the removed legacy root build.

`extansion/` is not loadable as an extension. A root-level `manifest.json`
there indicates a legacy build and must fail review.

## Build Transaction

`pnpm build` performs a transaction:

1. Verify source-level required-feature contracts.
2. Build into a unique `.build/extension/<build-id>` staging directory.
3. Verify Manifest V3, manifest references, icon dimensions, extension HTML,
   absence of `modulepreload`, Chrome Built-in AI, and PDF result output.
4. Write `BUILD_INFO.json` with the source Git commit and dirty-state marker.
5. Move the previous canonical artifact to `dist/.del/`.
6. Promote the verified staging artifact to `dist/chrome-mv3`.
7. Move legacy root output under `extansion/.del/`.

If verification fails, the previous canonical artifact remains in place. If
promotion fails, the previous artifact is restored.

## Required Feature Contract

A production build fails unless all of these remain present:

- `chrome-ai` is an API provider.
- The provider dialog contains the Chrome Built-in AI group.
- The Prompt API adapter remains present.
- The PDF result entrypoint remains present.
- Compiled JavaScript contains the Chrome AI provider identifiers.

This turns silent feature disappearance into a build failure.

## Commands

```bash
pnpm build
pnpm verify:extension
pnpm build:edge
pnpm build:firefox
pnpm zip
```

Load `dist/chrome-mv3` from `chrome://extensions`. After each successful build,
reload that extension.

## Source Areas

- `extansion/src/entrypoints/background/`: Manifest V3 service worker and
  cross-surface coordination.
- `extansion/src/entrypoints/popup/`: toolbar popup.
- `extansion/src/entrypoints/options/`: settings and provider UI.
- `extansion/src/entrypoints/sidepanel/`: Chrome side panel.
- `extansion/src/entrypoints/translation-hub/`: translation workspace.
- `extansion/src/entrypoints/*.content/`: content scripts.
- `extansion/src/entrypoints/offscreen/`: offscreen document.
- `extansion/src/utils/`: translation, configuration, storage, and runtime
  helpers.
- `extansion/src/types/`: configuration schemas and provider types.

## Commit Gate

`lint-staged.config.mjs` batches file paths to stay below Windows command-line
limits. Large restorations therefore use the same lint gate as normal commits
instead of bypassing it.
