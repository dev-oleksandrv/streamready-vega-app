# 0006. Native ndt7 engine (C++ Turbo Module)

- Status: Accepted
- Date: 2026-10-10
- Supersedes: [0002](0002-ndt7-first-speed-test-engine.md)

## Context

ADR 0002's amendment records why the TypeScript engine cannot work reliably on a Fire TV stick. Vega's JS `WebSocket` is backed by the device's libcurl 8.4.0, whose WebSocket support was still experimental. Download moves about 300 base64-decoded messages per second through the JS thread and freezes the UI. Upload fails with `CURLE_SEND_ERROR` and has crashed the app with `SIGSEGV` inside `libcurl.so.4`. `bufferedAmount` is never updated, so there is no backpressure.

M-Lab's Go reference client uses blocking writes on its own goroutine, which gives real backpressure. Vega Turbo Modules let an app ship C++ that runs on its own threads and sends events to JS with `emit()`.

The SDK has no TLS library for apps on the device: OpenSSL is not in the sysroot. M-Lab Locate v2 also returns plain `ws://` URLs, and the servers accept them on port 80.

## Decision

- Kept from ADR 0002: M-Lab ndt7 behind the `SpeedTestEngine` interface, our own Locate v2 call trying up to 3 servers, one download and one upload stream of about 10 s each, the value sources (download = bytes over time, upload = server `BytesReceived / ElapsedTime`, idle = `MinRTT`, loaded = median `RTT`), the fixed `SpeedTestError` codes and cancellation through `AbortSignal`.
- The native engine is the only engine. The TypeScript WebSocket engine from ADR 0002 is removed: on the stick it froze the UI and crashed in libcurl, so it is no safe fallback.
- Add an in-app C++ Turbo Module, `Ndt7Native` (`libStreamReadyNdt7.so`, `linkDynamic: true`, autolinked from `react-native.config.js`). It implements the WebSocket client (RFC 6455) and the ndt7 download and upload loops, and uses no third-party library.
- Use plain `ws://` on port 80. TLS, for example a bundled mbedTLS, is a separate future decision that needs its own ADR and dependency approval.
- Run one worker thread per subtest with a blocking POSIX socket and 250 ms send/receive slices.
  - Upload sends one whole frame per blocking send, then drains server messages without waiting.
  - Cancel sets a flag and calls `shutdown()` on the socket.
- Native code counts bytes and time and forwards server measurement texts unparsed, about every 250 ms. It forwards every text since the last event, because loaded latency is the median of all RTT samples. TypeScript keeps Locate, measurement parsing and all result logic.
- `NativeNdt7Engine` implements `SpeedTestEngine`, so UI, stores and verdict don't change.
- If the native module is missing, every run fails with `connect_failed`.
- `emit()` keeps no order across calls, so events carry a `seq`. A late event still contributes its measurements. JS also guards each subtest with a watchdog (33 s download, 35 s upload) in case a `done` event is lost.
- Signed URLs never appear in native logs, exceptions or events.

## Consequences

- As in ADR 0002, M-Lab publishes every test, including the client IP. The privacy policy says so, and tests only run after consent.
- Plain `ws://` sends the test traffic and the signed URL unencrypted. Test payloads are random bytes and measurements are published by M-Lab anyway, but a network path can see or alter them. A TLS engine would remove this.
- Networks that block outbound port 80 (`ws://`) cannot run the test; it fails with `connect_failed` and the `interrupted` overlay. A TLS engine would remove this.
- The repo now has a native build:
  - CMake through the Vega CLI, for armv7, aarch64 and x86_64.
  - Committed codegen output in `kepler/turbo-modules/generated/`.
  - Host C++ tests (`pnpm run test:native`, in `check` and CI) for everything except the Turbo Module glue.
- The manifest declares `com.amazon.networking`.
- Jest tests the TypeScript side against a fake native module; there is no second engine to compare against.
