'use strict';
// Registered trigger for PAY-A05 repository finalization.

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

const a04Path = 'scripts/audit-pay-001-a04-reconciliation-queue.js';
let a04 = read(a04Path);
a04 = a04.replace(
  "assert(matrix.version === '1.3.89', 'matrix version must be 1.3.89');",
  "assert(/^1\\.3\\.(?:89|9\\d|\\d{3,})$/.test(matrix.version), 'matrix version must remain PAY-A04 compatible');"
);
a04 = a04.replace(
  "assert(pay.nextActions[0].includes('PAY-A05'), 'PAY-A05 must be the first next action');",
  "assert(pay.requiredPaths.includes('config/pay-001-a05-adapter-conformance-readiness.json'), 'PAY-A05 must remain represented');"
);
write(a04Path, a04);

const pkg = readJson('package.json');
pkg.scripts['audit:pay-001-a05-adapter-conformance-readiness'] = 'node scripts/audit-pay-001-a05-adapter-conformance-readiness.js';
pkg.scripts['test:pay-001-a05-adapter-conformance-readiness'] = 'node scripts/test-pay-001-a05-adapter-conformance-readiness.js';
writeJson('package.json', pkg);

const matrix = readJson('config/domain-completion-matrix.json');
matrix.version = '1.3.90';
matrix.updatedAt = '2026-08-03T11:28:00-03:00';
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
if (!pay) throw new Error('PAY-001 matrix domain missing.');
uniquePush(pay.requiredPaths, [
  'backend/modules/payments/payment-provider-adapter-conformance.js',
  'backend/modules/payments/payment-staging-readiness.js',
  'config/pay-001-a05-adapter-conformance-readiness.json',
  'docs/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.md',
  'docs/validation/PAY-001-A05-ADAPTER-CONFORMANCE-READINESS.json',
  'scripts/audit-pay-001-a05-adapter-conformance-readiness.js',
  'scripts/test-pay-001-a05-adapter-conformance-readiness.js',
  '.github/workflows/pay-001-a05-adapter-conformance-readiness.yml'
]);
uniquePush(pay.tests, [
  'audit:pay-001-a05-adapter-conformance-readiness',
  'test:pay-001-a05-adapter-conformance-readiness'
]);
uniquePush(pay.evidence, [
  'PAY-A05 defines a PSP-neutral adapter manifest, required methods and capabilities, deterministic intent replay and an offline fixture-only conformance harness with zero provider-network calls.',
  'PAY-A05 requires verified webhook normalization, provider snapshot reconciliation through A04, sensitive-data rejection and fail-closed retry classification before an adapter may become a staging candidate.',
  'PAY-A05 staging readiness requires formal provider selection, legal/accounting approval, sandbox account, server credentials, signed webhook registration, exact head, reconciliation store, operator queue, rollback, evidence and fresh one-shot authorization.',
  'PAY-A05 cannot execute remote actions, activate a provider or change feature flags; the provider remains unselected and all staging, deployment and money effects remain zero.'
]);
pay.nextActions = [
  'PAY-A06 — formalize the provider-selection handoff, legal/accounting decision packet and exact one-shot staging execution authorization contract without selecting a provider implicitly.',
  'PAY-B01 — select and contract a PSP, configure account, secret and signed webhook, then run provider-specific staging conformance only after explicit authorization.',
  'PAY-B03 — approve commercial, fiscal, escrow, refund, dispute and payout rules.',
  'PAY-B04 — implement the remote reconciliation store, schedule, operator queue, metrics and runbook before production.'
];
writeJson('config/domain-completion-matrix.json', matrix);

console.log('PAY-A05 package, matrix and cumulative audit compatibility finalized.');
