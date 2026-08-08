#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

class EventTargetStub {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler, options = {}) {
    const entries = this.listeners.get(type) || [];
    const entry = { handler, signal: options.signal || null };
    entries.push(entry);
    this.listeners.set(type, entries);
    options.signal?.addEventListener?.('abort', () => {
      const current = this.listeners.get(type) || [];
      this.listeners.set(type, current.filter((candidate) => candidate !== entry));
    }, { once: true });
  }

  emit(type, event = {}) {
    for (const entry of [...(this.listeners.get(type) || [])]) {
      entry.handler({
        preventDefault() { event.prevented = true; },
        ...event,
        target: event.target || this
      });
    }
  }
}

class ArrowStub extends EventTargetStub {
  constructor(attributeName, direction, targetId = '') {
    super();
    this.attributes = new Map([[attributeName, direction]]);
    this.dataset = {};
    if (targetId) this.dataset.railTarget = targetId;
    this.disabled = false;
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  click() {
    const event = { target: this, prevented: false };
    this.emit('click', event);
    return event;
  }
}

class TrackStub extends EventTargetStub {
  constructor(id, { scrollLeft = 0, clientWidth = 0, scrollWidth = 0 } = {}) {
    super();
    this.id = id;
    this.scrollLeft = scrollLeft;
    this.clientWidth = clientWidth;
    this.scrollWidth = scrollWidth;
    this.dataset = {};
    this.scrollCalls = [];
  }

  scrollTo(options) {
    this.scrollCalls.push(options);
    this.scrollLeft = Number(options.left || 0);
    this.emit('scroll', { target: this });
  }
}

const categoryTrack = new TrackStub('categories-track', {
  clientWidth: 500,
  scrollWidth: 1200
});
const categoryPrevious = new ArrowStub('data-catégory-arrow', 'prev');
const categoryNext = new ArrowStub('data-catégory-arrow', 'next');

const genericTrack = new TrackStub('workers-track', {
  clientWidth: 400,
  scrollWidth: 400
});
const genericPrevious = new ArrowStub('data-rail-arrow', 'prev', 'workers-track');
const genericNext = new ArrowStub('data-rail-arrow', 'next', 'workers-track');

const scopeNodes = new Set([
  categoryTrack,
  categoryPrevious,
  categoryNext,
  genericTrack,
  genericPrevious,
  genericNext
]);

const scope = {
  isConnected: true,
  querySelector(selector) {
    if (selector === '[data-catégory-track]') return categoryTrack;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-catégory-arrow]') return [categoryPrevious, categoryNext];
    if (selector === '[data-rail-arrow]') return [genericPrevious, genericNext];
    return [];
  },
  contains(node) {
    return scopeNodes.has(node);
  }
};

const resizeObservers = [];
class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.targets = [];
    this.disconnected = false;
    resizeObservers.push(this);
  }
  observe(target) { this.targets.push(target); }
  disconnect() { this.disconnected = true; }
  trigger() { this.callback(); }
}

const mutationObservers = [];
class MutationObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.targets = [];
    this.disconnected = false;
    mutationObservers.push(this);
  }
  observe(target, options) { this.targets.push({ target, options }); }
  disconnect() { this.disconnected = true; }
  trigger() { this.callback([{ type: 'childList' }]); }
}

const documentStub = {
  querySelector(selector) {
    if (selector.includes('[data-state-boundary="index"]')) return scope;
    return null;
  },
  getElementById(id) {
    return id === 'workers-track' ? genericTrack : null;
  }
};

const windowStub = new EventTargetStub();
windowStub.Doke = {};
windowStub.document = documentStub;
windowStub.ResizeObserver = ResizeObserverStub;
windowStub.MutationObserver = MutationObserverStub;
windowStub.requestAnimationFrame = (callback) => {
  callback();
  return 0;
};

global.window = windowStub;
global.document = documentStub;

const statePath = require.resolve('../assets/js/pages/home/rail-scroll-state.js');
const surfacePath = require.resolve('../assets/js/pages/home/rail-scroll-surface.js');
delete require.cache[statePath];
delete require.cache[surfacePath];
require(statePath);
require(surfacePath);

const surface = windowStub.Doke.homeRailScrollSurface;
assert(surface, 'rail scroll surface authority must be published');

const routeController = new AbortController();
const firstBinding = surface.bind({ root: scope, signal: routeController.signal });
assert(firstBinding, 'surface must bind to the active Home root');
assert.equal(firstBinding.definitions.length, 2, 'category and generic rails must be discovered');

let categorySnapshot = surface.getSnapshot('categories');
assert.equal(categorySnapshot.atStart, true);
assert.equal(categoryPrevious.disabled, true);
assert.equal(categoryPrevious.attributes.get('aria-disabled'), 'true');
assert.equal(categoryNext.disabled, false);
assert.equal(categoryNext.attributes.get('aria-disabled'), 'false');
assert.equal(categoryTrack.dataset.railScrollState, 'start');
assert.equal(categoryTrack.dataset.railScrollCanPrevious, 'false');
assert.equal(categoryTrack.dataset.railScrollCanNext, 'true');

let genericSnapshot = surface.getSnapshot('workers-track');
assert.equal(genericSnapshot.overflow, false);
assert.equal(genericPrevious.disabled, true);
assert.equal(genericNext.disabled, true);
assert.equal(genericTrack.dataset.railScrollState, 'static');

const nextEvent = categoryNext.click();
assert.equal(nextEvent.prevented, true);
assert.equal(categoryTrack.scrollCalls.length, 1);
assert.deepEqual(categoryTrack.scrollCalls[0], { left: 225, behavior: 'smooth' });
categorySnapshot = surface.getSnapshot('categories');
assert.equal(categorySnapshot.scrollLeft, 225);
assert.equal(categoryPrevious.disabled, false);
assert.equal(categoryNext.disabled, false);
assert.equal(categoryTrack.dataset.railScrollState, 'middle');

categoryTrack.scrollLeft = 700;
categoryTrack.emit('scroll', { target: categoryTrack });
categorySnapshot = surface.getSnapshot('categories');
assert.equal(categorySnapshot.atEnd, true, 'manual/touch scroll must synchronize end boundary');
assert.equal(categoryNext.disabled, true);
assert.equal(categoryPrevious.disabled, false);

const endClick = categoryNext.click();
assert.equal(endClick.prevented, true);
assert.equal(categoryTrack.scrollCalls.length, 1, 'blocked next click must not call scrollTo again');

const previousEvent = categoryPrevious.click();
assert.equal(previousEvent.prevented, true);
assert.equal(categoryTrack.scrollCalls.length, 2);
assert.equal(categoryTrack.scrollCalls[1].left, 475);

categoryTrack.clientWidth = 1200;
categoryTrack.scrollWidth = 1200;
resizeObservers.find((observer) => observer.targets.includes(categoryTrack)).trigger();
categorySnapshot = surface.getSnapshot('categories');
assert.equal(categorySnapshot.overflow, false, 'resize must recalculate overflow');
assert.equal(categoryPrevious.disabled, true);
assert.equal(categoryNext.disabled, true);

categoryTrack.scrollWidth = 1500;
mutationObservers.find((observer) => observer.targets.some((entry) => entry.target === categoryTrack)).trigger();
categorySnapshot = surface.getSnapshot('categories');
assert.equal(categorySnapshot.overflow, true, 'content mutation must recalculate overflow');
assert.equal(categorySnapshot.atStart, false, 'existing scroll offset must be preserved through content mutation');
assert.equal(categoryNext.disabled, false);

const secondBinding = surface.bind({ root: scope });
assert(secondBinding, 'surface must support safe stable-shell rebind');
assert.equal(firstBinding.controller.signal.aborted, true, 'rebind must abort the previous listener authority');
assert.equal(resizeObservers.slice(0, 2).every((observer) => observer.disconnected), true, 'rebind must disconnect previous resize observers');
assert.equal(mutationObservers.slice(0, 2).every((observer) => observer.disconnected), true, 'rebind must disconnect previous mutation observers');

const externalController = new AbortController();
const thirdBinding = surface.bind({ root: scope, signal: externalController.signal });
assert(thirdBinding);
externalController.abort();
assert.equal(thirdBinding.controller.signal.aborted, true, 'route abort must abort the rail listener authority');
assert.equal(resizeObservers.slice(-2).every((observer) => observer.disconnected), true, 'route abort must disconnect resize observers');
assert.equal(mutationObservers.slice(-2).every((observer) => observer.disconnected), true, 'route abort must disconnect mutation observers');
assert.equal(windowStub.DokeHomeRailScrollSurfaceBinding, undefined, 'destroyed route binding must release the global binding slot');

assert.equal(surface.bind({ root: scope, signal: externalController.signal }), null, 'already-aborted route signal must fail closed');

for (const key of ['window', 'document']) delete global[key];
delete require.cache[statePath];
delete require.cache[surfacePath];

console.log('ux-home-003-rail-scroll-surface: ok');
console.log('- boundaries, click clamps, manual scroll, resize, mutation, rebind and route cleanup validated');
