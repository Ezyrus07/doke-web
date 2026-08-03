'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`MSG-A06 audit failed: ${message}`);
};

const config = JSON.parse(read('config/msg-001-a06-presence-typing-boundary.json'));
const runtimeConfig = read('assets/js/core/supabase-config.js');
const repository = read('assets/js/repositories/messages-presence-repository.js');
const feature = read('assets/js/features/chat-realtime-presence.js');
const html = read('mensagens.html');
const migration = read('supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql');
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
const workflow = read('.github/workflows/msg-001-a06-presence-typing-boundary.yml');

assert(config.contractVersion === 'msg-a06-presence-typing-boundary-v1', 'contract version mismatch');
assert(config.status === 'repository_only_private_ephemeral_boundary_ready_disabled', 'status must remain repository-only');
assert(config.channel.defaultEnabled === false, 'presence must remain disabled by default');
assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.migrationsApplied === 0, 'migration must not be marked applied');
assert(config.effects.productionChanged === false, 'production must remain untouched');

assert(/messagesPresenceEnabled:\s*false/.test(runtimeConfig), 'feature flag must be false');
assert(/messagesPresenceTypingTtlMs:\s*6000/.test(runtimeConfig), 'typing TTL must be explicit');
assert(/messagesPresenceChannelPrefix:\s*["']doke:conversation:["']/.test(runtimeConfig), 'channel prefix must be explicit');

assert(repository.includes('private: true'), 'Realtime channel must be private');
assert(repository.includes("channel.on('presence'"), 'Presence subscription missing');
assert(repository.includes("event: 'typing'"), 'typing Broadcast event missing');
assert(repository.includes('DOKE_MESSAGES_PRESENCE_CANONICAL_SESSION_REQUIRED'), 'canonical UUID session guard missing');
assert(repository.includes('DOKE_MESSAGES_PRESENCE_CONVERSATION_REQUIRED'), 'conversation UUID guard missing');
assert(repository.includes('removeChannel'), 'channel cleanup missing');
assert(repository.includes('localPersistence: false'), 'local persistence disposition missing');
assert(!repository.includes('localStorage'), 'repository must not use localStorage');
assert(!feature.includes('localStorage'), 'UI adapter must not use localStorage');
assert(!feature.includes('doke.chat.presence.v1'), 'legacy presence key must be retired');
assert(!feature.includes('doke.chat.typing.v1'), 'legacy typing key must be retired');
assert(!feature.includes('doke.chat.reads.v1'), 'legacy read key must be retired');
assert(feature.includes('Alguém está digitando'), 'typing identity must remain generic');

assert(html.includes('assets/js/repositories/messages-presence-repository.js?v=20260802-msg-a06-v1'), 'repository script is not loaded');
assert(html.indexOf('messages-presence-repository.js') < html.indexOf('chat-realtime-presence.js'), 'repository must load before the UI adapter');

assert(migration.includes('alter table realtime.messages enable row level security'), 'Realtime RLS not enabled');
assert(migration.includes('for select'), 'receive policy missing');
assert(migration.includes('for insert'), 'send policy missing');
assert(migration.includes("extension in ('presence', 'broadcast')"), 'extension restriction missing');
assert(migration.includes('c.client_id = auth.uid() or c.professional_id = auth.uid()'), 'participant proof missing');
assert(migration.includes("'^doke:conversation:"), 'topic format guard missing');

assert(['1.3.83', '1.3.84', '1.3.85'].includes(matrix.version), 'matrix version must include A06, A07 or A08');
assert(msg, 'MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-presence-repository.js',
  'assets/js/features/chat-realtime-presence.js',
  'supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql',
  'config/msg-001-a06-presence-typing-boundary.json',
  'docs/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.md',
  'docs/validation/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.json',
  'scripts/audit-msg-001-a06-presence-typing-boundary.js',
  'scripts/test-msg-001-a06-presence-typing-runtime.js',
  '.github/workflows/msg-001-a06-presence-typing-boundary.yml'
].forEach((requiredPath) => assert(msg.requiredPaths.includes(requiredPath), 'matrix requiredPaths missing ' + requiredPath));
assert(msg.tests.includes('audit:msg-001-a06-presence-typing-boundary'), 'matrix audit test missing');
assert(msg.tests.includes('test:msg-001-a06-presence-typing-runtime'), 'matrix runtime test missing');
assert(workflow.includes('permissions:\n  contents: read'), 'MSG-A06 workflow must remain read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'git push'].forEach((fragment) => {
  assert(!workflow.includes(fragment), 'MSG-A06 workflow contains prohibited fragment: ' + fragment);
});

console.log('MSG-A06 presence and typing boundary audit passed.');
