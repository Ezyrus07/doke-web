'use strict';

const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const repository = fs.readFileSync('assets/js/repositories/attachments-repository.js', 'utf8');
const migration = [
  'supabase/migrations/012_transaction_attachments_storage.sql',
  'supabase/migrations/132_transaction_attachment_storage_authority.sql',
  'supabase/migrations/133_transaction_attachment_helper_runtime_fix.sql',
  'supabase/migrations/134_transaction_attachment_folder_depth_fix.sql'
].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const budget = fs.readFileSync('assets/js/pages/orcamento.js', 'utf8');
const messages = fs.readFileSync('assets/js/pages/mensagens.js', 'utf8');

const orderRepository = fs.readFileSync('assets/js/repositories/orders-repository.js', 'utf8');
const messagesRepository = fs.readFileSync('assets/js/repositories/messages-repository.js', 'utf8');
const orderPage = fs.readFileSync('orcamento.html', 'utf8');
const messagesPage = fs.readFileSync('mensagens.html', 'utf8');
const ordersPage = fs.readFileSync('pedidos.html', 'utf8');

assert(repository.includes("BUCKET = 'transaction-attachments'"), 'Private transaction attachment bucket is required.');
assert(repository.includes('createSignedUrl'), 'Attachments must use short-lived signed URLs.');
assert(repository.includes('uploadOrderFiles'), 'Order attachment upload API is required.');
assert(repository.includes('uploadConversationFiles'), 'Conversation attachment upload API is required.');
assert(repository.includes('syncPendingOrder'), 'Pending local order attachments must support later sync.');
assert(repository.includes('syncPendingConversation'), 'Pending local message attachments must support later sync.');
assert(config.includes('attachmentsEnabled: true'), 'Supabase attachment feature flag must be enabled.');
assert(migration.includes("'transaction-attachments'"), 'Private Storage bucket migration is required.');
assert(migration.includes('private.can_access_transaction_attachment'), 'Private participant access helper is required.');
assert(migration.includes('set search_path = pg_catalog'), 'Attachment authority helper must pin search_path.');
assert(migration.includes("account_status is distinct from 'active'"), 'Attachment access must require an active account.');
assert(migration.includes('array_length(parts, 1), 0) < 3'), 'Attachment path depth must match storage.foldername semantics.');
assert(migration.includes('transaction_attachments_participant_select'), 'Participant read policy is required.');
assert(/\(storage\.foldername\(name\)\)\[3\] = \(select auth\.uid\(\)\)::text/.test(migration) || migration.includes('(storage.foldername(name))[3] = auth.uid()::text'), 'Uploader path ownership is required.');
assert(migration.includes('owner_id = (select auth.uid())::text'), 'Update and delete must require Storage ownership.');
assert(migration.includes('drop function if exists public.can_access_transaction_attachment(text)'), 'Legacy public helper must be removed.');
assert(!migration.includes("public, true"), 'Transaction attachment bucket must not be public.');
assert(budget.includes('uploadOrderFiles'), 'Budget flow must upload order files.');
assert(messages.includes('uploadConversationFiles'), 'Chat flow must upload conversation files.');

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
  DOKE_SUPABASE_CONFIG: { enabled: false }
};
sandbox.window = sandbox;
vm.runInNewContext(repository, sandbox, { filename: 'attachments-repository.js' });
const attachmentAuthority = sandbox.Doke.repositories.attachments;
const persistedRemote = attachmentAuthority.toPersistedMetadata([{
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
assert.strictEqual(persistedRemote.url, '', 'Remote signed preview URLs must not be persisted.');
assert.strictEqual(persistedRemote.downloadUrl, '', 'Remote signed download URLs must not be persisted.');
assert.strictEqual(persistedRemote.dataUrl, '', 'Remote files must not duplicate Base64 in metadata.');
assert.strictEqual(persistedRemote.path.includes('orders/'), true, 'Remote Storage path must remain persisted.');
const persistedPending = attachmentAuthority.toPersistedMetadata([{
  id: 'att_pending', name: 'offline.png', type: 'image/png', dataUrl: 'data:image/png;base64,BBB', syncStatus: 'pending'
}])[0];
assert.strictEqual(persistedPending.dataUrl, 'data:image/png;base64,BBB', 'Small pending local files must remain syncable.');

assert(repository.includes('toPersistedMetadata'), 'Signed URLs and Base64 previews must not be persisted as remote metadata.');
assert(repository.includes('resolveUrls'), 'Private attachments must be rehydrated with signed URLs.');
assert(orderRepository.includes('toPersistedMetadata'), 'Order metadata must strip transient attachment URLs before remote persistence.');
if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  const messageService = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
  assert(!messagesRepository.includes('saveRemote'), 'A03 must remove browser-owned remote message persistence.');
  assert(!messagesRepository.includes('.upsert('), 'A03 must remove direct browser message upsert.');
  assert(messageService.includes('executeMessagesServerCommand'), 'A03 must route message persistence through the server-owned command boundary.');
  assert(repository.includes('toPersistedMetadata'), 'Attachment metadata sanitation must remain owned by the attachment repository.');
} else {
  assert(messagesRepository.includes('toPersistedMetadata'), 'Message metadata must strip transient attachment URLs before remote persistence.');
}
assert(orderPage.includes('attachments-repository.js'), 'Budget page must load the attachment authority.');
assert(messagesPage.includes('attachments-repository.js'), 'Messages page must load the attachment authority.');
assert(ordersPage.includes('attachments-repository.js'), 'Orders page must load the attachment authority.');

console.log('Attachments Supabase repository contract: PASS');
