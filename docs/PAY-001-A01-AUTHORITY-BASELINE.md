# PAY-001 A01 — Financial Authority Baseline

## Status

Repository-only baseline. No PSP was selected, no webhook was registered, no migration was applied, no Edge Function was deployed and no real or synthetic payment was created.

## Why this baseline exists

The current payment runtime contains three possible authorities:

1. an API provider selected by the repository boundary;
2. the Supabase staging finance sandbox;
3. local browser simulation.

The repository also contains remote read projections, local wallet caches, server-owned financial operations and legacy local orchestration for payment hold and completion release. These surfaces are useful for development, but they must not be interpreted as a real-money authority.

PAY-A01 freezes this split before any PSP integration. It prevents later work from silently treating a browser event, localStorage state, a sandbox response or an unverified API response as proof that money moved.

## Observed implementation

- `payment-service.js` chooses API first, staging sandbox second and local orchestration last.
- `finance-repository.js` reads financial projections from Supabase but still contains local fallback paths.
- the staging sandbox is pinned to project `zwkczgewzbsorbrjuzpb` and is explicitly synthetic;
- authenticated UUID sessions cannot materialize receivables or release held value through the browser when server authority is required;
- payment, transaction, receipt and receivable projections already exist, but no PSP event is their canonical source;
- no signed webhook ingestion, provider event ordering, reconciliation worker or mismatch queue is operational.

## Frozen authority rules

Until a later authorized sublot proves otherwise:

- Doke has no real-money payment authority;
- no PSP is selected or implicitly approved;
- browser code cannot assert provider success;
- local simulation is never production evidence;
- the finance sandbox is staging-only and synthetic-only;
- raw card data must not be persisted by Doke;
- payment, refund, dispute and payout state may become canonical only from verified provider events processed by server-owned code;
- provider events must use persistent idempotency and explicit ordering/conflict rules;
- feature activation requires legal, accounting and operational review in addition to technical tests.

## Current blockers

### PAY-B01 — PSP and webhook authority

There is no selected provider, signed webhook verifier or provider-confirmed state machine.

### PAY-B03 — legal and accounting rules

Commercial terms, tax treatment, escrow semantics, refund windows and chargeback responsibilities are not approved.

### PAY-B04 — reconciliation

There is no periodic comparison between provider balances/events and Doke financial projections, nor an operational mismatch queue.

## Mandatory next sequence

1. **PAY-A02** — remove local financial mutation fallback as an authority for authenticated UUID sessions, while preserving isolated fixtures.
2. **PAY-A03** — define a PSP-neutral payment-intent and signed-webhook contract using the persistent idempotency store.
3. **PAY-A04** — define provider-selection and staging evaluation criteria with legal/accounting dependencies and reconciliation requirements.

Provider selection, provider account creation, remote secrets, webhook registration, staging deployment, real-money operations and production changes remain outside this baseline and require separate explicit authorization.

## User-facing effect

None. PAY-A01 only records and guards the real backend state. The existing interface remains unchanged and must continue to be interpreted as local or staging simulation rather than a live payment system.
