#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3l = require('../backend/modules/communities/community-realtime-private-auth-r3l');
const r3m = require('../backend/modules/communities/community-realtime-private-auth-r3m');
const r3lExecutor = require('./execute-com-b03c-r3l-evaluation-context-differential-presence-staging-diagnostic');
const r3lVerifier = require('./verify-com-b03c-r3l-evaluation-context-differential-presence-diagnostic-readiness');
const config = require('../config/com-b03c-r3m-r3l-executable-staging-envelope-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3M-R3L-EXECUTABLE-STAGING-ENVELOPE-READINESS.json');

function fail(code) { throw new Error(code); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function expectBlocked(input, reason) {
  const result = r3m.evaluateRepositoryReadiness(input);
  if (result.decision !== 'blocked_repository_only' || result.reason !== reason) fail(`DOKE_COM_B03C_R3M_EXPECTED_BLOCK_${reason}`);
}

function syntheticRemoteReport() {
  return {
    validationId: 'COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING-REPORT',
    contractId: r3l.CONTRACT_ID,
    environment: 'staging',
    runAttempt: 1,
    headSha: '1'.repeat(40),
    workflowInstallHead: '2'.repeat(40),
    differentialProbeCount: 16,
    totalExecutionCaseCount: 17,
    executionCaseIds: [...r3l.EXECUTION_CASE_IDS],
    structuralGateCount: 17,
    caseResults: r3l.EXECUTION_CASE_IDS.map((caseId) => ({
      caseId,
      structuralEvidence: { evidenceComplete: true },
      rawRemoteErrorExposed: false
    })),
    policyResidue: { count: 0, zeroResidue: true },
    identityResidue: { count: 0, zeroResidue: true },
    zeroResidueProven: true,
    executionFailure: null,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
}

async function main() {
  if (config.contractId !== r3m.CONTRACT_ID || evidence.contractId !== r3m.CONTRACT_ID) fail('DOKE_COM_B03C_R3M_CONTRACT_MISMATCH');
  if (config.predecessorCanonicalRecertHead !== r3m.PREDECESSOR_CANONICAL_RECERT_HEAD || config.predecessorCanonicalRecertRun !== r3m.PREDECESSOR_CANONICAL_RECERT_RUN || config.predecessorCanonicalRecertJob !== r3m.PREDECESSOR_CANONICAL_RECERT_JOB) fail('DOKE_COM_B03C_R3M_PREDECESSOR_RECERT_MISMATCH');
  if (config.requiredAuthorizationPhrase !== r3l.REQUIRED_AUTHORIZATION_PHRASE || config.triggerPath !== r3l.TRIGGER_PATH || config.triggerContractId !== r3l.TRIGGER_CONTRACT_ID) fail('DOKE_COM_B03C_R3M_R3L_AUTH_TRIGGER_MISMATCH');
  if (JSON.stringify(config.executionCaseIds) !== JSON.stringify(r3l.EXECUTION_CASE_IDS) || config.executionCaseIds.length !== 17) fail('DOKE_COM_B03C_R3M_CASE_MATRIX_MISMATCH');
  if (fs.existsSync(path.resolve(r3l.TRIGGER_PATH))) fail('DOKE_COM_B03C_R3M_TRIGGER_MUST_BE_ABSENT');

  const ready = r3m.evaluateRepositoryReadiness(config);
  if (ready.decision !== 'repository_r3l_executable_staging_envelope_ready_authorization_not_received' || ready.executableEnvelopePrepared !== true) fail('DOKE_COM_B03C_R3M_NOT_READY');
  for (const key of ['triggerCreationAuthority','stagingReadAuthority','stagingMutationAuthority','remoteCredentialReadAuthority','remoteDependencyLoadAuthority','authIdentityLifecycleAuthority','realtimePolicyLifecycleAuthority','realtimeSubscriptionAuthority','runtimePolicyChangeAuthority','productionAuthority','pullRequestMergeAuthority']) {
    if (ready[key] !== false) fail(`DOKE_COM_B03C_R3M_PREAUTH_AUTHORITY_LEAK_${key}`);
  }

  let altered = clone(config);
  altered.predecessorCanonicalRecertHead = '0'.repeat(40);
  expectBlocked(altered, 'R3L_CANONICAL_RECERT_REQUIRED');
  altered = clone(config);
  altered.executionCaseIds = altered.executionCaseIds.slice(0, 16);
  expectBlocked(altered, 'EXACT_17_CASE_MATRIX_REQUIRED');
  altered = clone(config);
  altered.secretsWiringDefinedForFutureCanary = false;
  expectBlocked(altered, 'R3M_EXECUTABLE_ENVELOPE_CONTROL_REQUIRED');
  altered = clone(config);
  altered.authorizationPhraseReceived = true;
  expectBlocked(altered, 'R3M_PREAUTH_STATE_MUST_BE_FALSE');
  altered = clone(config);
  altered.triggerExists = true;
  expectBlocked(altered, 'R3M_PREAUTH_STATE_MUST_BE_FALSE');

  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    r3lExecutor.prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R3M_R3L_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3l.STAGING_AUTHORIZATION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) fail('DOKE_COM_B03C_R3M_PREAUTH_SIDE_EFFECT_DETECTED');

  if (r3lVerifier.verify(syntheticRemoteReport()) !== true) fail('DOKE_COM_B03C_R3M_R3L_REMOTE_VERIFIER_SELF_TEST_FAILED');

  const workflow = fs.readFileSync(path.resolve(r3m.WORKFLOW_PATH), 'utf8');
  if (!workflow.includes('permissions: { contents: read }')) fail('DOKE_COM_B03C_R3M_WORKFLOW_MUST_BE_READ_ONLY');
  if (!workflow.includes(`- ${r3l.TRIGGER_PATH}`)) fail('DOKE_COM_B03C_R3M_EXACT_TRIGGER_FILTER_REQUIRED');
  if (!workflow.includes("if: github.event_name == 'push'")) fail('DOKE_COM_B03C_R3M_REMOTE_JOBS_MUST_BE_PUSH_ONLY');
  if (!workflow.includes('needs: authorize')) fail('DOKE_COM_B03C_R3M_CANARY_MUST_NEED_AUTHORIZE');
  if (!workflow.includes('environment: doke-staging')) fail('DOKE_COM_B03C_R3M_STAGING_ENVIRONMENT_REQUIRED');
  for (const secret of ['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD']) {
    if (!workflow.includes(`secrets.${secret}`)) fail(`DOKE_COM_B03C_R3M_SECRET_WIRING_REQUIRED_${secret}`);
  }
  if (!workflow.includes(`SUPABASE_PROJECT_REF: ${r3l.REQUIRED_PROJECT_ID}`)) fail('DOKE_COM_B03C_R3M_PROJECT_REF_WIRING_REQUIRED');
  if (!workflow.includes('npm install --no-save --ignore-scripts pg@8 @supabase/supabase-js@2.112.2')) fail('DOKE_COM_B03C_R3M_CANARY_DEPENDENCY_INSTALL_REQUIRED');
  if (!workflow.includes(`node ${r3m.EXECUTOR_PATH}`)) fail('DOKE_COM_B03C_R3M_R3L_EXECUTOR_INVOCATION_REQUIRED');
  if (!workflow.includes(`node ${r3m.VERIFIER_PATH} ${r3m.REPORT_PATH}`)) fail('DOKE_COM_B03C_R3M_R3L_VERIFIER_INVOCATION_REQUIRED');
  if (!workflow.includes('uses: actions/upload-artifact@v4') || !workflow.includes('retention-days: 30')) fail('DOKE_COM_B03C_R3M_ARTIFACT_UPLOAD_REQUIRED');
  if (!workflow.includes('continue-on-error: true') || !workflow.includes("if: steps.execute.outcome != 'success'")) fail('DOKE_COM_B03C_R3M_EXECUTION_FAILURE_PROPAGATION_REQUIRED');

  const r3lWorkflow = fs.readFileSync(path.resolve('.github/workflows/com-b03c-r3l-evaluation-context-differential-presence-diagnostic-readiness.yml'), 'utf8');
  const secretExpressionPrefix = ['${{ ', 'secrets.'].join('');
  if (r3lWorkflow.includes(secretExpressionPrefix)) fail('DOKE_COM_B03C_R3M_R3L_HISTORICAL_GUARD_MUTATED');
  if (!r3lWorkflow.includes('run: echo push-only-canary-boundary')) fail('DOKE_COM_B03C_R3M_R3L_PLACEHOLDER_GUARD_REQUIRED');

  if (evidence.authority?.stagingReadAuthority !== false || evidence.effects?.stagingAccessExecuted !== false || evidence.exactRootCauseProven !== false) fail('DOKE_COM_B03C_R3M_EVIDENCE_PREAUTH_INVALID');
  process.stdout.write('COM-B03C-R3M executable envelope readiness checks passed\n');
}

main().catch((error) => {
  process.stderr.write(`${String(error?.message || error)}\n`);
  process.exitCode = 1;
});
