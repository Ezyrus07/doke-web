#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-c01c-deterministic-frontend-presentation.json',
  evidence: 'docs/validation/SCHED-001-C01C-DETERMINISTIC-FRONTEND-PRESENTATION.json',
  docs: 'docs/SCHED-001-C01C-DETERMINISTIC-FRONTEND-PRESENTATION.md',
  presenter: 'assets/js/patterns/order-schedule-presentation.js',
  ordersCard: 'assets/js/pages/pedidos-local-orders.js',
  ordersData: 'assets/js/pages/pedidos/orders-data.js',
  ordersDetail: 'assets/js/pages/pedidos/orders-details.js',
  messages: 'assets/js/pages/mensagens.js',
  ordersHtml: 'pedidos.html',
  messagesHtml: 'mensagens.html',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/sched-001-c01c-deterministic-frontend-presentation.yml'
};

Object.values(paths).forEach((file) => assert(fs.existsSync(file), `Missing SCHED-C01C asset: ${file}`));

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const presenter = fs.readFileSync(paths.presenter, 'utf8');
const ordersCard = fs.readFileSync(paths.ordersCard, 'utf8');
const ordersData = fs.readFileSync(paths.ordersData, 'utf8');
const ordersDetail = fs.readFileSync(paths.ordersDetail, 'utf8');
const messages = fs.readFileSync(paths.messages, 'utf8');
const ordersHtml = fs.readFileSync(paths.ordersHtml, 'utf8');
const messagesHtml = fs.readFileSync(paths.messagesHtml, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'sched-c01c-deterministic-frontend-presentation-v1');
assert.strictEqual(config.status, 'repository_only_deterministic_presentation_implemented');
assert.strictEqual(config.target.environmentAccess, 'none');
assert.strictEqual(config.implementation.remoteSchedulingCommandsActivated, false);
assert.strictEqual(config.implementation.optimisticSchedulingWritesAdded, false);
assert.strictEqual(config.implementation.supabaseChanged, false);

[
  'function deriveAuthority(order)',
  'function getPresentation(order, options)',
  "'Horário confirmado'",
  "'Horário solicitado'",
  "'Sincronização da agenda pendente'",
  "'Disponibilidade do profissional'",
  "'Agenda indisponível: atualize o pedido'",
  'presentationMayClaimCanonicalAuthority'
].forEach((fragment) => {
  if (fragment === 'presentationMayClaimCanonicalAuthority') {
    assert.strictEqual(config.authorityModel.presentationMayClaimCanonicalAuthority, false);
  } else {
    assert(presenter.includes(fragment), `Presenter missing ${fragment}`);
  }
});

assert(ordersCard.includes('Doke.patterns && Doke.patterns.orderSchedulePresentation'));
assert(ordersCard.includes('sharedPresenter.getPresentation(order)'));
assert(ordersCard.includes('article.dataset.schedulePresentationTitle'));
assert(ordersCard.includes('article.dataset.desiredDate'));
assert(ordersCard.includes('article.dataset.shift'));

[
  'scheduleReservationId: clean(card.dataset.scheduleReservationId)',
  'scheduledAt: clean(card.dataset.scheduledAt)',
  "scheduleAuthority: clean(card.dataset.scheduleAuthority) || 'none'",
  "hasCanonicalSchedule: card.dataset.hasCanonicalSchedule === 'true'",
  'schedulePresentationTitle: clean(card.dataset.schedulePresentationTitle)',
  'desiredDate: clean(card.dataset.desiredDate)'
].forEach((fragment) => assert(ordersData.includes(fragment), `Orders data missing ${fragment}`));

assert(ordersDetail.includes('data-detail-schedule-label'));
assert(ordersDetail.includes('orderSchedulePresentation'));
assert(ordersDetail.includes('schedulePresentation.title'));
assert(ordersDetail.includes('schedulePresentation.value'));

assert(messages.includes('getCanonicalSchedulePresentation'));
assert(messages.includes('schedulePresentation.title'));
assert(messages.includes('schedulePresentation.value'));
assert(messages.includes('details.scheduleAuthority'));
assert(!messages.includes("${desiredDate ? `<div><dt>Data desejada</dt>"));
assert(!messages.includes("${schedule ? `<div class=\"messages-order-card__fact-wide\"><dt>Agenda do anúncio</dt>"));

const scriptPath = 'assets/js/patterns/order-schedule-presentation.js';
assert(ordersHtml.includes(scriptPath));
assert(messagesHtml.includes(scriptPath));
assert(ordersHtml.indexOf(scriptPath) < ordersHtml.indexOf('assets/js/pages/pedidos-local-orders.js'));
assert(messagesHtml.indexOf(scriptPath) < messagesHtml.indexOf('assets/js/pages/mensagens.js'));

[
  'data-order-schedule-confirm',
  'data-order-schedule-reschedule',
  'data-order-schedule-cancel'
].forEach((fragment) => {
  assert(!ordersCard.includes(fragment));
  assert(!ordersDetail.includes(fragment));
  assert(!messages.includes(fragment));
});

assert.strictEqual(matrix.version, '1.3.73');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
assert(sched && ord && msg);
assert(sched.nextActions[0].includes('SCHED-C01D'));
assert(sched.evidence.some((item) => item.includes('C01C')));
assert(ord.evidence.some((item) => item.includes('C01C')));
assert(msg.evidence.some((item) => item.includes('C01C')));

assert.strictEqual(
  pkg.scripts['audit:sched-001-c01c-deterministic-frontend-presentation'],
  'node scripts/audit-sched-001-c01c-deterministic-frontend-presentation.js'
);
assert.strictEqual(
  pkg.scripts['test:sched-001-c01c-deterministic-frontend-presentation'],
  'node scripts/test-sched-001-c01c-deterministic-frontend-presentation.js'
);

[
  'canonical_confirmed',
  'client_intent',
  'incomplete_projection',
  'remote scheduling commands activated: `0`',
  'SCHED-C01D'
].forEach((fragment) => assert(docs.includes(fragment), `C01C docs missing ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  '--execute',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `C01C workflow contains prohibited fragment: ${fragment}`));

console.log('SCHED-C01C deterministic frontend presentation audit passed.');
