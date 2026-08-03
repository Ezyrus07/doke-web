# PAY-001 / A03 — PSP-neutral payment intent and signed webhook contract

## Status

Repository-only contract. No payment service provider has been selected, contracted, configured or activated.

## Purpose

A03 defines the boundary that every future payment provider adapter must satisfy before it can create a payment intent or send an event capable of changing Doke financial state.

It does not create an account at a provider, register a webhook, configure a secret, deploy an Edge Function, apply a migration or move money.

## Root cause

PAY-A02 prevents authenticated UUID sessions from falling back to local browser mutations. The next missing authority was the provider boundary itself:

- no canonical payment-intent envelope;
- no provider-neutral acknowledgement format;
- no signed raw-body verification contract;
- no durable deduplication identity for provider events;
- no explicit handling for payload drift, replay, concurrent delivery or out-of-order events.

Without those contracts, each future PSP integration could invent incompatible semantics and duplicate or reorder financial side effects.

## Payment intent envelope

The canonical request contains:

- internal intent key derived from order and charge message;
- client and professional identity;
- gross, charged and discount amounts in integer minor units;
- ISO currency;
- `authorize_then_hold` capture strategy;
- idempotency key and deterministic request hash;
- a restricted metadata allow-list.

The initial state is `requires_provider`. A provider acknowledgement may establish only a non-settlement state such as `pending_provider`, `requires_action` or `authorized`. Settlement remains dependent on a verified provider event processed by the server.

Raw card number, PAN, CVV/CVC, magnetic-track data and equivalent sensitive fields are rejected recursively.

## Signed webhook boundary

The framework-neutral ingestion order is fixed:

1. resolve the server-only secret for the provider adapter;
2. verify HMAC-SHA256 against `timestamp.rawBody`;
3. enforce the replay window;
4. compare signatures in constant time;
5. only then parse JSON;
6. normalize the provider-specific payload into a Doke event;
7. claim the persistent event ledger;
8. apply the event once;
9. complete or fail the ledger entry.

A provider without a configured server-side secret fails closed with `DOKE_PAYMENT_PROVIDER_NOT_CONFIGURED`.

## Persistent event identity

A03 reuses `public.api_idempotency_keys` through a server-only adapter. No browser RPC is reopened.

- key: `pay:webhook:{provider}:{eventId}`;
- action: `payments.providerWebhook.ingest`;
- entity type: `payment_provider_event`;
- actor: `null`, because the authority is a verified provider event processed with service-role infrastructure;
- request hash: normalized event payload hash.

Exact successful replay returns the original result without repeating side effects. The same event ID with a different payload is a conflict. Claimed events remain in progress. Failed events require operator reconciliation rather than blind automatic replay.

## Ordering and terminal behavior

The reducer recognizes normalized events for intent creation, authorization, required action, hold, release, refund, failure, cancellation and disputes.

- an exact state replay is acknowledged idempotently;
- a valid next event mutates the state;
- an out-of-order event is deferred without mutation;
- `refunded`, `failed` and `cancelled` are terminal;
- a released payment may still enter a dispute;
- dispute resolution must explicitly choose refund, release or restoration to held.

## Explicit non-authority

This contract does not prove:

- a PSP account exists;
- a webhook endpoint is registered;
- any signing secret exists;
- a provider adapter conforms;
- any provider event has been received;
- any payment was authorized, captured, held, released, refunded or paid out;
- reconciliation is operational.

## Next sublot

`PAY-A04` should define provider-neutral reconciliation, divergence classification, operator queue and safe replay rules before provider selection or staging activation.
