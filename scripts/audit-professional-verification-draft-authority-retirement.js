#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`[PROF-A04] ${message}`); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const repositoryPath = 'assets/js/repositories/professional-identity-verifications-repository.js';
const servicePath = 'assets/js/services/professional-identity-verification-service.js';
const evidencePath = 'docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.json';

[repositoryPath, servicePath, evidencePath].forEach((file) => assert(fs.existsSync(path.join(root, file)), `required file missing: ${file}`));

const repository = read(repositoryPath);
[
  "authority: 'supabase-service-or-fixture-memory'",
  "sessionProvider() === 'supabase'",
  'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE',
  'fixtureRecords = new Map()',
  'fixtureDrafts = new Map()'
].forEach((marker) => assert(repository.includes(marker), `retirement marker missing: ${marker}`));

[
  '.localStorage',
  '.sessionStorage',
  '.getItem(',
  '.setItem(',
  '.removeItem(',
  'indexedDB'
].forEach((marker) => assert(!repository.includes(marker), `browser-persistent KYC draft authority remains: ${marker}`));

const service = read(servicePath);
[
  "String(session.provider || '').toLowerCase() === 'supabase'",
  "remoteRpc('save_professional_verification_draft'",
  "from('professional_identity_verifications')",
  "remoteVerificationOperation('submit'"
].forEach((marker) => assert(service.includes(marker), `canonical Supabase verification marker missing: ${marker}`));

const evidence = JSON.parse(read(evidencePath));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A04', 'PROF-A04 evidence identity is invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'PROF-A04 evidence status is invalid');
assert(evidence.safety.productionChanged === false, 'PROF-A04 cannot change production');
assert(evidence.safety.realAccountChanged === false, 'PROF-A04 cannot change real accounts');
assert(evidence.remainingBlockers.some((item) => item.id === 'PROF-B03-KYC-EVIDENCE'), 'IndexedDB evidence blocker must remain explicit');

if (!process.exitCode) {
  console.log('[PROF-A04] browser-persistent KYC draft authority is retired.');
  console.log('[PROF-A04] Supabase draft/submission authority remains canonical.');
  console.log('[PROF-A04] binary evidence IndexedDB remains isolated for the next sublot.');
}
