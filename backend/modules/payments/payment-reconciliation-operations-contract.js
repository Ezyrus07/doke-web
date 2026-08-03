'use strict';

const {
  hashCanonicalPayload,
  contractError,
  assertNoSensitivePaymentData
} = require('./payment-provider-contract');

const CONTRACT_VERSION = 'pay-reconciliation-operations-v1';
const STORE_CONTRACT_VERSION = 'pay-reconciliation-store-v1';
const SCHEDULER_CONTRACT_VERSION = 'pay-reconciliation-scheduler-v1';
const OBSERVABILITY_CONTRACT_VERSION = 'pay-reconciliation-observability-v1';
const STAGING_SCOPE = 'reconciliation_operations_canary_only';
const STAGING_PHRASE = 'I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING';
const MAX_AUTHORIZATION_AGE_SECONDS = 15 * 60;

const REQUIRED_STORE_METHODS = Object.freeze([
  'getByCaseKey',
  'getById',
  'insert',
  'update',
  'claimDueCases',
  'renewLease',
  'completeLease',
  'appendAuditEvent',
  'enqueueAlertOutbox',
  'recordMetricRollup'
]);

const ALLOWED_METRICS = Object.freeze([
  'pay_reconciliation_cases',
  'pay_reconciliation_stale_cases',
  'pay_reconciliation_claim_conflicts_total',
  'pay_reconciliation_replay_attempts_total',
  'pay_reconciliation_replay_failures_total',
  'pay_reconciliation_latency_seconds',
  'pay_reconciliation_alert_outbox_pending',
  'pay_reconciliation_scheduler_tick_duration_seconds'
]);

const ALLOWED_METRIC_LABELS = Object.freeze({
  environment: Object.freeze(['local', 'test', 'staging']),
  severity: Object.freeze(['none', 'low', 'medium', 'high', 'critical']),
  status: Object.freeze([
    'open', 'triaged', 'replay_review', 'approved_for_replay', 'dry_run_passed',
    'replay_submitted', 'pending_verification', 'resolved', 'dismissed', 'escalated'
  ]),
  outcome: Object.freeze(['success', 'failure', 'conflict', 'timeout', 'skipped']),
  operation: Object.freeze(['scan', 'claim', 'renew', 'complete', 'alert', 'replay', 'verify'])
});

const PROHIBITED_METRIC_LABELS = Object.freeze([
  'user_id', 'actor_id', 'order_id', 'payment_id', 'case_id', 'intent_key',
  'provider_intent_id', 'provider_event_id', 'event_id', 'email', 'phone',
  'cpf', 'cnpj', 'idempotency_key', 'comparison_fingerprint'
]);

const ALERT_PRIORITIES = Object.freeze(['P0', 'P1', 'P2', 'P3']);
const OPERATOR_ROLES = Object.freeze(['support', 'admin']);
const REQUIRED_RUNBOOK_SECTIONS = Object.freeze([
  'detection',
  'containment',
  'evidence_preservation',
  'provider_verification',
  'reconciliation',
  'customer_communication',
  'recovery',
  'post_incident_review'
]);

function validateOperationsAdapter(adapter) {
  const source = plainObject(adapter, 'Operations store adapter is required.');
  if (source.contractVersion !== STORE_CONTRACT_VERSION) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_VERSION_INVALID', 'Operations store contract version is invalid.', 422);
  }
  REQUIRED_STORE_METHODS.forEach((method) => {
    if (typeof source[method] !== 'function') {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_METHOD_MISSING', `Operations store is missing ${method}.`, 503);
    }
  });
  if (source.serverOnly !== true || source.browserAccess !== false) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_AUTHORITY_INVALID', 'Operations store must be server-only and browser-inaccessible.', 403);
  }
  if (source.rawProviderPayloadStored !== false || source.rawCardDataStored !== false) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_DATA_INVALID', 'Raw provider payloads and raw card data must not enter the operations store.', 422);
  }
  if (source.directMoneyMutationAllowed !== false || source.automaticResolutionAllowed !== false) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_STORE_AUTHORITY_INVALID', 'Operations store cannot grant money mutation or automatic resolution.', 403);
  }
  return Object.freeze({
    contractVersion: STORE_CONTRACT_VERSION,
    valid: true,
    requiredMethods: REQUIRED_STORE_METHODS,
    serverOnly: true,
    browserAccess: false,
    rawProviderPayloadStored: false,
    rawCardDataStored: false,
    directMoneyMutationAllowed: false,
    automaticResolutionAllowed: false
  });
}

function normalizeSchedulerPolicy(input) {
  const source = plainObject(input, 'Scheduler policy is required.');
  const batchSize = boundedInteger(source.batchSize, 'batchSize', 1, 100);
  const leaseSeconds = boundedInteger(source.leaseSeconds, 'leaseSeconds', 30, 600);
  const heartbeatSeconds = boundedInteger(source.heartbeatSeconds, 'heartbeatSeconds', 5, Math.floor(leaseSeconds / 2));
  const maxAttempts = boundedInteger(source.maxAttempts, 'maxAttempts', 1, 20);
  const backoffSeconds = normalizeBackoff(source.backoffSeconds);
  if (source.timezone !== 'UTC' || source.clockAuthority !== 'database' || source.overlapPolicy !== 'deny') {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_POLICY_INVALID', 'Scheduler must use UTC, database clock authority and deny overlap.', 422);
  }
  if (source.enabled !== false) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_NOT_AUTHORIZED', 'Repository contract must keep the scheduler disabled.', 403);
  }
  return Object.freeze({
    contractVersion: SCHEDULER_CONTRACT_VERSION,
    enabled: false,
    timezone: 'UTC',
    clockAuthority: 'database',
    overlapPolicy: 'deny',
    batchSize,
    leaseSeconds,
    heartbeatSeconds,
    maxAttempts,
    backoffSeconds: Object.freeze(backoffSeconds),
    jitterRequired: true,
    exactOnceClaimNotAssumed: true,
    idempotentProcessingRequired: true,
    remoteExecutionAllowedByThisContract: false
  });
}

function buildSchedulerTickPlan(input) {
  const source = plainObject(input, 'Scheduler tick input is required.');
  const policy = normalizeSchedulerPolicy(source.policy);
  const exactGitHead = gitHead(source.exactGitHead);
  const scheduledFor = isoDate(source.scheduledFor, 'scheduledFor');
  const jobKey = identifier(source.jobKey, 'jobKey', 120);
  const environment = enumValue(source.environment, 'environment', ['local', 'test', 'staging']);
  const canonical = Object.freeze({
    contractVersion: SCHEDULER_CONTRACT_VERSION,
    jobKey,
    environment,
    exactGitHead,
    scheduledFor,
    policy,
    operationOrder: Object.freeze([
      'claim_due_cases',
      'renew_active_leases',
      'process_claimed_cases_idempotently',
      'append_audit_events',
      'enqueue_alert_outbox_records',
      'record_low_cardinality_metrics',
      'complete_or_release_leases'
    ])
  });
  return Object.freeze({
    ...canonical,
    tickId: `pay_recon_tick_${hashCanonicalPayload(canonical).slice(0, 32)}`,
    executionAllowed: false,
    remoteMutationAuthority: 'none_in_repository_contract',
    directMoneyMutationAllowed: false,
    requiresExternalAuthorizedExecutor: true
  });
}

function buildLeaseClaim(input) {
  const source = plainObject(input, 'Lease claim input is required.');
  const caseId = identifier(source.caseId, 'caseId', 120);
  const caseKey = identifier(source.caseKey, 'caseKey', 240);
  const workerId = identifier(source.workerId, 'workerId', 120);
  const expectedRevision = nonNegativeInteger(source.expectedRevision, 'expectedRevision');
  const attempt = boundedInteger(source.attempt, 'attempt', 1, 20);
  const leaseSeconds = boundedInteger(source.leaseSeconds, 'leaseSeconds', 30, 600);
  const claimedAt = isoDate(source.claimedAt, 'claimedAt');
  const expiresAt = new Date(Date.parse(claimedAt) + leaseSeconds * 1000).toISOString();
  const leaseFingerprint = hashCanonicalPayload({ caseId, caseKey, workerId, expectedRevision, attempt, claimedAt, expiresAt });
  return Object.freeze({
    contractVersion: SCHEDULER_CONTRACT_VERSION,
    leaseId: `pay_recon_lease_${leaseFingerprint.slice(0, 32)}`,
    leaseTokenHash: leaseFingerprint,
    caseId,
    caseKey,
    workerId,
    expectedRevision,
    attempt,
    claimedAt,
    expiresAt,
    databaseCompareAndSwapRequired: true,
    staleLeaseTakeoverRequiresExpiry: true,
    concurrentClaimMaySucceedMoreThanOnce: false,
    directMoneyMutationAllowed: false
  });
}

function buildMetricPoint(input) {
  const source = plainObject(input, 'Metric point input is required.');
  assertNoSensitivePaymentData(source, 'reconciliationMetric');
  const name = enumValue(source.name, 'name', ALLOWED_METRICS);
  const value = finiteNonNegative(source.value, 'value');
  const observedAt = isoDate(source.observedAt, 'observedAt');
  const labels = normalizeMetricLabels(source.labels);
  if (!labels.environment) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_METRIC_LABEL_INVALID', 'Metric environment label is required.', 422);
  }
  return Object.freeze({
    contractVersion: OBSERVABILITY_CONTRACT_VERSION,
    name,
    value,
    labels: Object.freeze(labels),
    observedAt,
    lowCardinalityRequired: true,
    containsFinancialIdentifiers: false,
    remoteWriteAllowedByThisContract: false
  });
}

function buildAlertOutboxRecord(input) {
  const source = plainObject(input, 'Alert outbox input is required.');
  assertNoSensitivePaymentData(source, 'reconciliationAlert');
  const priority = enumValue(source.priority, 'priority', ALERT_PRIORITIES);
  const caseId = identifier(source.caseId, 'caseId', 120);
  const reasonCode = codeValue(source.reasonCode, 'reasonCode');
  const comparisonFingerprint = sha256Hex(source.comparisonFingerprint, 'comparisonFingerprint');
  const observedAt = isoDate(source.observedAt, 'observedAt');
  const dedupeWindowSeconds = boundedInteger(source.dedupeWindowSeconds, 'dedupeWindowSeconds', 60, 86400);
  const context = normalizeAlertContext(source.context);
  const dedupeKey = hashCanonicalPayload({ caseId, priority, reasonCode, comparisonFingerprint });
  return Object.freeze({
    contractVersion: OBSERVABILITY_CONTRACT_VERSION,
    outboxId: `pay_recon_alert_${dedupeKey.slice(0, 32)}`,
    dedupeKey,
    priority,
    caseId,
    reasonCode,
    comparisonFingerprint,
    observedAt,
    dedupeWindowSeconds,
    context,
    status: 'pending_delivery',
    externalDeliveryConfigured: false,
    directNotificationSendAllowed: false,
    atomicOutboxWriteRequired: true,
    rawProviderPayloadIncluded: false,
    rawCardDataIncluded: false,
    directMoneyMutationAllowed: false
  });
}

function buildIncidentRunbookPlan(input) {
  const source = plainObject(input, 'Incident runbook input is required.');
  const alert = buildAlertOutboxRecord(source.alert);
  const operator = normalizeOperator(source.operator);
  const runbookVersion = identifier(source.runbookVersion, 'runbookVersion', 80);
  const sections = uniqueStrings(source.sections, 'sections', 80);
  REQUIRED_RUNBOOK_SECTIONS.forEach((section) => {
    if (!sections.includes(section)) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_RUNBOOK_INCOMPLETE', `Runbook section ${section} is required.`, 422);
    }
  });
  const containment = alert.priority === 'P0' || alert.priority === 'P1';
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    runbookVersion,
    alertId: alert.outboxId,
    priority: alert.priority,
    operator,
    sections: Object.freeze(sections),
    orderedActions: Object.freeze(runbookActions(alert.priority)),
    recommendFinancialAutomationFreeze: containment,
    automaticFreezeAllowed: false,
    automaticResolutionAllowed: false,
    automaticMoneyMutationAllowed: false,
    qualifiedHumanDecisionRequired: true,
    externalCommunicationRequiresApproval: true,
    repositoryExecutionPerformed: false
  });
}

function evaluateOperationsReadiness(input) {
  const source = plainObject(input, 'Operations readiness input is required.');
  const reasons = [];
  try { validateOperationsAdapter(source.storeAdapter); } catch (error) { reasons.push(error.code || 'store_adapter_invalid'); }
  try { normalizeSchedulerPolicy(source.schedulerPolicy); } catch (error) { reasons.push(error.code || 'scheduler_policy_invalid'); }
  const required = [
    'migrationPlanIdentified',
    'schedulerDeploymentIdentified',
    'metricsSinkConfigured',
    'alertDeliveryConfigured',
    'runbookApproved',
    'onCallOwnerAssigned',
    'retentionApproved',
    'rollbackPlanApproved',
    'cleanupPlanApproved',
    'stagingProjectVerified',
    'featureFlagsDisabled',
    'syntheticFixturesReady',
    'sandboxOrZeroBudget',
    'productionExplicitlyDenied'
  ];
  required.forEach((field) => {
    if (source[field] !== true) reasons.push(`missing:${field}`);
  });
  if (!isSha256(source.readinessEvidenceHash)) reasons.push('readiness_evidence_hash_invalid');
  if (!isGitHead(source.exactGitHead)) reasons.push('exact_git_head_invalid');
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    readyForExplicitStagingAuthorization: reasons.length === 0,
    blockingReasons: Object.freeze(reasons),
    remoteActionsAllowedByThisContract: false,
    repositoryExecutionPerformed: false,
    directMoneyMutationAllowed: false,
    productionAllowed: false
  });
}

function buildStagingAuthorizationChallenge(input) {
  const source = plainObject(input, 'Staging authorization challenge input is required.');
  const readiness = evaluateOperationsReadiness(source.readiness);
  if (!readiness.readyForExplicitStagingAuthorization) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_READINESS_BLOCKED', 'Operations staging authorization is blocked by incomplete readiness.', 409);
  }
  const resourcePlan = normalizeResourcePlan(source.resourcePlan);
  const exactGitHead = gitHead(source.readiness.exactGitHead);
  const readinessEvidenceHash = sha256Hex(source.readiness.readinessEvidenceHash, 'readinessEvidenceHash');
  const challengeFingerprint = hashCanonicalPayload({ exactGitHead, readinessEvidenceHash, resourcePlan });
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    phrase: STAGING_PHRASE,
    scope: STAGING_SCOPE,
    exactGitHead,
    readinessEvidenceHash,
    resourcePlan,
    challengeFingerprint,
    maxAgeSeconds: MAX_AUTHORIZATION_AGE_SECONDS,
    oneShotRequired: true,
    sandboxOrZeroBudgetRequired: true,
    productionAllowed: false,
    remoteActionsAllowedByThisContract: false,
    requiresExternalAuthorizedExecutor: true
  });
}

function validateStagingAuthorization(challenge, authorization, options = {}) {
  const current = plainObject(challenge, 'Staging challenge is required.');
  const auth = plainObject(authorization, 'Staging authorization is required.');
  const ledger = options.consumedNonces;
  if (!(ledger instanceof Set)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'One-shot nonce ledger is required.', 422);
  }
  const nonce = identifier(auth.nonce, 'nonce', 160);
  if (ledger.has(nonce)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_REPLAYED', 'Authorization nonce was already consumed.', 409);
  }
  const nowMs = Date.parse(options.now || new Date().toISOString());
  const issuedAtMs = Date.parse(auth.issuedAt);
  const expiresAtMs = Date.parse(auth.expiresAt);
  if (![nowMs, issuedAtMs, expiresAtMs].every(Number.isFinite)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'Authorization timestamps are invalid.', 422);
  }
  if (auth.oneShot !== true || auth.productionAllowed !== false) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'Authorization must be one-shot and deny production.', 403);
  }
  if (issuedAtMs > nowMs || expiresAtMs <= nowMs || nowMs - issuedAtMs > current.maxAgeSeconds * 1000 || expiresAtMs - issuedAtMs > current.maxAgeSeconds * 1000) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'Authorization is expired or outside the freshness window.', 409);
  }
  const fields = ['phrase', 'scope', 'exactGitHead', 'readinessEvidenceHash', 'challengeFingerprint'];
  if (fields.some((field) => auth[field] !== current[field])) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'Authorization is not bound to the exact challenge.', 403);
  }
  if (hashCanonicalPayload(auth.resourcePlan) !== hashCanonicalPayload(current.resourcePlan)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_INVALID', 'Authorized resource plan drifted.', 409);
  }
  ledger.add(nonce);
  return Object.freeze({
    authorizationValidated: true,
    scope: current.scope,
    exactGitHead: current.exactGitHead,
    challengeFingerprint: current.challengeFingerprint,
    resourcePlan: current.resourcePlan,
    remoteActionsAllowedByThisContract: false,
    requiresExternalAuthorizedExecutor: true,
    repositoryExecutionPerformed: false,
    directMoneyMutationAllowed: false,
    productionAllowed: false
  });
}

function normalizeMetricLabels(value) {
  const source = value == null ? {} : plainObject(value, 'Metric labels must be an object.');
  const result = {};
  Object.entries(source).forEach(([key, raw]) => {
    if (PROHIBITED_METRIC_LABELS.includes(key)) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_METRIC_CARDINALITY_INVALID', `Metric label ${key} is prohibited.`, 422);
    }
    const allowed = ALLOWED_METRIC_LABELS[key];
    if (!allowed) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_METRIC_LABEL_INVALID', `Metric label ${key} is not allowed.`, 422);
    }
    const normalized = String(raw || '').trim().toLowerCase();
    if (!allowed.includes(normalized)) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_METRIC_LABEL_INVALID', `Metric label ${key} has an invalid value.`, 422);
    }
    result[key] = normalized;
  });
  return result;
}

function normalizeAlertContext(value) {
  const source = value == null ? {} : plainObject(value, 'Alert context must be an object.');
  const allowed = ['environment', 'severity', 'status', 'divergenceCodes', 'runbookRef'];
  Object.keys(source).forEach((key) => {
    if (!allowed.includes(key)) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_ALERT_CONTEXT_INVALID', `Alert context field ${key} is not allowed.`, 422);
    }
  });
  const result = {};
  if (source.environment != null) result.environment = enumValue(source.environment, 'environment', ['local', 'test', 'staging']);
  if (source.severity != null) result.severity = enumValue(source.severity, 'severity', ['low', 'medium', 'high', 'critical']);
  if (source.status != null) result.status = enumValue(source.status, 'status', ALLOWED_METRIC_LABELS.status);
  if (source.divergenceCodes != null) result.divergenceCodes = Object.freeze(uniqueCodes(source.divergenceCodes));
  if (source.runbookRef != null) result.runbookRef = identifier(source.runbookRef, 'runbookRef', 160);
  return Object.freeze(result);
}

function normalizeResourcePlan(value) {
  const source = plainObject(value, 'Resource plan is required.');
  const migrationIds = uniqueStrings(source.migrationIds, 'migrationIds', 120);
  if (migrationIds.length === 0) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_RESOURCE_INVALID', 'At least one immutable migration ID is required.', 422);
  }
  if (source.maximumBudgetMinor !== 0) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_RESOURCE_INVALID', 'Maximum budget must be zero.', 422);
  }
  if (source.sandboxMode !== true || source.productionExplicitlyDenied !== true) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_OPERATIONS_RESOURCE_INVALID', 'Sandbox mode and explicit production denial are required.', 422);
  }
  return Object.freeze({
    stagingProjectId: identifier(source.stagingProjectId, 'stagingProjectId', 100),
    migrationIds: Object.freeze(migrationIds),
    schedulerJobId: identifier(source.schedulerJobId, 'schedulerJobId', 120),
    metricsSinkId: identifier(source.metricsSinkId, 'metricsSinkId', 120),
    alertDeliveryIntegrationId: identifier(source.alertDeliveryIntegrationId, 'alertDeliveryIntegrationId', 120),
    runbookVersion: identifier(source.runbookVersion, 'runbookVersion', 80),
    maximumBudgetMinor: 0,
    sandboxMode: true,
    productionExplicitlyDenied: true
  });
}

function normalizeOperator(value) {
  const source = plainObject(value, 'Operator identity is required.');
  return Object.freeze({
    id: identifier(source.id, 'operator.id', 160),
    role: enumValue(source.role, 'operator.role', OPERATOR_ROLES)
  });
}

function runbookActions(priority) {
  const shared = ['acknowledge_alert', 'preserve_sanitized_evidence', 'verify_case_revision_and_lease', 'compare_provider_and_doke_snapshots'];
  if (priority === 'P0') return [...shared, 'escalate_admin_and_finance_immediately', 'recommend_freeze_of_financial_automation', 'open_incident_bridge', 'prepare_approved_customer_communication', 'require_post_incident_review'];
  if (priority === 'P1') return [...shared, 'escalate_admin_and_on_call', 'recommend_targeted_financial_automation_freeze', 'verify_provider_incident_status', 'require_post_incident_review'];
  if (priority === 'P2') return [...shared, 'triage_within_operational_sla', 'monitor_recurrence', 'document_resolution'];
  return [...shared, 'process_in_normal_queue', 'document_resolution'];
}

function normalizeBackoff(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 10) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_POLICY_INVALID', 'Backoff policy must contain 2 to 10 steps.', 422);
  }
  const result = value.map((item, index) => boundedInteger(item, `backoffSeconds[${index}]`, 1, 86400));
  for (let index = 1; index < result.length; index += 1) {
    if (result[index] < result[index - 1]) {
      throw contractError('DOKE_PAYMENT_RECONCILIATION_SCHEDULER_POLICY_INVALID', 'Backoff policy must be monotonic.', 422);
    }
  }
  return result;
}

function uniqueStrings(value, field, maxLength) {
  if (!Array.isArray(value)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be an array.`, 422);
  return [...new Set(value.map((item) => identifier(item, field, maxLength)))];
}

function uniqueCodes(value) {
  if (!Array.isArray(value)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', 'divergenceCodes must be an array.', 422);
  return [...new Set(value.map((item) => codeValue(item, 'divergenceCode')))];
}

function codeValue(value, field) {
  const text = String(value == null ? '' : value).trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,79}$/.test(text)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} is invalid.`, 422);
  return text;
}

function identifier(value, field, maxLength) {
  const text = String(value == null ? '' : value).trim();
  if (!text || text.length > maxLength || /[\u0000-\u001f\u007f]/.test(text)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} is invalid.`, 422);
  }
  return text;
}

function enumValue(value, field, allowed) {
  const text = String(value == null ? '' : value).trim();
  if (!allowed.includes(text)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} is invalid.`, 422);
  return text;
}

function boundedInteger(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be an integer from ${minimum} to ${maximum}.`, 422);
  }
  return number;
}

function nonNegativeInteger(value, field) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be a non-negative integer.`, 422);
  return number;
}

function finiteNonNegative(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be a non-negative number.`, 422);
  return number;
}

function isoDate(value, field) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be an ISO timestamp.`, 422);
  return new Date(timestamp).toISOString();
}

function gitHead(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!isGitHead(text)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', 'exactGitHead must be a 40-character commit SHA.', 422);
  return text;
}

function sha256Hex(value, field) {
  const text = String(value || '').trim().toLowerCase();
  if (!isSha256(text)) throw contractError('DOKE_PAYMENT_RECONCILIATION_FIELD_INVALID', `${field} must be SHA-256 hex.`, 422);
  return text;
}

function isGitHead(value) { return /^[a-f0-9]{40}$/.test(String(value || '').trim().toLowerCase()); }
function isSha256(value) { return /^[a-f0-9]{64}$/.test(String(value || '').trim().toLowerCase()); }

function plainObject(value, message) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw contractError('DOKE_PAYMENT_RECONCILIATION_INPUT_INVALID', message, 422);
  }
  return value;
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  STORE_CONTRACT_VERSION,
  SCHEDULER_CONTRACT_VERSION,
  OBSERVABILITY_CONTRACT_VERSION,
  STAGING_SCOPE,
  STAGING_PHRASE,
  MAX_AUTHORIZATION_AGE_SECONDS,
  REQUIRED_STORE_METHODS,
  ALLOWED_METRICS,
  ALLOWED_METRIC_LABELS,
  PROHIBITED_METRIC_LABELS,
  ALERT_PRIORITIES,
  REQUIRED_RUNBOOK_SECTIONS,
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
});
