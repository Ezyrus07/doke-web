# ANA-A05 — Reconciliation and Data Quality

Defines deterministic source/projection fingerprints, exact ORD reconciliation, temporal CAT reconciliation, behavioral pipeline conservation, freshness, late-event handling, append-only revisions and controlled backfills.

Projection states are authoritative, stale and unavailable. Reconciliation states are matched, diverged, blocked and not_applicable.

A finalized metric is never silently overwritten. Source changes create a revision; formula changes create a metric version. Unchanged recomputation is a no-op.

The authenticated staging canary has already closed the 2→3 gate, so ANA-001 is **3/6**. Moving from 3 to 4 still requires the remaining staging-operational funnel, retention, freshness and data-quality ownership gates.

## Staging runtime implementation

`20260918234000_ana_a05_reconciliation_runtime.sql` is applied in staging as migration version `20260919000826`; reconciliation-dimension hardening is applied as `20260919003223`. The runtime provides append-only reconciliation evidence and low-cardinality data-quality rollups. The ORD source uses `private.order_domain_events.created_at`, while the canonical metric projection uses `private.order_metric_events.occurred_at`.

`run_analytics_order_reconciliation_v1` compares counts, event type, subject and timestamp identity, records source/projection/comparison fingerprints, and emits technical mismatch rollups. It has no authority to mutate ORD source facts or to convert business KPI movement into an engineering incident.

Canonical staging canary run `35481347306` proved ORD reconciliation and deterministic unchanged-fingerprint behavior; post-hardening run `35628667088` recertified the path. A read-only reconciliation on 2026-09-23 observed 242 reconciliation rows and 484 data-quality rollups. A05 now owns active staging reconciliation, but it still does not own source-domain mutation, business KPI alerting or analytics metric projection itself.
