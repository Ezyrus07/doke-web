# WAL-A04 — Stable withdrawal idempotency and lost-response contract

## Objective

Prevent one user withdrawal intent from creating multiple withdrawal records when the browser reloads, retries after timeout, loses the response, or receives an in-progress result.

This sublot is repository-only. It does not integrate runtime code, apply migrations, access staging, contact a payment provider, process a withdrawal, move money, or change production.

## Contracts

- `wal-a04-withdrawal-idempotency-v1`
- `wallet-withdrawal-intent-v1`
- `wallet-withdrawal-request-envelope-v1`
- `wallet-withdrawal-outcome-v1`

## Stable identity

A withdrawal intent is created once and persisted before the first request. Its immutable identity contains:

- stable UUID `intentId`;
- hashed actor scope;
- amount in integer cents;
- currency;
- opaque destination reference;
- destination fingerprint;
- client revision;
- creation and expiry instants.

The deterministic idempotency key is derived from immutable intent fields. Attempt number and submission time are not part of the key, so reload and retry preserve the same identity.

## Retry behavior

| Stored state | Required client action |
| --- | --- |
| `prepared` | Submit with the same key. |
| `claimed` | Wait and reconcile with the same key. |
| `resolution_required` | Replay or query with the same key; never create a new intent silently. |
| `failed_retryable` | Resubmit the exact payload with the same key. |
| `succeeded` | Return the stored withdrawal result. |
| `rejected_terminal` | Stop; a new intent requires an explicit new user action. |

The same intent or key with a different actor, amount, currency, destination, or revision is rejected as a conflict.

## Lost response

A timeout or lost response does not prove that the server failed before commit. The client must keep the original intent and key, then reconcile or replay the same request. A successful replay returns the same stored withdrawal identifier.

## Data boundary

Only `wallet-withdrawal-destination-reference-v1` and its SHA-256 fingerprint are allowed. Raw account holder, document, branch, account number, Pix key, full bank object, and bank-account snapshots are rejected recursively.

## Authority boundary

All generated artifacts keep these flags false:

- runtime mutation authority;
- withdrawal execution authority;
- provider transfer authority;
- real-money authority;
- production authority.

## Runtime integration still required

A future separately authorized sublot must:

1. persist the intent before the first request;
2. restore it after reload;
3. send the same key and request fingerprint on every retry;
4. bind the server idempotency ledger to actor, route, and payload;
5. expose reconciliation for claimed and unknown-after-submit states;
6. return the stored result for successful replay;
7. reject payload drift;
8. keep completion dependent on provider confirmation and reconciliation.

## Preserved blockers

`WAL-B02`, `WAL-B03`, `WAL-B04`, `PAY-B01`, `PAY-B03`, and `PAY-B04` remain unchanged.
