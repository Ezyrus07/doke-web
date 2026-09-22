'use strict';

const CONTRACT_ID = 'com-b03c-r3i-realtime-authorization-evaluation-context-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3H-SINGLE-USE-STAGING-DIAGNOSTIC-READINESS';
const PREDECESSOR_STATUS = 'staging_execution_completed_authorization_consumed_zero_residue_repository_followup_required';
const PREDECESSOR_EVIDENCE_HEAD = 'ea49d5ff7feb3eddc7417a03568e873cf0f7772e';
const PREDECESSOR_RECERT_RUN = 31343483545;
const PREDECESSOR_RECERT_JOB = 93321203834;
const UPSTREAM_REPOSITORY = 'supabase/realtime';
const UPSTREAM_COMMIT = '744c6d60f000f721c3942b6df0e7601f54a3b69d';
const UPSTREAM_SOURCE_PATHS = Object.freeze([
  'lib/realtime/tenants/authorization.ex',
  'lib/realtime/api/message.ex',
  'test/support/generators.ex',
  'test/integration/rt_channel/presence_test.exs'
]);

const CASES = Object.freeze([
  ['control_true', 'baseline', 'true'],
  ['extension_direct', 'row', "realtime.messages.extension = 'presence'"],
  ['uid_helper_direct', 'helper', "(select auth.uid()) = '<uid>'::uuid"],
  ['topic_helper_direct', 'helper', "realtime.topic() = '<topic>'"],
  ['row_topic_direct', 'row', "realtime.messages.topic = '<topic>'"],
  ['row_topic_extension', 'row_pair', "realtime.messages.topic = '<topic>' AND realtime.messages.extension = 'presence'"],
  ['raw_topic_setting_extension', 'raw_session_plus_row', "current_setting('realtime.topic', true) = '<topic>' AND realtime.messages.extension = 'presence'"],
  ['topic_helper_extension', 'helper_plus_row', "realtime.topic() = '<topic>' AND realtime.messages.extension = 'presence'"],
  ['raw_sub_setting_extension', 'raw_session_plus_row', "nullif(current_setting('request.jwt.claim.sub', true), '')::uuid = '<uid>'::uuid AND realtime.messages.extension = 'presence'"],
  ['claims_json_sub_extension', 'raw_claims_plus_row', "((current_setting('request.jwt.claims', true))::jsonb ->> 'sub')::uuid = '<uid>'::uuid AND realtime.messages.extension = 'presence'"],
  ['uid_helper_extension', 'helper_plus_row', "(select auth.uid()) = '<uid>'::uuid AND realtime.messages.extension = 'presence'"],
  ['upstream_exact_full', 'upstream_parity', "realtime.topic() = '<topic>' AND realtime.messages.extension = 'presence' AND ((SELECT auth.uid())::text) = '<uid>'"],
  ['raw_settings_full', 'raw_session_full', "current_setting('realtime.topic', true) = '<topic>' AND realtime.messages.extension = 'presence' AND nullif(current_setting('request.jwt.claim.sub', true), '')::uuid = '<uid>'::uuid"],
  ['row_topic_uid_extension', 'row_plus_helper', "realtime.messages.topic = '<topic>' AND realtime.messages.extension = 'presence' AND (select auth.uid()) = '<uid>'::uuid"],
  ['case_barrier_full', 'planner_barrier', "CASE WHEN realtime.messages.extension = 'presence' THEN (realtime.topic() = '<topic>' AND (select auth.uid()) = '<uid>'::uuid) ELSE false END"],
  ['exists_barrier_full', 'planner_barrier', "realtime.messages.extension = 'presence' AND EXISTS (SELECT 1 WHERE realtime.topic() = '<topic>' AND (select auth.uid()) = '<uid>'::uuid)"],
]);

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
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3H_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3H_CLOSED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3H_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) {
    return blocked('R3H_CLOSURE_RECERT_REQUIRED');
  }
  if (input.predecessorAuthorizationConsumed !== true || input.predecessorAuthorizationReusable !== false || input.predecessorTriggerAbsent !== true || input.predecessorZeroResidueProven !== true) {
    return blocked('R3H_SINGLE_USE_CLOSURE_REQUIRED');
  }
  if (input.upstreamRepository !== UPSTREAM_REPOSITORY || input.upstreamCommit !== UPSTREAM_COMMIT) return blocked('PINNED_UPSTREAM_SOURCE_REQUIRED');
  if (!exactArray(input.upstreamSourcePaths, [...UPSTREAM_SOURCE_PATHS])) return blocked('UPSTREAM_SOURCE_SET_REQUIRED');
  if (!exactArray(input.caseIds, CASES.map(([id]) => id))) return blocked('EXACT_DIFFERENTIAL_CASE_MATRIX_REQUIRED');

  const required = [
    'readAuthorizationInsertBeforeSessionConfigObserved',
    'readAuthorizationSessionConfigBeforeSelectObserved',
    'topicAndJwtSessionSettingsObserved',
    'presenceMessageRowMaterializationObserved',
    'upstreamPresenceTopicUidPolicyObserved',
    'upstreamPresenceTopicUidIntegrationTestObserved',
    'rowVsRawSettingVsHelperDifferentialRequired',
    'plannerBarrierDifferentialRequired',
    'sameIdentityTokenTopicFutureRequirementRecorded',
    'fullCaseTimeCatalogEvidenceFutureRequirementRecorded',
    'noCausalPromotionWithoutDifferentialEvidence',
    'noRuntimePolicyChangePrepared',
    'noRemoteExecutorPrepared',
    'noTriggerPrepared',
    'noAuthorizationPhraseDefined',
    'noStagingEnvironmentJobPrepared',
    'noProductionPrepared',
    'noMergePrepared'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3I_READINESS_CONTROL_REQUIRED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_realtime_authorization_evaluation_context_differential_ready_no_remote_authority',
    reason: null,
    upstream: {
      repository: UPSTREAM_REPOSITORY,
      commit: UPSTREAM_COMMIT,
      sourcePaths: UPSTREAM_SOURCE_PATHS
    },
    cases: CASES.map(([id, surface, predicate]) => ({ id, surface, predicate })),
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryReadinessAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  UPSTREAM_REPOSITORY,
  UPSTREAM_COMMIT,
  UPSTREAM_SOURCE_PATHS,
  CASES,
  evaluateRepositoryReadiness
});
