# REP-A02 — Server-owned review command authority

## Purpose

Define an executable repository-only contract for review eligibility, uniqueness and idempotent submission before any runtime, migration, staging or production integration.

## Command identity

A review command has three separate identities:

1. **Client request ID** — a UUID created once and reused across timeout, reload and lost-response retries.
2. **Idempotency key** — deterministic from the request ID, authenticated actor, order and review scope.
3. **Uniqueness key** — deterministic from actor, order and scope, preventing a second review even when a new request ID is used.

The immutable intent fingerprint includes the reviewed professional, rating, normalized text, tags, criteria and expected canonical revisions.

## Canonical eligibility

Eligibility exists only when an authoritative server snapshot proves all of the following:

- the actor is an active client;
- the actor is the exact client of the order;
- the reviewed user is the exact professional of the order;
- the order is completed;
- payment is released;
- the dispute gate does not block a review;
- order, payment and dispute revisions match the command preconditions;
- no conflicting review already exists for the uniqueness subject.

A browser cache, localStorage record, local mock, incomplete response or stale revision cannot establish eligibility.

## Decisions

| Decision | Meaning |
| --- | --- |
| `accept` | Contractually eligible; future runtime may persist atomically. |
| `replay` | The same command or already-committed review returns the same identity and outcome. |
| `reject` | Canonical facts prove the command ineligible or malformed. |
| `conflict` | Payload, revision or uniqueness drift requires explicit resolution. |
| `unavailable` | Canonical authority is unavailable or the ledger requires reconciliation. |

## Lost-response and concurrency rules

- A retry after timeout reuses the original client request ID.
- Same key and same fingerprint returns the same review ID.
- Same key and changed payload is an idempotency conflict.
- New key for the same actor/order cannot create another review.
- Optimistic revision mismatch is a conflict, never an implicit refresh-and-submit.
- Ledger state `resolution_required` blocks blind retry.
- Command acceptance begins at `pending_moderation` with `publicVisibility: false`.

## Role scope

REP-A02 freezes the currently implemented product scope as `client_to_professional`. The remote table policy currently permits both directions, but widening the product scope requires a separate approved contract.

## Security boundary

Commands reject raw session credentials, payment instruments, bank destinations, identity documents and raw payload/evidence fields. Text-safety, reporting and appeal behavior are expanded in REP-A03.

## Explicit non-effects

This contract performs no network request, database connection, staging read or mutation, migration, deployment, provider contact, credential configuration, real review creation, moderation action, reputation change, rehire, user-data change, money movement or production change.

## Next sequence

1. **REP-A03** — moderation, reporting, restoration and appeal lifecycle.
2. **REP-A04** — canonical reputation projection, fraud resistance and dispute impact.
3. **REP-A05** — rehire transaction-linkage and retention readiness.
