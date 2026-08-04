# WAL-A05 — Provider transfer, settlement confirmation and reconciliation boundary

## Objective

Define a provider-neutral, fail-closed contract for withdrawal transfer submission, provider observations, settlement evidence and reconciliation. This sublot does not select a provider, configure credentials, execute transfers, apply migrations, access staging or move money.

## Completion rule

A withdrawal may be presented as completed only when all of the following are true:

1. the transfer command is immutably bound to the WAL-A04 withdrawal intent and outcome;
2. provider evidence is authenticated and bound to the same amount, currency, destination and transfer fingerprint;
3. the provider reports `succeeded`;
4. internal settlement evidence matches the provider transfer reference and provider observation fingerprint;
5. reconciliation was performed with segregation of duties;
6. the final derived state is `settled`.

Provider success alone is insufficient. Manual approval, browser state, local cache or an administrative click cannot create settlement.

## Provider observation states

- `submission_unknown`: submission outcome is unknown; reconcile using the same provider idempotency key.
- `accepted`: provider accepted the request but has not confirmed transfer.
- `processing`: provider is still processing.
- `succeeded`: provider claims success; settlement evidence is still required.
- `failed`: terminal provider failure.
- `reversed`: a previously successful transfer was reversed.

## Reconciliation states

- `queued`
- `provider_unknown`
- `provider_processing`
- `reconciliation_required`
- `settled`
- `failed_terminal`
- `reversed`

Only `settled` grants display authority to mark the withdrawal completed. The contract itself grants no provider-transfer, runtime, staging, real-money or production authority.

## Evidence and ordering rules

- One transfer command binds to at most one provider transfer reference.
- Provider event IDs and provider sequence numbers cannot be reused with conflicting evidence.
- Provider sequence and event time must be monotonic.
- Invalid transitions, including `failed -> succeeded` and a reversal without prior success, are rejected.
- Webhooks require verified signatures.
- Submission responses and status polls require authenticated channels.
- Exact replay of one immutable provider event is deduplicated.
- Raw bank data and provider credentials are forbidden recursively.

## External dependencies

Operational integration remains blocked until provider selection, commercial/legal/tax approvals, adapter and credential design, immutable migrations, staging canaries and production authorization are completed under separate gates.
