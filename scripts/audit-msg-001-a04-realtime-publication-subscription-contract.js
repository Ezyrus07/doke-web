#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const contract = JSON.parse(fs.readFileSync('config/msg-001-a04-realtime-publication-subscription-contract.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql', 'utf8');
const realtime = fs.readFileSync('assets/js/repositories/messages-realtime-repository.js', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const html = fs.readFileSync('mensagens.html', 'utf8');
const matrix = JSON.parse(fs.readFileSync('config/domain-completion-matrix.json', 'utf8'));
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');

assert.strictEqual(contract.contractVersion, 'msg-a04-realtime-publication-subscription-v1');
assert.strictEqual(contract.publication.migrationApplied, false);
assert.strictEqual(contract.subscriptions.defaultEnabled, false);
assert.strictEqual(contract.subscriptions.deleteEvents.subscribed, false);
assert.strictEqual(contract.effects.stagingReads, 0);
assert.strictEqual(contract.effects.stagingMutations, 0);
assert.strictEqual(contract.effects.realtimePublicationChanges, 0);
assert.strictEqual(contract.effects.deployments, 0);

assert(migration.includes("alter publication supabase_realtime add table public.conversations"));
assert(migration.includes("alter publication supabase_realtime add table public.messages"));
assert(migration.includes('conversation_participants_select'));
assert(migration.includes('message_participants_select'));
assert(migration.includes('grant select on public.conversations to authenticated'));
assert(migration.includes('grant select on public.messages to authenticated'));
assert(!migration.toLowerCase().includes('replica identity full'));

assert(realtime.includes("['INSERT', 'UPDATE']"));
assert(!realtime.includes("event: 'DELETE'"));
assert(realtime.includes("filter: 'client_id=eq.' + userId"));
assert(realtime.includes("filter: 'professional_id=eq.' + userId"));
assert(realtime.includes("table: 'messages'"));
assert(realtime.includes("messages.load({ fresh: true, currentUser: false })"));
assert(realtime.includes("payloadAuthority: 'signal-only'"));
assert(!realtime.includes('localStorage'));
assert(!realtime.includes('.insert('));
assert(!realtime.includes('.update('));
assert(!realtime.includes('.delete('));

assert(config.includes('messagesRealtimeEnabled: false'));
assert(html.includes('assets/js/repositories/messages-realtime-repository.js'));

assert(msg, 'MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-realtime-repository.js',
  'supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql',
  'config/msg-001-a04-realtime-publication-subscription-contract.json',
  'docs/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.md',
  'docs/validation/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.json',
  'scripts/audit-msg-001-a04-realtime-publication-subscription-contract.js',
  'scripts/test-msg-001-a04-realtime-publication-subscription-runtime.js',
  '.github/workflows/msg-001-a04-realtime-publication-subscription-contract.yml'
].forEach((requiredPath) => assert(msg.requiredPaths.includes(requiredPath), 'requiredPaths: ' + requiredPath));

assert(msg.tests.includes('audit:msg-001-a04-realtime-publication-subscription-contract'));
assert(msg.tests.includes('test:msg-001-a04-realtime-publication-subscription-runtime'));

console.log('MSG-A04 Realtime publication/subscription contract audit passed.');
