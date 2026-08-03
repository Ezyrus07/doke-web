'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A07 audit failed: ' + message);
};

const MODULE_PATH = 'backend/modules/payments/payment-reconciliation-operations-contract.js';
const CONFIG_PATH = 'config/pay-001-a07-reconciliation-operations-readiness.json';
const DOC_PATH = 'docs/PAY-001-A07-RECONCILIATION-OPERATIONS-READINESS.md';
const EVIDENCE_PATH = 'docs/validation/PAY-001-A07-RECONCILIATION-OPERATIONS-READINESS.json';
const AUDIT_PATH = 'scripts/audit-pay-001-a07-reconciliation-operations-readiness.js';
const TEST_PATH = 'scripts/test-pay-001-a07-reconciliation-operations-readiness.js';
const WORKFLOW_PATH = '.github/workflows/pay-001-a07-reconciliation-operations-readiness.yml';

[MODULE_PATH, CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, AUDIT_PATH, TEST_PATH, WORKFLOW_PATH].forEach((file) => {
  assert(fs.existsSync(path.join(root, file)), 'missing required asset: ' + file);
});

const moduleSource = read(MODULE_PATH);
const config = readJson(CONFIG_PATH);
const docs = read(DOC_PATH);
const evidence = readJson(EVIDENCE_PATH);
const workflow = read(WORKFLOW_PATH);
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === 'pay-a07-reconciliation-operations-readiness-v1', 'contract version mismatch');
assert(config.status === 'repository_only_reconciliation_operations_contract_ready_remote_infrastructure_blocked', 'status must remain repository-only and infrastructure-blocked');
assert(config.provider.selected === false && config.provider.contracted === false, 'provider must remain unselected and uncontracted');
assert(config.provider.accountCreated === false && config.provider.credentialsConfigured === false, 'provider account and credentials must remain absent');
assert(config.provider.webhookRegistered === false && config.provider.sandboxConformanceExecuted === false, 'webhook and sandbox conformance must remain absent');
assert(config.provider.productionAllowed === false, 'production must remain denied');

assert(config.operationsContract.contractVersion === 'pay-reconciliation-operations-v1', 'operations contract mismatch');
assert(config.operationsContract.storeContractVersion === 'pay-reconciliation-store-v1', 'store contract mismatch');
assert(config.operationsContract.schedulerContractVersion === 'pay-reconciliation-scheduler-v1', 'scheduler contract mismatch');
assert(config.operationsContract.observabilityContractVersion === 'pay-reconciliation-observability-v1', 'observability contract mismatch');
assert(config.operationsContract.providerNeutral === true, 'operations must remain provider-neutral');
assert(config.operationsContract.serverOnly === true && config.operationsContract.browserAccess === false, 'operations must remain server-only');
assert(config.operationsContract.remoteInfrastructureConfigured === false, 'remote infrastructure must remain unconfigured');
assert(config.operationsContract.repositoryMayExecuteRemoteActions === false, 'repository may not execute remote actions');
assert(config.operationsContract.directMoneyMutationAllowed === false, 'direct money mutation must remain denied');
assert(config.operationsContract.automaticResolutionAllowed === false, 'automatic resolution must remain denied');

const expectedStoreMethods = [
  'getByCaseKey', 'getById', 'insert', 'update', 'claimDueCases', 'renewLease',
  'completeLease', 'appendAuditEvent', 'enqueueAlertOutbox', 'recordMetricRollup'
];
assert(JSON.stringify(config.persistence.requiredMethods) === JSON.stringify(expectedStoreMethods), 'store method list drifted');
assert(config.persistence.configured === false && config.persistence.migrationApplied === false, 'persistence must remain unconfigured');
assert(config.persistence.optimisticConcurrencyRequired === true, 'optimistic concurrency is required');
assert(config.persistence.databaseCompareAndSwapRequired === true, 'database compare-and-swap is required');
assert(config.persistence.appendOnlyAuditRequired === true, 'append-only audit is required');
assert(config.persistence.alertOutboxAtomicWithCaseUpdate === true, 'alert outbox must be atomic with the case update');
assert(config.persistence.rawProviderPayloadStored === false && config.persistence.rawCardDataStored === false, 'raw provider/card data must remain absent');
assert(config.persistence.retentionPolicy.rawProviderPayloadRetentionDays === 0, 'raw provider payload retention must be zero');

assert(config.scheduler.enabled === false, 'scheduler must remain disabled');
assert(config.scheduler.timezone === 'UTC' && config.scheduler.clockAuthority === 'database', 'scheduler clock boundary drifted');
assert(config.scheduler.overlapPolicy === 'deny', 'scheduler overlap must be denied');
assert(config.scheduler.batchSize === 25 && config.scheduler.leaseSeconds === 120 && config.scheduler.heartbeatSeconds === 30, 'scheduler baseline drifted');
assert(config.scheduler.idempotentProcessingRequired === true, 'idempotent processing is required');
assert(config.scheduler.staleLeaseTakeoverRequiresExpiry === true, 'stale lease takeover must require expiry');
assert(config.scheduler.exactOnceDeliveryAssumed === false, 'exactly-once delivery must not be assumed');

assert(config.metrics.sinkConfigured === false && config.metrics.remoteWritePerformed === false, 'metrics sink must remain unconfigured');
assert(config.metrics.lowCardinalityRequired === true, 'metrics must remain low-cardinality');
['order_id', 'payment_id', 'case_id', 'provider_intent_id', 'event_id', 'email', 'phone', 'cpf', 'cnpj'].forEach((label) => {
  assert(config.metrics.prohibitedLabels.includes(label), 'missing prohibited metric label: ' + label);
});
assert(config.metrics.rawFinancialIdentifiersAllowed === false, 'raw financial identifiers must remain forbidden');

assert(config.alerts.deliveryConfigured === false && config.alerts.outboxOnly === true, 'alerts must remain outbox-only');
assert(config.alerts.atomicOutboxWriteRequired === true, 'atomic alert outbox write is required');
assert(config.alerts.directNotificationSendAllowed === false, 'direct notification sends must remain forbidden');
assert(config.alerts.rawProviderPayloadAllowed === false && config.alerts.rawCardDataAllowed === false, 'raw alert payloads must remain forbidden');

assert(config.incidentRunbook.approved === false, 'runbook must not claim approval');
assert(config.incidentRunbook.requiredSections.length === 8, 'runbook section inventory drifted');
assert(config.incidentRunbook.automaticFreezeAllowed === false, 'automatic freeze must remain denied');
assert(config.incidentRunbook.automaticResolutionAllowed === false, 'automatic resolution must remain denied');
assert(config.incidentRunbook.automaticMoneyMutationAllowed === false, 'automatic money mutation must remain denied');
assert(config.incidentRunbook.qualifiedHumanDecisionRequired === true, 'qualified human decision is required');

assert(config.stagingAuthorization.phrase === 'I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING', 'staging phrase mismatch');
assert(config.stagingAuthorization.scope === 'reconciliation_operations_canary_only', 'staging scope mismatch');
assert(config.stagingAuthorization.currentReady === false, 'staging readiness must remain blocked');
assert(config.stagingAuthorization.genericContinuationAuthorizesStaging === false, 'generic continuation must not authorize staging');
assert(config.stagingAuthorization.oneShot === true && config.stagingAuthorization.freshnessSeconds === 900, 'one-shot/freshness gate missing');
assert(config.stagingAuthorization.externalAuthorizedExecutorRequired === true, 'external executor is required');
assert(config.stagingAuthorization.remoteActionsAllowedByRepositoryContract === false, 'repository remote authority must remain absent');
assert(config.stagingAuthorization.repositoryExecutionPerformed === false, 'repository must not claim execution');

assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed unexpectedly');
Object.entries(config.effects).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'effect must remain zero/false: ' + key);
});

[
  "const CONTRACT_VERSION = 'pay-reconciliation-operations-v1'",
  "const STORE_CONTRACT_VERSION = 'pay-reconciliation-store-v1'",
  "const SCHEDULER_CONTRACT_VERSION = 'pay-reconciliation-scheduler-v1'",
  "const OBSERVABILITY_CONTRACT_VERSION = 'pay-reconciliation-observability-v1'",
  "const STAGING_SCOPE = 'reconciliation_operations_canary_only'",
  "const STAGING_PHRASE = 'I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING'",
  'DOKE_PAYMENT_RECONCILIATION_STORE_METHOD_MISSING',
  'DOKE_PAYMENT_RECONCILIATION_SCHEDULER_NOT_AUTHORIZED',
  'DOKE_PAYMENT_RECONCILIATION_METRIC_CARDINALITY_INVALID',
  'DOKE_PAYMENT_RECONCILIATION_RUNBOOK_INCOMPLETE',
  'DOKE_PAYMENT_RECONCILIATION_OPERATIONS_AUTHORIZATION_REPLAYED',
  'remoteActionsAllowedByThisContract: false',
  'repositoryExecutionPerformed: false',
  'directMoneyMutationAllowed: false'
].forEach((fragment) => assert(moduleSource.includes(fragment), 'module contract missing: ' + fragment));

[
  'Próximo',
  'não seleciona',
  'não conecta',
  'não executa staging',
  'compare-and-swap',
  'cardinalidade',
  'outbox',
  'P0',
  'I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING',
  'PAY-B01',
  'PAY-B03',
  'PAY-B04',
  'PAY-A08'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'validation status mismatch');
assert(evidence.provider.selected === false && evidence.provider.contracted === false, 'validation must preserve provider boundary');
assert(evidence.validated.serverOnlyStoreRequired === true, 'server-only store evidence missing');
assert(evidence.validated.databaseLeaseCompareAndSwapRequired === true, 'lease CAS evidence missing');
assert(evidence.validated.lowCardinalityMetricsEnforced === true, 'metric cardinality evidence missing');
assert(evidence.validated.sanitizedAtomicAlertOutboxRequired === true, 'alert outbox evidence missing');
assert(evidence.validated.genericContinuationRejected === true, 'generic continuation evidence missing');
assert(evidence.validated.stagingAuthorizationReplayBlocked === true, 'authorization replay evidence missing');
assert(evidence.validated.repositoryRemoteAuthorityAbsent === true, 'repository authority denial evidence missing');
Object.entries(evidence.execution).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'validation execution effect must remain zero/false: ' + key);
});

const combined = [moduleSource, JSON.stringify(config), docs, JSON.stringify(evidence)].join('\n').toLowerCase();
['stripe', 'adyen', 'mercadopago', 'mercado pago', 'pagarme', 'asaas'].forEach((providerName) => {
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'named provider dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a07-reconciliation-operations-readiness'] === 'node scripts/audit-pay-001-a07-reconciliation-operations-readiness.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a07-reconciliation-operations-readiness'] === 'node scripts/test-pay-001-a07-reconciliation-operations-readiness.js', 'package runtime command missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.92'), 'matrix version must be at least 1.3.92');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');

[MODULE_PATH, CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, AUDIT_PATH, TEST_PATH, WORKFLOW_PATH].forEach((requiredPath) => {
  assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath);
});
assert(pay.tests.includes('audit:pay-001-a07-reconciliation-operations-readiness'), 'matrix A07 audit missing');
assert(pay.tests.includes('test:pay-001-a07-reconciliation-operations-readiness'), 'matrix A07 runtime missing');
assert(pay.evidence.some((item) => item.includes('PAY-A07')), 'matrix A07 evidence missing');
assert(pay.nextActions[0].includes('PAY-A08'), 'PAY-A08 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A07 workflow must remain read-only');
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  'supabase functions deploy',
  'supabase db push',
  'git push',
  '--execute'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A07 reconciliation operations readiness audit passed.');
