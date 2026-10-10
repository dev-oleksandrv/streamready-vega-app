# 0007. Vega device and network adapters

- Status: Accepted
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
- The manifest declares `wants.service com.amazon.network.service` and `wants.privilege com.amazon.network.privilege.net-info`. The app never requests the privilege. Without it only SSID/BSSID are masked; device QA showed `frequency` is still reported.
- NetInfo runs with `reachabilityShouldRun: () => false` and `shouldFetchWiFiSSID: false`. The default reachability check calls an external URL, and nothing may leave the device before consent. `online` comes from `isConnected`, and an unknown value (`null`) counts as online.
- "Vega OS" is fixed copy. The marketing name, Wi‑Fi generation and throughput limit come from a static `DEVICE_PROFILES` table keyed by codename, filled only with codenames observed on devices.
- The design's Free memory row is replaced by Provider (ISP), from geo insights.

## Consequences

- Unknown devices show the codename and "—" for the limit until the table gains them.
- If a future OS masks `frequency`, the band label degrades to "Wi‑Fi".
- Device QA (2026-10-10, OS 1.2, privilege not granted):
  - Fire TV Stick 4K Select: codename `AFTCA002`, Wi‑Fi `frequency` 5240 MHz (5 GHz). Added to `DEVICE_PROFILES`.
  - Vega Virtual Device: codename `AQVV01P`, Wi‑Fi `frequency` 2447 MHz (2.4 GHz). Not a real device, so it gets no profile.
- Importing `react-native-device-info` logs two `new NativeEventEmitter()` warnings in dev builds. They come from the package itself and are harmless.
