'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);
const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
const uniquePush = (list, values) => {
  values.forEach((value) => { if (!list.includes(value)) list.push(value); });
};

const a02Path = 'scripts/audit-pay-001-a02-authenticated-authority-boundary.js';
let a02 = read(a02Path);
a02 = a02.replace(
  "assert(pay.nextActions[0].includes('PAY-A03') || pay.nextActions[0].includes('PAY-A04'), 'PAY-A03/PAY-A04 progression mismatch');",
  "assert(pay.requiredPaths.includes('config/pay-001-a03-psp-neutral-intent-webhook.json') && pay.requiredPaths.includes('config/pay-001-a04-reconciliation-queue.json'), 'PAY-A03/PAY-A04 progression must remain represented');"
);
write(a02Path, a02);

const a03Path = 'scripts/audit-pay-001-a03-psp-neutral-intent-webhook.js';
let a03 = read(a03Path);
a03 = a03.replace(
  "assert(matrix.version === '1.3.88', 'matrix version must be 1.3.88');",
  "assert(/^1\\.3\\.(?:8[8-9]|9\\d|\\d{3,})$/.test(matrix.version), 'matrix version must remain PAY-A03 compatible');"
);
a03 = a03.replace(
  "assert(pay.nextActions[0].includes('PAY-A04'), 'PAY-A04 must be the first next action');",
  "assert(pay.requiredPaths.includes('config/pay-001-a04-reconciliation-queue.json'), 'PAY-A04 must remain represented');"
);
write(a03Path, a03);

const pkg = readJson('package.json');
pkg.scripts['audit:pay-001-a04-reconciliation-queue'] = 'node scripts/audit-pay-001-a04-reconciliation-queue.js';
pkg.scripts['test:pay-001-a04-reconciliation-queue'] = 'node scripts/test-pay-001-a04-reconciliation-queue.js';
writeJson('package.json', pkg);

const matrix = readJson('config/domain-completion-matrix.json');
matrix.version = '1.3.89';
matrix.updatedAt = '2026-08-03T10:43:00-03:00';
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
if (!pay) throw new Error('PAY-001 matrix domain missing.');
uniquePush(pay.requiredPaths, [
  'backend/modules/payments/payment-reconciliation-contract.js',
  'backend/modules/payments/payment-reconciliation-queue.js',
  'config/pay-001-a04-reconciliation-queue.json',
  'docs/PAY-001-A04-RECONCILIATION-QUEUE.md',
  'docs/validation/PAY-001-A04-RECONCILIATION-QUEUE.json',
  'scripts/audit-pay-001-a04-reconciliation-queue.js',
  'scripts/test-pay-001-a04-reconciliation-queue.js',
  '.github/workflows/pay-001-a04-reconciliation-queue.yml'
]);
uniquePush(pay.tests, [
  'audit:pay-001-a04-reconciliation-queue',
  'test:pay-001-a04-reconciliation-queue'
]);
uniquePush(pay.evidence, [
  'PAY-A04 defines deterministic Doke/provider financial snapshots and classifies identity, state, currency, amount, settlement-reference and event-ledger divergences without automatic money mutation.',
  'PAY-A04 requires a server-side operator-queue adapter, optimistic concurrency, support/admin roles, rationale, separation of duties and fresh matched comparison before resolution.',
  'PAY-A04 controlled replay requires an unchanged comparison fingerprint, original verified raw-body hash, payload hash, signature reverification, second-operator approval, idempotency and dry-run before apply.',
  'PAY-A04 replay envelopes explicitly deny direct payment, wallet, refund and payout mutation; no remote reconciliation store, provider, secret, migration or deploy was introduced.'
]);
pay.nextActions = [
  'PAY-A05 — define a PSP-neutral adapter conformance harness and fail-closed staging activation readiness without selecting or activating a provider.',
  'PAY-B01 — select and contract a PSP, configure account, secret and signed webhook, then run provider-specific staging conformance only after explicit authorization.',
  'PAY-B03 — approve commercial, fiscal, escrow, refund, dispute and payout rules.',
  'PAY-B04 — implement the remote reconciliation store, schedule, operator queue, metrics and runbook before production.'
];
writeJson('config/domain-completion-matrix.json', matrix);

console.log('PAY-A04 package, matrix and cumulative audit compatibility finalized.');
