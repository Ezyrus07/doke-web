#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

function eventTarget(base = {}) {
  const listeners = new Map();
  return Object.assign(base, {
    addEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((candidate) => candidate !== handler));
    },
    dispatch(type, event = {}) {
      for (const handler of listeners.get(type) || []) {
        handler(Object.assign({ currentTarget: this, target: this, preventDefault() {} }, event));
      }
    },
    listenerCount(type) {
      return (listeners.get(type) || []).length;
    }
  });
}

function item(offsetLeft, width) {
  return {
    offsetLeft,
    offsetWidth: width,
    getBoundingClientRect() { return { width }; }
  };
}

function arrow(direction) {
  return eventTarget({
    direction,
    disabled: false,
    dataset: {},
    attributes: new Map(),
    getAttribute(name) {
      return name === 'data-catégory-arrow' ? this.direction : null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }
  });
}

let frameSequence = 0;
const frames = new Map();
const flushFrames = () => {
  const pending = Array.from(frames.entries());
  frames.clear();
  pending.forEach(([, callback]) => callback());
};

const previous = arrow('prev');
const next = arrow('next');
const scrollCalls = [];
const track = eventTarget({
  dataset: {},
  children: [item(0, 100), item(116, 100), item(232, 100), item(348, 100), item(464, 100)],
  clientWidth: 250,
  scrollWidth: 564,
  scrollLeft: 0,
  scrollBy(options) {
    scrollCalls.push(options);
    this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + options.left));
    this.dispatch('scroll');
  }
});

let resizeHandler = null;
let reducedMotion = false;
let latestResizeObserver = null;
let latestMutationObserver = null;

class ResizeObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.observed = [];
    this.disconnected = false;
    latestResizeObserver = this;
  }
  observe(node) { this.observed.push(node); }
  disconnect() { this.observed = []; this.disconnected = true; }
  trigger() { this.callback([]); }
}

class MutationObserverStub {
  constructor(callback) {
    this.callback = callback;
    this.observed = null;
    this.disconnected = false;
    latestMutationObserver = this;
  }
  observe(node, options) { this.observed = { node, options }; }
  disconnect() { this.disconnected = true; }
  trigger() { this.callback([]); }
}

const documentStub = {
  querySelector(selector) {
    return selector === '[data-catégory-track]' ? track : null;
  },
  querySelectorAll(selector) {
    return selector === '[data-catégory-arrow]' ? [previous, next] : [];
  },
  fonts: { ready: Promise.resolve() }
};

const windowStub = eventTarget({
  Doke: {},
  ResizeObserver: ResizeObserverStub,
  MutationObserver: MutationObserverStub,
  getComputedStyle() { return { columnGap: '16px', gap: '16px' }; },
  matchMedia() { return { matches: reducedMotion }; },
  requestAnimationFrame(callback) {
    const id = ++frameSequence;
    frames.set(id, callback);
    return id;
  },
  cancelAnimationFrame(id) { frames.delete(id); }
});
windowStub.addEventListener = (type, handler) => {
  if (type === 'resize') resizeHandler = handler;
};
windowStub.removeEventListener = (type, handler) => {
  if (type === 'resize' && resizeHandler === handler) resizeHandler = null;
};

global.window = windowStub;
global.document = documentStub;

const statePath = require.resolve('../assets/js/pages/home/rail-scroll-state.js');
const controllerPath = require.resolve('../assets/js/pages/home/rail-scroll-controller.js');
delete require.cache[statePath];
delete require.cache[controllerPath];
require(statePath);
require(controllerPath);

const api = windowStub.Doke.homeRailScrollState;
const controller = windowStub.DokeHomeRailScroll;
assert(api, 'rail scroll state dependency must be available');
assert(controller, 'rail scroll controller must be published');

const routeController = new AbortController();
const init = controller.create({ signal: routeController.signal });
const cleanup = init();

assert.equal(track.dataset.railScrollState, api.states.READY_OVERFLOW_START);
assert.equal(track.dataset.railScrollOverflow, 'true');
assert.equal(previous.disabled, true);
assert.equal(previous.attributes.get('aria-disabled'), 'true');
assert.equal(next.disabled, false);
assert.equal(next.attributes.get('aria-disabled'), 'false');
assert.equal(track.listenerCount('scroll'), 1);
assert.equal(previous.listenerCount('click'), 1);
assert.equal(next.listenerCount('click'), 1);
assert.equal(latestResizeObserver.observed.length, track.children.length + 1, 'track and all items must be observed for width changes');
assert.deepEqual(latestMutationObserver.observed, { node: track, options: { childList: true } });

next.dispatch('click');
assert.equal(scrollCalls.length, 1);
assert.deepEqual(scrollCalls[0], { left: 116, behavior: 'smooth' }, 'arrow step must equal one complete item plus gap');
flushFrames();
assert.equal(track.dataset.railScrollState, api.states.READY_OVERFLOW_MIDDLE);
assert.equal(previous.disabled, false);
assert.equal(next.disabled, false);

track.scrollLeft = track.scrollWidth - track.clientWidth;
track.dispatch('scroll');
flushFrames();
assert.equal(track.dataset.railScrollState, api.states.READY_OVERFLOW_END);
assert.equal(previous.disabled, false);
assert.equal(next.disabled, true);

track.scrollLeft = 0;
track.scrollWidth = 240;
latestResizeObserver.trigger();
flushFrames();
assert.equal(track.dataset.railScrollState, api.states.READY_FITS);
assert.equal(previous.disabled, true);
assert.equal(next.disabled, true, 'both arrows must leave the tab order when the rail fully fits');

track.scrollWidth = 564;
track.scrollLeft = 0;
resizeHandler();
flushFrames();
assert.equal(track.dataset.railScrollState, api.states.READY_OVERFLOW_START);
assert.equal(next.disabled, false);

const extra = item(580, 100);
track.children.push(extra);
latestMutationObserver.trigger();
flushFrames();
assert(latestResizeObserver.observed.includes(extra), 'new items must enter ResizeObserver coverage');

reducedMotion = true;
next.dispatch('click');
assert.equal(scrollCalls.at(-1).behavior, 'auto', 'reduced-motion preference must disable smooth scrolling');

const callsBeforeAbort = scrollCalls.length;
routeController.abort();
assert.equal(track.listenerCount('scroll'), 0);
assert.equal(previous.listenerCount('click'), 0);
assert.equal(next.listenerCount('click'), 0);
assert.equal(latestResizeObserver.disconnected, true);
assert.equal(latestMutationObserver.disconnected, true);
assert.equal(resizeHandler, null);

next.dispatch('click');
assert.equal(scrollCalls.length, callsBeforeAbort, 'aborted route bindings must not react to later clicks');
cleanup();

const emptyDocument = global.document;
global.document = {
  querySelector() { return null; },
  querySelectorAll() { return []; },
  fonts: emptyDocument.fonts
};
const noSurfaceInit = controller.create({ signal: new AbortController().signal });
assert.doesNotThrow(() => noSurfaceInit(), 'missing Category markup must fail closed');
global.document = emptyDocument;

delete require.cache[statePath];
delete require.cache[controllerPath];
delete global.window;
delete global.document;

console.log('ux-home-003-rail-scroll-controller: ok');
console.log('- boundaries, item-step, manual scroll, resize, observers, reduced motion and route cleanup validated');
