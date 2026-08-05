#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const responsivePath = path.join(root, 'assets/js/core/responsive-experience.js');
const cssPath = path.join(root, 'assets/css/core/responsive-experience.css');
const bootstrapPath = path.join(root, 'assets/js/core/page-bootstrap.js');
const responsiveSource = fs.readFileSync(responsivePath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');
const bootstrapSource = fs.readFileSync(bootstrapPath, 'utf8');

function classList() {
  const values = new Set();
  return {
    add(...items) { items.forEach((item) => values.add(item)); },
    remove(...items) { items.forEach((item) => values.delete(item)); },
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    },
    contains(item) { return values.has(item); }
  };
}

function styleStore() {
  const values = new Map();
  return {
    setProperty(name, value) { values.set(name, String(value)); },
    removeProperty(name) { values.delete(name); },
    getPropertyValue(name) { return values.get(name) || ''; }
  };
}

function element(tagName = 'div') {
  const attrs = new Map();
  const node = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    id: '',
    dataset: {},
    style: styleStore(),
    classList: classList(),
    clientWidth: 0,
    clientHeight: 0,
    scrollWidth: 0,
    scrollHeight: 0,
    hidden: false,
    isConnected: true,
    isContentEditable: false,
    children: [],
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    hasAttribute(name) { return attrs.has(name); },
    removeAttribute(name) { attrs.delete(name); },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return node;
}

const html = element('html');
html.clientWidth = 390;
html.clientHeight = 844;
html.scrollWidth = 390;
html.scrollHeight = 844;

const body = element('body');
body.dataset.page = 'test';
const events = [];
const domListeners = new Map();
let safeProbe = null;
const stateMerges = [];

const documentStub = {
  readyState: 'loading',
  documentElement: html,
  body,
  activeElement: null,
  addEventListener(name, handler) { domListeners.set(name, handler); },
  removeEventListener() {},
  dispatchEvent(event) { events.push(event); return true; },
  createElement(tag) { return element(tag); },
  querySelector(selector) {
    if (selector === '[data-doke-safe-area-probe]') return safeProbe;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '[data-responsive-boundary]') return [];
    return [];
  }
};
body.appendChild = function appendChild(child) {
  this.children.push(child);
  child.parentNode = this;
  if (child.hasAttribute && child.hasAttribute('data-doke-safe-area-probe')) safeProbe = child;
  return child;
};

class CustomEventStub {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const windowStub = {
  Doke: {
    state: {
      merge(pathName, value) { stateMerges.push({ pathName, value }); }
    }
  },
  innerWidth: 390,
  innerHeight: 844,
  visualViewport: {
    width: 390,
    height: 844,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
    addEventListener() {}
  },
  matchMedia(query) {
    return {
      matches: query.includes('pointer: coarse')
        ? true
        : query.includes('prefers-reduced-motion')
        ? false
        : false
    };
  },
  addEventListener() {},
  setTimeout(handler) { handler(); return 1; },
  clearTimeout() {},
  requestAnimationFrame(handler) { handler(); return 1; },
  cancelAnimationFrame() {},
  getComputedStyle() {
    return {
      paddingTop: '0px',
      paddingRight: '0px',
      paddingBottom: '0px',
      paddingLeft: '0px'
    };
  },
  console,
  CustomEvent: CustomEventStub,
  Date,
  Map,
  Set,
  WeakMap,
  URL,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array,
  Error,
  TypeError
};
windowStub.window = windowStub;
windowStub.document = documentStub;

const sandbox = {
  window: windowStub,
  document: documentStub,
  CustomEvent: CustomEventStub,
  console,
  Date,
  Map,
  Set,
  WeakMap,
  URL,
  JSON,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array,
  Error,
  TypeError
};

vm.runInNewContext(responsiveSource, sandbox, { filename: responsivePath });

const api = windowStub.Doke.responsiveExperience;
assert(api, 'Doke.responsiveExperience must be exposed');
assert.strictEqual(api.version, '20260804-ux-resp-001-v1');
assert.strictEqual(api.breakpointVersion, 'responsive-breakpoints-v1');
assert(Object.isFrozen(api));
assert(Object.isFrozen(api.breakpoints));

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.breakpoints)),
  { microMax: 359, compactMax: 600, mediumMax: 1024, wideMin: 1025, expandedMin: 1200 }
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(api.classify(359))),
  { width: 359, layoutMode: 'COMPACT', micro: true, expanded: false }
);
assert.strictEqual(api.classify(360).layoutMode, 'COMPACT');
assert.strictEqual(api.classify(600).layoutMode, 'COMPACT');
assert.strictEqual(api.classify(601).layoutMode, 'MEDIUM');
assert.strictEqual(api.classify(1024).layoutMode, 'MEDIUM');
assert.strictEqual(api.classify(1025).layoutMode, 'WIDE');
assert.strictEqual(api.classify(1200).expanded, true);

let snapshot = api.sync('compact-test');
assert.strictEqual(snapshot.layoutMode, 'COMPACT');
assert.strictEqual(snapshot.inputMode, 'TOUCH');
assert.strictEqual(snapshot.layoutViewport.width, 390);
assert.strictEqual(snapshot.visualViewport.width, 390);
assert.strictEqual(html.dataset.dokeLayoutMode, 'compact');
assert.strictEqual(html.dataset.dokeBreakpointVersion, 'responsive-breakpoints-v1');
assert.strictEqual(html.style.getPropertyValue('--doke-layout-viewport-width'), '390px');
assert(stateMerges.some((entry) => entry.value.viewport === 'mobile'));

html.clientWidth = 768;
html.scrollWidth = 768;
windowStub.innerWidth = 768;
windowStub.visualViewport.width = 768;
snapshot = api.sync('medium-test');
assert.strictEqual(snapshot.layoutMode, 'MEDIUM');
assert(stateMerges.some((entry) => entry.value.viewport === 'tablet'));

html.clientWidth = 1440;
html.scrollWidth = 1450;
windowStub.innerWidth = 1440;
windowStub.visualViewport.width = 1440;
snapshot = api.sync('wide-test');
assert.strictEqual(snapshot.layoutMode, 'WIDE');
assert.strictEqual(snapshot.expanded, true);
assert(stateMerges.some((entry) => entry.value.viewport === 'desktop'));

const overflow = api.auditOverflow('root-overflow-test');
assert.strictEqual(overflow.state, 'OVERFLOW');
assert.strictEqual(overflow.rootOverflow, true);
assert.strictEqual(html.dataset.dokeOverflowState, 'overflow');

const boundary = element('section');
boundary.clientWidth = 300;
boundary.scrollWidth = 340;
const handle = api.registerBoundary(boundary, {
  id: 'test-boundary',
  containInline: true,
  scrollX: true,
  label: 'Região de teste'
});
assert.strictEqual(handle.id, 'test-boundary');
assert.strictEqual(boundary.getAttribute('data-responsive-contain'), 'inline');
assert.strictEqual(boundary.getAttribute('data-responsive-scroll'), 'x');
assert.strictEqual(boundary.getAttribute('role'), 'region');
assert.strictEqual(boundary.getAttribute('aria-label'), 'Região de teste');
handle.unregister();

assert(responsiveSource.includes('var doc = document.documentElement'));
assert(responsiveSource.includes('doc.clientWidth'));
assert(responsiveSource.includes('window.visualViewport') || responsiveSource.includes('root.visualViewport'));
assert(responsiveSource.includes('data-responsive-boundary'));
assert(responsiveSource.includes('doke:responsive-overflow-audit'));
assert(responsiveSource.includes("body.dataset.page !== 'novidades'"));
assert(!responsiveSource.includes('navigator.userAgent'));
assert(!responsiveSource.includes('max-device-width'));
assert(!responsiveSource.includes('user-scalable=no'));

assert(cssSource.includes('.doke-responsive-inline-contain'));
assert(cssSource.includes('overflow-x: auto'));
assert(cssSource.includes('overscroll-behavior-inline: contain'));
assert(cssSource.includes('[data-doke-responsive-pilot="novidades"]'));
assert(!cssSource.includes('overflow-x: hidden'));
assert(!cssSource.includes('!important'));

assert(bootstrapSource.includes("var RESPONSIVE_EXPERIENCE_VERSION = '20260804-ux-resp-001-v1'"));
assert(bootstrapSource.includes("ensureStyle('assets/css/core/responsive-experience.css'"));
assert(bootstrapSource.includes("loadCoreScript('responsive-experience.js'"));
assert(bootstrapSource.includes('responsiveExperienceReady'));
assert(bootstrapSource.includes('ensureResponsiveExperience: ensureResponsiveExperience'));

assert(events.some((event) => event.type === 'doke:responsive-change'));
assert(events.some((event) => event.type === 'doke:responsive-overflow-audit'));

console.log('UX-RESP-001 contract tests passed.');
