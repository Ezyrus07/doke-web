#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const failures = [];

function read(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`${file} is not valid JSON: ${error.message}`);
    return {};
  }
}

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing required term: ${snippet}`);
  }
}

function forbid(content, label, snippets) {
  for (const snippet of snippets) {
    if (content.includes(snippet)) failures.push(`${label} contains retired term: ${snippet}`);
  }
}

function equal(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

const files = {
  runtimeConfig: 'assets/js/core/runtime-config.js',
  legacyRuntimeFlags: 'assets/js/config/runtime-flags.js',
  authService: 'assets/js/services/auth-service.js',
  session: 'assets/js/core/session.js',
  identityContract: 'assets/js/contracts/identity-profile-contract.js',
  matrix: 'config/domain-completion-matrix.json',
  packageJson: 'package.json',
  closureMd: 'docs/validation/AUTH-001-A13-DOMAIN-CLOSURE.md',
  closureJson: 'docs/validation/AUTH-001-A13-DOMAIN-CLOSURE.json',
  a07Plan: 'docs/validation/AUTH-001-A07-CONTACT-CHANGE-PLAN.md',
  a12Evidence: 'docs/validation/AUTH-001-A12-LOCAL-IDENTITY-AUTHORITY.json'
};

const source = {
  runtimeConfig: read(files.runtimeConfig),
  legacyRuntimeFlags: read(files.legacyRuntimeFlags),
  authService: read(files.authService),
  session: read(files.session),
  identityContract: read(files.identityContract),
  closureMd: read(files.closureMd),
  a07Plan: read(files.a07Plan)
};

const matrix = readJson(files.matrix);
const packageJson = readJson(files.packageJson);
const closure = readJson(files.closureJson);
const a12Evidence = readJson(files.a12Evidence);

expect(source.runtimeConfig, files.runtimeConfig, [
  "var AUTH_PROVIDER_VALUES = Object.freeze({",
  "SUPABASE: 'supabase'",
  "var authProvider = AUTH_PROVIDER_VALUES.SUPABASE;",
  "defaultAuthProvider: AUTH_PROVIDER_VALUES.SUPABASE"
]);
const authProviderBlock = source.runtimeConfig.match(/var AUTH_PROVIDER_VALUES = Object\.freeze\(\{([\s\S]*?)\}\);/);
if (!authProviderBlock) {
  failures.push(`${files.runtimeConfig}: AUTH_PROVIDER_VALUES block not found`);
} else if (/\bMOCK\b|['"]mock['"]/.test(authProviderBlock[1])) {
  failures.push(`${files.runtimeConfig}: auth provider enum still exposes mock`);
}
forbid(source.runtimeConfig, files.runtimeConfig, [
  'doke.authProvider',
  'dokeAuthProvider',
  'dokeAuthIdentityCanary'
]);

expect(source.legacyRuntimeFlags, files.legacyRuntimeFlags, [
  "dataProvider: 'mock'",
  "authProvider: 'supabase'"
]);
forbid(source.legacyRuntimeFlags, files.legacyRuntimeFlags, [
  "authProvider: 'mock'"
]);

expect(source.authService, files.authService, [
  "const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' });",
  "provider: AUTH_PROVIDER_VALUES.supabase",
  "authProvider: AUTH_PROVIDER_VALUES.supabase",
  "getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase",
  "provider: 'supabase'"
]);
forbid(source.authService, files.authService, [
  "provider: 'mock'",
  "authProvider: 'mock'",
  "getActiveAuthProvider: () => 'mock'",
  'updateProfessionalFixtureUser',
  'updateCurrentUser('
]);

forbid(source.session, files.session, [
  'accessToken:',
  'refreshToken:',
  'access_token:',
  'refresh_token:',
  "provider: 'mock'"
]);

expect(source.identityContract, files.identityContract, [
  "version: 'AUTH-A12C'",
  "browserProvider: 'supabase'",
  "localCredentialAuthority: 'retired'",
  "localProfileMutationAuthority: 'retired'",
  "localOnboardingMutationAuthority: 'retired'",
  "professionalRoleAuthority: 'server-only'"
]);
forbid(source.identityContract, files.identityContract, ["provider: 'mock'"]);

equal(matrix.runtimeBaseline && matrix.runtimeBaseline.authProvider, 'supabase', 'matrix runtime auth provider');
const auth = Array.isArray(matrix.domains) ? matrix.domains.find((item) => item.id === 'AUTH-001') : null;
if (!auth) {
  failures.push('AUTH-001 domain entry missing');
} else {
  equal(auth.maturity, 4, 'AUTH-001 maturity');
  equal(auth.userFacingAuthority, 'remote', 'AUTH-001 user authority');
  equal(auth.serverAuthority, 'canonical', 'AUTH-001 server authority');
  equal(auth.stagingEvidence, 'staging_operational', 'AUTH-001 staging evidence');
  equal(auth.securityGate, 'partial', 'AUTH-001 security gate');
  equal(auth.productionGate, 'blocked', 'AUTH-001 production gate');
  equal(auth.completionDisposition, 'core_done_external_blocked', 'AUTH-001 completion disposition');

  const blockerIds = (auth.blockers || []).map((item) => item.id).sort();
  equal(blockerIds, ['AUTH-EXT-MAIL-001', 'AUTH-EXT-PAID-001', 'AUTH-EXT-SMS-001'], 'AUTH-001 external blockers');
  if ((auth.blockers || []).some((item) => !String(item.category || '').startsWith('external_') && item.category !== 'paid_plan_security')) {
    failures.push('AUTH-001 blockers must be external dependencies or paid-plan security');
  }
  if ((auth.blockers || []).some((item) => ['AUTH-B02', 'AUTH-B04'].includes(item.id))) {
    failures.push('AUTH-001 still contains resolved historical blockers');
  }

  const tests = new Set(auth.tests || []);
  for (const test of [
    'test:real-auth-only-contract',
    'audit:auth-session',
    'audit:identity-profile-contract',
    'test:auth-local-profile-mutation-retirement',
    'test:auth-onboarding-authority-retirement',
    'test:auth-professional-authority-retirement',
    'audit:auth-domain-closure'
  ]) {
    if (!tests.has(test)) failures.push(`AUTH-001 tests missing ${test}`);
  }

  const evidence = (auth.evidence || []).join('\n');
  for (const marker of ['AUTH-A12', 'AUTH-A13', 'Supabase']) {
    if (!evidence.includes(marker)) failures.push(`AUTH-001 evidence missing ${marker}`);
  }
}

for (const flow of matrix.criticalFlows || []) {
  for (const blocker of flow.blockers || []) {
    if (blocker === 'AUTH-B02' || blocker === 'AUTH-B04') {
      failures.push(`${flow.id}: references retired blocker ${blocker}`);
    }
  }
}

const scripts = packageJson.scripts || {};
equal(scripts['audit:auth-domain-closure'], 'node scripts/audit-auth-domain-closure.js', 'AUTH-A13 package audit');
equal(scripts['test:auth-onboarding-authority-retirement'], 'node tests/auth/test-auth-onboarding-local-authority-retirement-runtime.js', 'onboarding retirement package test');
equal(scripts['test:auth-professional-authority-retirement'], 'node tests/auth/test-auth-professional-authority-retirement-runtime.js', 'professional retirement package test');

if (!['validation_pending', 'done'].includes(closure.status)) failures.push('AUTH-A13 closure status must be validation_pending or done');
equal(closure.domain, 'AUTH-001', 'AUTH-A13 closure domain');
equal(closure.sublot, 'AUTH-A13', 'AUTH-A13 closure sublot');
equal(closure.coreStatus, 'done', 'AUTH-A13 core status');
equal(closure.productionStatus, 'blocked_external', 'AUTH-A13 production status');
equal((closure.externalBlockers || []).map((item) => item.id).sort(), ['AUTH-EXT-MAIL-001', 'AUTH-EXT-PAID-001', 'AUTH-EXT-SMS-001'], 'AUTH-A13 evidence blockers');
equal(closure.safety && closure.safety.productionChanged, false, 'AUTH-A13 production safety');
equal(closure.safety && closure.safety.stagingChanged, false, 'AUTH-A13 staging safety');
equal(closure.safety && closure.safety.prMerged, false, 'AUTH-A13 merge safety');

expect(source.closureMd, files.closureMd, [
  'AUTH-A13',
  'core_done_external_blocked',
  'AUTH-EXT-MAIL-001',
  'AUTH-EXT-SMS-001',
  'AUTH-EXT-PAID-001'
]);
expect(source.a07Plan, files.a07Plan, [
  'PLANNED / BLOCKED BY MAIL-001',
  'Phone-number change is not part of the executable scope while no SMS provider is configured.'
]);
equal(a12Evidence.status, 'done', 'AUTH-A12 evidence status');

if (failures.length) {
  console.error('[auth-domain-closure] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[auth-domain-closure] OK');
console.log('- browser auth provider: supabase');
console.log('- AUTH-001 core authority: done');
console.log('- production status: blocked only by explicit external dependencies');
