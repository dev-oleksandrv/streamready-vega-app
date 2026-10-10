# 0008. MMKV for persisted consent

- Status: Accepted
- Date: 2026-10-10

## Context

Consent is the only persisted state. It was stored through the `AsyncStorage` that `@amazon-devices/react-native-kepler` still ships. Two things went wrong with it:

- On a Fire TV Stick 4K Select (OS 1.2), a plain relaunch showed the Privacy gate again even though consent had been accepted.
- Every access logged "Legacy AsyncStorage is on a deprecation path".

It is unclear whether the value was lost or read too slowly for the 3 s hydration limit. Either way the user is asked again on every launch.

## Decision

- Store consent in MMKV through `@amazon-devices/react-native-mmkv` (~1.0.11, the RN 0.83 line).
  - The native library ships inside the app, so the manifest needs no entries.
  - Only `getString`, `set` and `delete` are used, which the Vega docs list as supported.
- `shared/lib/storage` wraps it in the existing `KeyValueStorage` interface (`createMmkvStorage`), with the MMKV id `streamready`:
  - Reads and writes never throw.
  - If the native module fails to open, the adapter logs a warning and falls back to memory, so the app boots and asks for consent again.
- The legacy `AsyncStorage` adapter is removed.

## Consequences

- Reads are synchronous under the async interface, so consent hydrates at once on cold start. The 3 s hydration timeout stays as a safety net.
- Consent accepted under the old storage is not migrated: the app was unreleased, and the old value did not survive relaunches anyway.
- Tests use an in-memory MMKV mock (`test/support/jestSetup.ts`). Persistence across relaunches is checked on a device.
