# 0006. Native ndt7 engine (C++ Turbo Module)

- Status: Accepted
- Date: 2026-10-10

## Context

ADR 0002's amendment records why the TypeScript engine cannot work reliably on a Fire TV stick. Vega's JS `WebSocket` is backed by the device's libcurl 8.4.0, whose WebSocket support was still experimental. Download moves about 300 base64-decoded messages per second through the JS thread and freezes the UI. Upload fails with `CURLE_SEND_ERROR` and has crashed the app with `SIGSEGV` inside `libcurl.so.4`. `bufferedAmount` is never updated, so there is no backpressure.

M-Lab's Go reference client uses blocking writes on its own goroutine, which gives real backpressure. Vega Turbo Modules let an app ship C++ that runs on its own threads and sends events to JS with `emit()`.

The SDK has no TLS library for apps on the device: OpenSSL is not in the sysroot. M-Lab Locate v2 also returns plain `ws://` URLs, and the servers accept them on port 80.

## Decision

- Add an in-app C++ Turbo Module, `Ndt7Native` (`libStreamReadyNdt7.so`, `linkDynamic: true`, autolinked from `react-native.config.js`). It implements the WebSocket client (RFC 6455) and the ndt7 download and upload loops, and uses no third-party library.
- Use plain `ws://` on port 80. TLS, for example a bundled mbedTLS, is a separate future decision that needs its own ADR and dependency approval.
- Run one worker thread per subtest with a blocking POSIX socket and 250 ms send/receive slices.
  - Upload sends one whole frame per blocking send, then drains server messages without waiting.
  - Cancel sets a flag and calls `shutdown()` on the socket.
- Native code counts bytes and time and forwards server measurement texts unparsed, about every 250 ms. It forwards every text since the last event, because loaded latency is the median of all RTT samples. TypeScript keeps Locate, measurement parsing and all result logic, shared with the TypeScript engine.
- `NativeNdt7Engine` implements `SpeedTestEngine`, so UI, stores and verdict don't change. `SpeedTestResult.engineId` records which engine ran.
- Engine selection:
  - Use native when the module loads, otherwise the TypeScript engine.
  - Within one test, `FallbackEngine` switches to the TypeScript engine only before the native engine reached a server or moved download data, and only for `connect_failed` (module call failed, or every server's port 80 was unreachable) or `no_servers` (no `ws://` URLs).
  - Any later failure is reported as-is.
- `emit()` keeps no order across calls, so events carry a `seq`. A late event still contributes its measurements. JS also guards each subtest with a watchdog (30 s download, 25 s upload) in case a `done` event is lost.
- Signed URLs never appear in native logs, exceptions or events.

## Consequences

- Plain `ws://` sends the test traffic and the signed URL unencrypted. Test payloads are random bytes and measurements are published by M-Lab anyway, but a network path can see or alter them. A TLS engine would remove this.
- Networks that block outbound port 80 fall back to the TypeScript engine (wss), with its known limits on the stick.
- The repo now has a native build:
  - CMake through the Vega CLI, for armv7, aarch64 and x86_64.
  - Committed codegen output in `kepler/turbo-modules/generated/`.
  - Host C++ tests (`pnpm run test:native`, in `check` and CI) for everything except the Turbo Module glue.
- The manifest declares `com.amazon.networking`.
- The TypeScript engine stays as the fallback and as the Jest reference.
