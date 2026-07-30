# ORD-A07C — Staging Migration Application

## Status

`staging_cron_freshness_headers_applied_and_verified`

The exact staging authorization phrase was received on 2026-07-30. Its scope was limited to applying the canonical ORD-A07C migration and performing read-only post-application verification.

## Applied migration

- Repository path: `supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql`
- SHA-256: `542411c1bd1d7db26301eb403601ddfa22e3284b45c817442aa917a8adcbf16e`
- Git blob: `5d5496cbbeaa9430bcb727cb961c2a64d6635f4b`
- Applied name: `ord_a07c_worker_invocation_headers`
- Supabase-recorded version: `20260730204044`

The Supabase connector recorded the actual execution timestamp. Migration history was not edited manually.

## Verified behavior

The staging function now emits:

- `x-doke-worker-issued-at` as a 13-digit Unix epoch timestamp in milliseconds;
- `x-doke-worker-nonce` as a 32-character base64url value without padding;
- the existing worker token and `cron` source headers.

The migration preserved:

- `private.recover_stale_order_event_claims(300)`;
- Vault secrets `doke_project_url` and `doke_order_event_worker_token`;
- endpoint `/functions/v1/order-event-worker`;
- payload `{ source: "cron", limit: 25 }`;
- timeout `30000` milliseconds.

## Cron invariants

The Cron job remained:

- name: `doke-order-event-worker`;
- active: `true`;
- schedule: `* * * * *`;
- command: `select private.invoke_order_event_worker_if_needed();`.

No schedule or command mutation was performed.

## Authority boundary

`private.invoke_order_event_worker_if_needed()` remains:

- owned by `postgres`;
- `SECURITY DEFINER`;
- executable only by `postgres`;
- unavailable to `public`, `anon`, `authenticated`, and `service_role`.

This preserves the existing private Cron execution boundary.

## Domain integrity

Before and after application:

- orders: 0;
- budgets: 0;
- order status history: 0;
- domain events: 0;
- metric events: 0;
- delivery attempts: 0.

A07B ledger and consume RPC remain present.

## Still blocked

This authorization did not permit:

- Edge Function deployment;
- remote concurrent replay canary;
- Railway selection or deployment;
- production changes;
- pull request merge.
