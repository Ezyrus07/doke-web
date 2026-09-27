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

The behavioral ledger still does not carry immutable category/state dimensions directly, so the **currently installed A09 runtime remains global-only**. Immutable segmentation is now repository-defined through CAT-A06 frozen dimensions + the CAT-A07 coverage epoch, and the segmented compute candidate is installed and validation 047 is PASS in staging, while repository runtime segmentation authority is now granted and the live segmented authority marker remains false. Mutable current service state remains forbidden as historical dimension authority.

## CAT liquidity handoff

CAT-A06 now owns a staging-validated append-only listing visibility/version ledger, so the source-timeline blocker described by the original A09 investigation is closed.

Liquidity remains outside A09's ownership. ANA-A10 now defines the repository-only consumer semantics over CAT-A06 facts; runtime liquidity still requires a CAT source watermark, ANA-A07 freshness policy, append-only snapshot/reconciliation wiring and controlled staging evidence.

## Runtime boundary

This lot is repository-only. It creates no migration, staging read/write, deploy, browser activation, identity stitching, source-domain mutation or production change.

Global runtime projection, A07 watermarks, freshness policy activation and four-path canaries are closed at their current authorities. Remaining A09 gates are a forward-only live segmented runtime authority-marker alignment candidate/application and append-only snapshot publication authority; both remain separately authorized.

ANA-001 remains **3/6**.

## A07 dependency-watermark handoff

The A07 behavior/ORD watermark runtime is certified in staging. Segmented A09 projection additionally requires the existing CAT visibility watermark and CAT-A07 coverage epoch; the segmented candidate is installed and staging-validated; authority remains explicitly closed.

Behavioral rows must be bounded by server-owned `received_at`; ORD metric rows must be bounded by DB-owned `created_at`. `occurred_at` remains the canonical event-time dimension for funnel chronology and never becomes a completeness watermark.

Global behavior-only funnel metrics use `min(windowEnd, behaviorWatermark)` and the global final handoff uses `min(windowEnd, behaviorWatermark, orderWatermark)`. The prepared segmented candidate tightens these to include `catWatermark` for both behavior-only and cross-domain segmented series.

A fact materialized after a prior watermark but carrying an older `occurred_at` is a late fact and must enter via A05 append-only revision/backfill semantics. It is never retroactively injected by mutating a finalized snapshot.

ANA-A10/A11 liquidity is operationally closed outside A09 and is no longer an A09 blocker. A09's global projector/watermarks/policies/canaries are closed at their current authorities; the category/state runtime is installed and validation 047 is PASS; repository runtime segmentation authority is granted; the outstanding segmentation gate is live marker alignment through a separate forward-only candidate/application.

A07 behavior/ORD watermark migration `20260923224000` and compatibility migration are applied and validation 041 plus concurrent-writer evidence are certified. This history is now an upstream dependency, not an open A09 gate.

A07 validation 041 passes, the global A09 projector is installed, r1 funnel freshness policies are active, and complete/orphan/empty-window/late-fact canaries are certified. Immutable segmentation semantics and a forward runtime candidate now exist in the repository, and validation 047 now passes in staging, and repository runtime segmentation authority is now granted, while the live segmented compute marker remains false until separately aligned.

## Server-side projector candidate

The repository now contains the compute-only server-side projector candidate:

- `supabase/migrations/20260923235500_ana_a09_canonical_funnel_projector.sql`
- `supabase/tests/042_ana_a09_canonical_funnel_projector_validation.sql`
- `config/ana-a09-server-side-funnel-projector-runtime-readiness.json`

The candidate consumes the certified A07 behavior/ORD watermarks and separates event time from materialization time. Behavior rows require both `occurred_at` and `received_at` within the certified boundary; ORD rows require both `occurred_at` and `created_at`.

The final `quote_submitted -> order_requested` transition is recomputed at the cross-domain minimum watermark, so an ORD lag cannot create a false missing-order denominator.

The global RPC remains compute-only and keeps `snapshotPublicationAllowed=false`. Migration `20260924002741 / ana_a09_canonical_funnel_projector` is installed and validation 042 passes. The historical live compute observation remains `runtimeAuthority=false` and `segmentation=global_only`; later policy/canary closure and repository projection authority do not rewrite that evidence. The separate segmented runtime candidate `20260925145500` is installed in staging as `20260926222750`, and validation `047` is PASS. Canonical staging evidence blob: `48ce9933a209232ab5619fdbd1f28b1fff223a4e`; repository runtime segmentation authority is granted; the historical/live segmented compute marker remains false.

Runtime evidence: `reports/generated/ana-a09-server-side-funnel-projector-runtime-evidence.json`.


## Repository runtime projection authority

The four-path A07/A09 runtime canary evidence is certified at blob `3b7274a391a857f2de06538f3302f6be01b06734`. The explicit repository-only authorization bound to HEAD `28960baecb1b495b16c3799c55a80305764db0ac` now grants A09 runtime projection authority at the contract layer.

This does **not** mutate staging. The historical staging compute observation still returns `runtimeAuthority=false`; `runtimeSnapshotAuthority=false` and `snapshotPublicationAllowed=false` remain authoritative boundaries. Any forward-only live runtime flag alignment or snapshot publication requires a separate explicit authorization. ANA remains **3/6**.


## Canonical funnel snapshot payload adapter candidate

The repository now contains a compute-only global funnel snapshot payload adapter candidate at `supabase/migrations/20260927230000_ana_a09_canonical_funnel_snapshot_payload_adapter.sql` with rollback-only validation `051`.

The adapter converts the eight global A09 metrics into the existing A04/A05 append schema, binds each metric to the active A07/A09 freshness policy, emits deterministic source/projection fingerprints, uses `reconciliationState=not_applicable` rather than inventing reconciliation success, and never invokes the append RPC.

This candidate remains unapplied and staging-unvalidated. `runtimeSnapshotAuthority=false`, `snapshotPublicationAuthority=false` and scheduler authority remain closed. Segmented snapshot publication is not covered by this candidate.
