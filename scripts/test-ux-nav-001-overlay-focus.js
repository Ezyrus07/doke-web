#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OVERLAY = path.join(ROOT, 'assets/js/core/overlay-experience.js');
const BOOTSTRAP = path.join(ROOT, 'assets/js/core/page-bootstrap.js');
const HELP = path.join(ROOT, 'assets/js/components/help/help-drawer.js');

class EventHub {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, listener, options = {}) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add({ listener, once: options && options.once === true });
  }
  removeEventListener(name, listener) {
    const records = this.listeners.get(name);
    if (!records) return;
    [...records].forEach((record) => { if (record.listener === listener) records.delete(record); });
  }
  dispatchEvent(event) {
    if (!event.target) event.target = this;
    [...(this.listeners.get(event.type) || [])].forEach((record) => {
      record.listener(event);
      if (record.once) this.listeners.get(event.type)?.delete(record);
    });
    return !event.defaultPrevented;
  }
}

class ClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    if (force === true) { this.add(value); return true; }
    if (force === false) { this.remove(value); return false; }
    if (this.contains(value)) { this.remove(value); return false; }
    this.add(value); return true;
  }
}

class Style {
  constructor() { this.overflow = ''; this.map = new Map(); }
  setProperty(name, value) { this.map.set(name, String(value)); }
  removeProperty(name) { this.map.delete(name); }
}

class Element extends EventHub {
  constructor(tagName = 'div', ownerDocument = null) {
    super();
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.classList = new ClassList();
    this.style = new Style();
    this.hidden = false;
    this.disabled = false;
    this.inert = false;
    this.isConnected = true;
    this._focusables = [];
    this._queryMap = new Map();
  }
  appendChild(child) { child.parentNode = this; child.ownerDocument = this.ownerDocument; this.children.push(child); return child; }
  contains(node) { return node === this || this.children.some((child) => child.contains?.(node)); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); if (name === 'hidden') this.hidden = true; }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'hidden') this.hidden = false; }
  toggleAttribute(name, force) {
    const next = force === undefined ? !this.hasAttribute(name) : Boolean(force);
    if (next) this.setAttribute(name, ''); else this.removeAttribute(name);
  }
  querySelectorAll(selector) {
    if (selector.includes('button') || selector.includes('[tabindex]') || selector.includes('a[href]')) return this._focusables.slice();
    return [];
  }
  querySelector(selector) { return this._queryMap.get(selector) || null; }
  focus() { this.ownerDocument.activeElement = this; this.dispatchEvent({ type: 'focus', target: this, defaultPrevented: false }); }
}

class Document extends EventHub {
  constructor() {
    super();
    this.documentElement = new Element('html', this);
    this.body = new Element('body', this);
    this.documentElement.appendChild(this.body);
    this.activeElement = this.body;
    this._queryMap = new Map();
  }
  querySelector(selector) { return this._queryMap.get(selector) || null; }
  contains(node) { return this.documentElement.contains(node); }
  createElement(tag) { return new Element(tag, this); }
}

class CustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; this.defaultPrevented = false; this.target = null; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() { this.propagationStopped = true; }
  stopImmediatePropagation() { this.immediatePropagationStopped = true; }
}

function keyEvent(key, options = {}) {
  return {
    type: 'keydown', key, shiftKey: options.shiftKey === true, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; },
    stopImmediatePropagation() { this.immediatePropagationStopped = true; }
  };
}

function createHarness() {
  const document = new Document();
  let routeId = 1;
  let routePath = '/novidades.html';
  let frameSequence = 0;
  const frames = new Map();
  const window = new EventHub();
  Object.assign(window, {
    Doke: { navigationLifecycle: { getSnapshot() { return { route: { id: routeId, to: routePath, state: 'ready' } }; } } },
    location: { href: 'https://doke.test/novidades.html', pathname: routePath },
    innerWidth: 1280,
    requestAnimationFrame(callback) { const id = ++frameSequence; frames.set(id, callback); callback(Date.now()); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout, clearTimeout,
    getComputedStyle() { return { display: 'block', visibility: 'visible' }; }
  });
  window.window = window;
  window.document = document;
  const context = vm.createContext({
    window, document, CustomEvent, console, Date, Math, Map, Set, WeakMap, Object, Array,
    String, Number, Boolean, JSON, Promise, Error, TypeError, URL, setTimeout, clearTimeout
  });
  vm.runInContext(fs.readFileSync(OVERLAY, 'utf8'), context, { filename: OVERLAY });
  return {
    window, document, api: window.Doke.overlayExperience,
    setRoute(id, pathName) {
      routeId = id; routePath = pathName;
      window.location.pathname = pathName;
      window.location.href = `https://doke.test${pathName}`;
    }
  };
}

function makeOverlay(document, name) {
  const root = new Element('section', document);
  const surface = new Element('aside', document);
  const first = new Element('button', document);
  const last = new Element('button', document);
  root.appendChild(surface); surface.appendChild(first); surface.appendChild(last);
  surface._focusables = [first, last];
  surface._queryMap.set('[autofocus], [data-overlay-initial-focus]', first);
  root.setAttribute('aria-hidden', 'false');
  root.dataset.name = name;
  document.body.appendChild(root);
  return { root, surface, first, last };
}

function testApiAndSingleOverlay() {
  const { api, document } = createHarness();
  assert(api, 'overlay authority must be published');
  assert.strictEqual(api.version, '20260804-ux-nav-001-v1');
  assert(Object.isFrozen(api));
  assert(Object.isFrozen(api.kinds));
  const app = new Element('main', document); document.body.appendChild(app);
  const trigger = new Element('button', document); document.body.appendChild(trigger); trigger.focus();
  const overlay = makeOverlay(document, 'one');
  const handle = api.open({ id: 'test-overlay', root: overlay.root, surface: overlay.surface, trigger, kind: api.kinds.MODAL, initialFocus: overlay.first });
  assert.strictEqual(api.getSnapshot().depth, 1);
  assert.strictEqual(handle.isTop(), true);
  assert.strictEqual(document.activeElement, overlay.first);
  assert.strictEqual(app.inert, true, 'background should be inert');
  assert.strictEqual(app.getAttribute('aria-hidden'), 'true');
  assert.strictEqual(document.body.style.overflow, 'hidden');
  assert.strictEqual(document.documentElement.style.overflow, 'hidden');
  document.activeElement = overlay.last;
  const forward = keyEvent('Tab'); document.dispatchEvent(forward);
  assert.strictEqual(forward.defaultPrevented, true);
  assert.strictEqual(document.activeElement, overlay.first, 'Tab should wrap to first');
  document.activeElement = overlay.first;
  const backward = keyEvent('Tab', { shiftKey: true }); document.dispatchEvent(backward);
  assert.strictEqual(backward.defaultPrevented, true);
  assert.strictEqual(document.activeElement, overlay.last, 'Shift+Tab should wrap to last');
  handle.close({ reason: 'test' });
  assert.strictEqual(api.getSnapshot().depth, 0);
  assert.strictEqual(app.inert, false);
  assert.strictEqual(app.hasAttribute('aria-hidden'), false);
  assert.strictEqual(document.body.style.overflow, '');
  assert.strictEqual(document.activeElement, trigger, 'focus should return to trigger');
}

function testNestedTopmostEscape() {
  const { api, document } = createHarness();
  const first = makeOverlay(document, 'first');
  const second = makeOverlay(document, 'second');
  let firstRequests = 0; let secondRequests = 0; let firstHandle; let secondHandle;
  firstHandle = api.open({ id: 'first', root: first.root, surface: first.surface, onRequestClose() { firstRequests += 1; firstHandle.close({ reason: 'escape' }); } });
  secondHandle = api.open({ id: 'second', root: second.root, surface: second.surface, onRequestClose() { secondRequests += 1; secondHandle.close({ reason: 'escape' }); } });
  assert.strictEqual(first.root.inert, true, 'covered overlay should be inert');
  assert.strictEqual(secondHandle.isTop(), true);
  const escape = keyEvent('Escape'); document.dispatchEvent(escape);
  assert.strictEqual(secondRequests, 1); assert.strictEqual(firstRequests, 0);
  assert.strictEqual(api.getSnapshot().depth, 1); assert.strictEqual(firstHandle.isTop(), true); assert.strictEqual(first.root.inert, false);
  document.dispatchEvent(keyEvent('Escape'));
  assert.strictEqual(firstRequests, 1); assert.strictEqual(api.getSnapshot().depth, 0);
}

function testRouteChangeAndFocusRules() {
  const { api, document, setRoute } = createHarness();
  const trigger = new Element('button', document); document.body.appendChild(trigger); trigger.focus();
  const overlay = makeOverlay(document, 'route');
  let routeCloseReason = ''; let handle;
  handle = api.open({ id: 'route-overlay', root: overlay.root, surface: overlay.surface, trigger, onRequestClose(detail) { routeCloseReason = detail.reason; handle.close({ reason: detail.reason }); } });
  setRoute(2, '/ajuda.html');
  document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-route', { detail: { state: 'pending', snapshot: { route: { id: 2, to: '/ajuda.html', state: 'pending' } } } }));
  assert.strictEqual(routeCloseReason, api.closeReasons.ROUTE_CHANGE);
  assert.notStrictEqual(document.activeElement, trigger, 'focus must not return across routes');
  const title = new Element('h1', document); document.body.appendChild(title); document._queryMap.set('[data-route-focus-target]', title); document.activeElement = document.body;
  document.dispatchEvent(new CustomEvent('doke:navigation-lifecycle-route', { detail: { state: 'ready', snapshot: { route: { id: 2, to: '/ajuda.html', state: 'ready' } } } }));
  assert.strictEqual(document.activeElement, title, 'route target should receive focus');
  assert.strictEqual(title.getAttribute('tabindex'), '-1');
  const input = new Element('input', document); document.body.appendChild(input); input.focus();
  setRoute(3, '/novidades.html');
  document.dispatchEvent(new CustomEvent('doke:route-ready', { detail: {} }));
  assert.strictEqual(document.activeElement, input, 'editable focus must not be stolen');
}

function testSanitizedSnapshotAndStaticIntegrations() {
  const { api, document } = createHarness();
  const overlay = makeOverlay(document, 'private-label');
  const trigger = new Element('button', document); trigger.setAttribute('data-private-value', 'person@example.com'); document.body.appendChild(trigger);
  api.open({ id: 'technical-overlay', root: overlay.root, surface: overlay.surface, trigger });
  const snapshot = JSON.stringify(api.getSnapshot());
  assert(!snapshot.includes('person@example.com'));
  assert(!snapshot.includes('private-label'));
  const bootstrapSource = fs.readFileSync(BOOTSTRAP, 'utf8');
  const helpSource = fs.readFileSync(HELP, 'utf8');
  assert(bootstrapSource.includes('ensureOverlayExperience'));
  assert(bootstrapSource.includes("loadCoreScript('overlay-experience.js'"));
  assert(bootstrapSource.includes('overlayExperienceReady'));
  assert(helpSource.includes("id: 'help-drawer'"));
  assert(helpSource.includes('overlay.open({'));
  assert(helpSource.includes('onRequestClose(detail)'));
  assert(helpSource.includes('trapFocus: true'));
  assert(helpSource.includes('inertBackground: true'));
  assert(helpSource.includes('lockScroll: true'));
  assert(!helpSource.includes("document.addEventListener('keydown', (event) =>"));
}

function main() {
  testApiAndSingleOverlay();
  testNestedTopmostEscape();
  testRouteChangeAndFocusRules();
  testSanitizedSnapshotAndStaticIntegrations();
  console.log('UX-NAV-001 overlay and focus contract: OK');
}

main();
