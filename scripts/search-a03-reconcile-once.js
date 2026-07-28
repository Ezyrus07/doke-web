#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'config/domain-completion-matrix.json');
const a02Path = path.join(root, 'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json');
const a03Path = path.join(root, 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json');
const recordedAt = '2026-07-28T12:06:00-03:00';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(`[SEARCH-A03 final cleanup] ${message}`);
}

function bumpPatch(version) {
  const parts = String(version || '0.0.0').split('.').map((item) => Number(item));
  assert(parts.length === 3 && parts.every(Number.isInteger), `invalid matrix version: ${version}`);
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

const matrix = readJson(matrixPath);
const search = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(search, 'SEARCH-001 domain is missing');
assert(search.maturity === 2, 'maturity must remain 2');
assert(search.userFacingAuthority === 'hybrid', 'user-facing authority must remain hybrid');
assert(search.serverAuthority === 'contract_only', 'server authority must remain contract_only');
assert(search.stagingEvidence === 'local_e2e', 'staging evidence must remain local_e2e');
assert(search.securityGate === 'blocked', 'security gate must remain blocked');
assert(search.productionGate === 'blocked', 'production gate must remain blocked');

const blockerIds = (search.blockers || []).map((blocker) => blocker.id).sort();
assert(
  JSON.stringify(blockerIds) === JSON.stringify(['SEARCH-B02', 'SEARCH-B03']),
  `expected only SEARCH-B02/B03 after reconciliation, received ${blockerIds.join(', ')}`
);

const staleEvidence = new Set([
  'favorites has RLS disabled.',
  'No dedicated production search/indexing service is canonical.'
]);
const preservedEvidence = (Array.isArray(search.evidence) ? search.evidence : [])
  .filter((item) => !staleEvidence.has(String(item)));
search.evidence = Array.from(new Set([
  ...preservedEvidence,
  'No dedicated canonical server-side search and indexing contract exists yet.',
  'Read-only staging inspection confirmed public.favorites RLS enabled with three owner-scoped SELECT, INSERT and DELETE policies.',
  'SEARCH-A02 retired browser-persistent favorite authority and made public.favorites canonical for authenticated UUID subjects.',
  'SEARCH-A03 activates one owner-scoped favorite snapshot across home, results, detail and owner-profile favorite surfaces without per-card reads.',
  'SEARCH-A03 technical head 23006e49f8903480f4c791fec5196504f0c60a8e passed dedicated authority/runtime gates, Quality #1294, blocking E2E, 105 structural guards and Diagnostic #958.'
]));

const canonicalActions = [
  'Define and implement a bounded server-side search DTO with cursor pagination and deterministic geographic eligibility.',
  'Move ranking signals to a documented server-controlled baseline with conversion instrumentation, monitoring and rollback.'
];
search.nextActions = canonicalActions;

for (const flow of matrix.criticalFlows || []) {
  if (Array.isArray(flow.blockers)) flow.blockers = flow.blockers.filter((id) => id !== 'SEARCH-B01');
}

matrix.version = bumpPatch(matrix.version);
matrix.updatedAt = recordedAt;

const a02 = readJson(a02Path);
assert(a02.status === 'COMPLETE', 'A02 must already be complete');
a02.matrix = Object.assign({}, a02.matrix || {}, {
  version: matrix.version,
  blockerPreservedUntilReconciliation: null,
  blockerCurrentDescriptionIsStale: false,
  searchB01: 'reconciled_removed_by_search_a03',
  maturityPreserved: 2,
  productionGatePreserved: 'blocked'
});

const a03 = readJson(a03Path);
assert(a03.status === 'COMPLETE', 'A03 must already be complete');
a03.recordedAt = recordedAt;
a03.matrix = Object.assign({}, a03.matrix || {}, {
  version: matrix.version,
  maturityPreserved: 2,
  securityGatePreserved: 'blocked',
  productionGatePreserved: 'blocked',
  searchB01: 'reconciled_removed',
  searchB02: 'preserved',
  searchB03: 'preserved'
});
a03.validation = Object.assign({}, a03.validation || {}, {
  matrixAudit: 'success',
  documentaryCleanup: 'complete',
  status: 'complete'
});
a03.safety = Object.assign({}, a03.safety || {}, {
  temporaryWorkflowRemaining: false,
  temporaryScriptRemaining: false,
  stagingChanged: false,
  productionChanged: false,
  realFavoritesChanged: false,
  prMerged: false,
  prReadyForReview: false
});

writeJson(matrixPath, matrix);
writeJson(a02Path, a02);
writeJson(a03Path, a03);

console.log('[SEARCH-A03 final cleanup] Stale RLS evidence removed.');
console.log('[SEARCH-A03 final cleanup] SEARCH-B02 and SEARCH-B03 remain open.');
console.log(`[SEARCH-A03 final cleanup] Matrix version advanced to ${matrix.version}.`);
