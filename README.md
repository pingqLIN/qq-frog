# QQ Frog

Local standalone browser extension for reading, translation, and language-learning workflows.

繁體中文說明請見 [README.zh-TW.md](./README.zh-TW.md)。

## Development

```bash
pnpm install
SKIP_FREE_API=true pnpm test
pnpm type-check
pnpm build
```

Local runtime URLs default to localhost. Override them in `.env.development` or `.env.production` only when you intentionally run your own hosted services.

## Extension Surfaces

- Popup
- Options page
- Side panel
- Translation hub
- Content scripts
- DevTools panel

## Project Structure & Audit

- [Project structure](./docs/project-structure.md)
- [Security review](./docs/audit/security-review.md)
- [Privacy review](./docs/audit/privacy-review.md)
- [Permissions review](./docs/audit/permissions-review.md)
- [Release checklist](./docs/audit/release-checklist.md)

## External Services

The local build keeps third-party provider integrations such as Google, Microsoft, OpenAI-compatible providers, and other configured AI/translation providers. Original Read Frog website, API, blog, survey, Discord, and upstream project links are not used as runtime service targets.
