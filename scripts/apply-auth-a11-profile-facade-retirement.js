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

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing replacement target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Replacement target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function removeRegexOnce(source, pattern, label) {
  const matches = source.match(pattern);
  if (!matches) throw new Error(`Missing removal target: ${label}`);
  const next = source.replace(pattern, '\n');
  if (next === source) throw new Error(`Removal did not change source: ${label}`);
  return next;
}

function patchAuthService() {
  const file = 'assets/js/services/auth-service.js';
  let source = read(file);

  source = removeRegexOnce(
    source,
    /\n  const normalizeProfilePayload = \(payload, user\) => \{[\s\S]*?\n  \};\n\n(?=  const buildSession)/,
    'auth-service normalizeProfilePayload'
  );

  source = replaceOnce(
    source,
    "  const updateCurrentUser = async (patch = {}) => {\n    await delay(60);",
    "  const updateCurrentUser = async (patch = {}) => {\n    const source = patch && typeof patch === 'object' ? patch : {};\n    const keys = Object.keys(source);\n    if (keys.length !== 1 || keys[0] !== 'settings') {\n      const error = new Error('Alterações de identidade exigem uma autoridade remota dedicada.');\n      error.code = 'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY';\n      throw error;\n    }\n    patch = source;\n    await delay(60);",
    'auth-service settings-only guard'
  );

  source = removeRegexOnce(
    source,
    /\n  const updateCurrentProfile = async \(patch = \{\}\) => \{[\s\S]*?\n  \};\n\n(?=  const getSession =)/,
    'auth-service updateCurrentProfile'
  );

  source = replaceOnce(source, '    updateCurrentProfile,\n', '', 'auth-service API export');

  if (source.includes('updateCurrentProfile')) {
    throw new Error('auth-service still contains updateCurrentProfile');
  }
  if (!source.includes("keys.length !== 1 || keys[0] !== 'settings'")) {
    throw new Error('auth-service settings-only guard was not installed');
  }
  write(file, source);
}

function patchSessionAuthority() {
  const file = 'assets/js/services/auth-session-authority.js';
  let source = read(file);

  source = removeRegexOnce(
    source,
    /\n  const updateCurrentProfile = async \(\) => \{\n    throw identityMutationError\(\);\n  \};\n/,
    'session authority updateCurrentProfile guard'
  );
  source = replaceOnce(source, '    updateCurrentProfile,\n', '', 'session authority API export');
  source = replaceOnce(source, '      updateCurrentProfile,\n', '', 'session authority facade export');
  source = replaceOnce(source, '    ns.updateCurrentProfile = updateCurrentProfile;\n', '', 'session authority namespace export');

  if (source.includes('updateCurrentProfile')) {
    throw new Error('session authority still contains updateCurrentProfile');
  }
  write(file, source);
}

function patchAudit() {
  const file = 'scripts/audit-auth-session-contracts.js';
  let source = read(file);

  source = replaceOnce(
    source,
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  'updateCurrentUser',\n  'updateCurrentProfile'",
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  'updateCurrentUser'",
    'audit session authority required tokens'
  );

  source = replaceOnce(
    source,
    "for (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token:', 'refresh_token:']) {",
    "for (const retired of ['updateCurrentProfile']) {\n  if (canonicalSource.includes(retired)) errors.push(`${CANONICAL_AUTH_SERVICE} still exposes retired profile mutation facade: ${retired}`);\n  if (sessionAuthoritySource.includes(retired)) errors.push(`${SESSION_AUTHORITY} still exposes retired profile mutation facade: ${retired}`);\n}\nfor (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token:', 'refresh_token:']) {",
    'audit retired profile facade check'
  );

  write(file, source);
}

function patchRuntimeTest() {
  const file = 'tests/auth/test-auth-session-lifecycle-runtime.js';
  let source = read(file);

  source = replaceOnce(
    source,
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser',\n  'updateCurrentProfile'",
    "  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser'",
    'runtime source guard tokens'
  );

  source = replaceOnce(
    source,
    "for (const token of [\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser'\n]) {\n  assert(sessionAuthoritySource.includes(token), `Session authority is missing identity guard token: ${token}`);\n}\n",
    "for (const token of [\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  \"keys.length === 1 && keys[0] === 'settings'\",\n  'updateCurrentUser'\n]) {\n  assert(sessionAuthoritySource.includes(token), `Session authority is missing identity guard token: ${token}`);\n}\nassert(authServiceSource.includes(\"keys.length !== 1 || keys[0] !== 'settings'\"), 'Canonical auth service is missing the settings-only mutation guard.');\nassert(!authServiceSource.includes('updateCurrentProfile'), 'Canonical auth service still exposes updateCurrentProfile.');\nassert(!sessionAuthoritySource.includes('updateCurrentProfile'), 'Session authority still exposes updateCurrentProfile.');\n",
    'runtime retired facade source assertions'
  );

  source = replaceOnce(
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
