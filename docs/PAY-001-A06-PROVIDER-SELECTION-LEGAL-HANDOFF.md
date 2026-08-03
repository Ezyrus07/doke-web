# PAY-001 / PAY-A06 — Provider Selection and Legal/Accounting Handoff

## Status

`repository_only_decision_handoff_ready_provider_unselected_staging_blocked`

Em termos operacionais, PAY-A06 não seleciona nenhum PSP e não autoriza qualquer efeito remoto.

PAY-A06 does not select, recommend, approve, contract or activate a payment service provider. It defines the evidence and authority boundaries that must exist before a future selection can be considered valid.

## Root cause

PAY-A01 through PAY-A05 established financial authority boundaries, PSP-neutral intents and webhooks, reconciliation contracts, adapter conformance and staging readiness. A remaining governance gap could still allow a commercial comparison, an informal recommendation or a generic continuation command to be interpreted as provider selection or operational authorization.

PAY-A06 closes that gap by separating five distinct decisions:

1. prepare a decision packet;
2. obtain qualified legal, accounting, finance, security and operational approvals;
3. explicitly select one opaque provider candidate;
4. prepare provider-specific source code locally without secrets or network access;
5. separately authorize one resource-bound staging conformance execution.

No stage inherits authority from the previous stage beyond its declared scope.

## Decision packet

A candidate is represented only by an opaque identifier such as `psp-candidate-alpha`. The repository does not bind a commercial provider name or treat a score as approval.

Every packet must be immutable, head-pinned, fingerprinted and expiring. It must contain evidence for:

- regulatory and marketplace fit;
- funds flow, authorization and hold model;
- capture, release, refund, dispute and chargeback behavior;
- payout, split and recipient onboarding;
- signed webhooks, idempotency and event queries;
- settlement and reconciliation exports;
- pricing, reserves, minimums and exit costs;
- security, privacy, LGPD and PCI scope;
- sandbox, SLA, support and incident response;
- termination, portability, insolvency and contingency.

A high advisory score cannot select a provider. Missing evidence, unsupported mandatory capability, unresolved blocker, expired approval or packet-fingerprint drift blocks selection.

## Policy decisions and approvals

The following decisions must be approved and referenced before selection readiness:

- commercial model;
- tax and fiscal responsibility;
- funds-flow and escrow/hold classification;
- refund and cancellation rules;
- dispute and chargeback rules;
- payout and split rules;
- KYC, AML and recipient onboarding;
- privacy, security and retention;
- reconciliation and accounting controls;
- contract exit and contingency.

Named approvals are required from legal, accounting/tax, finance/treasury, security/privacy and product/operations. At least three distinct approvers are required. These repository checks do not replace qualified Brazilian legal, accounting, tax, regulatory or contractual advice.

## Explicit provider selection

The exact phrase is:

```text
I_EXPLICITLY_SELECT_PSP_CANDIDATE_FOR_DOKE_STAGING_ADAPTER_PREPARATION
```

The phrase is insufficient by itself. The authorization envelope must also match:

- exact opaque candidate ID;
- exact decision-packet fingerprint;
- exact Git head;
- scope `provider_specific_adapter_preparation_only`;
- fresh issued and expiry timestamps;
- one-shot nonce;
- `productionAllowed: false`.

`Próximo`, `Prossiga`, `pode prosseguir`, a scorecard, a recommendation of an employee or a prior authorization do not select a provider.

A valid selection permits only:

- provider-specific adapter source without secrets;
- environment-variable names without values;
- local adapter tests without network access.

It does **not** authorize account creation, contract signature, billing, credentials, webhook registration, API or CLI calls, migrations, deploys, sandbox payments, refunds, payouts, disputes or production changes.

## One-shot staging authorization

A separate future staging authorization uses the exact phrase:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A06_PROVIDER_SANDBOX_CONFORMANCE_ON_DOKE_STAGING
```

It is valid only after explicit selection and after PAY-A05 readiness is independently satisfied. The authorization must be bound to:

- selected candidate;
- decision-packet fingerprint;
- exact Git head;
- immutable adapter version;
- exact staging project identity;
- sanitized readiness-evidence SHA-256;
- sandbox mode or maximum budget of zero;
- fresh one-shot nonce;
- explicit production denial.

Validation by the repository still performs no remote action. An external, separately authorized executor is required. Replay, expiry, resource drift or production allowance fails closed.

## Operational prohibitions

PAY-A06 performs none of the following:

- selecting or recommending a named PSP;
- accessing provider websites, APIs or CLIs;
- creating or using provider accounts;
- accepting provider terms or signing contracts;
- enabling billing or paid plans;
- configuring credentials or secrets;
- registering webhooks;
- accessing staging;
- applying migrations;
- deploying Edge Functions or other infrastructure;
- creating payments, refunds, payouts or disputes;
- changing production;
- merging PR #27.

## Blockers preserved

- `PAY-B01`: provider, contract, account, adapter, credentials, webhook and real conformance remain absent.
- `PAY-B03`: commercial, fiscal, escrow, refund, dispute, chargeback and payout rules remain unapproved.
- `PAY-B04`: remote reconciliation persistence, scheduler, queue, metrics, alerts and runbook remain absent.

PAY maturity remains `2/6` with local user-facing authority, contract-only server authority, local E2E evidence and blocked security/production gates.

## Next repository-only sublot

`PAY-A07` should define the PSP-neutral remote reconciliation persistence, scheduler, metrics, alerting and incident-runbook contract without applying migrations, deploying infrastructure or executing remote operations.
