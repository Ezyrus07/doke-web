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
