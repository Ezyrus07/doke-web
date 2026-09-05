#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const fixtures = require(path.join(root, 'tests/fixtures/com-b01-policy-approval-evidence-packet-adapter-cases.json'));
const adapter = require(path.join(root, 'backend/modules/communities/community-policy-approval-evidence-packet-adapter.js'));
const gate = require(path.join(root, 'backend/modules/communities/community-policy-operational-integration-gate.js'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mutatedInput(mutation) {
  const input = clone(fixtures.validInput);
  const template = input.evidenceTemplate;
  const first = template.reviewerEvidence[0];
  const second = template.reviewerEvidence[1];

  if (mutation === 'missing_author') delete input.policyAuthorId;
  if (mutation === 'missing_domains') input.policyDomains.pop();
  if (mutation === 'extra_domain') input.policyDomains.push('unexpected_domain');
  if (mutation === 'missing_reviewer') template.reviewerEvidence.pop();
  if (mutation === 'missing_identity') first.reviewerIdentity = null;
  if (mutation === 'invalid_identity') first.reviewerIdentity = 'not-a-uuid';
  if (mutation === 'duplicate_identity') second.reviewerIdentity = first.reviewerIdentity;
  if (mutation === 'duplicate_role') second.role = first.role;
  if (mutation === 'unknown_role') first.role = 'owner';
  if (mutation === 'decision_rejected') first.decision = 'rejected';
  if (mutation === 'bad_timestamp') first.timestamp = '2026-09-04';
  if (mutation === 'bad_hash') template.policyMetadata.policyHash = 'bad';
  if (mutation === 'hash_drift') first.evidenceReference.policyHash = 'b'.repeat(64);
  if (mutation === 'bad_version') template.policyMetadata.semanticVersion = 'v1';
  if (mutation === 'version_drift') first.evidenceReference.policyVersion = '2.0.0';
  if (mutation === 'bad_effective_at') template.policyMetadata.effectiveAtUtc = '2026-09-04';
  if (mutation === 'raw_policy') input.rawPolicy = 'prohibited';
  if (mutation === 'missing_reference') first.evidenceReference = null;
  if (mutation === 'bad_reference_hash') first.evidenceReference.referenceHash = 'bad';
  if (mutation === 'author_is_reviewer') first.reviewerIdentity = input.policyAuthorId;
  if (mutation === 'approval_incomplete') {
    template.status = 'approval_evidence_incomplete';
    template.approvalComplete = false;
  }
  if (mutation === 'approved_policy_false') template.approvedPolicyPresent = false;
  if (mutation === 'approval_authority_false') template.policyApprovalAuthority = false;
  if (mutation === 'values_materialized') template.policyMetadata.policyValuesMaterialized = true;
  if (mutation === 'raw_body_present') template.policyMetadata.rawPolicyBodyPresent = true;
  if (mutation === 'prohibited_effect_true') template.prohibitedEffects.networkExecuted = true;
  if (mutation === 'bad_supersedes') template.policyMetadata.supersedesHash = 'bad';
  if (mutation === 'reference_extra_field') first.evidenceReference.url = 'https://example.invalid/evidence';

  return input;
}

let ready = 0;
let blocked = 0;
for (const item of fixtures.cases) {
  const result = adapter.buildCanonicalPolicyPacket(mutatedInput(item.mutation));
  assert.strictEqual(result.decision, item.expectedDecision, item.name);
  assert.strictEqual(result.approvedPolicyPresent, false, `${item.name}: adapter cannot grant approval`);
  assert.strictEqual(result.policyApprovalAuthority, false, `${item.name}: adapter cannot grant policy authority`);
  assert.strictEqual(result.runtimeMutationAuthority, false, `${item.name}: runtime authority`);
  assert.strictEqual(result.stagingAuthority, false, `${item.name}: staging authority`);
  assert.strictEqual(result.productionAuthority, false, `${item.name}: production authority`);
  if (result.canonicalPolicyPacketReady) ready += 1;
  else blocked += 1;
}

assert.strictEqual(fixtures.cases.length, fixtures.expected.total, 'fixture total');
assert.strictEqual(ready, fixtures.expected.ready, 'ready count');
assert.strictEqual(blocked, fixtures.expected.blocked, 'blocked count');

const positive = adapter.buildCanonicalPolicyPacket(mutatedInput('none'));
assert.strictEqual(positive.canonicalPolicyPacketReady, true, 'positive canonical packet ready');
assert.ok(positive.canonicalPolicyPacket, 'positive packet exists');
assert.strictEqual(positive.canonicalPolicyPacket.contractId, gate.CONTRACT_ID, 'canonical contract id');
assert.strictEqual(positive.canonicalPolicyPacket.policyVersion, fixtures.validInput.evidenceTemplate.policyMetadata.semanticVersion, 'version mapping');
assert.strictEqual(positive.canonicalPolicyPacket.policyHash, fixtures.validInput.evidenceTemplate.policyMetadata.policyHash, 'hash mapping');
assert.strictEqual(positive.canonicalPolicyPacket.effectiveAt, fixtures.validInput.evidenceTemplate.policyMetadata.effectiveAtUtc, 'effectiveAt mapping');
assert.strictEqual(positive.canonicalPolicyPacket.policyAuthorId, fixtures.validInput.policyAuthorId, 'author explicit mapping');
assert.deepStrictEqual(positive.canonicalPolicyPacket.policyDomains, fixtures.validInput.policyDomains, 'exact domain mapping');
assert.strictEqual(positive.canonicalPolicyPacket.approvals.length, 5, 'five approvals mapped');
assert.ok(!Object.prototype.hasOwnProperty.call(positive.canonicalPolicyPacket, 'supersedesHash'), 'supersedesHash has no evaluator effect');

for (let index = 0; index < positive.canonicalPolicyPacket.approvals.length; index += 1) {
  const approval = positive.canonicalPolicyPacket.approvals[index];
  const evidence = fixtures.validInput.evidenceTemplate.reviewerEvidence[index];
  assert.strictEqual(approval.actorId, evidence.reviewerIdentity, 'reviewer identity mapping');
  assert.strictEqual(approval.reviewerRole, evidence.role, 'reviewer role mapping');
  assert.strictEqual(approval.decision, evidence.decision, 'decision mapping');
  assert.strictEqual(approval.occurredAt, evidence.timestamp, 'timestamp mapping');
  assert.strictEqual(approval.policyHash, evidence.evidenceReference.policyHash, 'approval hash from validated reference');
  assert.strictEqual(approval.policyVersion, evidence.evidenceReference.policyVersion, 'approval version from validated reference');
  assert.ok(!Object.prototype.hasOwnProperty.call(approval, 'evidenceReference'), 'evidence reference itself is not an approval field');
}

const canonicalEvaluation = gate.evaluatePolicyApproval(positive.canonicalPolicyPacket);
assert.strictEqual(canonicalEvaluation.decision, 'approved_repository_evidence_only', 'canonical evaluator accepts positive synthetic packet');
assert.strictEqual(canonicalEvaluation.runtimeMutationAuthority, false, 'evaluator runtime authority false');
assert.strictEqual(canonicalEvaluation.stagingAuthority, false, 'evaluator staging authority false');
assert.strictEqual(canonicalEvaluation.productionAuthority, false, 'evaluator production authority false');

const currentTemplate = JSON.parse(fs.readFileSync(path.join(root, 'config/com-b01-server-owned-policy-approval-evidence-template.json'), 'utf8'));
const currentResult = adapter.buildCanonicalPolicyPacket({
  evidenceTemplate: currentTemplate,
  policyAuthorId: null,
  policyDomains: []
});
assert.strictEqual(currentResult.decision, 'blocked_repository_only', 'current materialized template remains blocked');
assert.strictEqual(currentResult.canonicalPolicyPacketReady, false, 'current template cannot create canonical packet');
assert.ok(currentResult.reasons.includes('APPROVAL_EVIDENCE_INCOMPLETE'), 'current template incomplete reason preserved');

console.log(`COM-B01 approval evidence packet adapter conformance passed: ${fixtures.expected.total}/${fixtures.expected.total} fixtures + current materialized template blocked`);
