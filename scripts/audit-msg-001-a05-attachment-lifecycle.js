#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config/msg-001-a05-attachment-lifecycle.json', 'utf8'));
const evidence = JSON.parse(fs.readFileSync('docs/validation/MSG-001-A05-ATTACHMENT-LIFECYCLE.json', 'utf8'));
const repository = fs.readFileSync('assets/js/repositories/attachments-repository.js', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql', 'utf8');
const edge = fs.readFileSync('supabase/functions/self-service-operations/index.ts', 'utf8');
const operations = fs.readFileSync('supabase/functions/self-service-operations/operations.mjs', 'utf8');
const cleanup = fs.readFileSync('supabase/functions/transaction-attachment-cleanup/index.ts', 'utf8');
const supabaseConfig = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const docs = fs.readFileSync('docs/MSG-001-A05-ATTACHMENT-LIFECYCLE.md', 'utf8');
const matrix = JSON.parse(fs.readFileSync('config/domain-completion-matrix.json', 'utf8'));

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'msg-a05-attachment-lifecycle-v1');
assert.strictEqual(config.status, 'repository_only_attachment_lifecycle_ready_disabled');
Object.values(config.effects).forEach((value) => assert(value === 0 || value === false));

[
  "return user && isUuid(user.id) ? 'remote-server-owned' : 'fixture-memory'",
  "prepare_transaction_attachment_uploads",
  "confirm_transaction_attachment_uploads",
  "remove_transaction_attachment",
  'uploadToSignedUrl',
  'DOKE_ATTACHMENTS_PENDING_SYNC_FORBIDDEN',
  'persistentBase64Authority: false',
  'fallbackActive: false'
].forEach((fragment) => assert(repository.includes(fragment), 'Attachment repository missing: ' + fragment));

[
  '.upload(objectPath',
  '.remove([item.path])',
  "setProviderState('local-fallback')",
  "syncStatus: 'pending'"
].forEach((fragment) => assert(!repository.includes(fragment), 'Attachment repository retained unsafe path: ' + fragment));

[
  'private.transaction_attachment_lifecycle',
  'intent_expires_at',
  "interval '2 hours'",
  "interval '24 hours'",
  "interval '30 days'",
  'owner_id = p_actor_id::text',
  'transaction_attachments_lifecycle_select',
  'transaction_attachments_lifecycle_insert',
  'No authenticated UPDATE or DELETE policy',
  'attach_transaction_attachments_to_message_internal'
].forEach((fragment) => assert(migration.includes(fragment), 'Lifecycle migration missing: ' + fragment));

assert(!/create policy[\s\S]{0,120}for delete[\s\S]{0,120}to authenticated/i.test(migration));
assert(operations.includes("'prepare_transaction_attachment_uploads'"));
assert(operations.includes("'confirm_transaction_attachment_uploads'"));
assert(operations.includes("'remove_transaction_attachment'"));
assert(edge.includes('createSignedUploadUrl'));
assert(edge.includes('authorize_transaction_attachment_removal_internal'));
assert(edge.includes('mark_transaction_attachment_removed_internal'));
assert(cleanup.includes('.remove([objectPath])'));
assert(cleanup.includes('DOKE_ATTACHMENT_CLEANUP_SECRET'));
assert(!cleanup.includes('delete from storage.objects'));
assert(supabaseConfig.includes('attachmentLifecycleEnabled: false'));
assert(supabaseConfig.includes('attachmentSignedUrlTtlSeconds: 300'));
assert(docs.includes('Storage API'));
assert(docs.includes('30 days'));

const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
assert(msg);
const matrixVersion = matrix.version.split('.').map(Number);
assert(matrixVersion[0] === 1 && matrixVersion[1] === 3 && matrixVersion[2] >= 82);
assert(msg.evidence.some((item) => item.includes('MSG-A05')));
if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  assert(matrixVersion[2] >= 83);
  assert(msg.nextActions.some((item) => item.includes('MSG-A07')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A06:')));
} else {
  assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
}
assert(!msg.nextActions.some((item) => item.includes('MSG-A05 —')));

console.log('MSG-A05 attachment lifecycle audit passed.');
