'use strict';

const CONTRACT_ID = 'com-b03c-r3d-r3a-policy-materialization-evidence-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING-ATTEMPT';
const PREDECESSOR_STATUS = 'staging_read_only_policy_catalog_observed_no_mutation_performed';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const HISTORICAL_EXECUTOR_PATH = 'scripts/execute-com-b03c-r3a-presence-full-conjunction-isolation-staging-canary.js';
const REQUIRED_POLICY_SNAPSHOT_COLUMNS = Object.freeze(['policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check']);

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
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(value, expected) {
  return Array.isArray(value) && JSON.stringify(value.map(String)) === JSON.stringify(expected);
}

function validateHistoricalFacts(input = {}) {
  const requiredTrue = [
    'twoTemporaryPoliciesPerCase',
    'selectPredicateUnderTest',
    'insertControlTrue',
    'policyCreateTransactionCommittedBeforeSubscribe',
    'ownPolicyNamesInspectedBeforeSubscribe',
    'freshRealtimeClientPerCase',
    'presenceEnabled',
    'presenceListenerBeforeSubscribe',
    'ownPoliciesDroppedPerCaseFinally',
    'ownPolicyAbsenceVerifiedAfterDrop',
    'r3aZeroResidueProven',
    'r3cCurrentPersistentCatalogEmpty',
    'r3cRemoteMutationFalse',
    'supabaseAuthorizationCacheScopedToConnectionDocumented'
  ];
  for (const flag of requiredTrue) if (input[flag] !== true) return `HISTORICAL_FACT_REQUIRED:${flag}`;

  const requiredFalse = [
    'complexSelectQualExactMaterializationCaptured',
    'permissiveCapturedPerCase',
    'completeCaseTimePolicyCatalogCaptured',
    'presenceExactRootCauseProven',
    'supabasePresenceGenericallyBrokenProven'
  ];
  for (const flag of requiredFalse) if (input[flag] !== false) return `UNPROVEN_FACT_MUST_REMAIN_FALSE:${flag}`;
  return null;
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3C_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3C_STATUS_REQUIRED');
  if (input.r3cAttempt2AuthorizationConsumed !== true || input.r3cAttempt2AuthorizationReusable !== false) return blocked('R3C_SINGLE_USE_HISTORY_REQUIRED');
  if (!exactArray(input.futurePolicySnapshotColumns, REQUIRED_POLICY_SNAPSHOT_COLUMNS)) return blocked('COMPLETE_POLICY_SNAPSHOT_COLUMNS_REQUIRED');

  const historicalFailure = validateHistoricalFacts(input);
  if (historicalFailure) return blocked(historicalFailure);

  const requiredFutureControls = [
    'futureExactStoredPolicySnapshotRequired',
    'futureCompleteCatalogAtCaseTimeRequired',
    'futurePolicyCountAndCommandSplitRequired',
    'futureExpectedVsStoredPredicateEvidenceRequired',
    'futureSnapshotBeforeRealtimeSubscribeRequired',
    'futurePerCaseCleanupInventoryRequired',
    'arbitrarySleepProhibitedWithoutEvidence',
    'causalPromotionBlockedUntilNewEvidence'
  ];
  for (const flag of requiredFutureControls) if (input[flag] !== true) return blocked('R3D_DIAGNOSTIC_CONTROL_REQUIRED', { flag });

  const prohibitedExecution = [
    'stagingReadPlanned',
    'stagingMutationPlanned',
    'triggerCreationPlanned',
    'authorizationPhraseDefined',
    'realtimePolicyMutationPlanned',
    'realtimeSubscriptionPlanned',
    'authIdentityLifecyclePlanned',
    'communityPostsExecutionPlanned',
    'channelMessagesExecutionPlanned',
    'domainMutationPlanned',
    'publicationMutationPlanned',
    'runtimeDeployPlanned',
    'productionPlanned',
    'mergePlanned',
    'realUserMutationPlanned'
  ];
  for (const flag of prohibitedExecution) if (input[flag] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_r3a_policy_materialization_evidence_gap_isolated',
    reason: null,
    proven: {
      r3aPerCaseOwnPolicyCleanup: true,
      r3aFreshClientPerCase: true,
      r3aTwoPoliciesPerCase: true,
      r3cCurrentPersistentCatalogEmpty: true,
      sameConnectionAuthorizationCacheExplainsCrossCaseResult: false
    },
    unresolved: {
      exactStoredComplexSelectQualAtR3aCaseTime: true,
      permissiveAtR3aCaseTime: true,
      completePolicyCatalogAtR3aCaseTime: true,
      realtimeAuthorizationSyntheticRowContext: true,
      hostedRealtimeBehaviorDivergence: true,
      metadataOrPolicyPropagationTiming: true
    },
    futurePolicySnapshotColumns: REQUIRED_POLICY_SNAPSHOT_COLUMNS,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
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

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  HISTORICAL_EXECUTOR_PATH,
  REQUIRED_POLICY_SNAPSHOT_COLUMNS,
  validateHistoricalFacts,
  evaluateRepositoryReadiness
});
