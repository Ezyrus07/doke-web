'use strict';

const CONTRACT_ID = 'com-b03c-r3a-presence-full-conjunction-isolation-readiness-v1';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3-CORRECTED-REALTIME-AUTH-PREDICATE-LADDER-STAGING-ATTEMPT';
const PREDECESSOR_STATUS = 'staging_diagnostic_completed_full_conjunction_presence_read_rejected_zero_residue_proven';
const FAILURE_CLASS = 'full_conjunction_presence_read_rls_rejection';
const ISOLATION_CASES = Object.freeze([
  'control_true',
  'uid_topic_direct',
  'uid_extension_eq',
  'topic_extension_direct',
  'full_current_direct',
  'full_topic_select_wrapper',
  'full_topic_select_extension_in',
  'full_docs_canonical_exists'
]);

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
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
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
  const actual = [...new Set(value.map(String))];
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('COM_B03C_R3_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('COM_B03C_R3_DIAGNOSTIC_STATUS_REQUIRED');
  if (input.r3AuthorizationConsumed !== true || input.r3AuthorizationReusable !== false) return blocked('COM_B03C_R3_SINGLE_USE_HISTORY_REQUIRED');
  if (input.r3PredicateConclusionValid !== true) return blocked('COM_B03C_R3_VALID_DIAGNOSTIC_REQUIRED');
  if (input.r3ZeroResidueProven !== true) return blocked('COM_B03C_R3_ZERO_RESIDUE_REQUIRED');
  if (input.typingFullConjunctionReadProven !== true || input.typingFullConjunctionWriteProven !== true) return blocked('COM_B03C_R3_TYPING_CONTROL_REQUIRED');
  if (input.presenceFullConjunctionReadProven !== false || input.presenceFullConjunctionWriteProven !== true) return blocked('COM_B03C_R3_PRESENCE_SPLIT_RESULT_REQUIRED');
  if (input.observedFailureClass !== FAILURE_CLASS) return blocked('COM_B03C_R3_FAILURE_CLASS_REQUIRED');
  if (input.exactCombinedPredicateCauseIsolated !== false) return blocked('COM_B03C_R3_CAUSE_MUST_REMAIN_UNRESOLVED');
  if (!exactStringArray(input.isolationCases, ISOLATION_CASES)) return blocked('EXACT_ISOLATION_CASE_MATRIX_REQUIRED');
  if (input.presenceOnly !== true || input.readJoinOnly !== true) return blocked('PRESENCE_READ_JOIN_ONLY_REQUIRED');
  if (input.sameAuthIdentityAcrossCases !== true || input.sameTopicAcrossCases !== true) return blocked('SAME_CONTEXT_CONTROL_REQUIRED');
  if (input.freshRealtimeClientPerCase !== true) return blocked('FRESH_CLIENT_PER_CASE_REQUIRED');
  if (input.insertControlPredicateTrue !== true || input.writeActionExecuted !== false) return blocked('READ_AXIS_CONTROL_REQUIRED');
  if (input.temporarySelectPolicyPerCase !== true || input.dropPolicyAfterEachCase !== true) return blocked('TEMPORARY_POLICY_LIFECYCLE_REQUIRED');
  if (input.policyIntrospectionPerCase !== true || input.negativeControlPrepared !== true) return blocked('POLICY_INTROSPECTION_AND_NEGATIVE_CONTROL_REQUIRED');
  if (input.sanitizedDiagnosticsPrepared !== true || input.rawRemoteErrorPersistenceAllowed === true) return blocked('SANITIZED_DIAGNOSTICS_REQUIRED');
  if (input.futureStagingAuthorizationDefined === true || input.triggerExists === true || input.stagingExecutorExists === true || input.stagingWorkflowExists === true) return blocked('STAGING_EXECUTION_BOUNDARY_NOT_YET_ALLOWED');
  if (input.communityPostsExecutionPlanned === true || input.channelMessagesExecutionPlanned === true || input.domainMutationPlanned === true || input.publicationMutationPlanned === true || input.runtimeDeployPlanned === true || input.productionPlanned === true || input.mergePlanned === true) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED');

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_presence_full_conjunction_isolation_ready_no_staging_authority',
    reason: null,
    isolationCases: ISOLATION_CASES,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false,
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
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  FAILURE_CLASS,
  ISOLATION_CASES,
  evaluateRepositoryReadiness
});
