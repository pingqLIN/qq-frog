# Contributing to QQ Frog

## Scope

This repository is prepared for public release. Changes should remain reproducible for contributors and avoid embedding deployment- or account-specific assumptions.

## Before you start

- Confirm licensing and publication expectations when modifying integration code.
- Do not commit private API keys, local credentials, or user-specific identifiers.
- Keep runtime defaults local-first, and keep external services configurable by users.

## Development checklist

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `SKIP_FREE_API=true pnpm test`
- `pnpm type-check`
- `pnpm build`

## Documentation checklist

- If you change behavior, update one of the following:
  - `README.md` / `README.zh-TW.md`
  - `INSTALL.md` / `INSTALL.zh-TW.md`
  - relevant files under `docs/` and `bridge/README.md`
- Add short release notes in `CHANGELOG.md` for user-visible changes.

## PR content expectations

- Keep code scoped and easy to review.
- Explain why behavior changes, not only how.
- Mention any runtime requirements (browser version, host requirements, env vars).
- Preserve compatibility for local-first users when proposing new features.
