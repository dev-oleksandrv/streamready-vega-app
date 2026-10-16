# Contributing to StreamReady

Thanks for your interest! This guide covers how to set up the project and what a change needs before review.

## Setup

```bash
pnpm install
pnpm run check        # lint + typecheck + tests
pnpm run build:debug  # Vega debug build
```

You need the [Vega SDK](https://developer.amazon.com/docs/vega/latest/), Node.js ≥ 22 and pnpm 12.

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

## Changesets

Every change a TV user can notice needs a changeset: a small file that names the version bump and says what changed, in plain language. It becomes the `CHANGELOG.md` entry and the store's "What's new" text.

```bash
pnpm changeset          # pick patch / minor / major, write the summary
pnpm changeset --empty  # app code changed, but nothing the user notices
```

CI fails a pull request that changes app files (`src/`, `kepler/`, `assets/`, `manifest.toml`, `CMakeLists.txt`) without one.

## Releases

1. Each merge to `main` updates the Version PR, **chore(app): release next version**. It bumps the version and build number, syncs `manifest.toml` and `APP_VERSION`, and writes `CHANGELOG.md`.
2. Merging the Version PR is the release decision.
3. On an up-to-date `main`, `pnpm run release` builds, verifies the VPKGs and tags `v<version>+<build>`. Push the tag and upload the VPKG with the printed release notes.
4. If the store rejects an uploaded build, `pnpm run release --rebuild` opens a branch that only raises the build number.

The Version workflow needs the `CHANGESETS_TOKEN` secret: a fine-grained personal access token for this repository with Contents and Pull requests read/write.

## Before opening a pull request

- `pnpm run check` passes.
- A changeset is included, if the change is user-facing.
- New logic comes with tests in `test/`, mirroring the `src/` path (`src/modules/verdict/domain/evaluate.ts` → `test/modules/verdict/domain/evaluate.test.ts`).
- No snapshot tests. Assert on behavior the user sees.
- For UI changes, check the affected screens on a device: D-pad focus, Back key and the states the change touches.

## Architecture

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) first. Module boundaries are enforced by ESLint.

Structural changes — a new module, measurement engine, geo-IP provider or store — need an Architecture Decision Record in [docs/adr/](docs/adr/). The template is in [docs/adr/README.md](docs/adr/README.md).

## No secrets, no personal data

This is a public repository and everything bundled into the app is public.

- Never commit API keys, tokens, signing material, `.env` files, device serials or real IP addresses.
- Test fixtures use documentation IP ranges (`203.0.113.0/24`, `2001:db8::/32`) and fake UUIDs.
- M-Lab test URLs contain an `access_token`: never log or commit them.
