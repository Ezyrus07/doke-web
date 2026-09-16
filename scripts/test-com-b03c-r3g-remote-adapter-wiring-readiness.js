#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const executor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');
const verifier = require('./verify-com-b03c-r3g-remote-adapter-readiness');

let checks = 0;
function check(value, code) {
  checks += 1;
  if (!value) throw new Error(code);
}

const config = JSON.parse(fs.readFileSync(path.resolve('config/com-b03c-r3g-remote-adapter-wiring-readiness.json'), 'utf8'));
const input = {
  predecessorValidationId: config.predecessor.validationId,
  predecessorStatus: config.predecessor.status,
  predecessorEvidenceHead: config.predecessor.evidenceHead,
  predecessorRecertRun: config.predecessor.recertificationRun,
  predecessorRecertJob: config.predecessor.recertificationJob,
  predecessorRecertSuccess: config.predecessor.recertified,
  r3fContractId: r3f.CONTRACT_ID,
  ...config.remoteWiring,
  ...config.safety
};
const decision = r3g.evaluateRepositoryRemoteWiringReadiness(input);
check(decision.decision === 'repository_remote_adapter_wiring_ready_new_remote_authorization_boundary_not_defined', 'R3G_DECISION');
check(decision.repositoryRemoteWiringAuthority === true, 'R3G_REPOSITORY_AUTHORITY');
for (const key of ['stagingReadAuthority','stagingMutationAuthority','authIdentityLifecycleAuthority','realtimePolicyLifecycleAuthority','realtimeSubscriptionAuthority','remoteCredentialReadAuthority','remoteDependencyLoadAuthority','runtimeDeployAuthority','productionAuthority','pullRequestMergeAuthority']) {
  check(decision[key] === false, `R3G_${key}`);
}
check(JSON.stringify(decision.remoteDependencies) === JSON.stringify(['pg','@supabase/supabase-js']), 'R3G_DEPENDENCIES');
check(JSON.stringify(decision.credentialNames) === JSON.stringify(['SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_PROJECT_REF']), 'R3G_CREDENTIAL_NAMES');
check(config.safety.triggerExists === false, 'R3G_TRIGGER_ABSENT');
check(config.safety.authorizationPhraseDefined === false, 'R3G_PHRASE_ABSENT');
check(config.safety.workflowSecretsReferenced === false, 'R3G_WORKFLOW_SECRETS_ABSENT');
check(config.safety.stagingEnvironmentReferenced === false, 'R3G_STAGING_ENV_ABSENT');
check(config.safety.remoteExecutionJobCreated === false, 'R3G_REMOTE_JOB_ABSENT');
check(r3g.validateFutureSingleUseEnvelopeShape({ singleUse:true, reusableAfterFailure:false, predecessorAuthorizationReusable:false, runAttempt:1, targetEnvironment:'staging', projectId:r3g.REQUIRED_PROJECT_ID, branch:r3g.REQUIRED_BRANCH, pullRequest:r3g.REQUIRED_PULL_REQUEST }) === true, 'R3G_SINGLE_USE_SHAPE');
check(r3g.validateFutureSingleUseEnvelopeShape({ singleUse:true, reusableAfterFailure:true, predecessorAuthorizationReusable:false, runAttempt:1, targetEnvironment:'staging', projectId:r3g.REQUIRED_PROJECT_ID, branch:r3g.REQUIRED_BRANCH, pullRequest:r3g.REQUIRED_PULL_REQUEST }) === false, 'R3G_REUSE_REJECTED');

let blocked = false;
try { r3g.assertRemoteBoundaryAbsent(); } catch (error) { blocked = error?.code === r3g.REMOTE_EXECUTION_BLOCK_CODE; }
check(blocked, 'R3G_REMOTE_BLOCK');

const wrongPredecessor = r3g.evaluateRepositoryRemoteWiringReadiness({ ...input, predecessorEvidenceHead: '0'.repeat(40) });
check(wrongPredecessor.repositoryRemoteWiringAuthority === false, 'R3G_WRONG_PREDECESSOR_FAILS');
const phrasePresent = r3g.evaluateRepositoryRemoteWiringReadiness({ ...input, authorizationPhraseDefined: true });
check(phrasePresent.repositoryRemoteWiringAuthority === false, 'R3G_PREMATURE_PHRASE_FAILS');
const triggerPresent = r3g.evaluateRepositoryRemoteWiringReadiness({ ...input, triggerExists: true });
check(triggerPresent.repositoryRemoteWiringAuthority === false, 'R3G_PREMATURE_TRIGGER_FAILS');
const secretsPresent = r3g.evaluateRepositoryRemoteWiringReadiness({ ...input, workflowSecretsReferenced: true });
check(secretsPresent.repositoryRemoteWiringAuthority === false, 'R3G_PREMATURE_SECRETS_FAILS');

(async () => {
  const report = await executor.repositorySelfTest();
  check(report.caseCount === r3f.CASE_IDS.length, 'R3G_SELF_TEST_CASE_COUNT');
  check(report.allStructuralEvidenceComplete === true, 'R3G_SELF_TEST_EVIDENCE');
  check(report.credentialReadsBeforeAuthorization === 0, 'R3G_SELF_TEST_CREDENTIAL_ZERO');
  check(report.dependencyLoadsBeforeAuthorization === 0, 'R3G_SELF_TEST_DEPENDENCY_ZERO');
  check(report.stagingAccess === false && report.networkAccess === false, 'R3G_SELF_TEST_REMOTE_ZERO');
  check(verifier.verifyReport(report).verified === true, 'R3G_SELF_TEST_VERIFIED');
  process.stdout.write(`COM-B03C-R3G repository checks: ${checks}/${checks}\n`);
})().catch((error) => {
  process.stderr.write(`${String(error?.code || error?.message || error)}\n`);
  process.exitCode = 1;
});
