const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const continuitySource = fs.readFileSync(path.join(root, 'assets/js/core/continuity-experience.js'), 'utf8');
const newsSource = fs.readFileSync(path.join(root, 'assets/js/pages/news-experience.js'), 'utf8');

class EventHub {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
  }
  removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
  dispatchEvent(event) {
    event.target = event.target || this;
    [...(this.listeners.get(event.type) || [])].forEach((listener) => listener(event));
    return true;
  }
}

class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

const documentHub = new EventHub();
const windowHub = new EventHub();
let currentUser = { id: 'user-a' };

const document = Object.assign(documentHub, {
  body: { dataset: {} },
  documentElement: { dataset: {} }
});

const windowObject = Object.assign(windowHub, {
  Doke: { session: { getCurrentUser: () => currentUser } },
  location: {
    href: 'https://doke.test/novidades.html',
    pathname: '/novidades.html',
    search: ''
  },
  crypto: {
    randomUUID: (() => {
      let sequence = 0;
      return () => `uuid-${++sequence}`;
    })()
  },
  setTimeout,
  clearTimeout
});

const context = vm.createContext({
  window: windowObject,
  document,
  console,
  Date,
  Math,
  Map,
  Set,
  Promise,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  TypeError,
  URL,
  AbortController,
  CustomEvent,
  setTimeout,
  clearTimeout
});

vm.runInContext(continuitySource, context, { filename: 'continuity-experience.js' });

const api = windowObject.Doke.continuityExperience;
assert.ok(api, 'continuity authority should be published');
assert.strictEqual(api.version, '20260804-ux-cont-001-v1');
assert.ok(Object.isFrozen(api));
assert.ok(Object.isFrozen(api.reasons));

const first = api.beginRequest({
  lane: 'news.preference.save',
  revisionKey: 'news.preference',
  revision: api.setRevision('news.preference', '1'),
  entityKey: 'preference/news-view'
});
assert.strictEqual(first.validate().current, true);

const second = api.beginRequest({
  lane: 'news.preference.save',
  revisionKey: 'news.preference',
  revision: '1',
  entityKey: 'preference/news-view'
});
assert.strictEqual(first.signal.aborted, true, 'new request should abort previous lane request');
assert.strictEqual(first.validate().current, false);
assert.ok([api.reasons.REQUEST_SUPERSEDED, api.reasons.ABORTED].includes(first.validate().reason));
assert.strictEqual(second.validate().current, true);

document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-route', {
  detail: { snapshot: { route: { id: 7, to: '/resultados.html' } } }
}));
assert.strictEqual(second.signal.aborted, true, 'route rotation should abort route-scoped request');
assert.strictEqual(second.validate().reason, api.reasons.ROUTE_CHANGED);

const routeFence = api.beginRequest({ lane: 'route-same-id' });
document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-route', {
  detail: { snapshot: { route: { id: 7, to: '/resultados.html', state: 'ready' } } }
}));
assert.strictEqual(routeFence.validate().current, true, 'same route id must not rotate twice');

currentUser = { id: 'user-b' };
document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
  detail: { user: currentUser, authenticated: true }
}));
assert.strictEqual(routeFence.signal.aborted, true);
assert.strictEqual(routeFence.validate().reason, api.reasons.ACCOUNT_CHANGED);

api.setRevision('entity:one', '3');
const revisionFence = api.beginRequest({
  lane: 'revision-lane',
  revisionKey: 'entity:one',
  revision: '3'
});
api.bumpRevision('entity:one');
assert.strictEqual(revisionFence.validate().reason, api.reasons.REVISION_CHANGED);

let staleCallbackRan = false;
const staleCommit = revisionFence.commit(() => { staleCallbackRan = true; });
assert.strictEqual(staleCommit.applied, false);
assert.strictEqual(staleCallbackRan, false);

const currentFence = api.beginRequest({ lane: 'current-lane', route: false });
let currentCallbackRan = false;
const currentCommit = currentFence.commit(() => {
  currentCallbackRan = true;
  return 'committed';
});
assert.strictEqual(currentCommit.applied, true);
assert.strictEqual(currentCommit.value, 'committed');
assert.strictEqual(currentCallbackRan, true);

const snapshotText = JSON.stringify(api.getSnapshot());
assert.ok(!snapshotText.includes('user-a'));
assert.ok(!snapshotText.includes('user-b'));
assert.ok(snapshotText.includes('acct1:'));

const events = [];
document.addEventListener('doke:continuity-commit-rejected', (event) => events.push(event.detail));
revisionFence.commit(() => {});
assert.strictEqual(events.length, 1);
const eventText = JSON.stringify(events[0]);
assert.ok(!eventText.includes('preference/news-view'));
assert.ok(!eventText.includes('user-b'));

assert.ok(newsSource.includes('CONTINUITY_SRC'));
assert.ok(newsSource.includes('ensureContinuity'));
assert.ok(newsSource.includes("lane: 'news.preference.save'"));
assert.ok(newsSource.includes('resolvePreferenceStorage'));
assert.ok(newsSource.includes('requestHandle?.assertCurrent()'));
assert.ok(newsSource.includes('requestHandle.commit(applyOutcome)'));
assert.ok(newsSource.includes("lane: 'news.online-refresh'"));

console.log('UX-CONT-001 generation fence contract passed.');
