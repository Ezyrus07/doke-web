# ANA-A04 — Marketplace Funnel and Health Projections

Defines auditable metrics for funnel, liquidity, outcomes and retention.

The behavioral funnel and transaction funnel remain separate unless a legally approved identity bridge exists. Core transaction metrics derive from ORD. Historical demand dimensions use immutable order service snapshots. Historical supply is reconstructed from CAT visibility/version events; pre-ledger history is marked partial rather than fabricated.

Financial metrics such as GMV and take rate return unavailable while PAY lacks canonical provider authority. CAC and LTV remain unavailable without acquisition-spend, attribution, revenue and margin authority.

Marketplace health is a vector of metrics, not a synthetic score.

## Repository runtime implementation

`20260918233000_ana_a04_metric_projection_runtime.sql` prepares:

- server-frozen service/category/location dimensions on future ORD metric events;
- demand city/state frozen at the canonical `order.requested` event;
- safe historical enrichment from immutable service snapshots only;
- append-only metric snapshots with revisions and fingerprints;
- `compute_analytics_order_health_v1` for canonical ORD-derived quote fill, fulfillment, disputes, backlog and time-to-first-quote.

Historical demand region is deliberately not backfilled from mutable order columns. Financial metrics remain unavailable.
