# DSP-A05 — Operator Case and Dual-Control Readiness

## Status

`dsp-a05-operator-case-dual-control-readiness-v1`

This sublot completes the repository-only contract sequence for `DSP-001`. It defines the operator case, queue, segregation-of-duties, approval, SLA, escalation, audit-chain and structural-readiness boundaries required before any refund, release or chargeback adjustment can be activated.

It does **not** integrate a runtime, create a database table, configure a provider, contact staging, assign a real operator, approve a real case, move money or alter production.

## Dependencies

- `DSP-A01` — authority baseline;
- `DSP-A02` — canonical lifecycle and financial-effect taxonomy;
- `DSP-A03` — evidence, deadline and appeal contract;
- `DSP-A04` — provider chargeback reconciliation boundary;
- `PAY-A03` — PSP-neutral signed webhook boundary;
- `WAL-A05` — provider transfer and reconciliation boundary.

## Operator case

The canonical case is append-only and revision linked.

```text
queued
triage
evidence_collection
provider_pending
operator_review
decision_pending_approval
financial_effect_pending_approval
reconciliation_pending
paused_policy_hold
conflict
closed
```

Every revision binds:

- opaque case, dispute and transaction references;
- queue and priority;
- approved-policy fingerprint;
- DSP-A02 lifecycle fingerprint;
- DSP-A03 evidence-bundle fingerprint;
- DSP-A04 provider-reconciliation fingerprint;
- creation, update and due timestamps;
- hashed actor references;
- previous case fingerprint.

A case revision never contains raw names, email addresses, phone numbers, documents, card data, bank data, provider credentials, raw webhook payloads or evidence bodies.

## Roles and segregation of duties

```text
intake_analyst
evidence_reviewer
decision_recommender
decision_approver
financial_effect_approver
reconciliation_operator
auditor
incident_manager
```

Mandatory separation:

1. the initiator cannot approve the outcome;
2. the decision recommender cannot approve the outcome;
3. the reconciliation operator cannot approve the same financial effect;
4. decision and financial-effect approvals use distinct actors;
5. duplicate approval IDs or duplicate approvers are rejected;
6. approvals bind the exact case revision, target, decision, effect and policy;
7. approvals expire, remain revocable and never auto-execute.

There is no emergency financial override in this contract.

## Dual control

A no-effect cancellation requires one valid `case_decision` approval.

A financial effect requires two distinct approvals:

```text
case_decision
financial_effect
```

Applicable effects:

```text
refund
release
chargeback_adjustment
```

Even when both approvals are valid:

```text
executionAllowed: false
refundAuthority: false
releaseAuthority: false
chargebackAuthority: false
realMoneyAuthority: false
```

Dual control establishes structural readiness only.

## Operator action ledger

Operator actions are immutable, fingerprinted and chained through the previous action fingerprint.

```text
claim_case
request_evidence
record_evidence_review
recommend_decision
record_provider_observation
request_financial_effect
approve_decision
approve_financial_effect
record_reconciliation
pause_policy_hold
resume_policy_hold
escalate_case
close_case
```

The ledger rejects:

- duplicate IDs;
- duplicate fingerprints;
- broken previous-action links;
- timestamp regression;
- mismatched case fingerprints;
- raw sensitive data;
- elevated authority flags.

## SLA and escalation

SLA states:

```text
not_started
within_sla
due_soon
breached
paused_policy_hold
resolved
```

Escalation levels:

```text
none
queue_attention
supervisor_review
incident_review
executive_risk_review
```

A deadline approaching can route a case for attention. A deadline breach can escalate to supervisor or incident review. Neither condition decides the case or executes a financial effect.

```text
automaticDecisionAllowed: false
automaticFinancialEffectAllowed: false
```

A policy hold pauses the operational clock without fabricating a decision. A conflict fails closed.

## Structural readiness

The evaluator requires all of the following:

```text
dualControlReady
reconciliationMatched
evidenceBundleMatched
lifecycleMatched
providerChainMatched
auditTrailComplete
approvedPolicyPresent
operatorQueueConfigured
roleDirectoryConfigured
immutableStoreConfigured
slaNotBreached
caseNotConflict
caseNotClosed
```

`structurallyReady: true` means only that a future authorized runtime could consume the packet. It does not grant execution authority.

The current repository contract deliberately freezes:

```text
runtimeIntegrated: false
migrationApplied: false
stagingValidated: false
providerIntegrated: false
executionAllowed: false
autoDecisionAllowed: false
autoFinancialEffectAllowed: false
```

## Fail-closed rules

- missing policy blocks approval;
- stale case revision blocks approval;
- expired approval blocks dual control;
- approval target drift blocks dual control;
- actor-role mismatch blocks approval;
- self-approval blocks approval;
- duplicate approver blocks approval;
- missing reconciliation blocks readiness;
- SLA breach blocks readiness;
- case conflict blocks readiness;
- closed cases cannot be treated as pending execution;
- raw identity, financial and provider secrets are recursively forbidden.

## Repository artifacts

- `backend/modules/disputes/dispute-operator-case-dual-control-readiness.js`;
- `config/dsp-a05-operator-case-dual-control-readiness.json`;
- `tests/fixtures/dsp-a05-operator-case-dual-control-cases.json`;
- `docs/DSP-A05-OPERATOR-CASE-DUAL-CONTROL-READINESS.md`;
- `scripts/audit-dsp-a05-operator-case-dual-control-readiness.js`;
- `scripts/test-dsp-a05-operator-case-dual-control-readiness.js`;
- `.github/workflows/dsp-a05-operator-case-dual-control-readiness.yml`.

## Preserved blockers

```text
DSP-B01
DSP-B03
DSP-B04
PAY-B01
PAY-B03
PAY-B04
WAL-B02
WAL-B03
WAL-B04
```

## Prohibited effects

This sublot performs no:

- network request from the contract;
- database connection;
- staging read or mutation;
- migration;
- deployment;
- provider contact;
- credential configuration;
- real operator assignment;
- real decision or approval;
- refund, release or chargeback adjustment;
- money movement;
- production change.

## Completion meaning

`DSP-A01` through `DSP-A05` now define the complete repository-only safety contract for cancellations, refunds, disputes, appeals and chargebacks.

Activation remains blocked behind:

1. `DSP-B01` — approved commercial and operational policies;
2. `DSP-B03` — provider chargeback integration and real reconciliation;
3. `DSP-B04` — operator queue, immutable audit store, SLA, escalation and dual-control runtime;
4. separate migration, staging and production authorizations.

The PR must remain draft and must not be merged without explicit authorization.
