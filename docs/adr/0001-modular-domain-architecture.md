# 0001. Modular domain architecture

- Status: Accepted
- Date: 2026-10-09

## Context

StreamReady is open source and may be maintained by people who join later. The app has a few clear domains: consent, speed measurement, the streaming verdict, connection insights and the home screen. The measurement backend will change over time, starting with ndt7. Code needs to stay easy to read, test and extend.

## Decision

- The code is split into three layers: `src/app` (composition root), `src/modules/<domain>` and `src/shared`. Dependencies flow `app → modules → shared` only.
- Each module exposes its public API through `index.ts`. Other code imports a module only as `~/modules/<name>`.
- `domain/` folders and the `verdict` module are pure TypeScript, with no React, React Native or Vega imports.
- Side effects (network, storage, device APIs) sit behind interfaces and are injected from `app/providers`.
- Tests mirror `src/` under `test/`.

## Consequences

- ESLint (`no-restricted-imports`) enforces the boundaries, so violations fail `pnpm run check`.
- Domain logic can be unit-tested without rendering anything.
- Adding a module, engine, provider or store requires a new ADR.
- Code that needs data from several modules has to live in `app/`, which adds a little indirection.
