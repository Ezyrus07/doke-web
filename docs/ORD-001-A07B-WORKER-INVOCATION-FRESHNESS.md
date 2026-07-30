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

The module is **not imported by the Edge Function yet**. Activation before an atomic Postgres nonce ledger would either break Cron or create a false security claim.

The next controlled implementation must:

1. generate a migration through the Supabase CLI;
2. create a private nonce ledger with uniqueness and bounded retention;
3. add a service-role-only atomic consume RPC;
4. update the Cron invocation to send issued-at and nonce headers;
5. wire the Edge Function to consume the nonce before `begin_order_event_worker_run`;
6. test duplicate, stale, future and concurrent invocations;
7. deploy only through the controlled staging release path.

## Current evidence

This step performed:

- zero network requests;
- zero database mutations;
- zero migrations;
- zero Edge Function deployments;
- zero order creation;
- no production change.

Supabase currently documents that Cron and `pg_net` can invoke Edge Functions and recommends Vault for protected invocation credentials. The existing worker follows that model; A07B adds replay resistance on top of it.
