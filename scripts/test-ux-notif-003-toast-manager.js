const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/core/notification-toast.js'), 'utf8');
const previous = { window: global.window, document: global.document };
global.window = { Doke: {}, setTimeout, clearTimeout, location: { href: '' } };
global.document = { body: { appendChild() {} }, createElement() { throw new Error('default renderer should not execute in policy test'); } };
vm.runInThisContext(source, { filename: 'notification-toast.js' });

const manager = global.window.Doke.notificationToast;
assert.ok(manager, 'Doke.notificationToast must exist');
assert.equal(manager.version, '20260809-ux-notif-003-v1');
let accountKey = 'account-a';
const rendered = [];
manager.configure({
  getAccountKey: () => accountKey,
  isForCurrentUser: () => true,
  shouldToast: () => true,
  isDndActive: () => false,
  renderToast(payload, identity) {
    rendered.push({ payload, identity });
    return { payload, notificationId: payload.id || '' };
  }
});
const allowed = { id: 'n-1', eventId: 'evt-1', dedupeKey: 'evt-1', eventAccepted: true, eventCategory: 'MESSAGES', sourceAuthority: 'CANONICAL_REMOTE', channelPolicy: { toast: 'allowed' } };
assert.equal(manager.show(allowed), true);
assert.equal(manager.show({ ...allowed, id: 'n-2' }), false, 'same logical event must dedupe');
assert.equal(rendered.length, 1);
assert.equal(manager.show({ ...allowed, id: 'n-silent', eventId: 'evt-silent', dedupeKey: 'evt-silent', channelPolicy: { toast: 'silent' } }), false);
assert.equal(manager.show({ ...allowed, id: 'n-forbidden', eventId: 'evt-forbidden', dedupeKey: 'evt-forbidden', channelPolicy: { toast: 'forbidden' } }), false);
assert.equal(manager.show({ ...allowed, id: 'n-rejected', eventId: 'evt-rejected', dedupeKey: 'evt-rejected', eventAccepted: false }), false);
const critical = { id: 'critical-1', eventId: 'critical-evt-1', dedupeKey: 'critical-evt-1', eventCategory: 'PAYMENTS', channelPolicy: { toast: 'allowed' } };
assert.equal(manager.show({ ...critical, sourceAuthority: 'CANONICAL_LOCAL' }), false, 'critical event must be explicitly accepted');
assert.equal(manager.show({ ...critical, eventAccepted: true, sourceAuthority: 'DERIVED_INFORMATIONAL' }), false, 'critical event requires canonical authority');
assert.equal(manager.show({ ...critical, eventAccepted: true, sourceAuthority: 'CANONICAL_LOCAL' }), true);
accountKey = 'account-b';
assert.equal(manager.show(allowed), true, 'account fence must reset transient dedupe');
assert.equal(manager.getState().accountKey, 'account-b');
assert.equal(manager.identityOf({ dedupeKey: 'dedupe', eventId: 'event', id: 'id' }), 'dedupe');
assert.equal(manager.identityOf({ eventId: 'event', id: 'id' }), 'event');
assert.equal(manager.identityOf({ id: 'id' }), 'id');
for (const forbidden of ['localStorage', 'notificationCenter', 'syncBadges', 'repositories.']) assert.equal(source.includes(forbidden), false, `toast authority must not own ${forbidden}`);
if (previous.window === undefined) delete global.window; else global.window = previous.window;
if (previous.document === undefined) delete global.document; else global.document = previous.document;
console.log('[ux-notif-003-toast-manager] ok');
console.log('- canonical toast policy, critical provenance, logical dedupe and account fence validated');
