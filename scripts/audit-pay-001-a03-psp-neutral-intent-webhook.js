'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A03 audit failed: ' + message);
};

const config = readJson('config/pay-001-a03-psp-neutral-intent-webhook.json');
const intentContract = read('backend/modules/payments/payment-provider-contract.js');
const webhookContract = read('backend/modules/payments/provider-webhook-contract.js');
const eventLedger = read('backend/modules/payments/provider-event-ledger.js');
const workflow = read('.github/workflows/pay-001-a03-psp-neutral-intent-webhook.yml');
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === 'pay-a03-psp-neutral-intent-webhook-v1', 'contract version mismatch');
assert(config.status === 'repository_only_psp_neutral_contract_ready_provider_unselected', 'status must remain repository-only');
assert(config.provider.selected === false, 'provider must remain unselected');
assert(config.provider.adapterActivated === false, 'provider adapter must remain inactive');
assert(config.provider.webhookRegistered === false, 'webhook must remain unregistered');
assert(config.provider.secretConfigured === false, 'webhook secret must remain unconfigured');
assert(config.paymentIntent.authority === 'server_only', 'payment intent authority must remain server-only');
assert(config.paymentIntent.browserMayAssertSettlement === false, 'browser must not assert settlement');
assert(config.paymentIntent.rawCardDataAllowed === false, 'raw card data must remain forbidden');
assert(config.signedWebhook.algorithm === 'hmac_sha256', 'signature algorithm mismatch');
assert(config.signedWebhook.verifyBeforeJsonParse === true, 'signature must be verified before JSON parsing');
assert(config.eventLedger.table === 'api_idempotency_keys', 'existing persistent idempotency table must be reused');
assert(config.eventLedger.actorId === null, 'provider event ledger actor must remain server-owned/null');
assert(config.eventLedger.payloadDrift === 'reject_conflict', 'payload drift must fail closed');
assert(config.eventOrdering.outOfOrder === 'defer_without_state_mutation', 'out-of-order policy mismatch');
assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.migrationsApplied === 0 && config.effects.edgeFunctionsDeployed === 0, 'deployment effects must be zero');
assert(config.effects.pspAccountsCreated === 0 && config.effects.webhooksRegistered === 0 && config.effects.secretsCreated === 0, 'provider effects must be zero');
assert(config.effects.paymentsCreated === 0 && config.effects.refundsCreated === 0 && config.effects.payoutsCreated === 0, 'money effects must be zero');
assert(config.effects.productionChanged === false && config.effects.pullRequestMerged === false, 'production and merge effects must be false');

assert(intentContract.includes("const CONTRACT_VERSION = 'pay-provider-contract-v1'"), 'intent contract version missing');
assert(intentContract.includes("captureStrategy: 'authorize_then_hold'"), 'capture strategy missing');
assert(intentContract.includes("state: 'requires_provider'"), 'provider-unselected initial state missing');
assert(intentContract.includes('browserMayAssertProviderSuccess: false'), 'browser settlement denial missing');
assert(intentContract.includes('DOKE_PAYMENT_SENSITIVE_DATA_FORBIDDEN'), 'sensitive data denial missing');
assert(intentContract.includes('hashCanonicalPayload'), 'deterministic request hash missing');
assert(intentContract.includes('DOKE_PAYMENT_INTENT_IDEMPOTENCY_CONFLICT'), 'intent payload drift conflict missing');

assert(webhookContract.includes("crypto.createHmac('sha256'"), 'HMAC-SHA256 verification missing');
assert(webhookContract.includes('crypto.timingSafeEqual'), 'constant-time signature comparison missing');
assert(webhookContract.includes('DOKE_PAYMENT_WEBHOOK_RAW_BODY_REQUIRED'), 'raw body requirement missing');
assert(webhookContract.indexOf('verifyWebhookSignature({') < webhookContract.indexOf('JSON.parse(rawBody)'), 'signature verification must precede JSON parsing');
assert(webhookContract.includes('DOKE_PAYMENT_PROVIDER_NOT_CONFIGURED'), 'unconfigured provider denial missing');
assert(webhookContract.includes("reason: 'out_of_order'"), 'out-of-order deferral missing');
assert(webhookContract.includes('DOKE_PAYMENT_TERMINAL_STATE_CONFLICT'), 'terminal state conflict missing');
assert(webhookContract.includes('eventLedger.claim(event)'), 'persistent event claim missing');
assert(webhookContract.includes('eventLedger.complete(claim, event, result)'), 'persistent event completion missing');
assert(webhookContract.includes('eventLedger.fail(claim, event, error)'), 'persistent event failure recording missing');

assert(eventLedger.includes("const IDEMPOTENCY_TABLE = 'api_idempotency_keys'"), 'persistent table reuse missing');
assert(eventLedger.includes("const EVENT_ACTION = 'payments.providerWebhook.ingest'"), 'provider event action missing');
assert(eventLedger.includes("const EVENT_ENTITY_TYPE = 'payment_provider_event'"), 'provider event entity type missing');
assert(eventLedger.includes('actor_id: null'), 'server-owned provider event actor missing');
assert(eventLedger.includes('DOKE_PAYMENT_PROVIDER_EVENT_CONFLICT'), 'event payload drift conflict missing');
assert(eventLedger.includes('DOKE_PAYMENT_PROVIDER_EVENT_IN_PROGRESS'), 'concurrent event guard missing');
assert(eventLedger.includes('DOKE_PAYMENT_PROVIDER_EVENT_PREVIOUSLY_FAILED'), 'failed event reconciliation guard missing');

[
  'stripe',
  'adyen',
  'mercadopago',
  'mercado pago',
  'pagarme',
  'asaas'
].forEach((providerName) => {
  const combined = [intentContract, webhookContract, eventLedger, JSON.stringify(config)].join('\n').toLowerCase();
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'provider-specific dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a03-psp-neutral-intent-webhook'] === 'node scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a03-psp-neutral-intent-webhook'] === 'node scripts/test-pay-001-a03-psp-neutral-intent-webhook.js', 'package runtime command missing');

assert(matrix.version === '1.3.88', 'matrix version must be 1.3.88');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');
[
  'backend/modules/payments/payment-provider-contract.js',
  'backend/modules/payments/provider-webhook-contract.js',
  'backend/modules/payments/provider-event-ledger.js',
  'config/pay-001-a03-psp-neutral-intent-webhook.json',
  'docs/PAY-001-A03-PSP-NEUTRAL-INTENT-WEBHOOK.md',
  'docs/validation/PAY-001-A03-PSP-NEUTRAL-INTENT-WEBHOOK.json',
  'scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js',
  'scripts/test-pay-001-a03-psp-neutral-intent-webhook.js',
  '.github/workflows/pay-001-a03-psp-neutral-intent-webhook.yml'
].forEach((requiredPath) => assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(pay.tests.includes('audit:pay-001-a03-psp-neutral-intent-webhook'), 'matrix A03 audit missing');
assert(pay.tests.includes('test:pay-001-a03-psp-neutral-intent-webhook'), 'matrix A03 runtime missing');
assert(pay.nextActions[0].includes('PAY-A04'), 'PAY-A04 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A03 workflow must remain read-only');
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

console.log('PAY-A03 PSP-neutral intent and signed webhook audit passed.');
