'use strict';

const r3b = require('./community-realtime-private-auth-r3b');

const CONTRACT_ID = 'com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-readiness-v1';
const TRIGGER_CONTRACT_ID = 'com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-trigger-v2';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3B-REALTIME-MESSAGES-POLICY-COMPOSITION-READINESS';
const PREDECESSOR_STATUS = 'repository_policy_composition_rca_complete_current_staging_inventory_unobserved';
const REPORT_VALIDATION_ID = 'COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING-ATTEMPT';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const PREVIOUS_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3C_READ_ONLY_REALTIME_MESSAGES_POLICY_CATALOG_INSPECTION_ON_DOKE_STAGING';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3C_ATTEMPT_2_READ_ONLY_REALTIME_MESSAGES_POLICY_CATALOG_INSPECTION_ON_DOKE_STAGING';
const TRIGGER_PATH = 'config/com-b03c-r3c-realtime-messages-policy-catalog-readonly-staging-trigger.json';
const REQUIRED_POLICY_COLUMNS = Object.freeze(['policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check']);
const REQUIRED_SCOPE = Object.freeze(['pg_policies:realtime.messages']);
const POLICY_INVENTORY_SQL = `select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'realtime'
  and tablename = 'messages'
order by policyname`;

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked',
    reason,
    repositoryReadinessAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactStringArray(value, expected) {
  if (!Array.isArray(value)) return false;
  return JSON.stringify(value.map(String)) === JSON.stringify(expected);
}

function validatePredecessor(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return 'COM_B03C_R3B_EVIDENCE_REQUIRED';
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return 'COM_B03C_R3B_STATUS_REQUIRED';
  if (input.repositoryAndHistoricalEvidenceExhausted !== true) return 'COM_B03C_R3B_REPOSITORY_HISTORY_EXHAUSTION_REQUIRED';
  if (input.currentStagingCatalogReconstructableFromRepositoryEvidence !== false) return 'COM_B03C_R3B_CURRENT_CATALOG_MUST_REMAIN_UNRESOLVED';
  if (input.remoteInventoryObserved !== false) return 'COM_B03C_R3B_REMOTE_INVENTORY_MUST_REMAIN_UNOBSERVED';
  if (input.exactRootCauseProven !== false) return 'COM_B03C_ROOT_CAUSE_MUST_REMAIN_UNPROVEN';
  if (input.predecessorCertificationStatus !== 'success') return 'COM_B03C_R3B_FINAL_CERTIFICATION_REQUIRED';
  return null;
}

function evaluateRepositoryReadiness(input = {}) {
  const predecessorFailure = validatePredecessor(input);
  if (predecessorFailure) return blocked(predecessorFailure);
  if (!exactStringArray(input.scope, REQUIRED_SCOPE)) return blocked('COM_B03C_R3C_SCOPE_MISMATCH');
  if (!exactStringArray(input.policyInventoryColumns, REQUIRED_POLICY_COLUMNS)) return blocked('COM_B03C_R3C_POLICY_COLUMNS_MISMATCH');
  for (const key of [
    'readOnlyCatalogInspectionPlanned',
    'transactionReadOnlyRequired',
    'completePolicyInventoryRequired',
    'restrictivePolicyDetectionRequired',
    'authenticatedSelectClassificationRequired',
    'sanitizedDiagnosticsRequired',
    'singleUseAuthorizationRequired',
    'noSyntheticIdentityRequired',
    'noRealtimeChannelRequired',
    'noPolicyMutationRequired',
    'noDomainMutationRequired',
    'noPublicationMutationRequired',
    'noRuntimeDeployRequired',
    'noProductionRequired',
    'noMergeRequired'
  ]) {
    if (input[key] !== true) return blocked('COM_B03C_R3C_REPOSITORY_READINESS_FLAG_MISSING', { flag: key });
  }
  for (const key of [
    'authorizationReceived',
    'authorizationConsumed',
    'executionAttempted',
    'triggerExists',
    'stagingAccessExecuted',
    'remoteMutationExecuted'
  ]) {
    if (input[key] !== false) return blocked('COM_B03C_R3C_PREAUTHORITY_STATE_REQUIRED', { flag: key });
  }
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_read_only_policy_catalog_staging_ready_new_authorization_required',
    reason: null,
    requiredAuthorizationPhrase: REQUIRED_AUTHORIZATION_PHRASE,
    triggerContractId: TRIGGER_CONTRACT_ID,
    triggerPath: TRIGGER_PATH,
    scope: REQUIRED_SCOPE,
    policyInventoryColumns: REQUIRED_POLICY_COLUMNS,
    policyInventorySql: POLICY_INVENTORY_SQL,
    exactRootCauseProven: false,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('COM_B03C_R3C_EXACT_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('COM_B03C_R3C_TARGET_NOT_STAGING');
  if (input.projectId !== REQUIRED_PROJECT_ID) return blocked('COM_B03C_R3C_PROJECT_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH) return blocked('COM_B03C_R3C_BRANCH_MISMATCH');
  if (input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('COM_B03C_R3C_PR_MISMATCH');
  if (input.authorizationConsumed !== false || input.executionAttempted !== false) return blocked('COM_B03C_R3C_SINGLE_USE_AUTH_ALREADY_SPENT');
  if (input.predecessorAuthorizationReusable !== false) return blocked('COM_B03C_R3C_PREDECESSOR_AUTH_REUSE_PROHIBITED');
  if (!exactStringArray(input.scope, REQUIRED_SCOPE)) return blocked('COM_B03C_R3C_SCOPE_MISMATCH');
  for (const key of [
    'catalogReadOnlyAllowed',
    'transactionReadOnlyRequired',
    'completePolicyInventoryRequired',
    'restrictivePolicyDetectionRequired',
    'authenticatedSelectClassificationRequired',
    'sanitizedDiagnosticsRequired',
    'noSyntheticIdentityRequired',
    'noRealtimeChannelRequired',
    'noPolicyMutationRequired',
    'noDomainMutationRequired',
    'noPublicationMutationRequired',
    'noRuntimeDeployRequired',
    'noProductionRequired',
    'noMergeRequired',
    'singleUse'
  ]) {
    if (input[key] !== true) return blocked('COM_B03C_R3C_AUTHORIZATION_FLAG_MISSING', { flag: key });
  }
  if (input.reusableAfterFailure !== false) return blocked('COM_B03C_R3C_AUTHORIZATION_MUST_NOT_BE_REUSABLE');
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_read_only_realtime_messages_policy_catalog_inspection',
    reason: null,
    scope: REQUIRED_SCOPE,
    exactRootCauseProven: false,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: true,
    stagingMutationAuthority: false,
    realtimePolicyMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

function classifyPolicyInventory(rows) {
  return r3b.classifyPolicyInventory(rows);
}

function normalizePolicyRow(row) {
  return r3b.normalizePolicyRow(row);
}

module.exports = freeze({
  CONTRACT_ID,
  TRIGGER_CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  REPORT_VALIDATION_ID,
  REQUIRED_PROJECT_ID,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  PREVIOUS_AUTHORIZATION_PHRASE,
  REQUIRED_AUTHORIZATION_PHRASE,
  TRIGGER_PATH,
  REQUIRED_POLICY_COLUMNS,
  REQUIRED_SCOPE,
  POLICY_INVENTORY_SQL,
  classifyPolicyInventory,
  normalizePolicyRow,
  evaluateRepositoryReadiness,
  evaluateStagingAuthorization
});
