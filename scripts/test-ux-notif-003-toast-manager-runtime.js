const assert = require('node:assert/strict');

const previous = {
  window: global.window,
  document: global.document,
  CustomEvent: global.CustomEvent
};

const timers = [];
const dispatched = [];

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
    if (this.tagName !== 'ARTICLE') return;
    this.closeButton = new FakeNode('button');
    this.actionButtons = [...this._innerHTML.matchAll(/data-toast-action="(\d+)"/g)].map((match) => {
      const button = new FakeNode('button');
      button.dataset.toastAction = match[1];
      return button;
    });
  }

  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  querySelector(selector) {
    if (selector === '.doke-live-toast__close') return this.closeButton;
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
global.window = {
  Doke: {},
  location: { href: '' },
  setTimeout(callback) { timers.push(callback); return timers.length; },
  clearTimeout() {}
};
global.document = {
  body,
  createElement(tagName) { return new FakeNode(tagName); },
  dispatchEvent(event) { dispatched.push(event); return true; }
};
global.CustomEvent = class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
};
global.window.CustomEvent = global.CustomEvent;

delete require.cache[require.resolve('../assets/js/core/notification-toast.js')];
require('../assets/js/core/notification-toast.js');
const manager = global.window.Doke.notificationToast;
assert.ok(manager);

let accountKey = 'runtime-a';
let actions = [];
let expired = false;
let muted = 0;
let quick = 0;
let markedRead = 0;
let opened = 0;
let actionResults = 0;
let sounds = 0;
let digest = 0;

manager.configure({
  getAccountKey: () => accountKey,
  isForCurrentUser: () => true,
  shouldToast: () => true,
  isDndActive: () => false,
  priorityOf: (payload) => payload.priority || 'normal',
  iconFor: () => '<!>',
  resolveActions: () => actions,
  scopeOf: () => 'conversation:runtime',
  isActionExpired: () => expired,
  onMuteScope: () => { muted += 1; },
  onQuickAction: () => { quick += 1; },
  onMarkRead: () => { markedRead += 1; },
  onOpen: () => { opened += 1; },
  onRecordActionResult: () => { actionResults += 1; },
  onPlaySound: () => { sounds += 1; },
  queueDigest: () => { digest += 1; }
});

const payload = (suffix, extra = {}) => ({
  id: `runtime-${suffix}`,
  eventId: `runtime-event-${suffix}`,
  dedupeKey: `runtime-event-${suffix}`,
  eventAccepted: true,
  eventCategory: 'MESSAGES',
  sourceAuthority: 'CANONICAL_REMOTE',
  channelPolicy: { toast: 'allowed' },
  title: '<Título & "seguro">',
  body: 'Mensagem <segura>',
  repeatCount: 2,
  duration: 250,
  ...extra
});

assert.equal(manager.policyAllows(payload('policy')), true);
assert.equal(manager.policyAllows({ ...payload('read'), read: true }), false);
assert.equal(manager.policyAllows({ ...payload('dismissed'), dismissed: true }), false);
assert.equal(manager.policyAllows({ ...payload('rejected'), eventAccepted: false }), false);
assert.equal(manager.policyAllows({ ...payload('silent'), channelPolicy: { toast: 'silent' } }), false);
assert.equal(manager.policyAllows({ ...payload('empty-policy'), channelPolicy: {} }), false);
assert.equal(manager.policyAllows({ ...payload('critical'), eventCategory: 'PAYMENTS', eventAccepted: false }), false);
assert.equal(manager.policyAllows({ ...payload('critical-derived'), eventCategory: 'SECURITY', sourceAuthority: 'DERIVED_INFORMATIONAL' }), false);
assert.equal(manager.policyAllows({ ...payload('critical-ok'), eventCategory: 'DISPUTES', sourceAuthority: 'CANONICAL_LOCAL' }), true);
assert.equal(manager.identityOf({ dedupeKey: 'd', eventId: 'e', eventKey: 'k', id: 'i' }), 'd');
assert.equal(manager.identityOf({ eventId: 'e', eventKey: 'k', id: 'i' }), 'e');
assert.equal(manager.identityOf({ eventKey: 'k', id: 'i' }), 'k');
assert.equal(manager.identityOf({ id: 'i' }), 'i');

assert.equal(manager.show(payload('basic', { priority: 'high', targetUrl: 'mensagens.html' })), true);
const basic = manager.getRecord('runtime-basic');
assert.ok(basic?.toast);
assert.ok(basic.toast.innerHTML.includes('&lt;Título &amp; &quot;seguro&quot;&gt;'));
assert.equal(body.children.length, 1);
assert.equal(sounds, 1);
basic.toast.fire('click', { target: { closest: () => null } });
assert.equal(opened, 1);
basic.toast.fire('keydown', { key: 'Enter', target: { matches: () => false }, preventDefault() {} });
assert.equal(opened, 2);

expired = true;
actions = [{ label: 'Expirar', action: 'event-rsvp' }];
assert.equal(manager.show(payload('expired')), true);
const expiredRecord = manager.getRecord('runtime-expired');
expiredRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(expiredRecord.toast.actionButtons[0].disabled, true);
assert.equal(actionResults, 1);
expired = false;

actions = [{ label: 'Silenciar', action: 'mute-scope' }];
assert.equal(manager.show(payload('mute', { scopeLabel: 'Sala' })), true);
manager.getRecord('runtime-mute').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(muted, 1);

actions = [{ label: 'Responder', action: 'quick-reply' }];
assert.equal(manager.show(payload('quick')), true);
manager.getRecord('runtime-quick').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(quick, 1);

actions = [{ label: 'Abrir', url: 'pedidos.html' }];
assert.equal(manager.show(payload('url')), true);
manager.getRecord('runtime-url').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(markedRead, 1);
assert.equal(global.window.location.href, 'pedidos.html');

actions = [{ label: 'Evento', eventName: 'doke:runtime-event' }];
assert.equal(manager.show(payload('event')), true);
manager.getRecord('runtime-event').toast.actionButtons[0].fire('click', { stopPropagation() {} });
assert.equal(dispatched.some((event) => event.type === 'doke:runtime-event'), true);

actions = [];
assert.equal(manager.show(payload('escape')), true);
manager.getRecord('runtime-escape').toast.fire('keydown', { key: 'Escape', target: { matches: () => false }, preventDefault() {} });
assert.equal(manager.getRecord('runtime-escape'), null);
assert.equal(manager.show(payload('close')), true);
const closeRecord = manager.getRecord('runtime-close');
closeRecord.toast.closeButton.fire('click', { stopPropagation() {} });
assert.equal(manager.getRecord('runtime-close'), null);

manager.configure({ shouldToast: () => false });
assert.equal(manager.show(payload('preference')), false);
manager.configure({ shouldToast: () => true, isDndActive: () => true });
assert.equal(manager.show(payload('dnd')), false);
assert.equal(digest, 1);
assert.equal(manager.show(payload('dnd-skip'), { skipDigest: true }), true);
manager.configure({ isDndActive: () => false, isForCurrentUser: () => false });
assert.equal(manager.show(payload('foreign')), false);
manager.configure({ isForCurrentUser: () => true });
assert.equal(manager.show({ eventAccepted: true, eventCategory: 'MESSAGES', channelPolicy: { toast: 'allowed' } }), false);

assert.equal(manager.show(payload('duplicate')), true);
assert.equal(manager.show(payload('duplicate')), false);
assert.equal(manager.show(payload('duplicate'), { force: true }), true);

for (let index = 0; index < 6; index += 1) assert.equal(manager.show(payload(`stack-${index}`)), true);
assert.ok(body.children[0].children.length <= 4);

accountKey = 'runtime-b';
assert.equal(manager.show(payload('account-fence')), true);
assert.equal(manager.getState().accountKey, 'runtime-b');

manager.configure({ renderToast: () => false });
assert.equal(manager.show(payload('renderer-false')), false);
manager.configure({ renderToast: () => { throw new Error('renderer failure'); } });
assert.equal(manager.show(payload('renderer-error')), false);
manager.configure({ renderToast: () => ({}) });
assert.equal(manager.show(payload('renderer-record')), true);
assert.ok(manager.getRecord('runtime-event-renderer-record'));

manager.reset('runtime-final');
assert.equal(manager.getState().activeCount, 0);
assert.equal(manager.getState().seenCount, 0);
for (const callback of timers.splice(0)) callback();

if (previous.window === undefined) delete global.window; else global.window = previous.window;
if (previous.document === undefined) delete global.document; else global.document = previous.document;
if (previous.CustomEvent === undefined) delete global.CustomEvent; else global.CustomEvent = previous.CustomEvent;

console.log('[ux-notif-003-toast-manager-runtime] ok');
console.log('- real module path covers policy, DOM renderer, action lifecycle, overflow, dedupe, DND, account fence and renderer failure paths');
