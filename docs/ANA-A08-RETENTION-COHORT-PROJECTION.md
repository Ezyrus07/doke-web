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

This sublot is repository-only. It creates no SQL projection, migration, staging row, deploy or browser activation.

Runtime closure still requires server-side projection, append-only A04/A05 snapshot/revision semantics, A07 watermark enforcement and controlled staging cohort evidence.

ANA-001 remains **3/6**.
