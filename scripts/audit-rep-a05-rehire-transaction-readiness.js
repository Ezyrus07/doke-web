'use strict';

const fs = require('fs');
const path = require('path');
const authority = require('../backend/modules/reputation/rehire-transaction-readiness');

const root = path.resolve(__dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'config', 'rep-a05-rehire-transaction-readiness.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'rep-a05-rehire-transaction-cases.json'), 'utf8'));
const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });
const equals = (name, actual, expected) => check(name, actual === expected);
const includes = (name, list, value) => check(name, Array.isArray(list) && list.includes(value));
function fileContains(file, snippets) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  snippets.forEach((snippet) => check(`${file} contains ${snippet}`, content.includes(snippet)));
}

equals('contract id', policy.contractId, authority.CONTRACT_ID);
equals('domain', policy.domain, 'REP-001');
equals('scope', policy.scope, 'repository_only');
equals('status', policy.status, 'contract_ready_runtime_integration_required');
equals('runtime disabled', policy.runtimeIntegrated, false);
equals('migration not prepared', policy.migrationPrepared, false);
equals('migration not applied', policy.migrationApplied, false);
equals('staging not validated', policy.stagingValidated, false);
equals('repository sequence complete', policy.repositorySequenceComplete, true);
Object.values(authority.STATES).forEach((state) => includes(`state ${state}`, policy.states, state));
Object.values(authority.ACTIONS).forEach((action) => includes(`action ${action}`, policy.actions, action));
Object.entries(policy.identity).forEach(([key, value]) => equals(`identity ${key}`, value, true));
Object.entries(policy.sourceOrderBoundary).forEach(([key, value]) => {
  const expected = key.endsWith('Copied') ? false : true;
  equals(`source boundary ${key}`, value, expected);
});
policy.currentFactsRequired.forEach((value) => check(`current fact ${value}`, typeof value === 'string' && value.length > 5));
policy.mandatoryInvariants.forEach((value) => check(`invariant ${value}`, typeof value === 'string' && value.length > 10));
Object.entries(policy.authority).forEach(([key, value]) => {
  const enabled = ['contractAuthority','rehireReadinessContractAuthority','transactionLinkageContractAuthority','retentionSignalContractAuthority'].includes(key);
  equals(`authority ${key}`, value, enabled);
});
Object.entries(policy.prohibitedEffects).forEach(([key, value]) => equals(`prohibited ${key}`, value, false));
['REP-B02','REP-B03','REP-B04','ORD-B02','ORD-B03','PAY-B01','PAY-B03','PAY-B04','DSP-B01','DSP-B03','DSP-B04']
  .forEach((blocker) => includes(`blocker ${blocker}`, policy.preservedBlockers, blocker));

[
  'backend/modules/reputation/rehire-transaction-readiness.js',
  'config/rep-a05-rehire-transaction-readiness.json',
  'tests/fixtures/rep-a05-rehire-transaction-cases.json',
  'docs/REP-A05-REHIRE-TRANSACTION-READINESS.md',
  'scripts/audit-rep-a05-rehire-transaction-readiness.js',
  'scripts/test-rep-a05-rehire-transaction-readiness.js',
  '.github/workflows/rep-a05-rehire-transaction-readiness.yml'
].forEach((file) => check(`file ${file}`, fs.existsSync(path.join(root, file))));

fileContains('backend/modules/reputation/rehire-transaction-readiness.js', [
  'lineage_only', 'canonical_server', 'requote_required', 'confirmation_required',
  'newProposalId: null', 'newPaymentIntentId: null', 'newEscrowId: null', 'newChargeId: null',
  'autoPaymentAllowed: false', 'oldCommercialTermsCopied: false', 'oldFinancialReferencesCopied: false',
  'source_order_not_final', 'source_dispute_blocks_rehire', 'current_subject_unavailable',
  'explicit_current_terms_confirmation_required', 'new_transaction_envelope_created',
  'intent_fingerprint_mismatch', 'rehire_readiness_evaluated', 'analyticsWriteAuthority: false',
  'runtimeAuthority: false', 'paymentAuthority: false'
]);
fileContains('docs/REP-A05-REHIRE-TRANSACTION-READINESS.md', [
  'lineage only', 'Current-facts refresh', 'Requote boundary', 'Explicit confirmation',
  'Idempotency and lost-response recovery', 'Financial isolation', 'Retention signal',
  'Sensitive-data boundary', 'Explicit non-effects', 'Operational blockers'
]);
fileContains('.github/workflows/rep-a05-rehire-transaction-readiness.yml', [
  'permissions:', 'contents: read', 'Audit rehire transaction readiness',
  'Rehire transaction conformance', 'REP-A04 regression', 'REP-A03 regression',
  'REP-A02 regression', 'REP-A01 regression', 'DSP-A05 predecessor regression', 'git diff --check'
]);

const ordersService = fs.readFileSync(path.join(root, 'assets/js/services/orders-service.js'), 'utf8');
check('legacy create command remains inventoried', ordersService.includes('function create('));
check('legacy local/mock provider remains inventoried', ordersService.includes("'mock'"));
check('order write canary remains guarded', ordersService.includes('orderWriteActivation'));
const reviewsRepository = fs.readFileSync(path.join(root, 'assets/js/repositories/reviews-repository.js'), 'utf8');
check('legacy browser reputation remains inventoried', reviewsRepository.includes('getProfessionalReputation'));
check('legacy review localStorage remains inventoried', reviewsRepository.includes('doke.reviews.local.v1'));

const ready = authority.evaluateRehire(fixtures.baseIntent, fixtures.baseSnapshot);
equals('fixture ready', ready.state, authority.STATES.READY);
equals('fixture source lineage', ready.transaction.sourceOrderRole, 'lineage_only');
check('fixture new order differs', ready.transaction.newOrderId !== fixtures.baseIntent.sourceOrderId);
equals('fixture payment null', ready.transaction.newPaymentIntentId, null);
equals('fixture escrow null', ready.transaction.newEscrowId, null);
equals('fixture payment authority false', ready.paymentAuthority, false);
equals('fixture runtime authority false', ready.runtimeAuthority, false);
check('fixture outcome frozen', Object.isFrozen(ready));
check('fixture transaction frozen', Object.isFrozen(ready.transaction));
check('fixture transaction hash', /^[a-f0-9]{64}$/.test(ready.transaction.transactionFingerprint));
check('fixture outcome hash', /^[a-f0-9]{64}$/.test(ready.outcomeFingerprint));
authority.FORBIDDEN_KEYS.forEach((key) => check(`forbidden key ${key}`, authority.containsForbiddenRawData({ nested: { [key]: 'x' } })));
fixtures.sensitiveKeys.forEach((key) => includes(`fixture sensitive ${key}`, authority.FORBIDDEN_KEYS, key));
fixtures.sourceTerminalFields.forEach((key) => check(`fixture terminal field ${key}`, Object.prototype.hasOwnProperty.call(fixtures.baseSnapshot.sourceOrder, key)));
fixtures.currentBindingFields.forEach((key) => check(`fixture binding field ${key}`, Object.prototype.hasOwnProperty.call(fixtures.baseSnapshot.current, key)));

for (let index = 0; index < 24; index += 1) {
  const one = authority.deterministicUuid(`audit-${index}`);
  const two = authority.deterministicUuid(`audit-${index}`);
  check(`uuid shape ${index}`, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(one));
  equals(`uuid stable ${index}`, one, two);
}

const signal = authority.buildRetentionSignal(ready);
equals('signal event', signal.event, 'rehire_readiness_evaluated');
equals('signal amount excluded', signal.amountIncluded, false);
equals('signal raw identity excluded', signal.rawIdentityIncluded, false);
equals('signal analytics authority false', signal.analyticsWriteAuthority, false);
equals('signal runtime false', signal.runtimeAuthority, false);
check('signal fingerprint', /^[a-f0-9]{64}$/.test(signal.signalFingerprint));
check('signal omits raw actor', !JSON.stringify(signal).includes(fixtures.baseIntent.actorId));

const total = checks.length;
const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({ contractId: policy.contractId, sourceHead: policy.sourceHead, total, passed: total - failedChecks.length, failed: failedChecks.length, status: failedChecks.length ? 'failed' : 'passed', failedChecks, effects: policy.prohibitedEffects }, null, 2));
if (failedChecks.length) process.exitCode = 1;
