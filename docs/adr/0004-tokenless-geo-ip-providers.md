# 0004. Tokenless geo-IP providers

- Status: Accepted
- Date: 2026-10-09

## Context

The app shows the public IP, country, city and ISP. The repo is public, and anything bundled into the app can be extracted, so an API token can't be kept secret. The lookup runs once per launch on each device.

## Decision

- Lookups go through a `GeoIpProvider` interface, combined with a fallback chain:
  - Primary: `https://ipinfo.io/json`
  - Fallback: `https://get.geojs.io/v1/ip/geo.json`
- Neither provider needs a token.
- Each request has a timeout and accepts an `AbortSignal`.

## Consequences

- Free-tier rate limits apply per client IP. Every TV calls from its own IP, so one lookup per launch stays well within them.
- If both providers fail, the app doesn't render geo insights at all. Nothing else depends on them.
- Before any monetization (ads, Pro), check each provider's terms for commercial use. A provider can be swapped by adding a new adapter.
