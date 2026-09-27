# ANA-A08 — Retention cohort projection

## Objective

ANA-A08 defines deterministic repository semantics for:

- `retention.repeat_request_30d`;
- `retention.repeat_completion_90d`.

The source remains canonical ORD projection data. No browser identity, anonymous stitching or reputation/rehire inference is introduced.

## Cohort anchor

Each client is anchored on the **first canonical `order.completed`** event visible at `dataThrough`.

The cohort becomes mature only when the entire measurement window has elapsed:

- repeat request: `firstCompletion + 30 days <= dataThrough`;
- repeat completion: `firstCompletion + 90 days <= dataThrough`.

An immature client is excluded from the denominator rather than treated as a non-repeat.

## Repeat semantics

A repeat must belong to a **different order** from the first completion.

For `repeat_request_30d`, any later `order.requested` within 30 days counts.

For `repeat_completion_90d`, any later `order.completed` within 90 days counts.

The metric is client retention, not REP-001 rehire. A repeat order never creates an implicit rehire fact.

## Segmentation

The cohort is segmented by the immutable `serviceCategory` and `serviceState` carried by the first completed order projection.

The repeat itself does not need to stay in the original category/state. That allows the metric to answer: “clients whose first completion was in this cohort — did they return to the marketplace?”

Missing cohort dimensions produce **partial coverage**. They are never silently fabricated from mutable current service/profile state.

## Identity

Only canonical ORD `client_id` participates. Missing client ids are excluded and counted in evidence. Anonymous, cross-session, cross-device and anonymous→authenticated stitching remain prohibited.

## Freshness

Cohort maturity uses `dataThrough`, not `computedAt`. ANA-A07 remains the authority for deciding whether the selected retention snapshot itself is fresh/stale/unavailable.

## Runtime boundary

The compute-only projector is now installed in staging and validation 049 passes. This does not grant runtime projection authority or snapshot publication authority.

Runtime closure still requires an explicit runtimeProjectionAuthority decision and, separately, append-only A04/A05 snapshot/revision publication authority. A07 watermark enforcement remains mandatory.

ANA-001 remains **3/6**.


## Repository runtime projector candidate

A compute-only runtime candidate is prepared at `supabase/migrations/20260927010000_ana_a08_retention_cohort_projector.sql` with rollback-only validation `supabase/tests/049_ana_a08_retention_cohort_projector_validation.sql`.

The projector:
- reads only `private.order_metric_events`;
- consumes `serviceCategory` and `serviceState` already enriched by ANA-A04 from the immutable order service snapshot;
- clamps requested `dataThrough` to `private.order_metric_watermark_v1()` from ANA-A07;
- preserves the first-completion cohort anchor and different-order repeat requirement;
- allows a repeat in another category/state while retaining the initial cohort segment;
- returns partial coverage when mature cohort dimensions are missing;
- is executable only by `service_role`.

The candidate does **not** join mutable `public.services`, publish metric snapshots, mutate ORD/CAT, create cron jobs, activate browser analytics or grant runtime projection authority.

Current staging-certified state:
- `migrationApplied=true`;
- `stagingMigrationVersion=20260927015155`;
- `stagingValidated=true`;
- `validation049Status=PASS`;
- `runtimeProjectorInstalled=true`;
- repository `runtimeProjectionAuthority=true`;
- certified live observation `runtimeProjectionAuthority=false`;
- `liveRuntimeFlagAligned=false`;
- `runtimeSnapshotAuthority=false`;
- `snapshotPublicationAuthority=false`;
- `schedulerAuthority=false`.

The staging evidence is recorded in `reports/generated/ana-a08-retention-runtime-projector-staging-evidence.json`. Installation and validation do not authorize runtime projection, snapshot publication, scheduler activation, production, merge or Ready.


## Repository runtime projection authority

The repository-only authority grant is bound to staging evidence blob `3249080dec64c1aeec1119309dbf1db9992fb85c` and validation 049 PASS.

This grant changes **contract-layer authority only**. It performs no staging mutation and does not edit the installed SQL function. The last certified live observation remains `runtimeProjectionAuthority=false`.

A separate forward-only candidate is required before any live marker can change to true. Snapshot publication, scheduler, production, merge, Ready and ANA maturity remain unchanged.


## Live runtime projection authority alignment candidate

Repository runtime projection authority is granted, while the certified live function still reports `runtimeProjectionAuthority=false`. A forward-only candidate is prepared at `supabase/migrations/20260927021000_ana_a08_live_retention_runtime_projection_authority_alignment.sql` with rollback-only validation `supabase/tests/050_ana_a08_live_retention_runtime_projection_authority_alignment_validation.sql`.

The candidate changes exactly **2** `runtimeProjectionAuthority` markers from `false` to `true` in `public.compute_analytics_retention_cohort_v1`. Its function body must otherwise remain byte-equivalent to the installed candidate definition for audit purposes. It preserves service-role-only execution, immutable A04 dimensions, A07 watermark enforcement, compute-only behavior, `runtimeSnapshotAuthority=false`, `snapshotPublicationAllowed=false` and `schedulerAuthority=false`.

Current state remains `migrationApplied=false`, `stagingValidated=false`, `validation050Status=pending`. Applying this migration requires a separate exact-head staging authorization.
