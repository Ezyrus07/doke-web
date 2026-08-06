const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const PUBLIC_CATALOG_CHAIN = Object.freeze([
  'assets/js/repositories/services-repository.js',
  'assets/js/services/services-service.js',
  'assets/js/components/public-service-card.js'
]);

function createStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    clear() { data.clear(); }
  };
}

function extractScriptSources(html) {
  const sources = [];
  const pattern = /<script\b[^>]*\bsrc=(["'])([^"']+)\1[^>]*>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    sources.push(match[2]);
  }
  return sources;
}

function canonicalAssetPath(source) {
  return String(source)
    .split('#', 1)[0]
    .split('?', 1)[0]
    .replace(/^\.\//, '');
}

function assertPublicCatalogScriptChain(html, pageName) {
  const sources = extractScriptSources(html).map(canonicalAssetPath);
  const positions = PUBLIC_CATALOG_CHAIN.map((assetPath) => sources.indexOf(assetPath));

  PUBLIC_CATALOG_CHAIN.forEach((assetPath, index) => {
    assert.notStrictEqual(positions[index], -1, `${pageName} must load ${assetPath}`);
    assert.strictEqual(
      sources.filter((source) => source === assetPath).length,
      1,
      `${pageName} must load ${assetPath} exactly once`
    );
  });

  assert(
    positions[0] < positions[1] && positions[1] < positions[2],
    `${pageName} must load public catalog scripts in repository -> service -> card order`
  );
}

function cacheKeyAgnosticContract() {
  const fixture = [
    '<script src="assets/js/repositories/services-repository.js?v=repo-a"></script>',
    '<script src="assets/js/services/services-service.js?v=service-b#ready"></script>',
    '<script src="./assets/js/components/public-service-card.js?v=card-c"></script>'
  ].join('');

  assertPublicCatalogScriptChain(fixture, 'cache-key fixture');
}

async function repositoryContract() {
  const localStorage = createStorage();
  const context = {
    console,
    Promise,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    localStorage,
    window: null
  };
  context.window = context;
  context.Doke = { repositories: {}, services: {}, session: { getCurrentUser: () => ({ id: 'client-b' }) } };
  vm.createContext(context);
  vm.runInContext(read('assets/js/repositories/services-repository.js'), context, { filename: 'services-repository.js' });
  const repo = context.Doke.repositories.services;
  assert(repo, 'services repository must be registered');

  await repo.save({ id: 'real-service-1', ownerId: 'professional-a', status: 'active', title: 'Serviço real' });
  context.Doke.session.getCurrentUser = () => ({ id: 'client-b' });
  const visible = await repo.list({ status: 'active', fresh: true });
  assert.strictEqual(visible.length, 1, 'active service must be visible to another account');
  assert.strictEqual(visible[0].id, 'real-service-1');
  assert.strictEqual((await repo.getById('real-service-1')).ownerId, 'professional-a');

  await repo.update('real-service-1', { status: 'inactive' });
  assert.strictEqual((await repo.list({ status: 'active', fresh: true })).length, 0, 'inactive service must leave public discovery');
}

function sourceContract() {
  assert.deepStrictEqual(JSON.parse(read('assets/data/mock-services.json')), []);
  assert.deepStrictEqual(JSON.parse(read('assets/data/mocks/marketplace/services.json')), []);

  const searchData = read('assets/js/pages/search-data.js');
  assert(searchData.includes('const servicePool = [];'), 'search service pool must start empty');

  const index = read('index.html');
  const results = read('resultados.html');
  const detail = read('detalhe-anuncio.html');

  cacheKeyAgnosticContract();
  assertPublicCatalogScriptChain(index, 'index.html');
  assertPublicCatalogScriptChain(results, 'resultados.html');

  assert(index.includes('home/public-services.js?v=20260719-home-first-load-v1'));
  assert(index.includes('index-data-controller.js?v=20260719-home-first-load-v1'));
  assert(index.indexOf('home-search-hero doke-page-section') < index.indexOf('data-home-hydration-skeleton'), 'search must render before the recommendation skeleton');
  assert(index.indexOf('home-catégories doke-page-section') < index.indexOf('data-home-hydration-skeleton'), 'categories must render before the recommendation skeleton');
  assert(!index.includes('<article class="doke-ad-card'), 'home must not ship static example ads');
  assert(!detail.includes('<article class="doke-ad-card'), 'detail must not ship static similar example ads');
  assert(detail.includes('data-similar-services-section hidden'));

  const repo = read('assets/js/repositories/services-repository.js');
  assert(!repo.includes('mock-services.json'), 'services repository must not merge demo services');
  const provider = read('assets/js/services/mock-repository-provider.js');
  assert(provider.includes("if (resource === 'services')"), 'page-data provider must delegate services to domain repository');

  const detailExperience = read('assets/js/pages/detail-ad-experience.js');
  assert(!detailExperience.includes('service-reforma-banheiro-premium'));
  const router = read('assets/js/core/stable-shell-router.js');
  assert(!router.includes("|| 'service-reforma-banheiro-premium'"));
}

(async () => {
  sourceContract();
  await repositoryContract();
  console.log('Public service catalog contract: PASS');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
