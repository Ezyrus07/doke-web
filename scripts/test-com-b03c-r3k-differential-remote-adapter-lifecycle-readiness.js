#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const executor = require('./execute-com-b03c-r3k-differential-remote-adapter-lifecycle');
const verifier = require('./verify-com-b03c-r3k-differential-remote-adapter-lifecycle-readiness');

function fail(code) {
  throw new Error(code);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.resolve(relativePath), 'utf8'));
}

async function main() {
  const config = readJson('config/com-b03c-r3k-differential-remote-adapter-lifecycle-readiness.json');
  const evidence = readJson('docs/validation/COM-B03C-R3K-DIFFERENTIAL-REMOTE-ADAPTER-LIFECYCLE-READINESS.json');
  const predecessor = readJson('docs/validation/COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-HARNESS-READINESS.json');

  if (
    predecessor.validationId !== r3k.PREDECESSOR_VALIDATION_ID ||
    predecessor.status !== r3k.PREDECESSOR_STATUS ||
    predecessor.exactRootCauseProven !== false
  ) {
    fail('DOKE_COM_B03C_R3K_PREDECESSOR_EVIDENCE_INVALID');
  }
  if (
    config.validationId !== evidence.validationId ||
    config.contractId !== r3k.CONTRACT_ID ||
    evidence.contractId !== r3k.CONTRACT_ID
  ) {
    fail('DOKE_COM_B03C_R3K_CONFIG_EVIDENCE_CONTRACT_MISMATCH');
  }

  const decision = r3k.evaluateRepositoryRemoteLifecycleReadiness(config.readinessInput);
  if (
    decision.decision !==
    'repository_differential_remote_adapter_lifecycle_ready_new_remote_authorization_boundary_not_defined'
  ) {
    fail(`DOKE_COM_B03C_R3K_READINESS_REJECTED_${decision.reason || 'UNKNOWN'}`);
  }
  if (
    decision.repositoryRemoteLifecycleAuthority !== true ||
    decision.remoteExecutionAuthority !== false ||
    decision.triggerCreationAuthority !== false ||
    decision.stagingReadAuthority !== false ||
    decision.stagingMutationAuthority !== false ||
    decision.remoteCredentialReadAuthority !== false ||
    decision.remoteDependencyLoadAuthority !== false ||
    decision.runtimeChangeAuthority !== false ||
    decision.productionAuthority !== false ||
    decision.pullRequestMergeAuthority !== false
  ) {
    fail('DOKE_COM_B03C_R3K_AUTHORITY_BOUNDARY_INVALID');
  }
  if (
    decision.singleUseLifecycle.executionCaseCount !== 17 ||
    decision.singleUseLifecycle.differentialProbeCount !== 16 ||
    decision.singleUseLifecycle.negativeControlId !== r3j.NEGATIVE_CONTROL_ID ||
    JSON.stringify(decision.executionCaseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)
  ) {
    fail('DOKE_COM_B03C_R3K_SINGLE_USE_CASE_MATRIX_INVALID');
  }

  const wrongAttempt = r3k.validateFutureSingleUseEnvelopeShape({
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    runAttempt: 2,
    targetEnvironment: 'staging',
    projectId: r3k.REQUIRED_PROJECT_ID,
    branch: r3k.REQUIRED_BRANCH,
    pullRequest: r3k.REQUIRED_PULL_REQUEST,
    negativeControlId: r3j.NEGATIVE_CONTROL_ID,
    executionCaseIds: r3j.EXECUTION_CASE_IDS
  });
  if (wrongAttempt !== false) fail('DOKE_COM_B03C_R3K_RERUN_ENVELOPE_NOT_BLOCKED');

  const prohibited = r3k.evaluateRepositoryRemoteLifecycleReadiness({
    ...config.readinessInput,
    triggerExists: true
  });
  if (prohibited.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R3K_TRIGGER_PROHIBITION_NOT_FAIL_CLOSED');
  }

  const missingControl = r3k.evaluateRepositoryRemoteLifecycleReadiness({
    ...config.readinessInput,
    zeroResidueRequirementPrepared: false
  });
  if (missingControl.decision !== 'blocked_repository_only') {
    fail('DOKE_COM_B03C_R3K_REQUIRED_CONTROL_NOT_FAIL_CLOSED');
  }

  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    executor.prepareRemoteRuntime({
      readCredential() {
        credentialReads += 1;
        return 'unexpected';
      },
      loadDependency() {
        dependencyLoads += 1;
        return {};
      }
    });
    fail('DOKE_COM_B03C_R3K_REMOTE_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3k.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R3K_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const report = await executor.repositorySelfTest();
  const verified = verifier.verify(report);
  if (verified.verified !== true || verified.stagingAccess !== false) {
    fail('DOKE_COM_B03C_R3K_SELF_TEST_VERIFICATION_FAILED');
  }

  const sourceFiles = [
    '.github/workflows/com-b03c-r3k-differential-remote-adapter-lifecycle-readiness.yml',
    'backend/modules/communities/community-realtime-private-auth-r3k.js',
    'config/com-b03c-r3k-differential-remote-adapter-lifecycle-readiness.json',
    'docs/validation/COM-B03C-R3K-DIFFERENTIAL-REMOTE-ADAPTER-LIFECYCLE-READINESS.json',
    'scripts/execute-com-b03c-r3k-differential-remote-adapter-lifecycle.js',
    'scripts/verify-com-b03c-r3k-differential-remote-adapter-lifecycle-readiness.js',
    'scripts/test-com-b03c-r3k-differential-remote-adapter-lifecycle-readiness.js'
  ];
  const forbidden = [
    ['secrets', '.'].join(''),
    ['environment:', ' doke-staging'].join(''),
    ['process.env.', 'SUPABASE_'].join(''),
    ['I_EXPLICITLY_', 'AUTHORIZE_COM_B03C_R3K'].join('')
  ];
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const token of forbidden) {
      if (text.includes(token)) {
        fail(`DOKE_COM_B03C_R3K_FORBIDDEN_REMOTE_TOKEN_${path.basename(file)}`);
      }
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      contractId: r3k.CONTRACT_ID,
      repositoryReadiness: 'success',
      differentialProbeCount: 16,
      totalExecutionCaseCount: 17,
      negativeControlPreserved: true,
      credentialReadsBeforeAuthorization: 0,
      dependencyLoadsBeforeAuthorization: 0,
      stagingAccess: false,
      exactRootCauseProven: false
    })}\n`
  );
}

main().catch((error) => {
  process.stderr.write(
    `${String(error?.code || error?.message || 'DOKE_COM_B03C_R3K_TEST_FAILURE')}\n`
  );
  process.exitCode = 2;
});
