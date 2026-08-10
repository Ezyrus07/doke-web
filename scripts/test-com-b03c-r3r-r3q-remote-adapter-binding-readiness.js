#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3r = require('../backend/modules/communities/community-realtime-private-auth-r3r');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');
const r3kExecutor = require('./execute-com-b03c-r3k-differential-remote-adapter-lifecycle');
const config = require('../config/com-b03c-r3r-r3q-remote-adapter-binding-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3R-R3Q-REMOTE-ADAPTER-BINDING-READINESS.json');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRecertRun: config.predecessor.matrixRecertRun,
    predecessorMatrixRecertJob: config.predecessor.matrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessor.matrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3qContractId: config.continuity.r3qContractId,
    r3gContractId: config.continuity.r3gContractId,
    r3kContractId: config.continuity.r3kContractId,
    adapterMethods: [...config.continuity.adapterMethods],
    missingCapabilities: [...config.binding.missingCapabilities],
    requiredR3gExecutorExports: [...config.continuity.requiredR3gExecutorExports],
    requiredR3kExecutorExports: [...config.continuity.requiredR3kExecutorExports],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function assertHardBlockBeforeReads(prepare, expectedCode) {
  let credentialReads = 0;
  let dependencyLoads = 0;
  assert.throws(
    () => prepare({
      readCredential() {
        credentialReads += 1;
        return 'forbidden';
      },
      loadDependency() {
        dependencyLoads += 1;
        return {};
      }
    }),
    (error) => error?.code === expectedCode
  );
  assert.equal(credentialReads, 0);
  assert.equal(dependencyLoads, 0);
}

function main() {
  const decision = r3r.evaluateRepositoryReadiness(readinessInput());
  assert.equal(
    decision.decision,
    'repository_remote_adapter_binding_contract_ready_two_db_observation_primitives_unbound_no_remote_authority'
  );
  assert.equal(decision.repositoryBindingContractAuthority, true);
  assert.equal(decision.remoteAdapterActivationAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);
  assert.equal(decision.remoteCredentialReadAuthority, false);
  assert.equal(decision.remoteDependencyLoadAuthority, false);
  assert.equal(decision.productionAuthority, false);
  assert.equal(decision.pullRequestMergeAuthority, false);
  assert.equal(decision.exactRootCauseProven, false);
  assert.equal(decision.causalPromotionAllowed, false);

  assert.equal(r3q.CONTRACT_ID, config.continuity.r3qContractId);
  assert.equal(r3g.CONTRACT_ID, config.continuity.r3gContractId);
  assert.equal(r3k.CONTRACT_ID, config.continuity.r3kContractId);
  assert.deepEqual([...r3q.ADAPTER_METHODS], config.continuity.adapterMethods);

  const completeness = r3r.inspectBindingCompleteness();
  assert.equal(completeness.fullyBound, false);
  assert.deepEqual([...completeness.missingCapabilities], config.binding.missingCapabilities);
  assert.equal(completeness.entries.length, r3q.ADAPTER_METHODS.length);
  assert.equal(completeness.entries.filter((entry) => entry.status === 'unbound_required_capability').length, 2);

  for (const method of config.continuity.requiredR3gExecutorExports) {
    assert.equal(typeof r3gExecutor[method], 'function', method);
  }
  for (const method of config.continuity.requiredR3kExecutorExports) {
    assert.equal(typeof r3kExecutor[method], 'function', method);
  }

  assertHardBlockBeforeReads(r3gExecutor.prepareRemoteRuntime, r3g.REMOTE_EXECUTION_BLOCK_CODE);
  assertHardBlockBeforeReads(r3kExecutor.prepareRemoteRuntime, r3k.REMOTE_EXECUTION_BLOCK_CODE);
  assert.throws(
    () => r3r.assertRemoteActivationBoundaryAbsent(),
    (error) => error?.code === r3r.REMOTE_EXECUTION_BLOCK_CODE
  );

  for (const field of Object.keys(config.controls)) {
    assert.equal(
      r3r.evaluateRepositoryReadiness(readinessInput({ [field]: false })).decision,
      'blocked_repository_only',
      field
    );
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    assert.equal(
      r3r.evaluateRepositoryReadiness(readinessInput({ [field]: true })).decision,
      'blocked_repository_only',
      field
    );
  }

  assert.equal(evidence.contractId, r3r.CONTRACT_ID);
  assert.equal(
    evidence.status,
    'repository_remote_adapter_binding_contract_certified_two_db_observation_primitives_unbound_no_remote_authority'
  );
  assert.equal(evidence.binding.fullyBound, false);
  assert.deepEqual(evidence.binding.missingCapabilities, config.binding.missingCapabilities);
  assert.equal(evidence.binding.executableSqlPrepared, false);
  assert.equal(evidence.authority.repositoryBindingContract, true);
  assert.equal(evidence.authority.remoteAdapterActivation, false);
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.authority.stagingRead, false);
  assert.equal(evidence.authority.stagingMutation, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.effects.remoteCredentialReadExecuted, false);
  assert.equal(evidence.effects.remoteDependencyLoadExecuted, false);
  assert.equal(evidence.effects.remoteClientInstantiated, false);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3rConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerAttempt2Conclusion, 'success');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowPermissions, 'contents: read');
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(`${JSON.stringify({
    contractId: r3r.CONTRACT_ID,
    decision: decision.decision,
    evidenceStatus: evidence.status,
    r3qMethodCount: completeness.entries.length,
    missingCapabilities: completeness.missingCapabilities,
    remoteAdapterActivationAuthority: decision.remoteAdapterActivationAuthority,
    exactRootCauseProven: decision.exactRootCauseProven
  })}\n`);
}

main();
