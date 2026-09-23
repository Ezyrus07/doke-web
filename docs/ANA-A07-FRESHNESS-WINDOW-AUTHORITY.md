# ANA-A07 — Freshness and canonical window authority

## Objective

ANA-A07 defines the repository authority for `dataThrough`, dependency watermarks, canonical window selection and the states **fresh / stale / unavailable**. It does not invent a freshness SLA and does not promote ANA-001 beyond **3/6**.

## Root cause

A05 already contains a local `applyFreshness(...)` helper, but its `maxLagSeconds` was historically supplied ad hoc. ANA-A07 therefore established the versioned threshold/dependency-watermark authority. `liquidity.active_service_seconds` now consumes explicit revision-1 policy `ana-a11-liquidity-v1-r1`; no global default was introduced.

A04 also returns `dataThrough = windowEnd` from `compute_analytics_order_health_v1(...)`. That is acceptable as a calculation boundary only when every canonical dependency is actually proven materialized through the same point. The current runtime does not yet prove that watermark.

A06 exposed a related selection problem: an older non-empty PASS cannot be chosen merely because a newer canonical observation is `no_data`.

## Canonical dataThrough

`dataThrough` means the greatest timestamp through which **all required canonical dependencies** are proven materialized.

It is not:

- `computedAt`;
- the maximum event timestamp;
- the end of a requested window by assumption.

For a closed window, the canonical value is bounded by `windowEnd` and the minimum authoritative dependency watermark. A declared `dataThrough` later than a dependency watermark fails closed as unavailable.

An empty window can still be fresh if the source watermark proves the pipeline processed through that window. This keeps **freshness** separate from **sample sufficiency/data quality**.

## Canonical window selection

Candidates must belong to one metric series: same metric key, metric version and dimensions.

Only closed windows are eligible. The selector orders by:

1. `windowEnd DESC`;
2. `revision DESC`;
3. `computedAt DESC`;
4. deterministic id tiebreak.

Freshness is evaluated **after** selecting that latest canonical window. There is no fallback to an older window simply because it is fresh, non-empty or PASS.

## State rules

- **unavailable** — missing versioned threshold, missing/unavailable dependency watermark, no eligible closed window, no coverage of the selected window, or a declared watermark that overclaims dependency coverage;
- **stale** — the selected window is only partially covered, an upstream dependency is stale, the snapshot is already stale, or the policy lag is exceeded;
- **fresh** — the selected closed window is fully covered, all dependencies are available, and `evaluatedAt - dataThrough <= maxLagSeconds`.

`sample_count=0` alone does not determine freshness.

## Threshold boundary

ANA-A07 continues to forbid an implicit global default. Missing metric-specific threshold policy evaluates fail-closed as **unavailable**.

For `liquidity.active_service_seconds v1`, revision-1 policy `ana-a11-liquidity-v1-r1` is active from `2026-09-23T16:00:00Z` with `maxLagSeconds=360`. Post-effective staging evidence confirms that the latest canonical closed window is evaluated directly against that threshold with no fallback to an older window. Other metrics remain independently pending until they receive their own versioned policies.

## Boundaries

This sublot is repository-only. It performs no database access, migration, staging mutation, deploy, browser activation, identity stitching, source-domain repair, payment mutation or production change.

A06 structural data quality and A07 freshness remain distinct dimensions: a reconciliation can be structurally correct and still stale.

ANA-001 remains **3/6**. For CAT liquidity, watermark materialization, threshold activation and post-effective staging proof are closed; remaining ANA metrics and broader maturity gates stay independently governed.

## Behavior + ORD dependency watermark authority

A07 now has a repository-only authority for the two non-CAT dependencies used by the canonical funnel. The detailed contract is `config/ana-a07-behavior-ord-watermark-authority.json`.

The authority deliberately separates **event time** from **materialization time**:

- behavior: `occurred_at` is event time; server-owned `received_at` is materialization time;
- ORD metrics: `occurred_at` is event time; DB-owned `created_at` on `private.order_metric_events` is materialization time.

The proposed runtime basis is `active_transaction_floor_v1`: use the current database's earliest active transaction start with an inclusive-boundary predecessor, and fail closed if any prepared transaction exists. This allows empty windows to advance without relying on `max(event timestamp)` and prevents a later commit from being silently counted below an already-published materialization watermark.

The runtime implementation is **not applied** in this lot. A future forward-only migration and concurrency canary require separate authorization.

## Behavior/ORD runtime candidate

The repository now contains `supabase/migrations/20260923224000_ana_a07_behavior_ord_dependency_watermarks.sql` and rollback-only validation `supabase/tests/041_ana_a07_behavior_ord_dependency_watermarks_validation.sql`. They remain unapplied in staging. No scheduler or source-data write is part of the candidate.

## Watermark staging validation status

The behavior/ORD migration and forward-only compatibility migration are present in staging. Validation 041 now passes and the no-active-transaction envelopes/grants are healthy. Runtime watermark authority nevertheless remains false until the multi-session concurrent-writer canary proves the transaction-floor behavior under a real in-flight writer.
