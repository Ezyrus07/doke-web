'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A06 audit failed: ' + message);
};

const MODULE_PATH = 'backend/modules/payments/payment-provider-selection-handoff.js';
const CONFIG_PATH = 'config/pay-001-a06-provider-selection-legal-handoff.json';
const DOC_PATH = 'docs/PAY-001-A06-PROVIDER-SELECTION-LEGAL-HANDOFF.md';
const EVIDENCE_PATH = 'docs/validation/PAY-001-A06-PROVIDER-SELECTION-LEGAL-HANDOFF.json';
const AUDIT_PATH = 'scripts/audit-pay-001-a06-provider-selection-legal-handoff.js';
const TEST_PATH = 'scripts/test-pay-001-a06-provider-selection-legal-handoff.js';
const WORKFLOW_PATH = '.github/workflows/pay-001-a06-provider-selection-legal-handoff.yml';

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

assert(config.contractVersion === 'pay-a06-provider-selection-legal-handoff-v1', 'contract version mismatch');
assert(config.status === 'repository_only_decision_handoff_ready_provider_unselected_staging_blocked', 'status must remain repository-only and blocked');
assert(config.provider.candidateId === null, 'no candidate may be bound by the repository');
assert(config.provider.selected === false && config.provider.contracted === false, 'provider must remain unselected and uncontracted');
assert(config.provider.accountCreated === false && config.provider.billingAuthorized === false, 'account and billing authority must remain absent');
assert(config.provider.credentialsConfigured === false && config.provider.webhookRegistered === false, 'credentials and webhook must remain absent');
assert(config.provider.sandboxConformanceExecuted === false && config.provider.productionAllowed === false, 'sandbox execution and production must remain denied');

assert(config.decisionPacket.contractVersion === 'pay-provider-selection-handoff-v1', 'decision packet contract mismatch');
assert(config.decisionPacket.automaticSelectionAllowed === false, 'automatic selection must be prohibited');
assert(config.decisionPacket.advisoryScoreMaySelectProvider === false, 'score may not select a provider');
assert(config.decisionPacket.immutablePacketVersionRequired === true, 'immutable packet version required');
assert(config.decisionPacket.exactGitHeadRequired === true && config.decisionPacket.fingerprintRequired === true, 'head and fingerprint binding required');
assert(config.decisionPacket.requiredApprovals.join(',') === 'legal,accounting_tax,finance_treasury,security_privacy,product_operations', 'approval roles drifted');
assert(config.decisionPacket.minimumDistinctApprovers === 3, 'separation of duties requirement missing');
assert(config.decisionPacket.qualifiedExternalReviewStillRequired === true, 'qualified external review disclaimer missing');

assert(config.selectionAuthorization.phrase === 'I_EXPLICITLY_SELECT_PSP_CANDIDATE_FOR_DOKE_STAGING_ADAPTER_PREPARATION', 'selection phrase mismatch');
assert(config.selectionAuthorization.scope === 'provider_specific_adapter_preparation_only', 'selection scope mismatch');
assert(config.selectionAuthorization.genericContinuationAuthorizesSelection === false, 'generic continuation must not select');
assert(config.selectionAuthorization.oneShot === true && config.selectionAuthorization.freshnessSeconds === 900, 'selection authorization freshness/one-shot missing');
assert(config.selectionAuthorization.remoteActionsAllowedByRepositoryContract === false, 'selection contract must not execute remote actions');
assert(config.selectionAuthorization.productionAllowed === false, 'selection must deny production');
['provider_account_creation', 'billing_or_paid_plan', 'provider_api_or_cli_calls', 'migration_application', 'deployment', 'production_change'].forEach((effect) => {
  assert(config.selectionAuthorization.doesNotAuthorize.includes(effect), 'selection prohibition missing: ' + effect);
});

assert(config.stagingAuthorization.phrase === 'I_EXPLICITLY_AUTHORIZE_PAY_A06_PROVIDER_SANDBOX_CONFORMANCE_ON_DOKE_STAGING', 'staging phrase mismatch');
assert(config.stagingAuthorization.scope === 'provider_sandbox_conformance_only', 'staging scope mismatch');
assert(config.stagingAuthorization.selectionMustExistFirst === true, 'selection must precede staging authorization');
assert(config.stagingAuthorization.immutableAdapterVersionRequired === true, 'immutable adapter version required');
assert(config.stagingAuthorization.stagingProjectIdentityRequired === true, 'staging identity required');
assert(config.stagingAuthorization.readinessEvidenceHashRequired === true, 'readiness hash required');
assert(config.stagingAuthorization.sandboxOrZeroBudgetRequired === true, 'sandbox/zero-budget gate required');
assert(config.stagingAuthorization.externalAuthorizedExecutorRequired === true, 'external executor required');
assert(config.stagingAuthorization.remoteActionsAllowedByRepositoryContract === false, 'repository staging execution must remain denied');
assert(config.stagingAuthorization.productionExplicitlyDenied === true, 'production denial required');
assert(config.stagingAuthorization.repositoryExecutionPerformed === false, 'repository must not claim execution');

assert(config.currentBlockers.join(',') === 'PAY-B01,PAY-B03,PAY-B04', 'blockers changed unexpectedly');
Object.entries(config.effects).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'effect must remain zero/false: ' + key);
});

[
  "const CONTRACT_VERSION = 'pay-provider-selection-handoff-v1'",
  "const SELECTION_SCOPE = 'provider_specific_adapter_preparation_only'",
  "const STAGING_SCOPE = 'provider_sandbox_conformance_only'",
  'automaticSelectionAllowed: false',
  'scoreMaySelectProvider: false',
  'DOKE_PAYMENT_PROVIDER_SELECTION_BLOCKED',
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID',
  'DOKE_PAYMENT_PROVIDER_AUTHORIZATION_REPLAYED',
  'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID',
  'remoteActionsAllowedByThisContract: false',
  'requiresExternalAuthorizedExecutor: true',
  'repositoryExecutionPerformed: false'
].forEach((fragment) => assert(moduleSource.includes(fragment), 'module contract missing: ' + fragment));

[
  'Próximo',
  'não seleciona',
  'não autoriza',
  'qualified',
  'I_EXPLICITLY_SELECT_PSP_CANDIDATE_FOR_DOKE_STAGING_ADAPTER_PREPARATION',
  'I_EXPLICITLY_AUTHORIZE_PAY_A06_PROVIDER_SANDBOX_CONFORMANCE_ON_DOKE_STAGING',
  'PAY-B01',
  'PAY-B03',
  'PAY-B04',
  'PAY-A07'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'validation status mismatch');
assert(evidence.provider.selected === false && evidence.provider.contracted === false, 'validation must preserve provider boundary');
assert(evidence.validated.advisoryScoreCannotSelect === true, 'score protection evidence missing');
assert(evidence.validated.genericContinuationRejected === true, 'generic continuation evidence missing');
assert(evidence.validated.selectionOneShotReplayBlocked === true, 'selection replay evidence missing');
assert(evidence.validated.stagingAuthorizationOneShotReplayBlocked === true, 'staging replay evidence missing');
assert(evidence.validated.repositoryRemoteAuthorityAbsent === true, 'remote authority denial evidence missing');
Object.entries(evidence.execution).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'validation execution effect must remain zero/false: ' + key);
});

const combined = [moduleSource, JSON.stringify(config), docs, JSON.stringify(evidence)].join('\n').toLowerCase();
['stripe', 'adyen', 'mercadopago', 'mercado pago', 'pagarme', 'asaas'].forEach((providerName) => {
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'named provider dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a06-provider-selection-legal-handoff'] === 'node scripts/audit-pay-001-a06-provider-selection-legal-handoff.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a06-provider-selection-legal-handoff'] === 'node scripts/test-pay-001-a06-provider-selection-legal-handoff.js', 'package runtime command missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.91'), 'matrix version must be at least 1.3.91');
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
assert(pay.tests.includes('audit:pay-001-a06-provider-selection-legal-handoff'), 'matrix A06 audit missing');
assert(pay.tests.includes('test:pay-001-a06-provider-selection-legal-handoff'), 'matrix A06 runtime missing');
assert(pay.evidence.some((item) => item.includes('PAY-A06')), 'matrix A06 evidence missing');
assert(pay.requiredPaths.includes('backend/modules/payments/payment-reconciliation-operations-contract.js'), 'PAY-A07 must remain completed after the handoff');
assert(pay.nextActions[0].includes('PAY-A18'), 'PAY-A18 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A06 workflow must remain read-only');
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

console.log('PAY-A06 provider selection and legal/accounting handoff audit passed.');
