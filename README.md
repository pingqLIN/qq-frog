![QQ Frog lightweight banner](./extansion/assets/readme-banner.jpg)

# QQ Frog

![Status](https://img.shields.io/badge/status-local--first-green) ![Platform](https://img.shields.io/badge/platform-Chrome%20MV3-blue) ![License](https://img.shields.io/badge/license-GPL--3.0--only-orange)

**A lightweight, local-first browser extension for everyday reading, selection translation, side-panel translation, and optional local PDF translation.**

Traditional Chinese documentation is available in [README.zh-TW.md](./README.zh-TW.md).

[Quick Start](#quick-start) · [Installation](#installation) · [Features](#features) · [PDF Translation](#pdf-translation) · [Development](#development) · [Documentation](#documentation) · [繁體中文](./README.zh-TW.md)

---

## Overview

QQ Frog is an independent, local-first fork based on the original Read Frog browser extension template, known in Chinese as 伴讀蛙.

This repository is prepared as a public project. The codebase focuses on local workflow defaults and publishes only configurable, non-sensitive behavior.

Thanks to the original Read Frog / 伴讀蛙 project and its contributors for the extension foundation, product idea, and implementation patterns this fork builds on.

---

## Quick Start

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Then open `chrome://extensions`, enable **Developer mode**, and load the `extansion/` directory.

> For production-style packaging and full setup details, see [INSTALL.md](./INSTALL.md).

## Installation

```bash
pnpm install --frozen-lockfile
pnpm build
```

- Load the `extansion/` directory from `chrome://extensions` (Developer mode).
- For packaged browser store output, run `pnpm zip`, `pnpm zip:firefox`, or `pnpm zip:edge`.
- Optional PDF bridge setup and Native Messaging instructions are documented in [INSTALL.md](./INSTALL.md) and [INSTALL.zh-TW.md](./INSTALL.zh-TW.md).

---

## Features

This fork keeps the extension focused on a practical local workflow:

| Surface           | Capability                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| Selection toolbar | Translate selected text from any page                                                 |
| Popup             | Quick translation controls and a **More** menu entry for PDF translation              |
| Side panel        | Translation hub, video subtitle controls, and PDF translation in one persistent panel |
| Options page      | Provider settings, sync settings, and full PDF bridge diagnostics                     |
| Local bridge      | Optional PaddleOCR OCR and provider-routed PDF translation                            |

It deliberately avoids bundled personal credentials and keeps hosted/runtime assumptions minimal.

---

## Screenshots And Surfaces

![Selection toolbar](./extansion/src/assets/demo/selection-toolbar.png)

![Context menu](./extansion/src/assets/demo/context-menu.png)

For the full surface map, see the [interface tour](./docs/interface-tour.md).

---

## Local-First Defaults

QQ Frog is designed to run as a standalone extension. Runtime service URLs default to localhost, and API keys are entered by the user in the options page rather than bundled into production builds.

The app reference settings in source include provider definitions and example AI actions without personal API keys, custom headers, provider options, or external note-database connections.

---

## PDF Translation

PDF translation is available as an opt-in local workflow:

1. The extension sends the PDF to a local bridge service.
2. The bridge runs OCR through the optional PaddleOCR runtime.
3. Translation is routed through the provider chosen by the user: Chrome built-in Gemini, LM Studio, OpenAI, or Gemini API.

PaddleOCR, PaddlePaddle, and OCR model files are not bundled into the extension. They are installed only when the user chooses local PDF OCR. See [bridge/README.md](./bridge/README.md) and [PaddleOCR runtime separation](./docs/audit/paddleocr-runtime-separation.md).

PDF entry points:

| Entry                          | Use                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------- |
| Options → PDF Translation      | Full setup, health check, one-click bridge start, logs, and advanced maintenance |
| Side panel → PDF Translation   | In-panel PDF upload and translation                                              |
| Popup → More → PDF Translation | Fast jump into the PDF translation settings/workflow                             |

---

## Google Drive Sync

Settings can be synced to the user's personal Google Drive `appDataFolder` using the browser extension OAuth flow. QQ Frog does not use a service account or a shared project Drive.

To enable this in a build, create a Google OAuth client for a Chrome extension and set:

```bash
WXT_GOOGLE_CLIENT_ID=your-google-client-id
```

At runtime, the user clicks **Connect Google Drive** in the options page. The extension then uses `chrome.identity.getAuthToken` when available, falling back to `browser.identity.launchWebAuthFlow`, so Google shows the account chooser and consent screen for that user's own Google account.

Requested scopes:

- `https://www.googleapis.com/auth/drive.appdata`: read and write only this extension's hidden app-data file, `qq-frog-config.json`.
- `https://www.googleapis.com/auth/userinfo.email`: read the selected account email so local sync metadata can detect account changes.

The OAuth token is stored in extension local storage and removed when the user logs out of Google Drive sync.

---

## Development

```bash
pnpm install
SKIP_FREE_API=true pnpm test
pnpm type-check
pnpm build
```

`SKIP_FREE_API=true` is recommended for local agent validation because `free-api.test.ts` depends on live external translation services.

---

## Extension Surfaces

- Popup
- Options page
- Side panel
- Translation hub
- Content scripts
- DevTools panel

---

## Documentation

- [Interface tour](./docs/interface-tour.md)
- [Project structure](./docs/project-structure.md)
- [Documentation index](./docs/README.md)
- [PDF bridge guide](./bridge/README.md)
- [Installation guide](./INSTALL.md)
- [Installation guide (Traditional Chinese)](./INSTALL.zh-TW.md)
- [PaddleOCR runtime separation](./docs/audit/paddleocr-runtime-separation.md)
- [Security review](./docs/audit/security-review.md)
- [Privacy review](./docs/audit/privacy-review.md)
- [Permissions review](./docs/audit/permissions-review.md)
- [Release checklist](./docs/audit/release-checklist.md)

---

## AI-Assisted Development

This repository is developed with AI assistance and human review.

| Model        | Role                                                               |
| ------------ | ------------------------------------------------------------------ |
| OpenAI Codex | Implementation, validation, documentation, and review coordination |

> Disclaimer: AI-generated changes are reviewed and tested by the maintainer where practical, but no guarantee is made regarding correctness, security, or fitness for any particular purpose. Use at your own risk.

---

## License And Attribution

This fork is distributed under the GNU General Public License v3.0 only. See [LICENSE](./LICENSE).

Modified from the original Read Frog / 伴讀蛙 browser extension template.
