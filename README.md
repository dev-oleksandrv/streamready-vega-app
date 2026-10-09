# StreamReady

Internet speed test for Fire TV (Vega OS) that tells you whether your TV can stream in 4K.

## Status

Pre-release, under active development.

## What it measures

- **Download** and **upload** speed
- **Idle latency** (ping)
- **Latency under load** — graded A–F, the usual cause of buffering on a "fast" connection
- **Streaming verdict** — HD 720p, Full HD 1080p, 4K, and two 4K TVs at once

Measurements use the open [M-Lab ndt7](https://www.measurementlab.net/) protocol, implemented directly over WebSocket for Vega.

## Privacy

Speed tests run against Measurement Lab (M-Lab) servers. M-Lab publishes test results, including the client IP address, as open data for internet research. The app also looks up your public IP, country, city and provider through a third-party geo-IP service.

StreamReady asks for consent before running any test or IP lookup, and consent can be withdrawn at any time.

## Requirements

- [Vega SDK](https://developer.amazon.com/docs/vega/latest/)
- Node.js ≥ 22
- pnpm 12

## Getting started

```bash
pnpm install
pnpm run check        # lint + typecheck + tests
pnpm run build:debug  # Vega debug build
```

See the [Vega documentation](https://developer.amazon.com/docs/vega/latest/) for installing and running the build on a device.

## Project structure

```
src/app/       composition root: navigation, providers (DI), header, cross-module selectors
src/modules/   privacy · speedtest (engines/ndt7) · verdict · insights · home
src/shared/    ui (tokens, focus primitives), lib (http, format, logger, storage)
test/          mirrors src/ 1:1; test/support/ holds fakes and fixtures
```

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the decision records in [docs/adr/](docs/adr/).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

[Apache-2.0](LICENSE)
