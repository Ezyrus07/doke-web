# ANA-A04 — Marketplace Funnel and Health Projections

Defines auditable metrics for funnel, liquidity, outcomes and retention.

The behavioral funnel and transaction funnel remain separate unless a legally approved identity bridge exists. Core transaction metrics derive from ORD. Historical demand dimensions use immutable order service snapshots. Historical supply is reconstructed from CAT visibility/version events; pre-ledger history is marked partial rather than fabricated.

Financial metrics such as GMV and take rate return unavailable while PAY lacks canonical provider authority. CAC and LTV remain unavailable without acquisition-spend, attribution, revenue and margin authority.

Marketplace health is a vector of metrics, not a synthetic score.

## Staging runtime implementation

`20260918233000_ana_a04_metric_projection_runtime.sql` is applied in staging as migration version `20260919000822` and provides:

- server-frozen service/category/location dimensions on future ORD metric events;
- demand city/state frozen at the canonical `order.requested` event;
- safe historical enrichment from immutable service snapshots only;
- append-only metric snapshots with revisions and fingerprints;
- `compute_analytics_order_health_v1` for canonical ORD-derived quote fill, fulfillment, disputes, backlog and time-to-first-quote.

Historical demand region is deliberately not backfilled from mutable order columns. Financial metrics remain unavailable.

The canonical staging canary run `35481347306` proved the ORD-derived order-health projection and append-only snapshot path, including deterministic `NO_CHANGE` replay. Post-hardening run `35628667088` preserved that behavior. A read-only reconciliation on 2026-09-23 observed 241 metric snapshot rows.

A04 is intentionally **not** declared the runtime authority for the entire metric surface. Its active staging scope is ORD order-health projection plus append-only snapshot infrastructure. Canonical funnel runtime remains ANA-A09 work, retention remains ANA-A08 work, liquidity runtime is delegated to ANA-A10/A11, and financial metrics remain blocked by PAY authority.
