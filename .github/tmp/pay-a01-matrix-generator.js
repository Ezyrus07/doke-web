'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const file = (name) => path.join(root, name);

const pkg = JSON.parse(fs.readFileSync(file('package.json'), 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['audit:pay-001-a01-authority-baseline'] = 'node scripts/audit-pay-001-a01-authority-baseline.js';
pkg.scripts['test:pay-001-a01-authority-baseline'] = 'node scripts/test-pay-001-a01-authority-baseline.js';
fs.writeFileSync(file('package.json'), JSON.stringify(pkg, null, 2) + '\n');

const matrix = JSON.parse(fs.readFileSync(file('config/domain-completion-matrix.json'), 'utf8'));
matrix.version = '1.3.86';
matrix.updatedAt = '2026-08-03T08:04:00-03:00';
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
if (!pay) throw new Error('PAY-001 domain missing from matrix');

const requiredPaths = [
  'config/pay-001-a01-authority-baseline.json',
  'docs/PAY-001-A01-AUTHORITY-BASELINE.md',
  'docs/validation/PAY-001-A01-AUTHORITY-BASELINE.json',
  'scripts/audit-pay-001-a01-authority-baseline.js',
  'scripts/test-pay-001-a01-authority-baseline.js',
  '.github/workflows/pay-001-a01-authority-baseline.yml'
];
for (const item of requiredPaths) if (!pay.requiredPaths.includes(item)) pay.requiredPaths.push(item);

for (const item of ['audit:pay-001-a01-authority-baseline', 'test:pay-001-a01-authority-baseline']) {
  if (!pay.tests.includes(item)) pay.tests.push(item);
}

const evidence = [
  'PAY-A01 freezes the repository-only payment authority split across API, the synthetic Supabase staging sandbox and local browser simulation without claiming real-money authority.',
  'No PSP, signed webhook verifier, provider event ledger or reconciliation worker is operational; browser and sandbox outcomes are not production payment evidence.',
  'Authenticated UUID receivable materialization and release remain fail-closed when server/provider authority is unavailable, while legacy local flows remain explicitly inventoried for later removal.'
];
for (const item of evidence) if (!pay.evidence.includes(item)) pay.evidence.push(item);

pay.nextActions = [
  'PAY-A02: establish a canonical authenticated payment authority boundary that rejects local financial mutation fallback for UUID sessions while preserving memory-only fixtures.',
  'PAY-A03: define a PSP-neutral payment-intent and signed-webhook event contract on the existing persistent idempotency store.',
  'PAY-A04: prepare provider-selection, legal, accounting, reconciliation and synthetic staging evaluation criteria without selecting or activating a PSP implicitly.'
];

fs.writeFileSync(file('config/domain-completion-matrix.json'), JSON.stringify(matrix, null, 2) + '\n');
console.log('PAY-A01 package and matrix updated.');
