const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/features/in-app-notifications.js'), 'utf8');
for (const forbidden of ['const seen = new Set()', 'const toastRegistry = new Map()', 'let host = null', 'const ensureHost =']) assert.equal(source.includes(forbidden), false, `in-app adapter must not keep toast authority: ${forbidden}`);
for (const required of [
  'const getToastManager = () => window.Doke?.notificationToast || null;',
  'manager.show(payload, options)',
  'manager.configure({',
  "getToastManager()?.getRecord?.",
  "getToastManager()?.reset?.",
  'enqueueToast: show',
  "if (canonical === 'critical') return 'high';",
  "if (canonical === 'low') return 'silent';"
]) assert.ok(source.includes(required), `missing toast delegation contract: ${required}`);
const consumers = fs.readdirSync(root).filter((name) => name.endsWith('.html')).filter((name) => fs.readFileSync(path.join(root, name), 'utf8').includes('assets/js/features/in-app-notifications.js'));
assert.ok(consumers.length > 0);
for (const name of consumers) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  const managerTag = 'assets/js/core/notification-toast.js';
  const adapterTag = 'assets/js/features/in-app-notifications.js';
  assert.equal(html.split(managerTag).length - 1, 1, `${name}: toast manager must load exactly once`);
  assert.ok(html.indexOf(managerTag) < html.indexOf(adapterTag), `${name}: toast manager must load before adapter`);
}
console.log('[ux-notif-003-in-app-delegation] ok');
console.log(`- toast authority delegated and load order validated across ${consumers.length} root consumers`);
