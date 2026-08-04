'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A01 audit failed: ' + message);
};

const config = readJson('config/pay-001-a01-authority-baseline.json');
const paymentService = read('assets/js/services/payment-service.js');
const financeRepository = read('assets/js/repositories/finance-repository.js');
const supabaseConfig = read('assets/js/core/supabase-config.js');
const matrix = readJson('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
const workflow = read('.github/workflows/pay-001-a01-authority-baseline.yml');

assert(config.contractVersion === 'pay-a01-authority-baseline-v1', 'contract version mismatch');
assert(config.status === 'repository_only_financial_authority_baseline_frozen_no_psp', 'status must remain repository-only');
assert(config.authority.realMoneyAuthority === 'none', 'real money authority must be none');
assert(config.authority.pspSelected === false, 'PSP must remain unselected');
assert(config.authority.signedWebhookAuthority === false, 'signed webhook authority must remain absent');
assert(config.authority.providerReconciliationOperational === false, 'reconciliation must remain non-operational');
assert(config.authority.browserMayAssertProviderSuccess === false, 'browser must not assert provider success');
assert(config.authority.browserMayStoreRawCardData === false, 'raw card persistence must be forbidden');
assert(config.authority.localSimulationIsProductionAuthority === false, 'local simulation must not be production authority');
assert(config.authority.sandboxAuthority === 'staging_synthetic_only', 'sandbox scope mismatch');
assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.migrationsApplied === 0 && config.effects.edgeFunctionsDeployed === 0, 'remote deployment effects must be zero');
assert(config.effects.paymentsCreated === 0 && config.effects.refundsCreated === 0, 'financial effects must be zero');
assert(config.effects.productionChanged === false, 'production must remain untouched');

assert(paymentService.includes('function shouldUseFinanceSandbox()'), 'sandbox provider decision missing');
assert(paymentService.includes('function shouldUsePaymentsApi()'), 'API provider decision missing');
assert(paymentService.includes('function confirmLocalPayment('), 'local payment orchestration baseline missing');
assert(paymentService.includes('function confirmSandboxPaymentFlow('), 'staging sandbox flow baseline missing');
assert(paymentService.includes("boundary.action('payments', 'confirm'"), 'API payment boundary baseline missing');
assert(paymentService.includes("fallbackProvider: localMutationAllowed && repository ? 'local-mock' : 'unavailable'") || paymentService.includes("fallbackProvider: repository ? 'local-mock' : 'unavailable'"), 'local mock fallback classification missing');
assert(paymentService.includes("activeProvider: activeProvider"), 'provider status projection missing');

assert(financeRepository.includes("var FINANCE_SANDBOX_PROJECT_REF = 'zwkczgewzbsorbrjuzpb'"), 'staging sandbox project guard missing');
assert(financeRepository.includes('function fallbackWalletAction('), 'local wallet fallback baseline missing');
assert(financeRepository.includes("error.code = 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED'"), 'server authority error code missing');
assert(financeRepository.includes("financialServerAuthorityError('materializar recebível')"), 'authenticated receivable materialization guard missing');
assert(financeRepository.includes("financialServerAuthorityError('liberar recebível')"), 'authenticated receivable release guard missing');
assert(financeRepository.includes("authority: 'staging_sandbox'"), 'sandbox authority classification missing');

assert(/paymentsEnabled:\s*true/.test(supabaseConfig), 'payments runtime flag baseline mismatch');
assert(/financeSandboxEnabled:\s*true/.test(supabaseConfig), 'finance sandbox flag baseline mismatch');
assert(supabaseConfig.includes('zwkczgewzbsorbrjuzpb.supabase.co'), 'staging project URL baseline mismatch');

assert(/^1\.3\.(?:8[6-9]|9\d|\d{3,})$/.test(matrix.version), 'matrix version must remain PAY-A01 compatible');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY-001 maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY-001 UI authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY-001 server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY-001 evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY-001 gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');
[
  'config/pay-001-a01-authority-baseline.json',
  'docs/PAY-001-A01-AUTHORITY-BASELINE.md',
  'docs/validation/PAY-001-A01-AUTHORITY-BASELINE.json',
  'scripts/audit-pay-001-a01-authority-baseline.js',
  'scripts/test-pay-001-a01-authority-baseline.js',
  '.github/workflows/pay-001-a01-authority-baseline.yml'
].forEach((requiredPath) => assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(pay.tests.includes('audit:pay-001-a01-authority-baseline'), 'matrix audit command missing');
assert(pay.tests.includes('test:pay-001-a01-authority-baseline'), 'matrix runtime command missing');
assert(pay.nextActions.some((item) => item.includes('PAY-A02')) || pay.requiredPaths.includes('config/pay-001-a02-authenticated-authority-boundary.json'), 'PAY-A02 must remain represented');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A01 workflow must remain read-only');
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

console.log('PAY-A01 financial authority baseline audit passed.');
