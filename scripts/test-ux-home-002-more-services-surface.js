#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

class ClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const next = force === undefined ? !this.values.has(value) : Boolean(force);
    if (next) this.values.add(value);
    else this.values.delete(value);
    return next;
  }
}

function option(text, value = text) {
  return { textContent: text, value, disabled: false };
}

function control(kind, text = '') {
  const node = {
    kind,
    textContent: text,
    dataset: {},
    classList: new ClassList(kind === 'tab' || kind === 'chip' ? [] : undefined),
    attributes: new Map(),
    hidden: false,
    disabled: false,
    title: '',
    tabIndex: 0,
    parentNode: null,
    options: [],
    value: '',
    label: '',
    setAttribute(name, value) { this.attributes.set(name, String(value)); },
    removeAttribute(name) { this.attributes.delete(name); },
    addEventListener() {},
    matches(selector) {
      if (selector === '.filter-chip') return this.kind === 'chip';
      if (selector === '[data-home-staté-select]') return this.kind === 'select-state';
      if (selector === '[data-home-city-select]') return this.kind === 'select-city';
      if (selector === '[data-home-neighborhood-select]') return this.kind === 'select-neighborhood';
      return false;
    },
    closest(selector) {
      if (selector === 'label' && this.kind.startsWith('select')) {
        return { querySelector: () => ({ textContent: this.label }) };
      }
      if ((selector.includes('[data-more-services-intent]') || selector.includes('#more-services-tabs-track')) && this.kind === 'tab') return this;
      if (selector.includes('.filter-chip') && this.kind === 'chip') return this;
      if (selector === '[data-more-services-load]' && this.kind === 'load') return this;
      if (selector === '[data-more-filters-apply]' && this.kind === 'apply') return this;
      if (selector === '[data-more-filters-close]' && this.kind === 'close') return this;
      if (selector === '[data-more-services-reset]' && this.kind === 'reset') return this;
      if (selector === '[data-more-services-filter]' && this.dataset.moreServicesFilter) return this;
      return null;
    }
  };
  Object.defineProperty(node, 'selectedOptions', {
    get() { return this.options.filter((item) => item.value === this.value).slice(0, 1); }
  });
  return node;
}

const tabs = [
  control('tab', 'Para você'),
  control('tab', 'Seguindo'),
  control('tab', 'Bem avaliados'),
  control('tab', 'Com garantia'),
  control('tab', 'Disponíveis hoje'),
  control('tab', 'Novos')
];
const chips = [
  control('chip', 'Com garantia'),
  control('chip', 'Emergência'),
  control('chip', 'Pix'),
  control('chip', 'Online'),
  control('chip', 'Hoje')
];

function selectNode(kind, label, labels) {
  const node = control(kind);
  node.label = label;
  node.options = labels.map((labelText) => option(labelText));
  node.value = node.options[0]?.value || '';
  return node;
}

const category = selectNode('select-category', 'Categoria', ['Todas', 'Reforma', 'Limpeza', 'Tecnologia']);
const type = selectNode('select-type', 'Tipo de serviço', ['Qualquer tipo', 'Residencial']);
const modality = selectNode('select-modality', 'Online ou presencial', ['Tanto faz', 'Presencial', 'Online', 'Híbrido']);
const price = selectNode('select-price', 'Preço', ['Qualquer valor', 'Até R$ 100']);
const rating = selectNode('select-rating', 'Avaliação', ['4,8+ estrelas', '4,5+ estrelas', '4,0+ estrelas', 'Qualquer nota']);
const payments = selectNode('select-payments', 'Pagamentos aceitos', ['Todos', 'Pix']);
const guarantee = selectNode('select-guarantee', 'Garantia', ['Tanto faz', 'Com garantia', 'Sem garantia']);
const emergency = selectNode('select-emergency', 'Atende emergências', ['Tanto faz', 'Sim', 'Não']);
const state = selectNode('select-state', 'Estado', ['', 'MG', 'SP']);
const city = selectNode('select-city', 'Cidade', ['', 'Belo Horizonte', 'São Paulo']);
const neighborhood = selectNode('select-neighborhood', 'Bairro', ['', 'Savassi', 'Centro']);
const selects = [category, type, modality, price, rating, payments, guarantee, emergency, state, city, neighborhood];

const loadButton = control('load', 'Carregar mais');
const loadHost = { hidden: false };
const applyButton = control('apply', 'Aplicar filtros');
const closeButton = control('close', 'Fechar');
const resetButton = control('reset', 'Limpar filtros');
const feedback = { textContent: '', setAttribute() {}, dataset: {} };
const emptyMessage = { textContent: '' };
const emptyState = { hidden: true, dataset: { listEmpty: '' }, querySelector() { return emptyMessage; } };

let legacyAbortCount = 0;
const grid = {
  dataset: { moreServicesLimit: '6', moreServicesStep: '3' },
  children: [],
  __dokeProgressiveRevealController: { abort() { legacyAbortCount += 1; } },
  replaceChildren(...nodes) { this.children = nodes.slice(); },
  appendChild(node) { this.children.push(node); }
};

const actions = { firstChild: resetButton, insertBefore() {} };
const controls = { parentNode: { insertBefore() {} } };
const regionListeners = {};
const panelListeners = {};

const panel = {
  dataset: { moreFiltersPanel: '' },
  querySelector(selector) {
    if (selector === '[data-more-services-reset]') return resetButton;
    if (selector === '.more-filters__actions') return actions;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'select') return selects;
    if (selector.includes('[data-more-filters-section="quick"]')) return chips;
    if (selector === '[data-more-services-filter]') return [...chips, ...selects];
    return [];
  },
  addEventListener(typeName, handler, options = {}) {
    panelListeners[typeName] = { handler, capture: Boolean(options.capture) };
  },
  contains(node) {
    return [...chips, ...selects, applyButton, closeButton, resetButton].includes(node);
  }
};

const region = {
  dataset: {
    homeRailFreshnessState: 'fresh',
    homeRailDataState: 'ready',
    homeRailVisibilityState: 'visible'
  },
  hidden: false,
  querySelector(selector) {
    if (selector === '[data-more-services-grid]') return grid;
    if (selector === '[data-more-filters-panel]') return panel;
    if (selector === '[data-list-empty]') return emptyState;
    if (selector === '[data-more-services-count-feedback]') return feedback;
    if (selector === '[data-more-services-reset]') return resetButton;
    if (selector === '.more-filters__actions') return actions;
    if (selector === '.more-services__controls') return controls;
    if (selector === '[data-more-services-load-host]') return loadHost;
    if (selector === '[data-more-services-load]') return loadButton;
    return null;
  },
  querySelectorAll(selector) {
    if (selector.includes('[data-more-services-intent]') || selector.includes('#more-services-tabs-track')) return tabs;
    return [];
  },
  addEventListener(typeName, handler, options = {}) {
    regionListeners[typeName] = { handler, capture: Boolean(options.capture) };
  },
  contains(node) {
    return [grid, ...tabs, loadButton, panel].includes(node) || panel.contains(node);
  },
  appendChild() {},
  setAttribute() {},
  removeAttribute() {}
};

const pageRoot = {
  isConnected: true,
  querySelector(selector) {
    return selector === '[data-home-list-region="more-services"]' ? region : null;
  }
};

const documentListeners = new Map();
const stateEvents = [];
const documentStub = {
  readyState: 'loading',
  querySelector(selector) {
    if (selector.includes('[data-state-boundary="index"]')) return pageRoot;
    return null;
  },
  addEventListener(typeName, handler) {
    const handlers = documentListeners.get(typeName) || [];
    handlers.push(handler);
    documentListeners.set(typeName, handlers);
  },
  dispatchEvent(event) {
    stateEvents.push(event);
    for (const handler of documentListeners.get(event.type) || []) handler(event);
    return true;
  },
  createElement(tag) { return control(tag); }
};

class CustomEventStub {
  constructor(typeName, options = {}) {
    this.type = typeName;
    this.detail = options.detail;
  }
}

const renderedCards = [];
const services = Array.from({ length: 13 }, (_, index) => {
  const number = index + 1;
  return {
    id: `service-${number}`,
    status: 'active',
    title: `Serviço ${number}`,
    category: number % 2 ? 'Reforma' : 'Limpeza',
    state: 'MG',
    city: 'Belo Horizonte',
    neighborhood: number % 2 ? 'Savassi' : 'Centro',
    rating: 4.2 + number / 20,
    guaranteed: number >= 8 && number % 2 === 1,
    emergency: number === 9 || number === 13,
    online: number === 10 || number === 12,
    availableToday: number >= 9,
    createdAt: `2026-08-${String(Math.min(number, 9)).padStart(2, '0')}T10:00:00Z`
  };
});

const Doke = {
  publicServiceCard: {
    create(item, options) {
      const card = { item, options, hidden: false };
      renderedCards.push(card);
      return card;
    }
  },
  listState: {
    setListState(target, stateName, options = {}) {
      target.dataset.state = stateName;
      if (options.message) emptyMessage.textContent = options.message;
      emptyState.hidden = stateName !== 'empty';
      return stateName;
    }
  },
  indexDataController: {
    lastPayload: { data: { services } }
  }
};

const windowStub = {
  Doke,
  document: documentStub,
  CustomEvent: CustomEventStub,
  setTimeout(callback) { callback(); return 1; }
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
global.AbortController = class AbortControllerStub {
  constructor() { this.signal = {}; this.aborted = false; }
  abort() { this.aborted = true; }
};

const statePath = require.resolve('../assets/js/pages/home/more-services-state.js');
const surfacePath = require.resolve('../assets/js/pages/home/more-services-surface.js');
delete require.cache[statePath];
delete require.cache[surfacePath];
require(statePath);
require(surfacePath);

const surface = Doke.homeMoreServicesSurface;
assert(surface, 'more-services surface must be published');
const binding = surface.boot();
assert(binding, 'surface must bind to the Home more-services region');
assert.equal(binding.panel, panel, 'surface must bind filter events to the portable panel node');
let snapshot = surface.getSnapshot();
assert.equal(snapshot.resultCount, 7, 'surface must consume only services after the six featured cards');
assert.equal(snapshot.visibleCount, 6);
assert.equal(grid.children.length, 6);
assert.equal(legacyAbortCount, 1, 'surface render must abort the legacy progressive reveal authority');
assert(grid.children.every((card) => card.options?.results === true), 'surface must reuse canonical public service cards');

assert.deepEqual(tabs.map((tab) => tab.dataset.moreServicesIntent), [
  'for-you', 'following', 'top-rated', 'guaranteed', 'available-today', 'newest'
]);
assert.equal(tabs[0].attributes.get('aria-selected'), 'true');
assert.equal(chips[2].disabled, true, 'Pix quick filter must be disabled because no verified field authority exists');
assert.equal(type.disabled, true, 'service type must remain unavailable without a verified canonical field');
assert.equal(price.disabled, true, 'price filter must remain unavailable in this sublot');
assert.equal(payments.disabled, true, 'payments filter must remain unavailable in this sublot');
assert.equal(optionByLabel(guarantee, 'Sem garantia').disabled, true);
assert.equal(optionByLabel(emergency, 'Não').disabled, true);
assert.equal(optionByLabel(modality, 'Presencial').disabled, true);
assert.equal(optionByLabel(modality, 'Híbrido').disabled, true);

function optionByLabel(select, text) {
  return select.options.find((item) => item.textContent === text);
}

function eventFor(target) {
  var prevented = false;
  var stopped = false;
  return {
    event: {
      target,
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; }
    },
    flags() { return { prevented, stopped }; }
  };
}

function click(target) {
  const wrapped = eventFor(target);
  const listener = panel.contains(target) && !tabs.includes(target) && target !== loadButton
    ? panelListeners.click
    : regionListeners.click;
  assert(listener?.handler, `Expected click listener for ${target.kind}.`);
  listener.handler(wrapped.event);
  return wrapped.flags();
}

function change(target) {
  assert(panelListeners.change?.handler, 'Expected panel change listener.');
  panelListeners.change.handler({ target });
}

click(tabs[1]);
snapshot = surface.getSnapshot();
assert.equal(snapshot.intent, 'following');
assert.equal(snapshot.resultState, 'unavailable');
assert.equal(grid.children.length, 0);
assert.equal(region.dataset.state, 'empty');
assert.match(emptyMessage.textContent, /Seguindo/);
assert.equal(region.dataset.moreServicesAvailability, 'unavailable');

click(tabs[0]);
snapshot = surface.getSnapshot();
assert.equal(snapshot.resultCount, 7);
assert.equal(snapshot.visibleCount, 6);

const guaranteedChip = chips[0];
click(guaranteedChip);
snapshot = surface.getSnapshot();
assert.equal(snapshot.appliedFilters.guaranteed, false, 'quick-filter edits must remain draft before Apply');
assert.equal(snapshot.draftFilters.guaranteed, true);
assert.equal(snapshot.resultCount, 7, 'draft edits must not mutate the rendered collection');
assert.equal(guarantee.value, 'Com garantia', 'quick chip and detailed select must stay synchronized');

click(closeButton);
snapshot = surface.getSnapshot();
assert.equal(snapshot.draftFilters.guaranteed, false, 'Close must restore the applied snapshot');
assert.equal(guaranteedChip.classList.contains('is-active'), false);

click(guaranteedChip);
category.value = 'Reforma';
change(category);
click(applyButton);
snapshot = surface.getSnapshot();
assert.equal(snapshot.appliedFilters.guaranteed, true);
assert.deepEqual(Array.from(snapshot.appliedFilters.categories), ['Reforma']);
assert(snapshot.items.every((item) => item.guaranteed && item.category === 'Reforma'));
assert.equal(grid.children.length, snapshot.visibleCount);

click(resetButton);
snapshot = surface.getSnapshot();
assert.equal(snapshot.activeFilterCount, 0);
assert.equal(snapshot.resultCount, 7);
assert.equal(snapshot.visibleCount, 6);

const legacyBeforeLoad = legacyAbortCount;
const loadEvent = click(loadButton);
snapshot = surface.getSnapshot();
assert.equal(loadEvent.prevented, true, 'load-more must prevent the legacy default interaction');
assert.equal(loadEvent.stopped, true, 'load-more must stop the legacy progressive-reveal listener');
assert.equal(snapshot.visibleCount, 7);
assert.equal(grid.children.length, 7);
assert.equal(legacyAbortCount, legacyBeforeLoad, 'the already-removed legacy controller must not be recreated by local reveal');

region.dataset.homeRailFreshnessState = 'stale';
const staleResultCount = snapshot.resultCount;
const accepted = surface.acceptPayload({ data: { services: [] } });
assert.equal(accepted, null, 'stale rail must reject replacement payloads');
assert.equal(surface.getSnapshot().resultCount, staleResultCount, 'stale refresh must preserve the last accepted source');
region.dataset.homeRailFreshnessState = 'fresh';

const sanitized = stateEvents.filter((event) => event.type === 'doke:home-more-services-state-change');
assert(sanitized.length > 0);
for (const stateEvent of sanitized) {
  const serialized = JSON.stringify(stateEvent.detail);
  assert(!serialized.includes('service-'));
  assert(!Object.hasOwn(stateEvent.detail, 'items'));
  assert(!Object.hasOwn(stateEvent.detail, 'userId'));
  assert(!Object.hasOwn(stateEvent.detail, 'providerId'));
  assert(!Object.hasOwn(stateEvent.detail, 'query'));
}

delete require.cache[statePath];
delete require.cache[surfacePath];
for (const key of ['window', 'document', 'CustomEvent', 'AbortController']) delete global[key];

console.log('ux-home-002-more-services-surface: ok');
console.log('- portable panel authority, intents, draft/apply/cancel, unsupported filters, canonical cards and progressive reveal validated');
