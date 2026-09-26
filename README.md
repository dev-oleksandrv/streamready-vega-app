# StreamReady

A React Native app for Amazon Vega OS, the Fire TV platform for React Native apps. It is built on React Native 0.83 and `@amazon-devices/react-native-kepler` and targets TV devices.

## Prerequisites

- Node.js 20 or later
- [pnpm](https://pnpm.io/)
- The [Vega SDK](https://developer.amazon.com/docs/vega/0.24/), for building and for running on a device or simulator

## Getting started

```bash
pnpm install
pnpm start          # start the Metro bundler
pnpm build:debug    # build a debug package
```

To install and launch the built package on a Vega device or the Vega Virtual Device, see the Vega SDK documentation.

## Scripts

| Command                       | Description                             |
| ----------------------------- | --------------------------------------- |
| `pnpm start`                  | Start Metro                             |
| `pnpm test`                   | Run the Jest tests                      |
| `pnpm test:snapshot`          | Run tests and update snapshots          |
| `pnpm lint` / `pnpm lint:fix` | Lint `src` and `test`                   |
| `pnpm build:debug`            | Debug build (`react-native build-vega`) |
| `pnpm build:release`          | Release build                           |
| `pnpm release`                | Lint, test and release build            |
| `pnpm clean`                  | Remove `node_modules` and build output  |

## Project structure

```
src/
  App.tsx            root screen
  components/        UI components (e.g. Tile)
  data/              static data (tile definitions)
  assets/            images
test/                Jest + React Native Testing Library specs
manifest.toml        Vega app manifest (package id, OS version, components)
```

## AI coding agents

- **Instructions:** [`AGENTS.md`](AGENTS.md) holds the instructions for AI coding agents. `CLAUDE.md` imports it for Claude Code.
- **Vega MCP server:** the repo is set up to use the [Amazon Devices Builder Tools MCP server](https://developer.amazon.com/docs/vega/0.24/mcp-server) for Vega documentation and workflows.
  - Claude Code picks it up from `.mcp.json`.
  - Other agents need it registered in their own MCP config.
  - Usage rules are in [`docs/agents/amazon-devices.md`](docs/agents/amazon-devices.md).

## License

[Apache-2.0](LICENSE)
