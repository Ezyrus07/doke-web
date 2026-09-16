'use strict';

const r5c = require('./community-realtime-private-auth-r5c');

const CONTRACT_ID = 'com-b03c-r5d-corrected-terminal-observation-execution-envelope-v1';
const VALIDATION_ID = 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-EXECUTION-ENVELOPE-READINESS';
const STATUS = 'repository_corrected_terminal_observation_execution_envelope_ready_no_remote_authority';

const R5C_CERTIFIED_HEAD = '65554baca33933cdbf6c660ba87658ab3ab4c5db';
const R5C_CERTIFICATION_RUN = 31713609745;
const R5C_CERTIFICATION_JOB = 94492595157;
const CANONICAL_RECONCILED_HEAD = '3d720bde896ad870a9bf43ae61ddfa58f18d17e3';

const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';
const TARGET_BRANCH = 'com/com-001-baseline-audit';
const TARGET_PR = 61;
const TARGET_STAGING_PROJECT = 'zwkczgewzbsorbrjuzpb';

const AUTHORIZATION_RECEIPT_PATH = 'config/com-b03c-r5b-r5a-fresh-authorization-consumption.json';
const AUTHORIZATION_RECEIPT_BLOB = 'a2ed29dc6a44f9d62f5159dfeabd2c769f677b50';
const AUTHORIZATION_RECEIPT_ID = '7f83ad580442b634912f776745f25ec2de7d935ed93a6c3f5c0b622e561f3551';
const CORRECTED_BRIDGE_PATH = 'scripts/build-com-b03c-r4z-corrected-terminal-realtime-bridge.js';
const CORRECTED_BRIDGE_BLOB = 'ff083f29e43b2f85045b23bf8f12a4b354fb0005';
const CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT = '29fbba28d1982dc4a4184afca367732e31c84cf95ffe0ccc89d6cc548fd1ee9f';
const FUTURE_TRIGGER_PATH = 'config/com-b03c-r5c-single-use-corrected-terminal-observation-trigger.json';

const ENVELOPE_KIND = 'r5d_repository_corrected_terminal_observation_execution_envelope';
const REPORT_SCHEMA = 'com-b03c-r5d-corrected-terminal-observation-report-v1';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R5D_REMOTE_EXECUTION_NOT_AUTHORIZED';

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}
function isSha(value) { return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value); }
function blocked(reason, extra = {}) {
  return freeze({contractId:CONTRACT_ID,validationId:VALIDATION_ID,decision:'blocked_repository_only',reason,executionEnvelopeReady:false,triggerCreationAuthority:false,remoteExecutionAuthority:false,remoteCredentialReadAuthority:false,remoteDependencyLoadAuthority:false,networkAuthority:false,stagingReadAuthority:false,stagingMutationAuthority:false,realtimeSubscriptionAuthority:false,authIdentityLifecycleAuthority:false,runtimeChangeAuthority:false,productionAuthority:false,pullRequestMergeAuthority:false,exactRootCauseProven:false,causalPromotionAllowed:false,...extra});
}
function assertRemoteExecutionBoundaryAbsent() { const error = new Error(REMOTE_EXECUTION_BLOCK_CODE); error.code = REMOTE_EXECUTION_BLOCK_CODE; throw error; }
function assertFrozenReceipt(receipt = {}) {
  const result = r5c.validateConsumedAuthorizationReceipt({
    receipt,
    receiptBlob: AUTHORIZATION_RECEIPT_BLOB
  });
  return result.decision === 'r5c_consumed_authorization_receipt_valid_repository_only' &&
    result.authorizationReceiptId === AUTHORIZATION_RECEIPT_ID &&
    result.receiptBlob === AUTHORIZATION_RECEIPT_BLOB &&
    result.authorizationConsumed === true &&
    result.authorizationReusable === false &&
    result.reusableAfterFailure === false &&
    result.triggerCreated === false &&
    result.triggerCreationAuthority === false &&
    result.remoteExecutionAuthority === false;
}
function evaluateRepositoryReadiness(input = {}) {
  if (input.r5cCertifiedHead !== R5C_CERTIFIED_HEAD || input.r5cCertificationRun !== R5C_CERTIFICATION_RUN || input.r5cCertificationJob !== R5C_CERTIFICATION_JOB || input.r5cCertificationSuccess !== true || input.canonicalReconciledHead !== CANONICAL_RECONCILED_HEAD) return blocked('R5D_CERTIFIED_R5C_AND_RECONCILED_HEAD_REQUIRED');
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY || input.productionGate !== REQUIRED_PRODUCTION_GATE) return blocked('R5D_CANONICAL_MATRIX_STATE_REQUIRED');
  if (input.targetBranch !== TARGET_BRANCH || input.targetPr !== TARGET_PR || input.targetStagingProject !== TARGET_STAGING_PROJECT) return blocked('R5D_TARGET_CONTINUITY_REQUIRED');
  if (!assertFrozenReceipt(input.authorizationReceipt)) return blocked('R5D_FROZEN_CONSUMED_AUTHORIZATION_RECEIPT_REQUIRED');
  if (input.authorizationReceiptPath !== AUTHORIZATION_RECEIPT_PATH || input.authorizationReceiptBlob !== AUTHORIZATION_RECEIPT_BLOB || input.correctedBridgePath !== CORRECTED_BRIDGE_PATH || input.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB || input.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT) return blocked('R5D_FROZEN_RECEIPT_AND_CORRECTED_BRIDGE_BINDING_REQUIRED');
  if (input.futureTriggerPath !== FUTURE_TRIGGER_PATH || input.futureTriggerExists !== false || input.futureTriggerPrepared !== false || input.separateTriggerBoundaryRequired !== true) return blocked('R5D_TRIGGER_MUST_REMAIN_ABSENT');
  for (const flag of ['r5cHeadBoundEnvelope','receiptBoundEnvelope','correctedBridgeBoundEnvelope','correctedBridgeSemanticsBoundEnvelope','terminalStatusPreserved','sanitizedJoinClassificationRequired','singleSyntheticIdentityRequired','freshRealtimeClientRequired','privatePresenceOnlyChannelRequired','uniqueTopicRequired','cleanupRequiredAfterFutureExecution','zeroResidueRequiredForSuccessfulFutureExecution','rawRemoteErrorForbidden','runAttemptOneRequired','singleFileTriggerRequired','triggerParentContinuityRequired','noCausalPromotionFromTerminalStatusAlone']) if (input[flag] !== true) return blocked('R5D_EXECUTION_ENVELOPE_CONTROL_REQUIRED',{flag});
  for (const flag of ['remoteCredentialReadPreparedNow','remoteDependencyLoadPreparedNow','networkPreparedNow','stagingReadPreparedNow','stagingMutationPreparedNow','realtimeSubscriptionPreparedNow','authIdentityLifecyclePreparedNow','runtimeChangePreparedNow','productionPreparedNow','mergePreparedNow']) if (input[flag] !== false) return blocked('R5D_REMOTE_SCOPE_PROHIBITED',{flag});
  return freeze({contractId:CONTRACT_ID,validationId:VALIDATION_ID,decision:STATUS,status:STATUS,envelopeKind:ENVELOPE_KIND,reportSchema:REPORT_SCHEMA,r5cCertifiedHead:R5C_CERTIFIED_HEAD,canonicalReconciledHead:CANONICAL_RECONCILED_HEAD,authorizationReceiptId:AUTHORIZATION_RECEIPT_ID,authorizationReceiptBlob:AUTHORIZATION_RECEIPT_BLOB,correctedBridgeBlob:CORRECTED_BRIDGE_BLOB,correctedBridgeSemanticsFingerprint:CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,futureTriggerPath:FUTURE_TRIGGER_PATH,executionEnvelopeReady:true,authorizationConsumed:true,authorizationReusable:false,executionAttempted:false,futureTriggerExists:false,triggerCreationAuthority:false,remoteExecutionAuthority:false,remoteCredentialReadAuthority:false,remoteDependencyLoadAuthority:false,networkAuthority:false,stagingReadAuthority:false,stagingMutationAuthority:false,realtimeSubscriptionAuthority:false,authIdentityLifecycleAuthority:false,runtimeChangeAuthority:false,productionAuthority:false,pullRequestMergeAuthority:false,rawRemoteErrorExposed:false,exactRootCauseProven:false,causalPromotionAllowed:false,nextBoundaryRequirement:'Certify the exact R5D execution-envelope head. Any later trigger must be a separate single-file commit bound to that R5D head, the certified R5C head, frozen R5B receipt and corrected R4Z bridge. Staging execution remains separately gated.'});
}
function buildFutureTriggerDescriptor({workflowInstallHead,nonce}={}) {
  if (!isSha(workflowInstallHead)) throw new TypeError('R5D_WORKFLOW_INSTALL_HEAD_REQUIRED');
  if (typeof nonce !== 'string' || !/^[a-z0-9][a-z0-9_-]{7,63}$/.test(nonce)) throw new TypeError('R5D_TRIGGER_NONCE_REQUIRED');
  return freeze({contractId:CONTRACT_ID,validationId:VALIDATION_ID,envelopeKind:ENVELOPE_KIND,workflowInstallHead,r5cCertifiedHead:R5C_CERTIFIED_HEAD,authorizationReceiptId:AUTHORIZATION_RECEIPT_ID,authorizationReceiptBlob:AUTHORIZATION_RECEIPT_BLOB,correctedBridgePath:CORRECTED_BRIDGE_PATH,correctedBridgeBlob:CORRECTED_BRIDGE_BLOB,correctedBridgeSemanticsFingerprint:CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,targetBranch:TARGET_BRANCH,targetPr:TARGET_PR,targetStagingProject:TARGET_STAGING_PROJECT,expectedRunAttempt:1,changedFiles:[FUTURE_TRIGGER_PATH],nonce,singleUse:true,reusableAfterFailure:false,rawAuthorizationPhrasePersisted:false,rawRemoteErrorExposed:false});
}
function validateFutureTriggerCommit({trigger,parentHead,changedFiles,runAttempt,authorizationReceipt}={}) {
  if (!assertFrozenReceipt(authorizationReceipt)) return blocked('R5D_CONSUMED_RECEIPT_CONTINUITY_REQUIRED');
  if (!trigger || trigger.contractId !== CONTRACT_ID || trigger.validationId !== VALIDATION_ID || trigger.envelopeKind !== ENVELOPE_KIND) return blocked('R5D_TRIGGER_DESCRIPTOR_REQUIRED');
  if (!isSha(trigger.workflowInstallHead) || parentHead !== trigger.workflowInstallHead) return blocked('R5D_TRIGGER_PARENT_CONTINUITY_REQUIRED');
  if (trigger.r5cCertifiedHead !== R5C_CERTIFIED_HEAD || trigger.authorizationReceiptId !== AUTHORIZATION_RECEIPT_ID || trigger.authorizationReceiptBlob !== AUTHORIZATION_RECEIPT_BLOB || trigger.correctedBridgePath !== CORRECTED_BRIDGE_PATH || trigger.correctedBridgeBlob !== CORRECTED_BRIDGE_BLOB || trigger.correctedBridgeSemanticsFingerprint !== CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT) return blocked('R5D_TRIGGER_FROZEN_BINDING_REQUIRED');
  if (trigger.targetBranch !== TARGET_BRANCH || trigger.targetPr !== TARGET_PR || trigger.targetStagingProject !== TARGET_STAGING_PROJECT) return blocked('R5D_TRIGGER_TARGET_CONTINUITY_REQUIRED');
  if (runAttempt !== 1 || trigger.expectedRunAttempt !== 1 || trigger.singleUse !== true || trigger.reusableAfterFailure !== false) return blocked('R5D_SINGLE_USE_RUN_ATTEMPT_REQUIRED');
  if (!exactArray(changedFiles,[FUTURE_TRIGGER_PATH]) || !exactArray(trigger.changedFiles,[FUTURE_TRIGGER_PATH])) return blocked('R5D_EXACT_SINGLE_FILE_TRIGGER_REQUIRED');
  if (trigger.rawAuthorizationPhrasePersisted !== false || trigger.rawRemoteErrorExposed !== false) return blocked('R5D_SANITIZED_TRIGGER_REQUIRED');
  return freeze({contractId:CONTRACT_ID,validationId:VALIDATION_ID,decision:'r5d_future_trigger_continuity_valid_repository_only',executionEnvelopeReady:true,triggerContinuityValid:true,authorizationReceiptId:AUTHORIZATION_RECEIPT_ID,runAttempt:1,triggerCreationAuthority:false,remoteExecutionAuthority:false,stagingReadAuthority:false,stagingMutationAuthority:false,rawRemoteErrorExposed:false,exactRootCauseProven:false,causalPromotionAllowed:false});
}
module.exports = freeze({CONTRACT_ID,VALIDATION_ID,STATUS,R5C_CERTIFIED_HEAD,R5C_CERTIFICATION_RUN,R5C_CERTIFICATION_JOB,CANONICAL_RECONCILED_HEAD,MATRIX_VERSION,REQUIRED_MATURITY,REQUIRED_PRODUCTION_GATE,TARGET_BRANCH,TARGET_PR,TARGET_STAGING_PROJECT,AUTHORIZATION_RECEIPT_PATH,AUTHORIZATION_RECEIPT_BLOB,AUTHORIZATION_RECEIPT_ID,CORRECTED_BRIDGE_PATH,CORRECTED_BRIDGE_BLOB,CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,FUTURE_TRIGGER_PATH,ENVELOPE_KIND,REPORT_SCHEMA,REMOTE_EXECUTION_BLOCK_CODE,assertFrozenReceipt,evaluateRepositoryReadiness,buildFutureTriggerDescriptor,validateFutureTriggerCommit,assertRemoteExecutionBoundaryAbsent});
