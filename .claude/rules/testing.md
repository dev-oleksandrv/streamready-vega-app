---
paths:
  - "test/**"
  - "src/**"
---

# Testing rules

- Tests live in `test/`, mirroring `src/` 1:1: `src/modules/verdict/domain/evaluate.ts` → `test/modules/verdict/domain/evaluate.test.ts`.
- Write the failing test first for domain logic, engines, stores, and bug fixes.
- No real network, timers, or device APIs in tests. Use `test/support/` fakes (`FakeWebSocket`, mocked `fetch`, fake clock, `renderWithProviders`).
- Fixtures are sanitized: documentation IPs (`203.0.113.0/24`, `2001:db8::/32`), fake UUIDs, no `access_token` values.
- Reset Zustand stores between tests with the shared helper.
- Screens: React Native Testing Library. Query by role/text the user sees; assert behavior, not implementation details.
- No snapshot tests.
- Prefer table tests (`test.each`) for thresholds and mappings; include boundary values.
- Cover the essential parts first: `verdict/`, `speedtest/domain/`, `speedtest/engines/`, stores, key screen flows. No coverage thresholds for now.
- D-pad focus and real-device behavior go into `docs/qa-checklist.md`, not fragile unit tests.
- Run `pnpm run check` before committing.
