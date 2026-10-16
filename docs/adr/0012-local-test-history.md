# 0012. Local test history

- Status: Accepted
- Date: 2026-10-16

## Context

Users want to compare runs over time: before and after moving the router, with and without a VPN, today against last week. Until now a result lived in memory only and was gone after the next test or a restart (ADR 0008 made consent the only persisted state).

A saved run includes the public IP address and country the app showed. That is personal data, so the user needs to be able to stop saving it and to delete it, and the privacy policy has to say what is kept.

## Decision

- A new `history` module owns the feature: `domain/entry` (the `HistoryEntry` shape, a 50-entry cap, `parseHistory`), `store/historyStore`, `HistoryProvider` and `HistoryScreen`.
- An entry stores what the Result screen showed: finish time, download, upload, idle and loaded latency (bits/s and ms), the lag grade, the VPN state (`on`, `off`, `unknown`), and the IP address, country code and country from `selectVisibleInsights`. Geo fields are left out when the lookup had failed. The grade is stored, not recomputed, so a later threshold change doesn't rewrite past results.
- The store persists `{enabled, entries}` in MMKV under `streamready.history`, through the same `KeyValueStorage` and MMKV instance as consent (ADR 0008). Data from disk is parsed field by field: bad entries are dropped, a bad shape becomes an empty history.
- Only the 50 latest results are kept, newest first. At about 250 bytes each, that is under 15 KB.
- History is on by default. Turning it off stops saving and keeps saved results. Clear history deletes every result after a confirmation and keeps the switch.
- `app/providers/historyRecorder.ts` subscribes to the session store and records each new result with the insights and VPN state of that moment. Stores stay independent of each other; only `app/` composes them.
- Withdrawing consent doesn't delete or hide the history: it never leaves the TV, and the user can clear it at any time.
- `useDpadScroll` and `nextScrollOffset` move to `shared/ui` so the History table and the privacy policy scroll the same way. `FocusSwitch` joins the shared focus primitives.

## Consequences

- Persisted state is now consent plus history. The 1 GB stick reads under 15 KB of JSON at launch, and writes once per finished test or settings change.
- The privacy policy (sections 06, 08 and 09, in the app and in `PRIVACY.md`) describes what is kept and how to turn it off or clear it.
- Home gets a third card and Result a fourth button. Home cards now size to their content, so the three fit on one row.
- A future change to `HistoryEntry` bumps the persisted version and needs a migration, or old entries are dropped by the parser.
