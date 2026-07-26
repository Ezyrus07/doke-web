#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function write(file, source) {
  fs.writeFileSync(path.join(ROOT, file), source, 'utf8');
}

function replaceLiteralOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Replacement target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const matches = Array.from(source.matchAll(matcher));
  if (matches.length !== 1) {
    throw new Error(`Expected one regex target for ${label}, received ${matches.length}`);
  }
  return source.replace(new RegExp(pattern.source, pattern.flags.replace('g', '')), replacement);
}

function patchAuthService() {
  const file = 'assets/js/services/auth-service.js';
  let source = read(file);

  source = replaceRegexOnce(
    source,
    /\n  const normalizeProfilePayload = \(payload, user\) => \{[\s\S]*?\n  \};\n\n(?=  const buildSession)/,
    '\n',
    'auth-service normalizeProfilePayload'
  );

  source = replaceLiteralOnce(
    source,
    "  const updateCurrentUser = async (patch = {}) => {\n    await delay(60);",
    "  const updateCurrentUser = async (patch = {}) => {\n    const source = patch && typeof patch === 'object' ? patch : {};\n    const keys = Object.keys(source);\n    if (keys.length !== 1 || keys[0] !== 'settings') {\n      const error = new Error('Alterações de identidade exigem uma autoridade remota dedicada.');\n      error.code = 'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY';\n      throw error;\n    }\n    patch = source;\n    await delay(60);",
    'auth-service settings-only guard'
  );

  source = replaceRegexOnce(
    source,
    /\n  const updateCurrentProfile = async \(patch = \{\}\) => \{[\s\S]*?\n  \};\n\n(?=  const getSession =)/,
    '\n',
    'auth-service updateCurrentProfile'
  );

  source = replaceLiteralOnce(
    source,
    '    getCurrentIdentity,\n    updateCurrentUser,\n    updateCurrentProfile,\n    getAuthContext,',
    '    getCurrentIdentity,\n    updateCurrentUser,\n    getAuthContext,',
    'auth-service API export'
  );

  for (const forbidden of ['normalizeProfilePayload', 'updateCurrentProfile']) {
    if (source.includes(forbidden)) throw new Error(`auth-service still contains ${forbidden}`);
  }
  if (!source.includes("keys.length !== 1 || keys[0] !== 'settings'")) {
    throw new Error('auth-service settings-only guard was not installed');
  }
  write(file, source);
}

function patchSessionAuthority() {
  const file = 'assets/js/services/auth-session-authority.js';
  let source = read(file);

  source = replaceRegexOnce(
    source,
    /\n  const updateCurrentProfile = async \(\) => \{\n    throw identityMutationError\(\);\n  \};\n/,
    '\n',
    'session authority updateCurrentProfile guard'
  );

  source = replaceLiteralOnce(
    source,
    '    resetPassword,\n    updateCurrentUser,\n    updateCurrentProfile,\n    getPublicState,',
    '    resetPassword,\n    updateCurrentUser,\n    getPublicState,',
    'session authority API export'
  );

  source = replaceLiteralOnce(
    source,
    '      resetPassword,\n      updateCurrentUser,\n      updateCurrentProfile,\n      sessionAuthority: api',
    '      resetPassword,\n      updateCurrentUser,\n      sessionAuthority: api',
    'session authority facade export'
  );

  source = replaceLiteralOnce(
    source,
    '    ns.updateCurrentUser = updateCurrentUser;\n    ns.updateCurrentProfile = updateCurrentProfile;\n    bindLogoutCapture();',
    '    ns.updateCurrentUser = updateCurrentUser;\n    delete ns.updateCurrentProfile;\n    bindLogoutCapture();',
    'session authority namespace retirement'
  );

  if (source.includes('const updateCurrentProfile') || source.includes('updateCurrentProfile,')) {
    throw new Error('session authority still publishes updateCurrentProfile');
  }
  write(file, source);
}

function patchAudit() {
  const file = 'scripts/audit-auth-session-contracts.js';
  let source = read(file);

  source = replaceLiteralOnce(
    source,
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  'updateCurrentUser',\n  'updateCurrentProfile'",
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  'updateCurrentUser'",
    'audit session authority required tokens'
  );

  source = replaceLiteralOnce(
    source,
    "for (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token:', 'refresh_token:']) {",
    "for (const retired of ['updateCurrentProfile']) {\n  if (canonicalSource.includes(retired)) errors.push(`${CANONICAL_AUTH_SERVICE} still exposes retired profile mutation facade: ${retired}`);\n  if (sessionAuthoritySource.includes(retired + ',')) errors.push(`${SESSION_AUTHORITY} still publishes retired profile mutation facade: ${retired}`);\n  if (sessionAuthoritySource.includes('const ' + retired)) errors.push(`${SESSION_AUTHORITY} still implements retired profile mutation facade: ${retired}`);\n}\nfor (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token:', 'refresh_token:']) {",
    'audit retired profile facade check'
  );

  write(file, source);
}

function patchRuntimeTest() {
  const file = 'tests/auth/test-auth-session-lifecycle-runtime.js';
  let source = read(file);

  source = replaceLiteralOnce(
    source,
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser',\n  'updateCurrentProfile'",
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser'",
    'runtime source guard tokens'
  );

  source = replaceLiteralOnce(
    source,
    "  assert(!recoveryPageSource.includes('assets/js/pages/auth.js'));",
    "  assert(authServiceSource.includes(\"keys.length !== 1 || keys[0] !== 'settings'\"), 'Canonical auth service is missing the settings-only mutation guard.');\n  assert(!authServiceSource.includes('updateCurrentProfile'), 'Canonical auth service still exposes updateCurrentProfile.');\n  assert(!sessionAuthoritySource.includes('const updateCurrentProfile'), 'Session authority still implements updateCurrentProfile.');\n  assert(!sessionAuthoritySource.includes('updateCurrentProfile,'), 'Session authority still publishes updateCurrentProfile.');\n\n  assert(!recoveryPageSource.includes('assets/js/pages/auth.js'));",
    'runtime retired facade source assertions'
  );

  source = replaceLiteralOnce(
    source,
    "await expectCode(\n  () => runtime.window.DokeAuth.service.updateCurrentProfile({ handle: 'forbidden-change' }),\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY'\n);",
    "assert.strictEqual(\n  typeof runtime.window.DokeAuth.service.updateCurrentProfile,\n  'undefined',\n  'Retired profile mutation facade remains on DokeAuth.service.'\n);\nassert.strictEqual(\n  typeof runtime.window.DokeAuth.updateCurrentProfile,\n  'undefined',\n  'Retired profile mutation facade remains on DokeAuth.'\n);",
    'runtime retired facade behavior'
  );

  write(file, source);
}

patchAuthService();
patchSessionAuthority();
patchAudit();
patchRuntimeTest();
console.log('AUTH-A11 profile mutation facade retirement applied.');
