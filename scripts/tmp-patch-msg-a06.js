#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
function write(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith('\n') ? content : content + '\n');
}
function pushUnique(list, values) {
  values.forEach((value) => { if (!list.includes(value)) list.push(value); });
}

let supabaseConfig = read('assets/js/core/supabase-config.js');
if (!supabaseConfig.includes('messagesPresenceEnabled:')) {
  supabaseConfig = supabaseConfig.replace(
    '  messagesRealtimeEnabled: false,\n',
    '  messagesRealtimeEnabled: false,\n  messagesPresenceEnabled: false,\n  messagesPresenceChannelPrefix: "doke:conversation:",\n  messagesPresenceTypingTtlMs: 6000,\n  messagesPresenceTypingThrottleMs: 1000,\n',
  );
}
write('assets/js/core/supabase-config.js', supabaseConfig);

let html = read('mensagens.html');
if (!html.includes('assets/js/repositories/messages-presence-repository.js')) {
  html = html.replace(
    '<script src="assets/js/repositories/messages-realtime-repository.js?v=20260802-msg-a04-v1" defer></script>',
    '<script src="assets/js/repositories/messages-realtime-repository.js?v=20260802-msg-a04-v1" defer></script>\n<script src="assets/js/repositories/messages-presence-repository.js?v=20260802-msg-a06-v1" defer></script>',
  );
}
html = html.replace(
  'assets/js/features/chat-realtime-presence.js?v=20260714-messages-startup-loop-v2',
  'assets/js/features/chat-realtime-presence.js?v=20260802-msg-a06-v1',
);
write('mensagens.html', html);

const pkg = JSON.parse(read('package.json'));
pkg.scripts['audit:msg-001-a06-presence-typing-boundary'] = 'node scripts/audit-msg-001-a06-presence-typing-boundary.js';
pkg.scripts['test:msg-001-a06-presence-typing-runtime'] = 'node scripts/test-msg-001-a06-presence-typing-runtime.js';
write('package.json', JSON.stringify(pkg, null, 2));

let a01 = read('scripts/audit-msg-001-a01-authority-baseline.js');
const oldPresence = `[
  "var STORAGE_KEY = 'doke.chat.presence.v1'",
  "var TYPING_KEY = 'doke.chat.typing.v1'",
  "var READ_KEY = 'doke.chat.reads.v1'",
  "return { id: 'local-user', name: 'Você' }",
  'localStorage.getItem',
  'localStorage.setItem'
].forEach((fragment) => assert(presence.includes(fragment), 'Presence baseline missing fragment: ' + fragment));`;
const newPresence = `if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  const presenceRepository = fs.readFileSync('assets/js/repositories/messages-presence-repository.js', 'utf8');
  [
    'private: true',
    "channel.on('presence'",
    "event: 'typing'",
    'DOKE_MESSAGES_PRESENCE_CANONICAL_SESSION_REQUIRED',
    'localPersistence: false'
  ].forEach((fragment) => assert(presenceRepository.includes(fragment), 'Presence A06 closure missing fragment: ' + fragment));
  ['localStorage', 'doke.chat.presence.v1', 'doke.chat.typing.v1', 'doke.chat.reads.v1']
    .forEach((fragment) => assert(!presence.includes(fragment), 'Presence A06 retained legacy authority: ' + fragment));
} else {
  [
    "var STORAGE_KEY = 'doke.chat.presence.v1'",
    "var TYPING_KEY = 'doke.chat.typing.v1'",
    "var READ_KEY = 'doke.chat.reads.v1'",
    "return { id: 'local-user', name: 'Você' }",
    'localStorage.getItem',
    'localStorage.setItem'
  ].forEach((fragment) => assert(presence.includes(fragment), 'Presence baseline missing fragment: ' + fragment));
}`;
if (!a01.includes(oldPresence)) throw new Error('A01 presence assertion block not found');
a01 = a01.replace(oldPresence, newPresence);
const oldNext = `if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A05:')));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {`;
const newNext = `if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A07')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A06:')));
} else if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A05:')));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {`;
if (!a01.includes(oldNext)) throw new Error('A01 next action assertion block not found');
a01 = a01.replace(oldNext, newNext);
write('scripts/audit-msg-001-a01-authority-baseline.js', a01);

const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
matrix.version = '1.3.83';
matrix.updatedAt = '2026-08-02T21:36:00-03:00';
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 domain not found');
pushUnique(msg.requiredPaths, [
  'assets/js/repositories/messages-presence-repository.js',
  'supabase/migrations/20260802234000_msg_a06_presence_typing_realtime_authorization_contract.sql',
  'config/msg-001-a06-presence-typing-boundary.json',
  'docs/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.md',
  'docs/validation/MSG-001-A06-PRESENCE-TYPING-BOUNDARY.json',
  'scripts/audit-msg-001-a06-presence-typing-boundary.js',
  'scripts/test-msg-001-a06-presence-typing-runtime.js'
]);
pushUnique(msg.tests, [
  'audit:msg-001-a06-presence-typing-boundary',
  'test:msg-001-a06-presence-typing-runtime'
]);
pushUnique(msg.evidence, [
  'MSG-A06 retires localStorage presence, typing and read-receipt authority and prepares private participant-scoped Presence/Broadcast channels behind a disabled feature flag.'
]);
const blocker = msg.blockers.find((item) => item.id === 'MSG-B03');
if (blocker) {
  blocker.description = 'Persistent messaging authority is remote/server-owned. Presence and typing now have a repository-only private Realtime Authorization boundary; operational closure still requires policy application and authenticated participant-isolation canaries.';
}
msg.nextActions = [
  'Complete MSG-A07 repository-only command acknowledgement, idempotency, deduplication and bounded retry contract.',
  'Apply MSG-A06 Realtime Authorization policies and execute participant/non-participant presence canaries only after fresh explicit staging authorization.',
  'Apply MSG-A05 attachment lifecycle resources only after fresh explicit staging authorization.',
  'Apply MSG-A04 publication changes and execute participant-scoped message canaries only after fresh explicit staging authorization.'
];
write('config/domain-completion-matrix.json', JSON.stringify(matrix, null, 2));

console.log('MSG-A06 existing files patched.');
// Trigger rerun after the publisher workflow already exists on the branch.
