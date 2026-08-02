#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-c01b-frontend-canonical-schedule-read-model.json',
  evidence: 'docs/validation/SCHED-001-C01B-FRONTEND-CANONICAL-SCHEDULE-READ-MODEL.json',
  docs: 'docs/SCHED-001-C01B-FRONTEND-CANONICAL-SCHEDULE-READ-MODEL.md',
  repository: 'assets/js/repositories/orders-repository.js',
  service: 'assets/js/services/orders-service.js',
  quote: 'assets/js/pages/orcamento.js',
  ordersSurface: 'assets/js/pages/pedidos-local-orders.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/sched-001-c01b-frontend-canonical-schedule-read-model.yml'
};

Object.values(paths).forEach((file) => assert(fs.existsSync(file), `Missing SCHED-C01B asset: ${file}`));

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const repository = fs.readFileSync(paths.repository, 'utf8');
const service = fs.readFileSync(paths.service, 'utf8');
const quote = fs.readFileSync(paths.quote, 'utf8');
const ordersSurface = fs.readFileSync(paths.ordersSurface, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'sched-c01b-frontend-canonical-schedule-read-model-v1');
assert.strictEqual(config.status, 'repository_only_read_model_implemented');
assert.strictEqual(config.target.environmentAccess, 'none');
assert.deepStrictEqual(config.authorityModel.authorityValues, [
  'none',
  'client_intent',
  'canonical_confirmed',
  'incomplete_projection'
]);
assert.strictEqual(config.authorityModel.canonicalConfirmedRequiresCompleteTuple, true);
assert.strictEqual(config.authorityModel.incompleteProjectionFailsClosed, true);
assert.strictEqual(config.authorityModel.metadataMayClaimCanonicalAuthority, false);
assert.strictEqual(config.authorityModel.browserMayMutateCanonicalFields, false);
assert.strictEqual(config.implementation.ordersService.genericScheduledTransitionAdded, false);
assert.strictEqual(config.implementation.ordersService.genericScheduledActionEndpointAdded, false);
assert.strictEqual(config.implementation.ordersService.remoteSchedulingCommandsActivated, false);
assert.strictEqual(config.implementation.quoteSurface.submitsScheduleReservationId, false);
assert.strictEqual(config.implementation.quoteSurface.submitsScheduledAt, false);

[
  "scheduled: 'Agendado'",
  'function deriveScheduleAuthority(raw, normalizedStatus)',
  'scheduleReservationId: scheduleProjection.scheduleReservationId',
  'scheduledAt: scheduleProjection.scheduledAt',
  'scheduleAuthority: scheduleProjection.scheduleAuthority',
  'hasCanonicalSchedule: scheduleProjection.hasCanonicalSchedule',
  "scheduleReservationId: row.schedule_reservation_id || ''",
  "scheduledAt: row.scheduled_at || ''",
  'deriveScheduleAuthority: deriveScheduleAuthority'
].forEach((fragment) => assert(repository.includes(fragment), `Repository missing ${fragment}`));
assert(!repository.includes('scheduledAt: row.scheduled_at || metadata.scheduledAt'));
assert(!repository.includes('scheduleReservationId: row.schedule_reservation_id || metadata.scheduleReservationId'));

assert(service.includes("scheduled: {\n      label: 'Agendado'"));
assert(!service.includes("scheduled: Object.freeze({"));
assert(!service.includes("scheduled: 'schedule'"));
assert(!service.includes("scheduled: 'confirmSchedule'"));

assert(quote.includes('desiredDate: data.get("data") || ""'));
assert(quote.includes('daté: data.get("data") || ""'));
assert(!quote.includes('scheduleReservationId:'));
assert(!quote.includes('scheduledAt:'));

[
  'function getSchedulePresentation(order)',
  'Agendado:',
  'Data desejada:',
  'Agenda indisponível: atualize o pedido',
  'Disponibilidade do anúncio:',
  'article.dataset.scheduleAuthority',
  'article.dataset.scheduleReservationId',
  'article.dataset.scheduledAt',
  'data-order-schedule-authority'
].forEach((fragment) => assert(ordersSurface.includes(fragment), `Orders surface missing ${fragment}`));
assert(!ordersSurface.includes('data-order-schedule-confirm'));
assert(!ordersSurface.includes('data-order-schedule-reschedule'));
assert(!ordersSurface.includes('data-order-schedule-cancel'));

const matrixParts = String(matrix.version).split('.').map(Number);
assert.strictEqual(matrixParts[0], 1);
assert.strictEqual(matrixParts[1], 3);
assert(matrixParts[2] >= 72, 'C01B requires matrix 1.3.72 or later');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord);
assert.strictEqual(sched.maturity, 3);
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), []);
assert.deepStrictEqual(ord.blockers.map((item) => item.id), ['ORD-B02', 'ORD-B03', 'ORD-B05']);
assert(Array.isArray(sched.nextActions) && sched.nextActions.length > 0);
assert(sched.evidence.some((item) => item.includes('SCHED-C01B')));
assert(ord.evidence.some((item) => item.includes('SCHED-C01B')));

const requiredPaths = Object.values(paths).filter((file) => ![paths.package, paths.matrix].includes(file));
requiredPaths.forEach((file) => {
  assert(sched.requiredPaths.includes(file), `SCHED requiredPaths missing ${file}`);
  assert(ord.requiredPaths.includes(file), `ORD requiredPaths missing ${file}`);
});
assert.strictEqual(
  pkg.scripts['audit:sched-001-c01b-frontend-canonical-schedule-read-model'],
  'node scripts/audit-sched-001-c01b-frontend-canonical-schedule-read-model.js'
);
assert.strictEqual(
  pkg.scripts['test:sched-001-c01b-frontend-canonical-schedule-read-model'],
  'node scripts/test-sched-001-c01b-frontend-canonical-schedule-read-model.js'
);

[
  'canonical_confirmed',
  'incomplete_projection',
  'Agendado:',
  'Data desejada:',
  'Disponibilidade do anúncio:',
  'remote scheduling commands activated: `0`',
  'SCHED-C01C'
].forEach((fragment) => assert(docs.includes(fragment), `C01B docs missing ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:sched-001-c01b-frontend-canonical-schedule-read-model'));
assert(workflow.includes('npm run test:sched-001-c01b-frontend-canonical-schedule-read-model'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  '--execute',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `C01B workflow contains prohibited fragment: ${fragment}`));

console.log('SCHED-C01B frontend canonical schedule read model audit passed.');
