# ANA-A11 — Liquidity freshness policy derivation

## Root cause

The remaining freshness blocker is not merely a missing number. There is no canonical ANA publication cadence for `liquidity.active_service_seconds`. The ANA domain currently owns no cron, and the repository has no metric-specific `maxLagSeconds` authority.

Using the ORD one-minute worker cron, REL daily SLO report, request-freshness windows, retry backoff or browser refresh behavior would cross domain boundaries and manufacture an analytics SLA.

## Derivation rule

For the latest canonical closed-window series:

`maxLagSeconds = windowStepSeconds + projectionDelaySloSeconds`

- `windowStepSeconds` is the distance between successive canonical closed-window boundaries.
- `projectionDelaySloSeconds` is the approved maximum delay after a boundary before its snapshot should exist and be selectable.

No implicit recovery grace is added. CAT source-watermark delay is evaluated independently by ANA-A07 and must not be hidden inside the age threshold.

This rule reflects the worst healthy age of the latest published closed window immediately before the next expected publication.

## Source-domain watermark semantics

For liquidity v1, CAT remains the source authority. ANA consumes the server-side `private.cat_listing_visibility_watermark_v1()` contract with basis `transaction_snapshot_barrier_v1`.

- The watermark means CAT listing-visibility facts are proven readable through that point in the same database snapshot used by ANA.
- Canonical `dataThrough` is bounded by `min(windowEnd, CAT source watermark)`.
- A window whose `windowEnd` is later than the CAT watermark is not closed for ANA.
- `max(event.occurred_at)` is not a watermark.
- Snapshot `computedAt` is not a watermark.
- CAT dependency lag is not added to `maxLagSeconds`; dependency availability and ANA publication age remain separate gates.

## Fresh / stale / unavailable

ANA-A11 inherits the canonical state semantics from ANA-A07 and does not create a second freshness model.

- **unavailable:** threshold missing, authoritative dependency watermark missing/unavailable, no canonical closed window, required coverage missing, overclaimed `dataThrough`, or a structural defect that makes the selected liquidity projection unavailable;
- **stale:** the selected canonical window exceeds the approved lag threshold, an authoritative dependency is stale, or supply coverage is partial;
- **fresh:** the latest canonical closed window is fully covered, dependency watermarks are available, structural integrity passes, and `evaluatedAt - dataThrough <= maxLagSeconds`.

Freshness is evaluated only after selecting the latest canonical closed window. Falling back to an older healthy window is forbidden. A zero-sample window is not stale merely because it is empty.

## Pending authority decisions

The missing values remain policy decisions, not constants to infer from existing timings:

1. ANA-001 must approve and version the canonical closed-window cadence (`windowStepSeconds`).
2. ANA-001 operational policy must approve and version the healthy post-boundary materialization delay (`projectionDelaySloSeconds`).
3. ANA-001 must choose a server-side publisher/scheduler with deterministic missed-window handling.

Read-only staging inspection found the liquidity runner present but no active `cron.job` matching ANA/analytics/liquidity. GitHub Actions are repository gates, not the publication scheduler. Therefore no existing runtime authority justifies a numeric cadence or delay SLO.

## What remains unset

The repository currently has neither a versioned window step nor a projection-delay SLO for this metric. Therefore:

- `windowStepSeconds = null`;
- `projectionDelaySloSeconds = null`;
- `maxLagSeconds = null`;
- the staging registry remains empty for this metric;
- ANA-A10 must continue returning `POLICY_THRESHOLD_MISSING`.

## Activation gate

A future activation requires a versioned publication schedule, a versioned delay SLO, a server-side trigger/scheduler, controlled staging evidence of that cadence, the mechanically derived threshold, and a separately authorized insert into the freshness-policy registry.

ANA-A11 is repository-only and changes no cron, database, staging resource, deployment or production state. ANA-001 remains **3/6**.
