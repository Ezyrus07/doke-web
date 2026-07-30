# ORD-001 A07B — Worker Invocation Freshness

## Objective

Prevent a captured internal request from being replayed against `order-event-worker` while preserving the existing Vault-backed worker token as an independent authentication control.

## Root cause

The worker currently validates `x-doke-worker-token`, but the request does not yet include a caller-issued timestamp or one-time nonce. The run ledger has a unique invocation identifier, but it is not currently used as an atomic admission decision before event claiming.

A static token answers **who may call**. Freshness and nonce consumption answer **whether this exact call may run now and only once**.

## Contract

Every future invocation must include:

- `x-doke-worker-issued-at` — ISO-8601 timestamp or 13-digit Unix milliseconds;
- `x-doke-worker-nonce` — 24 to 128 URL-safe characters;
- the existing `x-doke-worker-token` authentication header.

The admission order is mandatory:

1. validate the existing worker token;
2. reject malformed, expired or excessively future timestamps;
3. reject malformed nonces;
4. consume the nonce atomically in Postgres;
5. begin the worker run only after successful nonce consumption;
6. reject a reused nonce as replay.

## Time window

- maximum age: 5 minutes;
- accepted future clock skew: 30 seconds.

The nonce ledger remains authoritative even inside the five-minute window. The time window limits the usefulness of old captured requests after nonce-ledger retention expires.

## Migration now available

The migration was generated through Supabase CLI `2.109.0`:

`supabase/migrations/20260730144324_ord_a07b_worker_invocation_nonce_ledger.sql`

This is the single canonical migration retained in the branch. Duplicate outputs from already-running one-time generator jobs were removed before final validation.

It creates:

- private table `private.order_event_worker_invocation_nonces`;
- SHA-256 nonce storage instead of plaintext nonce storage;
- row-level security as defense in depth;
- bounded expiration metadata and cleanup;
- `public.consume_order_event_worker_invocation_nonce(text, timestamptz, text)`;
- `SECURITY INVOKER` execution;
- explicit revocation from `public`, `anon` and `authenticated`;
- explicit execution and required schema/table privileges for `service_role`.

The atomic insert uses the nonce digest as the primary key and `ON CONFLICT DO NOTHING`. Therefore, exactly one concurrent consumer can receive `true`; later consumers receive `false`.

## Validation

The migration was applied only to an ephemeral Postgres 17 service in GitHub Actions. The validation proved:

- the first valid nonce is accepted;
- the same nonce is rejected on reuse;
- timestamps older than five minutes are rejected;
- timestamps over thirty seconds in the future are rejected;
- `anon` cannot execute the RPC;
- `authenticated` cannot execute the RPC;
- `service_role` can execute the RPC.

No connected Supabase project was modified during generation or validation.

## Fail-closed behavior

The runtime contract rejects:

- missing timestamp;
- invalid timestamp;
- missing nonce;
- malformed nonce;
- timestamp older than five minutes;
- timestamp more than thirty seconds in the future;
- unavailable nonce consumer;
- previously consumed nonce.

Replay rejection uses `DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED` with HTTP 409. Missing freshness infrastructure uses `DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED` with HTTP 428.

## Deliberate non-activation

The module is **not imported by the Edge Function yet**. The migration is also **not applied to staging**. Activation before the ledger exists remotely would either break Cron or create a false security claim.

The next controlled implementation must:

1. apply the reviewed migration through the controlled staging path;
2. verify grants, RLS and atomic duplicate rejection on staging;
3. update the Cron invocation to send issued-at and nonce headers;
4. wire the Edge Function to consume the nonce before `begin_order_event_worker_run`;
5. test duplicate, stale, future and concurrent invocations;
6. deploy only through the controlled staging release path.

## Current evidence

This step performed:

- one isolated Postgres 17 validation run;
- zero external provider requests;
- zero staging database mutations;
- zero migrations applied to staging;
- zero Edge Function deployments;
- zero order creation;
- no production change.

Final permanent CI passed on head `5b6c0bc0f19d85ce4ab768b12307192dd5229484`, including the Postgres 17 migration validation and all inherited ORD/SEARCH gates.

Supabase documents that Cron and `pg_net` can invoke Edge Functions and recommends Vault for protected invocation credentials. The existing worker follows that model; A07B adds replay resistance on top of it.
