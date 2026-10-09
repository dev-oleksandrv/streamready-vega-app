# StreamReady

Open-source (Apache-2.0) Fire TV app for **Vega OS** (React Native for Vega). Measures download, upload, idle latency and latency under load, then answers "Will my TV stream in 4K?" with a plain-language verdict.

- Measurement: M-Lab **ndt7**, implemented manually over WebSocket (the official client is not Vega-compatible).
- Connection insights: public IP, country, city, ISP via free geo-IP providers.
- Architecture and decisions: `docs/ARCHITECTURE.md`, `docs/adr/`. Read them before structural changes.

## Commands

```bash
pnpm run check         # lint + typecheck + test — run before every commit
pnpm run dev           # Fast Refresh session: device/VVD, Debug build+install, port forward, Metro (--build, --reset-cache)
pnpm test              # jest
pnpm run test:coverage # jest with coverage report
pnpm run lint          # eslint
pnpm run typecheck     # tsc --noEmit
pnpm run format        # prettier
pnpm run build:debug   # Vega debug build
pnpm run build:release # Vega release build
```

## Working agreement

The maintainer drives the process. Propose, then wait for a decision.

- Do not install or upgrade dependencies, change build/manifest config, or touch files outside the task's scope without asking.
- Non-trivial work: present the design first, implement after approval.
- If a task grows beyond what was agreed, stop and say so.

## Git

- **One branch per change** (feature, fix, refactor, anything). Never commit directly to `main`.
- Branch names: `<type>/<short-kebab-slug>`, e.g. `feat/ndt7-download`, `fix/consent-back-key`.
- Commits follow **Conventional Commits 1.0**: `<type>(<scope>)!: <subject>`.
  - Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
  - Scope (optional): `speedtest`, `ndt7`, `verdict`, `insights`, `privacy`, `home`, `app`, `shared`, `deps`.
  - Subject: imperative, lowercase, no trailing period, ≤ 72 chars. Breaking changes: `!` plus a `BREAKING CHANGE:` footer.
- Claude may create branches and commit. Claude must **never push, force-push, rewrite history, or merge into `main`**.
- `docs/superpowers/` (working specs and plans) is gitignored. Only polished docs (`docs/ARCHITECTURE.md`, `docs/adr/`, `docs/qa-checklist.md`) are versioned.

## Open source: no secrets, no personal data

- Never commit API keys, tokens, signing material, `.env` files, device serials, or real IP addresses.
- Anything bundled into the app is public. If a feature seems to need a secret, stop and ask.
- Test fixtures use documentation IPs (`203.0.113.0/24`, `2001:db8::/32`) and fake UUIDs. M-Lab URLs contain `access_token`: never log or commit them.

## Architecture in one screen

```
src/app/       composition root: navigation, providers (DI), header, cross-module selectors
src/modules/   privacy · speedtest (engines/ndt7) · verdict · insights · home
src/shared/    ui (tokens, focus primitives), lib (http, format, logger, storage)
test/          mirrors src/ 1:1; test/support/ holds fakes and fixtures
```

- Dependencies flow `app → modules → shared`. Modules import each other only via their `index.ts`.
- `domain/` folders and `verdict/` are pure TypeScript: no `react` / `react-native` imports.
- State: Zustand, one store per module. Only consent is persisted.
- New measurement backends implement `SpeedTestEngine`; new geo-IP sources implement `GeoIpProvider`. Add an ADR when introducing one.

Path-scoped details live in `.claude/rules/`.

## Code style

- TypeScript `strict`. No `any`, no non-null `!` without a comment explaining why it is safe.
- Named exports only. One component per file. Files: `PascalCase.tsx` for components, `camelCase.ts` otherwise.
- `react-native` imports resolve to `@amazon-devices/react-native-kepler`; use `@amazon-devices/*` packages for navigation and focus.
- Prefer small, single-purpose files. Comments explain *why*, not *what*.
- User-facing copy lives in `content.ts` files, not inline in components.

## Vega specifics

- Every interactive element must be reachable and usable with the D-pad; Back key behavior is defined per screen.
- Target hardware is a 1 GB RAM stick: no buffering of downloaded data, reuse upload buffers, throttle UI updates (~4 Hz) during tests.
- Use the `amazon-devices-vega-*` skills (focus management, navigation, build-and-run, performance) when working in those areas.
