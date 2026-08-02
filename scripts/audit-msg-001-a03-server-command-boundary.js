#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/msg-001-a03-server-command-boundary.json',
  evidence: 'docs/validation/MSG-001-A03-SERVER-COMMAND-BOUNDARY.json',
  docs: 'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md',
  repository: 'assets/js/repositories/messages-repository.js',
  service: 'assets/js/services/message-service.js',
  api: 'assets/js/services/api-repository-provider.js',
  test: 'scripts/test-msg-001-a03-server-command-boundary.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/msg-001-a03-server-command-boundary.yml'
};
Object.values(paths).forEach(file => assert(fs.existsSync(file), 'Missing MSG-A03 asset: ' + file));
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const repository = fs.readFileSync(paths.repository, 'utf8');
const service = fs.readFileSync(paths.service, 'utf8');
const api = fs.readFileSync(paths.api, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'msg-a03-server-command-boundary-v1');
assert.strictEqual(config.commandAuthority.directBrowserSupabaseDmlAllowed, false);
assert.strictEqual(config.commandAuthority.authenticatedUuidSession, 'server-owned-api-provider');
assert.strictEqual(config.commands.length, 5);
Object.values(config.effects).forEach(value => assert(value === 0 || value === false));

['DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED', "return rejectDirectBrowserDml('save')", "return rejectDirectBrowserDml('removeMessage')", "return rejectDirectBrowserDml('markAsRead')", 'directBrowserDml: false'].forEach(fragment => assert(repository.includes(fragment), fragment));
['function saveRemote(', '.upsert(', 'REMOTE_MESSAGES_TABLE).update('].forEach(fragment => assert(!repository.includes(fragment), 'Direct DML retained: ' + fragment));
['executeMessagesServerCommand', 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE', "executeMessagesServerCommand('createForOrder'", "executeMessagesServerCommand('updateOrder'", "executeMessagesServerCommand('sendMessage'", "executeMessagesServerCommand('removeMessage'", "executeMessagesServerCommand('markRead'"].forEach(fragment => assert(service.includes(fragment), fragment));
assert(api.includes("removeMessage: '/conversations/:id/messages/remove'"));

const version = matrix.version.split('.').map(Number);
assert(version[0] === 1 && version[1] === 3 && version[2] >= 80);
const msg = matrix.domains.find(domain => domain.id === 'MSG-001');
assert(msg);
assert(msg.evidence.some(item => item.includes('MSG-A03')));
assert(msg.nextActions.length === 2 && msg.nextActions[0].includes('MSG-A04'));
Object.values(paths).filter(file => ![paths.matrix, paths.package].includes(file)).forEach(file => assert(msg.requiredPaths.includes(file), 'requiredPaths: ' + file));
assert(msg.tests.includes('audit:msg-001-a03-server-command-boundary'));
assert(msg.tests.includes('test:msg-001-a03-server-command-boundary'));
assert.strictEqual(pkg.scripts['audit:msg-001-a03-server-command-boundary'], 'node scripts/audit-msg-001-a03-server-command-boundary.js');
assert.strictEqual(pkg.scripts['test:msg-001-a03-server-command-boundary'], 'node scripts/test-msg-001-a03-server-command-boundary.js');
['server-owned', 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE', 'staging reads: 0', 'production changes: 0'].forEach(fragment => assert(docs.includes(fragment), fragment));
assert(workflow.includes('permissions:\n  contents: read'));
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'curl ', 'git push'].forEach(fragment => assert(!workflow.includes(fragment), fragment));
console.log('MSG-A03 server-owned command boundary audit passed.');
