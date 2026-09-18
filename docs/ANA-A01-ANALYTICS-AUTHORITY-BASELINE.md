# ANA-A01 — Analytics Authority Baseline

Repository-only baseline for ANA-001. It inventories existing analytics authority without activating runtime, migrations, staging or production.

## Current split

- AUTH owns canonical registration facts.
- ANA legacy service/quote metrics remain browser-authored or mixed-trust behavior.
- ORD owns canonical order facts and its idempotent metric projection.
- SEARCH-A09 is operational observability, not product-behavior authority.
- PAY remains contract-only for financial facts.
- REP retention semantics grant no analytics-write authority.

The baseline freezes twelve findings covering taxonomy, identity, time authority, reconciliation, financial authority, privacy lifecycle and metric governance. ANA-001 remains maturity 2/6.
