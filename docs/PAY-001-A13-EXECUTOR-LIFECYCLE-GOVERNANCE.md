# PAY-001 A13 — Executor Lifecycle Governance and Incident Revocation Handoff

## Objective

PAY-A12 proves executor receipt signatures against an offline trust bundle, but it deliberately does not decide who may onboard an executor, approve a trust root, attest key custody, rotate keys, offboard access or request emergency revocation.

PAY-A13 closes that governance gap with repository-only lifecycle contracts. It does not onboard a real executor, approve a real trust root, configure a custody provider, contact an external operator, access staging, read secrets or mutate a trust bundle.

## Canonical contracts

- `pay-a13-executor-lifecycle-governance-v1`
- `pay-executor-lifecycle-request-v1`
- `pay-executor-key-custody-attestation-v1`
- `pay-executor-governance-approval-v1`
- `pay-executor-lifecycle-decision-v1`
- `pay-executor-incident-revocation-handoff-v1`

## Lifecycle actions

The contract recognizes four actions:

1. `onboard_executor`;
2. `rotate_trust_root`;
3. `offboard_executor`;
4. `emergency_revoke_root`.

All lifecycle requests are bound to an exact 40-character git head, hashed executor identity, bounded validity window and deterministic request fingerprint. Production requests and request replay are rejected.

## Approval quorum and separation of duties

Standard onboarding, rotation and offboarding require at least three distinct approvals. Approver identities are represented only by SHA-256 hashes, and each approval must come from a distinct governance role.

Mandatory roles are action-specific:

- onboarding: security, finance operations and legal/compliance;
- rotation: security, finance operations and platform operations;
- offboarding: security, finance operations and legal/compliance;
- emergency revocation: security plus finance operations or platform operations.

Duplicate approvers, duplicate roles, approvals outside the request window, approval fingerprint drift and approvals bound to another request are rejected fail-closed.

## Key-custody attestation

Onboarding and rotation require a bounded custody attestation covering:

- hashed executor and key-family identities;
- exact public-key fingerprint;
- provider-neutral custody class;
- non-exportable private keys;
- dual control;
- no repository custody;
- no private-key material in the artifact;
- hashed rotation procedure and incident contact;
- issuance, expiry and deterministic fingerprint.

The accepted custody classes are `managed_hsm`, `managed_kms` and `dedicated_signing_service`. These are generic control classes, not configured providers.

## Offboarding

An offboarding plan must deny new dispatches, revoke all executor trust roots, preserve historical audit evidence and limit cleanup to temporary artifacts. Deletion of historical evidence is explicitly denied.

A valid offboarding decision remains only an external handoff. The repository cannot disable an executor or revoke a real trust root.

## Emergency revocation

Emergency revocation requires a high or critical incident, a bounded reason code, a response deadline within one hour and a follow-up review within 24 hours.

The resulting incident handoff states that an external operator must act. It explicitly denies the repository authority to modify the trust bundle, contact a provider, access secrets, execute remote actions or trigger financial operations.

## Deterministic conformance

The PAY-A13 fixture contains 38 cases:

- 5 positive lifecycle decisions;
- 33 fail-closed negative cases.

Coverage includes quorum, role separation, approval binding, custody controls, request expiry, replay, onboarding key version, rotation predecessor, offboarding evidence retention, incident windows and production denial.

## Operational safety

- network requests: `0`
- database connections: `0`
- subprocesses: `0`
- environment reads: `0`
- real executors onboarded or offboarded: `0`
- real trust roots approved or revoked: `0`
- custody providers configured: `0`
- staging reads or mutations: `0`
- migrations or rollbacks applied: `0`
- payments, refunds or payouts: `0`
- production changes: `0`

## Remaining blockers

- `PAY-B01` — no contracted PSP, executor, credentials, real trust roots or webhook authority;
- `PAY-B03` — commercial, fiscal, escrow, refund, dispute and payout rules remain unapproved;
- `PAY-B04` — no remote reconciliation store, applied migrations, scheduler, metrics, alerts, on-call or staging rehearsal.

## Next action

`PAY-A14` — define signed governance evidence bundles, external identity attestation ingestion and immutable lifecycle decision receipt chaining, remaining repository-only.
