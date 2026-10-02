# ANA-A08 — Retention snapshot publication candidate

## Objective

Freeze the contract between the staging-certified A08 retention projector and the existing A04/A05 append-only snapshot system.

This lot is **repository-only**. It creates no SQL migration, invokes no append RPC, writes no staging data, creates no scheduler and grants no runtime snapshot/publication authority.

## Source authorities

- A08 projection contract: `config/ana-a08-retention-cohort-projection.json`.
- Live projection authority evidence: `reports/generated/ana-a08-live-retention-runtime-projection-authority-alignment-staging-evidence.json`.
- A04 append-only snapshot authority: `public.append_analytics_metric_snapshot_v1(jsonb)`.
- A05 revision/fingerprint/reconciliation authority.
- A07 dataThrough and freshness authority.

The live A08 projector remains service-role-only with `runtimeProjectionAuthority=true`, while `runtimeSnapshotAuthority=false`, `snapshotPublicationAllowed=false` and `schedulerAuthority=false`.

## Metrics

- `retention.repeat_request_30d`
- `retention.repeat_completion_90d`

The measurement horizon remains 30 or 90 days respectively. A future publication window is only the identity of a materialized observation; it must not redefine the retention horizon.

## Publication-window contract

A future adapter may accept an explicit closed `publicationWindowStart/publicationWindowEnd` and request the canonical A08 compute at `publicationWindowEnd`. The A08 projector continues to clamp effective `dataThrough` through the certified A07 ORD watermark.

This candidate deliberately does **not** choose a cadence. No implicit 5-minute schedule, max lag, projection-delay budget or effective window is invented.

## Null/zero semantics

A legitimate no-cohort result remains:

- numerator = `0`;
- denominator = `0`;
- value = `null`;
- sampleCount = `0`.

`null` must never be rewritten to numeric zero. Zero would mean an observed 0% retention rate; null means there is no mature denominator.

A zero-denominator result may still have complete structural coverage. Coverage and business value are distinct.

## Dimensions

Global `{}` and immutable `serviceCategory/serviceState` cohort dimensions are supported. The dimension source remains the first completed order's A04-enriched immutable service snapshot. Mutable current-service joins and anonymous identity stitching are prohibited.

## A04/A05 payload shape

Any future appendable payload must contain the exact A04 fields:

`metricKey, metricVersion, windowStart, windowEnd, dataThrough, dimensions, numerator, denominator, value, sampleCount, projectionState, coverageState, reconciliationState, sourceFingerprint, projectionFingerprint, correctionReason, computedAt`.

A05 retains revision and fingerprint authority. The candidate never fabricates `reconciliationState=matched`; until retention-specific reconciliation exists, the state is `not_applicable`.

## Fingerprints

The future source fingerprint must digest the canonical sorted ORD metric-event universe that can affect the selected retention metric at effective dataThrough. Volatile `computedAt` is excluded.

The projection fingerprint must cover the semantic projection surface, including null-preserving value, denominator, sample count, dimensions and coverage. Re-executing the same source/projection must therefore remain compatible with A04's `NO_CHANGE` replay behavior.

## Freshness blocker

A07 currently marks both retention metrics with `thresholdStatus=pending`.

A07 also explicitly forbids an implicit default `maxLagSeconds`. Therefore this candidate is **not append-eligible** yet. Until a separate retention freshness/publication policy is explicitly authorized:

- append eligibility = `blocked_policy_pending`;
- runtimeSnapshotAuthority = `false`;
- snapshotPublicationAuthority = `false`;
- schedulerAuthority = `false`.

This is the key fail-closed boundary of this lot.

## Runtime baseline

Read-only observation during the authorized lot confirmed:

- retention snapshot rows: `0`;
- retention cron jobs: `0`;
- live projection authority: `true`;
- live runtime snapshot authority: `false`;
- live snapshot publication allowed: `false`;
- live scheduler authority: `false`.

## Next gate

Prepare a separate **repository-only retention freshness/publication policy candidate**. That future gate must explicitly choose and justify the retention metric thresholds/cadence/effective window before any adapter migration, append invocation, scheduler or staging write can be considered.

ANA remains **3/6**.
