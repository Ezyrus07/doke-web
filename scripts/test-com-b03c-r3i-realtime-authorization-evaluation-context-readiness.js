#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3i = require('../backend/modules/communities/community-realtime-private-auth-r3i');
const config = require('../config/com-b03c-r3i-realtime-authorization-evaluation-context-readiness.json');
const upstream = require('../docs/validation/COM-B03C-R3I-UPSTREAM-REALTIME-AUTHORIZATION-SOURCE-EVIDENCE.json');
const predecessor = require('../docs/validation/COM-B03C-R3H-SINGLE-USE-STAGING-DIAGNOSTIC-READINESS.json');

let checks = 0;
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks += 1; }
function ok(value, label) { assert.equal(value, true, label); checks += 1; }

const input = {
  predecessorValidationId: r3i.PREDECESSOR_VALIDATION_ID,
  predecessorStatus: r3i.PREDECESSOR_STATUS,
  predecessorEvidenceHead: r3i.PREDECESSOR_EVIDENCE_HEAD,
  predecessorRecertRun: r3i.PREDECESSOR_RECERT_RUN,
  predecessorRecertJob: r3i.PREDECESSOR_RECERT_JOB,
  predecessorRecertSuccess: true,
  predecessorAuthorizationConsumed: true,
  predecessorAuthorizationReusable: false,
  predecessorTriggerAbsent: true,
  predecessorZeroResidueProven: true,
  upstreamRepository: r3i.UPSTREAM_REPOSITORY,
  upstreamCommit: r3i.UPSTREAM_COMMIT,
  upstreamSourcePaths: [...r3i.UPSTREAM_SOURCE_PATHS],
  caseIds: r3i.CASES.map(([id]) => id),
  readAuthorizationInsertBeforeSessionConfigObserved: true,
  readAuthorizationSessionConfigBeforeSelectObserved: true,
  topicAndJwtSessionSettingsObserved: true,
  presenceMessageRowMaterializationObserved: true,
  upstreamPresenceTopicUidPolicyObserved: true,
  upstreamPresenceTopicUidIntegrationTestObserved: true,
  rowVsRawSettingVsHelperDifferentialRequired: true,
  plannerBarrierDifferentialRequired: true,
  sameIdentityTokenTopicFutureRequirementRecorded: true,
  fullCaseTimeCatalogEvidenceFutureRequirementRecorded: true,
  noCausalPromotionWithoutDifferentialEvidence: true,
  noRuntimePolicyChangePrepared: true,
  noRemoteExecutorPrepared: true,
  noTriggerPrepared: true,
  noAuthorizationPhraseDefined: true,
  noStagingEnvironmentJobPrepared: true,
  noProductionPrepared: true,
  noMergePrepared: true
};

eq(r3i.CONTRACT_ID, config.contractId, 'contract id');
eq(predecessor.status, r3i.PREDECESSOR_STATUS, 'predecessor status');
eq(predecessor.stagingExecution.cleanup.zeroResidueProven, true, 'predecessor zero residue');
eq(predecessor.futureAuthorization.consumed, true, 'predecessor authorization consumed');
eq(predecessor.futureAuthorization.reusableAfterFailure, false, 'predecessor authorization nonreusable');
eq(predecessor.futureAuthorization.triggerExists, false, 'predecessor trigger absent');
eq(upstream.source.repository, r3i.UPSTREAM_REPOSITORY, 'upstream repo');
eq(upstream.source.commit, r3i.UPSTREAM_COMMIT, 'upstream commit');
eq(config.diagnosticDesign.caseCount, 16, 'case count');
eq(config.diagnosticDesign.caseIds, r3i.CASES.map(([id]) => id), 'case ids');
ok(config.remoteBoundary.remoteExecutorPrepared === false, 'no remote executor');
ok(config.remoteBoundary.triggerPrepared === false, 'no trigger');
ok(config.remoteBoundary.authorizationPhraseDefined === false, 'no authorization phrase');
ok(config.remoteBoundary.stagingEnvironmentJobPrepared === false, 'no staging job');
ok(config.remoteBoundary.runtimePolicyChangePrepared === false, 'no runtime policy change');

const ready = r3i.evaluateRepositoryReadiness(input);
eq(ready.decision, 'repository_realtime_authorization_evaluation_context_differential_ready_no_remote_authority', 'ready decision');
ok(ready.repositoryReadinessAuthority === true, 'repository authority');
ok(ready.remoteExecutionAuthority === false, 'no remote authority');
ok(ready.stagingReadAuthority === false, 'no staging read');
ok(ready.stagingMutationAuthority === false, 'no staging mutation');
ok(ready.runtimeChangeAuthority === false, 'no runtime change');
ok(ready.productionAuthority === false, 'no production');
ok(ready.pullRequestMergeAuthority === false, 'no merge');
ok(ready.exactRootCauseProven === false, 'root cause still false');

eq(ready.cases.length, 16, 'ready case length');

for (const [field, bad] of [
  ['predecessorValidationId', 'wrong'],
  ['predecessorStatus', 'wrong'],
  ['predecessorEvidenceHead', '0'.repeat(40)],
  ['predecessorRecertSuccess', false],
  ['predecessorAuthorizationConsumed', false],
  ['predecessorAuthorizationReusable', true],
  ['predecessorTriggerAbsent', false],
  ['predecessorZeroResidueProven', false],
  ['upstreamRepository', 'wrong/repo'],
  ['upstreamCommit', '0'.repeat(40)],
  ['noRemoteExecutorPrepared', false],
  ['noTriggerPrepared', false],
  ['noAuthorizationPhraseDefined', false],
  ['noStagingEnvironmentJobPrepared', false],
  ['noRuntimePolicyChangePrepared', false]
]) {
  eq(r3i.evaluateRepositoryReadiness({ ...input, [field]: bad }).decision, 'blocked', `blocks ${field}`);
}

const caseMap = new Map(ready.cases.map((entry) => [entry.id, entry]));
eq(caseMap.get('row_topic_extension').surface, 'row_pair', 'row pair present');
eq(caseMap.get('raw_topic_setting_extension').surface, 'raw_session_plus_row', 'raw topic differential');
eq(caseMap.get('topic_helper_extension').surface, 'helper_plus_row', 'topic helper differential');
eq(caseMap.get('raw_sub_setting_extension').surface, 'raw_session_plus_row', 'raw sub differential');
eq(caseMap.get('uid_helper_extension').surface, 'helper_plus_row', 'uid helper differential');
eq(caseMap.get('upstream_exact_full').surface, 'upstream_parity', 'upstream parity case');
eq(caseMap.get('case_barrier_full').surface, 'planner_barrier', 'case planner barrier');
eq(caseMap.get('exists_barrier_full').surface, 'planner_barrier', 'exists planner barrier');

process.stdout.write(`COM-B03C-R3I readiness checks passed: ${checks}/${checks}\n`);
