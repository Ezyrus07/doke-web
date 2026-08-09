#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const adapter = fs.readFileSync(path.join(root, 'assets/js/features/in-app-notifications.js'), 'utf8');
const toast = fs.readFileSync(path.join(root, 'assets/js/core/notification-toast.js'), 'utf8');
const delivery = fs.readFileSync(path.join(root, 'assets/js/core/notification-delivery.js'), 'utf8');

for (const forbidden of [
  "const PREFS_KEY = 'doke.in-app-notification.preferences.v1'",
  "const DIGEST_KEY = 'doke.in-app-notification.digest.v1'",
  'const DEFAULT_PREFS =',
  'const PRIORITY_RANK =',
  'const queueDigest = (payload)',
  'const shouldToast = (payload'
]) assert.equal(adapter.includes(forbidden), false, `adapter must not retain H07 authority: ${forbidden}`);

for (const required of [
  'const getDeliveryManager = () => window.Doke?.notificationDelivery || null;',
  'getDeliveryDecision:',
  'onQueueDigest:',
  'getDeliveryManager()?.refreshAccount?.()',
  'getPreferences,',
  'setPreferences,'
]) assert.ok(adapter.includes(required), `missing H07 adapter delegation: ${required}`);

assert.ok(toast.includes("outcome === 'QUEUE_DIGEST'"));
assert.ok(toast.includes("outcome !== 'ALLOW_TOAST'"));
assert.ok(delivery.includes("const CONTRACT = 'notification-delivery-v1'"));
assert.ok(delivery.includes("domain: DOMAIN"));
assert.ok(delivery.includes("ALLOW_TOAST"));
assert.ok(delivery.includes("QUEUE_DIGEST"));
assert.ok(delivery.includes("SUPPRESS"));

const consumers = fs.readdirSync(root)
  .filter((name) => name.endsWith('.html'))
  .filter((name) => fs.readFileSync(path.join(root, name), 'utf8').includes('assets/js/features/in-app-notifications.js'));
assert.ok(consumers.length > 0);
for (const name of consumers) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const accountStorageTag = 'assets/js/core/account-storage.js';
  const deliveryTag = 'assets/js/core/notification-delivery.js';
  const adapterTag = 'assets/js/features/in-app-notifications.js';
  assert.equal(html.split(deliveryTag).length - 1, 1, `${name}: delivery authority must load exactly once`);
  assert.ok(html.indexOf(accountStorageTag) < html.indexOf(deliveryTag), `${name}: account storage must load before delivery authority`);
  assert.ok(html.indexOf(deliveryTag) < html.indexOf(adapterTag), `${name}: delivery authority must load before adapter`);
}

console.log('[ux-notif-007-adapter-delegation] ok');
console.log(`- H07 authority delegation and script order validated across ${consumers.length} root consumers`);
