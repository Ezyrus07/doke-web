#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const matrixPath = path.join(root, 'config/domain-completion-matrix.json');
const a04Path = path.join(root, 'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json');
const a05Path = path.join(root, 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json');
const a01AuditPath = path.join(root, 'scripts/audit-search-authority-baseline.js');
const a02AuditPath = path.join(root, 'scripts/audit-favorites-authority-retirement.js');
const a04AuditPath = path.join(root, 'scripts/audit-search-server-contract.js');
const validatedHead = '0dad31462c8fa4561501865b8dd730d452f87f08';
const recordedAt = '2026-07-28T14:48:00-03:00';

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function assert(condition, message) { if (!condition) throw new Error(`[SEARCH-A05 reconciliation] ${message}`); }
function same(actual, expected) { return JSON.stringify(actual) === JSON.stringify(expected); }
function bumpPatch(version) {
  const parts = String(version || '').split('.').map(Number);
  assert(parts.length === 3 && parts.every(Number.isInteger), `invalid matrix version: ${version}`);
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
function replaceOnce(file, oldText, newText) {
  const original = fs.readFileSync(file, 'utf8');
  assert(original.includes(oldText), `expected audit marker missing in ${path.relative(root, file)}`);
  fs.writeFileSync(file, original.replace(oldText, newText), 'utf8');
}

const matrix = readJson(matrixPath);
const search = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(search, 'SEARCH-001 domain is missing');
assert(search.maturity === 2, 'pre-reconciliation maturity must be 2');
assert(search.userFacingAuthority === 'hybrid', 'pre-reconciliation UI authority must be hybrid');
assert(search.serverAuthority === 'contract_only', 'pre-reconciliation server authority must be contract_only');
assert(search.stagingEvidence === 'local_e2e', 'pre-reconciliation staging evidence must be local_e2e');
assert(search.securityGate === 'blocked', 'security gate must remain blocked');
assert(search.productionGate === 'blocked', 'production gate must remain blocked');
const beforeBlockers = (search.blockers || []).map((item) => item.id).sort();
assert(same(beforeBlockers, ['SEARCH-B02', 'SEARCH-B03']), `unexpected blocker set: ${beforeBlockers.join(', ')}`);

search.maturity = 3;
search.serverAuthority = 'partial';
search.stagingEvidence = 'staging_canary';
search.blockers = search.blockers.filter((item) => item.id !== 'SEARCH-B02');
assert(same(search.blockers.map((item) => item.id).sort(), ['SEARCH-B03']), 'SEARCH-B03 must remain the only SEARCH blocker');
search.evidence = Array.from(new Set([...(search.evidence || []),
  'SEARCH-A04 installed the bounded public search RPC in staging with approved-snapshot indexing, exact geographic eligibility and transactional SQL validation.',
  'SEARCH-A05 activated canonical server-side service results with opaque cursor pagination, fail-closed errors and no full-catalog browser fallback.',
  'SEARCH-A05 head 0dad31462c8fa4561501865b8dd730d452f87f08 passed A01-A05, staging browser RPC validation, Quality #1369, blocking E2E, 105 guards and Diagnostic #1033.'
]));
search.nextActions = [
  'Define and validate server-controlled ranking signals, anti-manipulation rules, conversion instrumentation, monitoring and rollback for SEARCH-B03.',
  'Keep static users, Workers, publications, suggestions and browser-local search history explicitly governed until their own controlled sublots.'
];
for (const flow of matrix.criticalFlows || []) {
  if (Array.isArray(flow.blockers)) flow.blockers = flow.blockers.filter((id) => id !== 'SEARCH-B02');
}
matrix.version = bumpPatch(matrix.version);
matrix.updatedAt = recordedAt;

const a04 = readJson(a04Path);
assert(a04.status === 'COMPLETE', 'SEARCH-A04 must be complete');
a04.matrix = Object.assign({}, a04.matrix || {}, {
  version: matrix.version,
  maturity: 3,
  serverAuthority: 'partial',
  stagingEvidence: 'staging_canary',
  searchB02: 'reconciled_removed_by_SEARCH_A05',
  searchB03: 'preserved',
  securityGate: 'blocked',
  productionGate: 'blocked'
});

const a05 = readJson(a05Path);
assert(a05.domain === 'SEARCH-001' && a05.sublot === 'SEARCH-A05', 'A05 evidence identity is invalid');
a05.status = 'COMPLETE';
a05.recordedAt = recordedAt;
a05.validatedHead = validatedHead;
a05.validation = Object.assign({}, a05.validation || {}, {
  status: 'complete',
  cumulativeA01: 'success',
  cumulativeA02: 'success',
  cumulativeA03: 'success',
  cumulativeA04: 'success',
  dedicatedWorkflow: 'success',
  dedicatedWorkflowRunNumber: 43,
  dedicatedWorkflowRunId: 30383798670,
  stagingBrowser: 'success',
  stagingBrowserRunNumber: 15,
  stagingBrowserRunId: 30383798814,
  quality: 'success',
  qualityRunNumber: 1369,
  qualityRunId: 30383798834,
  blockingE2E: 'success',
  visualStructuralGuards: 'success',
  diagnostic: 'success',
  diagnosticRunNumber: 1033,
  diagnosticRunId: 30383799171,
  directCatalogRequests: 0,
  forcedRpcFailureFallbackUsed: false
});
a05.matrix = Object.assign({}, a05.matrix || {}, {
  version: matrix.version,
  maturity: 3,
  userFacingAuthority: 'hybrid',
  serverAuthority: 'partial',
  stagingEvidence: 'staging_canary',
  securityGate: 'blocked',
  productionGate: 'blocked',
  searchB02: 'reconciled_removed',
  searchB03: 'preserved'
});
a05.safety = Object.assign({}, a05.safety || {}, {
  stagingChangedByA05: false,
  productionChanged: false,
  realAccountsChanged: false,
  realServicesChanged: false,
  persistentSyntheticEntitiesCreated: false,
  temporaryApplicatorRemaining: false,
  temporaryDiagnosticRemaining: false,
  temporaryReconcilerRemaining: false,
  prMerged: false,
  prReadyForReview: false
});
a05.remaining = [
  'SEARCH-B03 remains: server-controlled ranking signals, anti-manipulation controls, conversion instrumentation, monitoring and rollback.',
  'Static non-service discovery pools and browser-local search history remain explicitly outside the completed service-results authority.'
];
a05.nextControlledStep = 'SEARCH-A06 — establish the server-controlled ranking baseline and observability contract for SEARCH-B03 without changing production.';

replaceOnce(a01AuditPath,
  "assert(searchDomain && searchDomain.maturity === 2, 'SEARCH-001 maturity must remain local_functional level 2 until controlled reconciliation');\nassert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid during staged activation');\nassert(searchDomain && searchDomain.serverAuthority === 'contract_only', 'SEARCH-001 server authority must remain contract_only until SEARCH-A05 reconciliation');\nassert(searchDomain && searchDomain.stagingEvidence === 'local_e2e', 'SEARCH-001 staging evidence must remain local_e2e until SEARCH-A05 reconciliation');",
  "const searchB02Reconciled = Boolean(a05Evidence && a05Evidence.status === 'COMPLETE' && a05Evidence.matrix && a05Evidence.matrix.searchB02 === 'reconciled_removed');\nassert(searchDomain && searchDomain.maturity === (searchB02Reconciled ? 3 : 2), 'SEARCH-001 maturity changed outside controlled A05 reconciliation');\nassert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid');\nassert(searchDomain && searchDomain.serverAuthority === (searchB02Reconciled ? 'partial' : 'contract_only'), 'SEARCH-001 server authority changed outside controlled A05 reconciliation');\nassert(searchDomain && searchDomain.stagingEvidence === (searchB02Reconciled ? 'staging_canary' : 'local_e2e'), 'SEARCH-001 staging evidence changed outside controlled A05 reconciliation');");
replaceOnce(a01AuditPath,
  "const expectedBlockers = favoritesSurfacesComplete\n  ? ['SEARCH-B02', 'SEARCH-B03']\n  : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03'];",
  "const expectedBlockers = searchB02Reconciled\n  ? ['SEARCH-B03']\n  : favoritesSurfacesComplete\n    ? ['SEARCH-B02', 'SEARCH-B03']\n    : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03'];");

replaceOnce(a02AuditPath,
  "  a03EvidenceJson: 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',\n  workflow: '.github/workflows/search-favorites-authority.yml'",
  "  a03EvidenceJson: 'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',\n  a05EvidenceJson: 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',\n  workflow: '.github/workflows/search-favorites-authority.yml'");
replaceOnce(a02AuditPath,
  "const matrix = JSON.parse(read(files.matrix));",
  "const a05Evidence = exists(files.a05EvidenceJson) ? JSON.parse(read(files.a05EvidenceJson)) : null;\nconst searchB02Reconciled = Boolean(a05Evidence && a05Evidence.status === 'COMPLETE' && a05Evidence.matrix && a05Evidence.matrix.searchB02 === 'reconciled_removed');\n\nconst matrix = JSON.parse(read(files.matrix));");
replaceOnce(a02AuditPath,
  "assert(search && search.maturity === 2, 'SEARCH-001 maturity cannot advance before full domain reconciliation');\nassert(search && search.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid during A02');\nassert(search && search.serverAuthority === 'contract_only', 'SEARCH-001 server authority must remain contract_only during A02');",
  "assert(search && search.maturity === (searchB02Reconciled ? 3 : 2), 'SEARCH maturity changed outside controlled reconciliation');\nassert(search && search.userFacingAuthority === 'hybrid', 'SEARCH user-facing authority must remain hybrid');\nassert(search && search.serverAuthority === (searchB02Reconciled ? 'partial' : 'contract_only'), 'SEARCH server authority changed outside controlled reconciliation');");
replaceOnce(a02AuditPath,
  "  same(blockers, searchB01Reconciled ? ['SEARCH-B02', 'SEARCH-B03'] : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03']),",
  "  same(blockers, searchB02Reconciled ? ['SEARCH-B03'] : searchB01Reconciled ? ['SEARCH-B02', 'SEARCH-B03'] : ['SEARCH-B01', 'SEARCH-B02', 'SEARCH-B03']),");

replaceOnce(a04AuditPath,
  "assert(searchDomain && searchDomain.maturity === 2, 'SEARCH-A04 cannot advance maturity before controlled A05 reconciliation');\nassert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH-A04/A05 candidate must preserve hybrid user-facing authority');\nassert(searchDomain && searchDomain.serverAuthority === 'contract_only', 'matrix server authority must remain contract_only until A05 reconciliation');\nassert(searchDomain && searchDomain.stagingEvidence === 'local_e2e', 'matrix staging evidence must remain local_e2e until A05 reconciliation');",
  "const searchB02Reconciled = Boolean(a05Evidence && a05Evidence.status === 'COMPLETE' && a05Evidence.matrix && a05Evidence.matrix.searchB02 === 'reconciled_removed');\nassert(searchDomain && searchDomain.maturity === (searchB02Reconciled ? 3 : 2), 'SEARCH maturity changed outside controlled A05 reconciliation');\nassert(searchDomain && searchDomain.userFacingAuthority === 'hybrid', 'SEARCH user-facing authority must remain hybrid');\nassert(searchDomain && searchDomain.serverAuthority === (searchB02Reconciled ? 'partial' : 'contract_only'), 'SEARCH server authority changed outside controlled A05 reconciliation');\nassert(searchDomain && searchDomain.stagingEvidence === (searchB02Reconciled ? 'staging_canary' : 'local_e2e'), 'SEARCH staging evidence changed outside controlled A05 reconciliation');");
replaceOnce(a04AuditPath,
  "assert(same(blockers, ['SEARCH-B02', 'SEARCH-B03']), 'SEARCH-A04/A05 candidate cannot remove SEARCH-B02 or SEARCH-B03');",
  "assert(same(blockers, searchB02Reconciled ? ['SEARCH-B03'] : ['SEARCH-B02', 'SEARCH-B03']), 'SEARCH blocker set changed outside controlled A05 reconciliation');");
replaceOnce(a04AuditPath,
  "evidence.matrix && evidence.matrix.searchB02 === (stagingValidated ? 'preserved_until_SEARCH_A05_activation' : 'preserved_until_activation_and_staging_validation'),",
  "evidence.matrix && ['preserved_until_SEARCH_A05_activation', 'preserved_until_activation_and_staging_validation', 'reconciled_removed_by_SEARCH_A05'].includes(evidence.matrix.searchB02),");

writeJson(matrixPath, matrix);
writeJson(a04Path, a04);
writeJson(a05Path, a05);

console.log('[SEARCH-A05 reconciliation] SEARCH-B02 removed.');
console.log(`[SEARCH-A05 reconciliation] Matrix advanced to ${matrix.version}.`);
console.log('[SEARCH-A05 reconciliation] Maturity 3, partial server authority and staging canary recorded.');
console.log('[SEARCH-A05 reconciliation] SEARCH-B03, security blocked and production blocked preserved.');
