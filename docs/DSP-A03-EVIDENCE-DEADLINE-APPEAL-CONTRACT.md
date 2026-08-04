# DSP-A03 — Evidence, Deadline and Appeal Contract

## Objective

Define a repository-only, provider-neutral and fail-closed contract for dispute evidence, counterparty deadlines, evidence windows, operator readiness and appeal revisions.

This sublot does not integrate runtime behavior and does not authorize disputes, refunds, releases, chargebacks, provider submissions, staging or production.

## Evidence boundary

Evidence is represented by immutable metadata only:

- opaque evidence identifier;
- case and order identifiers;
- hashed actor identifier;
- canonical kind and source;
- SHA-256 content digest;
- opaque storage reference;
- media type and size;
- immutable revision chain;
- timestamps in ISO-8601.

The contract never stores raw evidence bodies, payment credentials, provider secrets, card data or banking data.

Evidence presence does not establish evidence truth. A reference may prove that a specific immutable payload was received, but it cannot independently prove the claim, decide the case or authorize a financial effect.

## Evidence bundles

Bundles are deterministic and append-only:

- all evidence records must belong to the same case;
- evidence identifiers must be unique;
- fingerprints are sorted before the bundle fingerprint is generated;
- revisions after the first bind to the prior bundle fingerprint;
- completeness is explicit: `incomplete`, `participant_complete` or `operator_review_ready`.

`operator_review_ready` remains a structural classification. The operator readiness gate independently requires approved policy, identity validation, order/transaction linkage, resolved windows and a complete audit trail.

## Deadline model

Canonical deadline types:

```text
counterparty_response
evidence_submission
operator_review
appeal_submission
provider_evidence
```

Canonical states:

```text
not_started
open
due_soon
elapsed
grace
expired
paused_policy_hold
resolved
```

Rules:

- deadlines use UTC;
- evaluation receives an explicit clock;
- policy revision is mandatory;
- `elapsed`, `grace` or `expired` never create automatic victory;
- non-response is an auditable fact only;
- no deadline state can authorize refund, release or chargeback;
- extensions create a new revision and preserve the prior deadline;
- extension requires approved policy, authorized operator, reason and audit evidence.

## Appeal model

Canonical appeal states:

```text
appeal_open
appeal_evidence_collection
appeal_review
appeal_decision_pending_approval
appeal_decision_issued
appeal_closed
```

Each appeal revision binds to:

- prior immutable decision fingerprint;
- evidence bundle fingerprint;
- appellant actor hash;
- statement digest;
- policy revision;
- prior appeal fingerprint when revision is greater than one.

An appeal adds history. It never mutates the original decision and cannot directly change the financial-effect axis or the provider-outcome axis defined by DSP-A02.

An appeal outside the normal deadline is rejected unless a future approved policy explicitly supports an authorized exception with audit evidence. The contract records that exception but does not grant financial authority.

## Operator review readiness

Operator review is blocked unless all structural conditions are true:

- policy approved;
- participant identity validated;
- order and transaction relationship validated;
- evidence bundle complete;
- counterparty window resolved;
- audit trail complete;
- case state canonical.

Even when structurally ready:

```text
autoDecisionAllowed: false
financialEffectAllowed: false
providerSubmissionAllowed: false
```

## Security and privacy

The module recursively rejects raw sensitive fields including:

- card number, PAN, CVV or CVC;
- access and refresh tokens;
- provider secrets and API keys;
- authorization headers;
- bank-account snapshots, account numbers and Pix keys;
- raw document bodies.

Only opaque references, hashes and bounded metadata belong in this contract.

## Authority ceiling

```text
contractAuthority: true
evidenceReferenceAuthority: true
evidenceTruthAuthority: false
decisionAuthority: false
runtimeMutationAuthority: false
refundAuthority: false
releaseAuthority: false
chargebackAuthority: false
providerEvidenceAuthority: false
stagingAuthority: false
realMoneyAuthority: false
productionAuthority: false
```

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

## Validation

The permanent workflow runs:

- syntax checks;
- DSP-A03 static audit;
- DSP-A03 conformance;
- DSP-A02 regression;
- DSP-A01 regression;
- diff hygiene.

The workflow has `contents: read` only.

## Next sublots

```text
DSP-A04 — provider chargeback reconciliation boundary
DSP-A05 — operator case and dual-control readiness
```
