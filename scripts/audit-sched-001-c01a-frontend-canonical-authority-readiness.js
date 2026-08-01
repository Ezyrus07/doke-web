#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-c01a-frontend-canonical-authority-readiness.json',
  evidence: 'docs/validation/SCHED-001-C01A-FRONTEND-CANONICAL-AUTHORITY-READINESS.json',
  docs: 'docs/SCHED-001-C01A-FRONTEND-CANONICAL-AUTHORITY-READINESS.md',
  ordersRepository: 'assets/js/repositories/orders-repository.js',
  ordersService: 'assets/js/services/orders-service.js',
  quoteSurface: 'assets/js/pages/orcamento.js',
  ordersSurface: 'assets/js/pages/pedidos-local-orders.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/sched-001-c01a-frontend-canonical-authority-readiness.yml'
};

Object.values(paths).forEach((file) => {
  assert(fs.existsSync(file), `Missing SCHED-C01A asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const ordersRepository = fs.readFileSync(paths.ordersRepository, 'utf8');
const ordersService = fs.readFileSync(paths.ordersService, 'utf8');
const quoteSurface = fs.readFileSync(paths.quoteSurface, 'utf8');
const ordersSurface = fs.readFileSync(paths.ordersSurface, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'sched-c01a-frontend-canonical-scheduling-authority-readiness-v1');
assert.strictEqual(config.status, 'repository_only_readiness_frozen');
assert.strictEqual(config.target.environmentAccess, 'none');
assert.strictEqual(config.canonicalAuthority.reservationReference, 'orders.schedule_reservation_id');
assert.strictEqual(config.canonicalAuthority.timeProjection, 'orders.scheduled_at');
assert.strictEqual(config.canonicalAuthority.scheduledStatus, 'orders.status=scheduled');
assert.strictEqual(config.canonicalAuthority.incompleteProjectionPolicy, 'fail_closed');
assert.strictEqual(config.canonicalAuthority.browserMayInferAuthorityFromDateAlone, false);
assert.strictEqual(config.canonicalAuthority.browserMayWriteCanonicalFieldsDirectly, false);
assert.deepStrictEqual(config.frontendReadContract.requiredFields, [
  'scheduleReservationId',
  'scheduledAt',
  'scheduleAuthority',
  'hasCanonicalSchedule'
]);
assert.deepStrictEqual(config.frontendReadContract.scheduleAuthorityValues, [
  'none',
  'client_intent',
  'canonical_confirmed',
  'incomplete_projection'
]);
assert.strictEqual(config.frontendCommandContract.directSupabaseWritesAllowed, false);
assert.strictEqual(config.frontendCommandContract.genericOrderStatusScheduledAllowed, false);
assert.strictEqual(config.frontendCommandContract.optimisticCanonicalFieldMutationAllowed, false);
assert.strictEqual(config.frontendCommandContract.compensatingBrowserWritesAllowed, false);
assert.strictEqual(config.nextImplementation.sublot, 'SCHED-C01B');
assert.strictEqual(config.nextImplementation.frontendCommandActivationAllowed, false);
Object.values(config.effects).forEach((value) => {
  if (typeof value === 'boolean') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert(ordersRepository.includes('scheduledAt: row.scheduled_at || metadata.scheduledAt'));
assert(!ordersRepository.includes('scheduleReservationId: row.schedule_reservation_id'));
assert(!ordersRepository.includes("scheduleAuthority: 'canonical_confirmed'"));
assert(!ordersRepository.includes('hasCanonicalSchedule: true'));
assert(!/\bscheduled\s*:\s*['\"]Agendado/.test(ordersRepository));

assert(ordersService.includes('var ORDER_TRANSITIONS = Object.freeze({'));
assert(!ordersService.includes("scheduled: Object.freeze({"));
assert(!ordersService.includes("scheduled: 'schedule'"));
assert(!ordersService.includes("scheduled: 'confirmSchedule'"));

assert(quoteSurface.includes('desiredDate: data.get("data") || ""'));
assert(quoteSurface.includes('daté: data.get("data") || ""'));
assert(!quoteSurface.includes('scheduleReservationId:'));
assert(!quoteSurface.includes('scheduledAt:'));

assert(ordersSurface.includes('serviceAvailabilitySchedule'));
assert(ordersSurface.includes("return 'Agenda a combinar'"));
assert(!ordersSurface.includes('scheduleReservationId'));
assert(!ordersSurface.includes('hasCanonicalSchedule'));

assert.strictEqual(matrix.version, '1.3.71');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord);
assert.strictEqual(sched.maturity, 3);
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.deepStrictEqual(sched.blockers.map((blocker) => blocker.id), []);
assert.deepStrictEqual(ord.blockers.map((blocker) => blocker.id), ['ORD-B02', 'ORD-B03', 'ORD-B05']);
assert(sched.nextActions[0].includes('SCHED-C01B'));
assert(sched.evidence.some((item) => item.includes('SCHED-C01A')));
assert(ord.evidence.some((item) => item.includes('SCHED-C01A')));

const requiredPaths = Object.values(paths).filter((file) => file !== paths.package && file !== paths.matrix);
requiredPaths.forEach((file) => {
  assert(sched.requiredPaths.includes(file), `SCHED requiredPaths missing ${file}`);
  assert(ord.requiredPaths.includes(file), `ORD requiredPaths missing ${file}`);
});
assert(sched.tests.includes('audit:sched-001-c01a-frontend-canonical-authority-readiness'));
assert(sched.tests.includes('test:sched-001-c01a-frontend-canonical-authority-readiness'));
assert(ord.tests.includes('audit:sched-001-c01a-frontend-canonical-authority-readiness'));
assert.strictEqual(
  pkg.scripts['audit:sched-001-c01a-frontend-canonical-authority-readiness'],
  'node scripts/audit-sched-001-c01a-frontend-canonical-authority-readiness.js'
);
assert.strictEqual(
  pkg.scripts['test:sched-001-c01a-frontend-canonical-authority-readiness'],
  'node scripts/test-sched-001-c01a-frontend-canonical-authority-readiness.js'
);

[
  'schedule_reservation_id',
  'scheduled_at',
  'client intent',
  'incomplete_projection',
  'SCHED-C01B',
  'staging reads: 0',
  'frontend behavior changed: no'
].forEach((fragment) => assert(docs.includes(fragment), `C01A docs missing ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:sched-001-c01a-frontend-canonical-authority-readiness'));
assert(workflow.includes('npm run test:sched-001-c01a-frontend-canonical-authority-readiness'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  '--execute',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `C01A workflow contains prohibited fragment: ${fragment}`));

console.log('SCHED-C01A frontend canonical authority readiness audit passed.');
