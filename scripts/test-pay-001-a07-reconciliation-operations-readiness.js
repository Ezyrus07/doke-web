'use strict';

const assert = require('node:assert/strict');
const {
  CONTRACT_VERSION,
  STORE_CONTRACT_VERSION,
  SCHEDULER_CONTRACT_VERSION,
  OBSERVABILITY_CONTRACT_VERSION,
  STAGING_SCOPE,
  STAGING_PHRASE,
  REQUIRED_STORE_METHODS,
  validateOperationsAdapter,
  normalizeSchedulerPolicy,
  buildSchedulerTickPlan,
  buildLeaseClaim,
  buildMetricPoint,
  buildAlertOutboxRecord,
  buildIncidentRunbookPlan,
  evaluateOperationsReadiness,
  buildStagingAuthorizationChallenge,
  validateStagingAuthorization
} = require('../backend/modules/payments/payment-reconciliation-operations-contract');

const NOW = '2026-08-03T17:30:00.000Z';
const HEAD = 'a'.repeat(40);
const HASH = 'b'.repeat(64);

function storeAdapter(overrides = {}) {
  const adapter = {
    contractVersion: STORE_CONTRACT_VERSION,
    serverOnly: true,
    browserAccess: false,
    rawProviderPayloadStored: false,
    rawCardDataStored: false,
    directMoneyMutationAllowed: false,
    automaticResolutionAllowed: false,
    ...overrides
  };
  REQUIRED_STORE_METHODS.forEach((method) => {
    if (!(method in adapter)) adapter[method] = async () => null;
  });
  return adapter;
}

function schedulerPolicy(overrides = {}) {
  return {
    enabled: false,
    timezone: 'UTC',
    clockAuthority: 'database',
    overlapPolicy: 'deny',
    batchSize: 25,
    leaseSeconds: 120,
    heartbeatSeconds: 30,
    maxAttempts: 8,
    backoffSeconds: [60, 300, 900, 3600],
    ...overrides
  };
}

function alertInput(overrides = {}) {
  return {
    priority: 'P1',
    caseId: 'pay_recon_case_01',
    reasonCode: 'state_mismatch',
    comparisonFingerprint: HASH,
    observedAt: NOW,
    dedupeWindowSeconds: 900,
    context: {
      environment: 'staging',
      severity: 'high',
      status: 'escalated',
      divergenceCodes: ['state_mismatch'],
      runbookRef: 'pay-reconciliation-incident-v1'
    },
    ...overrides
  };
}

function readinessInput(overrides = {}) {
  return {
    storeAdapter: storeAdapter(),
    schedulerPolicy: schedulerPolicy(),
    migrationPlanIdentified: true,
    schedulerDeploymentIdentified: true,
    metricsSinkConfigured: true,
    alertDeliveryConfigured: true,
    runbookApproved: true,
    onCallOwnerAssigned: true,
    retentionApproved: true,
    rollbackPlanApproved: true,
    cleanupPlanApproved: true,
    stagingProjectVerified: true,
    featureFlagsDisabled: true,
    syntheticFixturesReady: true,
    sandboxOrZeroBudget: true,
    productionExplicitlyDenied: true,
    readinessEvidenceHash: HASH,
    exactGitHead: HEAD,
    ...overrides
  };
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code);
}

assert.equal(CONTRACT_VERSION, 'pay-reconciliation-operations-v1');
assert.equal(SCHEDULER_CONTRACT_VERSION, 'pay-reconciliation-scheduler-v1');
assert.equal(OBSERVABILITY_CONTRACT_VERSION, 'pay-reconciliation-observability-v1');
assert.equal(STAGING_SCOPE, 'reconciliation_operations_canary_only');
assert.equal(STAGING_PHRASE, 'I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING');

const adapterValidation = validateOperationsAdapter(storeAdapter());
assert.equal(adapterValidation.valid, true);
assert.equal(adapterValidation.browserAccess, false);
assert.equal(adapterValidation.directMoneyMutationAllowed, false);
expectCode('DOKE_PAYMENT_RECONCILIATION_STORE_METHOD_MISSING', () => {
  const adapter = storeAdapter();
  delete adapter.claimDueCases;
  validateOperationsAdapter(adapter);
});
expectCode('DOKE_PAYMENT_RECONCILIATION_STORE_AUTHORITY_INVALID', () => validateOperationsAdapter(storeAdapter({ browserAccess: true })));
expectCode('DOKE_PAYMENT_RECONCILIATION_STORE_DATA_INVALID', () => validateOperationsAdapter(storeAdapter({ rawProviderPayloadStored: true })));

const policy = normalizeSchedulerPolicy(schedulerPolicy());
assert.equal(policy.enabled, false);
assert.equal(policy.clockAuthority, 'database');
assert.equal(policy.idempotentProcessingRequired, true);
expectCode('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_NOT_AUTHORIZED', () => normalizeSchedulerPolicy(schedulerPolicy({ enabled: true })));
expectCode('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', () => normalizeSchedulerPolicy(schedulerPolicy({ heartbeatSeconds: 90 })));
expectCode('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_POLICY_INVALID', () => normalizeSchedulerPolicy(schedulerPolicy({ backoffSeconds: [60, 30] })));

const tickA = buildSchedulerTickPlan({
  policy: schedulerPolicy(),
  exactGitHead: HEAD,
  scheduledFor: NOW,
  jobKey: 'pay-reconciliation-scan-v1',
  environment: 'staging'
});
const tickB = buildSchedulerTickPlan({
  environment: 'staging',
  jobKey: 'pay-reconciliation-scan-v1',
  scheduledFor: NOW,
  exactGitHead: HEAD,
  policy: schedulerPolicy()
});
assert.equal(tickA.tickId, tickB.tickId);
assert.equal(tickA.executionAllowed, false);
assert.equal(tickA.directMoneyMutationAllowed, false);
assert.equal(tickA.requiresExternalAuthorizedExecutor, true);

const lease = buildLeaseClaim({
  caseId: 'pay_recon_case_01',
  caseKey: 'pay:reconciliation:provider-neutral:intent-01',
  workerId: 'worker-a',
  expectedRevision: 4,
  attempt: 2,
  leaseSeconds: 120,
  claimedAt: NOW
});
assert.equal(lease.expectedRevision, 4);
assert.equal(lease.databaseCompareAndSwapRequired, true);
assert.equal(lease.expiresAt, '2026-08-03T17:32:00.000Z');
const sameLease = buildLeaseClaim({
  caseId: 'pay_recon_case_01',
  caseKey: 'pay:reconciliation:provider-neutral:intent-01',
  workerId: 'worker-a',
  expectedRevision: 4,
  attempt: 2,
  leaseSeconds: 120,
  claimedAt: NOW
});
assert.equal(lease.leaseId, sameLease.leaseId);

const metric = buildMetricPoint({
  name: 'pay_reconciliation_cases',
  value: 3,
  labels: { environment: 'staging', severity: 'high', status: 'open' },
  observedAt: NOW
});
assert.equal(metric.labels.environment, 'staging');
assert.equal(metric.lowCardinalityRequired, true);
assert.equal(metric.remoteWriteAllowedByThisContract, false);
expectCode('DOKE_PAYMENT_RECONCILIATION_METRIC_CARDINALITY_INVALID', () => buildMetricPoint({
  name: 'pay_reconciliation_cases',
  value: 1,
  labels: { environment: 'staging', order_id: 'order-1' },
  observedAt: NOW
}));
expectCode('DOKE_PAYMENT_RECONCILIATION_METRIC_LABEL_INVALID', () => buildMetricPoint({
  name: 'pay_reconciliation_cases',
  value: 1,
  labels: { environment: 'production' },
  observedAt: NOW
}));
expectCode('DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN', () => buildMetricPoint({
  name: 'pay_reconciliation_cases',
  value: 1,
  labels: { environment: 'staging' },
  observedAt: NOW,
  metadata: { rawCardNumber: '4111111111111111' }
}));

const alertA = buildAlertOutboxRecord(alertInput());
const alertB = buildAlertOutboxRecord(alertInput());
assert.equal(alertA.outboxId, alertB.outboxId);
assert.equal(alertA.atomicOutboxWriteRequired, true);
assert.equal(alertA.externalDeliveryConfigured, false);
assert.equal(alertA.rawProviderPayloadIncluded, false);
expectCode('DOKE_PAYMENT_RECONCILIATION_ALERT_CONTEXT_INVALID', () => buildAlertOutboxRecord(alertInput({
  context: { environment: 'staging', providerIntentId: 'pi-secret' }
})));
expectCode('DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN', () => buildAlertOutboxRecord(alertInput({
  context: { environment: 'staging', rawCardNumber: '4111111111111111' }
})));

const runbook = buildIncidentRunbookPlan({
  alert: alertInput({ priority: 'P0' }),
  operator: { id: 'operator-01', role: 'admin' },
  runbookVersion: 'pay-reconciliation-incident-v1',
  sections: [
    'detection',
    'containment',
    'evidence_preservation',
    'provider_verification',
    'reconciliation',
    'customer_communication',
    'recovery',
    'post_incident_review'
  ]
});
assert.equal(runbook.recommendFinancialAutomationFreeze, true);
assert.equal(runbook.automaticFreezeAllowed, false);
assert.equal(runbook.automaticMoneyMutationAllowed, false);
assert.equal(runbook.repositoryExecutionPerformed, false);
expectCode('DOKE_PAYMENT_RECONCILIATION_RUNBOOK_INCOMPLETE', () => buildIncidentRunbookPlan({
  alert: alertInput(),
  operator: { id: 'operator-01', role: 'support' },
  runbookVersion: 'pay-reconciliation-incident-v1',
  sections: ['detection']
}));

const blocked = evaluateOperationsReadiness(readinessInput({ alertDeliveryConfigured: false }));
assert.equal(blocked.readyForExplicitStagingAuthorization, false);
assert(blocked.blockingReasons.includes('missing:alertDeliveryConfigured'));
assert.equal(blocked.remoteActionsAllowedByThisContract, false);
const ready = evaluateOperationsReadiness(readinessInput());
assert.equal(ready.readyForExplicitStagingAuthorization, true);
assert.equal(ready.repositoryExecutionPerformed, false);

const challenge = buildStagingAuthorizationChallenge({
  readiness: readinessInput(),
  resourcePlan: {
    stagingProjectId: 'staging-doke-payments',
    migrationIds: ['pay-a07-reconciliation-store-v1', 'pay-a07-alert-outbox-v1'],
    schedulerJobId: 'pay-a07-reconciliation-scheduler-v1',
    metricsSinkId: 'pay-a07-metrics-sink-v1',
    alertDeliveryIntegrationId: 'pay-a07-alert-delivery-v1',
    runbookVersion: 'pay-reconciliation-incident-v1',
    maximumBudgetMinor: 0,
    sandboxMode: true,
    productionExplicitlyDenied: true
  }
});
assert.equal(challenge.remoteActionsAllowedByThisContract, false);
assert.equal(challenge.requiresExternalAuthorizedExecutor, true);

const authorization = {
  phrase: challenge.phrase,
  scope: challenge.scope,
  exactGitHead: challenge.exactGitHead,
  readinessEvidenceHash: challenge.readinessEvidenceHash,
  challengeFingerprint: challenge.challengeFingerprint,
  resourcePlan: challenge.resourcePlan,
  nonce: 'pay-a07-auth-001',
  issuedAt: '2026-08-03T17:25:00.000Z',
  expiresAt: '2026-08-03T17:35:00.000Z',
  oneShot: true,
  productionAllowed: false
};
const consumedNonces = new Set();
const validated = validateStagingAuthorization(challenge, authorization, { now: NOW, consumedNonces });
assert.equal(validated.authorizationValidated, true);
assert.equal(validated.repositoryExecutionPerformed, false);
assert.equal(validated.directMoneyMutationAllowed, false);
expectCode('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_REPLAYED', () => validateStagingAuthorization(challenge, authorization, { now: NOW, consumedNonces }));
expectCode('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', () => validateStagingAuthorization(challenge, {
  ...authorization,
  nonce: 'pay-a07-auth-002',
  phrase: 'Próximo'
}, { now: NOW, consumedNonces: new Set() }));
expectCode('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', () => validateStagingAuthorization(challenge, {
  ...authorization,
  nonce: 'pay-a07-auth-003',
  resourcePlan: { ...authorization.resourcePlan, schedulerJobId: 'drifted-job' }
}, { now: NOW, consumedNonces: new Set() }));
expectCode('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', () => validateStagingAuthorization(challenge, {
  ...authorization,
  nonce: 'pay-a07-auth-004',
  issuedAt: '2026-08-03T16:00:00.000Z',
  expiresAt: '2026-08-03T16:10:00.000Z'
}, { now: NOW, consumedNonces: new Set() }));

console.log('PAY-A07 reconciliation operations readiness runtime test passed.');
