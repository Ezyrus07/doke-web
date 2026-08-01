#!/usr/bin/env node
'use strict';

const fs = require('fs');

const packagePath = 'package.json';
const matrixPath = 'config/domain-completion-matrix.json';
const selfPath = 'scripts/apply-sched-001-b04c-authenticated-ord-sched-canary-readiness.js';

const auditScript = 'audit:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness';
const testScript = 'test:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness';
const paths = [
  'config/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.json',
  'docs/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-READINESS.md',
  'docs/validation/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-READINESS.json',
  'scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js',
  'scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js',
  '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.yml'
];

function unique(items) {
  return Array.from(new Set(items));
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts[auditScript] = 'node scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js';
pkg.scripts[testScript] = 'node scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js';
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
if (matrix.version !== '1.3.65') {
  throw new Error(`Expected matrix 1.3.65 before B04C readiness, found ${matrix.version}`);
}
matrix.version = '1.3.66';
matrix.updatedAt = '2026-08-01T13:11:00-03:00';

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!sched || !ord) throw new Error('SCHED-001 or ORD-001 missing from matrix');

for (const domain of [sched, ord]) {
  domain.requiredPaths = unique([...(domain.requiredPaths || []), ...paths]);
  domain.tests = unique([...(domain.tests || []), auditScript, testScript]);
}

const evidence = 'SCHED-B04C froze the authenticated ORD/SCHED composition canary contract with synthetic personas, SERIALIZABLE rollback, cross-domain idempotency and zero-residue verification; no staging access was performed.';
sched.evidence = unique([...(sched.evidence || []), evidence]);
ord.evidence = unique([...(ord.evidence || []), evidence]);

const nextAction = 'Execute SCHED-B04C authenticated ORD/SCHED composition canary only after the exact independent staging authorization.';
sched.nextActions = unique([nextAction, ...(sched.nextActions || []).filter((item) => !String(item).includes('SCHED-B04C'))]);
ord.nextActions = unique([nextAction, ...(ord.nextActions || []).filter((item) => !String(item).includes('SCHED-B04C'))]);

if (sched.maturity !== 3) throw new Error(`SCHED maturity must remain 3, found ${sched.maturity}`);
if (sched.serverAuthority !== 'partial') throw new Error(`SCHED serverAuthority must remain partial, found ${sched.serverAuthority}`);
if (!sched.blockers.some((blocker) => blocker.id === 'SCHED-B04')) throw new Error('SCHED-B04 must remain open');
if (!ord.blockers.some((blocker) => blocker.id === 'ORD-B04')) throw new Error('ORD-B04 must remain open');

fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');
fs.unlinkSync(selfPath);
console.log('SCHED-B04C readiness package and matrix reconciliation applied; temporary script removed.');
