'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A05 audit failed: ' + message);
};

const config = readJson('config/pay-001-a05-adapter-conformance-readiness.json');
const conformance = read('backend/modules/payments/payment-provider-adapter-conformance.js');
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
assert(config.adapterHarness.fixtureOnly === true && config.adapterHarness.networkAccess === false, 'harness must remain local fixture-only');
assert(config.adapterHarness.externalProviderCalls === 0, 'external provider calls must remain zero');
assert(config.adapterHarness.requiredMethods.join(',') === 'getManifest,createPaymentIntent,normalizeWebhookEvent,fetchPaymentSnapshot,classifyError', 'required adapter methods changed');
assert(config.adapterHarness.requiredCurrency === 'BRL', 'required currency mismatch');
assert(config.adapterHarness.requiredCaptureStrategy === 'authorize_then_hold', 'capture strategy mismatch');
assert(config.stagingReadiness.currentReady === false, 'staging readiness must remain blocked');
assert(config.stagingReadiness.failClosed === true, 'staging readiness must fail closed');
assert(config.stagingReadiness.exactHeadRequired === true, 'exact head gate missing');
assert(config.stagingReadiness.providerSelectionRequired === true, 'provider selection gate missing');
assert(config.stagingReadiness.legalAccountingApprovalRequired === true, 'legal/accounting gate missing');
assert(config.stagingReadiness.featureFlagsMustRemainDisabled === true, 'feature flag freeze missing');
assert(config.stagingReadiness.freshOneShotAuthorizationRequired === true, 'one-shot authorization gate missing');
assert(config.stagingReadiness.repositoryContractMayExecuteRemoteActions === false, 'repository contract must not execute remote actions');

assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.migrationsApplied === 0 && config.effects.edgeFunctionsDeployed === 0, 'deploy effects must be zero');
assert(config.effects.providerAccountsCreated === 0 && config.effects.webhooksRegistered === 0 && config.effects.secretsCreated === 0, 'provider setup effects must be zero');
assert(config.effects.adapterSandboxRuns === 0, 'external sandbox runs must be zero');
assert(config.effects.paymentsCreated === 0 && config.effects.refundsCreated === 0 && config.effects.payoutsCreated === 0, 'money effects must be zero');
assert(config.effects.productionChanged === false && config.effects.pullRequestMerged === false, 'production and merge effects must remain false');

assert(conformance.includes("const ADAPTER_CONTRACT_VERSION = 'pay-provider-adapter-v1'"), 'adapter contract version missing');
assert(conformance.includes("const HARNESS_VERSION = 'pay-provider-adapter-conformance-v1'"), 'harness version missing');
assert(conformance.includes("'getManifest'"), 'manifest method missing');
assert(conformance.includes("'createPaymentIntent'"), 'intent method missing');
assert(conformance.includes("'normalizeWebhookEvent'"), 'webhook normalization method missing');
assert(conformance.includes("'fetchPaymentSnapshot'"), 'snapshot method missing');
assert(conformance.includes("'classifyError'"), 'error classification method missing');
assert(conformance.includes('assertNoSensitivePaymentData(firstRaw'), 'sensitive acknowledgement guard missing');
assert(conformance.includes('DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT'), 'intent drift negative case missing');
assert(conformance.includes('DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED'), 'verified webhook negative case missing');
assert(conformance.includes('compareReconciliationSnapshots'), 'snapshot reconciliation missing');
assert(conformance.includes('externalNetworkCalls: 0'), 'zero-network evidence missing');
assert(conformance.includes('remoteMutations: 0'), 'zero-remote-mutation evidence missing');
assert(conformance.includes('moneyEffects: 0'), 'zero-money evidence missing');
assert(conformance.includes('verified_provider_events_only'), 'settlement authority contract missing');
assert(conformance.includes('server_runtime_only'), 'server-only secret contract missing');

assert(readiness.includes("const READINESS_CONTRACT_VERSION = 'pay-staging-readiness-v1'"), 'readiness contract version missing');
assert(readiness.includes("'providerSelectionApproved'"), 'provider selection readiness gate missing');
assert(readiness.includes("'legalAccountingApproved'"), 'legal/accounting readiness gate missing');
assert(readiness.includes("'explicitOneShotStagingAuthorization'"), 'one-shot readiness gate missing');
assert(readiness.includes('readyForAuthorizedStagingExecution: ready'), 'readiness result missing');
assert(readiness.includes('remoteActionsAllowedByThisContract: false'), 'repository remote action denial missing');
assert(readiness.includes('DOKE_PAYMENT_STAGING_READINESS_BLOCKED'), 'blocked readiness error missing');
assert(readiness.includes('requiresExternalAuthorizedExecutor: true'), 'external executor requirement missing');
assert(readiness.includes("remoteMutationAuthority: 'none_in_repository_contract'"), 'repository mutation authority denial missing');
assert(readiness.includes('DOKE_PAYMENT_STAGING_AUTHORIZATION_INVALID'), 'head-pinned one-shot authorization guard missing');

[
  'stripe',
  'adyen',
  'mercadopago',
  'mercado pago',
  'pagarme',
  'asaas'
].forEach((providerName) => {
  const combined = [conformance, readiness, JSON.stringify(config)].join('\n').toLowerCase();
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'provider-specific dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a05-adapter-conformance-readiness'] === 'node scripts/audit-pay-001-a05-adapter-conformance-readiness.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a05-adapter-conformance-readiness'] === 'node scripts/test-pay-001-a05-adapter-conformance-readiness.js', 'package runtime command missing');

assert(matrix.version === '1.3.90', 'matrix version must be 1.3.90');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');

[
  'backend/modules/payments/payment-provider-adapter-conformance.js',
  'backend/modules/payments/payment-staging-readiness.js',
  'config/pay-001-a05-adapter-conformance-readiness.json',
  'docs/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.md',
  'docs/validation/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.json',
  'scripts/audit-pay-001-a05-adapter-conformance-readiness.js',
  'scripts/test-pay-001-a05-adapter-conformance-readiness.js',
  '.github/workflows/pay-001-a05-adapter-conformance-readiness.yml'
].forEach((requiredPath) => assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(pay.tests.includes('audit:pay-001-a05-adapter-conformance-readiness'), 'matrix A05 audit missing');
assert(pay.tests.includes('test:pay-001-a05-adapter-conformance-readiness'), 'matrix A05 runtime missing');
assert(pay.nextActions[0].includes('PAY-A06'), 'PAY-A06 must be the first next action');

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
