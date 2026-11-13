# Per-service verdicts and jitter

## Summary

The task was open-ended ("what can we add to the app?"). Out of a shortlist of ten candidates the developer picked two that reuse data the app already measures:

- **Per-service verdicts:** a new Services screen, opened from Result, that says which quality Netflix, Prime Video, YouTube, Disney+, Apple TV and HBO Max can play at the measured download speed.
- **Jitter:** a third value on the "Why it lags" screen, computed from the RTT samples the ndt7 engine already collects.

Both are pure TypeScript: no native (C++) change, no new dependency, no manifest change, no new network host and no new persisted data. They ship together on one branch with one changeset.

## Facts

### A. Per-service verdicts

1. A new pure function in `src/modules/verdict/domain/` takes the measured download (bits/s) and returns one row per service, in this fixed order: Netflix, Prime Video, YouTube, Disney+, Apple TV, HBO Max.
2. Each service has a table of quality tiers (HD 720p, Full HD 1080p, 4K). Each tier has `minMbps` and a source flag, `official` or `typical`. The table is data in `verdict/domain/`; all copy is in `verdict/content.ts`.
3. A figure is `official` only when it comes from the service's own help page. The page URL and the date it was checked are recorded in a comment next to the table. Any tier without such a figure uses the app's generic threshold (3 / 5 / 25 Mbps, `STREAM_CHECKS`) and is flagged `typical`.
4. Starting figures, as checked on 2026-11-13. "Confirm" means the plan must open the service's own page before the figure may be flagged `official`; if it cannot be confirmed, fact 3 applies.

   | Service | HD 720p | Full HD 1080p | 4K | Status |
   |---|---|---|---|---|
   | Netflix | 3 | 5 | 15 | official, `help.netflix.com/node/306` |
   | HBO Max | typical | 5 | 50 | official, `help.hbomax.com` article 000002519 ("HD 5 Mbps", "50+ Mbps for the best 4K") |
   | Apple TV | typical | typical | 25 | official for 4K, `support.apple.com/HT207949` |
   | Disney+ | typical | 5 | 25 | confirm: only secondary sources quoting the Disney+ Help Center were found |
   | YouTube | 2.5 | 5 | 20 | confirm at `support.google.com/youtube/answer/78358` |
   | Prime Video | typical | typical | typical | no official figure found |

5. When a service publishes a single "HD" figure, it applies to the Full HD tier.
6. Display names follow each service's current brand: "HBO Max" (not "Max") and "Apple TV" (formerly "Apple TV+"; confirm the current name on Apple's site at implementation time).
7. A row's result is the highest tier whose `minMbps` is at or below the shown download, rounded the same way as `shownMbps` in `verdict/domain/evaluate.ts:57`, so a shown "15.0" passes a 15 Mbps tier. The row also names the next tier and what it needs. When no tier passes, the row shows no quality and what the lowest tier needs.
8. Rows are computed from download only. The lag grade never changes a row.
9. When the lag grade is D or F (`LAGGY_GRADES`), the Services screen shows one note line saying that speed is enough but lag can still cause stalls. With grades A to C there is no note.
10. An `official` tier reads "Needs N Mbps"; a `typical` tier reads "Typically needs N Mbps".
11. The Services screen has one line saying the figures are each service's published minimums (or typical values) and that StreamReady is not affiliated with these services. Services appear as text names only: no logos or brand artwork.
12. The screen is `ServicesScreen` in `src/modules/speedtest/ui/screens/` (`verdict/` stays free of React). It gets a `Services` route in `RootStackParamList` and a `ServicesRoute.tsx` adapter, and opens from Result only.
13. All six rows are visible without scrolling at 1920×1080. Rows are not focusable. The only focusable element is "Back to result", which has initial focus. The Back key returns to Result.
14. The Result action row becomes: Test again, Services, Why it lags, History. The on-screen Back button is removed; the remote's Back key still goes Home. Initial focus stays on Test again.
15. When there is no result in the session store, `ServicesRoute` draws nothing, as `LatencyRoute` does.
16. The headline verdict, the 2×2 checks, `thresholds.ts` values and the six design scenarios do not change. Existing `evaluate` tests pass unmodified.
17. The table is bundled in the app. The feature makes no network request and persists nothing.
18. Table tests cover every service at its boundaries: exactly at a tier's minimum passes, just under fails, below the lowest tier gives no quality.

### B. Jitter

19. `DownloadLatency` (`src/modules/speedtest/engines/ndt7/measurements.ts`) computes jitter from the RTT samples it already collects: the mean absolute difference between consecutive samples, in the order they were measured. With fewer than 3 samples jitter is undefined.
20. Jitter comes from the same source as loaded latency: the server's `TCPInfo` normally, the TV's own `TCP_INFO` when a VPN is connected (`latencySource`).
21. `SpeedTestResult` gets an optional `jitterMs?: number` in milliseconds. There is no new `EngineEvent` and no live jitter on the Test screen.
22. Nothing changes in `kepler/`, in codegen output, in `manifest.toml` or in `package.json` dependencies. No new `TCPInfo` field is parsed.
23. A pure function plus config in `verdict/domain/` maps jitter to a level: Steady under 10 ms (tone good), Uneven under 30 ms (tone warn), Unstable from 30 ms (tone bad). These are starting values, to be confirmed in device QA.
24. The Latency screen ("Why it lags") shows a third card, "Jitter", with the value in ms and the level label in the tone color, plus one plain-language sentence about what jitter means for streaming. When `jitterMs` is undefined the card shows "—" and no label.
25. Jitter does not change the lag grade, the outcome, the headline or the checks.
26. Jitter is not written to `HistoryEntry`. The persisted shape and version stay as they are, and the History table is unchanged.
27. The privacy policy text is unchanged, and `test/privacyDoc.test.ts` passes untouched.

### Shared

28. One branch and one changeset (minor) that describes both features in user-facing words. `pnpm run check` is green.
29. `docs/ARCHITECTURE.md` is updated: the scope list (line 8), the stack and Back table in §5.5, the initial-focus table, and `SpeedTestResult` in §6.1. `.claude/rules/speedtest.md` gets the jitter definition and the service-table rule. A new ADR records the figures policy (official or typical).

## Decisions

| # | Question | Answer |
|---|---|---|
| 1 | Which features go into discovery? | Per-service verdicts, and jitter and stability. |
| 2 | Which services in the first version? | Six: Netflix, Prime Video, YouTube, Disney+, Apple TV+, Max. |
| 3 | Official minimums are below the app's generic 4K threshold (25 Mbps), so a row can say "4K" while the headline says "4K may buffer". How to resolve? | Show official figures as fact. The headline and the 25 Mbps threshold stay. |
| 4 | Where are service verdicts shown? | A separate Services screen, opened from Result. |
| 5 | Does the lag grade affect a service row? | No. Speed only, plus one note when the grade is D or F. |
| 6 | Which metrics for jitter and stability? | Jitter only, from the existing RTT samples. No retransmits, no C++ change. |
| 7 | Does jitter affect the verdict? | No. Display only, with a plain label (Steady / Uneven / Unstable). |
| 8 | Where is jitter shown? | On the "Why it lags" screen, as a third card. |
| 9 | Is jitter saved in History? | Not now. |
| 10 | A fifth button does not fit the Result action row. How is Services added? | It replaces the on-screen Back button. |
| 11 | What about a service or tier with no official figure? | Use the app's generic thresholds, labelled "Typically needs". |
| 12 | One discovery document or two? | One document for both features. |

Decided without asking, as defaults:

- Brand names are corrected to the current ones: "HBO Max" and "Apple TV" (fact 6).
- A single published "HD" figure maps to the Full HD tier (fact 5).
- Jitter is the mean absolute difference of consecutive RTT samples, not a spread around the median, because loaded RTT ramps up during a download and a spread would count bufferbloat as jitter (fact 19).
- Jitter level thresholds start at 10 and 30 ms (fact 23).
- The Services screen lives in the `speedtest` module, next to Result and Latency (fact 12).

## Security findings

Security findings: yes

| # | Finding | Source | Severity |
|---|---|---|---|
| 1 | The service table must stay bundled. Fetching it would add a fourth outside service that sees the IP address, which the policy does not list. | `PRIVACY.md:9`, `src/modules/insights/device/netInfoMonitor.ts:52-57` | constraint, met by fact 17 |
| 2 | Server Measurement messages carry `ConnectionInfo.Client`, the user's public IP and port. Jitter code must work on parsed `TcpSample` values and never log or keep the raw text. Test fixtures keep documentation IPs. | `test/support/fixtures/ndt7.ts:30`, `.claude/rules/testing.md:12`, `.claude/rules/speedtest.md:36` | constraint |
| 3 | Third-party brand names are shown. Text-only use with a non-affiliation line is the chosen form. The Amazon Appstore content policy on third-party trademarks was not checked. | not covered by the repo | open, non-blocker |
| 4 | A figure presented as a service's own requirement must be traceable to that service's page. Unconfirmed figures (Disney+, YouTube, Prime Video today) must show as "Typically needs". | fact 3, fact 4 | constraint |
| 5 | Nothing new is persisted, so `PRIVACY.md` and the in-app policy stay as they are. If the plan ends up storing jitter, `PRIVACY.md:51` and ADR 0012 apply and the work is out of this scope. | `PRIVACY.md:51`, `docs/adr/0012-local-test-history.md` | constraint, met by fact 26 |

No rule in the repo is broken by either feature as specified.

## Code conflicts

- `src/modules/speedtest/ui/screens/ResultScreen.tsx:86-103`: the action row holds four buttons in a left column of about 1012 px (`:136-137`, `:158`, screen padding in `src/shared/ui/ScreenLayout.tsx`). A fifth needs about 1060 px, and the column has no height left for a second row. Decision 10 replaces the Back button (`:100`). The `onBack` prop (`:31`) and its wiring in `src/app/navigation/ResultRoute.tsx:38,60` become unused and are removed.
- `src/modules/verdict/domain/evaluate.ts:19-26`: `Outcome` and `StreamCheckId` are closed unions for the generic verdict. Service rows do not fit them, so they need a parallel pure function, not an extension of `evaluate()`.
- `CLAUDE.md:61`: `verdict/` is pure TypeScript, so the Services screen cannot live there. It goes to `src/modules/speedtest/ui/screens/`.
- `.claude/rules/speedtest.md:44-45`: thresholds and table tests change together, and the six design scenarios must stay as test cases.
- `src/modules/speedtest/engines/ndt7/measurements.ts:16,27-29`: RTT samples are stored in arrival order, and native events can arrive out of order (`:59-60`). Consecutive-difference jitter needs measurement order. Server samples have `elapsedMs` (`src/modules/speedtest/engines/ndt7/protocol.ts:18`). Device samples carry only `minRttMs` and `rttMs` (`src/modules/speedtest/engines/ndt7native/nativeEvents.ts:95`), so their time has to come from the event's `elapsedMs` (`nativeEvents.ts:27`).
- `src/modules/speedtest/engines/ndt7native/NativeNdt7Engine.ts:183`: loaded latency falls back to idle when there are no RTT samples. Jitter has no such fallback, which is why `jitterMs` is optional.
- `src/modules/speedtest/ui/screens/LatencyScreen.tsx:42-54,80-81`: the right column is about 804 px wide and holds two cards in a row. Three cards get about 257 px each, so the card layout needs checking on a device.
- `docs/ARCHITECTURE.md:154-161`: the documented `SpeedTestResult` already lacks `latencySource` (`src/modules/speedtest/domain/engine.ts:27`). Fix it together with adding `jitterMs`.
- `CLAUDE.md:35`: "One branch per change" against decision 12. The developer chose one document, so both features go on one branch.
- `CLAUDE.md:62`: "Only consent is persisted" is stale, since history is persisted too. Not touched here.

## Modules to update

Per-service verdicts:

- `src/modules/verdict/domain/` (new service table and pure function; `thresholds.ts` is reused, not changed)
- `src/modules/verdict/content.ts`
- `src/modules/verdict/index.ts`
- `src/modules/speedtest/ui/screens/ServicesScreen.tsx` (new)
- `src/modules/speedtest/ui/screens/ResultScreen.tsx`
- `src/modules/speedtest/content.ts`
- `src/modules/speedtest/index.ts`
- `src/app/navigation/routes.ts`
- `src/app/navigation/RootNavigator.tsx`
- `src/app/navigation/ServicesRoute.tsx` (new)
- `src/app/navigation/ResultRoute.tsx`
- `src/app/selectors.ts`
- `test/modules/verdict/domain/` (new table tests), `test/modules/verdict/content.test.ts`
- `test/modules/speedtest/ui/screens/ResultScreen.test.tsx`, `ServicesScreen.test.tsx` (new)
- `test/app/navigation/RootNavigator.test.tsx`

Jitter:

- `src/modules/speedtest/engines/ndt7/measurements.ts`
- `src/modules/speedtest/engines/ndt7/stats.ts`
- `src/modules/speedtest/engines/ndt7native/NativeNdt7Engine.ts`
- `src/modules/speedtest/domain/engine.ts`
- `src/modules/verdict/domain/` (jitter levels), `src/modules/verdict/content.ts`, `src/modules/verdict/index.ts`
- `src/modules/speedtest/ui/screens/LatencyScreen.tsx`, `src/modules/speedtest/ui/components/LatencyStatCard.tsx`
- `src/modules/speedtest/content.ts`
- `test/modules/speedtest/engines/ndt7/measurements.test.ts`
- `test/modules/speedtest/engines/ndt7native/NativeNdt7Engine.test.ts`
- `test/modules/speedtest/ui/screens/LatencyScreen.test.tsx`, `test/modules/speedtest/ui/components/LatencyStatCard.test.tsx`
- `test/support/fakeEngine.ts`, `test/support/fixtures/ndt7.ts`

Shared:

- `docs/ARCHITECTURE.md`
- `docs/adr/0013-*.md` (new) and `docs/adr/README.md`
- `.claude/rules/speedtest.md`
- `.changeset/*.md` (new)

Both features edit `verdict/content.ts`, `verdict/index.ts`, `speedtest/content.ts` and `docs/ARCHITECTURE.md`, so their tasks cannot run in parallel on those files.

## Out of scope

- Retransmits, packet loss, DNS timing and any probe of a streaming service's servers.
- Any change to the native module, the manifest or the dependencies.
- Jitter in History, history trends or charts, and jitter affecting the lag grade.
- A longer stability test (60 to 120 s).
- A Services entry on Home, service logos, HDR or Dolby Vision tiers, updating the table over the network, and a headline derived from the service table.
- The other shortlisted candidates: troubleshooting tips, comparison with the previous test or an ISP plan, QR sharing, Wi-Fi diagnostics, background tests, localization, server choice, gaming and video-call verdicts.
- Ads (`feat/ads-cards`), GitHub issues #30 and #31, and the stale line `CLAUDE.md:62`.
