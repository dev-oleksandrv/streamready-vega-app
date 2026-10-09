# Architecture Decision Records

An ADR records one significant decision: the context, what was decided, and what follows from it.

## Rules

- One decision per file, named `NNNN-kebab-title.md` with the next free number.
- Once accepted, an ADR is not edited, except to update its status.
- To change a decision, write a new ADR. It links to the old one, and the old one's status becomes "Superseded by NNNN".
- Write an ADR when you add a module, a measurement engine, a geo-IP provider or a store, or change how parts fit together.

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD

## Context

## Decision

## Consequences
```

## Index

- [0001 Modular domain architecture](0001-modular-domain-architecture.md)
- [0002 ndt7 as the first speed test engine](0002-ndt7-first-speed-test-engine.md)
- [0003 Zustand for state management](0003-zustand-state-management.md)
- [0004 Tokenless geo-IP providers](0004-tokenless-geo-ip-providers.md)
- [0005 Consent-gated insights](0005-consent-gated-insights.md)
