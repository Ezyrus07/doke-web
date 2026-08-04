# DSP-A02 — Canonical Lifecycle and Financial-Effect Taxonomy

## Status

`DSP-A02` is a repository-only contract. It defines a canonical vocabulary for cancellation, disputes, refunds, releases, chargebacks and appeals. It does not integrate runtime, apply migrations, contact a provider, open a real dispute or move money.

## Why three axes

A single overloaded `status` field is unsafe because it can mix:

1. the lifecycle of the case;
2. the financial effect on held funds;
3. the external provider dispute state.

DSP-A02 keeps those axes independent. A case can be under operator review while release is blocked and the provider state is not applicable. A provider can report a chargeback loss while the internal case remains open for reconciliation and appeal.

## Case lifecycle

```text
pre_payment_cancellation_requested
  → pre_payment_cancelled

dispute_open
  → counterparty_response_due
  → evidence_collection
  → operator_review
  → decision_pending_approval
  → decision_issued
  → appeal_open
  → appeal_review
  → decision_pending_approval | case_closed
```

Transitions may skip only where the contract explicitly permits it. Unknown values map to `unmapped` and fail closed.

## Financial-effect lifecycle

```text
none
  → release_blocked
  → refund_proposed
  → refund_authorized
  → refund_submitted
  → refund_confirmed
```

or:

```text
release_blocked
  → release_proposed
  → release_authorized
  → release_submitted
  → release_confirmed
```

Provider-side disputes use:

```text
release_blocked
  → chargeback_pending
  → chargeback_won | chargeback_lost
```

Any uncertain provider result moves to `reconciliation_required`. Reversals move to `effect_reversed`.

## Provider-dispute lifecycle

```text
unknown
  → notification_received
  → evidence_due | provider_review
  → won | lost | reversed
```

Provider events must be authenticated, unique, final when required and reconciled before they can support a terminal financial effect.

## Legacy labels

Legacy labels are translated conservatively:

- `contestacao_aberta` → `dispute_open`;
- `em_analise` → `operator_review`;
- `blocked_by_dispute` → `release_blocked`;
- `refunded` or `released` → `reconciliation_required`, never directly to confirmed;
- unknown labels → `unmapped`.

The translation does not grant runtime authority.

## Terminal gates

A decision requires approved policy, authorized operators, separation of duties, complete evidence, immutable versioning, idempotency and audit evidence.

A refund or release becomes confirmed only with authenticated provider evidence, matching amount and currency, idempotency and reconciliation.

A chargeback result becomes final only after authenticated final provider evidence and reconciliation.

A case closes only after its financial effect is resolved, except for pre-payment cancellation with no financial effect.

## Sensitive-data boundary

The contract recursively rejects raw card data, provider credentials, access tokens and raw bank-account or Pix fields. Evidence packages must use opaque references and hashes in later sublots.

## Operational limits

```text
runtimeIntegrated: false
migrationApplied: false
stagingValidated: false
refundAuthority: false
releaseAuthority: false
chargebackAuthority: false
providerEvidenceAuthority: false
realMoneyAuthority: false
productionAuthority: false
```

## Next sublots

1. DSP-A03 — evidence, deadline and appeal contract.
2. DSP-A04 — provider chargeback reconciliation boundary.
3. DSP-A05 — operator case and dual-control readiness.
