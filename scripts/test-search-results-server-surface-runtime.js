'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(
  path.resolve(__dirname, '../assets/js/pages/search/server-results-surface.js'),
  'utf8'
);

function element(name) {
  return {
    name,
    hidden: false,
    disabled: false,
    textContent: '',
    dataset: {},
    attributes: new Map(),
    children: [],
    setAttribute(key, value) { this.attributes.set(key, String(value)); },
    getAttribute(key) { return this.attributes.get(key) || null; },
    appendChild(child) { this.children.push(child); return child; },
    get childCount() { return this.children.length; },
    set innerHTML(value) { if (value === '') this.children = []; },
    get innerHTML() { return ''; }
  };
}

function createRuntime(options = {}) {
  const events = [];
  const calls = [];
  const responses = options.responses || [
    {
      authority: 'public.search_public_services_v1',
      contractVersion: '1.0.0',
      items: [{ id: 'service-a' }, { id: 'service-b' }],
      page: { pageSize: 12, hasNext: true, nextCursor: 'cursor-1' }
    },
    {
      authority: 'public.search_public_services_v1',
      contractVersion: '1.0.0',
      items: [{ id: 'service-b' }, { id: 'service-c' }],
      page: { pageSize: 12, hasNext: false, nextCursor: null }
    }
  ];
  let responseIndex = 0;
  const queryPage = async (request) => {
    calls.push(JSON.parse(JSON.stringify(request)));
    if (options.fail) {
      const error = new Error('RPC unavailable');
      error.code = 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE';
      throw error;
    }
    return responses[Math.min(responseIndex++, responses.length - 1)];
  };

  class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail || {};
    }
  }

  const document = {
    dispatchEvent(event) { events.push(event); }
  };

  const context = {
    console,
    Promise,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    JSON,
    CustomEvent,
    document,
    window: null,
    Doke: {
      services: { search: { queryPage } },
      serviceFavoritesController: { hydrate() { context.favoriteHydrations += 1; } }
    },
    favoriteHydrations: 0
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'server-results-surface.js' });

  const ui = {
    grid: element('grid'),
    loadMoreButton: element('loadMoreButton'),
    pagination: element('pagination'),
    count: element('count'),
    title: element('title'),
    description: element('description'),
    inlineEmpty: element('inlineEmpty'),
    states: [],
    chips: [],
    settled: 0,
    refreshed: 0,
    hydrationErrors: []
  };

  const resultContext = {
    query: 'eletricista',
    filters: {
      categories: ['Eletricista'],
      state: 'BA',
      city: 'Salvador',
      neighborhood: 'Centro',
      minRating: 4.5,
      guaranteed: true,
      emergency: false,
      online: false,
      availableToday: true
    },
    grid: ui.grid,
    loadMoreButton: ui.loadMoreButton,
    pagination: ui.pagination,
    count: ui.count,
    title: ui.title,
    description: ui.description,
    inlineEmpty: ui.inlineEmpty,
    createCard(item) { return { serviceId: item.id }; },
    setResultsState(value) { ui.states.push(value); },
    settleHydration() { ui.settled += 1; },
    failHydration(error) { ui.hydrationErrors.push(error); },
    refreshPreviews() { ui.refreshed += 1; },
    renderActiveChips(query, filters, count) { ui.chips.push({ query, filters, count }); }
  };

  return { context, calls, events, ui, resultContext };
}

(async () => {
  const runtime = createRuntime();
  const surface = runtime.context.Doke.searchResultsServerSurface;
  assert(surface, 'server results surface must register');

  await surface.render(runtime.resultContext);
  assert.strictEqual(runtime.calls.length, 1, 'initial render must issue one canonical request');
  assert.strictEqual(runtime.calls[0].pageSize, 12);
  assert.strictEqual(runtime.calls[0].serviceMode, 'any');
  assert.strictEqual(runtime.calls[0].cursor, '');
  assert.deepStrictEqual(Array.from(runtime.calls[0].categories), ['Eletricista']);
  assert.strictEqual(runtime.ui.grid.childCount, 2);
  assert.strictEqual(runtime.ui.count.textContent, '2');
  assert.strictEqual(runtime.ui.loadMoreButton.hidden, false, 'cursor continuation must be visible');
  assert.strictEqual(runtime.ui.pagination.hidden, false);
  assert(runtime.ui.states.includes('results'));

  await surface.loadMore();
  assert.strictEqual(runtime.calls.length, 2, 'load more must issue exactly one next-page request');
  assert.strictEqual(runtime.calls[1].cursor, 'cursor-1');
  assert.strictEqual(runtime.ui.grid.childCount, 3, 'duplicate cursor rows must not be appended');
  assert.strictEqual(runtime.ui.count.textContent, '3');
  assert.strictEqual(runtime.ui.loadMoreButton.hidden, true, 'continuation must hide at the final page');
  assert.strictEqual(surface.getSnapshot().hasNext, false);
  assert.strictEqual(runtime.context.favoriteHydrations, 2);

  runtime.resultContext.query = 'consultoria';
  runtime.resultContext.filters.online = true;
  await surface.render(runtime.resultContext);
  assert.strictEqual(runtime.calls.length, 3);
  assert.strictEqual(runtime.calls[2].serviceMode, 'online');
  assert.strictEqual(runtime.calls[2].cursor, '');
  assert.strictEqual(runtime.ui.grid.childCount, 2, 'new searches must replace prior results');

  const failure = createRuntime({ fail: true });
  await assert.rejects(
    () => failure.context.Doke.searchResultsServerSurface.render(failure.resultContext),
    (error) => error && error.code === 'DOKE_SEARCH_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(failure.calls.length, 1);
  assert.strictEqual(failure.ui.grid.childCount, 0);
  assert(failure.ui.states.includes('error'), 'remote failure must expose an error state');
  assert.strictEqual(failure.ui.hydrationErrors.length, 1);
  const errorEvent = failure.events.find((event) => event.type === 'doke:search-server-error');
  assert(errorEvent, 'canonical failure event must be emitted');
  assert.strictEqual(errorEvent.detail.fallbackUsed, false, 'remote failure cannot use a local catalog fallback');

  const sourceContract = source;
  assert(!sourceContract.includes('localStorage'));
  assert(!sourceContract.includes('sessionStorage'));
  assert(!sourceContract.includes('getServiceMatches'));
  assert(!sourceContract.includes('services.services.list'));
  assert(sourceContract.includes('searchApi().queryPage(request)'));

  console.log('[SEARCH-A05] canonical server results surface runtime: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
