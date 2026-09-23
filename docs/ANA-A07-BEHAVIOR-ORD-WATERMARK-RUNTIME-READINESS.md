# ANA-A07 — Behavior + ORD watermark runtime readiness

This lot materializes the **repository candidate** for ANA-A07 dependency watermarks. It does not apply anything to staging.

- migration: `supabase/migrations/20260923224000_ana_a07_behavior_ord_dependency_watermarks.sql`
- structural validation: `supabase/tests/041_ana_a07_behavior_ord_dependency_watermarks_validation.sql`
- ANA remains **3/6**

## Runtime candidate

The migration creates:

- `private.analytics_transaction_floor_watermark_v1()`;
- `private.analytics_behavior_watermark_v1()`;
- `private.order_metric_watermark_v1()`.

The helper is PostgreSQL-owner-only. The wrappers are service-role-only; `anon` and `authenticated` remain denied. No scheduler is introduced.

The helper clears the statistics snapshot, captures `clock_timestamp()`, scans current-database active transactions, then scans prepared transactions. Prepared transactions fail closed. Otherwise the inclusive watermark is the observation clock or the earliest active foreign transaction start minus one microsecond.

Behavior keeps `occurred_at` as event time and `received_at` as materialization time. ORD keeps `occurred_at` as event time and `created_at` as materialization time.

Validation 041 is read-only/rollback-only. A real concurrent-writer canary still requires multiple staging sessions and separate authorization. The prepared-xact runtime branch cannot be exercised while staging has `max_prepared_transactions=0`.

No migration application, staging write, browser activation, source mutation, scheduler, production, merge or Ready for review is authorized here.

## Staging validation failure and forward-only compatibility candidate

The original migration was applied in staging as `20260923230106 / ana_a07_behavior_ord_dependency_watermarks`.

Validation `041` then failed with PostgreSQL error `42883` because the helper used `pg_catalog.least(timestamptz,timestamptz)`. PostgreSQL implements `LEAST` as a conditional expression, not a schema-qualified `pg_catalog` function.

The original migration remains immutable. Repository migration `supabase/migrations/20260923231000_ana_a07_behavior_ord_watermark_compatibility.sql` redefines **only** `private.analytics_transaction_floor_watermark_v1()` and replaces the invalid qualification with an explicit `CASE`.

The candidate preserves:

- active-transaction scan before prepared-transaction scan;
- current-database scope and current-backend exclusion;
- prepared-transaction fail-closed behavior;
- one-microsecond inclusive predecessor;
- owner/grant boundary;
- behavior and ORD wrappers unchanged;
- no scheduler and no source-domain DML.

The compatibility migration was subsequently applied in staging as `20260923231132 / ana_a07_behavior_ord_watermark_compatibility`. Validation 041 was rerun and **PASSED**. This closes the structural/runtime-envelope failure, but does not certify multi-session concurrency or late-fact behavior.

## Compatibility runtime reconciliation

Canonical runtime evidence is persisted at `reports/generated/ana-a07-watermark-compatibility-runtime-evidence.json`. The helper now executes with explicit `CASE`, wrappers return healthy `fresh / NO_ACTIVE_TRANSACTION` envelopes, and owner/grant boundaries pass validation 041. A07 runtime watermark authority remains intentionally false until the separately authorized multi-session concurrent-writer canary passes. Late-fact certification remains downstream with A09 projection evidence.
