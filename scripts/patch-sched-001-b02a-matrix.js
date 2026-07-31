#!/usr/bin/env node
'use strict';

const fs = require('fs');

const matrixPath = 'config/domain-completion-matrix.json';
const packagePath = 'package.json';
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (matrix.version !== '1.3.50') {
  throw new Error(`SCHED_B02A_MATRIX_VERSION_UNEXPECTED:${matrix.version}`);
}

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
if (!sched) throw new Error('SCHED_B02A_DOMAIN_MISSING');
if (sched.maturity !== 3) throw new Error(`SCHED_B02A_MATURITY_UNEXPECTED:${sched.maturity}`);

const requiredPaths = [
  'backend/modules/scheduling/scheduling-composition-root.js',
  'config/sched-001-b02-composition-root-readiness.json',
  'docs/SCHED-001-B02-COMPOSITION-ROOT-READINESS.md',
  'docs/validation/SCHED-001-B02-COMPOSITION-ROOT-READINESS.json',
  'scripts/audit-sched-001-b02-composition-root-readiness.js',
  'scripts/test-sched-001-b02-composition-root-runtime.js',
  '.github/workflows/sched-001-b02-composition-root-readiness.yml'
];

requiredPaths.forEach((path) => appendUnique(sched.requiredPaths, path));
appendUnique(sched.tests, 'audit:sched-001-b02-composition-root-readiness');
appendUnique(sched.tests, 'test:sched-001-b02-composition-root-runtime');
appendUnique(
  sched.evidence,
  'SCHED-B02A implements a fail-closed trusted composition root that composes the existing PostgreSQL adapter and scheduling service only when the exact staging flag, environment and project ref match; no runtime, database, deployment or production mutation occurred.'
);

const blocker = sched.blockers.find((item) => item.id === 'SCHED-B02');
if (!blocker) throw new Error('SCHED_B02A_BLOCKER_MISSING');
blocker.description = 'The trusted composition root exists with an exact staging-only fail-closed gate, but authenticated staging activation and command-boundary canaries are pending.';

sched.nextActions = [
  'Execute the SCHED-B02B authenticated staging composition canary for client, professional, support and administrator personas with rollback and residue verification.',
  'Activate the trusted scheduling composition root only in staging behind the exact fail-closed environment and project-ref gate after explicit authorization.',
  'Wire ORD-001 to consume schedule_reservation_id and scheduled_at only as the canonical reservation reference and projection after SCHED-B02 is independently closed.',
  'Keep production, frontend authority switch, Cron, workers, deployment and merge blocked until SCHED-B02 and SCHED-B04 have independent evidence.'
];

pkg.scripts = pkg.scripts || {};
pkg.scripts['audit:sched-001-b02-composition-root-readiness'] = 'node scripts/audit-sched-001-b02-composition-root-readiness.js';
pkg.scripts['test:sched-001-b02-composition-root-runtime'] = 'node scripts/test-sched-001-b02-composition-root-runtime.js';

matrix.version = '1.3.51';
matrix.updatedAt = process.env.SCHED_B02A_UPDATED_AT || new Date().toISOString();

fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log('SCHED-B02A matrix reconciliation prepared.');

function appendUnique(list, value) {
  if (!Array.isArray(list)) throw new Error('SCHED_B02A_EXPECTED_ARRAY');
  if (!list.includes(value)) list.push(value);
}
