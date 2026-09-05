'use strict';

const r3l = require('./community-realtime-private-auth-r3l');

const CONTRACT_ID = 'com-b03c-r3m-r3l-executable-staging-envelope-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3M-R3L-EXECUTABLE-STAGING-ENVELOPE-READINESS';
const PREDECESSOR_VALIDATION_ID = r3l.VALIDATION_ID;
const PREDECESSOR_STATUS = 'repository_single_use_differential_presence_authorization_lifecycle_certified_no_staging_authority';
const PREDECESSOR_EVIDENCE_HEAD = 'ef456dc8edab0da60afb769d8dbc3c9b5a4c2279';
const PREDECESSOR_CANONICAL_RECERT_HEAD = 'a922f2408fdb851184b3e7de8c2017831ecfd95d';
const PREDECESSOR_CANONICAL_RECERT_RUN = 31385654634;
const PREDECESSOR_CANONICAL_RECERT_JOB = 93445354346;
const REQUIRED_BRANCH = r3l.REQUIRED_BRANCH;
const REQUIRED_PULL_REQUEST = r3l.REQUIRED_PULL_REQUEST;
const REQUIRED_PROJECT_ID = r3l.REQUIRED_PROJECT_ID;
const REQUIRED_PROJECT_NAME = r3l.REQUIRED_PROJECT_NAME;
const REQUIRED_AUTHORIZATION_PHRASE = r3l.REQUIRED_AUTHORIZATION_PHRASE;
const TRIGGER_PATH = r3l.TRIGGER_PATH;
const TRIGGER_CONTRACT_ID = r3l.TRIGGER_CONTRACT_ID;
const WORKFLOW_PATH = '.github/workflows/com-b03c-r3m-r3l-executable-staging-envelope-readiness.yml';
const EXECUTOR_PATH = 'scripts/execute-com-b03c-r3l-evaluation-context-differential-presence-staging-diagnostic.js';
const VERIFIER_PATH = 'scripts/verify-com-b03c-r3l-evaluation-context-differential-presence-diagnostic-readiness.js';
const REPORT_PATH = 'reports/generated/COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING.json';
const ARTIFACT_PREFIX = 'com-b03c-r3l-differential-presence';
const ARTIFACT_RETENTION_DAYS = 30;
const CREDENTIAL_NAMES = r3l.CREDENTIAL_NAMES;
const REMOTE_DEPENDENCIES = r3l.REMOTE_DEPENDENCIES;
const EXECUTION_CASE_IDS = r3l.EXECUTION_CASE_IDS;

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    executableEnvelopePrepared: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimePolicyChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3L_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3L_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3L_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorCanonicalRecertHead !== PREDECESSOR_CANONICAL_RECERT_HEAD ||
      input.predecessorCanonicalRecertRun !== PREDECESSOR_CANONICAL_RECERT_RUN ||
      input.predecessorCanonicalRecertJob !== PREDECESSOR_CANONICAL_RECERT_JOB ||
      input.predecessorCanonicalRecertSuccess !== true) {
    return blocked('R3L_CANONICAL_RECERT_REQUIRED');
  }
  if (input.r3lContractId !== r3l.CONTRACT_ID) return blocked('R3L_CONTRACT_REQUIRED');
  if (input.requiredAuthorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXACT_R3L_AUTHORIZATION_PHRASE_REQUIRED');
  if (input.triggerPath !== TRIGGER_PATH || input.triggerContractId !== TRIGGER_CONTRACT_ID) return blocked('EXACT_R3L_TRIGGER_CONTRACT_REQUIRED');
  if (input.workflowPath !== WORKFLOW_PATH || input.executorPath !== EXECUTOR_PATH || input.verifierPath !== VERIFIER_PATH || input.reportPath !== REPORT_PATH) return blocked('EXACT_EXECUTION_ENVELOPE_PATHS_REQUIRED');
  if (!exactArray(input.credentialNames, CREDENTIAL_NAMES)) return blocked('EXACT_CREDENTIAL_CONTRACT_REQUIRED');
  if (!exactArray(input.remoteDependencies, REMOTE_DEPENDENCIES)) return blocked('EXACT_REMOTE_DEPENDENCY_CONTRACT_REQUIRED');
  if (!exactArray(input.executionCaseIds, EXECUTION_CASE_IDS)) return blocked('EXACT_17_CASE_MATRIX_REQUIRED');
  if (input.artifactPrefix !== ARTIFACT_PREFIX || input.artifactRetentionDays !== ARTIFACT_RETENTION_DAYS) return blocked('SANITIZED_ARTIFACT_CONTRACT_REQUIRED');

  const requiredTrue = [
    'secretsWiringDefinedForFutureCanary',
    'projectRefWiringDefinedForFutureCanary',
    'canaryOnlyDependencyInstallDefined',
    'r3lExecutorInvocationDefined',
    'independentR3lVerifierInvocationDefined',
    'sanitizedArtifactUploadDefined',
    'executorFailurePropagationDefined',
    'pushFilteredToExactR3lTriggerOnly',
    'certifyAuthorizeCanaryOrderingDefined',
    'triggerSingleFileDeltaRequired',
    'triggerParentContinuityRequired',
    'runAttemptOneRequired',
    'dokeStagingEnvironmentRequired',
    'ordinaryPullRequestRemoteJobsSkipped',
    'preAuthorizationHardBlockPreserved',
    'r3lHistoricalWorkflowGuardPreserved',
    'sameSeventeenCaseLifecyclePreserved',
    'zeroResidueRequirementPreserved',
    'causalPromotionBlocked'
  ];
  for (const flag of requiredTrue) if (input[flag] !== true) return blocked('R3M_EXECUTABLE_ENVELOPE_CONTROL_REQUIRED', { flag });

  const requiredFalse = [
    'authorizationPhraseReceived',
    'authorizationPhraseConsumed',
    'triggerExists',
    'stagingAccessExecuted',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'authIdentityMutationExecuted',
    'realtimePolicyMutationExecuted',
    'realtimeSubscriptionExecuted',
    'runtimePolicyChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of requiredFalse) if (input[flag] !== false) return blocked('R3M_PREAUTH_STATE_MUST_BE_FALSE', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_r3l_executable_staging_envelope_ready_authorization_not_received',
    reason: null,
    executableEnvelopePrepared: true,
    requiredAuthorizationPhrase: REQUIRED_AUTHORIZATION_PHRASE,
    triggerPath: TRIGGER_PATH,
    triggerContractId: TRIGGER_CONTRACT_ID,
    workflowPath: WORKFLOW_PATH,
    executorPath: EXECUTOR_PATH,
    verifierPath: VERIFIER_PATH,
    reportPath: REPORT_PATH,
    artifactPrefix: ARTIFACT_PREFIX,
    artifactRetentionDays: ARTIFACT_RETENTION_DAYS,
    credentialNames: CREDENTIAL_NAMES,
    remoteDependencies: REMOTE_DEPENDENCIES,
    executionCaseIds: EXECUTION_CASE_IDS,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimePolicyChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_CANONICAL_RECERT_HEAD,
  PREDECESSOR_CANONICAL_RECERT_RUN,
  PREDECESSOR_CANONICAL_RECERT_JOB,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_PROJECT_ID,
  REQUIRED_PROJECT_NAME,
  REQUIRED_AUTHORIZATION_PHRASE,
  TRIGGER_PATH,
  TRIGGER_CONTRACT_ID,
  WORKFLOW_PATH,
  EXECUTOR_PATH,
  VERIFIER_PATH,
  REPORT_PATH,
  ARTIFACT_PREFIX,
  ARTIFACT_RETENTION_DAYS,
  CREDENTIAL_NAMES,
  REMOTE_DEPENDENCIES,
  EXECUTION_CASE_IDS,
  evaluateRepositoryReadiness
});
