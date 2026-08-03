'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-A04 audit failed: ' + message);
};

const config = readJson('config/pay-001-a04-reconciliation-queue.json');
const reconciliationContract = read('backend/modules/payments/payment-reconciliation-contract.js');
const reconciliationQueue = read('backend/modules/payments/payment-reconciliation-queue.js');
const workflow = read('.github/workflows/pay-001-a04-reconciliation-queue.yml');
const packageJson = readJson('package.json');
const matrix = readJson('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === 'pay-a04-reconciliation-queue-v1', 'contract version mismatch');
assert(config.status === 'repository_only_psp_neutral_reconciliation_contract_ready_persistence_unconfigured', 'status must remain repository-only');
assert(config.provider.selected === false && config.provider.adapterActivated === false, 'provider must remain unselected/inactive');
assert(config.provider.webhookRegistered === false && config.provider.secretConfigured === false, 'provider webhook authority must remain unconfigured');
assert(config.snapshots.authorities.join(',') === 'doke,provider', 'snapshot authority pair mismatch');
assert(config.snapshots.rawProviderPayloadAllowedInQueue === false, 'raw provider payload must remain forbidden');
assert(config.snapshots.rawCardDataAllowed === false, 'raw card data must remain forbidden');
assert(config.snapshots.fingerprintRequired === true, 'snapshot fingerprint must remain required');
assert(config.divergencePolicy.automaticResolutionAllowed === false, 'automatic resolution must remain forbidden');
assert(config.divergencePolicy.automaticMoneyMutationAllowed === false, 'automatic money mutation must remain forbidden');
assert(config.operatorQueue.persistence === 'server_store_adapter_required_unconfigured', 'queue persistence must remain unconfigured');
assert(config.operatorQueue.browserAccess === false, 'browser queue access must remain forbidden');
assert(config.operatorQueue.allowedRoles.join(',') === 'support,admin', 'operator roles mismatch');
assert(config.operatorQueue.optimisticConcurrencyRequired === true, 'optimistic concurrency must remain required');
assert(config.operatorQueue.separationOfDutiesRequired === true, 'separation of duties must remain required');
assert(config.operatorQueue.freshMatchedComparisonRequiredForResolution === true, 'fresh matched comparison must remain required');
assert(config.controlledReplay.expectedComparisonFingerprintRequired === true, 'replay fingerprint missing');
assert(config.controlledReplay.originalVerifiedRawBodyHashRequired === true, 'raw body hash evidence missing');
assert(config.controlledReplay.signatureReverificationRequired === true, 'signature reverification missing');
assert(config.controlledReplay.secondOperatorRequired === true, 'second operator requirement missing');
assert(config.controlledReplay.criticalApprovalRole === 'admin', 'critical approval role mismatch');
assert(config.controlledReplay.dryRunRequired === true, 'dry-run must remain required');
assert(config.controlledReplay.atomicServerRuntimeRequired === true, 'atomic server runtime must remain required');
assert(config.controlledReplay.directPaymentMutationAllowed === false, 'direct payment mutation must remain forbidden');
assert(config.controlledReplay.directWalletMutationAllowed === false, 'direct wallet mutation must remain forbidden');
assert(config.controlledReplay.directRefundMutationAllowed === false, 'direct refund mutation must remain forbidden');
assert(config.controlledReplay.directPayoutMutationAllowed === false, 'direct payout mutation must remain forbidden');
assert(config.controlledReplay.resolutionRequiresFreshComparison === true, 'fresh comparison resolution gate missing');

assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.migrationsApplied === 0 && config.effects.edgeFunctionsDeployed === 0, 'remote deploy effects must be zero');
assert(config.effects.reconciliationTablesCreated === 0 && config.effects.operatorCasesCreatedRemotely === 0, 'remote reconciliation effects must be zero');
assert(config.effects.providerEventsReplayedRemotely === 0, 'remote replay effects must be zero');
assert(config.effects.pspAccountsCreated === 0 && config.effects.webhooksRegistered === 0 && config.effects.secretsCreated === 0, 'provider effects must be zero');
assert(config.effects.paymentsCreated === 0 && config.effects.refundsCreated === 0 && config.effects.payoutsCreated === 0, 'money effects must be zero');
assert(config.effects.productionChanged === false && config.effects.pullRequestMerged === false, 'production and merge effects must remain false');

assert(reconciliationContract.includes("const CONTRACT_VERSION = 'pay-reconciliation-contract-v1'"), 'reconciliation contract version missing');
assert(reconciliationContract.includes("const SNAPSHOT_AUTHORITIES = Object.freeze(['doke', 'provider'])"), 'snapshot authorities missing');
assert(reconciliationContract.includes("assertNoSensitivePaymentData(source, 'reconciliationSnapshot')"), 'sensitive snapshot rejection missing');
assert(reconciliationContract.includes('snapshotHash: hashCanonicalPayload(canonical)'), 'snapshot hash missing');
assert(reconciliationContract.includes("'internal_snapshot_missing', 'critical'"), 'critical internal missing classification absent');
assert(reconciliationContract.includes("'gross_amount_mismatch', 'critical'"), 'gross amount divergence missing');
assert(reconciliationContract.includes("'event_ledger_failed', 'high'"), 'failed ledger divergence missing');
assert(reconciliationContract.includes('automaticMoneyMutationAllowed: false'), 'automatic money mutation denial missing');
assert(reconciliationContract.includes('DOKE_PAYMENT_RECONCILIATION_STALE_SNAPSHOT'), 'stale snapshot guard missing');
assert(reconciliationContract.includes('replayCandidate'), 'replay eligibility classification missing');

assert(reconciliationQueue.includes('DOKE_PAYMENT_RECONCILIATION_STORE_UNAVAILABLE'), 'server store fail-closed missing');
assert(reconciliationQueue.includes("const OPERATOR_ROLES = Object.freeze(['support', 'admin'])"), 'operator roles missing');
assert(reconciliationQueue.includes('DOKE_PAYMENT_RECONCILIATION_SEPARATION_REQUIRED'), 'separation of duties guard missing');
assert(reconciliationQueue.includes('DOKE_PAYMENT_RECONCILIATION_ADMIN_REQUIRED'), 'critical admin approval guard missing');
assert(reconciliationQueue.includes("const mode = current.status === 'approved_for_replay' ? 'dry_run' : 'apply_after_dry_run'"), 'dry-run first mode missing');
assert(reconciliationQueue.includes('originalVerifiedRawBodyHashRequired: true'), 'raw body evidence command flag missing');
assert(reconciliationQueue.includes('signatureReverificationRequired: true'), 'signature reverification command flag missing');
assert(reconciliationQueue.includes('eventLedgerTransitionRequiresAtomicServerRuntime: true'), 'atomic ledger transition flag missing');
assert(reconciliationQueue.includes('directPaymentMutationAllowed: false'), 'direct payment mutation denial missing');
assert(reconciliationQueue.includes('directWalletMutationAllowed: false'), 'direct wallet mutation denial missing');
assert(reconciliationQueue.includes('directRefundMutationAllowed: false'), 'direct refund mutation denial missing');
assert(reconciliationQueue.includes('directPayoutMutationAllowed: false'), 'direct payout mutation denial missing');
assert(reconciliationQueue.includes("financialMutationAuthority: 'none_in_repository_contract'"), 'repository financial authority denial missing');
assert(reconciliationQueue.includes('DOKE_PAYMENT_RECONCILIATION_NOT_RESOLVED'), 'fresh comparison resolution guard missing');
assert(reconciliationQueue.includes('expectedRevision'), 'optimistic concurrency guard missing');

[
  'stripe',
  'adyen',
  'mercadopago',
  'mercado pago',
  'pagarme',
  'asaas'
].forEach((providerName) => {
  const combined = [reconciliationContract, reconciliationQueue, JSON.stringify(config)].join('\n').toLowerCase();
  const lexical = ' ' + combined.replace(/[^a-z0-9]+/g, ' ') + ' ';
  const needle = ' ' + providerName.toLowerCase().replace(/[^a-z0-9]+/g, ' ') + ' ';
  assert(!lexical.includes(needle), 'provider-specific dependency found: ' + providerName);
});

assert(packageJson.scripts['audit:pay-001-a04-reconciliation-queue'] === 'node scripts/audit-pay-001-a04-reconciliation-queue.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a04-reconciliation-queue'] === 'node scripts/test-pay-001-a04-reconciliation-queue.js', 'package runtime command missing');

assert(matrix.version === '1.3.89', 'matrix version must be 1.3.89');
assert(pay, 'PAY-001 matrix domain missing');
assert(pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local', 'PAY user-facing authority must remain local');
assert(pay.serverAuthority === 'contract_only', 'PAY server authority must remain contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'PAY blockers changed unexpectedly');
[
  'backend/modules/payments/payment-reconciliation-contract.js',
  'backend/modules/payments/payment-reconciliation-queue.js',
  'config/pay-001-a04-reconciliation-queue.json',
  'docs/PAY-001-A04-RECONCILIATION-QUEUE.md',
  'docs/validation/PAY-001-A04-RECONCILIATION-QUEUE.json',
  'scripts/audit-pay-001-a04-reconciliation-queue.js',
  'scripts/test-pay-001-a04-reconciliation-queue.js',
  '.github/workflows/pay-001-a04-reconciliation-queue.yml'
].forEach((requiredPath) => assert(pay.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(pay.tests.includes('audit:pay-001-a04-reconciliation-queue'), 'matrix A04 audit missing');
assert(pay.tests.includes('test:pay-001-a04-reconciliation-queue'), 'matrix A04 runtime missing');
assert(pay.nextActions[0].includes('PAY-A05'), 'PAY-A05 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'PAY-A04 workflow must remain read-only');
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

console.log('PAY-A04 reconciliation queue and controlled replay audit passed.');
