#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[PROF-B03-KYC-EVIDENCE] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  repository: 'assets/js/repositories/professional-verification-evidence-repository.js',
  verificationRepository: 'assets/js/repositories/professional-identity-verifications-repository.js',
  service: 'assets/js/services/professional-identity-verification-service.js',
  edgeFunction: 'supabase/functions/professional-verification-operations/index.ts',
  authorityDoc: 'docs/SECURITY-PROFESSIONAL-KYC-AUTHORITY.md',
  runtime: 'scripts/test-professional-verification-evidence-authority-retirement-runtime.js',
  evidenceJson: 'docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.json',
  evidenceMarkdown: 'docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.md',
  quality: '.github/workflows/quality.yml',
  matrix: 'config/domain-completion-matrix.json'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const repository = read(files.repository);
[
  "authority: 'supabase-storage-or-fixture-memory'",
  'fixtureEvidence = new Map()',
  'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE',
  "sessionProvider() === 'supabase'",
  'isUuid(userId)',
  'function save(',
  'function getByVerificationId(',
  'function remove('
].forEach((marker) => assert(repository.includes(marker), `retirement marker missing: ${marker}`));

[
  'indexedDB',
  'IDB',
  'doke-professional-verification-evidence-v1',
  'databaseName:',
  'openDatabase',
  'createObjectStore',
  'objectStore(',
  '.transaction('
].forEach((marker) => assert(!repository.includes(marker), `browser-persistent binary evidence authority remains: ${marker}`));

const verificationRepository = read(files.verificationRepository);
[
  "authority: 'supabase-service-or-fixture-memory'",
  'repositories.professionalVerificationEvidence',
  'evidence.save(verificationId, ownerId, rawPayload)'
].forEach((marker) => assert(verificationRepository.includes(marker), `fixture evidence boundary marker missing: ${marker}`));
assert(!verificationRepository.includes('indexedDB'), 'verification record repository must not own IndexedDB evidence');

const service = read(files.service);
[
  "remoteVerificationOperation('prepare_uploads'",
  '.uploadToSignedUrl(',
  "remoteVerificationOperation('submit'",
  'hydrateRemoteDocumentUrls',
  "from('professional_identity_verifications')"
].forEach((marker) => assert(service.includes(marker), `canonical remote evidence marker missing: ${marker}`));

const edgeFunction = read(files.edgeFunction);
[
  'action === "prepare_uploads"',
  'create_professional_kyc_upload_intent_internal',
  '.createSignedUploadUrl(path)',
  'submit_professional_identity_verification_internal'
].forEach((marker) => assert(edgeFunction.includes(marker), `Edge evidence authority marker missing: ${marker}`));

const authorityDoc = read(files.authorityDoc);
[
  '`storage.objects` in `professional-verification-media`: private binary evidence',
  'uploadToSignedUrl',
  'Final submission is service-role-only'
].forEach((marker) => assert(authorityDoc.includes(marker), `KYC authority documentation marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  "createContext('supabase')",
  "createContext('fixture')",
  'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE',
  'fixture binary evidence survived a fresh runtime',
  'INDEXED_DB_FORBIDDEN'
].forEach((marker) => assert(runtime.includes(marker), `runtime retirement coverage missing: ${marker}`));

const quality = read(files.quality);
[
  'Audit PROF-B03 KYC evidence authority retirement',
  'node scripts/audit-professional-verification-evidence-authority-retirement.js',
  'Test PROF-B03 KYC evidence authority retirement runtime',
  'node scripts/test-professional-verification-evidence-authority-retirement-runtime.js'
].forEach((marker) => assert(quality.includes(marker), `Quality gate integration missing: ${marker}`));

const matrix = JSON.parse(read(files.matrix));
const prof = (matrix.domains || []).find((domain) => domain.id === 'PROF-001');
assert(Boolean(prof), 'PROF-001 is missing from the domain completion matrix');
assert(prof && prof.userFacingAuthority === 'remote', 'PROF-001 UI authority must be remote after PROF-B03');
assert(prof && prof.serverAuthority === 'canonical', 'PROF-001 server authority must be canonical after PROF-B03');
assert(prof && prof.productionGate === 'blocked', 'PROF-001 production gate must remain blocked');
assert(!(prof && prof.blockers || []).some((item) => item.id === 'PROF-B03'), 'retired PROF-B03 blocker remains active');
assert((prof && prof.blockers || []).some((item) => item.id === 'PROF-B04'), 'PROF-B04 must remain explicit');
assert((prof && prof.blockers || []).some((item) => item.id === 'PROF-B05'), 'PROF-B05 must remain explicit');

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-B03-KYC-EVIDENCE', 'evidence identity is invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'evidence status is invalid');
assert(evidence.authority.browserPersistentEvidenceAuthority === 'retired', 'IndexedDB evidence retirement is not documented');
assert(evidence.authority.fixtureCompatibility === 'memory_only', 'fixture evidence must remain memory-only');
assert(evidence.authority.remoteFailureMode === 'fail_closed', 'remote evidence failure mode must remain fail_closed');
assert(evidence.safety.migrationApplied === false, 'PROF-B03 cannot claim a migration');
assert(evidence.safety.edgeFunctionDeployed === false, 'PROF-B03 cannot claim an Edge Function deployment');
assert(evidence.safety.stagingChanged === false, 'PROF-B03 cannot change staging');
assert(evidence.safety.productionChanged === false, 'PROF-B03 cannot change production');
assert(evidence.remainingBlockers.every((item) => item.id !== 'PROF-B03'), 'retired PROF-B03 remains in machine blockers');

if (evidence.status === 'done') {
  const requiredSuccessFields = [
    'staticAudit',
    'runtimeRetirement',
    'cumulativeProfA01',
    'cumulativeProfA02',
    'cumulativeProfA03',
    'cumulativeProfA04',
    'deterministicMatrix',
    'quality',
    'blockingE2E',
    'visualStructuralGuards',
    'stagingCanary',
    'diagnostic',
    'finalEvidence'
  ];
  requiredSuccessFields.forEach((field) => {
    assert(
      evidence.validation && evidence.validation[field] === 'success',
      `PROF-B03 cannot be done while validation.${field} is not success`
    );
  });
  assert(Number.isInteger(evidence.validation.qualityRunNumber), 'done evidence requires qualityRunNumber');
  assert(Number.isInteger(evidence.validation.stagingCanaryRunNumber), 'done evidence requires stagingCanaryRunNumber');
  assert(Number.isInteger(evidence.validation.diagnosticRunNumber), 'done evidence requires diagnosticRunNumber');
}

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'Retirada da autoridade IndexedDB',
  'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE',
  'Nenhuma migration',
  'Staging e produção'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), `human evidence marker missing: ${marker}`));
if (evidence.status === 'done') assert(evidenceMarkdown.includes('`DONE`'), 'done JSON evidence requires DONE human evidence');

if (!process.exitCode) {
  console.log('[PROF-B03-KYC-EVIDENCE] IndexedDB evidence authority is retired.');
  console.log('[PROF-B03-KYC-EVIDENCE] Supabase Storage remains the only real binary-evidence authority.');
  console.log('[PROF-B03-KYC-EVIDENCE] Fixture binary evidence is memory-only.');
  console.log('[PROF-B03-KYC-EVIDENCE] Remaining blockers: PROF-B04 and PROF-B05.');
}
