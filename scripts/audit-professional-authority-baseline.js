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
  evidenceJson: 'docs/validation/PROF-001-A01-AUTHORITY-BASELINE.json'
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const matrix = JSON.parse(read(files.matrix));
const prof = (matrix.domains || []).find((domain) => domain.id === 'PROF-001');
assert(Boolean(prof), 'PROF-001 is missing from the domain completion matrix');
assert(prof && prof.userFacingAuthority === 'hybrid', 'PROF-001 user-facing authority must remain explicitly hybrid during PROF-A01');
assert(prof && prof.serverAuthority === 'partial', 'PROF-001 server authority must remain explicitly partial during PROF-A01');
assert(prof && prof.productionGate === 'blocked', 'PROF-001 production gate must remain blocked');
assert(
  same((prof && prof.blockers || []).map((blocker) => blocker.id).sort(), ['PROF-B03', 'PROF-B04', 'PROF-B05']),
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
  "save_professional_verification_draft",
  "remoteVerificationOperation('submit'",
  "remoteVerificationOperation('list'",
  "remoteVerificationOperation('detail'",
  "remoteVerificationOperation('start'",
  "decideRemote(verificationId, 'approve'",
  "decideRemote(verificationId, 'reject'",
  "from('professional_identity_verifications')"
].forEach((marker) => assert(verificationService.includes(marker), `remote professional verification authority marker missing: ${marker}`));

const localAuthorities = [
  {
    file: files.profileRepository,
    storage: ['localStorage', 'doke.professionalProfiles.v1'],
    mutations: ['saveDraft', 'completeSetup', 'updateActiveProfile', 'setVerificationStatus', 'transition']
  },
  {
    file: files.verificationRepository,
    storage: ['localStorage', 'sessionStorage', 'doke.professionalIdentityVerifications.v1', 'doke.professionalIdentityVerificationDrafts.v1'],
    mutations: ['saveDraft', 'submit', 'transition']
  },
  {
    file: files.evidenceRepository,
    storage: ['indexedDB', 'doke-professional-verification-evidence-v1'],
    mutations: ['save', 'remove']
  }
];

for (const authority of localAuthorities) {
  const source = read(authority.file);
  authority.storage.forEach((marker) => assert(source.includes(marker), `${authority.file} no longer matches frozen storage marker ${marker}; reconcile PROF-A01 before proceeding`));
  authority.mutations.forEach((marker) => assert(source.includes(`${marker}: ${marker}`) || source.includes(`function ${marker}(`), `${authority.file} mutation surface changed: ${marker}`));
}

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
    'admin-verificacao.html',
    'admin.html',
    'anunciar-servico.html',
    'meu-perfil.html',
    'perfil-profissional.html',
    'perfil.html',
    'tornar-profissional.html',
    'verificacao-profissional.html'
  ],
  'professional-identity-verifications-repository.js': [
    'admin-verificacao.html',
    'admin.html',
    'anunciar-servico.html',
    'meu-perfil.html',
    'perfil-profissional.html',
    'verificacao-profissional.html'
  ],
  'professional-verification-evidence-repository.js': [
    'admin-verificacao.html',
    'admin.html',
    'verificacao-profissional.html'
  ]
};

for (const [scriptName, expected] of Object.entries(expectedLoads)) {
  const actual = pagesLoading(scriptName);
  assert(same(actual, expected), `${scriptName} loading surface changed. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
}

const storageKeyOwners = {
  'doke.professionalProfiles.v1': [files.profileRepository],
  'doke.professionalIdentityVerifications.v1': [files.verificationRepository],
  'doke.professionalIdentityVerificationDrafts.v1': [files.verificationRepository],
  'doke-professional-verification-evidence-v1': [files.evidenceRepository]
};
const assetScripts = walk('assets/js').filter((file) => file.endsWith('.js'));
for (const [storageKey, expectedOwners] of Object.entries(storageKeyOwners)) {
  const actualOwners = assetScripts.filter((file) => read(file).includes(storageKey)).sort();
  assert(same(actualOwners, expectedOwners.slice().sort()), `${storageKey} authority escaped its frozen owner: ${JSON.stringify(actualOwners)}`);
}

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A01', 'PROF-A01 JSON evidence identity is invalid');
assert(evidence.status === 'baseline_frozen', 'PROF-A01 evidence must remain baseline_frozen until the next controlled sublot');
assert(evidence.productionChanged === false, 'PROF-A01 evidence cannot claim a production change');
assert(evidence.stagingChanged === false, 'PROF-A01 evidence cannot claim a staging change');

if (!process.exitCode) {
  console.log('[PROF-A01] professional authority baseline is frozen.');
  console.log(`[PROF-A01] local authorities: ${localAuthorities.map((item) => item.file).join(', ')}`);
  console.log(`[PROF-A01] active script-loading surfaces: ${Object.values(expectedLoads).reduce((sum, pages) => sum + pages.length, 0)}`);
  console.log('[PROF-A01] next controlled target: retire PROF-B03 browser-local profile/KYC persistence without weakening remote Supabase authority.');
}
