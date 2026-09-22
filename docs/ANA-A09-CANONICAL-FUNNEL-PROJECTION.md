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

## CAT liquidity blocker

The investigation also confirms why `liquidity.active_service_seconds` cannot be operationalized yet. CAT-A03 updates mutable `public.services.status` and `statusChangedAt`, but there is no append-only CAT listing-visibility timeline. ANA cannot reconstruct historical supply from current service state.

A CAT-owned append-only visibility/version ledger is required before liquidity runtime projection.

## Runtime boundary

This lot is repository-only. It creates no migration, staging read/write, deploy, browser activation, identity stitching, source-domain mutation or production change.

Runtime closure still requires a server-side projector, A04/A05 append-only snapshot/revision semantics, A07 watermarks, controlled staging evidence, and explicit immutable segmentation authority.

ANA-001 remains **3/6**.
