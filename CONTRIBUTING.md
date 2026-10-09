# Contributing to StreamReady

Thanks for your interest! This guide covers how to set up the project and what a change needs before review.

## Setup

```bash
pnpm install
pnpm run check        # lint + typecheck + tests
pnpm run build:debug  # Vega debug build
```

You need the [Vega SDK](https://developer.amazon.com/docs/vega/latest/), Node.js ≥ 20 and pnpm 12.

## Branches

One branch per change — feature, fix, refactor, anything. Never commit directly to `main`.

Name branches `<type>/<short-kebab-slug>`, e.g. `feat/ndt7-download`, `fix/consent-back-key`.

## Commits

Commits follow [Conventional Commits 1.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>)!: <subject>
```

- **Types:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- **Scope** (optional): `speedtest`, `ndt7`, `verdict`, `insights`, `privacy`, `home`, `app`, `shared`, `deps`.
- **Subject:** imperative, lowercase, no trailing period, ≤ 72 characters.
- **Breaking changes:** add `!` and a `BREAKING CHANGE:` footer.

## Before opening a pull request

- `pnpm run check` passes.
- New logic comes with tests in `test/`, mirroring the `src/` path (`src/modules/verdict/domain/evaluate.ts` → `test/modules/verdict/domain/evaluate.test.ts`).
- No snapshot tests. Assert on behavior the user sees.
- For UI changes, walk the relevant items in [docs/qa-checklist.md](docs/qa-checklist.md) on a device.

## Architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. Module boundaries are enforced by ESLint.

Structural changes — a new module, measurement engine, geo-IP provider or store — need an Architecture Decision Record in [docs/adr/](docs/adr/). The template is in [docs/adr/README.md](docs/adr/README.md).

## No secrets, no personal data

This is a public repository and everything bundled into the app is public.

- Never commit API keys, tokens, signing material, `.env` files, device serials or real IP addresses.
- Test fixtures use documentation IP ranges (`203.0.113.0/24`, `2001:db8::/32`) and fake UUIDs.
- M-Lab test URLs contain an `access_token`: never log or commit them.
