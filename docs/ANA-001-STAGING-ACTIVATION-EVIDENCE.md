# ANA-001 — Staging Activation Evidence

The canonical ANA staging runtime is activated and validated without touching production.

Applied database migrations:
- ANA-A03 behavioral event ledger;
- ANA-A04 metric projection runtime;
- ANA-A05 reconciliation runtime;
- A03 server-event idempotency hardening follow-up;
- A05 event-key and immutable-dimension reconciliation hardening follow-up.

Current Edge runtime observed after canonical policy configuration:
- `search-public-services-v2` is ACTIVE at version 8 with `verify_jwt=false`;
- `analytics-behavior-v1` is ACTIVE at version 6 with `verify_jwt=false`.

The eight canonical ANA runtime secret names are present in staging. Secret values remain outside the repository and browser.

## Canonical functional canary

Workflow run `35481347306`, job `105999617853`, executed the canonical no-shim staging canary against project `zwkczgewzbsorbrjuzpb`.

Result: **15/15 passed**.

The run proved:
- exact password login for the synthetic client and professional;
- analytics session issuance;
- signed search exposure proof issuance;
- valid impression ingestion;
- idempotent replay of the same client event;
- rejection of payload drift for the same client event identity;
- rejection of a tampered exposure proof;
- quote-session issuance and structural quote progress;
- submitted quote linkage to the controlled synthetic order;
- exclusion of owner traffic;
- authoritative order-health projection;
- ORD reconciliation;
- metric snapshot append followed by deterministic `NO_CHANGE`.

The canary reported:
- `productionChanged=false`;
- `browserClientActivated=false`;
- `paymentMutation=false`;
- `anonymousIdentityStitching=false`.

A read-only post-check of the canary window found only allowlisted authenticated behavioral event classes and no prohibited PII dimension keys.

## Security and privacy boundary

The technical ANA runtime policy remains:
- analytics session TTL: 1800 seconds;
- quote-session TTL: 3600 seconds;
- signed search exposure TTL: 300 seconds;
- rate limit: 120 requests per 60 seconds;
- semantic deduplication window: 60 seconds.

These values are security/integrity controls, not personal-data retention authority. Persistent anonymous identity, cross-session/cross-device stitching and anonymous-to-authenticated stitching remain disabled. Consent, data retention, anonymization, export and deletion remain governed by `LEGAL-B03`.

The browser analytics client remains disabled by default. Production remains untouched and blocked.

## Maturity decision

ANA-001 now has canonical staging canary evidence and qualifies for **3/6 — staging canary or hybrid**. This promotion does not imply production readiness. PAY-backed GMV/take rate and downstream CAC/LTV remain unavailable until PAY is canonical, and privacy lifecycle decisions remain blocked by `LEGAL-B03`.

## Defense-in-depth hardening preflight

A fresh read-only staging inspection after the 3/6 promotion found that the four private ANA runtime tables remain protected by schema/grant boundaries and server-only RPC authority, but do not yet have RLS enabled:

- `private.analytics_behavior_events_v1`;
- `private.analytics_metric_snapshots_v1`;
- `private.analytics_reconciliation_runs_v1`;
- `private.analytics_data_quality_rollups_v1`.

This is not a current browser exposure: `anon` and `authenticated` have no direct table grants. `service_role` has direct `SELECT` only on the ANA private tables, while canonical writes are performed through postgres-owned `SECURITY DEFINER` RPCs. Both `postgres` and `service_role` have `BYPASSRLS` in staging.

The Supabase performance advisor also reports three ANA foreign keys without covering indexes:

- `private.analytics_behavior_events_v1(order_id)`;
- `private.analytics_data_quality_rollups_v1(source_run_id)`;
- `private.analytics_metric_snapshots_v1(supersedes_snapshot_id)`.

The repository-only hardening contract is `config/ana-001-defense-in-depth-hardening-readiness.json`. It plans exactly four `ENABLE ROW LEVEL SECURITY` statements and three idempotent single-column covering indexes. It explicitly forbids `FORCE ROW LEVEL SECURITY`, new RLS policies, grant expansion, frontend activation, Edge deployment, identity stitching and production mutation.

No hardening migration file exists in this lot and no staging mutation was authorized or executed. The future migration may be created and applied only after the explicit authorization phrase recorded by the contract; generic continuation is not accepted.

