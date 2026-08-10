#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3l = require('../backend/modules/communities/community-realtime-private-auth-r3l');
const executor = require('./execute-com-b03c-r3l-evaluation-context-differential-presence-staging-diagnostic');
const config = require('../config/com-b03c-r3l-evaluation-context-differential-presence-diagnostic-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3L-SINGLE-USE-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-DIAGNOSTIC-READINESS.json');

function fail(code) {
  throw new Error(code);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectBlocked(input, reason) {
  const result = r3l.evaluateRepositoryReadiness(input);
  if (result.decision !== 'blocked' || result.reason !== reason) {
    fail(`DOKE_COM_B03C_R3L_EXPECTED_BLOCK_${reason}`);
  }
}

function authInput(overrides = {}) {
  return {
    authorizationPhrase: r3l.REQUIRED_AUTHORIZATION_PHRASE,
    authorizationConsumed: false,
    executionAttempted: false,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    runAttempt: 1,
    targetEnvironment: 'staging',
    projectId: r3l.REQUIRED_PROJECT_ID,
    branch: r3l.REQUIRED_BRANCH,
    pullRequest: r3l.REQUIRED_PULL_REQUEST,
    differentialProbeCount: 16,
    totalExecutionCaseCount: 17,
    negativeControlId: r3j.NEGATIVE_CONTROL_ID,
    executionCaseIds: [...r3l.EXECUTION_CASE_IDS],
    sameSyntheticIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    freshRealtimeClientPerCase: true,
    exactlyTwoTemporaryPoliciesPerCase: true,
    structuralGateBeforeProbe: true,
    cleanupAfterEveryCase: true,
    syntheticIdentityCleanupFinally: true,
    zeroResidueRequired: true,
    runtimePolicyChangeAuthorized: false,
    productionAuthorized: false,
    mergeAuthorized: false,
    ...overrides
  };
}

async function main() {
  if (config.contractId !== r3l.CONTRACT_ID || evidence.contractId !== r3l.CONTRACT_ID) {
    fail('DOKE_COM_B03C_R3L_CONTRACT_ID_MISMATCH');
  }
  if (config.predecessorEvidenceHead !== r3l.PREDECESSOR_EVIDENCE_HEAD) {
    fail('DOKE_COM_B03C_R3L_PREDECESSOR_HEAD_MISMATCH');
  }
  if (r3k.CONTRACT_ID !== config.r3kContractId) fail('DOKE_COM_B03C_R3L_R3K_CONTRACT_MISMATCH');
  if (JSON.stringify(config.executionCaseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)) {
    fail('DOKE_COM_B03C_R3L_17_CASE_MATRIX_MISMATCH');
  }
  if (config.executionCaseIds.length !== 17 || config.executionCaseIds[0] !== r3j.NEGATIVE_CONTROL_ID) {
    fail('DOKE_COM_B03C_R3L_NEGATIVE_CONTROL_MATRIX_INVALID');
  }
  if (config.authorizationPhraseDefined !== true || config.authorizationPhraseReceived !== false || config.authorizationPhraseConsumed !== false) {
    fail('DOKE_COM_B03C_R3L_PREAUTH_STATE_INVALID');
  }
  if (fs.existsSync(path.resolve(r3l.TRIGGER_PATH))) fail('DOKE_COM_B03C_R3L_TRIGGER_MUST_BE_ABSENT');

  const ready = r3l.evaluateRepositoryReadiness(config);
  if (ready.decision !== 'repository_single_use_differential_presence_authorization_lifecycle_ready_authorization_not_received') {
    fail('DOKE_COM_B03C_R3L_READINESS_NOT_READY');
  }
  if (ready.stagingReadAuthority !== false || ready.stagingMutationAuthority !== false) {
    fail('DOKE_COM_B03C_R3L_READINESS_REMOTE_AUTHORITY_LEAK');
  }

  let altered = clone(config);
  altered.predecessorEvidenceHead = '0'.repeat(40);
  expectBlocked(altered, 'R3K_EVIDENCE_HEAD_REQUIRED');
  altered = clone(config);
  altered.executionCaseIds.reverse();
  expectBlocked(altered, 'EXACT_17_CASE_MATRIX_REQUIRED');
  altered = clone(config);
  altered.authorizationPhraseReceived = true;
  expectBlocked(altered, 'R3L_PREAUTH_STATE_MUST_BE_FALSE');
  altered = clone(config);
  altered.authorizationPhraseConsumed = true;
  expectBlocked(altered, 'R3L_PREAUTH_STATE_MUST_BE_FALSE');
  altered = clone(config);
  altered.triggerExists = true;
  expectBlocked(altered, 'R3L_PREAUTH_STATE_MUST_BE_FALSE');
  altered = clone(config);
  altered.stagingAccessExecuted = true;
  expectBlocked(altered, 'R3L_PREAUTH_STATE_MUST_BE_FALSE');

  const authorized = r3l.evaluateStagingAuthorization(authInput());
  if (authorized.decision !== 'authorized_for_single_bounded_evaluation_context_differential_presence_diagnostic') {
    fail('DOKE_COM_B03C_R3L_AUTHORIZATION_POSITIVE_PATH_INVALID');
  }
  if (authorized.runtimePolicyChangeAuthority !== false || authorized.productionAuthority !== false || authorized.pullRequestMergeAuthority !== false) {
    fail('DOKE_COM_B03C_R3L_AUTHORIZATION_SCOPE_TOO_BROAD');
  }

  for (const [overrides, expectedReason] of [
    [{ authorizationPhrase: 'wrong' }, 'EXACT_R3L_AUTHORIZATION_PHRASE_REQUIRED'],
    [{ targetEnvironment: 'production' }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ projectId: 'wrong' }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ branch: 'wrong' }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ pullRequest: 999 }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ runAttempt: 2 }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ predecessorAuthorizationReusable: true }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ authorizationConsumed: true }, 'R3L_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED'],
    [{ executionAttempted: true }, 'R3L_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED'],
    [{ executionCaseIds: r3l.EXECUTION_CASE_IDS.slice(0, 16) }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ structuralGateBeforeProbe: false }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ zeroResidueRequired: false }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED'],
    [{ runtimePolicyChangeAuthorized: true }, 'R3L_EXACT_SINGLE_USE_SCOPE_REQUIRED']
  ]) {
    const result = r3l.evaluateStagingAuthorization(authInput(overrides));
    if (result.decision !== 'blocked' || result.reason !== expectedReason) {
      fail(`DOKE_COM_B03C_R3L_AUTHORIZATION_NEGATIVE_PATH_FAILED_${expectedReason}`);
    }
  }

  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    executor.prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R3L_REMOTE_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3l.STAGING_AUTHORIZATION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) fail('DOKE_COM_B03C_R3L_PREAUTH_SIDE_EFFECT_DETECTED');

  const workflow = fs.readFileSync(
    path.resolve('.github/workflows/com-b03c-r3l-evaluation-context-differential-presence-diagnostic-readiness.yml'),
    'utf8'
  );
  if (!workflow.includes(`- ${r3l.TRIGGER_PATH}`)) fail('DOKE_COM_B03C_R3L_PUSH_TRIGGER_PATH_FILTER_REQUIRED');
  if (!workflow.includes('permissions: { contents: read }')) fail('DOKE_COM_B03C_R3L_WORKFLOW_MUST_BE_READ_ONLY');
  if (workflow.includes('Canonical domain completion matrix writer')) fail('DOKE_COM_B03C_R3L_CANONICAL_WRITER_MUST_BE_ABSENT');
  if (!workflow.includes('environment: doke-staging')) fail('DOKE_COM_B03C_R3L_FUTURE_STAGING_JOB_REQUIRED');
  if (!workflow.includes('needs: authorize')) fail('DOKE_COM_B03C_R3L_CANARY_MUST_NEED_AUTHORIZE');
  if (!workflow.includes("if: github.event_name == 'push'")) fail('DOKE_COM_B03C_R3L_REMOTE_JOBS_PUSH_ONLY_REQUIRED');
  const secretExpressionPrefix = ['${{ ', 'secrets.'].join('');
  const directSupabaseEnv = ['process.env.', 'SUPABASE_'].join('');
  if (workflow.includes(secretExpressionPrefix) || workflow.includes(directSupabaseEnv)) {
    fail('DOKE_COM_B03C_R3L_FUTURE_CANARY_CREDENTIAL_WIRING_MUST_BE_ABSENT');
  }
  if (/\bsleep\b|setTimeout\s*\(/.test([
    workflow,
    fs.readFileSync(path.resolve('backend/modules/communities/community-realtime-private-auth-r3l.js'), 'utf8'),
    fs.readFileSync(path.resolve('scripts/execute-com-b03c-r3l-evaluation-context-differential-presence-staging-diagnostic.js'), 'utf8')
  ].join('\n'))) fail('DOKE_COM_B03C_R3L_ARBITRARY_DELAY_PROHIBITED');

  if (evidence.workflowBoundary.secretsReferencedByFutureCanaryJob !== false) fail('DOKE_COM_B03C_R3L_EVIDENCE_SECRET_WIRING_MISMATCH');
  if (evidence.workflowBoundary.futureCanaryCredentialWiringPrepared !== false) fail('DOKE_COM_B03C_R3L_EVIDENCE_CREDENTIAL_WIRING_MISMATCH');
  if (evidence.workflowBoundary.remoteExecutorInvocationPrepared !== false) fail('DOKE_COM_B03C_R3L_EVIDENCE_REMOTE_EXECUTOR_MISMATCH');
  if (evidence.workflowBoundary.workflowPermissions !== 'contents: read' || evidence.workflowBoundary.canonicalWriterPresent !== false) {
    fail('DOKE_COM_B03C_R3L_EVIDENCE_WORKFLOW_RESTORATION_MISMATCH');
  }
  if (evidence.authority.stagingReadAuthority !== false || evidence.effects.stagingAccessExecuted !== false || evidence.exactRootCauseProven !== false) {
    fail('DOKE_COM_B03C_R3L_EVIDENCE_AUTHORITY_INVALID');
  }
  process.stdout.write('COM-B03C-R3L readiness checks passed\n');
}

main().catch((error) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
