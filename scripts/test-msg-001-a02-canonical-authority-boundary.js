#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/repositories/messages-repository.js', 'utf8');

function boot(user, options) {
  options = options || {};
  const store = new Map();
  store.set('doke.conversations.local.v1', JSON.stringify([{ id: 'stale-local', clientId: user && user.id || '', professionalId: 'stale-peer' }]));
  let reads = 0;
  let writes = 0;
  const attributes = {};
  const localStorage = {
    getItem(key) { reads += 1; return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { writes += 1; store.set(key, String(value)); },
    removeItem(key) { writes += 1; store.delete(key); }
  };
  const Doke = {
    session: { getCurrentUser() { return user || null; } },
    repositories: {}
  };
  const root = {
    Doke,
    localStorage,
    DOKE_SUPABASE_CONFIG: options.config || { enabled: false, messagesEnabled: true },
    supabase: options.supabase || null,
    console: { warn() {} }
  };
  const document = { documentElement: { setAttribute(name, value) { attributes[name] = value; } } };
  const context = {
    window: root,
    document,
    fetch: async function () { return { ok: true, json: async function () { return []; } }; },
    Intl, Date, Promise, Object, Array, String, Number, Boolean, RegExp, JSON, Error, Math,
    setTimeout, clearTimeout
  };
  root.window = root;
  root.document = document;
  root.fetch = context.fetch;
  vm.runInNewContext(source, context, { filename: 'messages-repository.js' });
  return {
    repository: root.Doke.repositories.messages,
    getReads: function () { return reads; },
    getWrites: function () { return writes; },
    attributes
  };
}

(async function run() {
  const fixture = boot({ id: 'fixture-client', role: 'client', name: 'Fixture' });
  const fixtureConversation = {
    id: 'conv-fixture',
    clientId: 'fixture-client',
    professionalId: 'fixture-professional',
    participants: ['fixture-client', 'fixture-professional'],
    messages: []
  };
  const fixtureSaved = await fixture.repository.save(fixtureConversation);
  assert.strictEqual(fixtureSaved.syncStatus, 'memory-only');
  assert.strictEqual(fixture.getWrites(), 0, 'fixture authority must not persist to localStorage');
  assert.strictEqual(fixture.repository.listLocal({ currentUser: false }).length, 1);
  const fixtureStatus = fixture.repository.getProviderStatus();
  assert.strictEqual(fixtureStatus.authority, 'fixture-memory');
  assert.strictEqual(fixtureStatus.provider, 'fixture-memory');
  assert.strictEqual(fixtureStatus.fallbackActive, false);

  const uuid = '11111111-1111-4111-8111-111111111111';
  const remote = boot({ id: uuid, role: 'client', name: 'Real' });
  await assert.rejects(
    remote.repository.load({ fresh: true, currentUser: false }),
    function (error) { return error && error.code === 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE'; }
  );
  await assert.rejects(
    remote.repository.save({ id: 'conv-real', clientId: uuid, professionalId: '22222222-2222-4222-8222-222222222222', messages: [] }),
    function (error) { return error && error.code === 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE'; }
  );
  assert.strictEqual(remote.getWrites(), 0, 'real authority must not persist failed operations locally');
  const remoteLocal = remote.repository.listLocal({ currentUser: false });
  assert.strictEqual(Array.isArray(remoteLocal), true);
  assert.strictEqual(remoteLocal.length, 0);
  const remoteStatus = remote.repository.getProviderStatus();
  assert.strictEqual(remoteStatus.authority, 'remote-only');
  assert.strictEqual(remoteStatus.provider, 'unavailable');
  assert.strictEqual(remoteStatus.fallbackActive, false);
  assert.strictEqual(remote.repository.getAuthorityStatus().persistentLocalAuthority, false);
  assert.strictEqual(remote.repository.getAuthorityStatus().pendingSynchronization, false);

  console.log('MSG-A02 canonical authority boundary runtime test passed.');
}()).catch(function (error) {
  console.error(error);
  process.exitCode = 1;
});
