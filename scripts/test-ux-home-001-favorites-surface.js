'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

class FakeCustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail || {};
    this.bubbles = Boolean(options.bubbles);
  }
}

function dataKey(attribute) {
  return attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.dataset = {};
    this.children = [];
    this.hidden = false;
    this.isConnected = true;
    this.parentNode = null;
    this.attributes = new Map();
    this.listeners = new Map();
    this.className = '';
    this.disabled = false;
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value || '');
    if (this._textContent === '') this.children = [];
  }

  get textContent() {
    return this._textContent;
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.get(String(name)) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(String(name));
  }

  appendChild(node) {
    node.parentNode = this;
    node.isConnected = this.isConnected;
    this.children.push(node);
    return node;
  }

  insertBefore(node) {
    return this.appendChild(node);
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatchEvent(event) {
    eventLog.push({ target: this, type: event.type, detail: event.detail || {} });
    (this.listeners.get(event.type) || []).forEach((listener) => listener.call(this, event));
    return true;
  }

  querySelector(selector) {
    const match = /^\[data-([a-z0-9-]+)\]$/.exec(selector);
    if (!match) return null;
    const key = dataKey('data-' + match[1]);
    const queue = this.children.slice();
    while (queue.length) {
      const node = queue.shift();
      if (Object.prototype.hasOwnProperty.call(node.dataset, key)) return node;
      queue.push(...node.children);
    }
    return null;
  }
}

function createSection() {
  const section = new FakeElement('section');
  section.dataset.homeFavoritesSurface = '';
  section.dataset.homeListRegion = 'favorites';
  section.hidden = true;

  const grid = new FakeElement('div');
  grid.dataset.homeFavoritesGrid = '';
  section.appendChild(grid);

  const count = new FakeElement('span');
  count.dataset.homeFavoritesCount = '';
  count.textContent = '0';
  section.appendChild(count);

  return { section, grid, count };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const eventLog = [];
const documentListeners = new Map();
const windowListeners = new Map();
let currentSurface = createSection();
let currentUser = null;
let catalogLoader = () => Promise.resolve([]);
let favoritesLoader = () => Promise.resolve(new Set());
let syncAllCalls = 0;

const documentStub = {
  readyState: 'loading',
  body: { dataset: { pageKey: 'index', page: 'home' } },
  documentElement: new FakeElement('html'),
  querySelector(selector) {
    if (selector === '[data-home-favorites-surface]') return currentSurface.section;
    if (selector === '[data-state-boundary="index"]') return null;
    return null;
  },
  createElement(tagName) {
    return new FakeElement(tagName);
  },
  addEventListener(type, listener) {
    if (!documentListeners.has(type)) documentListeners.set(type, []);
    documentListeners.get(type).push(listener);
  },
  dispatchEvent(event) {
    eventLog.push({ target: this, type: event.type, detail: event.detail || {} });
    (documentListeners.get(event.type) || []).forEach((listener) => listener.call(this, event));
    return true;
  }
};

const windowStub = {
  Doke: {},
  location: { pathname: '/index.html' },
  navigator: { onLine: true },
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  }
};

windowStub.Doke.session = {
  getCurrentUser() {
    return currentUser;
  }
};
windowStub.Doke.listState = {
  setListState(region, state) {
    region.dataset.listState = state;
  }
};
windowStub.Doke.services = {
  services: {
    list(options) {
      return catalogLoader(options || {});
    }
  }
};
windowStub.Doke.serviceFavoritesController = {
  ensureLoaded(options) {
    return favoritesLoader(options || {});
  },
  getSnapshot() {
    return new Set();
  },
  syncAll() {
    syncAllCalls += 1;
    return new Set();
  }
};
windowStub.Doke.publicServiceCard = {
  create(item) {
    const node = new FakeElement('article');
    node.dataset.serviceId = String(item.id || item.serviceId || '');
    return node;
  }
};

Object.assign(global, {
  window: windowStub,
  document: documentStub,
  CustomEvent: FakeCustomEvent
});

require(path.resolve(__dirname, '../assets/js/pages/home/rail-state.js'));
require(path.resolve(__dirname, '../assets/js/pages/home/favorites-surface.js'));

const surface = windowStub.Doke.homeFavoritesSurface;
assert.ok(surface && typeof surface.render === 'function', 'Favorites surface must expose render().');

function switchSurface() {
  currentSurface.section.isConnected = false;
  currentSurface = createSection();
  return currentSurface;
}

function latestEvent(type) {
  const matches = eventLog.filter((entry) => entry.type === type);
  return matches[matches.length - 1] || null;
}

function assertSafeDetail(detail) {
  const forbiddenKeys = ['favoriteIds', 'items', 'message', 'error', 'user', 'accountKey', 'serviceId', 'identity'];
  forbiddenKeys.forEach((key) => {
    assert.equal(Object.prototype.hasOwnProperty.call(detail || {}, key), false, `Event detail must not expose ${key}.`);
  });
}

async function run() {
  // Anonymous users: hidden by explicit product state, never represented as empty.
  currentUser = null;
  switchSurface();
  await surface.render({ force: true });
  assert.equal(currentSurface.section.hidden, true);
  assert.equal(currentSurface.section.dataset.homeRailVisibilityState, 'hidden-anonymous');
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'idle');
  assertSafeDetail(latestEvent('doke:home-favorites-rendered').detail);

  // Authenticated accepted zero: legitimate empty, distinct from technical failure.
  currentUser = { id: 'acct-empty' };
  switchSurface();
  favoritesLoader = () => Promise.resolve(new Set());
  catalogLoader = () => Promise.resolve([]);
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'empty');
  assert.equal(currentSurface.section.dataset.homeRailVisibilityState, 'hidden-insufficient-items');
  assert.equal(currentSurface.section.dataset.homeRailErrorCode, undefined);
  assert.equal(currentSurface.section.hidden, true);

  // Ready state: count comes from matched active services and preview is rendered canonically.
  currentUser = { id: 'acct-ready' };
  switchSurface();
  favoritesLoader = () => Promise.resolve(new Set(['svc-1', 'svc-2']));
  catalogLoader = () => Promise.resolve([
    { id: 'svc-1', status: 'active' },
    { id: 'svc-2', status: 'active' },
    { id: 'svc-3', status: 'active' }
  ]);
  const readyCount = await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  assert.equal(readyCount, 2);
  assert.equal(currentSurface.section.hidden, false);
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'ready');
  assert.equal(currentSurface.section.dataset.homeRailFreshnessState, 'fresh');
  assert.equal(currentSurface.section.dataset.itemCount, '2');
  assert.equal(currentSurface.grid.children.length, 2);
  assert.equal(currentSurface.count.textContent, '2');
  assert.ok(syncAllCalls > 0, 'Rendered cards must be resynchronized through the canonical favorites controller.');
  assertSafeDetail(latestEvent('doke:home-favorites-rendered').detail);

  // Ledger failure: localized error and explicit ledger code, not empty.
  currentUser = { id: 'acct-ledger-failure' };
  switchSurface();
  favoritesLoader = () => Promise.reject(Object.assign(new Error('private ledger detail'), { code: 'PRIVATE_LEDGER_FAILURE' }));
  catalogLoader = () => Promise.resolve([{ id: 'svc-1', status: 'active' }]);
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  assert.equal(currentSurface.section.hidden, false);
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'error');
  assert.equal(currentSurface.section.dataset.homeRailErrorCode, 'DOKE_HOME_FAVORITES_LEDGER_FAILED');
  const ledgerFeedback = currentSurface.section.querySelector('[data-home-favorites-feedback]');
  assert.ok(ledgerFeedback && ledgerFeedback.hidden === false, 'Ledger failure must expose localized recovery.');
  assert.ok(ledgerFeedback.querySelector('[data-home-favorites-retry]')?.listeners.get('click')?.length, 'Localized retry must be actionable.');
  const ledgerEvent = latestEvent('doke:home-favorites-error');
  assertSafeDetail(ledgerEvent.detail);
  assert.equal(JSON.stringify(ledgerEvent.detail).includes('private ledger detail'), false);

  // Catalog failure has a distinct public error code.
  currentUser = { id: 'acct-catalog-failure' };
  switchSurface();
  favoritesLoader = () => Promise.resolve(new Set(['svc-1']));
  catalogLoader = () => Promise.reject(new Error('private catalog detail'));
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'error');
  assert.equal(currentSurface.section.dataset.homeRailErrorCode, 'DOKE_HOME_FAVORITES_CATALOG_FAILED');
  const catalogEvent = latestEvent('doke:home-favorites-error');
  assertSafeDetail(catalogEvent.detail);
  assert.equal(JSON.stringify(catalogEvent.detail).includes('private catalog detail'), false);

  // Same-account refresh preserves accepted cards and degrades to stale on failure.
  currentUser = { id: 'acct-stale' };
  switchSurface();
  favoritesLoader = () => Promise.resolve(new Set(['svc-stale']));
  catalogLoader = () => Promise.resolve([{ id: 'svc-stale', status: 'active' }]);
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  assert.equal(currentSurface.grid.children.length, 1);
  favoritesLoader = () => Promise.reject(new Error('refresh failure'));
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true, retry: true });
  assert.equal(currentSurface.grid.children.length, 1, 'Stale refresh must preserve accepted cards.');
  assert.equal(currentSurface.section.hidden, false);
  assert.equal(currentSurface.section.dataset.homeRailDataState, 'ready');
  assert.equal(currentSurface.section.dataset.homeRailFreshnessState, 'stale');
  assert.equal(currentSurface.section.dataset.homeRailErrorCode, 'DOKE_HOME_FAVORITES_LEDGER_FAILED');

  // Account switch: result from account A cannot overwrite account B.
  const accountA = deferred();
  const accountB = deferred();
  currentUser = { id: 'acct-a' };
  switchSurface();
  favoritesLoader = () => currentUser.id === 'acct-a' ? accountA.promise : accountB.promise;
  catalogLoader = () => Promise.resolve([
    { id: 'svc-a', status: 'active' },
    { id: 'svc-b', status: 'active' }
  ]);
  const renderA = surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  currentUser = { id: 'acct-b' };
  const renderB = surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  accountB.resolve(new Set(['svc-b']));
  await renderB;
  assert.equal(currentSurface.grid.children.length, 1);
  assert.equal(currentSurface.grid.children[0].dataset.serviceId, 'svc-b');
  accountA.resolve(new Set(['svc-a']));
  await renderA;
  assert.equal(currentSurface.grid.children.length, 1);
  assert.equal(currentSurface.grid.children[0].dataset.serviceId, 'svc-b', 'Stale account result must be discarded.');

  // Root replacement: an operation tied to a detached Home boundary cannot commit.
  const oldRequest = deferred();
  currentUser = { id: 'acct-route' };
  const oldSurface = switchSurface();
  favoritesLoader = () => oldRequest.promise;
  catalogLoader = () => Promise.resolve([
    { id: 'svc-old', status: 'active' },
    { id: 'svc-new', status: 'active' }
  ]);
  const oldRender = surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  const replacement = switchSurface();
  favoritesLoader = () => Promise.resolve(new Set(['svc-new']));
  await surface.render({ force: true, forceFavorites: true, forceCatalog: true });
  oldRequest.resolve(new Set(['svc-old']));
  await oldRender;
  assert.equal(replacement.grid.children.length, 1);
  assert.equal(replacement.grid.children[0].dataset.serviceId, 'svc-new');
  assert.equal(oldSurface.section.isConnected, false);

  // Every public Home Favorites event remains sanitized.
  eventLog
    .filter((entry) => entry.type === 'doke:home-favorites-rendered' || entry.type === 'doke:home-favorites-error' || entry.type === 'doke:home-rail-state-change')
    .forEach((entry) => assertSafeDetail(entry.detail));

  console.log('ux-home-001-favorites-surface: ok');
  console.log('- anonymous, empty, ready, ledger/catalog failure, stale refresh, account/root fences, retry and sanitized events validated');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
