# COM-B01 Policy Approval Evidence Packet Adapter

## Purpose

This repository-only boundary closes the deterministic handoff gap between the existing `COM-B01` human approval-evidence template and the canonical policy packet accepted by `evaluatePolicyApproval()`.

It is not a new COM successor, does not create `COM-B02CZ` or `R5I`, and does not change the canonical B01 evaluator.

## Root cause

The materialized evidence template and the canonical evaluator use different shapes. The template stores policy metadata under `policyMetadata` and reviewer evidence under `reviewerEvidence[]`, while the evaluator expects top-level policy metadata plus `approvals[]`. The template also has no intrinsic source for `policyAuthorId` or the exact `policyDomains` set.

Without an explicit adapter, a future consumer would have to infer or silently fabricate fields. This boundary makes those requirements explicit and fail-closed.

## Authority

The adapter is repository-only. Its own output never grants policy approval or runtime authority.

Even when a fully synthetic positive fixture maps successfully, the adapter returns:

```text
approvedPolicyPresent=false
policyApprovalAuthority=false
runtimeMutationAuthority=false
stagingAuthority=false
productionAuthority=false
```

The positive fixture is used only to prove that the mapped packet is structurally accepted by the already-existing canonical evaluator as `approved_repository_evidence_only`.

## Canonical mapping

| Evidence source | Canonical evaluator field |
| --- | --- |
| `policyMetadata.semanticVersion` | `policyVersion` |
| `policyMetadata.policyHash` | `policyHash` |
| `policyMetadata.effectiveAtUtc` | `effectiveAt` |
| explicit adapter input `policyAuthorId` | `policyAuthorId` |
| explicit adapter input `policyDomains` | `policyDomains` |
| `reviewerEvidence[].reviewerIdentity` | `approvals[].actorId` |
| `reviewerEvidence[].role` | `approvals[].reviewerRole` |
| `reviewerEvidence[].decision` | `approvals[].decision` |
| `reviewerEvidence[].evidenceReference.policyHash` | `approvals[].policyHash` |
| `reviewerEvidence[].evidenceReference.policyVersion` | `approvals[].policyVersion` |
| `reviewerEvidence[].timestamp` | `approvals[].occurredAt` |

`policyAuthorId` and `policyDomains` are deliberately explicit adapter inputs because the existing evidence template does not contain them. They are never inferred from a reviewer, from the gate config, or from repository context.

## Evidence reference contract

`evidenceReference` is a reference and binding record, not an approval by itself. A structurally valid reference has exactly:

```json
{
  "referenceType": "sha256",
  "referenceHash": "<64 lowercase hex>",
  "policyHash": "<64 lowercase hex>",
  "policyVersion": "<semantic x.y.z>"
}
```

The reference hash identifies evidence without embedding the human document. The bound policy hash and version must exactly match the validated policy metadata before those values can be propagated to the canonical approval record.

No URL, raw document, signature body, credential, token, binary or base64 material is consumed by this adapter.

## `supersedesHash`

`policyMetadata.supersedesHash` is validated only as `null` or SHA-256. It is not emitted to the canonical evaluator packet because the current `evaluatePolicyApproval()` contract has no field for it. Therefore it has no evaluator effect in this boundary.

## Fail-closed requirements

The adapter blocks when any required source is missing or inconsistent, including:

- current/incomplete evidence status;
- incomplete/false approval evidence flags;
- missing or invalid explicit policy author UUID;
- anything other than the exact five canonical policy domains;
- missing, unknown or duplicate reviewer roles;
- missing, invalid or duplicate reviewer identities;
- policy author reused as reviewer;
- decision other than `approved`;
- timestamp without explicit UTC `Z`;
- invalid policy hash/version/effective time;
- evidence-reference hash/version drift;
- missing or malformed evidence reference;
- raw/sensitive policy material;
- materialized policy values;
- any prohibited-effect flag becoming true.

## Current materialized state

The existing template remains unchanged and intentionally incomplete:

```text
status=approval_evidence_incomplete
approvalComplete=false
approvedPolicyPresent=false
policyApprovalAuthority=false
reviewersWithEvidence=0
```

Therefore the current materialized template maps to `blocked_repository_only` and cannot produce a canonical policy packet.

## Preserved boundaries

This boundary does not authorize or execute:

- policy-value selection or materialization;
- snapshot-read invocation;
- rate-limit consume;
- handler or repository operation;
- credential reads;
- RPC, Supabase, network or Realtime access;
- staging;
- migration or deployment;
- production changes;
- merge or ready-for-review.

`COM-B02`, `COM-B03` and `COM-B04` remain blockers, together with the other blockers already preserved by B01.

## Validation

The permanent repository-only workflow executes:

```bash
node --check backend/modules/communities/community-policy-approval-evidence-packet-adapter.js
node scripts/audit-com-b01-policy-approval-evidence-packet-adapter.js
node scripts/test-com-b01-policy-approval-evidence-packet-adapter.js
node scripts/audit-com-b01-policy-operational-integration-gate.js
node scripts/test-com-b01-policy-operational-integration-gate.js
npm run audit:domain-completion-matrix
npm run audit:agent-governance
git diff --check
```

The workflow has `contents: read`, references no secrets, and contains no runtime/staging transport.
