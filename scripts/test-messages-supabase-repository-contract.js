'use strict';
const fs = require('fs');
const assert = require('assert');
const repo = fs.readFileSync('assets/js/repositories/messages-repository.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/011_messages_shared_runtime.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
assert(repo.includes("REMOTE_CONVERSATIONS_TABLE = 'conversations'"));
assert(repo.includes("REMOTE_MESSAGES_TABLE = 'messages'"));
assert(repo.includes('fetchRemoteConversations'));
if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  const service = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
  assert(!repo.includes('saveRemote'));
  assert(service.includes('executeMessagesServerCommand'));
  assert(repo.includes('DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED'));
} else {
  assert(repo.includes('saveRemote'));
}
assert(repo.includes("data-doke-messages-provider"));
assert(repo.includes('syncPending'));
assert(config.includes('messagesEnabled: true'));
assert(migration.includes('conversation_participants_select'));
assert(migration.includes('message_sender_insert'));
assert(migration.includes('external_id'));
assert(migration.includes('attachments jsonb'));
console.log('Messages Supabase repository contract: PASS');
