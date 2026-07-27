#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[PROF-A04] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  repository: 'assets/js/repositories/professional-identity-verifications-repository.js',
  service: 'assets/js/services/professional-identity-verification-service.js',
  runtime: 'scripts/test-professional-verification-draft-authority-retirement-runtime.js',
  evidenceJson: 'docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.json',
  evidenceMarkdown: 'docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.md',
  quality: '.github/workflows/quality.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const repository = read(files.repository);
[
  "authority: 'supabase-service-or-fixture-memory'",
  "sessionProvider() === 'supabase'",
  'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE',
  'fixtureRecords = new Map()',
  'fixtureDrafts = new Map()',
  'submissionLocks = new Map()'
].forEach((marker) => assert(repository.includes(marker), `retirement marker missing: ${marker}`));

[
  '.localStorage',
  '.sessionStorage',
  '.getItem(',
  '.setItem(',
  '.removeItem(',
  'indexedDB',
  'doke.professionalIdentityVerifications.v1',
  'doke.professionalIdentityVerificationDrafts.v1',
  'storageKey:',
  'draftStorageKey:'
].forEach((marker) => assert(!repository.includes(marker), `browser-persistent KYC draft authority remains: ${marker}`));

const service = read(files.service);
[
  "String(session.provider || '').toLowerCase() === 'supabase'",
  "remoteRpc('save_professional_verification_draft'",
  "from('professional_identity_verifications')",
  "remoteVerificationOperation('submit'"
].forEach((marker) => assert(service.includes(marker), `canonical Supabase verification marker missing: ${marker}`));
assert(!service.includes("localStorage.setItem('doke.professionalIdentityVerifications.v1'"), 'service revived retired KYC record storage');
assert(!service.includes("sessionStorage.setItem('doke.professionalIdentityVerificationDrafts.v1'"), 'service revived retired KYC draft storage');

const runtime = read(files.runtime);
[
  "createStorageProbe('LOCAL_STORAGE')",
  "createStorageProbe('SESSION_STORAGE')",
  "createContext('supabase')",
  "createContext('fixture')",
  'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE',
  'fixture state survived a fresh runtime',
  'PROF-B03-KYC-EVIDENCE'
].forEach((marker) => assert(runtime.includes(marker), `runtime retirement coverage missing: ${marker}`));

const quality = read(files.quality);
[
  'Audit PROF-A04 KYC draft authority retirement',
  'node scripts/audit-professional-verification-draft-authority-retirement.js',
  'Test PROF-A04 KYC draft authority retirement runtime',
  'node scripts/test-professional-verification-draft-authority-retirement-runtime.js'
].forEach((marker) => assert(quality.includes(marker), `Quality gate integration missing: ${marker}`));

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A04', 'PROF-A04 evidence identity is invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'PROF-A04 evidence status is invalid');
assert(evidence.authority.browserPersistentRecordAuthority === 'retired', 'record authority retirement is not documented');
assert(evidence.authority.browserPersistentDraftAuthority === 'retired', 'draft authority retirement is not documented');
assert(evidence.authority.remoteFailureMode === 'fail_closed', 'remote failure mode must remain fail_closed');
assert(evidence.safety.migrationApplied === false, 'PROF-A04 cannot claim a migration');
assert(evidence.safety.edgeFunctionDeployed === false, 'PROF-A04 cannot claim an Edge Function deployment');
assert(evidence.safety.stagingChanged === false, 'PROF-A04 cannot change staging');
assert(evidence.safety.productionChanged === false, 'PROF-A04 cannot change production');
assert(evidence.safety.realAccountChanged === false, 'PROF-A04 cannot change real accounts');
assert(evidence.remainingBlockers.some((item) => item.id === 'PROF-B03-KYC-EVIDENCE'), 'IndexedDB evidence blocker must remain explicit');

const evidenceMarkdown = read(files.evidenceMarkdown);
[
  'Retirada da autoridade local do rascunho KYC',
  'PROF-B03-KYC-EVIDENCE',
  'Nenhuma migration é necessária',
  'Staging e produção devem permanecer inalterados'
].forEach((marker) => assert(evidenceMarkdown.includes(marker), `human evidence marker missing: ${marker}`));

if (!process.exitCode) {
  console.log('[PROF-A04] browser-persistent KYC record and draft authority is retired.');
  console.log('[PROF-A04] Supabase draft and submission authority remains canonical.');
  console.log('[PROF-A04] fixture record and draft compatibility is memory-only.');
  console.log('[PROF-A04] binary evidence IndexedDB remains isolated for PROF-B03-KYC-EVIDENCE.');
}
