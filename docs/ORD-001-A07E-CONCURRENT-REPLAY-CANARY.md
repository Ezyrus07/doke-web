# ORD-A07E — Concurrent Replay Canary

## Objective

Prove locally and deterministically that concurrent invocations carrying the same valid freshness envelope cannot start more than one order-event worker run.

## Scenario

The canary launches 32 concurrent requests with the same:

- `x-doke-worker-issued-at`;
- `x-doke-worker-nonce`;
- `x-doke-worker-source`.

All requests cross the same repository gate used by the Edge Function. The in-memory ledger models the atomic single-use property of the Postgres nonce ledger without network access or staging mutations.

## Pass criteria

The run passes only when:

- exactly one request is accepted;
- exactly 31 requests are rejected as replay;
- replay responses use `DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED` and HTTP 409;
- exactly one worker run starts;
- exactly one event-claim path starts;
- the ledger records one consumed nonce;
- no unexpected outcome occurs.

## Safety boundary

The command is local-only and rejects:

- `--staging`;
- `--remote`;
- `--production`;
- `--execute`;
- `--deploy`.

It performs no external network requests, database mutations, migration applications, Cron changes, Edge Function deployments, order creation or production changes.

## Activation remains pending

This canary does not replace the remote staging canary. The remote canary remains blocked until:

1. ORD-A07B is explicitly authorized, applied and verified in staging;
2. ORD-A07C is separately authorized and applied;
3. the repository-wired Edge Function is deployed through the controlled staging release;
4. a dedicated remote replay-canary authorization is granted.

A generic continuation command does not authorize any of those operations.
