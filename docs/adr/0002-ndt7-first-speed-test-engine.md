# 0002. ndt7 as the first speed test engine

- Status: Accepted
- Date: 2026-10-09

## Context

The app needs free, globally available test servers from day one. M-Lab runs ndt7, an open WebSocket-based protocol with servers worldwide. The official JavaScript client relies on Web Workers, which React Native for Vega doesn't provide, so it can't be used directly. WebSocket with the `net.measurementlab.ndt.v7` subprotocol and binary messages has been tested on Vega and works. The target device has 1 GB RAM.

## Decision

- Measurement code depends on a `SpeedTestEngine` interface. `Ndt7Engine` is the first implementation.
- The engine implements ndt7 manually:
  - It finds servers with its own Locate API v2 call (`/v2/nearest/ndt/ndt7`) and tries up to 3 servers.
  - It uses one download stream and one upload stream, each limited to about 10s.
  - Download counts bytes without keeping payloads.
  - Upload reuses pre-allocated buffers from 8 KiB to 1 MiB and is throttled by `bufferedAmount`.
- Values come from:

| Value | Source |
|---|---|
| Idle latency | Server `TCPInfo.MinRTT` |
| Loaded latency | Median `TCPInfo.RTT` during download |
| Upload throughput | Server `BytesReceived / ElapsedTime` |
| Download throughput | Total bytes over total time |

- Failures use a fixed set of `SpeedTestError` codes, and cancellation goes through `AbortSignal`.

## Consequences

- M-Lab publishes every test, including the client IP, as open data. The privacy policy must say so, and tests only run after consent.
- Results are comparable with M-Lab's own clients.
- Other backends (self-hosted LibreSpeed, a commercial provider) can be added behind the same interface without UI changes.
- Upload accuracy is limited by how fast the stick's JS thread can send data. This is checked against a phone on the same network (see `docs/qa-checklist.md`).
