#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const reliabilitySource = fs.readFileSync('assets/js/services/message-command-executor.js', 'utf8');
const source = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
const uuid = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';

function boot(apiReady) {
  const calls = [];
  const conversation = {
    id: 'conv-1', clientId: uuid, professionalId: peer, participants: [uuid, peer],
    status: 'accepted', order: { status: 'accepted' },
    messages: [{ id: 'msg-1', senderId: uuid, body: 'old' }]
  };
  const provider = {
    action(resource, payload) {
      calls.push({ resource, payload });
      let data;
      if (payload.action === 'sendMessage') data = { message: Object.assign({ id: 'msg-new' }, payload) };
      else if (payload.action === 'createForOrder' || payload.action === 'updateOrder') data = { conversation };
      else data = { ok: true };
      return Promise.resolve({
        data,
        acknowledgement: {
          commandId: payload.commandId,
          action: payload.action,
          status: 'accepted'
        }
      });
    }
  };
  const Doke = {
    session: { getCurrentUser() { return { id: uuid, role: 'client', name: 'Real' }; } },
    repositories: { messages: {
      normalize(value) { return value; },
      normalizeMessage(value) { return value; },
      getById() { return Promise.resolve(conversation); },
      list() { return Promise.resolve([conversation]); },
      listLocal() { return []; }
    } },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: 'mock', requestedProvider: 'mock', apiReady: apiReady === true }; },
      hasProvider(name) { return name === 'api'; },
      getProvider(name) { if (name !== 'api') throw new Error('bad provider'); return provider; }
    },
    services: {},
    permissions: {}
  };
  const document = { dispatchEvent() {} };
  function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; }
  const root = { Doke, document, CustomEvent, localStorage: { getItem() { return null; } }, console: { warn() {} } };
  root.window = root;
  const context = { window: root, document, CustomEvent, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, Map, Set, Date, Math, setTimeout, clearTimeout, console: root.console };
  vm.runInNewContext(reliabilitySource, context, { filename: 'message-command-executor.js' });
  vm.runInNewContext(source, context, { filename: 'message-service.js' });
  return { service: Doke.services.messages, calls };
}

(async function () {
  const ready = boot(true);
  assert.strictEqual(ready.service.getServerCommandBoundaryStatus().ready, true);
  await ready.service.createConversationForOrder({ id: 'order-1', clientId: uuid, professionalId: peer });
  await ready.service.updateConversationOrder({ id: 'order-1', conversationId: 'conv-1' });
  await ready.service.sendMessage('conv-1', { body: 'hello', deferSideEffects: true });
  await ready.service.removeMessage('conv-1', 'msg-1');
  await ready.service.markAsRead('conv-1');
  assert.deepStrictEqual(ready.calls.map(item => item.payload.action), ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead']);
  assert(ready.calls.every(item => item.resource === 'conversations'));
  assert(ready.calls.every(item => item.payload.actorId === uuid));

  const blocked = boot(false);
  await assert.rejects(
    blocked.service.createConversationForOrder({ id: 'order-2' }),
    error => error && error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE'
  );
  console.log('MSG-A03 server-owned command boundary runtime test passed.');
}()).catch(error => { console.error(error); process.exitCode = 1; });
