#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const rendered = [];
const queued = [];
const Doke = {};
const documentStub = { body: { appendChild() {} }, createElement() { throw new Error('default DOM renderer must not run'); } };
const windowStub = {
  Doke,
  document: documentStub,
  setTimeout() { return 1; },
  clearTimeout() {}
};
global.window = windowStub;
global.document = documentStub;

const managerPath = require.resolve('../assets/js/core/notification-toast.js');
delete require.cache[managerPath];
require(managerPath);

const manager = Doke.notificationToast;
manager.configure({
  getAccountKey: () => 'account_delivery_test',
  isForCurrentUser: () => true,
  getDeliveryDecision(payload, options) {
    if (options?.skipDelivery) return { outcome: 'ALLOW_TOAST', reason: 'skip' };
    if (payload.mode === 'digest') return { outcome: 'QUEUE_DIGEST', reason: 'dnd-active' };
    if (payload.mode === 'suppress') return { outcome: 'SUPPRESS', reason: 'disabled' };
    return { outcome: 'ALLOW_TOAST', reason: 'allowed' };
  },
  onQueueDigest(payload, decision) { queued.push({ payload, decision }); },
  renderToast(payload) { rendered.push(payload); return { payload, notificationId: payload.id }; }
});

assert.equal(manager.show({ id: 'digest-1', mode: 'digest' }), false);
assert.equal(queued.length, 1);
assert.equal(rendered.length, 0);
assert.equal(manager.show({ id: 'suppress-1', mode: 'suppress' }), false);
assert.equal(rendered.length, 0);
assert.equal(manager.show({ id: 'allow-1', mode: 'allow' }), true);
assert.equal(rendered.length, 1);
assert.equal(manager.show({ id: 'allow-1', mode: 'allow' }), false, 'toast identity dedupe remains owned by manager');
assert.equal(manager.show({ id: 'digest-summary', mode: 'suppress' }, { skipDelivery: true }), true, 'digest summary can bypass H07 requeue explicitly');
assert.equal(rendered.length, 2);

for (const key of ['window', 'document']) delete global[key];
delete require.cache[managerPath];

console.log('[ux-notif-007-toast-delivery-integration] ok');
console.log('- toast manager consumes explicit H07 outcomes while preserving render/dedupe authority');
