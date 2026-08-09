const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const eventPath = path.join(rootDir, 'assets/js/core/notification-event.js');
const repositoryPath = path.join(rootDir, 'assets/js/repositories/notifications-repository.js');
const previous = {
  window: global.window,
  Doke: global.Doke,
  document: global.document,
  localStorage: global.localStorage,
  CustomEvent: global.CustomEvent,
  location: global.location,
  fetch: global.fetch
};

const storage = new Map();
const listeners = new Map();

global.window = global;
global.Doke = {
  session: {
    getCurrentUser() {
      return { id: 'user-1', role: 'client' };
    }
  }
};
global.localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); }
};
global.document = {
  readyState: 'loading',
  visibilityState: 'visible',
  documentElement: { setAttribute() {} },
  addEventListener(type, listener) { listeners.set(type, listener); },
  dispatchEvent() { return true; }
};
global.CustomEvent = function CustomEvent(type, init) {
  this.type = type;
  this.detail = init && init.detail;
};
global.location = { search: '' };
global.fetch = async function () {
  throw new Error('Unexpected fetch in repository adapter contract test.');
};

delete require.cache[require.resolve(eventPath)];
delete require.cache[require.resolve(repositoryPath)];

try {
  require(eventPath);
  require(repositoryPath);

  const repository = global.Doke.repositories && global.Doke.repositories.notifications;
  assert.ok(repository, 'notifications repository must be published');
  assert.equal(global.Doke.notificationEvent.contract, 'notification-event-v1');

  const message = repository.normalize({
    id: 'notif-message-1',
    type: 'message_received',
    category: 'messages',
    userId: 'user-1',
    messageId: 'message-1',
    eventKey: 'message_received:message-1:user-1',
    syncStatus: 'synced',
    title: 'Nova mensagem'
  });
  assert.equal(message.eventAccepted, true);
  assert.equal(message.eventCategory, 'MESSAGES');
  assert.equal(message.category, 'messages');
  assert.equal(message.eventType, 'message_received');
  assert.equal(message.sourceAuthority, 'CANONICAL_REMOTE');
  assert.equal(message.dedupeKey, 'message_received:message-1:user-1');
  assert.equal(message.eventKey, message.dedupeKey);
  assert.equal(message.eventIdentitySource, 'explicit-dedupe');

  const eventIdWins = repository.normalize({
    id: 'notif-event-id',
    eventId: 'evt-order-1',
    type: 'order_created',
    category: 'orders',
    eventKey: 'legacy-order-key',
    orderId: 'order-1',
    syncStatus: 'local'
  });
  assert.equal(eventIdWins.eventAccepted, true);
  assert.equal(eventIdWins.eventCategory, 'ORDERS');
  assert.equal(eventIdWins.sourceAuthority, 'CANONICAL_LOCAL');
  assert.equal(eventIdWins.dedupeKey, 'evt-order-1');
  assert.equal(eventIdWins.eventKey, 'evt-order-1');
  assert.equal(eventIdWins.eventIdentitySource, 'eventId');

  const paymentRemote = repository.normalize({
    id: 'notif-payment-remote',
    type: 'payment_held',
    category: 'payments',
    eventKey: 'payment_held:pay-1:user-1',
    paymentId: 'pay-1',
    syncStatus: 'synced'
  });
  assert.equal(paymentRemote.eventAccepted, true);
  assert.equal(paymentRemote.eventCategory, 'PAYMENTS');
  assert.equal(paymentRemote.criticalOperational, true);
  assert.equal(paymentRemote.sourceAuthority, 'CANONICAL_REMOTE');

  const paymentLocal = repository.normalize({
    id: 'notif-payment-local',
    type: 'payment_held',
    category: 'payments',
    eventKey: 'payment_held:pay-2:user-1',
    paymentId: 'pay-2',
    syncStatus: 'local'
  });
  assert.equal(paymentLocal.eventAccepted, true);
  assert.equal(paymentLocal.sourceAuthority, 'CANONICAL_LOCAL');

  const unknown = repository.normalize({
    id: 'notif-unknown',
    type: 'fulfillment_changed',
    category: 'ads',
    eventKey: 'fulfillment:1',
    syncStatus: 'local'
  });
  assert.equal(unknown.eventAccepted, false);
  assert.equal(unknown.eventCategory, 'UNKNOWN_OPERATIONAL');
  assert.equal(unknown.eventRejectionReason, 'unknown-operational-category');
  assert.equal(unknown.category, 'ads', 'legacy UI category is preserved during adapter migration');
  assert.notEqual(unknown.eventCategory, 'SOCIAL');

  const sensitive = repository.normalize({
    id: 'notif-sensitive',
    type: 'security_session_revoked',
    category: 'security',
    eventKey: 'security:session-1',
    syncStatus: 'synced',
    privacyLevel: 'SENSITIVE_NO_OS_PREVIEW'
  });
  assert.equal(sensitive.eventAccepted, true);
  assert.equal(sensitive.eventCategory, 'SECURITY');
  assert.equal(sensitive.channelPolicy.browser, 'forbidden');

  const repositorySource = fs.readFileSync(repositoryPath, 'utf8');
  assert.equal(repositorySource.includes('function getCategory(type)'), false, 'repository must not own category heuristics');
  assert.equal(repositorySource.includes('function getEventKey(raw)'), false, 'repository must not own event-key heuristics');
  assert.match(repositorySource, /notification-event-v1/);
  assert.match(repositorySource, /eventAccepted/);
  assert.match(repositorySource, /eventCategory/);

  const consumerPages = fs.readdirSync(rootDir)
    .filter((name) => name.endsWith('.html'))
    .filter((name) => fs.readFileSync(path.join(rootDir, name), 'utf8').includes('assets/js/repositories/notifications-repository.js'));
  assert.ok(consumerPages.length >= 10, 'expected the active notification repository consumer set');
  consumerPages.forEach((name) => {
    const html = fs.readFileSync(path.join(rootDir, name), 'utf8');
    const eventIndex = html.indexOf('assets/js/core/notification-event.js');
    const repositoryIndex = html.indexOf('assets/js/repositories/notifications-repository.js');
    assert.ok(eventIndex >= 0, `${name} must load notification-event.js`);
    assert.ok(eventIndex < repositoryIndex, `${name} must load notification-event.js before notifications-repository.js`);
  });

  console.log('[ux-notif-002-repository-adapter] ok');
  console.log(`- canonical event metadata, fail-closed classification and script order validated across ${consumerPages.length} repository consumers`);
} finally {
  delete require.cache[require.resolve(eventPath)];
  delete require.cache[require.resolve(repositoryPath)];
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete global[key];
    else global[key] = value;
  }
}
