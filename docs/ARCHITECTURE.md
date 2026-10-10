# Architecture

## 1. Overview

StreamReady is an open-source Fire TV app for Vega OS. It answers the question "Will my TV stream in 4K?" by measuring download, upload, idle latency and latency under load. The result is shown as a plain-language streaming verdict, not just raw megabits.

**In scope (v1):**
- Screens: Splash, Privacy (consent modal and policy view), Home, Test (with the Stop dialog and the error overlay), Result, Latency ("Why it lags"), Device & connection.
- Speed measurement with M-Lab ndt7, implemented in a C++ Turbo Module over plain `ws://`.
- Connection insights (public IP, country, city, ISP) and device information.
- English only. Single session, with no test history.

**Out of scope (v1):** ads, Pro, IAP and the Tips screen, test history, stability test, QR sharing, commercial measurement backends, localization.

**Constraints:**
- **Open source** (Apache-2.0): no secrets, tokens or personal data in the repo.
- **Extensible:** new measurement backends plug in behind `SpeedTestEngine`, new geo-IP sources behind `GeoIpProvider`.
- **Low-end hardware:** the target is a 1 GB RAM stick with Wi‑Fi 5. Memory stays flat during tests, and re-renders are throttled.

## 2. Project structure

```
src/
  app/
    App.tsx
    navigation/            # RootNavigator, routes.ts (typed params), consent gate
    layout/                # AppHeader (composes insights + network status)
    providers/             # dependency injection: engine, geo provider, storage
    config/                # public endpoints, cooldown, timeouts
    selectors.ts           # cross-module selectors, e.g. selectVisibleInsights
  modules/
    privacy/               # consent store (persisted), policy content, PrivacyScreen
    speedtest/
      domain/              # SpeedTestEngine, EngineEvent, SpeedTestResult, SpeedTestError, units, canStartTest
      engines/ndt7/        # locate.ts, download.ts, upload.ts, protocol.ts, Ndt7Engine.ts
      store/               # sessionStore
      ui/                  # TestScreen, ResultScreen, LatencyScreen + components
    verdict/               # pure: thresholds, evaluate(), grade(), formatters, copy
    insights/              # GeoIpProvider + providers, device adapters, insightsStore, DeviceScreen
    home/                  # HomeScreen
  shared/
    ui/                    # tokens, scale(), Text, FocusButton, FocusCard, Dialog, ScreenLayout
    lib/                   # http (timeout + AbortSignal), format, logger, storage adapter
test/                      # mirrors src/ 1:1
  support/                 # FakeNdt7Native, fixtures, renderWithProviders, store reset helpers
assets/fonts/              # Geist, Geist Mono + OFL license (Vega loads fonts from the app root)
```

Each module exposes its public API through `index.ts`. Not every module needs every folder.

## 3. Dependency rules

- Dependencies flow `app → modules → shared`. `shared` never imports from `modules` or `app`.
- A module imports another module only through that module's `index.ts` (`~/modules/<name>`). Deep imports are forbidden.
- Code in `domain/` folders and in `verdict/` is pure TypeScript and never imports `react`, `react-native` or `@amazon-devices/*`.
- Only `app/` composes several modules (header, selectors, navigation).
- Side effects (network, storage, device APIs) are injected through interfaces, so tests can replace them.

ESLint enforces the import rules (see `.eslintrc`).

## 4. State

Zustand, one store per module.

| Store | State | Persisted |
|---|---|---|
| `privacy/consentStore` | `status: 'pending' \| 'accepted' \| 'withdrawn'` | yes (only this key) |
| `insights/insightsStore` | `connection?`, `device?`, `status: 'idle' \| 'loading' \| 'ready' \| 'error'` | no |
| `speedtest/sessionStore` | phase, live values, throttled samples, `result?`, `error?`, `cooldownUntil?` | no |
| `app` network status | `online`, `transport: 'wifi' \| 'ethernet' \| 'unknown'` | no |

Stores never import other modules' stores. Anything derived from several stores goes in `app/selectors.ts`.

## 5. App flow

### 5.1 Cold start

1. The splash screen shows while the persisted consent loads.
2. If consent is `pending` or `withdrawn`, the splash hides and the Privacy modal shows. A user who leaves the app with consent withdrawn sees the modal again on the next launch.
3. If consent is `accepted`, the app fetches insights. The splash hides when that fetch settles, whether it succeeds or fails. The fetch has a hard timeout of about 5s.

### 5.2 Consent

- **Accept** (the only action on first launch; there is no Decline):
  1. The button shows a loader while insights are fetched.
  2. Whatever the fetch outcome, consent becomes `accepted` and the app navigates to Home.
- **Withdraw** (on the Privacy screen, opened from Home):
  - Consent becomes `withdrawn`.
  - Insights are hidden but stay in the store.
  - Start is disabled with the hint "Privacy consent withdrawn".
- **Give consent again:** cached insights show immediately and are refreshed in the background.
- **Back key:** on the cold-start Privacy gate, Back falls through to the system and exits the app.

### 5.3 Insights visibility

`selectVisibleInsights` returns the insights only when consent is `accepted`. It is the only way the UI reads insights.

If the geo fetch fails, geo insights are not rendered at all: the header shows no country and no IP, and the Device screen drops the Public IP and Country rows. Device-local rows always render.

### 5.4 Starting a test

`canStartTest({consent, online, cooldownUntil, now})` returns `{ok: true}` or `{ok: false, reason: 'consent' | 'offline' | 'cooldown'}`. The reason drives the Start hint:

| Reason | Start shows |
|---|---|
| `offline` | "You are offline" |
| `consent` | "Privacy consent withdrawn" |
| `cooldown` | A "Next test in 0:ss" countdown |

The cooldown is 30s and starts only after a successful test.

### 5.5 Navigation and Back key

The app uses a native stack (`@amazon-devices/react-navigation__native-stack`) with the screens Home, Test, Result, Latency, Device and Privacy. Privacy has two modes: `gate` (cold start, Accept only) and `view` (opened from Home). Accepting from the gate resets the stack to Home. Module screens take callbacks as props; route adapters in `app/navigation/` wire them to the stack.

| Where | Back does |
|---|---|
| Test | Opens the Stop dialog |
| Stop dialog | Resumes the test |
| Error overlay | Goes Home |
| Result | Goes Home |
| Privacy (gate) | Falls through to the system |
| Other screens | Pops the stack |
| Home | Falls through to the system |

## 6. Speed test engines

### 6.1 Contract

```ts
interface SpeedTestEngine {
  readonly id: string;
  run(opts: {signal: AbortSignal; onEvent: (e: EngineEvent) => void}): Promise<SpeedTestResult>;
}

type EngineEvent =
  | {type: 'phase'; phase: 'locating' | 'latency' | 'download' | 'upload'}
  | {type: 'server'; server: ServerInfo}
  | {type: 'throughput'; direction: 'download' | 'upload'; bps: number; elapsedMs: number}
  | {type: 'latency'; idleMs?: number; loadedMs?: number};

interface SpeedTestResult {
  downloadBps: number;
  uploadBps: number;
  idleLatencyMs: number;
  loadedLatencyMs: number;
  server: ServerInfo;
  finishedAt: number;
}
```

Failures reject with `SpeedTestError`, which carries one of these codes:
`locate_failed | no_servers | connect_failed | network_lost | timeout | protocol | aborted`.

Throughput is measured in bits/s inside the engine. Values are converted to Mbps only for display.

### 6.2 ndt7 pipeline

The only engine is `NativeNdt7Engine` (ADR 0006): TypeScript runs Locate and computes results, and the `Ndt7Native` C++ Turbo Module moves the bytes. Vega's JS `WebSocket` cannot run ndt7 reliably on the stick (ADR 0002 amendment).

1. **Locate:**
   - `GET https://locate.measurementlab.net/v2/nearest/ndt/ndt7?client_name=streamready&client_version=<appVersion>`.
   - The response lists servers with signed `ws:///ndt/v7/download` and `ws:///ndt/v7/upload` URLs. The engine uses plain `ws://` on port 80: the device has no TLS library apps can use.
   - If connecting fails, the engine tries the next server, up to 3 servers in total.
   - The signed URLs contain `access_token`, so they are never logged, not even by native code.
2. **Latency step** (shown as "Ping" in the UI): covers the Locate call and opening the download socket.
3. **Native subtest:** `Ndt7Native.start(runId, 'download' | 'upload', url)` spawns one worker thread per subtest. The worker:
   1. resolves the host (IPv4/IPv6) and connects within 5 s, splitting the time across addresses
   2. performs the WebSocket handshake (subprotocol `net.measurementlab.ndt.v7`, `Sec-WebSocket-Accept` checked)
   3. runs the subtest on a blocking socket and emits `ndt7native` events about every 250 ms: `{runId, seq, type: 'progress' | 'done', bytes, elapsedMs, measurements, error?}`. Each event carries the server measurement texts received since the previous one; `done` repeats the totals.
   - `emit()` keeps no order across calls. A late event still adds its measurements, and `done` waits up to 250 ms for events still in flight.
   - A JS watchdog (30 s download, 25 s upload) fails the subtest with `timeout` if `done` never arrives.
4. **Download:** counts binary bytes without keeping them, answers pings, and ends at the server's close frame. The 15 s safety timeout gives `timeout`; 7 s without data gives `network_lost`.
5. **Upload:** sends masked binary frames from one pre-filled 1 MiB random buffer. Sizes start at 8 KiB and double while the size is at most 1/16 of the bytes sent, up to 1 MiB. The blocking send is the backpressure. After 10 s the client sends a close frame and collects the final measurements.
6. **Final values:** TypeScript parses measurements with `parseMeasurement` (`DownloadLatency`, `UploadRate`).

| Value | Source |
|---|---|
| Download | Total bytes over total time, the same as the M-Lab reference client |
| Upload | The last server measurement, `TCPInfo.BytesReceived / ElapsedTime` |
| Idle latency | `MinRTT` |
| Loaded latency | Median download `RTT` |

The engine uses a single stream, as the ndt7 design intends. Protocol reference: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md

Code layout: `kepler/ndt7/core` (pure, host-tested), `kepler/ndt7/net` (POSIX sockets, host-tested over `socketpair`), `kepler/turbo-modules` (glue). Run `pnpm run test:native` for the host C++ tests.

### 6.3 Integration

- `app/providers/speedTestEngine.ts` builds `NativeNdt7Engine` with its dependencies (native module, event emitter, `fetch`, `now`). If the native module is missing, every run fails with `connect_failed`.
- The session store throttles engine events to about 4 Hz before React sees them. Each throttled sample becomes one bar in the chart, up to 120 bars.
- Stop test calls `AbortController.abort()`, which calls `Ndt7Native.cancel` (the socket is shut down) and rejects with `aborted`. The UI then returns Home silently.
- If the app goes to the background mid-test, the test is aborted silently.

## 7. Connection insights and device information

- `GeoIpProvider.lookup(signal): Promise<ConnectionInfo>`, where `ConnectionInfo = {ip, countryCode, country, city?, isp?}`.
- `fallbackChain([ipinfo, geojs])`:
  - Primary: `https://ipinfo.io/json`.
  - Fallback: `https://get.geojs.io/v1/ip/geo.json`.
  - Neither needs a token. Rate limits apply per client IP, so one fetch per launch is fine.
- Insights are never fetched before consent.

Device screen rows:

| Row | Source |
|---|---|
| Model | Vega device API |
| System | Vega device API |
| Connection | Transport and Wi‑Fi band |
| Public IP | Geo insights (only if visible) |
| Country | Geo insights (only if visible) |
| Device limit | Static table keyed by model; "—" if the model is unknown |
| Free memory | Vega device API |
| App version | App metadata |

A row whose data the platform doesn't expose is omitted.

## 8. Verdict

### 8.1 Rules

```ts
STREAM_CHECKS = [
  {id: 'hd',    label: 'HD 720p',            minMbps: 3},
  {id: 'fhd',   label: 'Full HD 1080p',      minMbps: 5},
  {id: 'uhd',   label: '4K Ultra HD',        minMbps: 25},
  {id: 'uhd2x', label: 'Two 4K TVs at once', minMbps: 50},
];
// bloat = loadedLatencyMs − idleLatencyMs
LAG_GRADES: <30 A, <60 B, <200 C, <400 D, otherwise F
```

**Tier** is based on download speed:

| Download | Tier |
|---|---|
| ≥ 25 Mbps | `good` |
| ≥ 5 Mbps | `limited` |
| Lower | `poor` |

If the tier is `good` and the lag grade is D or F, the tier drops to `limited`.

**Tones:**
- Tier: `good` is lime, `limited` is amber, `poor` is coral.
- Grade: A and B are lime, C is amber, D and F are coral.

**`nearDeviceLimit`** is true only when the device limit is known, the transport is Wi‑Fi, and download ≥ 60% of the limit.

**Number format:** values ≥ 100 are rounded to whole numbers. Values below 100 show 1 decimal.

### 8.2 Copy

| Case | Headline | Sub |
|---|---|---|
| good, dl ≥ 50 | Ready for 4K. | Two 4K streams at once, no buffering expected. Your connection is in great shape. |
| good, 25 ≤ dl < 50 | Ready for 4K. | One 4K stream runs smoothly. A second 4K TV at the same time may buffer. |
| downgraded by lag (dl ≥ 25, grade D/F) | Fast, but laggy. | Speed is enough for 4K, but delay spikes when your network is busy. That can still cause stalls — see Why it lags. |
| limited | Full HD, yes. 4K may buffer. | Speed is enough for 1080p. For 4K, move the stick closer to the router or switch to 5 GHz. |
| poor, dl ≥ 3 | HD only. Full HD may buffer. | Only HD is likely to play smoothly. Your Wi‑Fi is overloaded or too weak where the TV is. |
| poor, dl < 3 | Streaming will buffer. | Even HD needs more. Your Wi‑Fi is overloaded or too weak where the TV is. |

Latency screen headlines:

| Grade | Headline |
|---|---|
| A or B | "Grade {g}. Smooth, even when busy." |
| C | "Grade C. Lag spikes when busy." |
| D or F | "Grade {g}. This is why it stalls." |

The 6 design scenarios (`good`, `goodSingle4K`, `fastButLaggy`, `limited`, `poorHdOnly`, `poor`) serve as the reference test cases.

## 9. UI

- **Tokens** live in `shared/ui/tokens.ts`:

| Token | Values |
|---|---|
| Background | `#0B0C0E` |
| Surface | `#15171B` |
| Borders | `#22252A`, `#2A2E34` |
| Text | `#F2F2EE` |
| Muted text | `#8E929A`, `#A4A8AF`, `#C4C7CC` |
| Lime | `#C8F560` |
| Amber | `#FFC24B` |
| Coral | `#FF7A66` |
| Offline red | `#FF4D4D` |
| Radii | 20 / 24 / 28 / pill |
| Fonts | Geist, Geist Mono |

- **Scale:** the design is drawn at 1920×1080. `scale(px)` converts design pixels using the window width, so values are copied 1:1 from the design.
- **Focus:**
  - Primitives (`FocusButton` in primary and secondary variants, `FocusCard`) are built on Vega focus management.
  - Focused style: 3px lime border, scale 1.05. Primary buttons fill lime.
  - Disabled-but-focusable style: grey, scale 1.03, and pressing does nothing.
- **Initial focus:**

| Screen | Initial focus |
|---|---|
| Home | Start |
| Result | Test again |
| Privacy (pending) | Accept |
| Privacy (decided) | Back |
| Stop dialog | Keep testing |
| Error overlay | Try again |

- **Animations** use `Animated` with the native driver. The bar chart is plain `View`s with no chart library.
- **No error codes:** technical error details never appear in the UI.

### 9.1 Test error overlay

The overlay uses the same component as the Stop dialog (`shared/ui/Dialog`).

On error:
- The test freezes: live values and bars are kept, and the animations stop.
- Buttons are "Try again" (primary) and "Back to home".
- A failure doesn't start the cooldown.

| UI variant | Codes | Title | Body |
|---|---|---|---|
| `connectionLost` | `network_lost`, or offline during the test | Connection lost. | Your TV dropped off the internet during the test. Check your Wi‑Fi or network cable, then try again. |
| `serversUnavailable` | `locate_failed`, `no_servers` | Test servers are busy. | We couldn't reach a test server right now. This usually clears up in a minute. |
| `interrupted` | `connect_failed`, `timeout`, `protocol` | The test didn't finish. | Something interrupted the measurement before we got a reliable result. Running it again usually works. |

While the device is offline, `connectionLost` shows a disabled Try again and the hint "Waiting for connection…". `aborted` is never shown in the UI. Error codes go only to the dev logger.

## 10. Testing

- Tests live in `test/`, mirroring `src/`, named `*.test.ts(x)`.
- Cover the essential parts first: `verdict/` (table tests over the 6 design scenarios and every threshold boundary), `speedtest/domain/`, `speedtest/engines/` (`FakeNdt7Native`, sanitized M-Lab fixtures; native code via `pnpm run test:native`), stores, and key screen flows with React Native Testing Library. There are no coverage thresholds for now.
- Screen flows to cover: cold start (pending, accepted, withdrawn), accept including a failed insights fetch, withdrawing consent, the Stop dialog, the 3 error variants, the cooldown.
- No snapshot tests. No real network, timers or device APIs in tests.
- Fixtures use documentation IPs (`203.0.113.0/24`, `2001:db8::/32`), fake UUIDs, and no `access_token` values.
- D-pad focus and real-device behavior are checked manually with [qa-checklist.md](qa-checklist.md).

## 11. Decisions

- [0001 Modular domain architecture](adr/0001-modular-domain-architecture.md)
- [0002 ndt7 as the first speed test engine](adr/0002-ndt7-first-speed-test-engine.md)
- [0003 Zustand for state management](adr/0003-zustand-state-management.md)
- [0004 Tokenless geo-IP providers](adr/0004-tokenless-geo-ip-providers.md)
- [0005 Consent-gated insights](adr/0005-consent-gated-insights.md)
