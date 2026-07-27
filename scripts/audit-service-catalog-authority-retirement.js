#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[CAT-A02] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  repository: 'assets/js/repositories/services-repository.js',
  baselineAudit: 'scripts/audit-service-catalog-authority-baseline.js',
  runtime: 'scripts/test-service-catalog-authority-retirement-runtime.js',
  repositoryContract: 'scripts/test-services-supabase-repository-contract.js',
  detailContract: 'scripts/test-detail-ad-canonical-route-contract.js',
  evidenceJson: 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json',
  evidenceMarkdown: 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.md',
  journal: 'docs/DOKE-ENGINEERING-JOURNAL.md',
  quality: '.github/workflows/quality.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const repository = read(files.repository);
[
  "AUTHORITY = 'supabase-or-fixture-memory'",
  'var fixtureServices = [];',
  'function readFixtureServices()',
  'function writeFixtureServices(items)',
  'function upsertFixture(service)',
  'function removeFixture(serviceId)',
  'function isRemoteSubject(service, user)',
  'function createAuthorityUnavailableError(context, cause)',
  "error.code = 'DOKE_SERVICE_AUTHORITY_UNAVAILABLE'",
  "setProviderState('remote-unavailable')",
  "setProviderState('fixture-memory')",
  "createDirectMutationForbiddenError('gravação direta')",
  "throw createAuthorityUnavailableError('leitura', error)",
  'authority: AUTHORITY',
  "provider: getSupabaseClient() ? 'supabase' : 'fixture-memory'",
  'fallbackActive: false'
].forEach((marker) => assert(repository.includes(marker), `retirement marker missing: ${marker}`));

[
  'doke.services.local.v1',
  'localStorage',
  'STORAGE_KEY',
  'synchronizePending',
  'syncPending',
  'upsertLocal',
  'removeLocal',
  'readLocalServices',
  'writeLocalServices',
  'resolveReadableLocalService',
  'local-fallback',
  'Usando fallback local',
  'O rascunho continuará salvo neste dispositivo'
].forEach((marker) => assert(!repository.includes(marker), `retired browser authority marker remains: ${marker}`));

[
  "REMOTE_TABLE = 'services'",
  "REMOTE_MEDIA_TABLE = 'service_media'",
  "REMOTE_VERSIONS_TABLE = 'service_versions'",
  'fetchRemoteServices',
  'fetchRemoteServiceById',
  "invokeSelfService('submit_service_for_review'",
  'getOwnedReviewDraft',
  'isPubliclyVisible',
  'approvedContentRemainsPublic'
].forEach((marker) => assert(repository.includes(marker), `canonical remote marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  'localStorage read is forbidden',
  'A fresh runtime must not recover fixture services.',
  'DOKE_SERVICE_AUTHORITY_UNAVAILABLE',
  'Configured remote catalog read must reject instead of returning a browser fallback.',
  "provider === 'fixture-memory'"
].forEach((marker) => assert(runtime.includes(marker), `runtime assertion missing: ${marker}`));

const repositoryContract = read(files.repositoryContract);
[
  "AUTHORITY = 'supabase-or-fixture-memory'",
  'DOKE_SERVICE_AUTHORITY_UNAVAILABLE',
  'DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN',
  'localStorage must not be accessed by the service repository.'
].forEach((marker) => assert(repositoryContract.includes(marker), `repository contract not reconciled: ${marker}`));
assert(!repositoryContract.includes('synchronizePending'), 'repository contract still requires pending browser synchronization');
assert(!repositoryContract.includes("syncStatus: 'pending'"), 'repository contract still requires pending browser persistence');

const detailContract = read(files.detailContract);
[
  'fixture-memory',
  'Fixture service must remain readable to its owner in the same runtime.',
  'A separate runtime must not recover the fixture service.',
  'Repository must not expose browser-persistent service authority.'
].forEach((marker) => assert(detailContract.includes(marker), `detail route contract not reconciled: ${marker}`));
assert(!detailContract.includes("'doke.services.local.v1':"), 'detail route runtime still seeds retired storage');

const baselineAudit = read(files.baselineAudit);
[
  'catA02Retired',
  "browserPersistentAuthority === 'retired'",
  "AUTHORITY = 'supabase-or-fixture-memory'",
  'same(localAuthorityOwners, catA02Retired ? [] : [files.repository])'
].forEach((marker) => assert(baselineAudit.includes(marker), `CAT-A01 cumulative reconciliation missing: ${marker}`));

const quality = read(files.quality);
[
  'Audit CAT-A02 service authority retirement',
  'node scripts/audit-service-catalog-authority-retirement.js',
  'Test CAT-A02 service authority retirement runtime',
  'node scripts/test-service-catalog-authority-retirement-runtime.js'
].forEach((marker) => assert(quality.includes(marker), `Quality integration missing: ${marker}`));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'CAT-001' && evidence.sublot === 'CAT-A02', 'CAT-A02 evidence identity is invalid');
assert(['implementation_pending', 'validation_pending', 'done'].includes(evidence.status), 'CAT-A02 status is invalid');
assert(evidence.authority && evidence.authority.browserPersistentAuthority === 'retired', 'CAT-A02 evidence must mark browser persistence retired');
assert(evidence.authority && evidence.authority.fixtureCompatibility === 'memory_only', 'CAT-A02 evidence must mark fixtures memory-only');
assert(evidence.authority && evidence.authority.remoteFailureMode === 'fail_closed', 'CAT-A02 evidence must mark remote failure fail-closed');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'CAT-A02 cannot change staging');
assert(evidence.safety && evidence.safety.productionChanged === false, 'CAT-A02 cannot change production');
assert(evidence.safety && evidence.safety.realAccountChanged === false, 'CAT-A02 cannot modify real accounts');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'doke.services.local.v1',
  'memory-only',
  'fail closed',
  'CAT-A03'
].forEach((marker) => assert(evidenceMarkdown.toLowerCase().includes(marker.toLowerCase()), `human evidence marker missing: ${marker}`));

if (evidence.status === 'done') {
  const requiredSuccess = [
    'staticAudit',
    'runtimeRetirement',
    'cumulativeCatA01',
    'repositoryContract',
    'detailRouteContract',
    'deterministicMatrix',
    'quality',
    'blockingE2E',
    'visualStructuralGuards',
    'stagingCanary',
    'diagnostic',
    'finalEvidence'
  ];
  requiredSuccess.forEach((field) => {
    assert(evidence.validation && evidence.validation[field] === 'success', `completed CAT-A02 evidence requires validation.${field}=success`);
  });
  ['qualityRunNumber', 'stagingCanaryRunNumber', 'diagnosticRunNumber'].forEach((field) => {
    assert(Number.isInteger(evidence.validation && evidence.validation[field]), `completed CAT-A02 evidence requires integer validation.${field}`);
  });
  assert(/^[0-9a-f]{40}$/i.test(String(evidence.validatedCandidateHead || '')), 'completed CAT-A02 evidence requires a full validatedCandidateHead');
  assert(evidence.safety.temporaryWorkflowRemaining === false, 'completed CAT-A02 cannot leave a temporary workflow');
  assert(evidence.safety.temporaryCodemodRemaining === false, 'completed CAT-A02 cannot leave a temporary codemod');
  assert(evidenceMarkdown.includes('DONE'), 'completed CAT-A02 human evidence must be marked DONE');
  assert(
    read(files.journal).includes('# 2026-07-27 — CAT-A02 / retirada da autoridade persistente de serviços'),
    'completed CAT-A02 evidence requires the engineering journal entry'
  );
}

if (!process.exitCode) {
  console.log('[CAT-A02] browser-persistent service authority is retired.');
  console.log('[CAT-A02] Supabase and UUID subjects fail closed.');
  console.log('[CAT-A02] non-UUID fixtures are runtime-only memory.');
}
