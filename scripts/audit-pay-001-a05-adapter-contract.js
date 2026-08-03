'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A05 adapter contract audit failed: ' + message);
};

const contract = read('backend/modules/payments/payment-provider-adapter-contract.js');
const test = read('scripts/test-pay-001-a05-adapter-contract.js');
const config = json('config/pay-001-a05-adapter-conformance-readiness.json');
const workflow = read('.github/workflows/pay-001-a05-adapter-conformance-readiness.yml');
const matrix = json('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
const extension = config.adapterHarness.explicitContract;

assert(contract.includes("const CONTRACT_VERSION = 'pay-provider-adapter-v1'"), 'contract version missing');
[
  'getManifest',
  'checkHealth',
  'createPaymentIntent',
  'getPaymentIntent',
  'normalizeIntentAcknowledgement',
  'normalizeWebhookEvent',
  'fetchPaymentSnapshot',
  'classifyError'
].forEach((method) => assert(contract.includes(`'${method}'`), `required method missing: ${method}`));
[
  'authorize',
  'hold',
  'capture_release',
  'refund_total',
  'refund_partial',
  'cancellation',
  'dispute',
  'chargeback',
  'payout',
  'split',
  'signed_webhooks',
  'idempotency',
  'event_query',
  'settlement_query',
  'reconciliation'
].forEach((capability) => assert(contract.includes(`'${capability}'`), `capability missing: ${capability}`));
assert(contract.includes('DOKE_PAYMENT_ADAPTER_CAPABILITY_UNSUPPORTED'), 'unsupported capability must fail closed');
assert(contract.includes('localUuidMutationFallbackAllowed !== false'), 'UUID local fallback denial missing');
assert(contract.includes("secretResolution !== 'server_runtime_only'"), 'server-only secret boundary missing');
assert(contract.includes("settlementAuthority !== 'verified_provider_events_only'"), 'verified-event settlement boundary missing');
assert(contract.includes('DOKE_PAYMENT_ADAPTER_IMMUTABLE_VERSION_INVALID'), 'immutable adapter version gate missing');
assert(contract.includes('DOKE_PAYMENT_ADAPTER_HEALTH_EFFECT_INVALID'), 'effect-free health gate missing');
assert(contract.includes("'provider_unavailable'"), 'provider unavailable classification missing');
assert(contract.includes("'incomplete_response'"), 'incomplete response classification missing');

[
  'DOKE_PAYMENT_ADAPTER_IDEMPOTENCY_CONFLICT',
  'DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN',
  'DOKE_PAYMENT_WEBHOOK_SIGNATURE_INVALID',
  'DOKE_PAYMENT_WEBHOOK_TIMESTAMP_INVALID',
  'DOKE_PAYMENT_WEBHOOK_RAW_BODY_REQUIRED',
  'DOKE_PAYMENT_ADAPTER_VERIFICATION_REQUIRED',
  'DOKE_PAYMENT_TERMINAL_STATE_CONFLICT',
  'DOKE_PAYMENT_PROVIDER_EVENT_IN_PROGRESS',
  'DOKE_PAYMENT_PROVIDER_EVENT_CONFLICT',
  'automaticMoneyMutationAllowed',
  'automaticResolutionAllowed'
].forEach((fragment) => assert(test.includes(fragment), `extended scenario missing: ${fragment}`));

assert(config.adapterHarness.harnessVersion === 'pay-provider-adapter-conformance-v1', 'base harness version changed');
assert(config.adapterHarness.requiredMethods.join(',') === 'getManifest,createPaymentIntent,normalizeWebhookEvent,fetchPaymentSnapshot,classifyError', 'base required methods changed');
assert(extension && extension.path === 'backend/modules/payments/payment-provider-adapter-contract.js', 'explicit adapter contract path missing');
assert(extension.audit === 'scripts/audit-pay-001-a05-adapter-contract.js', 'explicit audit path missing');
assert(extension.test === 'scripts/test-pay-001-a05-adapter-contract.js', 'extended conformance test path missing');
assert(extension.requiredMethods.length === 8, 'extended required method set incomplete');
assert(extension.financialCapabilities.length === 15, 'capability manifest incomplete');
assert(config.adapterHarness.networkAccess === false, 'network must remain disabled');
assert(config.stagingReadiness.currentReady === false && config.stagingReadiness.failClosed === true, 'staging must remain fail-closed');
assert(config.stagingReadiness.immutableAdapterVersionRequired === true, 'immutable adapter version readiness missing');
assert(config.stagingReadiness.controlledWebhookEndpointRequired === true, 'controlled webhook endpoint readiness missing');
assert(config.stagingReadiness.migrationsAndDeploymentsIdentifiedRequired === true, 'migration/deploy inventory readiness missing');
assert(config.stagingReadiness.syntheticFixturesRequired === true, 'synthetic fixture readiness missing');
assert(config.stagingReadiness.zeroBudgetOrSandboxRequired === true, 'zero-budget/sandbox readiness missing');
assert(config.stagingReadiness.cleanupPlanRequired === true, 'cleanup readiness missing');
assert(config.stagingReadiness.sanitizedEvidenceRequired === true, 'sanitized evidence readiness missing');
assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must remain zero');
assert(config.effects.paymentsCreated === 0 && config.effects.refundsCreated === 0 && config.effects.payoutsCreated === 0, 'money effects must remain zero');

assert(matrix.version === '1.3.90', 'matrix must remain 1.3.90 for A05 hardening');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2/6');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY security/production gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed');

assert(workflow.includes('permissions:\n  contents: read'), 'permanent workflow must use contents: read');
assert(workflow.includes('node scripts/audit-pay-001-a05-adapter-contract.js'), 'extended audit not executed');
assert(workflow.includes('node scripts/test-pay-001-a05-adapter-contract.js'), 'extended test not executed');
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
].forEach((fragment) => assert(!workflow.includes(fragment), `prohibited workflow fragment: ${fragment}`));

console.log('PAY-A05 explicit adapter contract audit passed.');
