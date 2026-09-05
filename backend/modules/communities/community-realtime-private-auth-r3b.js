'use strict';

const CONTRACT_ID = 'com-b03c-r3b-realtime-messages-policy-composition-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3A-PRESENCE-FULL-CONJUNCTION-ISOLATION-STAGING-ATTEMPT';
const PREDECESSOR_STATUS = 'staging_presence_extension_pairwise_interaction_rejection_observed_zero_residue_proven';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_POLICY_COLUMNS = Object.freeze(['policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check']);
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
    decision: 'blocked_repository_only',
    reason,
    repositoryReadinessAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
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
  const normalized = value.map(String);
  return JSON.stringify(normalized) === JSON.stringify(expected);
}

function normalizePermissive(value) {
  if (value === true || String(value).toUpperCase() === 'PERMISSIVE') return true;
  if (value === false || String(value).toUpperCase() === 'RESTRICTIVE') return false;
  const error = new Error('DOKE_COM_B03C_R3B_POLICY_PERMISSIVE_VALUE_INVALID');
  error.code = error.message;
  throw error;
}

function normalizeRoles(value) {
  if (Array.isArray(value)) return value.map(String).map((role) => role.trim()).filter(Boolean);
  const text = String(value || '').trim();
  if (!text) return [];
  return text.replace(/^\{|\}$/g, '').split(',').map((role) => role.replace(/^"|"$/g, '').trim()).filter(Boolean);
}

function normalizePolicyRow(row = {}) {
  for (const key of REQUIRED_POLICY_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      const error = new Error(`DOKE_COM_B03C_R3B_POLICY_COLUMN_MISSING_${key.toUpperCase()}`);
      error.code = error.message;
      throw error;
    }
  }
  return freeze({
    policyname: String(row.policyname),
    permissive: normalizePermissive(row.permissive),
    roles: normalizeRoles(row.roles),
    cmd: String(row.cmd || '').toUpperCase(),
    qual: row.qual == null ? null : String(row.qual),
    with_check: row.with_check == null ? null : String(row.with_check)
  });
}

function appliesToAuthenticated(policy) {
  return policy.roles.includes('authenticated') || policy.roles.includes('public') || policy.roles.includes('PUBLIC');
}

function classifyPolicyInventory(rows) {
  if (!Array.isArray(rows)) {
    const error = new Error('DOKE_COM_B03C_R3B_POLICY_INVENTORY_ARRAY_REQUIRED');
    error.code = error.message;
    throw error;
  }
  const policies = rows.map(normalizePolicyRow);
  const authenticatedSelectPolicies = policies.filter((policy) => policy.cmd === 'SELECT' && appliesToAuthenticated(policy));
  const restrictiveAuthenticatedSelectPolicies = authenticatedSelectPolicies.filter((policy) => policy.permissive === false);
  return freeze({
    policyCount: policies.length,
    authenticatedSelectPolicyCount: authenticatedSelectPolicies.length,
    restrictiveAuthenticatedSelectPolicyCount: restrictiveAuthenticatedSelectPolicies.length,
    restrictiveAuthenticatedSelectPresent: restrictiveAuthenticatedSelectPolicies.length > 0,
    restrictivePolicyNames: restrictiveAuthenticatedSelectPolicies.map((policy) => policy.policyname).sort(),
    exactRootCauseProven: false,
    remoteConfirmationRequiredBeforeRuntimeChange: true
  });
}

function validatePredecessor(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return 'COM_B03C_R3A_EVIDENCE_REQUIRED';
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return 'COM_B03C_R3A_STATUS_REQUIRED';
  if (input.r3aAuthorizationConsumed !== true || input.r3aAuthorizationReusable !== false) return 'COM_B03C_R3A_SINGLE_USE_HISTORY_REQUIRED';
  if (input.r3aZeroResidueProven !== true) return 'COM_B03C_R3A_ZERO_RESIDUE_REQUIRED';
  if (input.uidTopicDirectPasses !== true || input.uidExtensionPairRejected !== true || input.topicExtensionPairRejected !== true) return 'COM_B03C_R3A_PAIRWISE_RESULT_REQUIRED';
  if (input.allFullConjunctionVariantsRejected !== true) return 'COM_B03C_R3A_FULL_CONJUNCTION_RESULT_REQUIRED';
  if (input.exactRootCauseProven !== false) return 'COM_B03C_R3A_ROOT_CAUSE_MUST_REMAIN_UNPROVEN';
  return null;
}

function evaluateRepositoryReadiness(input = {}) {
  const predecessorFailure = validatePredecessor(input);
  if (predecessorFailure) return blocked(predecessorFailure);
  if (!exactStringArray(input.policyInventoryColumns, REQUIRED_POLICY_COLUMNS)) return blocked('COMPLETE_PG_POLICIES_COLUMN_SET_REQUIRED');
  for (const key of ['completePolicyInventoryRequired', 'restrictivePolicyDetectionRequired', 'authenticatedSelectScopeRequired', 'policyInventoryQueryFrozen', 'causalPromotionBlockedUntilInventoryObserved']) {
    if (input[key] !== true) return blocked('COM_B03C_R3B_REPOSITORY_READINESS_FLAG_MISSING', { flag: key });
  }
  for (const key of ['stagingReadPlanned', 'stagingMutationPlanned', 'triggerCreationPlanned', 'realtimePolicyMutationPlanned', 'realtimeSubscriptionPlanned', 'communityPostsExecutionPlanned', 'channelMessagesExecutionPlanned', 'domainMutationPlanned', 'publicationMutationPlanned', 'runtimeDeployPlanned', 'productionPlanned', 'mergePlanned', 'realUserMutationPlanned']) {
    if (input[key] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag: key });
  }
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_realtime_messages_policy_composition_rca_ready',
    reason: null,
    policyInventoryColumns: REQUIRED_POLICY_COLUMNS,
    policyInventorySql: POLICY_INVENTORY_SQL,
    exactRootCauseProven: false,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyMutationAuthority: false,
    realtimeSubscriptionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REQUIRED_POLICY_COLUMNS,
  POLICY_INVENTORY_SQL,
  normalizePermissive,
  normalizeRoles,
  normalizePolicyRow,
  classifyPolicyInventory,
  evaluateRepositoryReadiness
});
