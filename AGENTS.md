# StreamReady

A React Native app for Amazon Vega OS (Fire TV), built with React Native 0.83 and `@amazon-devices/react-native-kepler`. Targets TV only (`package.json` → `kepler.targets`). The app manifest is `manifest.toml` (package id `dev.voronkov.speedtest`).

## Commands

The package manager is pnpm (`pnpm-lock.yaml`).

- `pnpm test` runs the Jest tests in `test/`. `pnpm test:snapshot` updates snapshots.
- `pnpm lint` runs ESLint on `src` and `test`. `pnpm lint:fix` also fixes what it can.
- `pnpm build:debug` or `pnpm build:release` builds with `react-native build-vega`.
- `pnpm start` starts Metro.
- `pnpm dev` (`scripts/dev.sh`) starts a Fast Refresh session. It starts the Virtual Device if no device is connected, builds and installs Debug if needed, sets up port forwarding, then runs Metro and launches the app. `pnpm dev:build` forces a rebuild first.
- `pnpm release` runs lint, test and a release build.

## Structure

- `index.js` registers `App`, with the app name from `app.json`.
- `src/App.tsx` is the root screen. It has a header area and a row of focusable tiles inside a `TVFocusGuideView`, and the header changes with the focused tile.
- `src/components/Tile.tsx` is a focusable `Pressable` tile.
- `src/data/tiles.tsx` holds the tile definitions (id, label, icon, description).
- `src/assets/` holds the images.
- `test/*.spec.tsx` uses `@testing-library/react-native`.

## Conventions

- TV focus: use `onFocus`/`onBlur`, `hasTVPreferredFocus` and `TVFocusGuideView` from `@amazon-devices/react-native-kepler`. Give interactive elements a `testID` and an `accessibilityLabel`.
- Styles go in `StyleSheet.create` at the bottom of each file.
- Use named exports for components.
- Prettier: single quotes, no bracket spacing, trailing commas, `bracketSameLine`, 2-space indent.

## Vega docs (MCP)

The `amazon-devices-buildertools-mcp` server serves Vega documentation and workflows. Use it for Vega/Kepler APIs and build, deploy or Appstore questions.

- **Configuration:** Claude Code reads it from `.mcp.json`. Other agents register the same stdio server in their own MCP config, with command `npx` and args `-y @amazon-devices/amazon-devices-buildertools-mcp@latest`.
- **Before using it, read [docs/agents/amazon-devices.md](docs/agents/amazon-devices.md).** It covers session setup, platform parameters and workflow rules, and all agents follow it.
