# ANA-A09 — Server-side funnel projector runtime readiness

The server-side funnel projector is now installed in **staging** and validation 042 passes. This document still treats policy activation and snapshot publication as separate gates.

- migration: `supabase/migrations/20260923235500_ana_a09_canonical_funnel_projector.sql`
- validation: `supabase/tests/042_ana_a09_canonical_funnel_projector_validation.sql`
- ANA remains **3/6**

The candidate creates a private chronological stage projector and a service-role-only compute RPC. It is deliberately **compute-only**: it does not append snapshots, mutate source facts or create a scheduler.

## Watermark and time model

Behavior rows require both `occurred_at <= dataThrough` and `received_at <= dataThrough`. ORD rows require both `occurred_at <= dataThrough` and `created_at <= dataThrough`.

Behavior-only metrics use the behavior watermark. The final `quote_submitted -> order_requested` transition recomputes the funnel at the cross-domain minimum of behavior + ORD watermarks, preventing a newer submitted quote from becoming a false missing-order orphan while ORD is behind.

## Linkage and chronology

The projector uses only explicit keys:

- search exposure: `search_request_id + service_id`;
- journey: `analytics_session_id + service_id`;
- quote: same `quote_session_id`;
- transactional handoff: explicit `quote.submitted.order_id`.

Stages must occur chronologically. Actor IDs, time-proximity reconstruction, cross-session stitching and anonymous-to-authenticated stitching are prohibited.

## Snapshot boundary

The compute result exposes source fingerprints and the A04 append RPC handoff, but sets `snapshotPublicationAllowed=false`. No metric-specific A07 threshold is invented in this lot.

Migration application and structural validation are complete. Funnel freshness policy activation and complete/orphan/empty-window/late-fact canaries are now certified, and the explicit repository-only gate grants runtime projection authority at the contract layer. Snapshot authority/publication and any live runtime flag alignment remain separately authorized gates.

## Staging runtime reconciliation

Migration `20260924002741` is applied and validation 042 is **PASS**. The historical compute observation is healthy and service-role-only and returns `runtimeAuthority=false` / `snapshotPublicationAllowed=false`; that evidence predates the later policy/canary closure and is not rewritten. Repository runtime projection authority is now true, but this grant performs no staging mutation. No A09 cron job exists. Canonical historical runtime evidence: `reports/generated/ana-a09-server-side-funnel-projector-runtime-evidence.json`.


## Immutable segmentation runtime candidate

The installed global projector remains unchanged. A separately authorized **repository-only** candidate now exists for category/state segmentation:

- migration candidate: `supabase/migrations/20260925145500_ana_a09_immutable_funnel_segmentation_runtime.sql`
- validation candidate: `supabase/tests/047_ana_a09_immutable_funnel_segmentation_runtime_validation.sql`
- resolver: `private.analytics_a09_funnel_segment_for_anchor_v1`
- compute RPC: `public.compute_analytics_canonical_funnel_segmented_v1`

The candidate consumes only CAT-A06 frozen visibility dimensions, requires a CAT-A07 certified coverage epoch, anchors each journey at its canonical impression, and adds the CAT visibility watermark to segmented `dataThrough`. It never joins mutable current service state and never equates category UUIDs with slug/name tokens by inference.

Current status is deliberately **unapplied**: migration application = false, validation 047 = pending, runtime segmentation authority = false, snapshot/publication authority = false. A separate staging-only authorization is required before either migration application or validation execution.
