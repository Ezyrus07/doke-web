#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const paths = {
  config: 'config/msg-001-a01-authority-baseline.json',
  evidence: 'docs/validation/MSG-001-A01-AUTHORITY-BASELINE.json',
  docs: 'docs/MSG-001-A01-AUTHORITY-BASELINE.md',
  messagesRepository: 'assets/js/repositories/messages-repository.js',
  presence: 'assets/js/features/chat-realtime-presence.js',
  backend: 'backend/modules/messaging/messaging-service.js',
  migration: 'supabase/migrations/011_messages_shared_runtime.sql',
  attachments: 'assets/js/repositories/attachments-repository.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/msg-001-a01-authority-baseline.yml'
};

Object.values(paths).forEach((file) => assert(fs.existsSync(file), 'Missing MSG-A01 asset: ' + file));

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const messagesRepository = fs.readFileSync(paths.messagesRepository, 'utf8');
const presence = fs.readFileSync(paths.presence, 'utf8');
const backend = fs.readFileSync(paths.backend, 'utf8');
const migration = fs.readFileSync(paths.migration, 'utf8');
const attachments = fs.readFileSync(paths.attachments, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'msg-a01-authority-baseline-v1');
assert.strictEqual(config.status, 'repository_only_baseline_frozen');
assert.strictEqual(config.authorityBoundary.environmentAccess, 'none');
Object.values(config.effects).forEach((value) => assert(value === 0 || value === false));

[
  "var STORAGE_KEY = 'doke.conversations.local.v1'",
  "var LEGACY_STORAGE_KEY = 'doke.messages.local.v1'",
  "setProviderState('local-fallback')",
  "return loadLocal(options)",
  "saveLocal(normalized, 'pending')",
  "syncStatus: 'pending'"
].forEach((fragment) => assert(messagesRepository.includes(fragment), 'Messages repository missing baseline fragment: ' + fragment));

[
  "var STORAGE_KEY = 'doke.chat.presence.v1'",
  "var TYPING_KEY = 'doke.chat.typing.v1'",
  "var READ_KEY = 'doke.chat.reads.v1'",
  "return { id: 'local-user', name: 'Você' }",
  'localStorage.getItem',
  'localStorage.setItem'
].forEach((fragment) => assert(presence.includes(fragment), 'Presence baseline missing fragment: ' + fragment));

[
  'Supabase user client is required for messaging runtime handlers.',
  'Internal messaging operations require a configured server-side service-role client.',
  'async function createConversationForOrder',
  'async function sendMessage',
  'async function markConversationRead',
  'assertConversationAccess'
].forEach((fragment) => assert(backend.includes(fragment), 'Backend baseline missing fragment: ' + fragment));

[
  'alter table public.conversations enable row level security',
  'alter table public.messages enable row level security',
  'conversation_participants_insert',
  'conversation_participants_update',
  'message_sender_insert',
  'message_participants_update'
].forEach((fragment) => assert(migration.includes(fragment), 'Migration baseline missing fragment: ' + fragment));

[
  "var BUCKET = 'transaction-attachments'",
  'var SIGNED_URL_TTL = 900',
  "setProviderState('local-fallback')",
  "syncStatus: 'pending'"
].forEach((fragment) => assert(attachments.includes(fragment), 'Attachment baseline missing fragment: ' + fragment));

const migrationText = fs.readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .map((file) => fs.readFileSync(path.join('supabase/migrations', file), 'utf8'))
  .join('\n');
assert(!/alter\s+publication\s+supabase_realtime[\s\S]{0,300}add\s+table[\s\S]{0,100}public\.(conversations|messages)/i.test(migrationText));

const version = String(matrix.version).split('.').map(Number);
assert.strictEqual(version[0], 1);
assert.strictEqual(version[1], 3);
assert(version[2] >= 78, 'MSG-A01 requires matrix 1.3.78 or later');
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
assert(msg);
assert.strictEqual(msg.maturity, 3);
assert.strictEqual(msg.userFacingAuthority, 'hybrid');
assert.strictEqual(msg.serverAuthority, 'partial');
assert.deepStrictEqual(msg.blockers.map((item) => item.id), ['MSG-B02', 'MSG-B03', 'MSG-B04']);
assert(msg.evidence.some((item) => item.includes('MSG-A01')));
assert(msg.nextActions.some((item) => item.includes('MSG-A02')));
Object.values(paths).filter((file) => ![paths.matrix, paths.package].includes(file)).forEach((file) => {
  assert(msg.requiredPaths.includes(file), 'MSG requiredPaths missing ' + file);
});
assert(msg.tests.includes('audit:msg-001-a01-authority-baseline'));
assert.strictEqual(pkg.scripts['audit:msg-001-a01-authority-baseline'], 'node scripts/audit-msg-001-a01-authority-baseline.js');

[
  'persistent local authority',
  'MSG-B02 confirmed',
  'MSG-B03 confirmed',
  'MSG-B04 confirmed',
  'staging reads: 0',
  'production changes: 0'
].forEach((fragment) => assert(docs.includes(fragment), 'MSG-A01 docs missing ' + fragment));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:msg-001-a01-authority-baseline'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), 'MSG-A01 workflow contains prohibited fragment: ' + fragment));

console.log('MSG-A01 authority baseline audit passed.');
