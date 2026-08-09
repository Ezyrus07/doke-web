'use strict';

const CONTRACT_ID = 'com-b03c-r3a-presence-full-conjunction-isolation-readiness-v1';
const TRIGGER_CONTRACT_ID = 'com-b03c-r3a-presence-full-conjunction-isolation-staging-trigger-v1';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_SUPABASE_JS_VERSION = '2.112.2';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3A_PRESENCE_FULL_CONJUNCTION_ISOLATION_CANARY_ON_DOKE_STAGING';
const TRIGGER_PATH = 'config/com-b03c-r3a-presence-full-conjunction-isolation-staging-trigger.json';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3-CORRECTED-REALTIME-AUTH-PREDICATE-LADDER-STAGING-ATTEMPT';
const PREDECESSOR_STATUS = 'staging_diagnostic_completed_full_conjunction_presence_read_rejected_zero_residue_proven';
const FAILURE_CLASS = 'full_conjunction_presence_read_rls_rejection';
const ALLOWED_SCOPE = Object.freeze(['channel_presence']);
const DIAGNOSTIC_AXES = Object.freeze(['read_join']);
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
const POLICY_PREFIX = 'com_b03c_r3a_';
const AUTH_EMAIL_PREFIX = 'com-b03c-r3a-';
const AUTH_EMAIL_SUFFIX = '@doke.local';
const AUTH_USER_PURPOSE = 'presence-full-conjunction-isolation-r3a';

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
    ephemeralRealtimeActionAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    persistentResidueAuthority: false,
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

function validatePredecessor(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return 'COM_B03C_R3_EVIDENCE_REQUIRED';
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return 'COM_B03C_R3_DIAGNOSTIC_STATUS_REQUIRED';
  if (input.r3AuthorizationConsumed !== true || input.r3AuthorizationReusable !== false) return 'COM_B03C_R3_SINGLE_USE_HISTORY_REQUIRED';
  if (input.r3PredicateConclusionValid !== true) return 'COM_B03C_R3_VALID_DIAGNOSTIC_REQUIRED';
  if (input.r3ZeroResidueProven !== true) return 'COM_B03C_R3_ZERO_RESIDUE_REQUIRED';
  if (input.typingFullConjunctionReadProven !== true || input.typingFullConjunctionWriteProven !== true) return 'COM_B03C_R3_TYPING_CONTROL_REQUIRED';
  if (input.presenceFullConjunctionReadProven !== false || input.presenceFullConjunctionWriteProven !== true) return 'COM_B03C_R3_PRESENCE_SPLIT_RESULT_REQUIRED';
  if (input.observedFailureClass !== FAILURE_CLASS) return 'COM_B03C_R3_FAILURE_CLASS_REQUIRED';
  if (input.exactCombinedPredicateCauseIsolated !== false) return 'COM_B03C_R3_CAUSE_MUST_REMAIN_UNRESOLVED';
  return null;
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildTerms({ userId, topic }) {
  const uid = `(select auth.uid()) = ${sqlLiteral(userId)}::uuid`;
  const topicDirect = `realtime.topic() = ${sqlLiteral(topic)}`;
  const topicSelect = `(select realtime.topic()) = ${sqlLiteral(topic)}`;
  const extensionEq = `realtime.messages.extension = 'presence'`;
  const extensionIn = `realtime.messages.extension in ('presence')`;
  return { uid, topicDirect, topicSelect, extensionEq, extensionIn };
}

function buildPredicate(caseId, context) {
  if (!ISOLATION_CASES.includes(caseId)) {
    const error = new Error('DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE');
    error.code = 'DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE';
    throw error;
  }
  const t = buildTerms(context);
  switch (caseId) {
    case 'control_true': return 'true';
    case 'uid_topic_direct': return `${t.uid} and ${t.topicDirect}`;
    case 'uid_extension_eq': return `${t.uid} and ${t.extensionEq}`;
    case 'topic_extension_direct': return `${t.topicDirect} and ${t.extensionEq}`;
    case 'full_current_direct': return `${t.uid} and ${t.topicDirect} and ${t.extensionEq}`;
    case 'full_topic_select_wrapper': return `${t.uid} and ${t.topicSelect} and ${t.extensionEq}`;
    case 'full_topic_select_extension_in': return `${t.uid} and ${t.topicSelect} and ${t.extensionIn}`;
    case 'full_docs_canonical_exists':
      return `exists (select 1 where ${t.uid} and ${t.topicSelect} and ${t.extensionIn})`;
    default: throw new Error('DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE');
  }
}

function buildIsolationPlan({ userId, topic }) {
  if (!userId || !topic) {
    const error = new Error('DOKE_COM_B03C_R3A_PLAN_CONTEXT_REQUIRED');
    error.code = 'DOKE_COM_B03C_R3A_PLAN_CONTEXT_REQUIRED';
    throw error;
  }
  return ISOLATION_CASES.map((caseId, index) => ({
    index,
    caseId,
    transport: 'channel_presence',
    axis: 'read_join',
    sameTopicRequired: true,
    freshRealtimeClientRequired: true,
    selectPredicate: buildPredicate(caseId, { userId, topic }),
    insertControlPredicate: 'true',
    writeActionAllowed: false
  }));
}

function evaluateRepositoryReadiness(input = {}) {
  const predecessorFailure = validatePredecessor(input);
  if (predecessorFailure) return blocked(predecessorFailure);
  if (!exactStringArray(input.isolationCases, ISOLATION_CASES)) return blocked('EXACT_ISOLATION_CASE_MATRIX_REQUIRED');
  if (input.presenceOnly !== true || input.readJoinOnly !== true) return blocked('PRESENCE_READ_JOIN_ONLY_REQUIRED');
  if (input.sameAuthIdentityAcrossCases !== true || input.sameTopicAcrossCases !== true) return blocked('SAME_CONTEXT_CONTROL_REQUIRED');
  if (input.freshRealtimeClientPerCase !== true) return blocked('FRESH_CLIENT_PER_CASE_REQUIRED');
  if (input.insertControlPredicateTrue !== true || input.writeActionExecuted !== false) return blocked('READ_AXIS_CONTROL_REQUIRED');
  if (input.temporarySelectPolicyPerCase !== true || input.dropPolicyAfterEachCase !== true) return blocked('TEMPORARY_POLICY_LIFECYCLE_REQUIRED');
  if (input.policyIntrospectionPerCase !== true || input.negativeControlPrepared !== true) return blocked('POLICY_INTROSPECTION_AND_NEGATIVE_CONTROL_REQUIRED');
  if (input.sanitizedDiagnosticsPrepared !== true || input.rawRemoteErrorPersistenceAllowed === true) return blocked('SANITIZED_DIAGNOSTICS_REQUIRED');
  if (input.communityPostsExecutionPlanned === true || input.channelMessagesExecutionPlanned === true || input.domainMutationPlanned === true ||
      input.publicationMutationPlanned === true || input.runtimeDeployPlanned === true || input.productionPlanned === true || input.mergePlanned === true) {
    return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED');
  }
  return freeze({ contractId: CONTRACT_ID, decision: 'repository_presence_full_conjunction_isolation_ready', reason: null, isolationCases: ISOLATION_CASES,
    repositoryReadinessAuthority: true, stagingReadAuthority: false, stagingMutationAuthority: false, authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false, realtimeSubscriptionAuthority: false, domainMutationAuthority: false, publicationMutationAuthority: false,
    runtimeDeployAuthority: false, productionAuthority: false, pullRequestMergeAuthority: false });
}

function evaluateStagingReadiness(input = {}) {
  const predecessorFailure = validatePredecessor(input);
  if (predecessorFailure) return blocked(predecessorFailure);
  if (!exactStringArray(input.isolationCases, ISOLATION_CASES)) return blocked('EXACT_ISOLATION_CASE_MATRIX_REQUIRED');
  for (const key of ['sameAuthIdentityAcrossCasesPrepared','sameAccessTokenAcrossCasesPrepared','sameTopicAcrossCasesPrepared','freshRealtimeClientPerCasePrepared',
    'jwtBeforeChannelCreationPrepared','presenceOnlyPrepared','readJoinOnlyPrepared','negativeControlPrepared','temporaryPolicyLifecyclePrepared',
    'policyIntrospectionPrepared','perCaseCleanupPrepared','outerCleanupFallbackPrepared','globalPolicyTrackingPrepared','postExecutionZeroResidueVerificationPrepared',
    'sanitizedDiagnosticsPrepared','reportAlwaysWrittenPrepared','artifactAlwaysUploadedPrepared','stagingExecutorPrepared','stagingVerifierPrepared','stagingWorkflowPrepared',
    'singleUseTriggerBoundaryPrepared']) {
    if (input[key] !== true) return blocked('COM_B03C_R3A_STAGING_READINESS_FLAG_MISSING', { flag: key });
  }
  if (input.requiredAuthorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('COM_B03C_R3A_AUTHORIZATION_PHRASE_MISMATCH');
  if (input.triggerPath !== TRIGGER_PATH || input.triggerExists !== false) return blocked('COM_B03C_R3A_TRIGGER_MUST_BE_ABSENT_AT_READINESS');
  if (input.rawRemoteErrorPersistenceAllowed === true) return blocked('SANITIZED_DIAGNOSTICS_REQUIRED');
  for (const key of ['communityPostsExecutionPlanned','channelMessagesExecutionPlanned','domainMutationPlanned','publicationMutationPlanned','persistentResiduePlanned',
    'runtimeDeployPlanned','productionPlanned','mergePlanned','realUserMutationPlanned']) {
    if (input[key] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag: key });
  }
  return freeze({ contractId: CONTRACT_ID, decision: 'repository_presence_full_conjunction_isolation_staging_ready_new_authorization_required', reason: null,
    requiredAuthorizationPhrase: REQUIRED_AUTHORIZATION_PHRASE, triggerPath: TRIGGER_PATH, isolationCases: ISOLATION_CASES,
    repositoryReadinessAuthority: true, stagingReadAuthority: false, stagingMutationAuthority: false, authIdentityLifecycleAuthority: false,
    realtimePolicyLifecycleAuthority: false, realtimeSubscriptionAuthority: false, ephemeralRealtimeActionAuthority: false, domainMutationAuthority: false,
    publicationMutationAuthority: false, persistentResidueAuthority: false, runtimeDeployAuthority: false, productionAuthority: false, pullRequestMergeAuthority: false });
}

function evaluateStagingAuthorization(input = {}) {
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_COM_B03C_R3A_STAGING_AUTHORIZATION_REQUIRED');
  if (input.targetEnvironment !== 'staging' || input.projectId !== REQUIRED_PROJECT_ID) return blocked('STAGING_TARGET_MISMATCH');
  if (input.branch !== REQUIRED_BRANCH || input.pullRequest !== REQUIRED_PULL_REQUEST) return blocked('PULL_REQUEST_BOUNDARY_MISMATCH');
  if (input.authorizationConsumed === true || input.executionAttempted === true) return blocked('SINGLE_USE_AUTHORIZATION_ALREADY_CONSUMED');
  if (input.predecessorAuthorizationReusable !== false) return blocked('PREDECESSOR_AUTHORIZATION_REUSE_PROHIBITED');
  if (!exactStringArray(input.scope, ALLOWED_SCOPE)) return blocked('COM_B03C_R3A_SCOPE_MISMATCH');
  if (!exactStringArray(input.diagnosticAxes, DIAGNOSTIC_AXES)) return blocked('COM_B03C_R3A_AXIS_MISMATCH');
  if (!exactStringArray(input.isolationCases, ISOLATION_CASES)) return blocked('COM_B03C_R3A_ISOLATION_CASE_MISMATCH');
  for (const key of ['ephemeralAuthIdentityLifecycleAllowed','authIdentityCleanupRequired','realtimeMessagesPolicyLifecycleAllowed','realtimePolicyCleanupRequired',
    'policyIntrospectionPerCaseRequired','sameAuthIdentityAcrossCasesRequired','sameAccessTokenAcrossCasesRequired','sameTopicAcrossCasesRequired',
    'freshRealtimeClientPerCaseRequired','negativeControlRequired','sanitizedDiagnosticsRequired','jwtBeforeChannelCreationRequired','presenceOnlyRequired',
    'readJoinOnlyRequired','perCaseCleanupRequired','outerCleanupFallbackRequired','globalPolicyTrackingRequired','postExecutionZeroResidueVerificationRequired','reportAlwaysWrittenRequired']) {
    if (input[key] !== true) return blocked('COM_B03C_R3A_REQUIRED_FLAG_MISSING', { flag: key });
  }
  for (const key of ['writeActionAllowed','communityPostsExecutionAllowed','channelMessagesExecutionAllowed','domainMutationAllowed','publicationMutationAllowed',
    'persistentResidueAllowed','runtimeDeployAllowed','productionAllowed','mergeAllowed','realUserMutationAllowed']) {
    if (input[key] !== false) return blocked('COM_B03C_R3A_PROHIBITED_FLAG_ENABLED', { flag: key });
  }
  return freeze({ contractId: CONTRACT_ID, decision: 'authorized_for_single_bounded_presence_full_conjunction_isolation_canary', reason: null,
    projectId: REQUIRED_PROJECT_ID, branch: REQUIRED_BRANCH, pullRequest: REQUIRED_PULL_REQUEST, scope: ALLOWED_SCOPE, diagnosticAxes: DIAGNOSTIC_AXES,
    isolationCases: ISOLATION_CASES, stagingReadAuthority: true, stagingMutationAuthority: true, authIdentityLifecycleAuthority: true,
    realtimePolicyLifecycleAuthority: true, realtimeSubscriptionAuthority: true, ephemeralRealtimeActionAuthority: false, domainMutationAuthority: false,
    publicationMutationAuthority: false, persistentResidueAuthority: false, runtimeDeployAuthority: false, productionAuthority: false,
    pullRequestMergeAuthority: false, singleUse: true, reusableAfterFailure: false });
}

module.exports = freeze({ CONTRACT_ID, TRIGGER_CONTRACT_ID, REQUIRED_PROJECT_ID, REQUIRED_BRANCH, REQUIRED_PULL_REQUEST, REQUIRED_SUPABASE_JS_VERSION,
  REQUIRED_AUTHORIZATION_PHRASE, TRIGGER_PATH, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, FAILURE_CLASS, ALLOWED_SCOPE, DIAGNOSTIC_AXES,
  ISOLATION_CASES, POLICY_PREFIX, AUTH_EMAIL_PREFIX, AUTH_EMAIL_SUFFIX, AUTH_USER_PURPOSE, sqlLiteral, buildTerms, buildPredicate, buildIsolationPlan,
  evaluateRepositoryReadiness, evaluateStagingReadiness, evaluateStagingAuthorization });
