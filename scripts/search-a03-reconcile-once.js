#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'config/domain-completion-matrix.json');
const a02Path = path.join(root, 'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json');
const a03Path = path.join(root, 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json');
const technicalHead = '23006e49f8903480f4c791fec5196504f0c60a8e';
const recordedAt = '2026-07-28T11:58:00-03:00';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function assert(condition, message) {
  if (!condition) throw new Error(`[SEARCH-A03 reconciliation] ${message}`);
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

const beforeBlockers = (search.blockers || []).map((blocker) => blocker.id).sort();
assert(
  JSON.stringify(beforeBlockers) === JSON.stringify(['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03']),
  `expected pre-reconciliation blockers SEARCH-B01/B02/B03, received ${beforeBlockers.join(', ')}`
);

search.blockers = search.blockers.filter((blocker) => blocker.id !== 'SEARCH-B01');
const afterBlockers = search.blockers.map((blocker) => blocker.id).sort();
assert(
  JSON.stringify(afterBlockers) === JSON.stringify(['SEARCH-B02', 'SEARCH-B03']),
  'SEARCH-B02 and SEARCH-B03 must remain unchanged'
);

const evidenceEntries = Array.isArray(search.evidence) ? search.evidence : [];
const closureEvidence = [
  'SEARCH-A02 retired browser-persistent favorite authority and made public.favorites canonical for authenticated UUID subjects.',
  'SEARCH-A03 activates one owner-scoped favorite snapshot across home, results, detail and owner-profile favorite surfaces without per-card reads.',
  'SEARCH-A03 technical head 23006e49f8903480f4c791fec5196504f0c60a8e passed dedicated authority/runtime gates, Quality #1294, blocking E2E, 105 structural guards and Diagnostic #958.'
];
search.evidence = Array.from(new Set([...evidenceEntries, ...closureEvidence]));

const remainingActions = (Array.isArray(search.nextActions) ? search.nextActions : []).filter((item) => {
  return !/favorite|favorito|secure favorites|proteger favoritos/i.test(String(item));
});
search.nextActions = Array.from(new Set([
  ...remainingActions,
  'Define and implement a bounded server-side search DTO with cursor pagination and deterministic geographic eligibility.',
  'Move ranking signals to a documented server-controlled baseline with conversion instrumentation, monitoring and rollback.'
]));

for (const flow of matrix.criticalFlows || []) {
  if (Array.isArray(flow.blockers)) flow.blockers = flow.blockers.filter((id) => id !== 'SEARCH-B01');
}

matrix.version = bumpPatch(matrix.version);
matrix.updatedAt = recordedAt;

const a02 = readJson(a02Path);
assert(a02.domain === 'SEARCH-001' && a02.sublot === 'SEARCH-A02', 'A02 evidence identity is invalid');
a02.status = 'COMPLETE';
a02.validatedCandidateHead = 'd61fc3a0ecdd10eb6a68ce89a497356f1461a209';
a02.validation = Object.assign({}, a02.validation || {}, {
  structuralAudit: 'success',
  runtime: 'success',
  fixtureMemory: 'success',
  remoteSelectInsertDelete: 'success',
  anonymousMutation: 'success',
  remoteUnavailableFailClosed: 'success',
  localStorageAbsence: 'success',
  moduleLoadOrder: 'success',
  ci: 'success',
  workflowRunNumber: 9,
  workflowRunId: 30363959406,
  finalPreservationRunNumber: 33,
  finalPreservationRunId: 30369427709
});
a02.matrix = Object.assign({}, a02.matrix || {}, {
  blockerPreservedUntilReconciliation: null,
  blockerCurrentDescriptionIsStale: false,
  searchB01: 'reconciled_removed_by_search_a03',
  maturityPreserved: 2,
  productionGatePreserved: 'blocked'
});
a02.remaining = [
  'Preserve public.favorites as the authenticated persistence authority while SEARCH-B02 and SEARCH-B03 are executed.',
  'Do not reintroduce browser-persistent favorite state or per-card favorite reads.'
];
a02.nextControlledStep = 'Proceed through SEARCH-A03 closure into bounded server-side search, pagination, geographic eligibility and ranking integrity.';
a02.safety = Object.assign({}, a02.safety || {}, {
  stagingChanged: false,
  productionChanged: false,
  realAccountsChanged: false,
  realFavoritesChanged: false,
  persistentSyntheticEntitiesCreated: false,
  prMerged: false,
  prReadyForReview: false
});

const a03 = readJson(a03Path);
assert(a03.domain === 'SEARCH-001' && a03.sublot === 'SEARCH-A03', 'A03 evidence identity is invalid');
a03.status = 'COMPLETE';
a03.recordedAt = recordedAt;
a03.integratedHead = technicalHead;
a03.validatedTechnicalHead = technicalHead;
a03.validation = Object.assign({}, a03.validation || {}, {
  structuralAudit: 'success',
  runtime: 'success',
  cumulativeA01: 'success',
  cumulativeA02: 'success',
  dedicatedWorkflow: 'success',
  dedicatedWorkflowRunNumber: 34,
  dedicatedWorkflowRunId: 30369426024,
  quality: 'success',
  qualityRunNumber: 1294,
  qualityRunId: 30369427561,
  blockingE2E: 'success',
  visualStructuralGuards: 'success',
  diagnostic: 'success',
  diagnosticRunNumber: 958,
  diagnosticRunId: 30369425991,
  matrixAudit: 'success',
  status: 'complete'
});
a03.matrix = Object.assign({}, a03.matrix || {}, {
  maturityPreserved: 2,
  securityGatePreserved: 'blocked',
  productionGatePreserved: 'blocked',
  searchB01: 'reconciled_removed',
  searchB02: 'preserved',
  searchB03: 'preserved'
});
a03.safety = Object.assign({}, a03.safety || {}, {
  stagingChanged: false,
  productionChanged: false,
  realAccountsChanged: false,
  realFavoritesChanged: false,
  persistentSyntheticEntitiesCreated: false,
  paidConfigChanged: false,
  smsOrOauthChanged: false,
  communityFilesChanged: false,
  temporaryWorkflowRemaining: false,
  temporaryScriptRemaining: false,
  prMerged: false,
  prReadyForReview: false
});
a03.remaining = [
  'SEARCH-B02 remains: move filtering, geographic eligibility and bounded cursor pagination to a canonical server-side search contract.',
  'SEARCH-B03 remains: establish documented ranking signals, anti-manipulation controls, conversion instrumentation, monitoring and rollback.',
  'Search history and non-service discovery pools remain browser-local/static until their controlled sublots.'
];
a03.nextControlledStep = 'SEARCH-A04 — define the canonical server-side search DTO, bounded cursor pagination and deterministic geographic eligibility without promoting production.';

writeJson(matrixPath, matrix);
writeJson(a02Path, a02);
writeJson(a03Path, a03);

console.log('[SEARCH-A03 reconciliation] SEARCH-B01 removed.');
console.log(`[SEARCH-A03 reconciliation] Matrix version advanced to ${matrix.version}.`);
console.log('[SEARCH-A03 reconciliation] Maturity 2, security blocked and production blocked preserved.');
console.log('[SEARCH-A03 reconciliation] SEARCH-B02 and SEARCH-B03 remain open.');
