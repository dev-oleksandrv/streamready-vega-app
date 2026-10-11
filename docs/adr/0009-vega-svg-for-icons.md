# 0009. Vega SVG for in-house icons

- Status: Accepted
- Date: 2026-10-11

## Context

The Result screen shows a tick or a cross for each stream check. Geist, the app font, has no `✓` (U+2713) or `✕` (U+2715) glyph, so text icons would render in a fallback font. The app needs only a few icons.

An icon library such as `lucide-react-native` was considered:

- It imports `react-native-svg` by name. Vega bundling ignores npm aliases, so the Vega port would need `@amazon-devices/kepler-module-resolver-preset` and a Babel change.
- Metro does not tree-shake, so importing from the library index bundles every icon on a 1 GB device.
- Some icons use `Polyline` or `Polygon`, which the Vega port does not list as supported.

## Decision

- Add `@amazon-devices/react-native-svg` (~3.0.0, the RN 0.83 line). It is system-deployed and autolinked, so the manifest needs no entries.
- Draw icons in-house in `shared/ui/icons/` with `Svg` and `Path` only: a 24-unit grid, stroke 2.5, round caps and joins, and the color passed as the stroke.
- No icon library.

## Consequences

- Each new icon is a small component with its own path data.
- The port is guaranteed only for the RN for Vega version it was built for, so it is upgraded together with React Native.
- The port logs every native component it registers at import. Jest renders `Svg` and `Path` as host elements through a mock in `test/support/jestSetup.ts`; real rendering is checked on a device.
