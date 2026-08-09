const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/core/notification-toast.js'), 'utf8');
const previous = { window: global.window, document: global.document, CustomEvent: global.CustomEvent };
const timers = [];

global.window = {
  Doke: {},
  setTimeout(callback) { timers.push(callback); return timers.length; },
  clearTimeout() {},
  location: { href: '' }
};
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

const allowed = {
  id: 'n-1',
  eventId: 'evt-1',
  dedupeKey: 'evt-1',
  eventAccepted: true,
  eventCategory: 'MESSAGES',
  sourceAuthority: 'CANONICAL_REMOTE',
  channelPolicy: { toast: 'allowed' }
};
assert.equal(manager.show(allowed), true);
assert.equal(manager.show({ ...allowed, id: 'n-2' }), false, 'same logical event must dedupe');
assert.equal(rendered.length, 1);
assert.equal(manager.show({ ...allowed, id: 'n-read', eventId: 'evt-read', dedupeKey: 'evt-read', read: true }), false);
assert.equal(manager.show({ ...allowed, id: 'n-dismissed', eventId: 'evt-dismissed', dedupeKey: 'evt-dismissed', dismissed: true }), false);
assert.equal(manager.show({ ...allowed, id: 'n-silent', eventId: 'evt-silent', dedupeKey: 'evt-silent', channelPolicy: { toast: 'silent' } }), false);
assert.equal(manager.show({ ...allowed, id: 'n-empty-policy', eventId: 'evt-empty', dedupeKey: 'evt-empty', channelPolicy: {} }), false);
assert.equal(manager.show({ ...allowed, id: 'n-forbidden', eventId: 'evt-forbidden', dedupeKey: 'evt-forbidden', channelPolicy: { toast: 'forbidden' } }), false);
assert.equal(manager.show({ ...allowed, id: 'n-rejected', eventId: 'evt-rejected', dedupeKey: 'evt-rejected', eventAccepted: false }), false);
assert.equal(manager.show({ ...allowed, id: '', eventId: '', dedupeKey: '', eventKey: '' }), false, 'missing identity must fail closed');
manager.configure({ shouldToast: () => false });
assert.equal(manager.show({ ...allowed, id: 'n-pref', eventId: 'evt-pref', dedupeKey: 'evt-pref' }), false);
let digestQueued = 0;
manager.configure({ shouldToast: () => true, isDndActive: () => true, queueDigest: () => { digestQueued += 1; } });
assert.equal(manager.show({ ...allowed, id: 'n-dnd', eventId: 'evt-dnd', dedupeKey: 'evt-dnd' }), false);
assert.equal(digestQueued, 1);
manager.configure({ isDndActive: () => false });

const critical = { id: 'critical-1', eventId: 'critical-evt-1', dedupeKey: 'critical-evt-1', eventCategory: 'PAYMENTS', channelPolicy: { toast: 'allowed' } };
assert.equal(manager.show({ ...critical, sourceAuthority: 'CANONICAL_LOCAL' }), false, 'critical event must be explicitly accepted');
assert.equal(manager.show({ ...critical, eventAccepted: true, sourceAuthority: 'DERIVED_INFORMATIONAL' }), false, 'critical event requires canonical authority');
assert.equal(manager.show({ ...critical, eventAccepted: true, sourceAuthority: 'CANONICAL_LOCAL' }), true);
assert.equal(manager.show({ ...allowed, id: 'foreign', eventId: 'foreign', dedupeKey: 'foreign' }, { force: true }), true);
manager.configure({ isForCurrentUser: () => false });
assert.equal(manager.show({ ...allowed, id: 'foreign-2', eventId: 'foreign-2', dedupeKey: 'foreign-2' }), false);
manager.configure({ isForCurrentUser: () => true });

accountKey = 'account-b';
assert.equal(manager.show(allowed), true, 'account fence must reset transient dedupe');
assert.equal(manager.getState().accountKey, 'account-b');
assert.equal(manager.identityOf({ dedupeKey: 'dedupe', eventId: 'event', id: 'id' }), 'dedupe');
assert.equal(manager.identityOf({ eventId: 'event', id: 'id' }), 'event');
assert.equal(manager.identityOf({ eventKey: 'legacy', id: 'id' }), 'legacy');
assert.equal(manager.identityOf({ id: 'id' }), 'id');

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.parentNode = null;
    this.isConnected = false;
    this.removed = false;
    this.disabled = false;
    this.textContent = '';
    this.className = '';
    this.tabIndex = -1;
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = { add: (name) => this.classes.add(name) };
    this.closeButton = null;
    this.actionButtons = [];
    this._innerHTML = '';
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this.tagName === 'ARTICLE') {
      this.closeButton = new FakeNode('button');
      const matches = [...this._innerHTML.matchAll(/data-toast-action="(\d+)"/g)];
      this.actionButtons = matches.map((match) => {
        const button = new FakeNode('button');
        button.dataset.toastAction = match[1];
        return button;
      });
    }
  }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  querySelector(selector) {
    if (selector === '.doke-live-toast__close') return this.closeButton;
    if (selector === '[data-toast-action-status]') return null;
    return null;
  }
  querySelectorAll(selector) { return selector === '[data-toast-action]' ? this.actionButtons : []; }
  appendChild(node) { node.parentNode = this; node.isConnected = true; this.children.push(node); return node; }
  prepend(node) { node.parentNode = this; node.isConnected = true; this.children.unshift(node); return node; }
  get lastElementChild() { return this.children[this.children.length - 1] || null; }
  remove() {
    this.removed = true;
    this.isConnected = false;
    if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
  }
  fire(type, event = {}) {
    const listener = this.listeners.get(type);
    if (listener) listener(event);
  }
}

const body = new FakeNode('body');
const dispatched = [];
global.document = {
  body,
  createElement(tagName) { return new FakeNode(tagName); },
  dispatchEvent(event) { dispatched.push(event); return true; }
};
class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}
global.CustomEvent = CustomEventStub;
global.window.CustomEvent = CustomEventStub;

let actions = [];
let expired = false;
let muted = 0;
let quick = 0;
let markedRead = 0;
let opened = 0;
let actionResults = 0;
let sounds = 0;
accountKey = 'dom-account';
manager.reset(accountKey);
manager.configure({
  getAccountKey: () => accountKey,
  isForCurrentUser: () => true,
  shouldToast: () => true,
  isDndActive: () => false,
  renderToast: null,
  priorityOf: (payload) => payload.priority || 'normal',
  iconFor: () => '<!>',
  resolveActions: () => actions,
  scopeOf: () => 'conversation:1',
  isActionExpired: () => expired,
  onMuteScope: () => { muted += 1; },
  onQuickAction: () => { quick += 1; },
  onMarkRead: () => { markedRead += 1; },
  onOpen: () => { opened += 1; },
  onRecordActionResult: () => { actionResults += 1; },
  onPlaySound: () => { sounds += 1; }
});

const domPayload = (suffix, extra = {}) => ({
  id: `dom-${suffix}`,
  eventId: `dom-event-${suffix}`,
  dedupeKey: `dom-event-${suffix}`,
  eventAccepted: true,
  eventCategory: 'MESSAGES',
  sourceAuthority: 'CANONICAL_REMOTE',
  channelPolicy: { toast: 'allowed' },
  title: '<Título & "seguro">',
  body: 'Mensagem <segura>',
  repeatCount: 2,
  duration: 500,
  ...extra
});

assert.equal(manager.show(domPayload('basic', { priority: 'high', targetUrl: 'mensagens.html' })), true);
const basic = manager.getRecord('dom-basic');
assert.ok(basic?.toast, 'default renderer must register DOM record');
assert.ok(basic.toast.innerHTML.includes('&lt;Título &amp; &quot;seguro&quot;&gt;'), 'renderer must escape title');
assert.equal(body.children.length, 1, 'toast host must be mounted once');
assert.equal(sounds, 1);
basic.toast.fire('click', { target: { closest: () => null } });
assert.equal(opened, 1);
basic.toast.fire('keydown', { key: 'Enter', target: { matches: () => false }, preventDefault() {} });
assert.equal(opened, 2);

expired = true;
actions = [{ label: 'Expirar', action: 'event-rsvp' }];
assert.equal(manager.show(domPayload('expired')), true);
const expiredRecord = manager.getRecord('dom-expired');
expiredRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(expiredRecord.toast.actionButtons[0].disabled, true);
assert.equal(actionResults, 1);
expired = false;

actions = [{ label: 'Silenciar', action: 'mute-scope' }];
assert.equal(manager.show(domPayload('mute', { scopeLabel: 'Sala' })), true);
manager.getRecord('dom-mute').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(muted, 1);

actions = [{ label: 'Responder', action: 'quick-reply' }];
assert.equal(manager.show(domPayload('quick')), true);
manager.getRecord('dom-quick').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(quick, 1);

actions = [{ label: 'Abrir', url: 'pedidos.html' }];
assert.equal(manager.show(domPayload('url')), true);
manager.getRecord('dom-url').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(markedRead, 1);
assert.equal(global.window.location.href, 'pedidos.html');

actions = [{ label: 'Evento', eventName: 'doke:test-toast-action' }];
assert.equal(manager.show(domPayload('event')), true);
manager.getRecord('dom-event').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(dispatched.some((event) => event.type === 'doke:test-toast-action'), true);

actions = [];
assert.equal(manager.show(domPayload('escape')), true);
const escapeRecord = manager.getRecord('dom-escape');
escapeRecord.toast.fire('keydown', { key: 'Escape', target: { matches: () => false }, preventDefault() {} });
assert.equal(manager.getRecord('dom-escape'), null);

assert.equal(manager.show(domPayload('close')), true);
const closeRecord = manager.getRecord('dom-close');
closeRecord.toast.closeButton.fire('click', { stopPropagation() {} });
assert.equal(manager.getRecord('dom-close'), null);

for (let index = 0; index < 6; index += 1) assert.equal(manager.show(domPayload(`stack-${index}`)), true);
const host = body.children[0];
assert.ok(host.children.length <= 4, 'toast stack must evict overflow beyond four visible records');
manager.reset('after-dom');
assert.equal(manager.getState().activeCount, 0);
assert.equal(manager.getState().seenCount, 0);
for (const callback of timers.splice(0)) callback();

for (const forbidden of ['localStorage', 'notificationCenter', 'syncBadges', 'repositories.']) assert.equal(source.includes(forbidden), false, `toast authority must not own ${forbidden}`);
if (previous.window === undefined) delete global.window; else global.window = previous.window;
if (previous.document === undefined) delete global.document; else global.document = previous.document;
if (previous.CustomEvent === undefined) delete global.CustomEvent; else global.CustomEvent = previous.CustomEvent;

console.log('[ux-notif-003-toast-manager] ok');
console.log('- canonical policy, critical provenance, logical dedupe, account fence and default DOM lifecycle validated');
