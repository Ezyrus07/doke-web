#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const rootDir = path.resolve(__dirname, '..');
const railSource = fs.readFileSync(path.join(rootDir, 'assets/js/pages/home/rail-state.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(rootDir, 'assets/js/pages/index-data-controller.js'), 'utf8');

function createNode(tagName = 'div') {
  const attributes = new Map();
  const listeners = new Map();
  const node = {
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    children: [],
    className: '',
    hidden: false,
    disabled: false,
    isConnected: true,
    parentNode: null,
    textContent: '',
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    removeAttribute(name) { attributes.delete(name); },
    appendChild(child) {
      child.parentNode = node;
      node.children.push(child);
      return child;
    },
    addEventListener(type, handler) { listeners.set(type, handler); },
    querySelector(selector) {
      if (selector === '[data-home-rail-feedback-status]') {
        return node.children.find((child) => Object.hasOwn(child.dataset, 'homeRailFeedbackStatus')) || null;
      }
      if (selector.startsWith('[data-home-rail-feedback="')) {
        const kind = selector.slice(26, -2);
        return node.children.find((child) => child.dataset.homeRailFeedback === kind) || null;
      }
      return null;
    },
    matches(selector) {
      if (selector.includes('[data-list-loading]')) return Object.hasOwn(node.dataset, 'listLoading');
      if (selector.includes('[data-home-rail-feedback]')) return Object.hasOwn(node.dataset, 'homeRailFeedback');
      return false;
    },
    invoke(type) {
      const handler = listeners.get(type);
      if (handler) return handler({ preventDefault() {} });
      return undefined;
    }
  };
  return node;
}

function createRegion(kind, initialCount = 0) {
  const region = createNode('section');
  const list = createNode('div');
  list.dataset.homeList = kind;
  for (let index = 0; index < initialCount; index += 1) list.appendChild(createNode('article'));
  region.list = list;
  const baseQuerySelector = region.querySelector.bind(region);
  region.querySelector = (selector) => {
    if (selector === '[data-list]') return list;
    if (selector === '[data-list-loading]') return null;
    return baseQuerySelector(selector);
  };
  return { region, list };
}

function createHomeRoot({ workers = 0, publications = 0 } = {}) {
  const regions = {
    'featured-services': createRegion('featured-services'),
    'more-services': createRegion('more-services'),
    workers: createRegion('workers', workers),
    publications: createRegion('publications', publications)
  };
  const events = [];
  const root = createNode('main');
  root.events = events;
  root.regions = regions;
  root.querySelector = (selector) => {
    const regionMatch = selector.match(/^\[data-home-list-region="([^"]+)"\]$/);
    if (regionMatch) return regions[regionMatch[1]]?.region || null;
    const listMatch = selector.match(/^\[data-home-list="([^"]+)"\]$/);
    if (listMatch) return regions[listMatch[1]]?.list || null;
    return null;
  };
  root.dispatchEvent = (event) => {
    events.push(event);
    return true;
  };
  return root;
}

function services(count) {
  return Array.from({ length: count }, (_, index) => ({ id: `service-${index + 1}`, status: 'active' }));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createHarness({
  serviceCount = 0,
  workers = 0,
  publications = 0,
  serviceFailure = null,
  orchestrationFailure = null,
  online = true
} = {}) {
  const documentEvents = [];
  const documentListeners = new Map();
  let currentRoot = createHomeRoot({ workers, publications });
  let serviceMode = serviceFailure ? 'failure' : 'success';
  let serviceValue = services(serviceCount);
  let serviceError = serviceFailure;
  let serviceDeferred = null;
  let serviceCalls = 0;
  const hydrationCalls = [];
  const experienceStates = [];

  const document = {
    readyState: 'loading',
    querySelector(selector) {
      if (selector === '[data-state-boundary="index"], .shell-home__workspace') return currentRoot;
      return null;
    },
    createElement: createNode,
    addEventListener(type, handler) { documentListeners.set(type, handler); },
    removeEventListener(type) { documentListeners.delete(type); },
    dispatchEvent(event) {
      documentEvents.push(event);
      return true;
    }
  };

  const window = {
    Doke: {},
    DOKE_SUPABASE_CONFIG: { enabled: false, servicesEnabled: true },
    location: { search: '' },
    setTimeout,
    clearTimeout
  };

  const context = {
    window,
    document,
    navigator: { onLine: online },
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options?.detail;
      this.bubbles = Boolean(options?.bubbles);
    },
    URLSearchParams,
    Promise,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Error,
    Math,
    console: { warn() {}, error() {}, log() {} },
    setTimeout,
    clearTimeout
  };

  vm.createContext(context);
  vm.runInContext(railSource, context, { filename: 'assets/js/pages/home/rail-state.js' });

  window.Doke.listState = {
    setListState(region, state) {
      region.dataset.state = state;
      return state;
    }
  };
  window.Doke.experience = {
    states: {
      set(_root, state, metadata) {
        experienceStates.push({ state, metadata });
      }
    }
  };
  window.Doke.repositoryBoundary = { getRegisteredProviders() { return ['canonical']; } };
  window.Doke.pageDataOrchestrator = {
    peekPageData() { return null; },
    getPageData() {
      if (orchestrationFailure) return Promise.reject(orchestrationFailure);
      return Promise.resolve({ services: [], workers: [], publications: [] });
    }
  };
  window.Doke.repositories = { services: { clearCache() {} } };
  window.Doke.services = {
    services: {
      list() {
        serviceCalls += 1;
        if (serviceMode === 'deferred') return serviceDeferred.promise;
        if (serviceMode === 'failure') return Promise.reject(serviceError || Object.assign(new Error('catalog failed'), { code: 'CATALOG_FAILED' }));
        return Promise.resolve(serviceValue.slice());
      }
    }
  };
  window.Doke.homePublicServices = {
    render(items) {
      const normalized = Array.isArray(items) ? items : [];
      const featured = currentRoot.regions['featured-services'].list;
      const more = currentRoot.regions['more-services'].list;
      featured.children = normalized.slice(0, 6).map(() => createNode('article'));
      more.children = normalized.slice(6).map(() => createNode('article'));
      return normalized.length;
    }
  };
  window.DokePageHydration = {
    create() {
      return {
        start() { hydrationCalls.push({ type: 'start' }); },
        ready(input) { hydrationCalls.push({ type: 'ready', input }); },
        error(error, input) { hydrationCalls.push({ type: 'error', error, input }); }
      };
    }
  };

  vm.runInContext(controllerSource, context, { filename: 'assets/js/pages/index-data-controller.js' });

  return {
    api: window.Doke.indexDataController,
    documentEvents,
    hydrationCalls,
    experienceStates,
    get root() { return currentRoot; },
    serviceCalls() { return serviceCalls; },
    setServices(count) {
      serviceMode = 'success';
      serviceValue = services(count);
      serviceError = null;
    },
    failServices(code = 'CATALOG_FAILED') {
      serviceMode = 'failure';
      serviceError = Object.assign(new Error('private catalog diagnostic'), { code });
    },
    deferServices() {
      serviceMode = 'deferred';
      serviceDeferred = deferred();
      return serviceDeferred;
    },
    swapRoot(options = {}) {
      currentRoot.isConnected = false;
      currentRoot = createHomeRoot(options);
      return currentRoot;
    }
  };
}

function railSnapshot(root, kind) {
  const region = root.regions[kind].region;
  return {
    state: region.dataset.homeRailDataState,
    freshness: region.dataset.homeRailFreshnessState,
    visibility: region.dataset.homeRailVisibilityState,
    count: Number(region.dataset.homeRailItemCount || 0),
    hidden: region.hidden
  };
}

async function verifyAcceptedCounts() {
  for (const expected of [0, 1, 6, 7]) {
    const harness = createHarness({ serviceCount: expected, workers: 2, publications: 1 });
    const result = await harness.api.load(harness.root);
    const featured = railSnapshot(harness.root, 'featured-services');
    const more = railSnapshot(harness.root, 'more-services');
    assert.equal(featured.count, Math.min(expected, 6), `${expected}: featured count`);
    assert.equal(featured.state, expected ? 'ready' : 'empty', `${expected}: featured state`);
    assert.equal(more.count, Math.max(expected - 6, 0), `${expected}: more count`);
    assert.equal(more.visibility, expected > 6 ? 'visible' : 'hidden-insufficient-items', `${expected}: more visibility`);
    assert.equal(more.hidden, expected <= 6, `${expected}: more DOM visibility`);
    assert.equal(result.renderedServiceCount, expected, `${expected}: rendered receipt count`);
    assert.equal(result.railCounts.featuredServices, Math.min(expected, 6));
    assert.equal(result.railCounts.moreServices, Math.max(expected - 6, 0));
    assert.equal(railSnapshot(harness.root, 'workers').state, 'ready');
    assert.equal(railSnapshot(harness.root, 'publications').state, 'ready');
    assert.equal(harness.root.dataset.dataState, 'ready', 'editorial content keeps Home ready');
  }

  const emptyHarness = createHarness({ serviceCount: 0, workers: 0, publications: 0 });
  await emptyHarness.api.load(emptyHarness.root);
  assert.equal(emptyHarness.root.dataset.dataState, 'empty', 'accepted zero response without editorial content must be empty');
  assert(emptyHarness.hydrationCalls.some((entry) => entry.type === 'ready' && entry.input?.hasItems === false));
}

async function verifyPartialFailureAndSanitization() {
  const error = Object.assign(new Error('private transport body'), { code: 'CATALOG_PRIVATE_FAILURE' });
  const harness = createHarness({ workers: 3, publications: 2, serviceFailure: error });
  const result = await harness.api.load(harness.root);
  assert.deepEqual(Array.from(result.partialFailures), ['services']);
  assert.equal(harness.root.dataset.dataState, 'ready');
  assert.equal(railSnapshot(harness.root, 'featured-services').state, 'error');
  assert.equal(railSnapshot(harness.root, 'more-services').state, 'error');
  assert.equal(railSnapshot(harness.root, 'workers').state, 'ready');
  assert.equal(railSnapshot(harness.root, 'publications').state, 'ready');

  const allEvents = [...harness.documentEvents, ...harness.root.events];
  for (const event of allEvents) {
    const detail = event.detail || {};
    assert(!Object.hasOwn(detail, 'error'), `${event.type}: raw error must not be emitted`);
    assert(!Object.hasOwn(detail, 'message'), `${event.type}: raw message must not be emitted`);
    assert(!JSON.stringify(detail).includes('private transport body'));
  }
}

async function verifyStalePreservationAndSingleFlight() {
  const harness = createHarness({ serviceCount: 7, workers: 1 });
  await harness.api.load(harness.root);
  harness.failServices('CATALOG_REFRESH_FAILED');
  const failedRefresh = await harness.api.retryServices();
  assert.equal(failedRefresh.ok, false);
  const featured = railSnapshot(harness.root, 'featured-services');
  const more = railSnapshot(harness.root, 'more-services');
  assert.equal(featured.state, 'ready');
  assert.equal(featured.freshness, 'stale');
  assert.equal(featured.count, 6);
  assert.equal(more.state, 'ready');
  assert.equal(more.freshness, 'stale');
  assert.equal(more.count, 1);
  assert.equal(harness.root.regions['featured-services'].list.children.length, 6);
  assert.equal(harness.root.regions['more-services'].list.children.length, 1);

  const request = harness.deferServices();
  const callsBefore = harness.serviceCalls();
  const first = harness.api.retryServices();
  const second = harness.api.retryServices();
  assert.equal(harness.serviceCalls(), callsBefore + 1, 'concurrent retry must reuse one catalog request');
  request.resolve(services(7));
  await Promise.all([first, second]);
  assert.equal(railSnapshot(harness.root, 'featured-services').freshness, 'fresh');
}

async function verifyRouteFence() {
  const harness = createHarness({ serviceCount: 7, workers: 1 });
  await harness.api.load(harness.root);
  const oldRoot = harness.root;
  const request = harness.deferServices();
  const pending = harness.api.retryServices();
  const oldEventCount = oldRoot.events.length;
  harness.swapRoot({ workers: 4, publications: 1 });
  request.resolve(services(2));
  const result = await pending;
  assert.equal(result, null, 'response for detached Home root must be discarded');
  assert.equal(oldRoot.events.length, oldEventCount, 'detached root must not receive a commit event');
}

async function verifyOfflineRootFailure() {
  const failure = Object.assign(new Error('offline private detail'), { code: 'NETWORK_FAILED' });
  const harness = createHarness({ workers: 0, publications: 0, serviceFailure: failure, online: false });
  await harness.api.load(harness.root);
  assert.equal(harness.root.dataset.dataState, 'offline');
  assert(harness.hydrationCalls.some((entry) => entry.type === 'error'));
  const errorEvent = harness.root.events.find((event) => event.type === 'doke:index-data-error');
  assert(errorEvent, 'root failure must emit a sanitized error receipt');
  assert.deepEqual(Object.keys(errorEvent.detail).sort(), ['errorCode', 'failedRails', 'page']);
  assert.equal(errorEvent.detail.errorCode, 'DOKE_HOME_OFFLINE');
}

Promise.resolve()
  .then(verifyAcceptedCounts)
  .then(verifyPartialFailureAndSanitization)
  .then(verifyStalePreservationAndSingleFlight)
  .then(verifyRouteFence)
  .then(verifyOfflineRootFailure)
  .then(() => {
    console.log('ux-home-001-index-controller: ok');
    console.log('- accepted counts, empty/error separation, editorial resilience, stale retry, single-flight, route fence and sanitization validated');
  })
  .catch((error) => {
    console.error('ux-home-001-index-controller: failed');
    console.error(error.stack || error.message || error);
    process.exit(1);
  });
