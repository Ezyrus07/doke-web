# REP-A05 — Rehire transaction linkage and retention readiness

## Status

`rep-a05-rehire-transaction-readiness-v1` is a repository-only contract. It does not create an order, proposal, payment intent, charge, escrow record, analytics event, database row or production change.

## Core boundary

“Hire again” is not a clone operation. The previous order is lineage only. A rehire must create a new transaction identity after the server refreshes the current professional, service, catalog, quote, availability, scope, location, schedule, terms and payment policies.

## States

```text
unavailable
rejected
requote_required
confirmation_required
ready
created
replay
conflict
```

`created` means that the pure contract produced a deterministic transaction envelope. It does not mean that an order was written. `orderWriteAuthority`, `paymentAuthority` and `runtimeAuthority` remain false.

## Source-order boundary

The source order must be canonical, belong to the requesting client and be:

```text
completed
payment released
settlement reconciled
no blocking dispute
```

The source order ID is preserved only as lineage. The new order and transaction references must differ from it.

The following source artifacts are never copied:

- proposal or quote identity;
- payment authorization or payment intent;
- charge or escrow identity;
- dispute evidence or decision payloads;
- review text, messages or private evidence;
- old price, availability or commercial terms.

## Current-facts refresh

A canonical `canonical_server` snapshot must resolve:

- current professional status;
- current service status and bookability;
- current catalog and service revisions;
- current price and BRL currency;
- current quote and expiry;
- current availability;
- current scope, location and scheduling constraints;
- current terms;
- current payment, fee and cancellation policy versions.

Browser state, localStorage, cache, review content or reputation cannot establish rehire authority.

## Requote boundary

The result is `requote_required` when any of these changed or became invalid:

- requested scope;
- requested location;
- requested schedule;
- availability;
- quote expiry.

A stale price or schedule is never silently reused.

## Explicit confirmation

The client confirmation must bind the exact current fingerprints for:

```text
quote
availability
terms
scope
```

A missing, stale or future-dated confirmation produces `confirmation_required`.

## Idempotency and lost-response recovery

A rehire intent has a stable UUID, idempotency key and immutable intent fingerprint. The new order and transaction references are deterministic for that intent.

- same key + same intent + prior creation → `replay` with the same envelope;
- same key + changed intent → `conflict`;
- a retry never creates a second transaction identity.

## Financial isolation

The transaction envelope contains:

```text
newProposalId: null
newPaymentIntentId: null
newEscrowId: null
newChargeId: null
autoPaymentAllowed: false
```

Downstream ORD and PAY authority is still required. Rehire readiness never charges the customer automatically.

## Retention signal

The optional retention signal is privacy-minimized. It contains hashed references and the readiness outcome only. It excludes raw identities and amounts and grants no analytics-write authority.

## Sensitive-data boundary

Raw reviews, private messages, evidence, credentials, payment instruments, card details, banking/Pix data, identity documents and prior financial identifiers are rejected recursively.

## Explicit non-effects

This sublot performs no:

- network request;
- database connection;
- migration;
- staging read or mutation;
- provider contact;
- order, proposal, payment, escrow or charge creation;
- review or reputation change;
- analytics write;
- real-user data change;
- money movement;
- deployment or production change.

## Operational blockers

Runtime activation remains blocked by `REP-B02`, `REP-B03`, `REP-B04`, `ORD-B02`, `ORD-B03`, `PAY-B01`, `PAY-B03`, `PAY-B04`, `DSP-B01`, `DSP-B03` and `DSP-B04`, plus separately authorized migrations, staging validation and production rollout.
