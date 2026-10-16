# 0011. VPN detection and device-side latency under VPN

- Status: Accepted
- Date: 2026-10-16

## Context

A VPN often slows streaming, so the app should say when one is on. Vega's NetInfo port only reports Wi‑Fi, Ethernet or other, and the active interface stays `wlan0` with a VPN connected. The SDK's `KeplerNetworkManagerInterface` has `IVpnManager.getVpnState()`, which needs only `com.amazon.network.privilege.network-access`. No README or sample names its component.

A spike on a Fire TV Stick 4K Select with NordVPN (2026-10-16) showed:

- `/com.amazon.kepler.net.vpn.vpnmanager` resolves to `IVpnManager` and reports another app's VPN: `1` (interface down) when off, `3` (connected) when on.
- The `vpn0` interface stays listed with the VPN off, so the interface list can't be used.
- Under the VPN the app showed 1 ms idle and 1 ms loaded latency. The TV's own `TCP_INFO` saw 29–35 ms minimum and 45 ms median, and the WebSocket handshake took ~35 ms. The VPN ends TCP at its exit node and opens a new connection to M-Lab, so the server's `TCPInfo` measures server ↔ exit. The ndt7 spec warns: "an unreasonably small RTT … could indicate a performance enhancing proxy".
- Without the VPN, in the same run, the server measured 19 ms idle and 29 ms loaded (10 ms added). The TV measured 27.8 ms (`tcpi_min_rtt`) and 35.6 ms median `tcpi_rtt` (7.8 ms added). The server's idle value varied 7–19 ms between runs.

## Decision

- An in-app Turbo Module `VpnNative` returns the raw `VpnState`, or `-1` on any failure. Only `CONNECTED` counts as on; a missing module or a failure reads as unknown.
- The state is read on launch, whenever the app becomes active, and when a test starts. It never leaves the device.
- A switch between on and off seen when the app becomes active also refreshes geo insights (consent permitting), because the public IP changed with it.
- The header shows a "VPN on" badge inside the insights cluster, so it follows the same consent and geo gate (ADR 0005).
- If a VPN is connected when a test starts, idle latency is the TV's lowest `tcpi_min_rtt` and loaded latency is the median `tcpi_rtt`, both sampled with each download progress event. Otherwise the server values stay (ADR 0006). A VPN run without device samples falls back to server values. The result records `latencySource`.
- The manifest declares `wants.privilege com.amazon.network.privilege.network-access`.

## Consequences

- A VPN on the router is invisible to the device: no badge, and latency still comes from the server.
- Device-side values read a few ms higher than the server's on the same path; the added delay the lag grade uses stays close. Results under a VPN are not comparable with M-Lab's published data for that test.
- `getVpnState` runs on the JS thread. It is one call to the network service, made only on launch, foreground and test start.
- If a future OS moves the component, the state reads as unknown and the app behaves as before this change.
