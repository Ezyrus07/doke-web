'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));

const paths = Object.freeze({
  matrix: 'config/domain-completion-matrix.json',
  evidence: 'docs/validation/ORD-001-A01-BASELINE.json',
  baseline: 'docs/ORD-001-AUTHORITY-BASELINE.md',
  legacyService: 'assets/js/services/order-service.js',
  ordersService: 'assets/js/services/orders-service.js',
  repository: 'assets/js/repositories/orders-repository.js',
  operationsRepository: 'assets/js/repositories/order-event-operations-repository.js',
  backendService: 'backend/modules/orders/orders-service.js',
  stateMachine: 'backend/modules/orders/order-state-machine.js',
  worker: 'supabase/functions/order-event-worker/index.ts',
  operations: 'supabase/functions/order-event-operations/index.ts',
  stateMachineContract: 'scripts/test-order-state-machine-contract.js',
  stateMachineRuntime: 'scripts/test-order-state-machine-runtime.js',
  transactionEventsContract: 'scripts/test-order-transaction-events-contract.js',
  workerContract: 'scripts/test-order-event-worker-contract.js',
  workerRuntime: 'scripts/test-order-event-worker-runtime.mjs'
});

Object.values(paths).forEach((relativePath) => {
  assert(fs.existsSync(path.join(root, relativePath)), `ORD-A01 required path missing: ${relativePath}`);
});

const matrix = readJson(paths.matrix);
const evidence = readJson(paths.evidence);
const baseline = read(paths.baseline);
const legacyService = read(paths.legacyService);
const ordersService = read(paths.ordersService);
const repository = read(paths.repository);
const operationsRepository = read(paths.operationsRepository);
const backendService = read(paths.backendService);
const stateMachine = read(paths.stateMachine);
const worker = read(paths.worker);
const operations = read(paths.operations);

[
  [paths.legacyService, legacyService],
  [paths.ordersService, ordersService],
  [paths.repository, repository],
  [paths.operationsRepository, operationsRepository],
  [paths.backendService, backendService],
  [paths.stateMachine, stateMachine]
].forEach(([filename, source]) => new vm.Script(source, { filename }));

assert(Array.isArray(matrix.mandatorySequence), 'Domain matrix mandatory sequence is missing.');
const searchIndex = matrix.mandatorySequence.indexOf('SEARCH-001');
const orderIndex = matrix.mandatorySequence.indexOf('ORD-001');
assert(searchIndex >= 0 && orderIndex === searchIndex + 1, 'ORD-001 must immediately follow SEARCH-001.');

const orderDomain = (matrix.domains || []).find((domain) => domain.id === 'ORD-001');
assert(orderDomain, 'ORD-001 is missing from the domain completion matrix.');
assert.strictEqual(orderDomain.maturity, 4, 'ORD-A01 must not silently promote maturity.');
assert.strictEqual(orderDomain.userFacingAuthority, 'hybrid');
assert.strictEqual(orderDomain.serverAuthority, 'canonical');
assert.strictEqual(orderDomain.stagingEvidence, 'staging_operational');
assert.strictEqual(orderDomain.securityGate, 'partial');
assert.strictEqual(orderDomain.productionGate, 'blocked');

const blockerIds = new Set((orderDomain.blockers || []).map((blocker) => blocker.id));
['ORD-B01', 'ORD-B02', 'ORD-B03', 'ORD-B04'].forEach((id) => {
  assert(blockerIds.has(id), `Historical ORD blocker missing before reconciliation: ${id}`);
});

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A01');
assert.strictEqual(evidence.environment, 'staging');
assert.strictEqual(evidence.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(evidence.readOnlyAudit, true);
assert.strictEqual(evidence.productionChanged, false);
assert.strictEqual(evidence.realRowsMutated, 0);
assert.strictEqual(evidence.matrixAtEntry.maturity, 4);
assert.strictEqual(evidence.matrixAtEntry.productionGate, 'blocked');
assert.strictEqual(evidence.nextSublot, 'ORD-A02');
assert.strictEqual(evidence.validation.workflow, 'Doke ORD-A01 Authority Baseline');
assert.strictEqual(evidence.validation.runId, 30473338428);
assert.strictEqual(evidence.validation.runNumber, 3);
assert.strictEqual(evidence.validation.conclusion, 'success');
assert(Array.isArray(evidence.validation.checks) && evidence.validation.checks.length === 6);
assert(String(evidence.validation.fixtureCorrection || '').includes('no product rule changed'));

const relations = new Map((evidence.relations || []).map((relation) => [`${relation.schema}.${relation.name}`, relation]));
['public.orders', 'public.budgets', 'public.order_status_history', 'private.order_domain_events', 'private.order_event_delivery_attempts']
  .forEach((name) => assert(relations.has(name), `Staging relation absent from ORD-A01 evidence: ${name}`));
assert.strictEqual(relations.get('public.orders').rlsEnabled, true);
assert.strictEqual(relations.get('public.budgets').rlsEnabled, true);
assert.strictEqual(relations.get('public.order_status_history').rlsEnabled, true);
assert.deepStrictEqual(relations.get('private.order_domain_events').browserPrivileges, []);
assert.deepStrictEqual(relations.get('private.order_event_delivery_attempts').browserPrivileges, []);

const edgeFunctions = new Map((evidence.edgeFunctions || []).map((entry) => [entry.slug, entry]));
assert.strictEqual(edgeFunctions.get('order-event-worker').version, 9);
assert.strictEqual(edgeFunctions.get('order-event-worker').verifyJwt, false);
assert(String(edgeFunctions.get('order-event-worker').customAuth || '').includes('x-doke-worker-token'));
assert.strictEqual(edgeFunctions.get('order-event-operations').version, 9);
assert.strictEqual(edgeFunctions.get('order-event-operations').verifyJwt, true);

const cronNames = new Set((evidence.crons || []).filter((job) => job.active).map((job) => job.name));
[
  'doke-order-event-worker',
  'doke-order-operational-alerts',
  'doke-order-incident-escalation',
  'doke-order-change-protection',
  'doke-order-slo-daily-report'
].forEach((name) => assert(cronNames.has(name), `Active ORD cron missing from evidence: ${name}`));

const findingIds = new Set((evidence.findings || []).map((finding) => finding.id));
['ORD-A01-F01', 'ORD-A01-F02', 'ORD-A01-F03', 'ORD-A01-F04', 'ORD-A01-F05', 'ORD-A01-F06', 'ORD-A01-F07', 'ORD-A01-F08']
  .forEach((id) => assert(findingIds.has(id), `ORD-A01 finding missing: ${id}`));

assert(legacyService.includes("Doke.mockData.load('orders')"), 'Legacy order service is no longer frozen as mock-only.');
assert(legacyService.includes('services.orders = Object.freeze'), 'Legacy order service authority is not explicit.');

[
  "var STORAGE_KEY = 'doke.orders.local.v1'",
  "var LEGACY_STORAGE_KEY = 'doke.orders'",
  "var FALLBACK_URL = 'assets/data/mock-orders.json'",
  "var REMOTE_TABLE = 'orders'",
  'root.localStorage.getItem',
  'root.localStorage.setItem',
  'client.from(REMOTE_TABLE).upsert',
  "client.from(REMOTE_TABLE).delete()",
  "setProviderState('local-fallback')",
  "return loadLocal(options)"
].forEach((snippet) => assert(repository.includes(snippet), `Orders repository baseline marker missing: ${snippet}`));

[
  "var ORDERS_WRITE_CANARY_PROVIDER = 'api-write-canary-frontend-activation'",
  "dataProvider: enabled ? 'mock'",
  "ordersWriteCanary is not enabled.",
  "orderWriteActivation is not enabled.",
  "target is production-like or not marked as local/staging"
].forEach((snippet) => assert(ordersService.includes(snippet), `Orders service canary marker missing: ${snippet}`));

[
  "require('./order-state-machine')",
  "supabase.rpc('transition_order_status'",
  'p_expected_status: oldStatus',
  'Order changed while this transition was being processed.',
  ".from('budgets')",
  '.insert(payload)'
].forEach((snippet) => assert(backendService.includes(snippet), `Backend order authority marker missing: ${snippet}`));

assert(stateMachine.includes('const TRANSITIONS = Object.freeze({'), 'Canonical order transition graph is missing.');
assert(stateMachine.includes('DOKE_ORDER_TRANSITION_INVALID'), 'Canonical transition conflict code is missing.');

[
  'const FUNCTION_NAME = "order-event-worker"',
  'x-doke-worker-token',
  'verify_order_event_worker_token',
  'claim_order_domain_events_for_worker',
  'complete_order_domain_event_delivery',
  'fail_order_domain_event_delivery'
].forEach((snippet) => assert(worker.includes(snippet), `Order worker authority marker missing: ${snippet}`));

assert(operations.includes('order-event-operations'), 'Order operations Edge Function identity is missing.');
assert(operationsRepository.includes("var FUNCTION_NAME = 'order-event-operations'"));
assert(operationsRepository.includes("invoke('dashboard'"));
assert(operationsRepository.includes("invoke('requeue'"));

[
  'O navegador ainda possui três autoridades concorrentes',
  'RLS ativa em staging',
  'ORD-A02 — permissões, grants e personas',
  'nenhuma linha real foi criada, alterada ou removida'
].forEach((snippet) => assert(baseline.includes(snippet), `ORD baseline document missing statement: ${snippet}`));

console.log('[audit:ord-001-a01-baseline] ok');
console.log('- matrix entry and sequence frozen');
console.log('- staging RLS, Edge Functions and crons evidenced');
console.log('- server state machine and durable event authority present');
console.log('- browser mock/local/direct-DML authority split confirmed');
console.log('- successful dedicated validation evidence frozen');
console.log('- no staging or production writes authorized by ORD-A01');
