# 0005. Consent-gated insights

- Status: Accepted
- Date: 2026-10-09

## Context

Speed tests send the user's IP to M-Lab, which publishes it, and the insights lookup sends it to a geo-IP provider. Both are data processing the user has to agree to first. The user can also change their mind later.

## Decision

- No speed test and no geo-IP lookup happen before consent. On first launch, the Privacy modal offers only "Accept & continue".
- Insights are fetched on Accept, with a loader in the button, and on cold start when consent is already accepted.
- On cold start the splash stays up until consent is loaded, and, if consent is accepted, until the insights fetch settles. The fetch has a timeout of about 5s.
- Withdrawing consent hides insights but keeps them in the store, and disables Start. Giving consent again shows the cached insights and refreshes them.
- If consent is withdrawn when the app closes, the Privacy modal shows again on the next launch.
- A failed lookup renders no geo insights at all, with no placeholders.
- `selectVisibleInsights` in `app/selectors.ts` is the only way the UI reads insights.

## Consequences

- The visibility rule lives in one place, and the insights module knows nothing about consent.
- The splash never waits on a third-party API for more than about 5s.
- Users who decline can't run tests. That is intended.
