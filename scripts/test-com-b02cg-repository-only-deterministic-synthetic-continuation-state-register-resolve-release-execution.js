'use strict';

const assert = require('node:assert/strict');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-resolve-release-execution');
const config = require('../config/com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution.json');

assert.equal(contract.CONTRACT_ID, config.contractId);
assert.equal(contract.BOUNDARY_ID, 'COM-B02CG');
assert.equal(contract.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.equal(contract.PREDECESSOR_HEAD, config.predecessor.head);
assert.equal(contract.PREDECESSOR_TREE, config.predecessor.tree);
assert.equal(contract.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.equal(contract.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.equal(contract.EXECUTION_PROOF_HEAD, config.executionProof.head);
assert.equal(contract.EXECUTION_PROOF_TREE, config.executionProof.tree);
assert.equal(contract.EXECUTION_PROOF_RUN_ID, config.executionProof.runId);
assert.equal(contract.EXECUTION_PROOF_JOB_ID, config.executionProof.jobId);
assert.equal(contract.AUTHORIZATION_KIND, config.authorization.kind);
assert.equal(contract.AUTHORIZATION_SOURCE, config.authorization.source);
assert.equal(contract.NEXT_ACTION, config.nextAction);
assert.equal(config.status, 'EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');
assert.equal(config.executionProof.authorizationConsumed, true);
assert.equal(config.executionProof.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(config.executionProof.registryRegisterExecuted, true);
assert.equal(config.executionProof.registryLookupExecuted, true);
assert.equal(config.executionProof.registryResolveExecuted, true);
assert.equal(config.executionProof.registryReleaseExecuted, true);
assert.equal(config.executionProof.entryCountAfterRegister, 1);
assert.equal(config.executionProof.entryCountAfterResolve, 1);
assert.equal(config.executionProof.entryCountAfterRelease, 0);
assert.equal(config.executionProof.entryAbsentAfterRelease, true);
assert.equal(config.executionProof.resumeSurfaceInvoked, false);
assert.equal(config.executionProof.networkExecuted, false);
assert.equal(config.finalization.executableSurfaceRemoved, true);
assert.equal(config.finalization.singleUseExecutorRemoved, true);
assert.equal(config.finalization.matrixExporterRemoved, true);
assert.equal(config.finalization.matrixPromoterRemoved, true);
assert.equal(config.finalization.reexecutionAllowed, false);
assert.equal(typeof contract.evaluateRepositoryCertification, 'function');
assert.equal(contract.executeRepositoryOnlyDeterministicSyntheticRegisterResolveRelease, undefined);

const proof = config.executionProof;
const certification = contract.evaluateRepositoryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  predecessorRepositoryCertified: config.predecessor.repositoryCertified,
  executionProofHead: proof.head,
  executionProofTree: proof.tree,
  executionProofRunId: proof.runId,
  executionProofJobId: proof.jobId,
  ...proof,
  authority: config.authorization,
  ...config.finalization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.authorizationConsumed, true);
assert.equal(certification.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(certification.executableSurfaceRemoved, true);
assert.equal(certification.singleUseExecutorRemoved, true);
assert.equal(certification.reexecutionAllowed, false);
assert.equal(certification.registryRegisterExecuted, true);
assert.equal(certification.registryLookupExecuted, true);
assert.equal(certification.registryResolveExecuted, true);
assert.equal(certification.registryReleaseExecuted, true);
assert.equal(certification.entryCountAfterRelease, 0);
assert.equal(certification.resumeSurfaceInvoked, false);
assert.equal(certification.networkExecuted, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.productionChanged, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, config.nextAction);

console.log('COM-B02CG static repository certification proof passed; no execution surface remains.');
