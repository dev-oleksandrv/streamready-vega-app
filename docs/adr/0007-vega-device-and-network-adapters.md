# 0007. Vega device and network adapters

- Status: Proposed
- Date: 2026-10-10

## Context

The Device screen, the header and the Start button need the device model, the OS version, and the connection type, band and online state. Vega exposes these through two system packages. Some of what the design shows is not available:

- `getModel()` returns a codename, not a marketing name.
- `getSystemName()` returns "Kepler".
- Memory APIs are unsupported.
- Wi‑Fi details may need a runtime privilege.

## Decision

- Add `@amazon-devices/react-native-device-info` (~2.1.9000000001) and `@amazon-devices/keplerscript-netmgr-lib` (~2.0.20), the RN 0.83 lines.
- `insights/device/` holds the only imports of these packages, behind the `DeviceSource` and `NetworkMonitor` interfaces. Tests inject fakes.
- The manifest declares `wants.service com.amazon.network.service` and `wants.privilege com.amazon.network.privilege.net-info`. The app never requests the privilege. Without it only SSID/BSSID are masked; whether `frequency` is masked too is recorded under Consequences after device QA.
- NetInfo runs with `reachabilityShouldRun: () => false` and `shouldFetchWiFiSSID: false`. The default reachability check calls an external URL, and nothing may leave the device before consent. `online` comes from `isConnected`, and an unknown value (`null`) counts as online.
- "Vega OS" is fixed copy. The marketing name, Wi‑Fi generation and throughput limit come from a static `DEVICE_PROFILES` table keyed by codename, filled only with codenames observed on devices.
- The design's Free memory row is replaced by Provider (ISP), from geo insights.

## Consequences

- Unknown devices show the codename and "—" for the limit until the table gains them.
- If `frequency` is masked, the band label degrades to "Wi‑Fi".
- Device QA findings (codename on the stick and the VVD; `frequency` present without the privilege): pending device QA.
