# ANA-A09 — Server-side funnel projector runtime readiness

This lot creates the **repository-only** server-side funnel projector candidate. Nothing is applied to staging.

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

A later separately authorized lot must apply the migration, run validation 042, define/approve required funnel freshness policies, and prove complete/orphan/empty-window/late-materialized behavior before snapshots can become runtime authority.
