#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const fixtures = require(path.join(__dirname, '..', 'tests/fixtures/com-b01-policy-operational-gate-cases.json'));
const gate = require(path.join(__dirname, '..', 'backend/modules/communities/community-policy-operational-integration-gate.js'));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function policyPayload(mutation) {
  if (mutation === 'missing') return null;
  const value = clone(fixtures.validPolicy);
  if (mutation === 'wrong_contract') value.contractId = 'wrong';
  if (mutation === 'bad_version') value.policyVersion = 'v1';
  if (mutation === 'bad_hash') value.policyHash = 'bad';
  if (mutation === 'bad_effective_at') value.effectiveAt = '2026-08-05';
  if (mutation === 'bad_author') value.policyAuthorId = 'bad';
  if (mutation === 'missing_domain') value.policyDomains.pop();
  if (mutation === 'missing_approval') value.approvals.pop();
  if (mutation === 'self_approval') value.approvals[0].actorId = value.policyAuthorId;
  if (mutation === 'duplicate_actor') value.approvals[1].actorId = value.approvals[0].actorId;
  if (mutation === 'duplicate_role') value.approvals[1].reviewerRole = value.approvals[0].reviewerRole;
  if (mutation === 'rejected_approval') value.approvals[0].decision = 'rejected';
  if (mutation === 'approval_hash_drift') value.approvals[0].policyHash = 'b'.repeat(64);
  if (mutation === 'approval_version_drift') value.approvals[0].policyVersion = '2.0.0';
  if (mutation === 'approval_bad_utc') value.approvals[0].occurredAt = 'today';
  if (mutation === 'raw_policy') value.rawPolicy = 'prohibited';
  return value;
}

function operationsPayload(mutation) {
  const value = clone(fixtures.validOperations);
  value.policy = clone(fixtures.validPolicy);
  if (mutation === 'missing_policy') value.policy = null;
  if (mutation === 'bad_evaluated_at') value.evaluatedAt = 'now';
  if (Object.prototype.hasOwnProperty.call(value, mutation)) value[mutation] = false;
  if (mutation === 'missing_blocker') value.preservedBlockers.pop();
  return value;
}

let passed = 0;
for (const item of fixtures.cases) {
  const result = item.kind === 'policy'
    ? gate.evaluatePolicyApproval(policyPayload(item.mutation))
    : gate.evaluateOperationalIntegration(operationsPayload(item.mutation));
  assert.strictEqual(result.decision, item.expectedDecision, item.name);
  assert.strictEqual(result.runtimeMutationAuthority, false, `${item.name}: runtime`);
  assert.strictEqual(result.stagingAuthority, false, `${item.name}: staging`);
  assert.strictEqual(result.productionAuthority, false, `${item.name}: production`);
  passed += 1;
}

assert.strictEqual(passed, fixtures.expected.total, 'total');
const handoff = gate.buildActivationHandoff({
  policy: clone(fixtures.validPolicy),
  operations: operationsPayload('none')
});
assert.strictEqual(handoff.policyDecision, 'approved_repository_evidence_only');
assert.strictEqual(handoff.operationalDecision, 'ready_for_separate_activation_authorization');
assert.strictEqual(handoff.readyForSeparateActivationAuthorization, true);
assert.strictEqual(handoff.nextSublot, 'COM-B02');
assert.strictEqual(handoff.runtimeMutationAuthority, false);
assert.strictEqual(handoff.stagingAuthority, false);
assert.strictEqual(handoff.productionAuthority, false);

console.log(`COM-B01 conformance passed: ${passed}/${fixtures.expected.total}`);
