# ANA-A05 — Reconciliation and Data Quality

Defines deterministic source/projection fingerprints, exact ORD reconciliation, temporal CAT reconciliation, behavioral pipeline conservation, freshness, late-event handling, append-only revisions and controlled backfills.

Projection states are authoritative, stale and unavailable. Reconciliation states are matched, diverged, blocked and not_applicable.

A finalized metric is never silently overwritten. Source changes create a revision; formula changes create a metric version. Unchanged recomputation is a no-op.

Repository-only materialization does not promote ANA-001. Moving from maturity 2 to 3 requires an authenticated staging canary; moving from 3 to 4 requires staging-operational ingestion, projections, reconciliation, freshness and data-quality controls.
