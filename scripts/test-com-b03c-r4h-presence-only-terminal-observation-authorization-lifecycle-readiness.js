'use strict';

const assert = require('node:assert/strict');
const r4h = require('../backend/modules/communities/community-realtime-private-auth-r4h');
const config = require('../config/com-b03c-r4h-presence-only-terminal-observation-authorization-lifecycle-readiness.json');

const baseline = structuredClone(config.readinessInput);
const ready = r4h.evaluateRepositoryReadiness(baseline);

assert.equal(ready.decision, r4h.STATUS);
assert.equal(ready.authorizationLifecycleReady, true);
assert.equal(ready.freshAuthorizationRequired, true);
assert.equal(ready.authorizationMustBindFinalCertifiedR4hHead, true);
assert.equal(ready.singleUseAuthorizationAuthority, true);
assert.equal(ready.authorizationReceived, false);
assert.equal(ready.authorizationConsumed, false);
assert.equal(ready.authorizationReusable, false);
assert.equal(ready.triggerCreationAuthority, false);
assert.equal(ready.remoteExecutionAuthority, false);
assert.equal(ready.stagingReadAuthority, false);
assert.equal(ready.stagingMutationAuthority, false);
assert.equal(ready.productionAuthority, false);
assert.equal(ready.pullRequestMergeAuthority, false);
assert.equal(ready.exactRootCauseProven, false);
assert.equal(ready.causalPromotionAllowed, false);

const sampleHead = 'a'.repeat(40);
const statement = r4h.buildAuthorizationPhrase(sampleHead);
assert.equal(statement, `${r4h.AUTHORIZATION_PREFIX}${sampleHead}`);
assert.equal(r4h.validateAuthorizationStatement(statement, sampleHead), true);
assert.equal(r4h.validateAuthorizationStatement(`${statement}x`, sampleHead), false);
assert.equal(r4h.validateAuthorizationStatement(statement, 'b'.repeat(40)), false);
assert.throws(
  () => r4h.buildAuthorizationPhrase('not-a-certified-head'),
  { code: 'DOKE_COM_B03C_R4H_CERTIFIED_HEAD_REQUIRED' }
);

const negatives = [
  ['wrong_predecessor_head', { predecessorHead: 'b'.repeat(40) }],
  ['wrong_predecessor_status', { predecessorStatus: 'stale' }],
  ['wrong_predecessor_run', { predecessorRun: 1 }],
  ['wrong_envelope_kind', { predecessorEnvelopeKind: 'other' }],
  ['wrong_matrix', { matrixVersion: '0.0.0' }],
  ['single_use_false', { singleUse: false }],
  ['reusable_after_failure', { reusableAfterFailureForbidden: false }],
  ['wrong_attempt', { maxAttempt: 2 }],
  ['r4e_reuse_allowed', { r4eAuthorizationNonReusable: false }],
  ['authorization_already_received', { authorizationReceived: true }],
  ['authorization_already_consumed', { authorizationConsumed: true }],
  ['trigger_exists', { triggerExists: true }],
  ['push_executor_prepared', { pushExecutionWorkflowPrepared: true }],
  ['staging_prepared', { stagingEnvironmentPrepared: true }],
  ['network_prepared', { networkPrepared: true }],
  ['production_prepared', { productionPrepared: true }],
  ['merge_prepared', { mergePrepared: true }]
];

for (const [id, patch] of negatives) {
  const result = r4h.evaluateRepositoryReadiness({ ...baseline, ...patch });
  assert.equal(result.decision, 'blocked_repository_only', id);
  assert.equal(result.remoteExecutionAuthority, false, id);
  assert.equal(result.productionAuthority, false, id);
  assert.equal(result.pullRequestMergeAuthority, false, id);
}

assert.throws(
  () => r4h.assertRemoteExecutionBoundaryAbsent(),
  { code: r4h.REMOTE_EXECUTION_BLOCK_CODE }
);

process.stdout.write(JSON.stringify({
  validationId: r4h.VALIDATION_ID,
  contractId: r4h.CONTRACT_ID,
  status: ready.decision,
  predecessorHead: ready.predecessorHead,
  authorizationPhrasePrefix: ready.authorizationPhrasePrefix,
  headBindingValidated: true,
  negativeCaseCount: negatives.length,
  triggerExists: false,
  remoteExecutionAuthority: ready.remoteExecutionAuthority,
  stagingReadAuthority: ready.stagingReadAuthority,
  stagingMutationAuthority: ready.stagingMutationAuthority,
  exactRootCauseProven: ready.exactRootCauseProven,
  causalPromotionAllowed: ready.causalPromotionAllowed
}) + '\n');
