---
paths:
  - "src/modules/speedtest/**"
  - "src/modules/verdict/**"
  - "test/modules/speedtest/**"
  - "test/modules/verdict/**"
  - "kepler/**"
  - "test/native/**"
---

# Speed test and verdict rules

## Engines

- Every engine implements `SpeedTestEngine` from `speedtest/domain`. The UI and store depend on the interface, never on `Ndt7Engine` directly.
- Engines are UI-agnostic: they emit `EngineEvent`s and resolve a `SpeedTestResult`. No React, no stores.
- Engines honor `AbortSignal`: on abort, close sockets, clear timers, reject with `SpeedTestError('aborted')`.
- Failures reject with `SpeedTestError` using the defined codes only: `locate_failed | no_servers | connect_failed | network_lost | timeout | protocol | aborted`. Adding a code requires updating the UI mapping and tests.
- Dependencies (`createSocket`, `fetch`, `now`) come in through the constructor.
- `NativeNdt7Engine` (ADR 0006) runs ndt7 in the `Ndt7Native` C++ Turbo Module over plain `ws://`. `FallbackEngine` switches to `Ndt7Engine` only before the native engine reached a server or moved download data, on `connect_failed` / `no_servers`. Selection lives in `app/providers/speedTestEngine.ts`.

## ndt7 specifics

- Locate: `https://locate.measurementlab.net/v2/nearest/ndt/ndt7` with `client_name` and `client_version`. Try up to 3 servers.
- WebSocket subprotocol `net.measurementlab.ndt.v7`, `binaryType = 'arraybuffer'`.
- Download: count bytes, never retain payloads. Idle latency = `TCPInfo.MinRTT`; loaded latency = median `TCPInfo.RTT`.
- Upload: 8 KiB → 16 KiB message scaling (capped at half the upload window; larger sends crash Vega's libcurl WebSocket), one send per tick, unconfirmed bytes within the upload window, smaller-window retry on `network_lost`, reuse pre-allocated buffers. Throughput from server `TCPInfo.BytesReceived / ElapsedTime`. Vega quirks: ADR 0002 amendment.
- Time-bounded: ~10 s per direction, 15 s safety timeout.
- Signed URLs contain `access_token`: never log them.
- Follow the ndt7 protocol spec: https://github.com/m-lab/ndt-server/blob/main/spec/ndt7-protocol.md

## Native engine (C++)

- `kepler/ndt7/core` is pure C++17: no sockets, no Kepler headers. `kepler/ndt7/net` uses POSIX only. Only `kepler/turbo-modules/` and `kepler/AutoLinkInit.cpp` include Kepler headers.
- TM methods run on the JS thread: never block in them. Workers call `emit()`; never `emitSync()` off the JS thread.
- Never log, throw or emit the URL. Native logs carry direction, error code and byte counts only.
- No third-party C++ libraries. Host tests: `pnpm run test:native` (in-repo harness, ASan/UBSan); add a test for every core or net change.
- `kepler/turbo-modules/generated/` is codegen output: regenerate with `pnpm run codegen:ndt7`, never edit by hand.
- Autolinking lives in `react-native.config.js` (the Vega CLI rejects it in `package.json`); keep `linkDynamic: true`.

## Verdict

- `verdict` is pure functions plus a config table. Thresholds and copy are data, not branches scattered in UI.
- Changing a threshold or copy: update `verdict` config/content and the table tests together.
- The 6 design scenarios (`good`, `goodSingle4K`, `fastButLaggy`, `limited`, `poorHdOnly`, `poor`) must stay as test cases.
