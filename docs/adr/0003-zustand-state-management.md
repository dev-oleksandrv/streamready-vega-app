# 0003. Zustand for state management

- Status: Accepted
- Date: 2026-10-09

## Context

The app has a handful of screens, and its state is split by domain: consent, connection insights, the test session and network status. A live test emits events many times per second, and the stick is slow, so re-renders must be cheap and selective.

## Decision

- Use Zustand, with one store per module.
- Only the consent status is persisted.
- Stores don't import each other. Anything derived from several stores lives in `app/selectors.ts`, for example `selectVisibleInsights`.
- Engine events are throttled to about 4 Hz before they reach the session store.

## Consequences

- Components subscribe to narrow slices, which limits re-renders during a test.
- Stores can be tested through their API without rendering React.
- Tests must reset store state between cases, using a shared helper in `test/support/`.
