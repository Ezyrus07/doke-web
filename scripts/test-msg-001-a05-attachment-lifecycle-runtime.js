#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/repositories/attachments-repository.js', 'utf8');
const uuid = '00000000-0000-4000-8000-000000000001';
const resourceId = '00000000-0000-4000-8000-000000000002';

function buildSandbox(user, options = {}) {
  const actions = [];
  const uploads = [];
  const signed = [];
  const bucket = {
    uploadToSignedUrl(path, token, file) {
      uploads.push({ path, token, name: file.name });
      return Promise.resolve({ data: { path }, error: null });
    },
    createSignedUrl(path, ttl, extra) {
      signed.push({ path, ttl, extra });
      return Promise.resolve({ data: { signedUrl: 'https://signed.example/' + path }, error: null });
    },
    remove() {
      throw new Error('Direct browser remove must not be called.');
    },
    upload() {
      throw new Error('Direct browser upload must not be called.');
    }
  };
  const client = { storage: { from() { return bucket; } } };
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
    Blob,
    Uint8Array,
    setTimeout,
    clearTimeout,
    document: { documentElement: { setAttribute() {} } },
    localStorage: {
      getItem() { return null; },
      setItem() { throw new Error('Attachments must not persist to localStorage.'); }
    },
    DOKE_SUPABASE_CONFIG: {
      enabled: options.enabled !== false,
      attachmentsEnabled: true,
      attachmentLifecycleEnabled: options.lifecycle !== false,
      attachmentSignedUrlTtlSeconds: 300,
      url: 'https://example.supabase.co',
      anonKey: 'anon'
    },
    supabase: { createClient() { return client; } },
    Doke: {
      session: { getCurrentUser() { return user; } }
    }
  };
  sandbox.DokeSupabase = {
    getClient() { return client; },
    invokeSelfService(action) {
      actions.push(action);
      if (options.failPrepare && action === 'prepare_transaction_attachment_uploads') {
        return Promise.reject(new Error('prepare failed'));
      }
      if (action === 'prepare_transaction_attachment_uploads') {
        return Promise.resolve({
          uploads: [{
            attachmentId: '10000000-0000-4000-8000-000000000001',
            bucket: 'transaction-attachments',
            path: 'conversations/' + resourceId + '/' + uuid + '/10000000-0000-4000-8000-000000000001.png',
            token: 'signed-token',
            name: 'foto.png',
            type: 'image/png',
            size: 100
          }]
        });
      }
      if (action === 'confirm_transaction_attachment_uploads') {
        return Promise.resolve({
          items: [{
            attachmentId: '10000000-0000-4000-8000-000000000001',
            bucket: 'transaction-attachments',
            path: 'conversations/' + resourceId + '/' + uuid + '/10000000-0000-4000-8000-000000000001.png',
            name: 'foto.png',
            type: 'image/png',
            size: 100,
            uploadedBy: uuid,
            status: 'uploaded'
          }]
        });
      }
      if (action === 'remove_transaction_attachment') return Promise.resolve({ removed: true });
      return Promise.reject(new Error('unexpected action ' + action));
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'attachments-repository.js' });
  return { repository: sandbox.Doke.repositories.attachments, actions, uploads, signed };
}

(async () => {
  const remote = buildSandbox({ id: uuid });
  const file = { name: 'foto.png', type: 'image/png', size: 100 };
  const uploaded = await remote.repository.uploadConversationFiles(resourceId, [file]);
  assert.strictEqual(uploaded.length, 1);
  assert.strictEqual(uploaded[0].syncStatus, 'synced');
  assert.strictEqual(remote.uploads.length, 1);
  assert.deepStrictEqual(remote.actions.slice(0, 2), [
    'prepare_transaction_attachment_uploads',
    'confirm_transaction_attachment_uploads'
  ]);
  assert(remote.signed.length >= 2);
  await remote.repository.remove(uploaded[0]);
  assert(remote.actions.includes('remove_transaction_attachment'));

  const failure = buildSandbox({ id: uuid }, { failPrepare: true });
  await assert.rejects(
    failure.repository.uploadConversationFiles(resourceId, [file]),
    /prepare failed/
  );
  assert.strictEqual(failure.uploads.length, 0);

  const disabled = buildSandbox({ id: uuid }, { lifecycle: false });
  await assert.rejects(
    disabled.repository.uploadConversationFiles(resourceId, [file]),
    (error) => error && error.code === 'DOKE_ATTACHMENTS_LIFECYCLE_NOT_ACTIVATED'
  );

  const fixture = buildSandbox({ id: 'fixture-user' }, { enabled: false, lifecycle: false });
  const fixtureItems = await fixture.repository.uploadConversationFiles('conv_fixture', [file]);
  assert.strictEqual(fixtureItems[0].syncStatus, 'fixture-memory');
  assert.strictEqual(fixture.actions.length, 0);
  assert.strictEqual(fixture.uploads.length, 0);

  await assert.rejects(
    remote.repository.syncPendingConversation(resourceId, [{
      id: 'pending',
      name: 'pending.png',
      type: 'image/png',
      syncStatus: 'pending',
      dataUrl: 'data:image/png;base64,AAA'
    }]),
    (error) => error && error.code === 'DOKE_ATTACHMENTS_PENDING_SYNC_FORBIDDEN'
  );

  console.log('MSG-A05 attachment lifecycle runtime: PASS');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
