# ANA-A09 — Immutable funnel segmentation authority

## Objective

Define deterministic category/state segmentation for the canonical A09 funnel without joining mutable current catalog rows and without changing A09 identity/linkage authority.

This lot remains **repository-only**, but the separately authorized runtime candidate is now prepared. It creates a forward-only migration file and rollback-only validation in the repository; it performs no staging read/write, applies no migration, writes no analytics snapshot, creates no scheduler, touches no production runtime and does not promote ANA beyond **3/6**.

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

## Prepared runtime candidate

Authorization consumed:

`authorize-ana-a09-immutable-funnel-segmentation-runtime-candidate-repository-only head=1d652625a7944edd102d79d4b61e1dbc787b28a0 matrix=v1.3.132 contractId=ana-a09-immutable-funnel-segmentation-v1`

Authorization SHA-256: `3a4e39631306e34efb43a9f626f13a26c2528a229a8778e9e33e486d82ed2ff6`.

Repository artifacts:

- migration candidate: `supabase/migrations/20260925145500_ana_a09_immutable_funnel_segmentation_runtime.sql`;
- rollback-only validation: `supabase/tests/047_ana_a09_immutable_funnel_segmentation_runtime_validation.sql`;
- private resolver candidate: `private.analytics_a09_funnel_segment_for_anchor_v1`;
- public service-role compute candidate: `public.compute_analytics_canonical_funnel_segmented_v1`.

The candidate is compute-only. It resolves the CAT interval at the canonical impression, verifies the CAT-A07 coverage epoch, adds the CAT watermark to segmented `dataThrough`, fails closed on unresolved/invalid CAT segmentation and leaves the existing global A09 projector unchanged.

Current candidate state:

- migration created in repository: **true**
- migration applied in staging: **false**
- validation 047 executed: **false**
- runtime segmentation authority: **false**
- snapshot write/publication authority: **false**
- scheduler creation: **false**

Validation 047 is designed to prove owner/grant boundaries, no mutable-current-service fallback, legacy category resolution, same-timestamp `sequence_no` ordering, version/category/state split behavior, pre-coverage fail-closed behavior and the continued runtime/publication deny boundary. It must run only after a separate staging authorization.

## Current authority

- repository segmentation definition: **true**
- runtime segmentation authority: **false**
- runtime snapshot authority: **false**
- snapshot publication authority: **false**
- staging authority: **false**
- production authority: **false**
- ANA maturity: **3/6**

## Next gate

The runtime candidate is now prepared but unapplied. The next gate is a separate explicit **staging-only** authorization to apply migration `20260925145500` and execute rollback-only validation `047`. That gate must keep runtime snapshot/publication, production, merge and Ready authority false.
