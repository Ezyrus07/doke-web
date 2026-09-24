# ANA-A09 — Canonical funnel projection

## Objective

ANA-A09 defines a deterministic acquisition-to-order funnel using the canonical ANA behavioral ledger and canonical ORD order facts. It closes the repository semantics only; it does not activate a runtime projector or promote ANA-001 above **3/6**.

## Why this lot exists

ANA-A02/A03 already define and ingest the behavioral stages, while ORD owns `order.requested`. What was missing was a canonical composition rule.

The dangerous shortcut would be to join events by actor id, timestamp proximity or an inferred anonymous identity. ANA-A09 explicitly forbids that.

## Explicit linkage only

The projector uses only explicit keys:

- search exposure: `search_request_id + service_id`;
- behavioral journey: `analytics_session_id + service_id`;
- quote progression: the same `quote_session_id`;
- transactional handoff: `quote.submitted.order_id` must exist as canonical ORD `order.requested`.

No cross-session anonymous stitching, anonymous→authenticated stitching, actor-based joins or temporal heuristics are allowed.

## Strict progression

The strict funnel stages are:

1. impression;
2. click;
3. detail;
4. budget CTA;
5. quote started;
6. quote completed;
7. quote submitted;
8. canonical order requested.

A later stage does not retroactively create a missing earlier stage. Missing links are emitted as orphan evidence, keeping telemetry defects visible instead of fabricating conversion.

`funnel.search_ctr` remains a separate exposure metric and deduplicates by `search_request_id + service_id`.

## dataThrough and zero denominators

Events after `dataThrough` are excluded. ANA-A07 remains the freshness/window authority.

A zero denominator produces `null`, never a synthetic zero-percent conversion rate.

## Segmentation boundary

The current behavioral ledger does not contain immutable service category/state dimensions suitable for canonical funnel segmentation. ANA-A09 therefore keeps behavioral funnel projection global and forbids joining mutable current service state to manufacture historical segmentation.

## CAT liquidity handoff

CAT-A06 now owns a staging-validated append-only listing visibility/version ledger, so the source-timeline blocker described by the original A09 investigation is closed.

Liquidity remains outside A09's ownership. ANA-A10 now defines the repository-only consumer semantics over CAT-A06 facts; runtime liquidity still requires a CAT source watermark, ANA-A07 freshness policy, append-only snapshot/reconciliation wiring and controlled staging evidence.

## Runtime boundary

This lot is repository-only. It creates no migration, staging read/write, deploy, browser activation, identity stitching, source-domain mutation or production change.

Runtime closure still requires a server-side projector, A04/A05 append-only snapshot/revision semantics, A07 watermarks, controlled staging evidence, and explicit immutable segmentation authority.

ANA-001 remains **3/6**.

## A07 dependency-watermark handoff

The funnel now has a repository-defined watermark dependency contract, but no runtime watermark functions are applied yet.

Behavioral rows must be bounded by server-owned `received_at`; ORD metric rows must be bounded by DB-owned `created_at`. `occurred_at` remains the canonical event-time dimension for funnel chronology and never becomes a completeness watermark.

Behavior-only funnel metrics use `min(windowEnd, behaviorWatermark)`. The final `quote_submitted → order_requested` handoff requires `min(windowEnd, behaviorWatermark, orderWatermark)`.

A fact materialized after a prior watermark but carrying an older `occurred_at` is a late fact and must enter via A05 append-only revision/backfill semantics. It is never retroactively injected by mutating a finalized snapshot.

ANA-A10/A11 liquidity is operationally closed outside A09 and is no longer an A09 blocker. The remaining A09 blockers are its own runtime watermarks, projector, metric-specific freshness thresholds and controlled staging evidence.

The A07 behavior/ORD watermark runtime candidate is now repository-ready at `supabase/migrations/20260923224000_ana_a07_behavior_ord_dependency_watermarks.sql`, but remains unapplied. A09 activation still requires validation 041 plus multi-session concurrency/late-fact staging evidence.

A07 validation 041 now passes after the compatibility migration. A07 behavior/ORD runtime watermark authority is now certified and can be consumed by A09. A09 remains blocked on the server-side funnel projector, materialization-time filtering, metric-specific funnel thresholds, segmentation authority and controlled empty-window/late-fact projection evidence.

## Server-side projector candidate

The repository now contains the compute-only server-side projector candidate:

- `supabase/migrations/20260923235500_ana_a09_canonical_funnel_projector.sql`
- `supabase/tests/042_ana_a09_canonical_funnel_projector_validation.sql`
- `config/ana-a09-server-side-funnel-projector-runtime-readiness.json`

The candidate consumes the certified A07 behavior/ORD watermarks and separates event time from materialization time. Behavior rows require both `occurred_at` and `received_at` within the certified boundary; ORD rows require both `occurred_at` and `created_at`.

The final `quote_submitted -> order_requested` transition is recomputed at the cross-domain minimum watermark, so an ORD lag cannot create a false missing-order denominator.

The RPC is compute-only and keeps `snapshotPublicationAllowed=false`. A04 append-only snapshot publication, A07 metric-specific thresholds and complete/orphan/empty-window/late-fact staging canaries remain separate gates. The migration is **not applied** by this repository-only lot.
