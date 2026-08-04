const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.DOKE_TEST_ROOT || process.cwd();
const statePath = path.join(ROOT, 'assets/js/state/state-contracts.js');
const legacyPath = path.join(ROOT, 'assets/js/core/view-state.js');
const pilotPath = path.join(ROOT, 'assets/js/pages/news-experience.js');

class FakeNode {
  constructor() {
    this.attributes = new Map();
    this.hidden = false;
    this.textContent = '';
    this.disabled = false;
    this.events = [];
    this.selectors = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  toggleAttribute(name, force) {
    if (force) this.attributes.set(name, '');
    else this.attributes.delete(name);
  }
  querySelector(selector) { return this.selectors.get(selector) || null; }
  querySelectorAll(selector) {
    const value = this.selectors.get(selector);
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
  dispatchEvent(event) { this.events.push(event); return true; }
}

function createHarness() {
  const root = new FakeNode();
  root.setAttribute('data-state-boundary', 'pilot');
  root.setAttribute('data-view-state', 'idle');

  const region = new FakeNode();
  const genericMessage = new FakeNode();
  region.selectors.set('[data-state-message]', genericMessage);
  [
    'idle', 'loading', 'refreshing', 'ready', 'empty', 'error', 'offline', 'stale',
    'degraded', 'submitting', 'success', 'unknown-outcome', 'reconciling', 'conflict',
    'read-only', 'maintenance'
  ].forEach((name) => region.selectors.set(`[data-state-${name}]`, new FakeNode()));
  root.selectors.set('[data-state-region]', region);

  const document = {
    readyState: 'complete',
    body: new FakeNode(),
    querySelector(selector) { return selector === '#pilot' ? root : null; },
    querySelectorAll(selector) { return selector === '[data-state-boundary]' ? [root] : []; },
    addEventListener() {}
  };
  function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; }
  const window = { Doke: {}, CustomEvent };
  const sandbox = { window, document, console };
  vm.createContext(sandbox);
  return { root, region, window, sandbox };
}

function run() {
  const harness = createHarness();
  vm.runInContext(fs.readFileSync(statePath, 'utf8'), harness.sandbox, { filename: statePath });
  vm.runInContext(fs.readFileSync(legacyPath, 'utf8'), harness.sandbox, { filename: legacyPath });

  const { root, region, window } = harness;
  const { Doke } = window;
  const api = Doke.stateContracts;

  assert(Object.isFrozen(api), 'stateContracts must be frozen');
  assert(Object.isFrozen(api.STATES), 'state enum must be frozen');
  ['unknown_outcome', 'degraded', 'maintenance', 'read_only', 'conflict'].forEach((state) => {
    assert(api.states.includes(state), `missing canonical state: ${state}`);
  });

  assert.strictEqual(api.normalizeState('UNKNOWN-OUTCOME'), 'unknown_outcome');
  assert.strictEqual(api.isValidState('not-real'), false);
  assert.strictEqual(api.canTransition('loading', 'ready'), true);
  assert.strictEqual(api.canTransition('loading', 'success'), false);

  assert.strictEqual(api.setBoundaryState(root, 'loading'), true);
  assert.strictEqual(root.getAttribute('data-view-state'), 'loading');
  assert.strictEqual(root.getAttribute('aria-busy'), 'true');
  assert.strictEqual(region.querySelector('[data-state-loading]').hidden, false);
  assert.strictEqual(region.querySelector('[data-state-loading]').textContent, 'Carregando…');

  assert.strictEqual(api.setBoundaryState(root, 'success'), false);
  assert.strictEqual(root.getAttribute('data-view-state'), 'loading');
  assert.strictEqual(root.events.at(-1).type, 'doke:view-state-rejected');

  assert.strictEqual(api.setBoundaryState(root, 'ready', { announce: false }), true);
  assert.strictEqual(root.getAttribute('aria-busy'), 'false');
  assert.strictEqual(api.setBoundaryState(root, 'empty', {
    contentKey: 'news.filter.empty',
    variables: { filter: 'Segurança' }
  }), true);
  assert.strictEqual(
    region.querySelector('[data-state-empty]').textContent,
    'Nenhuma novidade encontrada em Segurança.'
  );

  assert.strictEqual(api.setBoundaryState(root, 'ready'), true);
  assert.strictEqual(api.setBoundaryState(root, 'submitting'), true);
  assert.strictEqual(api.setBoundaryState(root, 'unknown_outcome'), true);
  assert.strictEqual(api.setBoundaryState(root, 'reconciling'), true);
  assert.strictEqual(api.setBoundaryState(root, 'success'), true);

  assert.strictEqual(Doke.viewState.ready(root), true);
  assert.strictEqual(Doke.viewState.error(root, 'Falha controlada.'), true);
  assert.strictEqual(root.getAttribute('data-view-state'), 'error');
  assert.strictEqual(region.querySelector('[data-state-error]').textContent, 'Falha controlada.');

  assert.strictEqual(
    Doke.contentCatalog.get('news.filter.empty', { filter: '<script>' }),
    'Nenhuma novidade encontrada em <script>.'
  );
  assert.strictEqual(Doke.contentCatalog.get('missing.key', null, 'Fallback seguro.'), 'Fallback seguro.');

  const pilot = fs.readFileSync(pilotPath, 'utf8');
  assert(pilot.includes('stateContracts?.setBoundaryState?.'), 'Novidades must consume the canonical registry');
  assert(pilot.includes('contentKey'), 'Novidades must resolve operational content through a key');
  assert(!pilot.includes("root.dataset.viewState = state;\n      root.setAttribute"), 'legacy direct root mutation must not remain authoritative');

  console.log('[test:ux-core-001-state-content-registry] passed');
}

run();
