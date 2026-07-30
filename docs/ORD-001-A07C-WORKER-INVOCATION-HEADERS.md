# ORD-A07C — Worker Invocation Header Issuance

## Objective

Prepare cryptographically strong freshness headers for internal `order-event-worker` calls without activating the feature in staging.

The contract generates:

- `x-doke-worker-issued-at` as a 13-digit Unix epoch timestamp in milliseconds;
- `x-doke-worker-nonce` from 24 bytes of cryptographically secure entropy;
- `x-doke-worker-source` using the existing `cron`, `manual`, `test` or `recovery` vocabulary.

Twenty-four random bytes encode to a 32-character base64url nonce without padding. The token remains a separate authentication factor and is never handled by the JavaScript header builder.

## Repository implementation

### Runtime-neutral JavaScript

`supabase/functions/order-event-worker/invocation-headers.mjs` provides:

- canonical header names;
- deterministic base64url encoding;
- cryptographic random-byte generation through `crypto.getRandomValues`;
- strict timestamp and entropy validation;
- immutable generated envelopes;
- case-insensitive header reading for future worker wiring.

### Cron migration

`supabase/migrations/20260730153500_ord_a07c_worker_invocation_headers.sql` replaces only `private.invoke_order_event_worker_if_needed()` in the repository.

It:

- preserves the existing Vault-backed project URL and worker token;
- generates a millisecond timestamp at invocation time;
- generates 24 random bytes with `extensions.gen_random_bytes`;
- encodes the nonce as base64url;
- sends the timestamp and nonce alongside the existing token and source headers;
- fails closed if either generated value has an unexpected format.

The migration does not create secrets, hardcode a project URL, schedule or unschedule Cron, deploy an Edge Function, or touch production.

## Activation boundary

Activation remains pending.

This lot does not:

- apply the ORD-A07B nonce ledger migration;
- apply the ORD-A07C Cron header migration;
- modify the active Cron function;
- import the header reader into the Edge Function;
- consume a nonce before `begin_order_event_worker_run`;
- deploy the Edge Function;
- run a remote replay canary.

The safe activation order remains:

1. explicitly authorize and apply the ORD-A07B nonce ledger migration to staging;
2. verify table, RPC, RLS, grants and atomic nonce consumption;
3. separately authorize and apply the ORD-A07C Cron header migration;
4. wire header reading and nonce consumption into the Edge Function before any worker run begins;
5. deploy through the controlled staging release path;
6. prove concurrent replay rejection;
7. keep production blocked until the complete ORD gate is satisfied.

## Validation

The permanent CI gate executes:

- deterministic JavaScript header tests;
- a Postgres 17 test with stubbed Vault and `pg_net` boundaries;
- two Cron invocations to prove distinct nonces;
- header format and payload assertions;
- the ORD-A07C static audit;
- the existing ORD-A07B freshness and migration-readiness gates;
- the domain completion matrix audit.

CI has no staging credentials and performs no staging mutation.
