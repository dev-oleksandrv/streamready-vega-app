# 0014. Streaming figures per service

- Status: Accepted
- Date: 2026-11-13

## Context

The Services screen tells users which quality Netflix, Prime Video, YouTube, Disney+, Apple TV and HBO Max can play at their speed. That needs a minimum download speed per service and quality, and the numbers are claims about other companies' products:

- Services publish their own minimums, but not all of them, and the pages change. On 2026-11-13 the Netflix, YouTube and Apple TV pages and two HBO Max help articles could be read. The Disney+ page rendered empty and the Prime Video page returned HTTP 503.
- Some services publish two numbers. HBO Max gives 25 Mbps as the 4K minimum and recommends 50 or more for the best 4K.
- The app is open source and bundled into the `.vpkg`, and anything it fetches at run time is a new network host, a new privacy statement and a new failure mode.
- The screen shows the service names. Whether the Amazon Appstore policy on third-party trademark names allows this is not checked yet.

## Decision

- **A bundled table, never fetched.** `verdict/domain/services.ts` holds the figures. The app makes no request for them (no new host, nothing persisted).
- **`official` needs a source.** A figure is `official` only when the service's own page states it. Each service entry carries a comment with the page URL and the date checked.
- **Otherwise `typical`.** Without a confirmed official figure, the tier reads the generic value from `STREAM_CHECKS` (HD 3, Full HD 5, 4K 25 Mbps), never a copied number, and the screen says "Typically needs N Mbps" instead of "Needs N Mbps". Prime Video and Disney+ are all `typical`; Apple TV HD and Full HD and HBO Max HD are `typical` too.
- **Published minimum, not the recommended figure.** When a service gives both, the table uses the minimum (HBO Max 4K is 25, not 50), because the screen says the figures are published minimums.
- **Download only.** `serviceVerdicts` ignores latency. A lag note on the screen covers the case where speed is enough but the grade is D or F.
- **Text names only.** No logos. The screen states that figures are published minimums or typical values and that StreamReady is not affiliated with the services.
- **To update a figure,** change the table, its source comment and the table tests together. Switching a `typical` tier to `official` follows the same rule.

## Consequences

- Figures can go stale between app releases. The check date in each comment shows how old a figure is.
- A user may see a service need more or less than the service says today. The disclaimer line is the mitigation.
- No new network traffic, dependency or persisted data, so the privacy policy does not change.
- Open: the Appstore content policy on third-party trademark names has not been checked. Until it is, names stay plain text.
- Prime Video and Disney+ can move to `official` later, once their pages can be read.
