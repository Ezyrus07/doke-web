# ANA-A09 — Immutable funnel segmentation authority

## Objective

Define deterministic category/state segmentation for the canonical A09 funnel without joining mutable current catalog rows and without changing A09 identity/linkage authority.

This lot is **repository-only**. It creates no migration, performs no staging read/write, writes no analytics snapshot, activates no browser analytics, touches no production runtime and does not promote ANA beyond **3/6**.

## Root cause

A09 behavior facts contain explicit `service_id`, but they do not carry an immutable category/state snapshot. Joining `public.services` during analytics computation would rewrite historical segments whenever a listing changes category, version or location.

CAT-A06 already solves the historical-dimension problem. Its append-only visibility ledger freezes category/state dimensions at every eligible open/split transition and orders occurrences by `service_id + sequence_no`. CAT-A07 provides the certified forward coverage epoch.

## Canonical source

Segment authority comes only from:

- `private.cat_listing_visibility_events_v1`;
- CAT-A06 frozen `dimension_snapshot_after`;
- CAT-A07 certified forward coverage;
- CAT-owned per-service sequence ordering.

Mutable `public.services`, current category rows and moderation audit history are not historical segmentation authority.

## Funnel anchor

The segment is resolved at the **canonical impression**:

- Search CTR uses the dimension snapshot for the impression identified by `search_request_id + service_id`.
- The strict funnel uses the snapshot for the first canonical impression in `analytics_session_id + service_id`.
- Every downstream stage inherits that same segment for the journey.
- `order.requested` inherits the journey segment; `order_id` remains the only behavior-to-ORD linkage.
- A click or later-stage orphan without a canonical impression cannot invent a segment.

This prevents a listing edit in the middle of a user journey from moving earlier funnel stages into a new category or state.

## Resolution

For the impression `occurred_at`:

1. select CAT-A06 facts for the exact `service_id`;
2. require structurally valid per-service sequence/time ordering;
3. resolve the latest transition at or before the impression time, with `sequence_no` as the same-timestamp tiebreak;
4. require `eligible_after=true`;
5. consume only the frozen `dimension_snapshot_after`;
6. fail closed if the interval or required dimensions are missing.

There is no current-state fallback and no historical inference.

## Category identity

The contract reuses the A11 category-identity continuity rule:

`categoryId > categorySlug > category`

Only frozen fallback tokens are lowercased. State is normalized to uppercase.

A canonical category UUID is **not** equivalent to a slug or freeform name merely because a human might interpret them as the same category. A later CAT transition from a legacy token to a canonical UUID starts a distinct historical segment from that CAT fact forward.

## Coverage and freshness

Authoritative segmented windows require:

- `windowStart >= CAT-A07 coverage_complete_from`;
- structurally valid CAT ledger facts;
- CAT watermark coverage through the selected window;
- exact segment resolution for each authoritative journey anchor.

Segmented freshness therefore adds CAT to the dependency boundary:

- behavior-only: `min(windowEnd, behaviorWatermark, catWatermark)`;
- cross-domain final stage: `min(windowEnd, behaviorWatermark, orderWatermark, catWatermark)`.

If segmentation is unavailable, the segmented projection fails closed. The independently governed global A09 projection is not retroactively invalidated.

Current staging CAT-A07 evidence records `coverage_complete_from = 2026-09-23T00:06:30.6835Z`; this repository contract does not itself read or mutate staging.

## Current authority

- repository segmentation definition: **true**
- runtime segmentation authority: **false**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- staging authority: **false**
- production authority: **false**
- ANA maturity: **3/6**

## Next gate

A separately authorized forward-only runtime candidate may wire this resolver into the A09 server projector, add CAT to segmented `dataThrough`, and prove coverage-boundary, version-split, legacy/UUID identity and no-current-state-fallback behavior in staging.

That future gate is not authorized by this repository-only lot.
