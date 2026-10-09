---
paths:
  - "src/**"
---

# Architecture rules

## Layers

- `src/app/` is the only place that composes multiple modules (navigation, header, providers, cross-module selectors in `app/selectors.ts`).
- `src/modules/<name>/` owns one domain. Its public API is `index.ts`; everything else is private.
- `src/shared/` is domain-agnostic. It never imports from `modules/` or `app/`.

## Module layout

```
modules/<name>/
  domain/      pure TS: types, interfaces, pure functions. No react, react-native, fetch, timers.
  store/       Zustand store(s) for this module
  ui/screens/  screen components (one per file)
  ui/components/
  content.ts   user-facing copy
  index.ts     public exports only
```

Not every module needs every folder. Do not create empty folders.

## Rules

- Cross-module import: `import {x} from '~/modules/speedtest'`. Never `~/modules/speedtest/store/...`.
- Side effects (network, storage, device APIs) are injected through interfaces so tests can replace them. Providers in `app/providers/` wire real implementations.
- Stores do not import other modules' stores. Cross-module derivation goes in `app/selectors.ts`.
- Insights visibility is decided only by `selectVisibleInsights`; UI never checks consent + insights by hand.
- Units: bits/s and milliseconds internally. Convert to Mbps only at display time via `shared/lib/format`.
- No new runtime dependency without asking. Prefer the platform and a few lines of code.
- Structural changes (new module, new engine, new provider, new store) need an ADR in `docs/adr/`.
