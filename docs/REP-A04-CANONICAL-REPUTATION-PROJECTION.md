# REP-A04 — Canonical Reputation Projection, Fraud Resistance and Dispute Impact

## Purpose

Define a repository-only, server-owned contract for public reputation. The contract replaces browser aggregation authority with a deterministic projection over canonical review, moderation, fraud-policy and dispute facts.

This sublot does not integrate runtime, create migrations, read staging, modify reviews, decide fraud, change disputes, publish reputation or create rehire transactions.

## Projection states

- `authoritative`: fresh canonical server projection. Numeric reputation may be displayed.
- `stale`: previously authoritative projection inside an explicit freshness window. It may be shown with a warning, but it cannot drive public ranking.
- `unavailable`: authority cannot be established. No numeric rating is synthesized.

An authoritative empty projection uses `averageRating: null`, not zero stars.

## Inclusion model

A review contributes to reputation only when all conditions hold:

1. the review belongs to the exact professional;
2. the review state is `published`;
3. no active moderation case is open;
4. fraud disposition is `eligible`;
5. dispute impact is `eligible`;
6. moderation, fraud and dispute provenance are present and fingerprinted;
7. the REP-A02 uniqueness subject is unique.

Published is necessary but not sufficient.

## Fraud boundary

Signals, heuristics, clusters, velocity checks or anomaly scores never decide inclusion by themselves. They may only lead to a canonical, versioned disposition:

- `eligible`;
- `quarantined`;
- `excluded`.

Quarantine and exclusion require a server-owned policy version and decision hash. REP-A04 grants no fraud-decision runtime authority.

## Dispute boundary

- `eligible`: canonical dispute facts allow the review to count;
- `quarantined`: active, unknown or reconciliation-pending facts prevent public aggregation;
- `excluded`: final canonical reversal or invalidation removes the review from the aggregate.

Browser dispute state has no authority.

## Aggregation

The public projection contains only aggregate-safe fields:

- eligible, quarantined and excluded counts;
- integer-rating histogram;
- eligible rating total;
- average rating rounded to two decimals;
- ledger heads, policy version, projection revision and fingerprint.

Raw review text, private messages, credentials, payment instruments, bank data and raw evidence are prohibited.

## Duplicate and concurrency rules

Duplicate review IDs or duplicate REP-A02 uniqueness subjects fail closed. Projection fingerprints bind the canonical inputs, counts and aggregate result. A stale projection never upgrades itself to authoritative.

## Explicit non-effects

```text
runtimeIntegrated: false
migrationApplied: false
stagingValidated: false
reputationProjectionRuntimeAuthority: false
fraudDecisionAuthority: false
moderationRuntimeAuthority: false
reviewPublicationRuntimeAuthority: false
rehireAuthority: false
productionAuthority: false
```

## Next sublot

`REP-A05 — rehire transaction-linkage and retention readiness`
