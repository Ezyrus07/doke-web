#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/msg-001-a02-canonical-authority-boundary.json',
  evidence: 'docs/validation/MSG-001-A02-CANONICAL-AUTHORITY-BOUNDARY.json',
  docs: 'docs/MSG-001-A02-CANONICAL-AUTHORITY-BOUNDARY.md',
  repository: 'assets/js/repositories/messages-repository.js',
  a01Audit: 'scripts/audit-msg-001-a01-authority-baseline.js',
  test: 'scripts/test-msg-001-a02-canonical-authority-boundary.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/msg-001-a02-canonical-authority-boundary.yml'
};
Object.values(paths).forEach(function (file) { assert(fs.existsSync(file), 'Missing MSG-A02 asset: ' + file); });

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const repository = fs.readFileSync(paths.repository, 'utf8');
const a01Audit = fs.readFileSync(paths.a01Audit, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'msg-a02-canonical-authority-boundary-v1');
assert.strictEqual(config.status, 'repository_only_authority_split_implemented');
assert.strictEqual(config.authorityClasses.authenticatedUuidSession, 'remote-only');
assert.strictEqual(config.authorityClasses.nonUuidOrAnonymousFixture, 'fixture-memory');
assert.strictEqual(config.authorityClasses.persistentBrowserConversationAuthorityAllowed, false);
assert.strictEqual(config.authorityClasses.realSessionLocalFallbackAllowed, false);
assert.strictEqual(config.authorityClasses.realSessionPendingWriteAllowed, false);
Object.values(config.effects).forEach(function (value) { assert(value === 0 || value === false); });

[
  "return user && isUuid(user.id) ? 'remote-only' : 'fixture-memory'",
  "error.code = 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE'",
  "if (authority === 'fixture-memory')",
  "cacheAuthority = 'remote-only'",
  "return saveLocal(normalized, 'memory-only')",
  'persistentLocalAuthority: false',
  'pendingSynchronization: false'
].forEach(function (fragment) { assert(repository.includes(fragment), 'Repository missing MSG-A02 fragment: ' + fragment); });
[
  'var local = readLocal();',
  "remote.forEach(function (item) { saveLocal(item, 'synced'); });",
  "return saveLocal(Object.assign({}, localSaved, { syncStatus: 'pending'",
  "return loadLocal(options);"
].forEach(function (fragment) { assert(!repository.includes(fragment), 'Repository retains prohibited real-session fallback: ' + fragment); });
assert(a01Audit.includes("config/msg-001-a02-canonical-authority-boundary.json"));

const version = String(matrix.version).split('.').map(Number);
assert.strictEqual(version[0], 1);
assert.strictEqual(version[1], 3);
assert(version[2] >= 79, 'MSG-A02 requires matrix 1.3.79 or later');
const msg = matrix.domains.find(function (domain) { return domain.id === 'MSG-001'; });
assert(msg);
assert(msg.evidence.some(function (item) { return item.includes('MSG-A02'); }));
if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A06'));
  assert(!msg.nextActions.some(function (item) { return item.includes('MSG-A05:'); }));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  assert(msg.nextActions.length === 2 && msg.nextActions[0].includes('MSG-A04'));
} else {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A03'));
}
Object.values(paths).filter(function (file) { return file !== paths.matrix && file !== paths.package; }).forEach(function (file) {
  assert(msg.requiredPaths.includes(file), 'MSG requiredPaths missing ' + file);
});
assert(msg.tests.includes('audit:msg-001-a02-canonical-authority-boundary'));
assert(msg.tests.includes('test:msg-001-a02-canonical-authority-boundary'));
assert.strictEqual(pkg.scripts['audit:msg-001-a02-canonical-authority-boundary'], 'node scripts/audit-msg-001-a02-canonical-authority-boundary.js');
assert.strictEqual(pkg.scripts['test:msg-001-a02-canonical-authority-boundary'], 'node scripts/test-msg-001-a02-canonical-authority-boundary.js');
[
  'Authenticated UUID sessions now read and write conversations exclusively through Supabase',
  'no pending local success',
  'fixture-memory',
  'staging reads: 0',
  'production changes: 0'
].forEach(function (fragment) { assert(docs.includes(fragment), 'MSG-A02 docs missing ' + fragment); });
assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:msg-001-a02-canonical-authority-boundary'));
assert(workflow.includes('npm run test:msg-001-a02-canonical-authority-boundary'));
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'git push'].forEach(function (fragment) {
  assert(!workflow.includes(fragment), 'MSG-A02 workflow contains prohibited fragment: ' + fragment);
});
console.log('MSG-A02 canonical authority boundary audit passed.');
