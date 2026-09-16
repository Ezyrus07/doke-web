'use strict';

const crypto = require('node:crypto');
const r5d = require('./community-realtime-private-auth-r5d');
const r5h = require('./community-realtime-private-auth-r5h');

const CONTRACT_ID = 'com-b03c-r5d-corrected-terminal-observation-hosted-execution-boundary-v1';
const VALIDATION_ID = 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION-BOUNDARY';
const STATUS = 'repository_r5h_bound_r5d_corrected_terminal_observation_hosted_execution_boundary_ready_no_remote_authority';

const REPOSITORY_BASELINE_HEAD = '2eb32ef8bddf5e3f801a75bda4044b7a509e17c6';
const R5H_CERTIFIED_HEAD = 'a06de307f580c6b787a4c233a342a28a751f3621';
const R5H_CERTIFIED_TREE = '6ef6a16772785200b1ddf0564b01b7da5d55abe5';
const R5H_CERTIFICATION_RUN = 31852587738;
const R5H_CERTIFICATION_JOB = 94931027687;
const R5H_MODULE_BLOB = 'a8f20583aa78554bcb01da8b6cb6e1e17dd99370';

const TARGET_BRANCH = r5d.TARGET_BRANCH;
const TARGET_PR = r5d.TARGET_PR;
const TARGET_STAGING_PROJECT = r5d.TARGET_STAGING_PROJECT;
const MATRIX_VERSION = r5h.MATRIX_VERSION;
const REQUIRED_MATURITY = r5h.REQUIRED_MATURITY;
const REQUIRED_PRODUCTION_GATE = r5h.REQUIRED_PRODUCTION_GATE;

const TRIGGER_PATH = r5h.TRIGGER_PATH;
const TRIGGER_BLOB = r5h.TRIGGER_BLOB;
const R5F_RECEIPT_PATH = r5h.R5F_RECEIPT_PATH;
const R5F_RECEIPT_BLOB = r5h.R5F_RECEIPT_BLOB;
const R5F_RECEIPT_ID = r5h.R5F_RECEIPT_ID;
const R5D_CERTIFIED_HEAD = r5h.R5D_CERTIFIED_HEAD;
const R5D_MODULE_BLOB = r5h.R5D_MODULE_BLOB;
const CORRECTED_BRIDGE_BLOB = r5d.CORRECTED_BRIDGE_BLOB;
const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = r5d.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT;

const FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH =
  'config/com-b03c-r5d-single-use-corrected-terminal-observation-execution-authorization-consumption.json';
const RECEIPT_CONTRACT_ID =
  'com-b03c-r5d-single-use-corrected-terminal-observation-execution-authorization-receipt-v1';
const RECEIPT_STATUS = 'execution_authorization_consumed_execution_pending';
const AUTHORIZATION_PREFIX =
  'I_EXPLICITLY_AUTHORIZE_COM_B03C_R5D_CORRECTED_TERMINAL_OBSERVATION_EXECUTION_SINGLE_USE_ON_DOKE_STAGING_FOR_BOUNDARY_HEAD_';
const AUTHORIZED_DECISION =
  'r5d_single_use_corrected_terminal_observation_remote_execution_authorized_for_this_attempt';

const REPORT_SCHEMA = r5d.REPORT_SCHEMA;

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    hostedExecutionBoundaryReady: false,
    explicitExecutionAuthorizationReceived: false,
    executionAuthorizationConsumed: false,
    executionAttempted: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function buildAuthorizationScope({ certifiedBoundaryHead } = {}) {
  if (!isSha(certifiedBoundaryHead)) {
    const error = new TypeError('R5D_HOSTED_CERTIFIED_BOUNDARY_HEAD_REQUIRED');
    error.code = 'R5D_HOSTED_CERTIFIED_BOUNDARY_HEAD_REQUIRED';
    throw error;
  }
  const scope = {
    authorizationContractId: CONTRACT_ID,
    certifiedBoundaryHead,
    repositoryBaselineHead: REPOSITORY_BASELINE_HEAD,
    r5hCertifiedHead: R5H_CERTIFIED_HEAD,
    r5hCertifiedTree: R5H_CERTIFIED_TREE,
    r5hContractId: r5h.CONTRACT_ID,
    r5dContractId: r5d.CONTRACT_ID,
    r5dEnvelopeKind: r5d.ENVELOPE_KIND,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5dModuleBlob: R5D_MODULE_BLOB,
    r5fAuthorizationReceiptId: R5F_RECEIPT_ID,
    r5fAuthorizationReceiptBlob: R5F_RECEIPT_BLOB,
    frozenTriggerPath: TRIGGER_PATH,
    frozenTriggerBlob: TRIGGER_BLOB,
    correctedBridgeBlob: CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    targetEnvironment: 'staging',
    projectId: TARGET_STAGING_PROJECT,
    branch: TARGET_BRANCH,
    pullRequest: TARGET_PR,
    futureExecutionAuthorizationReceiptPath: FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH,
    runAttempt: 1,
    singleUse: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
    rawAuthorizationPhrasePersistenceAllowed: false,
    noCausalPromotionFromTerminalStatusAlone: true
  };
  return freeze({
    ...scope,
    scopeFingerprint: sha256(JSON.stringify(scope))
  });
}

function buildAuthorizationPhrase({ certifiedBoundaryHead } = {}) {
  const scope = buildAuthorizationScope({ certifiedBoundaryHead });
  return `${AUTHORIZATION_PREFIX}${scope.certifiedBoundaryHead}`;
}

function authorizationPhraseFingerprint({ certifiedBoundaryHead } = {}) {
  return sha256(buildAuthorizationPhrase({ certifiedBoundaryHead }));
}

function deriveAuthorizationReceiptId({ certifiedBoundaryHead } = {}) {
  const scope = buildAuthorizationScope({ certifiedBoundaryHead });
  return sha256([
    CONTRACT_ID,
    certifiedBoundaryHead,
    scope.scopeFingerprint,
    authorizationPhraseFingerprint({ certifiedBoundaryHead }),
    TRIGGER_BLOB,
    R5F_RECEIPT_ID,
    R5D_CERTIFIED_HEAD,
    CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    TARGET_STAGING_PROJECT,
    TARGET_BRANCH,
    String(TARGET_PR)
  ].join(':'));
}

function evaluateRepositoryReadiness(input = {}) {
  if (
    input.repositoryBaselineHead !== REPOSITORY_BASELINE_HEAD ||
    input.r5hCertifiedHead !== R5H_CERTIFIED_HEAD ||
    input.r5hCertifiedTree !== R5H_CERTIFIED_TREE ||
    input.r5hCertificationRun !== R5H_CERTIFICATION_RUN ||
    input.r5hCertificationJob !== R5H_CERTIFICATION_JOB ||
    input.r5hCertificationSuccess !== true ||
    input.r5hModuleBlob !== R5H_MODULE_BLOB
  ) {
    return blocked('R5D_HOSTED_R5H_CERTIFICATION_CONTINUITY_REQUIRED');
  }
  if (
    input.r5hContractId !== r5h.CONTRACT_ID ||
    input.r5hStatus !== r5h.STATUS ||
    input.r5dContractId !== r5d.CONTRACT_ID ||
    input.r5dCertifiedHead !== R5D_CERTIFIED_HEAD ||
    input.r5dModuleBlob !== R5D_MODULE_BLOB
  ) {
    return blocked('R5D_HOSTED_R5H_R5D_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (
    input.triggerPath !== TRIGGER_PATH ||
    input.triggerBlob !== TRIGGER_BLOB ||
    input.triggerCertified !== true ||
    input.triggerCreated !== true ||
    input.triggerSingleUse !== true ||
    input.triggerReusableAfterFailure !== false
  ) {
    return blocked('R5D_HOSTED_FROZEN_R5H_TRIGGER_REQUIRED');
  }
  if (
    input.r5fReceiptPath !== R5F_RECEIPT_PATH ||
    input.r5fReceiptBlob !== R5F_RECEIPT_BLOB ||
    input.r5fReceiptId !== R5F_RECEIPT_ID ||
    input.r5fAuthorizationConsumed !== true ||
    input.r5fAuthorizationReusable !== false
  ) {
    return blocked('R5D_HOSTED_CONSUMED_R5F_RECEIPT_CONTINUITY_REQUIRED');
  }
  if (
    input.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB ||
    input.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT
  ) {
    return blocked('R5D_HOSTED_CORRECTED_BRIDGE_CONTINUITY_REQUIRED');
  }
  if (
    input.matrixVersion !== MATRIX_VERSION ||
    input.maturity !== REQUIRED_MATURITY ||
    input.productionGate !== REQUIRED_PRODUCTION_GATE
  ) {
    return blocked('R5D_HOSTED_CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (
    input.targetBranch !== TARGET_BRANCH ||
    input.targetPr !== TARGET_PR ||
    input.targetStagingProject !== TARGET_STAGING_PROJECT
  ) {
    return blocked('R5D_HOSTED_TARGET_CONTINUITY_REQUIRED');
  }
  if (
    input.futureExecutionAuthorizationReceiptPath !== FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH ||
    input.futureExecutionAuthorizationReceiptExists !== false
  ) {
    return blocked('R5D_HOSTED_EXECUTION_AUTHORIZATION_RECEIPT_MUST_BE_ABSENT');
  }

  const required = [
    'separateRemoteExecutionBoundaryDefined',
    'freshHeadBoundExecutionAuthorizationRequired',
    'singleFileExecutionAuthorizationReceiptRequired',
    'receiptParentMustEqualAuthorizedBoundaryHead',
    'priorAuthorizationReuseForbidden',
    'priorReceiptReuseForbidden',
    'triggerRecreationForbidden',
    'triggerReuseAfterAttemptForbidden',
    'runAttemptOneRequired',
    'singleSyntheticIdentityRequired',
    'freshRealtimeClientRequired',
    'privatePresenceOnlyChannelRequired',
    'uniqueTopicRequired',
    'correctedR4zBridgeRequired',
    'identityCleanupRequired',
    'zeroResidueRequired',
    'sanitizedArtifactRequired',
    'rawRemoteErrorForbidden',
    'productionForbidden',
    'mergeForbidden',
    'noCausalPromotionFromTerminalStatusAlone'
  ];
  for (const flag of required) {
    if (input[flag] !== true) {
      return blocked('R5D_HOSTED_REPOSITORY_CONTROL_REQUIRED', { flag });
    }
  }

  const prohibited = [
    'explicitExecutionAuthorizationReceived',
    'executionAuthorizationReceiptCreated',
    'executionAuthorizationConsumed',
    'executionAttempted',
    'remoteCredentialReadExecuted',
    'remoteDependencyLoadExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'realtimeSubscriptionExecuted',
    'authIdentityMutationExecuted',
    'runtimeChangeExecuted',
    'productionExecuted',
    'mergeExecuted'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) {
      return blocked('R5D_HOSTED_REPOSITORY_ONLY_SCOPE_REQUIRED', { flag });
    }
  }

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    status: STATUS,
    decision: STATUS,
    repositoryBaselineHead: REPOSITORY_BASELINE_HEAD,
    r5hCertifiedHead: R5H_CERTIFIED_HEAD,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5fAuthorizationReceiptId: R5F_RECEIPT_ID,
    triggerPath: TRIGGER_PATH,
    triggerBlob: TRIGGER_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    futureExecutionAuthorizationReceiptPath: FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH,
    hostedExecutionBoundaryReady: true,
    explicitExecutionAuthorizationReceived: false,
    executionAuthorizationReceiptCreated: false,
    executionAuthorizationConsumed: false,
    executionAttempted: false,
    remoteExecutionAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    networkAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'After this hosted execution boundary is certified on an exact immutable head, wait for a fresh explicit single-use execution authorization phrase bound to that exact boundary head. Only then may a separate single-file execution-authorization receipt be materialized; that receipt commit is the sole execution trigger. Generic continuation is non-authorizing.'
  });
}

function evaluateExplicitAuthorization({
  certifiedBoundaryHead,
  authorizationPhrase,
  authorizationConsumed = false,
  executionAttempted = false,
  targetEnvironment = 'staging',
  projectId = TARGET_STAGING_PROJECT,
  branch = TARGET_BRANCH,
  pullRequest = TARGET_PR
} = {}) {
  if (!isSha(certifiedBoundaryHead)) return blocked('R5D_HOSTED_CERTIFIED_BOUNDARY_HEAD_REQUIRED');
  if (authorizationPhrase !== buildAuthorizationPhrase({ certifiedBoundaryHead })) {
    return blocked('R5D_HOSTED_EXACT_HEAD_BOUND_EXECUTION_AUTHORIZATION_REQUIRED');
  }
  if (authorizationConsumed !== false || executionAttempted !== false) {
    return blocked('R5D_HOSTED_EXECUTION_AUTHORIZATION_ALREADY_CONSUMED_OR_ATTEMPTED');
  }
  if (
    targetEnvironment !== 'staging' ||
    projectId !== TARGET_STAGING_PROJECT ||
    branch !== TARGET_BRANCH ||
    pullRequest !== TARGET_PR
  ) {
    return blocked('R5D_HOSTED_EXACT_EXECUTION_AUTHORIZATION_SCOPE_REQUIRED');
  }
  const scope = buildAuthorizationScope({ certifiedBoundaryHead });
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'fresh_head_bound_r5d_execution_authorization_received_repository_only',
    certifiedBoundaryHead,
    scopeFingerprint: scope.scopeFingerprint,
    authorizationPhraseFingerprint: authorizationPhraseFingerprint({ certifiedBoundaryHead }),
    authorizationReceiptId: deriveAuthorizationReceiptId({ certifiedBoundaryHead }),
    singleUse: true,
    authorizationConsumed: false,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    rawAuthorizationPhrasePersisted: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function buildConsumedExecutionAuthorizationReceipt({ certifiedBoundaryHead } = {}) {
  const received = evaluateExplicitAuthorization({
    certifiedBoundaryHead,
    authorizationPhrase: buildAuthorizationPhrase({ certifiedBoundaryHead }),
    authorizationConsumed: false,
    executionAttempted: false
  });
  if (received.decision === 'blocked_repository_only') {
    throw new Error(received.reason);
  }
  return freeze({
    contractId: RECEIPT_CONTRACT_ID,
    status: RECEIPT_STATUS,
    issuerContractId: CONTRACT_ID,
    authorizedHead: certifiedBoundaryHead,
    scopeFingerprint: received.scopeFingerprint,
    authorizationPhraseFingerprint: received.authorizationPhraseFingerprint,
    authorizationReceiptId: received.authorizationReceiptId,
    r5hCertifiedHead: R5H_CERTIFIED_HEAD,
    r5dCertifiedHead: R5D_CERTIFIED_HEAD,
    r5fAuthorizationReceiptId: R5F_RECEIPT_ID,
    r5fAuthorizationReceiptBlob: R5F_RECEIPT_BLOB,
    frozenTriggerPath: TRIGGER_PATH,
    frozenTriggerBlob: TRIGGER_BLOB,
    correctedBridgeSemanticsFingerprint: CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    targetEnvironment: 'staging',
    projectId: TARGET_STAGING_PROJECT,
    branch: TARGET_BRANCH,
    pullRequest: TARGET_PR,
    runAttempt: 1,
    singleUse: true,
    authorizationConsumed: true,
    authorizationReusable: false,
    reusableAfterFailure: false,
    executionAttempted: false,
    zeroResidueRequired: true,
    baselineRestorationRequired: true,
    sanitizedArtifactRequired: true,
    rawAuthorizationPhrasePersisted: false,
    remoteExecutionAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function validateConsumedExecutionAuthorizationReceipt({
  receipt,
  parentHead,
  changedFiles,
  runAttempt,
  triggerBlob
} = {}) {
  if (!receipt || typeof receipt !== 'object') {
    return blocked('R5D_HOSTED_CONSUMED_EXECUTION_AUTHORIZATION_RECEIPT_REQUIRED');
  }
  if (!isSha(parentHead) || receipt.authorizedHead !== parentHead) {
    return blocked('R5D_HOSTED_RECEIPT_PARENT_MUST_EQUAL_AUTHORIZED_BOUNDARY_HEAD');
  }
  if (!exactArray(changedFiles, [FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH])) {
    return blocked('R5D_HOSTED_EXACT_SINGLE_FILE_EXECUTION_AUTHORIZATION_RECEIPT_REQUIRED');
  }
  if (runAttempt !== 1 || receipt.runAttempt !== 1) {
    return blocked('R5D_HOSTED_SINGLE_USE_RUN_ATTEMPT_REQUIRED');
  }
  if (triggerBlob !== TRIGGER_BLOB) {
    return blocked('R5D_HOSTED_FROZEN_TRIGGER_BLOB_REQUIRED');
  }

  const expected = buildConsumedExecutionAuthorizationReceipt({
    certifiedBoundaryHead: parentHead
  });
  const exactFields = [
    'contractId', 'status', 'issuerContractId', 'authorizedHead',
    'scopeFingerprint', 'authorizationPhraseFingerprint', 'authorizationReceiptId',
    'r5hCertifiedHead', 'r5dCertifiedHead', 'r5fAuthorizationReceiptId',
    'r5fAuthorizationReceiptBlob', 'frozenTriggerPath', 'frozenTriggerBlob',
    'correctedBridgeSemanticsFingerprint', 'targetEnvironment', 'projectId',
    'branch', 'pullRequest', 'runAttempt', 'singleUse', 'authorizationConsumed',
    'authorizationReusable', 'reusableAfterFailure', 'executionAttempted',
    'zeroResidueRequired', 'baselineRestorationRequired', 'sanitizedArtifactRequired',
    'rawAuthorizationPhrasePersisted', 'remoteExecutionAuthority',
    'productionAuthority', 'pullRequestMergeAuthority'
  ];
  for (const key of exactFields) {
    if (receipt[key] !== expected[key]) {
      return blocked('R5D_HOSTED_EXECUTION_AUTHORIZATION_RECEIPT_BINDING_REQUIRED', { field: key });
    }
  }
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'r5d_consumed_execution_authorization_receipt_valid_for_single_use_attempt',
    authorizedHead: parentHead,
    authorizationReceiptId: receipt.authorizationReceiptId,
    executionAuthorizationConsumed: true,
    singleUse: true,
    reusableAfterFailure: false,
    remoteExecutionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

function authorizeExecution(input = {}) {
  const validated = validateConsumedExecutionAuthorizationReceipt(input);
  if (validated.decision !== 'r5d_consumed_execution_authorization_receipt_valid_for_single_use_attempt') {
    return validated;
  }
  return freeze({
    ...validated,
    decision: AUTHORIZED_DECISION,
    executionAttempted: true,
    remoteExecutionAuthority: true,
    remoteCredentialReadAuthority: true,
    remoteDependencyLoadAuthority: true,
    networkAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: true,
    realtimeSubscriptionAuthority: true,
    authIdentityLifecycleAuthority: true,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  VALIDATION_ID,
  STATUS,
  REPOSITORY_BASELINE_HEAD,
  R5H_CERTIFIED_HEAD,
  R5H_CERTIFIED_TREE,
  R5H_CERTIFICATION_RUN,
  R5H_CERTIFICATION_JOB,
  R5H_MODULE_BLOB,
  TARGET_BRANCH,
  TARGET_PR,
  TARGET_STAGING_PROJECT,
  MATRIX_VERSION,
  REQUIRED_MATURITY,
  REQUIRED_PRODUCTION_GATE,
  TRIGGER_PATH,
  TRIGGER_BLOB,
  R5F_RECEIPT_PATH,
  R5F_RECEIPT_BLOB,
  R5F_RECEIPT_ID,
  R5D_CERTIFIED_HEAD,
  R5D_MODULE_BLOB,
  CORRECTED_BRIDGE_BLOB,
  CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
  FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH,
  RECEIPT_CONTRACT_ID,
  RECEIPT_STATUS,
  AUTHORIZATION_PREFIX,
  AUTHORIZED_DECISION,
  REPORT_SCHEMA,
  buildAuthorizationScope,
  buildAuthorizationPhrase,
  authorizationPhraseFingerprint,
  deriveAuthorizationReceiptId,
  evaluateRepositoryReadiness,
  evaluateExplicitAuthorization,
  buildConsumedExecutionAuthorizationReceipt,
  validateConsumedExecutionAuthorizationReceipt,
  authorizeExecution
});
