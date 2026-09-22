# ANA-A07 — Freshness and canonical window authority

## Objective

ANA-A07 defines the repository authority for `dataThrough`, dependency watermarks, canonical window selection and the states **fresh / stale / unavailable**. It does not invent a freshness SLA and does not promote ANA-001 beyond **3/6**.

## Root cause

A05 already contains a local `applyFreshness(...)` helper, but its `maxLagSeconds` is supplied ad hoc. There is no canonical threshold registry or dependency-watermark authority.

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

No repository authority currently defines a canonical analytics cadence or `maxLagSeconds` per metric. ANA-A07 therefore forbids an implicit default. Missing threshold policy evaluates fail-closed as **unavailable**.

Runtime activation requires a versioned metric-specific policy containing at least `policyId`, `metricKey`, `metricVersion`, `maxLagSeconds` and `effectiveFrom`.

## Boundaries

This sublot is repository-only. It performs no database access, migration, staging mutation, deploy, browser activation, identity stitching, source-domain repair, payment mutation or production change.

A06 structural data quality and A07 freshness remain distinct dimensions: a reconciliation can be structurally correct and still stale.

ANA-001 remains **3/6**. Runtime watermark materialization, threshold activation and staging proof require a separate authorized lot.
