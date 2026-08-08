'use strict';

const fs = require('fs');
const assert = require('assert');

const repository = fs.readFileSync('assets/js/repositories/notifications-repository.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/013_transaction_notifications_shared_runtime.sql', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const notificationsPage = fs.readFileSync('notificacoes.html', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function loadsScript(html, canonicalPath) {
  const escapedPath = canonicalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<script[^>]+src=["']${escapedPath}(?:\\?[^"']*)?["'][^>]*>`, 'i');
  return pattern.test(html);
}

assert(repository.includes("REMOTE_TABLE = 'notifications'"), 'Notifications repository must target public.notifications.');
assert(repository.includes("REMOTE_CREATE_RPC = 'create_transaction_notification'"), 'Cross-user creation must use the guarded RPC.');
assert(repository.includes('data-doke-notifications-provider'), 'Notifications provider marker is required.');
assert(repository.includes('fetchRemoteNotifications'), 'Remote notification reads are required.');
assert(repository.includes('saveRemote'), 'Remote notification writes are required.');
assert(repository.includes('synchronizePending'), 'Pending local notifications must synchronize later.');
assert(repository.includes(".on('postgres_changes'"), 'Realtime Postgres Changes subscription is required.');
assert(repository.includes("filter: 'user_id=eq.'"), 'Realtime subscription must be recipient-scoped.');
assert(repository.includes('updateRemote'), 'Read and dismiss states must persist remotely.');
assert(config.includes('notificationsEnabled: true'), 'Supabase notifications feature flag must be enabled.');
assert(notificationsPage.includes('@supabase/supabase-js@2'), 'Notifications page must load the Supabase SDK.');
assert(
  loadsScript(notificationsPage, 'assets/js/core/supabase-config.js'),
  'Notifications page must load the canonical Supabase config regardless of cache version.'
);

assert(migration.includes('notifications_recipient_select'), 'Recipient-only SELECT RLS is required.');
assert(migration.includes('notifications_recipient_update'), 'Recipient-only UPDATE RLS is required.');
assert(migration.includes('grant update (read_at, dismissed_at, updated_at)'), 'Authenticated users may update only notification state columns.');
assert(migration.includes('revoke insert, delete on public.notifications from authenticated'), 'Direct notification creation and deletion must remain blocked.');
assert(migration.includes('create_transaction_notification'), 'Guarded notification creation RPC is required.');
assert(migration.includes('Actor and recipient must participate in the order.'), 'Order participant validation is required.');
assert(migration.includes('Actor and recipient must participate in the conversation.'), 'Conversation participant validation is required.');
assert(migration.includes('Cross-user notifications require an order or conversation context.'), 'Arbitrary cross-user notifications must be rejected.');
assert(migration.includes('alter publication supabase_realtime add table public.notifications'), 'Notifications must be enabled for realtime delivery.');
assert(!migration.includes('to anon'), 'Notifications must not be readable by anonymous users.');

assert.strictEqual(
  packageJson.scripts['test:notifications-supabase-repository-contract'],
  'node scripts/test-notifications-supabase-repository-contract.js',
  'Package script for the notifications Supabase contract is required.'
);

[
  'anunciar-servico.html',
  'index.html',
  'perfil-profissional.html',
  'perfil.html',
  'resultados.html'
].forEach((file) => {
  const html = fs.readFileSync(file, 'utf8');
  assert(
    loadsScript(html, 'assets/js/repositories/notifications-repository.js'),
    `${file} must bootstrap the shared notifications repository regardless of cache version.`
  );
});

console.log('Notifications Supabase repository contract: PASS');
