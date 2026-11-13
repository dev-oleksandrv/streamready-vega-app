Discovery: docs/discovery/0001-service-verdicts-and-jitter.md
Security review: required (discovery says `Security findings: yes`)

The Security attacker therefore reviews every wave diff during `/ship` (rules.md), against the discovery's security findings: bundled table only, `official` figures traceable to a source comment, parsed numbers only (no raw measurement text kept or logged), no new network host, nothing new persisted.

# Plan: per-service verdicts and jitter

Two display features built on data the app already measures. Pure TypeScript: no change in `kepler/`, codegen output, `manifest.toml` or `package.json` dependencies; no new network host; nothing new persisted. One branch, one minor changeset.

## Settled during planning

These replace or sharpen discovery facts. Workers follow this section where it differs from the discovery.

1. **Service table (discovery fact 4), checked 2026-11-13.** Official pages opened during planning: Netflix, YouTube, Apple TV. HBO Max figures come from its help articles (the discovery opened 000002519; 000002523 gives the 4K minimum). The Disney+ page rendered empty and the Prime Video page returned HTTP 503, so under fact 3 they stay `typical`. `typical` values are read from `STREAM_CHECKS` (`hd` 3, `fhd` 5, `uhd` 25), never copied as numbers.

   | Service | HD 720p | Full HD 1080p | 4K | Source comment |
   |---|---|---|---|---|
   | Netflix | 3 official | 5 official | 15 official | `https://help.netflix.com/en/node/306`, checked 2026-11-13 |
   | Prime Video | typical | typical | typical | no official figure confirmed (page unreachable 2026-11-13) |
   | YouTube | 2.5 official | 5 official | 20 official | `https://support.google.com/youtube/answer/78358`, checked 2026-11-13 |
   | Disney+ | typical | typical | typical | Help Center figures not confirmed on 2026-11-13 |
   | Apple TV | typical | typical | 25 official | `https://support.apple.com/en-us/HT207949`, checked 2026-11-13 |
   | HBO Max | typical | 5 official | 25 official | HD: `https://help.hbomax.com/us/Answer/Detail/000002519`; 4K minimum: `https://help.hbomax.com/us/Answer/Detail/000002523`, checked 2026-11-13 |

   HBO Max 4K is **25 Mbps**, not the discovery's 50: the developer chose the published minimum (25) over the "best 4K" recommendation (50+), since the screen says the figures are published minimums. Display name "Apple TV" is confirmed on Apple's page (fact 6).
2. **ADR number.** `0013` is taken (`docs/adr/0013-vast-ads.md`); the new ADR is `docs/adr/0014-service-streaming-figures.md`.
3. **Jitter copy lives in `verdict/content.ts`** (card label, level labels, explanation sentence), next to `latencyHeadline`. This keeps `speedtest/content.ts` owned by one task in wave 2.
4. **Jitter order key.** Server samples are ordered by their `TCPInfo.ElapsedTime` (`TcpSample.elapsedMs`), device samples by the native event's `elapsedMs`. Samples without a time count for the loaded median but not for jitter. Ties keep arrival order (stable sort).
5. **Level from the shown value.** The jitter level is computed from `Math.round(jitterMs)`, as `formatMs` shows it, so a shown "10" is Uneven (same idea as `shownMbps`).
6. **Top tier row.** A row whose best tier is 4K has no "next" line.

## File map

| Task | Files | Modules |
|---|---|---|
| W1-T1 | `src/modules/verdict/domain/shownMbps.ts` (new), `src/modules/verdict/domain/evaluate.ts`, `src/modules/verdict/domain/services.ts` (new), `src/modules/verdict/domain/serviceVerdicts.ts` (new), `src/modules/verdict/domain/jitter.ts` (new), `src/modules/verdict/content.ts`, `src/modules/verdict/index.ts`, `test/modules/verdict/domain/shownMbps.test.ts` (new), `test/modules/verdict/domain/services.test.ts` (new), `test/modules/verdict/domain/serviceVerdicts.test.ts` (new), `test/modules/verdict/domain/jitter.test.ts` (new), `test/modules/verdict/content.test.ts` | verdict |
| W1-T2 | `src/modules/speedtest/domain/engine.ts`, `src/modules/speedtest/engines/ndt7/stats.ts`, `src/modules/speedtest/engines/ndt7/measurements.ts`, `src/modules/speedtest/engines/ndt7native/NativeNdt7Engine.ts`, `test/modules/speedtest/engines/ndt7/stats.test.ts`, `test/modules/speedtest/engines/ndt7/measurements.test.ts`, `test/modules/speedtest/engines/ndt7native/NativeNdt7Engine.test.ts`, `test/support/fakeEngine.ts`, `test/support/fixtures/ndt7.ts` | speedtest (domain, engines), test/support |
| W2-T1 | `src/modules/speedtest/ui/screens/ServicesScreen.tsx` (new), `src/modules/speedtest/ui/components/ServiceRow.tsx` (new), `src/modules/speedtest/ui/screens/ResultScreen.tsx`, `src/modules/speedtest/content.ts`, `src/modules/speedtest/index.ts`, `src/app/selectors.ts`, `src/app/navigation/routes.ts`, `src/app/navigation/RootNavigator.tsx`, `src/app/navigation/ServicesRoute.tsx` (new), `src/app/navigation/ResultRoute.tsx`, `test/modules/speedtest/ui/screens/ServicesScreen.test.tsx` (new), `test/modules/speedtest/ui/components/ServiceRow.test.tsx` (new), `test/modules/speedtest/ui/screens/ResultScreen.test.tsx`, `test/app/selectors.test.ts`, `test/app/navigation/RootNavigator.test.tsx` | speedtest (ui, content, index), app |
| W2-T2 | `src/modules/speedtest/ui/screens/LatencyScreen.tsx`, `src/modules/speedtest/ui/components/LatencyStatCard.tsx`, `test/modules/speedtest/ui/screens/LatencyScreen.test.tsx`, `test/modules/speedtest/ui/components/LatencyStatCard.test.tsx` | speedtest (ui) |
| W3-T1 | `docs/ARCHITECTURE.md`, `docs/adr/0014-service-streaming-figures.md` (new), `docs/adr/README.md`, `.claude/rules/speedtest.md`, `README.md`, `.changeset/<slug>.md` (new) | docs, changeset |

Overlap check:
- Wave 1: T1 is only `verdict/` and its tests; T2 is only `speedtest/domain`, `speedtest/engines` and `test/support`. No shared file; neither touches an `index.ts` the other touches (T2 does not change `speedtest/index.ts`: `SpeedTestResult` is already exported).
- Wave 2: T1 owns `speedtest/content.ts`, `speedtest/index.ts` and all of `app/`; T2 touches neither (its copy comes from `verdict/content.ts`, written in W1-T1, and from existing `testContent.latency`/`testContent.units`/`testContent.empty`). No shared file.
- Wave 3: one task; it is the only one touching docs and the changeset (hot spot).

## Wave 1

### W1-T1 — Verdict domain: service rows and jitter levels

**Description.** Add two pure functions and their data to `src/modules/verdict/` (no `react`/`react-native` imports, see `.claude/rules/architecture.md`).

1. *Shared rounding.* Move the private `shownMbps` out of `evaluate.ts` into `domain/shownMbps.ts` (exported), and import it back in `evaluate.ts`. Behaviour of `evaluate` does not change; existing `evaluate`/`grade` tests pass unmodified (fact 16).
2. *Service table* in `domain/services.ts`:
   - `ServiceId = 'netflix' | 'primeVideo' | 'youtube' | 'disneyPlus' | 'appleTv' | 'hboMax'`.
   - `ServiceTierId = Exclude<StreamCheckId, 'uhd2x'>` (`hd | fhd | uhd`), `FigureSource = 'official' | 'typical'`.
   - `ServiceTier {tier: ServiceTierId; minMbps: number; source: FigureSource}`.
   - `SERVICES: readonly {id: ServiceId; tiers: readonly ServiceTier[]}[]` in the fixed order Netflix, Prime Video, YouTube, Disney+, Apple TV, HBO Max (fact 1), tiers ascending HD → Full HD → 4K, values from "Settled during planning" item 1.
   - A `typical(tier)` helper reads the minimum from `STREAM_CHECKS` so generic thresholds are never duplicated (fact 3); `thresholds.ts` is not changed.
   - One comment per service above its entry with the source URL and the date checked (fact 3), as in the table above. No figure is `official` without such a comment.
3. *Row function* `serviceVerdicts(downloadBps: number): readonly ServiceVerdict[]` in `domain/serviceVerdicts.ts`:
   - `ServiceVerdict {id: ServiceId; best?: ServiceTier; next?: ServiceTier}`.
   - Uses `shownMbps(downloadBps)` (fact 7). `best` = highest tier with `minMbps <= shown`. `next` = the tier right above `best`; when no tier passes, `next` is the lowest tier; when `best` is 4K, `next` is undefined.
   - Download only: no latency input at all (fact 8). Non-finite or negative input behaves as 0 (as `shownMbps` does).
4. *Jitter level* in `domain/jitter.ts`:
   - `JitterLevel = 'steady' | 'uneven' | 'unstable'`.
   - Config `JITTER_LEVELS: readonly {level; underMs; tone}[] = [{steady, 10, good}, {uneven, 30, warn}]`, anything else `unstable` / `bad` (fact 23; comment: starting values, confirm in device QA).
   - `jitterLevel(jitterMs: number): {level: JitterLevel; tone: Tone}` uses `Math.round(jitterMs)` (settled item 5). Not used by `evaluate` (fact 25).
5. *Copy* in `content.ts`, added to `verdictContent`:
   - `services.names: Record<ServiceId, string>`: "Netflix", "Prime Video", "YouTube", "Disney+", "Apple TV", "HBO Max".
   - `services.tiers: Record<ServiceTierId, string>`: reuse the existing `checks` labels ("HD 720p", "Full HD 1080p", "4K Ultra HD").
   - `services.need(tier: ServiceTier)`: `official` → existing `needs(n)` ("Needs N Mbps"); `typical` → "Typically needs N Mbps" (fact 10). `N` prints as the number (`2.5`, `15`).
   - `services.next(tier: ServiceTier)`: "<tier label> · <need>", e.g. "4K Ultra HD · Needs 15 Mbps".
   - `services.none`: text for a row with no quality, e.g. "Not enough for HD".
   - `jitter.label` "Jitter", `jitter.levels: Record<JitterLevel, string>` "Steady" / "Uneven" / "Unstable", `jitter.explain`: one plain sentence, e.g. "Jitter is how much the delay jumps from moment to moment. Low jitter keeps video and live streams smooth." (fact 24).
6. *Public API* in `index.ts`: export `serviceVerdicts`, `SERVICES`, `jitterLevel`, `JITTER_LEVELS`, `LAGGY_GRADES` and the types `ServiceId`, `ServiceTierId`, `ServiceTier`, `FigureSource`, `ServiceVerdict`, `JitterLevel`.

Write the failing table tests first (`.claude/rules/testing.md`).

**Files.** See the file map row W1-T1.

**Depends on.** none

**Acceptance.**
- `SERVICES` lists the six ids in the fixed order; each has exactly three tiers `hd`, `fhd`, `uhd`, with non-decreasing `minMbps`; flags and values match the settled table exactly (table test over all 18 cells).
- Every `typical` tier's `minMbps` equals the matching `STREAM_CHECKS` entry.
- `serviceVerdicts` table test for every service: exactly at each tier minimum passes that tier; 0.1 Mbps under fails it (e.g. Netflix 15.0 → 4K, 14.9 → Full HD; YouTube 2.5 → HD, 2.4 → none); below the lowest tier gives `best` undefined and `next` = lowest tier; 4K gives `next` undefined. Input in bits/s, using the shown rounding (e.g. 14_960_000 bps shows "15.0" and passes Netflix 4K).
- `serviceVerdicts(NaN)`, `(-1)`, `(Infinity)` give no quality for every service.
- `jitterLevel` table test: 0, 9.4 → steady/good; 9.5, 10, 29.4 → uneven/warn; 29.5, 30, 500 → unstable/bad.
- Copy tests: `need` gives "Needs 15 Mbps" for official and "Typically needs 25 Mbps" for typical; "Needs 2.5 Mbps" for YouTube HD; six names as listed; three level labels.
- Existing `test/modules/verdict/domain/evaluate.test.ts` and `grade.test.ts` pass without edits; `thresholds.ts` is unchanged (`git diff` empty for it).
- No file under `src/modules/verdict/` imports `react` or `react-native`.

**Checks.** `pnpm run check`

### W1-T2 — Engine: jitter from download RTT samples

**Description.** Compute jitter in the ndt7 engine from the RTT samples `DownloadLatency` already collects (facts 19–22).

1. `stats.ts`: add `meanAbsDelta(values: readonly number[]): number | undefined` — mean of `|v[i] − v[i−1]|`; `undefined` for fewer than 3 values.
2. `measurements.ts`, `DownloadLatency`:
   - `add(sample: TcpSample, atMs?: number)`. Keep the existing `rtts` array (loaded median unchanged). Also keep `{rttMs, atMs, seq}` for samples where `rttMs` and a time are known; the time is `atMs ?? sample.elapsedMs`. Store numbers only, never the raw measurement text (security finding 2).
   - `jitterMs(): number | undefined`: sort the timed samples by time, ties by arrival `seq`, then `meanAbsDelta` of their RTTs (settled item 4).
   - `nextEvent()` is unchanged: no new `EngineEvent`, no live jitter (fact 21).
   - Memory: one small object per RTT sample, same order of magnitude as the existing `rtts` array (about 40 samples per 10 s download); note this in a comment only if non-obvious.
3. `NativeNdt7Engine.ts`: in `absorb`, pass the native event's `elapsedMs` for the device sample (`device.add(event.client, event.elapsedMs)`); server samples keep `latency.add(parseMeasurement(text))` (their time is `TcpSample.elapsedMs`). Add `jitterMs` to `DownloadOutcome` from the same `source` as loaded latency (fact 20) and put it on the result only when defined (omit the key otherwise; no fallback to idle, unlike loaded latency).
4. `domain/engine.ts`: `SpeedTestResult.jitterMs?: number` with a doc comment ("Mean change between consecutive RTT samples during download, ms; undefined with fewer than 3 samples. Same source as loaded latency.").
5. `test/support/fakeEngine.ts`: give `TEST_RESULT` a `jitterMs` (e.g. `4`) so screen and flow tests have one. `test/support/fixtures/ndt7.ts`: change only if a helper is needed (e.g. a measurement with `ElapsedTime`); keep documentation IPs and fake UUIDs.

Do not touch `parseMeasurement`/`TcpSample` fields (no new `TCPInfo` field, fact 22), `kepler/`, `nativeEvents.ts`, `HistoryEntry` or `selectHistoryEntry`.

**Files.** See the file map row W1-T2.

**Depends on.** none

**Acceptance.**
- `meanAbsDelta`: `[]`, `[5]`, `[5, 9]` → undefined; `[10, 20, 10]` → 10; `[10, 12, 9, 15]` → (2+3+6)/3.
- `DownloadLatency.jitterMs()` with samples added out of time order equals the value for the same samples in time order; ties keep arrival order; samples without a time are excluded from jitter but still count for `loadedMs()`; fewer than 3 timed samples → undefined.
- Existing `idleMs` / `loadedMs()` / `nextEvent()` tests pass unmodified.
- `NativeNdt7Engine` tests: a run with ≥ 3 server RTT samples resolves with the expected `jitterMs`; a VPN run (`detectTunnel` true, device samples present) uses device samples ordered by event `elapsedMs`, including a progress event delivered late (`fresh` false); a run with < 3 samples resolves without a `jitterMs` key; no new `EngineEvent` type is emitted.
- `test/app/providers/historyRecorder.test.ts` and `test/app/selectors.test.ts` pass unmodified; `HistoryEntry` has no `jitterMs` (fact 26).
- `git diff --stat` shows no change under `kepler/`, in `package.json` or `manifest.toml`.
- The engine logs nothing new that contains measurement text or URLs.

**Checks.** `pnpm run check`

## Wave 2

### W2-T1 — Services screen, Result action row, navigation

**Description.** Show the service rows on a new screen opened from Result (facts 9–15).

1. `app/selectors.ts`: `selectServicesView(result: SpeedTestResult, verdict: Verdict): {rows: readonly ServiceVerdict[]; laggy: boolean}` — `rows = serviceVerdicts(result.downloadBps)`, `laggy = LAGGY_GRADES.includes(verdict.grade)` (fact 9). Rows never depend on the grade (fact 8).
2. `speedtest/ui/components/ServiceRow.tsx` (memoized, not focusable): service name; quality = tier label of `best`, or `verdictContent.services.none`; second line `verdictContent.services.next(next)` when `next` exists, nothing when `best` is 4K (settled item 6). Text only, no logos (fact 11). Colors from `tokens.ts`, sizes with `scale()`.
3. `speedtest/ui/screens/ServicesScreen.tsx`: props `{rows, laggy, onBack}`. Layout follows `LatencyScreen` (left column: eyebrow, headline, disclaimer line, optional lag note, "Back to result" button with `hasTVPreferredFocus`; right column: six `ServiceRow`s). All six rows fit at 1920×1080 without scrolling (no `ScrollView`, fact 13). The only focusable element is the Back button.
4. `speedtest/content.ts`: add `testContent.services` (eyebrow e.g. "By service", headline e.g. "What each app can play.", `disclaimer` "Figures are each service's published minimums, or typical values where none is published. StreamReady is not affiliated with these services." (fact 11), `laggy` "Speed is enough, but lag can still cause stalls." (fact 9), `back` "Back to result"). Add `result.services` "Services". Remove `result.back` if nothing else uses it.
5. `ResultScreen.tsx`: action row becomes Test again, Services, Why it lags, History (fact 14). Remove the Back button and the `onBack` prop; add `onOpenServices`. Initial focus stays on Test again.
6. `speedtest/index.ts`: export `ServicesScreen` and `ServicesScreenProps`.
7. Navigation: `routes.ts` adds `Services: undefined`; `RootNavigator.tsx` registers it; `ServicesRoute.tsx` reads `result` from the session store and `useResultVerdict(result)`, returns `null` when either is missing (fact 15, like `LatencyRoute`), memoizes `selectServicesView`, `onBack = navigation.goBack()`. `ResultRoute.tsx`: drop `back`/`onBack`, add `openServices = navigation.navigate('Services')`. The hardware Back key on Result still goes Home through the stack; on Services it returns to Result.

**Files.** See the file map row W2-T1.

**Depends on.** W1-T1

**Acceptance.**
- `ServicesScreen` test: six names in the fixed order; for a 16 Mbps result Netflix shows "4K Ultra HD" with no next line, YouTube shows "Full HD 1080p" and "4K Ultra HD · Needs 20 Mbps", Prime Video shows "Full HD 1080p" and "4K Ultra HD · Typically needs 25 Mbps"; for 1 Mbps every row shows the none text and its HD need; the disclaimer line is shown; the lag note shows only when `laggy`; exactly one button ("Back to result") and pressing it calls `onBack`.
- `selectServicesView` test: grades D and F give `laggy` true, A–C false; rows are identical for the same download across all grades.
- `ResultScreen` test: buttons in order Test again, Services, Why it lags, History; no "Back" button; Services calls `onOpenServices`; existing assertions for headline, checks and focus still pass.
- `RootNavigator` test: Result → Services shows the six rows; the Back key returns to Result; "Back to result" returns to Result; the Back key on Result goes Home with the cooldown (replaces the old "Back button goes home" test); an existing Latency and History flow still passes.
- `ServicesRoute` renders nothing when the session has no result.
- No network call or storage write is added (no `fetch`, no storage import in the new files).

**Checks.** `pnpm run check`

### W2-T2 — Jitter card on the Latency screen

**Description.** Add a third card "Jitter" to "Why it lags" (facts 24–25).

1. `LatencyStatCard.tsx`: optional `caption?: string` and `captionColor?: string` shown under the reading (the level label in the tone color). Existing uses render as before.
2. `LatencyScreen.tsx`: third `LatencyStatCard` after "While downloading": label `verdictContent.jitter.label`; value `formatMs(result.jitterMs)` and unit `testContent.units.ms` when defined, `testContent.empty` ("—") and no caption when undefined; caption `verdictContent.jitter.levels[level]` in `toneColor(tone)` from `jitterLevel`. Add `verdictContent.jitter.explain` as one line under the cards or the body. Headline, grade scale, loaded-value color and Back behaviour do not change.
3. Fit three cards in the ~804 px right column: reduce card padding/value size only as much as needed so "999" + "ms" fits one line; keep `flex: 1`. The device check for this is in "Local QA checklist" below, not in this task.

**Files.** See the file map row W2-T2.

**Depends on.** W1-T1 (jitter copy and `jitterLevel`), W1-T2 (`SpeedTestResult.jitterMs`)

**Acceptance.**
- `LatencyScreen` test: `jitterMs: 4.4` shows "Jitter", "4", "Steady"; `12` shows "Uneven"; `45` shows "Unstable"; undefined shows "—" and none of the three labels; the explanation sentence is shown; the headline for the same verdict is unchanged with any jitter value.
- `LatencyStatCard` test: caption renders when given, absent otherwise.
- Only "Back to result" is focusable, with initial focus, as before.

**Checks.** `pnpm run check`

## Wave 3

### W3-T1 — Docs, ADR and changeset

**Description.** Bring the docs in line with the shipped code (fact 29) and add the changeset (fact 28).

1. `docs/ARCHITECTURE.md`:
   - §1 scope line 8: add Services; add jitter to the measured values where listed.
   - §3 module tree: `ServicesScreen` in `speedtest/ui`; `services`, `serviceVerdicts`, `jitter`, `shownMbps` in `verdict/domain`.
   - §5.5: stack includes Services (Home → Result → Services); Back table row "Services | Returns to Result".
   - Initial-focus table: "Services | Back to result".
   - §6.1 `SpeedTestResult`: add the missing `latencySource` and the new optional `jitterMs`.
   - Measurement steps (around line 187): jitter from `DownloadLatency`, order key, < 3 samples → undefined.
   - §8 verdict: service table policy (official/typical, shown rounding, next tier, lag note) and jitter levels (10/30 ms, tones, display only).
   - Result actions line (around 393): Test again, Services, Why it lags, History.
2. `docs/adr/0014-service-streaming-figures.md` (status Accepted, date of the commit): figures policy — `official` only with the service's own page URL and check date in a comment; otherwise the generic `STREAM_CHECKS` value labelled "Typically needs"; published minimum, not recommended, when both exist (HBO Max 25 vs 50); bundled, never fetched (security finding 1); text names only plus a non-affiliation line (security finding 3: Appstore trademark policy not checked, open); how to update a figure (change the table, the comment and the table tests together). Add it to `docs/adr/README.md`.
3. `.claude/rules/speedtest.md`: under ndt7 specifics, the jitter definition (mean absolute difference of consecutive RTT samples in measurement order, same source as loaded latency, undefined below 3 samples, display only); under Verdict, the service-table rule (official needs source URL + date; typical reads `STREAM_CHECKS`; update table, comment and tests together).
4. `README.md` feature list: add per-service verdicts and jitter.
5. `.changeset/<slug>.md`: `minor`, user-facing, both features, e.g. "See which quality Netflix, Prime Video, YouTube, Disney+, Apple TV and HBO Max can play at your speed on the new Services screen. 'Why it lags' now also shows jitter."

**Files.** See the file map row W3-T1.

**Depends on.** W1-T1, W1-T2, W2-T1, W2-T2

**Acceptance.**
- Every name, path, threshold and copy string in the updated docs matches the code on the branch.
- `docs/adr/README.md` lists 0014; the ADR follows the template in that README.
- The changeset is `minor` for `@voronkov/streamready` and names both features in plain words.
- `PRIVACY.md` and the in-app policy are unchanged; `test/privacyDoc.test.ts` passes untouched (fact 27).
- `CLAUDE.md` is not touched (stale line 62 is out of scope).

**Checks.** `pnpm run check`

## Local QA checklist (main checkout, after wave 3)

`docs/qa-checklist.md` is gitignored, so it does not exist in task worktrees and is not part of any task's `files`. After the last wave is merged, the orchestrator updates it in the main checkout (no commit):

- Line 23 (Module 5): initial focus on Test again; D-pad left/right moves Test again ↔ Services ↔ Why it lags ↔ History.
- Line 26: "Back key on Result → Home with 'Next test in 0:ss'" (there is no Back button any more).
- Line 49 (History): "Test again (with 'in 30s'), Services, Why it lags, History fit on one row, no clipping when focused (scale 1.05)".
- New section "Services and jitter": Services opens from Result with focus on Back to result; six rows fit at 1920×1080, nothing focusable but the button; Back key and Back to result return to Result with focus on a Result button; with grade D/F the lag note shows; Latency shows three cards on one row, "999 ms" and the level label fit without clipping; jitter values on a real stick look plausible for the 10/30 ms levels (VPN off and on).

## Docs to keep in sync

- [ ] `docs/ARCHITECTURE.md` (scope, module tree, §5.5 stack and Back table, initial focus, §6.1 `SpeedTestResult` incl. `latencySource`, measurement steps, §8 verdict, Result actions)
- [ ] `docs/adr/0014-service-streaming-figures.md` (new) and `docs/adr/README.md` index
- [ ] `.claude/rules/speedtest.md` (jitter definition, service-table rule)
- [ ] `README.md` feature list
- [ ] `.changeset/<slug>.md` (minor, both features)
- [ ] Local `docs/qa-checklist.md` (gitignored, main checkout only): see "Local QA checklist" above, including the stale Result lines 23, 26 and 49
- [ ] Unchanged on purpose: `PRIVACY.md`, in-app policy, `CLAUDE.md`, `HistoryEntry`

## Review

Rounds run: 2 (round 2 for the general role only).

Providers: general: codex (r1, r2); security: codex (r1).

Accepted findings:
- General, blocker: `docs/qa-checklist.md:23,26,49` would keep instructions for the removed Result Back button, and no task owned the checklist. Fixed with the "Local QA checklist" section: the orchestrator updates the gitignored file in the main checkout after wave 3. Closed in round 2.

Rejected findings:
- General, blocker: "no security review gate for the implementation". Already handled: the header says `Security review: required`, and rules.md has `/ship` run the Security attacker on every wave diff. One sentence under the header now spells this out.

Security: no findings.

Non-blockers left open:
- Amazon Appstore content policy on third-party trademark names was not checked (discovery security finding 3). The ADR records it as open.
- Disney+ and Prime Video ship as all `typical`: their help pages did not load on 2026-11-13. Switching them to `official` later means updating the table, the source comment and the table tests together (ADR 0014).
- The Services screen has no design file. Its layout follows the Latency screen and needs checking on a device.
- The jitter level thresholds (10 / 30 ms) are starting values, to be confirmed in device QA.
