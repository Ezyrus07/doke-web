#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('assets/js/repositories/messages-realtime-repository.js', 'utf8');
const userId = '00000000-0000-4000-8000-000000000041';
const conversationId = '00000000-0000-4000-8000-000000000042';

function createHarness(enabled, sessionId) {
  const registrations = [];
  const events = [];
  let removedChannel = null;
  let loadCalls = 0;
  let clearCalls = 0;
  let subscribeCallback = null;

  const channel = {
    on(kind, filter, handler) {
      registrations.push({ kind, filter, handler });
      return this;
    },
    subscribe(callback) {
      subscribeCallback = callback;
      callback('SUBSCRIBED');
      return this;
    }
  };

  const client = {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session: sessionId ? { user: { id: sessionId } } : null } });
      }
    },
    channel(name) {
      channel.name = name;
      return channel;
    },
    removeChannel(target) {
      removedChannel = target;
    }
  };

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  const document = {
    readyState: 'complete',
    body: { dataset: { page: 'mensagens' } },
    documentElement: { setAttribute() {} },
    addEventListener() {},
    dispatchEvent(event) { events.push(event); }
  };

  const sandbox = {
    window: null,
    document,
    CustomEvent,
    Promise,
    Object,
    Array,
    String,
    RegExp,
    Error,
    JSON,
    setTimeout,
    clearTimeout,
    DOKE_SUPABASE_CONFIG: {
      enabled: true,
      messagesEnabled: true,
      messagesRealtimeEnabled: enabled
    },
    DokeSupabase: {
      getClient() { return client; }
    },
    Doke: {
      repositories: {
        messages: {
          clearCache() { clearCalls += 1; },
          load(options) {
            loadCalls += 1;
            assert.strictEqual(options.fresh, true);
            assert.strictEqual(options.currentUser, false);
            return Promise.resolve([{ id: 'conv_remote' }]);
          }
        }
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'messages-realtime-repository.js' });

  return {
    repository: sandbox.Doke.repositories.messagesRealtime,
    registrations,
    events,
    channel,
    getRemovedChannel: () => removedChannel,
    getLoadCalls: () => loadCalls,
    getClearCalls: () => clearCalls,
    getSubscribeCallback: () => subscribeCallback
  };
}

(async function () {
  const disabled = createHarness(false, userId);
  await disabled.repository.start();
  assert.strictEqual(disabled.registrations.length, 0);
  assert.strictEqual(disabled.repository.getStatus().status, 'disabled');

  const invalid = createHarness(true, 'fixture-user');
  await assert.rejects(
    () => invalid.repository.start(),
    (error) => error && error.code === 'DOKE_MESSAGES_REALTIME_UNAVAILABLE'
  );
  assert.strictEqual(invalid.registrations.length, 0);

  const active = createHarness(true, userId);
  await active.repository.start();
  assert.strictEqual(active.registrations.length, 6);
  assert(active.registrations.every((entry) => entry.kind === 'postgres_changes'));
  assert(active.registrations.every((entry) => entry.filter.event !== 'DELETE'));

  const conversationFilters = active.registrations
    .filter((entry) => entry.filter.table === 'conversations')
    .map((entry) => entry.filter.filter);
  assert(conversationFilters.includes('client_id=eq.' + userId));
  assert(conversationFilters.includes('professional_id=eq.' + userId));

  const messageInsert = active.registrations.find((entry) =>
    entry.filter.table === 'messages' && entry.filter.event === 'INSERT'
  );
  messageInsert.handler({
    eventType: 'INSERT',
    new: { id: '00000000-0000-4000-8000-000000000043', conversation_id: conversationId }
  });

  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.strictEqual(active.getClearCalls(), 1);
  assert.strictEqual(active.getLoadCalls(), 1);
  assert(active.events.some((event) => event.type === 'doke:messages-realtime-synced'));
  assert.strictEqual(active.repository.getStatus().payloadAuthority, 'signal-only');
  assert.strictEqual(active.repository.getStatus().canonicalAuthority, 'remote-only-reread');
  assert.strictEqual(active.repository.getStatus().deleteSubscribed, false);

  active.repository.stop();
  assert.strictEqual(active.getRemovedChannel(), active.channel);

  console.log('MSG-A04 Realtime publication/subscription runtime test passed.');
}()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
