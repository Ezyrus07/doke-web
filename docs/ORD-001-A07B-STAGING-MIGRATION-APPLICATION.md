# ORD-A07B — Staging nonce-ledger migration application

## Result

The canonical ORD-A07B nonce-ledger migration was explicitly authorized and applied to the Doke staging Supabase project only.

Authorization received:

`I_EXPLICITLY_AUTHORIZE_ORD_A07B_NONCE_LEDGER_MIGRATION_ON_DOKE_STAGING`

The authorization did not include ORD-A07C, Cron changes, Edge Function deployment, a remote replay canary, Railway, production or pull-request merge.

## Canonical repository identity

- Repository path: `supabase/migrations/20260730144324_ord_a07b_worker_invocation_nonce_ledger.sql`
- SHA-256: `8060dae0b5cd896c558872cd9abd1dc7bc5ba06a3707816f228ab5bc429abe68`
- Git blob SHA: `de84873de6d8f65a60b03444635351a372d1b4e0`
- Applied migration name: `ord_a07b_worker_invocation_nonce_ledger`
- Supabase-recorded execution version: `20260730184101`

The Supabase connector records its own execution timestamp. Migration history was not manually edited to imitate the repository filename timestamp.

## Application history

The first submission was rejected by PostgreSQL before commit because the tool-call transcription contained one missing parenthesis. A read-only rollback check confirmed that the transaction created no table, function or migration-history entry and changed no order-domain rows.

The canonical SQL was then submitted correctly and applied successfully.

## Verified structure

Post-application inspection confirmed:

- `private.order_event_worker_invocation_nonces` exists;
- `public.consume_order_event_worker_invocation_nonce(text,timestamptz,text)` exists;
- RLS is enabled;
- the RPC is `SECURITY INVOKER`;
- the nonce hash primary key exists;
- the expiry constraint exists;
- the expiry index exists;
- `anon` and `authenticated` cannot execute the RPC;
- `anon` and `authenticated` cannot select the ledger;
- `service_role` can execute the RPC;
- `service_role` has the required schema and table privileges.

## Atomicity verification

A staging-scoped test nonce proved:

- first use returns `true`;
- duplicate use returns `false`;
- a timestamp older than five minutes returns `false`;
- a timestamp more than 30 seconds in the future returns `false`.

Exactly one test-scoped row was created with `source = 'test'`. Two narrowly scoped cleanup attempts were blocked by the tool safety layer before reaching the database. No broader or destructive workaround was attempted. The row does not authorize or activate any caller and will be eligible for the ledger's retention cleanup after expiration.

## Domain integrity

Before and after application, staging remained at:

- orders: 0;
- budgets: 0;
- order status history: 0;
- order domain events: 0;
- order metric events: 0;
- delivery attempts: 0.

The active Cron function still contains neither `x-doke-worker-issued-at` nor `x-doke-worker-nonce`. No Cron job was changed and no Edge Function was deployed.

## Remaining sequence

1. authorize ORD-A07C separately;
2. apply the canonical Cron-header migration;
3. verify header generation without changing the schedule;
4. authorize and deploy the repository-wired Edge Function through staging release control;
5. authorize and execute the remote concurrent replay canary.

Production remains blocked.
