'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A05 audit failed: ' + message);
};

const config = readJson('config/pay-001-a05-adapter-conformance-readiness.json');
const conformance = read('backend/modules/payments/payment-provider-adapter-conformance.js');
const explicitContract = read('backend/modules/payments/payment-provider-adapter-contract.js');
const readiness = read('backend/modules/payments/payment-staging-readiness.js');
const workflow = read('.github/workflows/pay-001-a05-adapter-conformance-readiness.yml');
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === 'pay-a05-adapter-conformance-readiness-v1', 'contract version mismatch');
assert(config.status === 'repository_only_psp_neutral_conformance_ready_staging_blocked', 'status must remain repository-only and staging-blocked');
assert(config.provider.selected === false && config.provider.adapterActivated === false, 'provider must remain unselected/inactive');
assert(config.provider.webhookRegistered === false && config.provider.secretConfigured === false, 'webhook authority must remain absent');
assert(config.adapterHarness.contractVersion === 'pay-provider-adapter-v1', 'adapter contract version mismatch');
assert(config.adapterHarness.harnessVersion === 'pay-provider-adapter-conformance-v1', 'harness version mismatch');
assert(config.adapterHarness.fixtureOnly === true && config.adapterHarness.networkAccess === false, 'harness must remain fixture-only and offline');
assert(config.adapterHarness.externalProviderCalls === 0, 'external provider calls must remain zero');
assert(config.adapterHarness.requiredCurrency === 'BRL', 'required currency mismatch');
assert(config.adapterHarness.requiredCaptureStrategy === 'authorize_then_hold', 'capture strategy mismatch');
assert(config.adapterHarness.explicitContract.requiredMethods.includes('checkHealth'), 'explicit health method missing');
assert(config.adapterHarness.explicitContract.requiredMethods.includes('getPaymentIntent'), 'explicit query method missing');
assert(config.adapterHarness.explicitContract.requiredMethods.includes('normalizeIntentAcknowledgement'), 'explicit acknowledgement method missing');
assert(config.adapterHarness.explicitContract.financialCapabilities.includes('refund_partial'), 'partial refund capability missing');
assert(config.adapterHarness.explicitContract.financialCapabilities.includes('chargeback'), 'chargeback capability missing');
assert(config.adapterHarness.explicitContract.requiredScenarios.includes('uuid_local_mutation_fallback_denied'), 'UUID fallback denial scenario missing');

assert(config.stagingReadiness.currentReady === false, 'staging readiness must remain blocked');
assert(config.stagingReadiness.failClosed === true, 'staging readiness must fail closed');
assert(config.stagingReadiness.exactHeadRequired === true, 'exact head gate missing');
assert(config.stagingReadiness.providerSelectionRequired === true, 'provider selection gate missing');
assert(config.stagingReadiness.legalAccountingApprovalRequired === true, 'legal/accounting gate missing');
assert(config.stagingReadiness.featureFlagsMustRemainDisabled === true, 'feature flag freeze missing');
assert(config.stagingReadiness.freshOneShotAuthorizationRequired === true, 'one-shot authorization gate missing');
assert(config.stagingReadiness.repositoryContractMayExecuteRemoteActions === false, 'repository contract must not execute remote actions');

Object.entries(config.effects).forEach(([key, value]) => {
  assert(value === 0 || value === false, 'effect must remain zero/false: ' + key);
});

[
  "const ADAPTER_CONTRACT_VERSION = 'pay-provider-adapter-v1'",
  "const HARNESS_VERSION = 'pay-provider-adapter-conformance-v1'",
  "'getManifest'",
  "'createPaymentIntent'",
  "'normalizeWebhookEvent'",
  "'fetchPaymentSnapshot'",
  "'classifyError'",
  'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT',
  'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED',
  'compareReconciliationSnapshots',
  'externalNetworkCalls: 0',
  'remoteMutations: 0',
  'moneyEffects: 0'
].forEach((fragment) => assert(conformance.includes(fragment), 'conformance contract missing: ' + fragment));

[
  "const CONTRACT_VERSION = 'pay-provider-adapter-v1'",
  "'checkHealth'",
  "'getPaymentIntent'",
  "'normalizeIntentAcknowledgement'",
  "'refund_partial'",
  "'chargeback'",
  'DOKE_PAYMENT_ADAPTER_CAPABILITY_UNSUPPORTED',
].forEach((fragment) => assert(explicitContract.includes(fragment), 'explicit adapter contract missing: ' + fragment));

[
  "const READINESS_CONTRACT_VERSION = 'pay-staging-readiness-v1'",
  "'providerSelectionApproved'",
  "'legalAccountingApproved'",
  "'explicitOneShotStagingAuthorization'",
  'readyForAuthorizedStagingExecution: ready',
  'remoteActionsAllowedByThisContract: false',
  'DOKE_PAYMENT_STAGING_READINESS_BLOCKED',
  'requiresExternalAuthorizedExecutor: true',
  "remoteMutationAuthority: 'none_in_repository_contract'",
  'DOKE_PAYMENT_STAGING_AUTHORIZATION_INVALID'
].forEach((fragment) => assert(readiness.includes(fragment), 'readiness contract missing: ' + fragment));

const combined = [conformance, explicitContract, readiness, JSON.stringify(config)].join('\n').toLowerCase();
['stripe', 'adyen', 'mercadopago', 'mercado pago', 'pagarme', 'asaas'].forEach((providerName) => {
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'provider-specific dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a05-adapter-conformance-readiness'] === 'node scripts/audit-pay-001-a05-adapter-conformance-readiness.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a05-adapter-conformance-readiness'] === 'node scripts/test-pay-001-a05-adapter-conformance-readiness.js', 'package runtime command missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.90'), 'matrix version must be at least 1.3.90');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');

[
  'backend/modules/payments/payment-provider-adapter-conformance.js',
  'backend/modules/payments/payment-provider-adapter-contract.js',
  'backend/modules/payments/payment-staging-readiness.js',
  'config/pay-001-a05-adapter-conformance-readiness.json',
  'docs/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.md',
  'docs/validation/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.json',
  'scripts/audit-pay-001-a05-adapter-conformance-readiness.js',
  'scripts/test-pay-001-a05-adapter-conformance-readiness.js',
  'scripts/audit-pay-001-a05-adapter-contract.js',
  'scripts/test-pay-001-a05-adapter-contract.js',
  '.github/workflows/pay-001-a05-adapter-conformance-readiness.yml'
].forEach((requiredPath) => assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(pay.tests.includes('audit:pay-001-a05-adapter-conformance-readiness'), 'matrix A05 audit missing');
assert(pay.tests.includes('test:pay-001-a05-adapter-conformance-readiness'), 'matrix A05 runtime missing');
assert(pay.evidence.some((item) => item.includes('PAY-A05')), 'PAY-A05 evidence missing');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A05 workflow must remain read-only');
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  'supabase functions deploy',
  'supabase db push',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A05 adapter conformance and staging readiness audit passed.');
