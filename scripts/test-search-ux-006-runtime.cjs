'use strict';
// Local DOM integration tests. Setup: npm install --no-save --package-lock=false --ignore-scripts linkedom
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const read = (file) => fs.readFileSync(file, 'utf8');
const flush = () => new Promise((resolve) => setImmediate(resolve));
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('PASS ' + name); }
function environment(file, search = '') {
  const { window, document } = parseHTML(read(file));
  Object.defineProperty(document, 'readyState', { value: 'loading' });
  window.location = { search, href: 'http://localhost/' + file + search, pathname: '/' + file };
  window.history = { replaceState() {} };
  window.localStorage = { getItem() { return null; }, setItem() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = (callback) => callback();
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.Doke = {};
  // LinkeDOM lacks browser select setters and form data serialization.
  Object.defineProperty(window.HTMLSelectElement.prototype, 'value', {
    configurable: true,
    get() { return [...this.options].find((o) => o.hasAttribute('selected'))?.value || ''; },
    set(value) { [...this.options].forEach((o) => o.toggleAttribute('selected', o.value === String(value))); }
  });
  class FormData {
    constructor(form) { this.form = form; }
    getAll(name) { return [...this.form.querySelectorAll('[name="' + name + '"]')].filter((n) => !['checkbox','radio'].includes(n.type) || n.checked).map((n) => n.value); }
    get(name) { return this.getAll(name)[0] || null; }
  }
  const context = vm.createContext({ window, document, console, URLSearchParams, AbortController,
    Event: window.Event, CustomEvent: window.CustomEvent, FormData, setTimeout, clearTimeout,
    requestAnimationFrame: window.requestAnimationFrame,
    fetch: (...args) => window.fetch(...args) });
  return { window, document, run: (file) => vm.runInContext(read(file), context, { filename: file }) };
}

(async () => {
  const e = environment('resultados.html', '?q=aulas&state=BA&city=Salvador&neighborhood=Barra');
  const captured = {};
  const add = e.document.addEventListener.bind(e.document);
  e.document.addEventListener = (type, callback, options) => {
    if (options?.capture) captured[type] = callback;
    return add(type, callback, options);
  };
  let geographyResolve;
  const cepPending = [];
  e.window.fetch = (url) => url.startsWith('assets/')
    ? new Promise(resolve => { geographyResolve = resolve; })
    : new Promise(resolve => cepPending.push(resolve));
  const searches = [];
  e.window.Doke.searchResultsServerSurface = { render(context) { searches.push(context.filters); return Promise.resolve([]); } };
  e.run('assets/js/pages/search-data.js');
  e.run('assets/js/pages/search-results.js');
  e.window.DokeInitSearchResults();
  e.document.dispatchEvent(new e.window.Event('DOMContentLoaded'));
  await new Promise(resolve => setTimeout(resolve, 10));
  const api = e.window.Doke.searchFilterStateInstallation;
  const state = e.document.querySelector('[data-results-state-select]');
  const city = e.document.querySelector('[data-results-city-select]');
  const hood = e.document.querySelector('[data-results-neighborhood-select]');
  const cep = e.document.querySelector('[data-results-cep-input]');
  function capture(type, target) { captured[type]({ target, stopImmediatePropagation() {}, preventDefault() {} }); }
  await test('integrated applied URL survives a delayed municipality load', async () => {
    assert.equal(api.getSnapshot().applied.state, 'BA');
    assert.equal(api.getSnapshot().applied.city, 'Salvador');
    assert.equal(api.getSnapshot().applied.neighborhood, 'Barra');
    const count = searches.length;
    geographyResolve({ ok:true, json:async()=>JSON.parse(read('assets/data/brazil-municipalities.json')) });
    await flush();
    assert.equal(city.value, 'Salvador');
    assert.equal(hood.value, 'Barra');
    assert.equal(searches.length, count);
  });
  await test('integrated geographic edits stay draft and cancel restores applied URL intent', () => {
    const count = searches.length;
    state.value='AM'; capture('change',state);
    assert.equal(api.getSnapshot().draft.state,'AM');
    assert.equal(api.getSnapshot().applied.state,'BA');
    assert.equal(city.value,''); assert.equal(hood.value,'');
    assert.equal(searches.length,count);
    api.cancel();
    assert.equal(state.value,'BA'); assert.equal(city.value,'Salvador'); assert.equal(hood.value,'Barra');
  });
  await test('CEP only updates draft and an older response cannot overwrite it', async () => {
    const count=searches.length;
    cep.value='11111111'; capture('input',cep);
    cep.value='22222222'; capture('input',cep);
    cepPending[1]({ok:true,json:async()=>({uf:'BA',localidade:'Salvador',bairro:'Barra'})}); await flush();
    cepPending[0]({ok:true,json:async()=>({uf:'AM',localidade:'Manaus',bairro:'Centro'})}); await flush();
    assert.equal(api.getSnapshot().draft.city,'Salvador');
    assert.equal(state.value,'BA'); assert.equal(city.value,'Salvador');
    assert.equal(searches.length,count);
  });
  await test('manual UF selection and cancel invalidate CEP requests', async () => {
    cep.value='33333333';capture('input',cep);
    state.value='AM';capture('change',state);
    cepPending[2]({ok:true,json:async()=>({uf:'SP',localidade:'São Paulo',bairro:'Centro'})});await flush();
    assert.equal(api.getSnapshot().draft.state,'AM');
    cep.value='44444444';capture('input',cep);api.cancel();
    cepPending[3]({ok:true,json:async()=>({uf:'SP',localidade:'São Paulo',bairro:'Centro'})});await flush();
    assert.equal(api.getSnapshot().applied.state,'BA');assert.equal(api.getSnapshot().draft.state,'BA');
  });
  api.cleanup();e.window.DokeSearchResultsCleanup();
  console.log('SEARCH-UX-006: '+passed+' integrated DOM tests passed. Capture callbacks are exercised directly; browser tests certify propagation ordering.');
})().catch(error=>{console.error(error);process.exitCode=1;});
