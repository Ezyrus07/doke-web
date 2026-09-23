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

## Scheduler topology readiness

Read-only reconciliation now closes the mechanism question without creating a schedule. The canonical candidate topology is **Supabase `pg_cron` with a database-local SQL invocation of `public.run_analytics_cat_liquidity_projection_v1`**.

This is an architectural selection, not scheduler activation:

- the A10 runner is already database-local, `SECURITY DEFINER` and owned by `postgres`;
- existing Doke cron jobs in staging run as `postgres`;
- the runner is not executable by `anon` or `authenticated`;
- no ANA/liquidity cron exists today;
- introducing an Edge Function or GitHub Actions publisher would create a second authority without a runtime requirement.

Therefore `pg_cron` is the selected topology, while `schedulerActivationAuthorized=false`.

## Additional root-cause gaps

Cadence and delay SLO are necessary but not sufficient. Two structural authorities are also missing.

### Canonical window grid

The runner accepts arbitrary `windowStart/windowEnd`. A numeric `windowStepSeconds` alone does not identify which boundaries belong to the canonical series. Before activation, ANA must version the boundary anchor/alignment rule (and time-zone semantics if applicable).

Canary windows, execution time and another domain's cron boundaries are not valid substitutes.

### Canonical dimension-series enumeration

ANA-A10 requires liquidity segmentation by **category identity + state**, but the runtime exposes only a per-series runner:

`run_analytics_cat_liquidity_projection_v1(windowStart, windowEnd, serviceCategory, serviceState)`

No staging function currently enumerates the required liquidity dimension series. Existing ANA snapshots cannot be used as the enumerator because they only represent series that were already materialized and would miss a newly appearing CAT category/state pair. Mutable current catalog rows are also forbidden as historical dimension authority.

The future enumerator must derive the global series plus required category/state series from CAT-owned frozen dimension facts and the CAT-A07 forward-coverage state.

## Missed-window recovery

The existing append-only snapshot writer already supplies the necessary replay primitive:

- exact replay with unchanged source/projection fingerprints returns `NO_CHANGE`;
- divergent concurrent writes fail closed with `DOKE_ANALYTICS_METRIC_REVISION_CONFLICT`.

The scheduler contract therefore requires **oldest missing canonical closed window first** and forbids silently jumping to the latest window. The per-invocation catch-up bound remains unset; unbounded backlog processing is not authorized.

## Values still intentionally unset

The following remain `null`/unauthorized:

- `windowStepSeconds`;
- `projectionDelaySloSeconds`;
- `maxLagSeconds`;
- canonical window-boundary anchor/time-zone semantics;
- `maxCatchUpWindowsPerInvocation`;
- dimension-series enumerator activation;
- scheduler activation;
- freshness-policy insert.

This refinement changes no runtime and does not promote ANA above **3/6**.

## Repository candidate — dimension-series orchestration

The remaining dimension-series gap now has a repository-only candidate:

- `supabase/migrations/20260923011500_ana_a11_liquidity_series_orchestration.sql`
- `supabase/tests/034_ana_a11_liquidity_series_orchestration_validation.sql`

It defines two private, owner-only helpers:

1. `private.list_analytics_cat_liquidity_series_v1(windowStart, windowEnd)`
   - emits the global series first;
   - then emits every valid category/state pair frozen in CAT-A06 facts from the certified CAT-A07 coverage epoch through `windowEnd`;
   - validates the same certified epoch and CAT transaction-snapshot watermark used by A10;
   - never joins `public.services`, `service_versions`, or another mutable catalog projection.

2. `private.run_analytics_cat_liquidity_window_v1(windowStart, windowEnd)`
   - delegates every series to the existing canonical `public.run_analytics_cat_liquidity_projection_v1`;
   - treats only `APPENDED` and `NO_CHANGE` as valid append outcomes;
   - executes all series for one window inside one SQL statement/transaction, so an uncaught series failure cannot commit a partially published window.

The category/state universe is intentionally monotonic from the certified coverage epoch. If a pair previously had supply and later reaches zero, it remains enumerable, allowing the canonical series to publish zero rather than silently disappearing.

This candidate **does not** create a cron, choose a window grid, choose a catch-up bound, insert a freshness policy, or mutate staging. Explicit staging migration authorization is still required before these functions exist remotely.

