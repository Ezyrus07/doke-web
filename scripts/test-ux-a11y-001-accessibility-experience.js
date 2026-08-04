const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const A11Y = path.join(ROOT, 'assets/js/core/accessibility-experience.js');
const CSS = path.join(ROOT, 'assets/css/core/accessibility-experience.css');
const BOOTSTRAP = path.join(ROOT, 'assets/js/core/page-bootstrap.js');
const HELP = path.join(ROOT, 'assets/js/components/help/help-drawer.js');

function createNode(tagName = 'div', initial = {}) {
  const attrs = new Map(Object.entries(initial.attrs || {}));
  return {
    tagName: tagName.toUpperCase(),
    type: initial.type || '',
    value: initial.value || '',
    textContent: initial.textContent || '',
    labels: initial.labels || [],
    disabled: initial.disabled === true,
    dataset: {},
    clicked: 0,
    hasAttribute(name) { return attrs.has(name); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    removeAttribute(name) { attrs.delete(name); },
    click() { this.clicked += 1; },
    closest() { return this; }
  };
}

function loadAuthority() {
  const listeners = new Map();
  const documentElement = createNode('html');
  documentElement.dataset = {};
  const document = {
    readyState: 'loading',
    documentElement,
    body: {},
    addEventListener(name, listener) { listeners.set(name, listener); },
    dispatchEvent() { return true; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById() { return null; },
    createElement(tag) { return createNode(tag); }
  };
  const window = {
    Doke: {},
    document,
    clearTimeout,
    setTimeout,
    MutationObserver: null
  };
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Map,
    Set,
    Promise,
    Error,
    TypeError,
    console,
    setTimeout,
    clearTimeout
  });
  vm.runInContext(fs.readFileSync(A11Y, 'utf8'), context, { filename: A11Y });
  return { api: window.Doke.accessibilityExperience, document, listeners };
}

function testRuntimeApi() {
  const { api, document } = loadAuthority();
  assert(api, 'accessibility authority must be published');
  assert.strictEqual(api.version, '20260804-ux-a11y-001-v1');
  assert(Object.isFrozen(api), 'API must be frozen');
  assert(Object.isFrozen(api.modality), 'modality enum must be frozen');

  const placeholderOnly = createNode('input', {
    attrs: { placeholder: 'Buscar' }
  });
  assert.strictEqual(api.hasAccessibleName(placeholderOnly), false, 'placeholder is not an accessible name');

  const explicit = createNode('button', {
    attrs: { 'data-a11y-label': 'Abrir detalhes' }
  });
  assert.strictEqual(api.applyExplicitName(explicit), true);
  assert.strictEqual(explicit.getAttribute('aria-label'), 'Abrir detalhes');

  const textButton = createNode('button', { textContent: 'Salvar' });
  assert.strictEqual(api.hasAccessibleName(textButton), true);

  const custom = createNode('div', { attrs: { 'data-a11y-action': 'open' } });
  const repaired = api.repairExplicitActions({
    querySelectorAll() { return [custom]; }
  });
  assert.strictEqual(repaired, 1);
  assert.strictEqual(custom.getAttribute('role'), 'button');
  assert.strictEqual(custom.getAttribute('tabindex'), '0');

  api.setModality(api.modality.KEYBOARD, 'test');
  assert.strictEqual(document.documentElement.dataset.dokeInputModality, 'keyboard');
  assert.strictEqual(api.getSnapshot().modality, 'keyboard');
}

function testSourceContracts() {
  const source = fs.readFileSync(A11Y, 'utf8');
  const css = fs.readFileSync(CSS, 'utf8');
  const bootstrap = fs.readFileSync(BOOTSTRAP, 'utf8');
  const help = fs.readFileSync(HELP, 'utf8');

  assert(source.includes('Ir para o conteúdo principal'), 'skip-link copy must be canonical');
  assert(source.includes("document.querySelectorAll('main, [role=\"main\"]')"), 'main landmarks must be inventoried');
  assert(source.includes('data-doke-main-landmark'), 'main destination must be explicit');
  assert(source.includes('data-doke-focus-visible'), 'focus-visible fallback must exist');
  assert(source.includes('EXPLICIT_ACTION_SELECTOR'), 'keyboard repair must be explicit');
  assert(source.includes('event.key'), 'keyboard input must be inspected');
  assert(source.includes("key !== 'Enter' && key !== ' '"), 'Enter and Space activation must be bounded');
  assert(source.includes("search.setAttribute('aria-label', 'Buscar na ajuda')"), 'Help Drawer search needs an accessible name');
  assert(source.includes("list.setAttribute('role', 'group')"), 'Help Drawer must not keep invalid listitem buttons');
  assert(source.includes("button.removeAttribute('role')"), 'native button semantics must be restored');
  assert(!source.includes("getAttribute('placeholder')"), 'placeholder must not be promoted to an accessible name');

  assert(css.includes('.doke-skip-link'), 'skip-link styling must exist');
  assert(css.includes(':focus-visible'), 'native focus-visible must be covered');
  assert(css.includes('data-doke-input-modality="keyboard"'), 'keyboard fallback must be covered');
  assert(css.includes('@media (forced-colors: active)'), 'forced colors must be supported');
  assert(css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion must be supported');
  assert(!css.includes('!important'), 'accessibility CSS must not use !important');

  assert(bootstrap.includes('ACCESSIBILITY_EXPERIENCE_VERSION'), 'bootstrap must pin the authority version');
  assert(bootstrap.includes('accessibility-experience.css'), 'bootstrap must load accessibility CSS');
  assert(bootstrap.includes('accessibility-experience.js'), 'bootstrap must load accessibility JS');
  assert(bootstrap.includes('ensureAccessibilityExperience'), 'bootstrap must expose retryable loading');
  assert(bootstrap.includes('accessibilityExperienceReady'), 'bootstrap readiness must be observable');

  assert(help.includes('data-overlay-initial-focus'), 'Help Drawer overlay focus pilot must remain intact');
}

testRuntimeApi();
testSourceContracts();
console.log('[test:ux-a11y-001] passed');
