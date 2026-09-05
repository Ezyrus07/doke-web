#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3r = require('../backend/modules/communities/community-realtime-private-auth-r3r');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const config = require('../config/com-b03c-r3s-constrained-observation-primitives-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3S-CONSTRAINED-OBSERVATION-PRIMITIVES-READINESS.json');

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
    r3rContractId: config.continuity.r3rContractId,
    r3qContractId: config.continuity.r3qContractId,
    requiredCapabilities: [...config.continuity.requiredCapabilities],
    counterPhases: [...config.continuity.counterPhases],
    counterIds: [...config.continuity.counterIds],
    residueCountFields: [...config.continuity.residueCountFields],
    forbiddenExecutorMethods: [...config.continuity.forbiddenExecutorMethods],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function makeExecutor(options = {}) {
  const calls = [];
  const counterSnapshots = {
    baseline_before_probe: {
      broadcast_rls_evaluations: 10,
      presence_rls_evaluations: 20
    },
    after_presence_read_effective_gate: {
      broadcast_rls_evaluations: 11,
      presence_rls_evaluations: 21
    },
    after_presence_only_join: {
      broadcast_rls_evaluations: 12,
      presence_rls_evaluations: 22
    },
    after_cleanup: {
      broadcast_rls_evaluations: 12,
      presence_rls_evaluations: 22
    },
    ...(options.counterSnapshots || {})
  };
  return {
    kind: 'synthetic_repository',
    remoteCapable: false,
    calls,
    async executeObservation(descriptor, context) {
      calls.push({ descriptorId: descriptor.id, context: { ...context } });
      if (descriptor.id === r3s.COUNTER_READ_DESCRIPTOR.id) {
        return counterSnapshots[context.phase];
      }
      if (descriptor.id === r3s.RESIDUE_INSPECTION_DESCRIPTOR.id) {
        return options.residueCounts || {
          policyCount: 0,
          functionCount: 0,
          sequenceCount: 0
        };
      }
      throw new Error('UNEXPECTED_R3S_DESCRIPTOR');
    }
  };
}

async function main() {
  const decision = r3s.evaluateRepositoryReadiness(readinessInput());
  assert.equal(decision.decision, 'repository_constrained_observation_primitives_ready_no_remote_authority');
  assert.equal(decision.repositoryObservationPrimitiveAuthority, true);
  assert.equal(decision.remoteAdapterBindingAuthority, false);
  assert.equal(decision.remoteExecutionAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);
  assert.equal(decision.remoteCredentialReadAuthority, false);
  assert.equal(decision.remoteDependencyLoadAuthority, false);
  assert.equal(decision.productionAuthority, false);
  assert.equal(decision.pullRequestMergeAuthority, false);
  assert.equal(decision.exactRootCauseProven, false);
  assert.equal(decision.causalPromotionAllowed, false);

  assert.equal(r3r.CONTRACT_ID, config.continuity.r3rContractId);
  assert.equal(r3q.CONTRACT_ID, config.continuity.r3qContractId);
  assert.deepEqual([...r3r.REQUIRED_MISSING_CAPABILITIES], config.continuity.requiredCapabilities);
  assert.deepEqual([...r3s.REQUIRED_CAPABILITIES], config.continuity.requiredCapabilities);
  assert.deepEqual([...r3s.COUNTER_PHASES], config.continuity.counterPhases);
  assert.deepEqual([...r3s.COUNTER_IDS], config.continuity.counterIds);
  assert.deepEqual([...r3s.RESIDUE_COUNT_FIELDS], config.continuity.residueCountFields);
  assert.deepEqual([...r3s.FORBIDDEN_EXECUTOR_METHODS], config.continuity.forbiddenExecutorMethods);

  for (const field of Object.keys(config.controls)) {
    assert.equal(
      r3s.evaluateRepositoryReadiness(readinessInput({ [field]: false })).decision,
      'blocked_repository_only',
      field
    );
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    assert.equal(
      r3s.evaluateRepositoryReadiness(readinessInput({ [field]: true })).decision,
      'blocked_repository_only',
      field
    );
  }

  assert.equal(r3s.COUNTER_READ_DESCRIPTOR.executableSqlPrepared, false);
  assert.equal(r3s.COUNTER_READ_DESCRIPTOR.sql, null);
  assert.equal(r3s.COUNTER_READ_DESCRIPTOR.statementText, null);
  assert.equal(r3s.RESIDUE_INSPECTION_DESCRIPTOR.executableSqlPrepared, false);
  assert.equal(r3s.RESIDUE_INSPECTION_DESCRIPTOR.sql, null);
  assert.equal(r3s.RESIDUE_INSPECTION_DESCRIPTOR.statementText, null);

  const descriptorsText = JSON.stringify([
    r3s.COUNTER_READ_DESCRIPTOR,
    r3s.RESIDUE_INSPECTION_DESCRIPTOR
  ]);
  assert.doesNotMatch(descriptorsText, /\b(select|insert|update|delete|create|drop|alter|grant|revoke)\b/i);

  assert.throws(
    () => r3s.assertRepositoryObservationExecutor({ kind: 'remote', remoteCapable: true }),
    /R3S_REMOTE_CAPABLE_EXECUTOR_PROHIBITED/
  );
  const forbiddenExecutor = makeExecutor();
  forbiddenExecutor.query = async () => {};
  assert.throws(
    () => r3s.assertRepositoryObservationExecutor(forbiddenExecutor),
    /R3S_FORBIDDEN_EXECUTOR_METHOD_query/
  );

  assert.throws(
    () => r3s.assertRemoteObservationBoundaryAbsent(),
    (error) => error?.code === r3s.REMOTE_EXECUTION_BLOCK_CODE
  );

  const executor = makeExecutor();
  const primitives = r3s.buildRepositoryObservationPrimitives(executor);
  const context = { ownershipToken: 'r3s_repo_0123456789ab' };

  for (const phase of r3s.COUNTER_PHASES) {
    const snapshot = await primitives.readCounters(phase, context);
    assert.deepEqual(snapshot, {
      broadcast_rls_evaluations:
        phase === 'baseline_before_probe' ? 10 :
        phase === 'after_presence_read_effective_gate' ? 11 : 12,
      presence_rls_evaluations:
        phase === 'baseline_before_probe' ? 20 :
        phase === 'after_presence_read_effective_gate' ? 21 : 22
    });
  }

  const residue = await primitives.inspectInstrumentationResidue(context);
  assert.deepEqual(residue, { policyCount: 0, functionCount: 0, sequenceCount: 0 });
  assert.equal(await primitives.assertZeroResidue(context), true);
  assert.equal(
    await r3s.buildRepositoryObservationPrimitives(
      makeExecutor({ residueCounts: { policyCount: 0, functionCount: 1, sequenceCount: 0 } })
    ).assertZeroResidue(context),
    false
  );

  await assert.rejects(
    () => primitives.readCounters('arbitrary_phase', context),
    /R3S_COUNTER_PHASE_PROHIBITED/
  );
  await assert.rejects(
    () => primitives.readCounters('baseline_before_probe', { ownershipToken: 'bad' }),
    /R3S_INSTRUMENTATION_OWNERSHIP_TOKEN_REQUIRED/
  );
  await assert.rejects(
    () => r3s.buildRepositoryObservationPrimitives(makeExecutor({
      counterSnapshots: {
        baseline_before_probe: {
          broadcast_rls_evaluations: -1,
          presence_rls_evaluations: 20
        }
      }
    })).readCounters('baseline_before_probe', context),
    /R3S_COUNTER_VALUE_INVALID_broadcast_rls_evaluations/
  );
  await assert.rejects(
    () => r3s.buildRepositoryObservationPrimitives(makeExecutor({
      counterSnapshots: {
        baseline_before_probe: {
          broadcast_rls_evaluations: 10,
          presence_rls_evaluations: 20,
          unexpected: 1
        }
      }
    })).readCounters('baseline_before_probe', context),
    /R3S_COUNTER_SNAPSHOT_SHAPE_INVALID/
  );
  await assert.rejects(
    () => r3s.buildRepositoryObservationPrimitives(makeExecutor({
      residueCounts: {
        policyCount: 0,
        functionCount: 0,
        sequenceCount: 0,
        unexpected: 1
      }
    })).inspectInstrumentationResidue(context),
    /R3S_RESIDUE_COUNT_SHAPE_INVALID/
  );

  assert.equal(evidence.contractId, r3s.CONTRACT_ID);
  assert.equal(
    evidence.status,
    'repository_constrained_observation_primitives_certified_no_remote_authority'
  );
  assert.equal(evidence.initialBoundaryCommit, 'a2df888b8f6703873e2c793fd2ea006786a06db7');
  assert.equal(evidence.certificationHistory.initialFailClosed.r3sRun, 31405591010);
  assert.equal(evidence.certificationHistory.initialFailClosed.r3sJob, 93510999566);
  assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
  assert.equal(evidence.certificationHistory.initialFailClosed.syntaxPassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.primitiveContractPassed, true);
  assert.equal(evidence.certificationHistory.initialFailClosed.preRemoteHardBlockPassed, true);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerRun, 31405803866);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerJob, 93511718971);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerConclusion, 'success');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputCommit, '6454257484c181dddbc2831464abbf67eefd6244');
  assert.deepEqual(evidence.certificationHistory.canonicalMatrixReconciliation.writerOutputs, [
    'docs/DOMAIN-COMPLETION-MATRIX.md',
    'reports/generated/domain-completion-matrix-report.json'
  ]);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.matrixSourceChanged, false);
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredHead, '5428c359005130093f77547c0a0d6e3e6a675a33');
  assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredBlob, '299108d86dc097ba090392ebe9f218f6849e74ad');
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3sRun, 31405948588);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3sJob, 93512205769);
  assert.equal(evidence.certificationHistory.normalHeadCertification.r3sConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixRun, 31405948527);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixJob, 93512205620);
  assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
  assert.equal(evidence.certificationHistory.normalHeadCertification.runAttempt, 1);
  assert.equal(evidence.primitiveContract.executableSqlPrepared, false);
  assert.equal(evidence.primitiveContract.remoteExecutorPrepared, false);
  assert.equal(evidence.authority.repositoryObservationPrimitiveContract, true);
  assert.equal(evidence.authority.remoteAdapterBinding, false);
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.authority.stagingRead, false);
  assert.equal(evidence.authority.stagingMutation, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.effects.remoteCredentialReadExecuted, false);
  assert.equal(evidence.effects.remoteDependencyLoadExecuted, false);
  assert.equal(evidence.effects.remoteClientInstantiated, false);
  assert.equal(evidence.effects.databaseQueryExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(`${JSON.stringify({
    contractId: r3s.CONTRACT_ID,
    decision: decision.decision,
    capabilityCount: r3s.REQUIRED_CAPABILITIES.length,
    descriptorCount: 2,
    remoteExecutionAuthority: decision.remoteExecutionAuthority,
    exactRootCauseProven: decision.exactRootCauseProven
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
