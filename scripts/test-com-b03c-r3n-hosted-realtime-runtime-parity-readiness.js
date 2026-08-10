#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const config = require('../config/com-b03c-r3n-hosted-realtime-runtime-parity-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3N-HOSTED-REALTIME-RUNTIME-PARITY-READINESS.json');
const r3n = require('../backend/modules/communities/community-realtime-private-auth-r3n');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: r3n.PREDECESSOR_VALIDATION_ID,
    predecessorStatus: r3n.PREDECESSOR_STATUS,
    predecessorHead: r3n.PREDECESSOR_HEAD,
    predecessorAuthorizationConsumed: true,
    predecessorAuthorizationReusable: false,
    predecessorTriggerAbsent: true,
    predecessorZeroResidueProven: true,
    predecessorExactRootCauseProven: false,
    predecessorCausalPromotionAllowed: false,
    r3lSubscribedCases: [...r3n.R3L_SUBSCRIBED_CASES],
    r3lExtensionRejectedCases: [...r3n.R3L_EXTENSION_REJECTED_CASES],
    upstreamRepository: r3n.UPSTREAM_REPOSITORY,
    upstreamCommit: r3n.UPSTREAM_COMMIT,
    upstreamSourcePaths: [...r3n.REQUIRED_SOURCE_PATHS],
    sdkPackage: r3n.SDK_PACKAGE,
    sdkRange: r3n.SDK_RANGE,
    ...config.observations,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

const decision = r3n.evaluateRepositoryReadiness(readinessInput());
assert.equal(decision.decision, 'repository_hosted_realtime_runtime_parity_contradiction_ready_no_remote_authority');
assert.equal(decision.preciseMissingObservation, 'hosted_realtime_runtime_parity_for_presence_read_authorization_path');
assert.equal(decision.exactRootCauseProven, false);
assert.equal(decision.causalPromotionAllowed, false);
assert.equal(decision.remoteExecutionAuthority, false);
assert.equal(decision.stagingReadAuthority, false);
assert.equal(decision.stagingMutationAuthority, false);
assert.equal(decision.productionAuthority, false);
assert.equal(decision.pullRequestMergeAuthority, false);

for (const [field, value] of Object.entries({
  upstreamPrivateJoinUsesBroadcastOrPresenceReadObserved: false,
  upstreamPresencePredicateExpectedToAuthorizePresenceReadObserved: false,
  dokeAdapterExplicitPresenceEnabledTrueObserved: false,
  hostedRuntimeParityNotProven: false
})) {
  const blocked = r3n.evaluateRepositoryReadiness(readinessInput({ [field]: value }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

for (const field of Object.keys(config.prohibitedPreparation)) {
  const blocked = r3n.evaluateRepositoryReadiness(readinessInput({ [field]: true }));
  assert.equal(blocked.decision, 'blocked_repository_only', field);
}

assert.equal(config.contractId, r3n.CONTRACT_ID);
assert.equal(config.status, 'repository_hosted_realtime_runtime_parity_contradiction_ready_no_remote_authority');
assert.equal(config.preciseMissingObservation, r3n.PRECISE_MISSING_OBSERVATION);
assert.equal(evidence.contractId, r3n.CONTRACT_ID);
assert.equal(evidence.status, 'repository_hosted_realtime_runtime_parity_contradiction_prepared_no_remote_authority');
assert.equal(evidence.exactRootCauseProven, false);
assert.equal(evidence.causalPromotionAllowed, false);
assert.equal(evidence.effects.stagingAccessExecuted, false);
assert.equal(evidence.effects.runtimePolicyChangeExecuted, false);
assert.equal(evidence.effects.productionExecuted, false);
assert.equal(evidence.effects.mergeExecuted, false);

process.stdout.write(JSON.stringify({
  contractId: r3n.CONTRACT_ID,
  decision: decision.decision,
  preciseMissingObservation: decision.preciseMissingObservation,
  rejectedHypotheses: decision.causalNarrowing.rejectedHypotheses,
  remoteExecutionAuthority: decision.remoteExecutionAuthority,
  exactRootCauseProven: decision.exactRootCauseProven
}) + '\n');
