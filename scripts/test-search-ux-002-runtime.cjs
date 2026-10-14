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
    CustomEvent: window.CustomEvent, FormData, setTimeout, clearTimeout,
    requestAnimationFrame: window.requestAnimationFrame,
    fetch: (...args) => window.fetch(...args) });
  return { window, document, run: (file) => vm.runInContext(read(file), context, { filename: file }) };
}
(async () => {
  const env = environment('detalhe-anuncio.html');
  env.run('assets/js/pages/detalhe-anuncio.js');
  const { window, document } = env;
  const hydrate = (service) => window.DokeHydrateDetailAd({ data: { service } });
  await test('initial HTML has no demonstration listing content', () => {
    assert(!/banheiro|Renato Acabamentos|Projeto 3D|12 meses|10 a 15 dias/i.test(read('detalhe-anuncio.html')));
    assert.equal(document.querySelector('[data-detail-description]').textContent, '');
    assert.equal(document.querySelector('.detail-checklist').children.length, 0);
  });
  await test('description, checklist and complete breadcrumb hydrate safely', () => {
    hydrate({ id:'a', title:'Aulas de violão', category:'Aulas', description:'Aulas individuais <script>não executar</script>', checklist:['Partitura', 'Prática'], status:'active' });
    assert.equal(document.querySelector('[data-detail-description]').textContent, 'Aulas individuais <script>não executar</script>');
    assert.equal(document.querySelector('[data-detail-description] script'), null);
    assert.equal(document.querySelector('.detail-checklist').children.length, 2);
    assert.equal(document.querySelector('.ad-detail-breadcrumb').textContent, 'Início›Serviços›Aulas›Aulas de violão');
    assert.equal(document.querySelector('.ad-detail-breadcrumb a:nth-of-type(3)').getAttribute('href'), 'resultados.html?category=Aulas');
  });
  await test('a different listing clears missing fields and hides unavailable information', () => {
    hydrate({ id:'b', title:'Frete', status:'active' });
    assert.equal(document.querySelector('[data-detail-description]').textContent, '');
    assert.equal(document.querySelector('[data-detail-description]').hidden, true);
    assert.equal(document.querySelector('.detail-checklist').textContent, '');
    assert.equal(document.querySelector('.detail-checklist').hidden, true);
    assert.equal(document.querySelector('.detail-section--service-details').hidden, true);
    assert.equal(document.querySelector('.location-card').hidden, true);
    assert.equal(document.querySelector('.provider-card').hidden, true);
    assert.equal(document.querySelector('.ad-detail-breadcrumb').textContent, 'Início›Serviços›Frete');
  });
  await test('empty and malformed checklist never preserve the previous one', () => {
    for (const checklist of [[], null, 'not an array', [' ', null, {}]]) {
      hydrate({ id:'c', title:'Eletricista', description:'Instalações', checklist, status:'active' });
      assert.equal(document.querySelector('.detail-checklist').children.length, 0);
      assert.equal(document.querySelector('.detail-checklist').hidden, true);
    }
    hydrate({ id:'d', title:'Pintura', checklist:['Proteção'], status:'active' });
    assert.equal(document.querySelector('.detail-checklist').hidden, false);
    assert.equal(document.querySelector('.detail-checklist').textContent, 'Proteção');
  });
  await test('late detail response and revalidation cannot overwrite current route', async () => {
    const e = environment('detalhe-anuncio.html', '?id=a');
    const requests = [];
    e.window.Doke.pageDataOrchestrator = { getPageData(page, options) {
      return new Promise((resolve, reject) => requests.push({ ...options, resolve, reject }));
    }};
    e.window.Doke.repositoryBoundary = { getRegisteredProviders() { return []; } };
    e.run('assets/js/pages/detalhe-anuncio-data-controller.js');
    const api = e.window.Doke.detailAdDataController;
    const root = api.getRoot();
    const a = api.load(root);
    e.window.location.search = '?id=b';
    const b = api.load(root);
    requests[1].resolve({ service: { id:'b', title:'Frete' } });
    await b;
    requests[0].resolve({ service: { id:'a', title:'Banheiro' } });
    await a;
    assert.equal(api.lastPayload.serviceId, 'b');
    e.document.dispatchEvent(new e.window.CustomEvent('doke:page-data-revalidated', {detail:{page:'detalhe-anuncio',context:{serviceId:'a'},data:{service:{id:'a'}}}}));
    assert.equal(api.lastPayload.serviceId, 'b');
    const older = api.load(root); const newer = api.load(root);
    requests[3].resolve({service:{id:'b',title:'Atual'}}); await newer;
    requests[2].reject(new Error('late failure')); await older;
    assert.equal(root.dataset.dataState, 'ready');
    assert.equal(api.lastPayload.data.service.title, 'Atual');
  });
  await test('a reused detail root hides old content during load and reveals the new service', async () => {
    const e = environment('detalhe-anuncio.html', '?id=a');
    const pending=[];
    e.window.Doke.pageDataOrchestrator={getPageData(){return new Promise(resolve=>pending.push(resolve));}};
    e.window.Doke.repositoryBoundary={getRegisteredProviders(){return [];}};
    e.run('assets/js/core/page-hydration.js');
    e.run('assets/js/pages/detalhe-anuncio-data-controller.js');
    e.run('assets/js/pages/detalhe-anuncio.js');
    const api=e.window.Doke.detailAdDataController; const root=api.getRoot();
    const first=api.load(root); pending[0]({service:{id:'a',title:'Aulas',description:'Primeiro anúncio'}});await first;await flush();
    assert.equal(root.querySelector('[data-detail-hydration-ready]').hidden,false);
    e.window.location.search='?id=b';const second=api.load(root);
    assert.equal(root.querySelector('[data-detail-hydration-ready]').hidden,true);
    pending[1]({service:{id:'b',title:'Frete'}});await second;await flush();
    assert.equal(root.querySelector('[data-detail-hydration-ready]').hidden,false);
    assert.equal(root.querySelector('[data-detail-description]').textContent,'');
    assert.equal(root.querySelector('#ad-detail-title').textContent,'Frete');
  });
  await test('27 UFs and the local IBGE municipality snapshot load once', async () => {
    const e = environment('resultados.html');
    let calls = 0;
    e.window.fetch = async (url) => { calls++; assert.equal(url,'assets/data/brazil-municipalities.json'); return {ok:true,json:async()=>JSON.parse(read(url))}; };
    e.run('assets/js/pages/search-data.js');
    const geo=e.window.DokeSearchData.locationOptions;
    assert.equal(geo.states.length,27);
    assert.equal(new Set(geo.states).size,27);
    await Promise.all([geo.loadCities(),geo.loadCities()]);
    assert.equal(calls,1);
    assert.equal(Object.values(geo.citiesByState).flat().length,5571);
    for (const uf of geo.states) assert(geo.citiesByState[uf].length > 0);
    assert(geo.citiesByState.AM.includes('Manaus'));
    assert(geo.citiesByState.DF.includes('Brasília'));
    assert(geo.citiesByState.RS.includes('Porto Alegre'));
    assert(geo.citiesByState.SP.includes('São Paulo'));
    assert.equal(geo.getNeighborhoods('AM','Manaus').length,0);
    geo.rememberLocation({state:'SP',city:'Bom Jesus',neighborhood:'Centro'});
    assert.equal(geo.getNeighborhoods('PI','Bom Jesus').length,0);
  });
  await test('failed local geography load rejects without fabricating options and can retry', async () => {
    const e = environment('resultados.html');
    e.window.fetch = async()=>({ok:false});
    e.run('assets/js/pages/search-data.js');
    const geo=e.window.DokeSearchData.locationOptions;
    await assert.rejects(geo.loadCities());
    assert.equal(Object.keys(geo.citiesByState).length,0);
    e.window.fetch = async()=>({ok:true,json:async()=>JSON.parse(read('assets/data/brazil-municipalities.json'))});
    await geo.loadCities(); assert(geo.citiesByState.AC.includes('Rio Branco'));
  });
  await test('URL location survives initial render and async municipality loading', async () => {
    const e = environment('resultados.html','?q=aulas&state=BA&city=Salvador&neighborhood=Barra');
    let resolveData;
    e.window.fetch = () => new Promise((resolve)=> {resolveData=resolve;});
    const requests=[];
    e.window.Doke.searchResultsServerSurface={render(context){requests.push(context.filters);return Promise.resolve([]);}};
    e.run('assets/js/pages/search-data.js'); e.run('assets/js/pages/search-results.js');
    e.window.DokeInitSearchResults();
    const state=e.document.querySelector('[data-results-state-select], [data-results-staté-select]');
    const city=e.document.querySelector('[data-results-city-select]');
    const neighborhood=e.document.querySelector('[data-results-neighborhood-select]');
    assert.equal(state.value,'BA');assert.equal(city.value,'Salvador');assert.equal(neighborhood.value,'Barra');
    resolveData({ok:true,json:async()=>JSON.parse(read('assets/data/brazil-municipalities.json'))});
    await flush();
    assert.equal(city.value,'Salvador'); assert.equal(neighborhood.value,'Barra');
    assert(requests.some((r)=>r.state==='BA' && r.city==='Salvador' && r.neighborhood==='Barra'));
    state.value='AM';state.dispatchEvent(new e.window.Event('change',{bubbles:true}));
    assert.equal(city.value,'');assert.equal(neighborhood.value,'');
    assert([...city.options].some((o)=>o.value==='Manaus'));
    assert(![...city.options].some((o)=>o.value==='Salvador'));
    city.value='Manaus';city.dispatchEvent(new e.window.Event('change',{bubbles:true}));
    assert.equal(neighborhood.value,'');
    e.window.DokeSearchResultsCleanup();
  });

  await test('CEP uses the existing provider, preserves unknown neighborhoods and fails closed', async () => {
    const e = environment('resultados.html');
    const calls = [];
    e.window.fetch = async (url) => { calls.push(url); return {ok:true,json:async()=>({uf:'PE',localidade:'Recife',bairro:''})}; };
    e.run('assets/js/pages/search-data.js');
    const geo = e.window.DokeSearchData.locationOptions;
    assert.equal(await geo.lookupCep('12'),null); assert.equal(calls.length,0);
    const result = await geo.lookupCep('50000-000');
    assert.equal(result.staté,'PE'); assert.equal(result.city,'Recife'); assert.equal(result.neighborhood,'');
    geo.rememberLocation(result);
    assert.equal(geo.getNeighborhoods('PE','Recife').length,0);
    await geo.lookupCep('50000000'); assert.equal(calls.length,1);
    e.window.fetch = async()=> {throw Error('offline');};
    assert.equal(await geo.lookupCep('00000000'),null);
  });
  await test('late CEP response cannot replace a newer CEP or manual state selection', async () => {
    const e = environment('resultados.html');
    const pending = [];
    e.window.fetch = (url) => url.startsWith('assets/')
      ? Promise.resolve({ok:true,json:async()=>JSON.parse(read(url))})
      : new Promise((resolve)=>pending.push(resolve));
    e.window.Doke.searchResultsServerSurface={render(){return Promise.resolve([]);}};
    e.run('assets/js/pages/search-data.js'); e.run('assets/js/pages/search-results.js');
    e.window.DokeInitSearchResults(); await flush();
    const input=e.document.querySelector('[data-results-cep-input]');
    const state=e.document.querySelector('[data-results-state-select], [data-results-staté-select]');
    const city=e.document.querySelector('[data-results-city-select]');
    const bairro=e.document.querySelector('[data-results-neighborhood-select]');
    input.value='11111111';input.dispatchEvent(new e.window.Event('input'));
    input.value='22222222';input.dispatchEvent(new e.window.Event('input'));
    pending[1]({ok:true,json:async()=>({uf:'BA',localidade:'Salvador',bairro:'Barra'})}); await flush();
    pending[0]({ok:true,json:async()=>({uf:'AM',localidade:'Manaus',bairro:'Centro'})}); await flush();
    assert.equal(state.value,'BA');assert.equal(city.value,'Salvador');assert.equal(bairro.value,'Barra');
    input.value='33333333';input.dispatchEvent(new e.window.Event('input'));
    state.value='AC';state.dispatchEvent(new e.window.Event('change',{bubbles:true}));
    pending[2]({ok:true,json:async()=>({uf:'SP',localidade:'São Paulo',bairro:'Moema'})}); await flush();
    assert.equal(state.value,'AC'); assert.equal(city.value,''); assert.equal(bairro.value,'');
    e.window.DokeSearchResultsCleanup();
  });
  await test('home filters load every UF and reset city and neighborhood on state change', async () => {
    const e = environment('index.html');
    e.document.querySelector('[data-account-onboarding]')?.remove();
    e.window.fetch=async(url)=>({ok:true,json:async()=>JSON.parse(read(url))});
    e.run('assets/js/pages/search-data.js');e.run('assets/js/pages/home.js');
    e.window.DokeInitHome(); await flush();
    const state=e.document.querySelector('[data-home-staté-select]');
    const city=e.document.querySelector('[data-home-city-select]');
    const bairro=e.document.querySelector('[data-home-neighborhood-select]');
    assert.equal(state.options.length,28);
    for (const uf of e.window.DokeSearchData.locationOptions.states) {
      state.value=uf;state.dispatchEvent(new e.window.Event('change'));
      assert(city.options.length>1,uf);
      assert.equal(city.value,'');assert.equal(bairro.value,'');
    }
    state.value='AM';state.dispatchEvent(new e.window.Event('change'));
    assert([...city.options].some((o)=>o.value==='Manaus'));
    e.window.DokeHomeCleanup();
  });
  console.log('SEARCH-UX-002: '+passed+' tests passed.');
})().catch((error)=>{console.error(error);process.exitCode=1;});
