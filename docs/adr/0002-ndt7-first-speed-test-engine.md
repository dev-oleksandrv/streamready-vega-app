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

## Amendment (2026-10-09): Vega WebSocket constraints

Reading Vega's `WebSocket` implementation (kepler 4) showed:

- `bufferedAmount` is declared but never updated, so it cannot gate upload sends.
- Binary `send()` base64-encodes every message on the JS thread before handing it to native code.
- Binary receive with `binaryType = 'arraybuffer'` base64-decodes every message on the JS thread. With `'blob'`, payloads stay native-side.

Testing on the Vega Virtual Device then showed:

- The server's close frame reaches `onmessage` as a text message (the status code bytes, e.g. `"\u0003"`), and `onclose` follows seconds later with code `1`, not the frame's code.
- The native socket doesn't queue outgoing data. Sending faster than it drains fails the connection with close `1006` and reason "Failed sending data to the peer", seen after 192–384 KiB.

Other platforms hit the same class of problem. M-Lab's own ndt7-js crashed in Safari with "Failed to send WebSocket frame" when its send loop burst ahead of a late `bufferedAmount`; the fix was one `send()` per loop iteration ([ndt7 updates](https://www.measurementlab.net/blog/ndt7-updates/)). Without any buffer signal, the remaining option is an application-level window confirmed by the peer, which ndt7 provides through the server's upload measurements (every ~250 ms on average, Poisson, 25–625 ms).

Changes:

- The close-frame echo marks the end of a subtest. A plain `onclose` without it is a lost connection.
- Upload sends one message per event-loop tick, never a burst. It keeps unconfirmed bytes (sent minus the server's `TCPInfo.BytesReceived`, plus the last measured rate times the time since that report) within an upload window. Messages never exceed half the window. A numeric `bufferedAmount` is honored too.
- The window is an engine option (`uploadWindowBytes`, 32 KiB to 1 MiB, default 32 KiB). If upload fails with a lost connection, the engine retries on a fresh socket with the next smaller window, down to 32 KiB; a retry that cannot connect ends the run. The result reports the window it came from.
- Download receive mode is an engine option (`downloadMode: 'arraybuffer' | 'blob'`, default `'arraybuffer'`). The temporary debug screen switches it, and the upload window, so both can be tuned on the VVD and the stick; the defaults follow from those runs. In `'arraybuffer'` mode every server message (up to 16 MiB by protocol) is decoded into a fresh buffer, so memory on fast links decides between the two.

Testing on a Fire TV stick then showed:

- Upload completed only with the 32 KiB window. Two runs crashed the app with `SIGSEGV` inside `libcurl.so.4`, called from the JS thread through Vega's native `sendBinary`.
- The stick ships libcurl 8.4.0, whose WebSocket support was still experimental. `curl_ws_send` may accept only part of a frame, and the caller must resend the rest ([curl_ws_send](https://curl.se/libcurl/c/curl_ws_send.html)); "Failed sending data to the peer" is libcurl's text for `CURLE_SEND_ERROR`. Large sends fail or crash, small ones don't, which fits a native layer that mishandles partial sends. A crash cannot be caught, so retrying with a smaller window cannot protect against it.

Changes:

- Upload messages stop scaling at 16 KiB, whatever the window, and the default window is 32 KiB. Larger windows stay in the debug screen for experiments, labelled risky.
