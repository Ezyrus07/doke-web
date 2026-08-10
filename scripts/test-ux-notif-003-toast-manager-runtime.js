const assert = require('node:assert/strict');

const previous = {
  window: global.window,
  document: global.document,
  CustomEvent: global.CustomEvent
};

const timers = [];

class FakeNode {
  constructor(tagName) {
    this.tagName = String(tagName || '').toUpperCase();
    this.dataset = {};
    this.children = [];
    this.listeners = new Map();
    this.parentNode = null;
    this.ownerArticle = null;
    this.isConnected = false;
    this.removed = false;
    this.disabled = false;
    this.focused = false;
    this.value = '';
    this.textContent = '';
    this.className = '';
    this.tabIndex = -1;
    this.attributes = new Map();
    this.classes = new Set();
    this.classList = { add: (name) => this.classes.add(name) };
    this.closeButton = null;
    this.actionButtons = [];
    this.statusNode = null;
    this.replyForm = null;
    this.inputNode = null;
    this.sendNode = null;
    this.cancelNode = null;
    this._innerHTML = '';
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (this.tagName === 'ARTICLE') {
      this.closeButton = new FakeNode('button');
      this.statusNode = new FakeNode('small');
      this.statusNode.ownerArticle = this;
      this.statusNode.parentNode = this;
      this.actionButtons = [...this._innerHTML.matchAll(/data-toast-action="(\d+)"/g)].map((match) => {
        const button = new FakeNode('button');
        button.dataset.toastAction = match[1];
        return button;
      });
      return;
    }
    if (this.tagName === 'FORM') {
      this.inputNode = new FakeNode('input');
      this.sendNode = new FakeNode('button');
      this.cancelNode = new FakeNode('button');
      this.inputNode.parentNode = this;
      this.sendNode.parentNode = this;
      this.cancelNode.parentNode = this;
    }
  }

  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  querySelector(selector) {
    if (this.tagName === 'ARTICLE') {
      if (selector === '.doke-live-toast__close') return this.closeButton;
      if (selector === '[data-toast-action-status]') return this.statusNode;
      if (selector === '[data-toast-reply-form]') return this.replyForm;
    }
    if (this.tagName === 'FORM') {
      if (selector === '[data-toast-reply-input]') return this.inputNode;
      if (selector === '[data-toast-reply-send]') return this.sendNode;
      if (selector === '[data-toast-reply-cancel]') return this.cancelNode;
    }
    return null;
  }
  querySelectorAll(selector) { return selector === '[data-toast-action]' ? this.actionButtons : []; }
  appendChild(node) { node.parentNode = this; node.isConnected = true; this.children.push(node); return node; }
  prepend(node) { node.parentNode = this; node.isConnected = true; this.children.unshift(node); return node; }
  before(node) {
    if (!this.ownerArticle) return;
    node.parentNode = this.ownerArticle;
    node.isConnected = true;
    this.ownerArticle.replyForm = node;
  }
  focus() { this.focused = true; }
  get lastElementChild() { return this.children[this.children.length - 1] || null; }
  remove() {
    this.removed = true;
    this.isConnected = false;
    if (this.parentNode?.replyForm === this) this.parentNode.replyForm = null;
    if (this.parentNode?.children) this.parentNode.children = this.parentNode.children.filter((item) => item !== this);
  }
  fire(type, event = {}) {
    const listener = this.listeners.get(type);
    return listener ? listener(event) : undefined;
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
  createElement(tagName) { return new FakeNode(tagName); }
};

delete require.cache[require.resolve('../assets/js/core/notification-toast.js')];
require('../assets/js/core/notification-toast.js');
const manager = global.window.Doke.notificationToast;
assert.ok(manager);
assert.equal(manager.version, '20260809-ux-notif-003-v1');

let accountKey = 'runtime-a';
let opened = 0;
let sounds = 0;
let digest = 0;
let renderErrors = 0;

manager.configure({
  getAccountKey: () => accountKey,
  isForCurrentUser: () => true,
  shouldToast: () => true,
  isDndActive: () => false,
  priorityOf: (payload) => payload.priority || 'normal',
  iconFor: () => '<!>',
  onOpen: () => { opened += 1; },
  onPlaySound: () => { sounds += 1; },
  queueDigest: () => { digest += 1; },
  onRenderError: (diagnostic) => {
    renderErrors += 1;
    assert.equal(diagnostic.name, 'Error');
    assert.equal(diagnostic.message, 'renderer failure');
  }
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

const quickReply = (suffix) => ({
  actionId: `reply-${suffix}`,
  action: 'quick-reply',
  commandType: 'MESSAGE_REPLY',
  entityId: 'conversation-42',
  expectedState: 'message-created',
  expiresAt: '2026-08-10T21:30:00-03:00',
  idempotencyKey: `notif-action:${suffix}`,
  permissionRequirement: 'conversation:reply',
  confirmationPolicy: 'INLINE_REPLY',
  label: 'Responder'
});

function installActionAuthority({ lifecycle = 'AVAILABLE', execute, includeExecute = true, action = quickReply('default') } = {}) {
  const authority = {
    resolveActions: () => [action],
    getState: () => lifecycle
  };
  if (includeExecute) authority.execute = execute || (async () => ({ state: 'SUCCEEDED' }));
  global.window.Doke.notificationAction = authority;
  return authority;
}

async function main() {
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

  assert.equal(manager.show(payload('legacy-action', { actions: [{ label: 'Evento', eventName: 'doke:runtime-event' }] })), true);
  assert.equal(manager.getRecord('runtime-legacy-action').toast.actionButtons.length, 0, 'runtime toast must fail closed when H09 action authority is unavailable');

  installActionAuthority();
  assert.equal(manager.show(payload('authorized-action')), true);
  assert.equal(manager.getRecord('runtime-authorized-action').toast.actionButtons.length, 1, 'runtime toast may render only actions returned by H09 authority');
  delete global.window.Doke.notificationAction;

  for (const lifecycle of ['EXPIRED', 'PENDING', 'UNKNOWN_OUTCOME', 'SUCCEEDED']) {
    installActionAuthority({ lifecycle, action: quickReply(`initial-${lifecycle}`) });
    const suffix = `action-state-${lifecycle.toLowerCase()}`;
    assert.equal(manager.show(payload(suffix)), true);
    const record = manager.getRecord(`runtime-${suffix}`);
    record.toast.actionButtons[0].fire('click', { stopPropagation() {} });
    assert.equal(record.toast.actionButtons[0].disabled, true);
    if (lifecycle === 'EXPIRED') {
      assert.equal(record.toast.actionButtons[0].textContent, 'Expirada');
      assert.match(record.toast.statusNode.textContent, /expirou/i);
    } else if (lifecycle === 'PENDING') {
      assert.match(record.toast.statusNode.textContent, /processamento/i);
    } else if (lifecycle === 'UNKNOWN_OUTCOME') {
      assert.match(record.toast.statusNode.textContent, /não confirmado/i);
    } else {
      assert.match(record.toast.statusNode.textContent, /confirmada/i);
    }
  }

  installActionAuthority({ includeExecute: false, action: quickReply('no-execute') });
  assert.equal(manager.show(payload('action-no-execute')), true);
  const noExecuteRecord = manager.getRecord('runtime-action-no-execute');
  noExecuteRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  assert.equal(noExecuteRecord.toast.replyForm, null);

  let executeCalls = 0;
  installActionAuthority({
    action: quickReply('empty'),
    execute: async () => { executeCalls += 1; return { state: 'SUCCEEDED' }; }
  });
  assert.equal(manager.show(payload('action-empty')), true);
  const emptyRecord = manager.getRecord('runtime-action-empty');
  emptyRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  assert.ok(emptyRecord.toast.replyForm);
  assert.equal(emptyRecord.toast.replyForm.inputNode.focused, true);
  await emptyRecord.toast.replyForm.fire('submit', { preventDefault() {}, stopPropagation() {} });
  assert.equal(executeCalls, 0);
  assert.match(emptyRecord.toast.statusNode.textContent, /Digite uma resposta/i);

  installActionAuthority({ action: quickReply('cancel') });
  assert.equal(manager.show(payload('action-cancel')), true);
  const cancelRecord = manager.getRecord('runtime-action-cancel');
  cancelRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  const cancelForm = cancelRecord.toast.replyForm;
  cancelForm.cancelNode.fire('click', { stopPropagation() {} });
  assert.equal(cancelRecord.toast.replyForm, null);
  assert.equal(cancelRecord.toast.actionButtons[0].disabled, false);

  installActionAuthority({
    action: quickReply('failed'),
    execute: async () => ({ state: 'FAILED', error: { message: 'Falha de domínio.' } })
  });
  assert.equal(manager.show(payload('action-failed')), true);
  const failedRecord = manager.getRecord('runtime-action-failed');
  failedRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  const failedForm = failedRecord.toast.replyForm;
  failedForm.inputNode.value = 'Tentar enviar';
  await failedForm.fire('submit', { preventDefault() {}, stopPropagation() {} });
  assert.equal(failedRecord.toast.replyForm, failedForm);
  assert.equal(failedRecord.toast.actionButtons[0].disabled, false);
  assert.equal(failedForm.inputNode.disabled, false);
  assert.equal(failedForm.sendNode.disabled, false);
  assert.equal(failedForm.inputNode.focused, true);
  assert.equal(failedRecord.toast.statusNode.textContent, 'Falha de domínio.');

  installActionAuthority({
    action: quickReply('unknown'),
    execute: async () => ({ state: 'UNKNOWN_OUTCOME' })
  });
  assert.equal(manager.show(payload('action-unknown')), true);
  const unknownRecord = manager.getRecord('runtime-action-unknown');
  unknownRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  const unknownForm = unknownRecord.toast.replyForm;
  unknownForm.inputNode.value = 'Resultado incerto';
  await unknownForm.fire('submit', { preventDefault() {}, stopPropagation() {} });
  assert.equal(unknownRecord.toast.actionButtons[0].disabled, true);
  assert.match(unknownRecord.toast.statusNode.textContent, /não confirmado/i);

  installActionAuthority({
    action: quickReply('success'),
    execute: async () => ({ state: 'SUCCEEDED' })
  });
  assert.equal(manager.show(payload('action-success')), true);
  const successRecord = manager.getRecord('runtime-action-success');
  successRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  const successForm = successRecord.toast.replyForm;
  successForm.inputNode.value = 'Confirmada';
  await successForm.fire('submit', { preventDefault() {}, stopPropagation() {} });
  assert.equal(successRecord.toast.replyForm, null);
  assert.match(successRecord.toast.statusNode.textContent, /confirmada/i);

  installActionAuthority({
    action: { ...quickReply('other'), action: 'other-action' }
  });
  assert.equal(manager.show(payload('action-other')), true);
  const otherRecord = manager.getRecord('runtime-action-other');
  otherRecord.toast.actionButtons[0].fire('click', { stopPropagation() {} });
  assert.equal(otherRecord.toast.replyForm, null);
  delete global.window.Doke.notificationAction;

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

  let queuedByDecision = 0;
  manager.configure({
    getDeliveryDecision: () => ({ outcome: 'QUEUE_DIGEST' }),
    onQueueDigest: () => { queuedByDecision += 1; }
  });
  assert.equal(manager.show(payload('decision-queue')), false);
  assert.equal(queuedByDecision, 1);
  assert.equal(manager.show(payload('decision-skip'), { skipDelivery: true }), true);
  manager.configure({ getDeliveryDecision: () => ({ outcome: 'ALLOW_TOAST' }) });
  assert.equal(manager.show(payload('decision-allow')), true);
  manager.configure({ getDeliveryDecision: () => ({ outcome: 'BLOCK' }) });
  assert.equal(manager.show(payload('decision-block')), false);
  manager.configure({ getDeliveryDecision: null });

  manager.configure({ renderToast: () => false });
  assert.equal(manager.show(payload('renderer-false')), false);
  manager.configure({ renderToast: () => { throw new Error('renderer failure'); } });
  assert.equal(manager.show(payload('renderer-error')), false);
  assert.equal(renderErrors, 1);
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
  console.log('- real module path covers policy, DOM renderer, full H09 inline-reply lifecycle, delivery decisions, overflow, dedupe, DND, account fence and renderer failure paths');
}

main().catch((error) => {
  if (previous.window === undefined) delete global.window; else global.window = previous.window;
  if (previous.document === undefined) delete global.document; else global.document = previous.document;
  if (previous.CustomEvent === undefined) delete global.CustomEvent; else global.CustomEvent = previous.CustomEvent;
  console.error(error);
  process.exitCode = 1;
});
