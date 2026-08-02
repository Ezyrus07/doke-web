'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const repository = fs.readFileSync('assets/js/repositories/attachments-repository.js', 'utf8');
const migrationFiles = [
  'supabase/migrations/012_transaction_attachments_storage.sql',
  'supabase/migrations/132_transaction_attachment_storage_authority.sql',
  'supabase/migrations/133_transaction_attachment_helper_runtime_fix.sql',
  'supabase/migrations/134_transaction_attachment_folder_depth_fix.sql'
];
if (fs.existsSync('supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql')) {
  migrationFiles.push('supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql');
}
const migration = migrationFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const budget = fs.readFileSync('assets/js/pages/orcamento.js', 'utf8');
const messages = fs.readFileSync('assets/js/pages/mensagens.js', 'utf8');
const orderRepository = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const messagesRepository = fs.readFileSync('assets/js/repositories/messages-repository.js', 'utf8');
const orderPage = fs.readFileSync('orcamento.html', 'utf8');
const messagesPage = fs.readFileSync('mensagens.html', 'utf8');
const ordersPage = fs.readFileSync('pedidos.html', 'utf8');

assert(repository.includes("BUCKET = 'transaction-attachments'"));
assert(repository.includes('createSignedUrl'));
assert(repository.includes('uploadOrderFiles'));
assert(repository.includes('uploadConversationFiles'));
assert(repository.includes('resolveUrls'));
assert(config.includes('attachmentsEnabled: true'));
assert(migration.includes("'transaction-attachments'"));
assert(migration.includes('private.can_access_transaction_attachment') || migration.includes('private.can_read_transaction_attachment'));
assert(migration.includes('owner_id = (select auth.uid())::text') || migration.includes('owner_id = p_actor_id::text'));
assert(!migration.includes("public, true"));
assert(budget.includes('uploadOrderFiles'));
assert(messages.includes('uploadConversationFiles'));

if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(repository.includes("return user && isUuid(user.id) ? 'remote-server-owned' : 'fixture-memory'"));
  assert(repository.includes('uploadToSignedUrl'));
  assert(repository.includes('prepare_transaction_attachment_uploads'));
  assert(repository.includes('confirm_transaction_attachment_uploads'));
  assert(repository.includes('remove_transaction_attachment'));
  assert(repository.includes('DOKE_ATTACHMENTS_PENDING_SYNC_FORBIDDEN'));
  assert(!repository.includes('.upload(objectPath'));
  assert(!repository.includes('.remove([item.path])'));
  assert(!repository.includes("syncStatus: 'pending'"));
  assert(config.includes('attachmentLifecycleEnabled: false'));
  assert(migration.includes('private.transaction_attachment_lifecycle'));
  assert(migration.includes('attach_transaction_attachments_to_message_internal'));
  assert(migration.includes('No authenticated UPDATE or DELETE policy'));
} else {
  assert(repository.includes('syncPendingOrder'));
  assert(repository.includes('syncPendingConversation'));
}

const sandbox = {
  console,
  Date,
  Math,
  Promise,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  JSON,
  setTimeout,
  clearTimeout,
  document: { documentElement: { setAttribute() {} } },
  localStorage: { getItem() { return null; }, setItem() {} },
  DOKE_SUPABASE_CONFIG: { enabled: false },
  Doke: { session: { getCurrentUser() { return { id: 'fixture-user' }; } } }
};
sandbox.window = sandbox;
vm.runInNewContext(repository, sandbox, { filename: 'attachments-repository.js' });
const authority = sandbox.Doke.repositories.attachments;
const persistedRemote = authority.toPersistedMetadata([{
  id: 'att_remote',
  name: 'foto.png',
  type: 'image/png',
  size: 1200,
  bucket: 'transaction-attachments',
  path: 'orders/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/foto.png',
  url: 'https://signed.example/preview',
  downloadUrl: 'https://signed.example/download',
  dataUrl: 'data:image/png;base64,AAA',
  syncStatus: 'synced'
}])[0];
assert.strictEqual(persistedRemote.url, '');
assert.strictEqual(persistedRemote.downloadUrl, '');
assert.strictEqual(persistedRemote.dataUrl, '');
assert.strictEqual(persistedRemote.path.includes('orders/'), true);

assert(repository.includes('toPersistedMetadata'));
assert(orderRepository.includes('toPersistedMetadata'));
if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  const messageService = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
  assert(!messagesRepository.includes('saveRemote'));
  assert(!messagesRepository.includes('.upsert('));
  assert(messageService.includes('executeMessagesServerCommand'));
}
assert(orderPage.includes('attachments-repository.js'));
assert(messagesPage.includes('attachments-repository.js'));
assert(ordersPage.includes('attachments-repository.js'));

console.log('Attachments Supabase repository contract: PASS');
