#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'config/domain-completion-matrix.json');
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const cat = (matrix.domains || []).find((domain) => domain.id === 'CAT-001');

if (!cat) throw new Error('CAT-001 domain not found.');
if (cat.userFacingAuthority !== 'hybrid') throw new Error('CAT-A02 must not advance CAT-001 beyond hybrid authority.');
if (cat.serverAuthority !== 'canonical') throw new Error('CAT-001 canonical server authority changed unexpectedly.');

const requiredPaths = [
  'scripts/audit-service-catalog-authority-retirement.js',
  'scripts/test-service-catalog-authority-retirement-runtime.js',
  'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json',
  'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.md'
];

cat.requiredPaths = Array.from(new Set([...(cat.requiredPaths || []), ...requiredPaths]));

const blockers = new Map((cat.blockers || []).map((blocker) => [blocker.id, blocker]));
if (!blockers.has('CAT-B03') || !blockers.has('CAT-B04')) {
  throw new Error('CAT-A02 must preserve CAT-B03 and CAT-B04.');
}
blockers.get('CAT-B03').description = 'Owner edit, pause, reactivate and archive still route through generic repository saves without explicit server operations or a final lifecycle contract.';

cat.evidence = (cat.evidence || []).filter((item) =>
  item !== 'Services repository retains localStorage and sessionStorage fallback paths.' &&
  item !== 'CAT-A01 freezes the hybrid browser/remote service authority boundary and adds a permanent regression audit before CAT-B03 retirement.'
);
cat.evidence.push('CAT-A01 preserves the historical authority baseline and remains a cumulative regression gate.');
cat.evidence.push('CAT-A02 retires doke.services.local.v1: real and UUID subjects fail closed, while non-UUID fixtures remain runtime-only memory.');

cat.nextActions = [
  'Move owner edit, pause, reactivate and archive to explicit server operations without bypassing versioned moderation.',
  'Close service-media replacement and abandoned-draft cleanup lifecycle.',
  'Guarantee immutable service snapshot on every order creation path.'
];

matrix.version = '1.3.6';
matrix.updatedAt = '2026-07-27T14:36:00-03:00';

fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');
console.log('CAT-A02 domain matrix reconciliation applied.');
