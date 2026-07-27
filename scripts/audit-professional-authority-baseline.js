#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[PROF-A01] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

const files = {
  matrix: 'config/domain-completion-matrix.json',
  profileRepository: 'assets/js/repositories/professional-profiles-repository.js',
  verificationRepository: 'assets/js/repositories/professional-identity-verifications-repository.js',
  evidenceRepository: 'assets/js/repositories/professional-verification-evidence-repository.js',
  profileService: 'assets/js/services/professional-profile-setup-service.js',
  verificationService: 'assets/js/services/professional-identity-verification-service.js',
  evidenceMarkdown: 'docs/validation/PROF-001-A01-AUTHORITY-BASELINE.md',
  evidenceJson: 'docs/validation/PROF-001-A01-AUTHORITY-BASELINE.json',
  a02EvidenceJson: 'docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.json',
  a04EvidenceJson: 'docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.json',
  b03EvidenceJson: 'docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.json'
};

Object.entries(files).forEach(([key, file]) => {
  if (!['a02EvidenceJson', 'a04EvidenceJson', 'b03EvidenceJson'].includes(key)) {
    assert(exists(file), `required file missing: ${file}`);
  }
});

const a02Started = exists(files.a02EvidenceJson);
const a04Started = exists(files.a04EvidenceJson);
const b03Started = exists(files.b03EvidenceJson);
const matrix = JSON.parse(read(files.matrix));
const prof = (matrix.domains || []).find((domain) => domain.id === 'PROF-001');
const expectedBlockers = b03Started ? ['PROF-B04', 'PROF-B05'] : ['PROF-B03', 'PROF-B04', 'PROF-B05'];
assert(Boolean(prof), 'PROF-001 is missing from the domain completion matrix');
assert(
  prof && prof.userFacingAuthority === (b03Started ? 'remote' : 'hybrid'),
  `PROF-001 user-facing authority must be ${b03Started ? 'remote after PROF-B03' : 'hybrid while PROF-B03 is open'}`
);
assert(
  prof && prof.serverAuthority === (b03Started ? 'canonical' : 'partial'),
  `PROF-001 server authority must be ${b03Started ? 'canonical after PROF-B03' : 'partial while PROF-B03 is open'}`
);
assert(prof && prof.productionGate === 'blocked', 'PROF-001 production gate must remain blocked');
assert(
  same((prof && prof.blockers || []).map((blocker) => blocker.id).sort(), expectedBlockers),
  'PROF-001 blockers changed without reconciling PROF-A01 evidence'
);

const profileService = read(files.profileService);
[
  'invokeSelfService',
  'save_professional_profile_setup',
  "from('professional_profiles')",
  'p_complete:false',
  'p_complete:true'
].forEach((marker) => assert(profileService.includes(marker), `remote professional profile authority marker missing: ${marker}`));
assert(!profileService.includes('localStorage'), 'active professional profile setup service must not write localStorage');
assert(!profileService.includes('sessionStorage'), 'active professional profile setup service must not write sessionStorage');
assert(!profileService.includes('indexedDB'), 'active professional profile setup service must not write IndexedDB');

const verificationService = read(files.verificationService);
[
  "String(session.provider || '').toLowerCase() === 'supabase'",
  'save_professional_verification_draft',
  "remoteVerificationOperation('prepare_uploads'",
  '.uploadToSignedUrl(',
  "remoteVerificationOperation('submit'",
  "remoteVerificationOperation('list'",
  "remoteVerificationOperation('detail'",
  "remoteVerificationOperation('start'",
  "decideRemote(verificationId, 'approve'",
  "decideRemote(verificationId, 'reject'",
  "from('professional_identity_verifications')"
].forEach((marker) => assert(verificationService.includes(marker), `remote professional verification authority marker missing: ${marker}`));

const profileRepository = read(files.profileRepository);
if (a02Started) {
  const a02 = JSON.parse(read(files.a02EvidenceJson));
  assert(a02.domain === 'PROF-001' && a02.sublot === 'PROF-A02', 'PROF-A02 evidence identity is invalid');
  assert(['implementation_in_progress', 'validation_pending', 'done'].includes(a02.status), 'PROF-A02 evidence status is invalid');
  [
    "authority: 'supabase-or-fixture-memory'",
    "invokeSelfService('save_professional_profile_setup'",
    "from('professional_profiles')",
    'DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE'
  ].forEach((marker) => assert(profileRepository.includes(marker), `PROF-A02 profile repository marker missing: ${marker}`));
  ['localStorage', 'sessionStorage', 'indexedDB', 'doke.professionalProfiles.v1', 'doke.professionalApplications.v1']
    .forEach((marker) => assert(!profileRepository.includes(marker), `PROF-A02 retired profile marker remains: ${marker}`));
} else {
  ['localStorage', 'doke.professionalProfiles.v1'].forEach((marker) => {
    assert(profileRepository.includes(marker), `profile baseline storage marker missing before PROF-A02: ${marker}`);
  });
  ['saveDraft', 'completeSetup', 'updateActiveProfile', 'setVerificationStatus', 'transition'].forEach((marker) => {
    assert(
      profileRepository.includes(`${marker}: ${marker}`) || profileRepository.includes(`function ${marker}(`),
      `profile repository mutation surface changed before PROF-A02: ${marker}`
    );
  });
}

const verificationRepository = read(files.verificationRepository);
if (a04Started) {
  const a04 = JSON.parse(read(files.a04EvidenceJson));
  assert(a04.domain === 'PROF-001' && a04.sublot === 'PROF-A04', 'PROF-A04 evidence identity is invalid');
  assert(['implementation_in_progress', 'validation_pending', 'done'].includes(a04.status), 'PROF-A04 evidence status is invalid');
  [
    "authority: 'supabase-service-or-fixture-memory'",
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE',
    'fixtureRecords = new Map()',
    'fixtureDrafts = new Map()'
  ].forEach((marker) => assert(verificationRepository.includes(marker), `PROF-A04 verification repository marker missing: ${marker}`));
  ['localStorage', 'sessionStorage', 'indexedDB', 'doke.professionalIdentityVerifications.v1', 'doke.professionalIdentityVerificationDrafts.v1']
    .forEach((marker) => assert(!verificationRepository.includes(marker), `PROF-A04 retired KYC draft marker remains: ${marker}`));
} else {
  ['localStorage', 'sessionStorage', 'doke.professionalIdentityVerifications.v1', 'doke.professionalIdentityVerificationDrafts.v1']
    .forEach((marker) => assert(
      verificationRepository.includes(marker),
      `${files.verificationRepository} no longer matches frozen storage marker ${marker}; reconcile PROF-A04`
    ));
}
['saveDraft', 'submit', 'transition'].forEach((marker) => assert(
  verificationRepository.includes(`${marker}: ${marker}`) || verificationRepository.includes(`function ${marker}(`),
  `${files.verificationRepository} mutation surface changed without a controlled sublot: ${marker}`
));

const evidenceRepository = read(files.evidenceRepository);
if (b03Started) {
  const b03 = JSON.parse(read(files.b03EvidenceJson));
  assert(b03.domain === 'PROF-001' && b03.sublot === 'PROF-B03-KYC-EVIDENCE', 'PROF-B03 evidence identity is invalid');
  assert(['implementation_in_progress', 'validation_pending', 'done'].includes(b03.status), 'PROF-B03 evidence status is invalid');
  [
    "authority: 'supabase-storage-or-fixture-memory'",
    'fixtureEvidence = new Map()',
    'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE'
  ].forEach((marker) => assert(evidenceRepository.includes(marker), `PROF-B03 evidence repository marker missing: ${marker}`));
  ['indexedDB', 'doke-professional-verification-evidence-v1', 'databaseName:', 'openDatabase']
    .forEach((marker) => assert(!evidenceRepository.includes(marker), `PROF-B03 retired evidence marker remains: ${marker}`));
} else {
  ['indexedDB', 'doke-professional-verification-evidence-v1'].forEach((marker) => assert(
    evidenceRepository.includes(marker),
    `${files.evidenceRepository} no longer matches frozen storage marker ${marker}; reconcile PROF-B03-KYC-EVIDENCE`
  ));
}
['save', 'remove'].forEach((marker) => assert(
  evidenceRepository.includes(`${marker}: ${marker}`) || evidenceRepository.includes(`function ${marker}(`),
  `${files.evidenceRepository} mutation surface changed without a controlled sublot: ${marker}`
));

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(dir.replace(/\\/g, '/'), entry.name);
    if (entry.isDirectory()) return walk(relative);
    return [relative];
  });
}

const htmlFiles = fs.readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .sort();

function pagesLoading(scriptName) {
  return htmlFiles.filter((file) => read(file).includes(scriptName)).sort();
}

const expectedLoads = {
  'professional-profiles-repository.js': [
    'admin-verificacao.html', 'admin.html', 'anunciar-servico.html', 'meu-perfil.html',
    'perfil-profissional.html', 'perfil.html', 'tornar-profissional.html', 'verificacao-profissional.html'
  ],
  'professional-identity-verifications-repository.js': [
    'admin-verificacao.html', 'admin.html', 'anunciar-servico.html', 'meu-perfil.html',
    'perfil-profissional.html', 'verificacao-profissional.html'
  ],
  'professional-verification-evidence-repository.js': [
    'admin-verificacao.html', 'admin.html', 'verificacao-profissional.html'
  ]
};

for (const [scriptName, expected] of Object.entries(expectedLoads)) {
  const actual = pagesLoading(scriptName);
  assert(same(actual, expected), `${scriptName} loading surface changed. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

const storageKeyOwners = {
  'doke.professionalProfiles.v1': a02Started ? [] : [files.profileRepository],
  'doke.professionalIdentityVerifications.v1': a04Started ? [] : [files.verificationRepository],
  'doke.professionalIdentityVerificationDrafts.v1': a04Started ? [] : [files.verificationRepository],
  'doke-professional-verification-evidence-v1': b03Started ? [] : [files.evidenceRepository]
};
const assetScripts = walk('assets/js').filter((file) => file.endsWith('.js'));
for (const [storageKey, expectedOwners] of Object.entries(storageKeyOwners)) {
  const actualOwners = assetScripts.filter((file) => read(file).includes(storageKey)).sort();
  assert(same(actualOwners, expectedOwners.slice().sort()), `${storageKey} authority escaped its controlled owner: ${JSON.stringify(actualOwners)}`);
}

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A01', 'PROF-A01 JSON evidence identity is invalid');
assert(evidence.status === 'baseline_frozen', 'PROF-A01 evidence must remain baseline_frozen');
assert(evidence.validationStatus === 'done', 'PROF-A01 validation must remain done');
assert(evidence.productionChanged === false, 'PROF-A01 evidence cannot claim a production change');
assert(evidence.stagingChanged === false, 'PROF-A01 evidence cannot claim a staging change');

if (!process.exitCode) {
  console.log('[PROF-A01] professional authority baseline remains traceable.');
  console.log(`[PROF-A01] profile browser persistence retired: ${a02Started ? 'yes' : 'no'}`);
  console.log(`[PROF-A01] KYC record and draft browser persistence retired: ${a04Started ? 'yes' : 'no'}`);
  console.log(`[PROF-A01] KYC binary evidence browser persistence retired: ${b03Started ? 'yes' : 'no'}`);
  console.log(`[PROF-A01] remaining blockers: ${expectedBlockers.join(', ')}.`);
}
