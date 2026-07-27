#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[PROF-A02] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  matrix: 'config/domain-completion-matrix.json',
  repository: 'assets/js/repositories/professional-profiles-repository.js',
  profileService: 'assets/js/services/professional-profile-service.js',
  setupService: 'assets/js/services/professional-profile-setup-service.js',
  runtimeTest: 'scripts/test-professional-profile-authority-retirement-runtime.js',
  visualTest: 'tests/visual/doke-visual-regression.spec.js',
  baselineEvidence: 'docs/validation/PROF-001-A01-AUTHORITY-BASELINE.json',
  evidenceMarkdown: 'docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.md',
  evidenceJson: 'docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.json',
  a03Migration: 'supabase/migrations/148_professional_profile_reconciliation_authority.sql',
  b03EvidenceJson: 'docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.json'
};

Object.values(files)
  .filter((file) => file !== files.a03Migration && file !== files.b03EvidenceJson)
  .forEach((file) => assert(exists(file), `required file missing: ${file}`));

const b03Started = exists(files.b03EvidenceJson);
const matrix = JSON.parse(read(files.matrix));
const prof = (matrix.domains || []).find((domain) => domain.id === 'PROF-001');
const hasB03Blocker = (prof && prof.blockers || []).some((blocker) => blocker.id === 'PROF-B03');
assert(Boolean(prof), 'PROF-001 is missing from the domain completion matrix');
assert(prof && prof.productionGate === 'blocked', 'PROF-001 production gate must remain blocked');
if (b03Started) {
  const b03 = JSON.parse(read(files.b03EvidenceJson));
  assert(b03.domain === 'PROF-001' && b03.sublot === 'PROF-B03-KYC-EVIDENCE', 'PROF-B03 evidence identity is invalid');
  assert(['implementation_in_progress', 'validation_pending', 'done'].includes(b03.status), 'PROF-B03 evidence status is invalid');
  assert(!hasB03Blocker, 'retired PROF-B03 blocker remains active after controlled KYC evidence retirement');
} else {
  assert(hasB03Blocker, 'PROF-B03 must remain explicit until KYC draft and binary evidence browser authority are retired');
}

const repository = read(files.repository);
[
  "authority: 'supabase-or-fixture-memory'",
  "sessionProvider() === 'supabase'",
  "from('professional_profiles')",
  "invokeSelfService('save_professional_profile_setup'",
  'DOKE_PROFESSIONAL_PROFILE_AUTHORITY_UNAVAILABLE',
  'DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE',
  'DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED',
  'fixtureProfiles = new Map()'
].forEach((marker) => assert(repository.includes(marker), `professional profile retirement marker missing: ${marker}`));

[
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'doke.professionalProfiles.v1',
  'doke.professionalApplications.v1',
  'storageKey:',
  'legacyApplicationKey:'
].forEach((marker) => assert(!repository.includes(marker), `retired browser authority marker remains in professional profile repository: ${marker}`));

const profileService = read(files.profileService);
if (exists(files.a03Migration)) {
  assert(profileService.includes("invokeSelfService('update_professional_profile_reconciled'"), 'PROF-A03 atomic professional operation is missing');
  assert(!profileService.includes('repo.updateActiveProfile'), 'PROF-A03 cannot restore professional repository mutation authority');
  assert(!profileService.includes('base.updateCurrentProfile'), 'PROF-A03 cannot coordinate split base-profile mutation in the browser');
} else {
  assert(profileService.includes('repo.updateActiveProfile'), 'professional profile service must cross the guarded repository boundary before base profile mutation');
}
assert(!profileService.includes('localStorage'), 'professional profile service must not write localStorage');
assert(!profileService.includes('sessionStorage'), 'professional profile service must not write sessionStorage');

const setupService = read(files.setupService);
assert(setupService.includes('save_professional_profile_setup'), 'canonical professional setup operation is missing');
assert(setupService.includes("from('professional_profiles')"), 'canonical professional setup read is missing');

const runtimeTest = read(files.runtimeTest);
[
  'LOCAL_STORAGE_FORBIDDEN',
  'DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE',
  'DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED',
  "provider: 'supabase'",
  "provider: 'fixture'"
].forEach((marker) => assert(runtimeTest.includes(marker), `runtime retirement coverage missing: ${marker}`));

const visualTest = read(files.visualTest);
[
  "const professionalProfileId = 'professional_profile_user_profissional_demo'",
  "const professionalUserId = 'user_profissional_demo'",
  "provider: 'visual-test'",
  'preserveVisualProfessionalSession',
  'Storage.prototype.removeItem = preserveVisualProfessionalSession',
  'Storage.prototype.removeItem = nativeRemoveItem'
].forEach((marker) => assert(visualTest.includes(marker), `visual fixture boundary marker missing: ${marker}`));
[
  "localStorage.setItem('doke.professionalProfiles.v1'",
  "localStorage.setItem('doke.professionalApplications.v1'",
  "localStorage.setItem('doke.professionalIdentityVerifications.v1'"
].forEach((marker) => assert(!visualTest.includes(marker), `visual harness revived retired professional storage: ${marker}`));

const baseline = JSON.parse(read(files.baselineEvidence));
assert(baseline.domain === 'PROF-001' && baseline.sublot === 'PROF-A01', 'PROF-A01 evidence identity is invalid');
assert(baseline.validationStatus === 'done', 'PROF-A01 must be validated before PROF-A02');

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A02', 'PROF-A02 evidence identity is invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'PROF-A02 evidence status is invalid');
assert(evidence.safety && evidence.safety.productionChanged === false, 'PROF-A02 cannot claim a production change');
assert(evidence.safety && evidence.safety.stagingChanged === false, 'PROF-A02 cannot claim a staging change');
assert(evidence.safety && evidence.safety.migrationApplied === false, 'PROF-A02 cannot claim a migration');
assert(evidence.safety && evidence.safety.edgeFunctionDeployed === false, 'PROF-A02 cannot claim an Edge Function deployment');

if (!process.exitCode) {
  console.log('[PROF-A02] browser-persistent professional profile authority is retired.');
  console.log('[PROF-A02] Supabase setup reads/writes are canonical; fixture compatibility is memory-only.');
  console.log('[PROF-A02] visual fixtures no longer seed retired professional profile storage.');
  console.log('[PROF-A02] visual demo-session preservation is test-only and restores native Storage behavior.');
  console.log(exists(files.a03Migration)
    ? '[PROF-A02] active edits advanced to the PROF-A03 atomic server boundary without restoring browser authority.'
    : '[PROF-A02] active professional field edits fail closed pending a dedicated server operation.');
  console.log(`[PROF-A02] PROF-B03 KYC evidence retirement started: ${b03Started ? 'yes' : 'no'}.`);
}
