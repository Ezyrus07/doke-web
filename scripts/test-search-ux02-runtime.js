'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = (path) => fs.readFileSync(path, 'utf8');
const card = read('assets/js/components/public-service-card.js');
const interactions = read('assets/js/components/ad-card-interactions.js');
const surface = read('assets/js/pages/search/server-results-surface.js');
const homePublicServices = read('assets/js/pages/home/public-services.js');
const homeFavorites = read('assets/js/pages/home/favorites-surface.js');
const profileFavorites = read('assets/js/pages/profile/favorites-surface.js');
const homeManifest = read('assets/css/pages/home.css');
const homeFavoritesCss = read('assets/css/pages/home/favorites.css');
const favoriteActionCss = read('assets/css/components/actions/favorite-action.css');
const migration = read('supabase/migrations/20260729143000_service_search_intent_recovery_v1.sql');
const noMatchFix = read('supabase/migrations/20260729144500_service_search_intent_no_match_fix.sql');

// Parse all changed browser files before checking their contracts.
new vm.Script(card, { filename: 'public-service-card.js' });
new vm.Script(interactions, { filename: 'ad-card-interactions.js' });
new vm.Script(surface, { filename: 'server-results-surface.js' });
new vm.Script(homePublicServices, { filename: 'home-public-services.js' });
new vm.Script(homeFavorites, { filename: 'home-favorites-surface.js' });
new vm.Script(profileFavorites, { filename: 'profile-favorites-surface.js' });

assert(
  card.includes('service.serviceId || service.remoteId || service.remote_id || service.id'),
  'Rendered cards must prefer the canonical service UUID fields.'
);
assert(
  card.includes('favorite.dataset.favoriteServiceId = canonicalId'),
  'Favorite buttons must receive the canonical UUID.'
);
assert(
  card.includes('function initialFavoriteState(serviceId)') &&
    card.includes("favoriteState.active ? ' is-active' : ''") &&
    card.includes("favorite.setAttribute('aria-pressed', String(favoriteState.active))"),
  'Cards must paint the known canonical favorite state before hydration.'
);
assert(
  card.includes("options.favoritePreview ? ' doke-ad-card--favorite-preview' : ''"),
  'Home favorites must opt into a dedicated compact card modifier.'
);
assert(
  interactions.includes('resolveCanonicalFavoriteId'),
  'Legacy/public card identifiers must resolve before favorite mutation.'
);
assert(
  interactions.includes("operation: 'resolve-service-id'"),
  'Favorite identifier failures must be observable.'
);
assert(
  surface.includes("? 'Outros anúncios'"),
  'Empty direct searches must render an explicit recommendation heading.'
);
assert(
  surface.includes('queryWithEditorialFallback'),
  'Fallback recommendations must be requested through the search service.'
);
assert(
  surface.includes("var fallbackRequest = buildRequest('', context.filters, '')"),
  'Fallback must preserve filters and use an empty server-side catalog query.'
);
assert(
  homePublicServices.includes('ensureHomeFavoritesModule') &&
    homePublicServices.includes('assets/js/pages/home/favorites-surface.js'),
  'The home services boundary must load the dedicated favorites surface.'
);
assert(
  homeFavorites.includes('function ensureSurface()') &&
    homeFavorites.includes("workspace.querySelector('.professional-showcase')") &&
    homeFavorites.includes('services.slice(0, 6)'),
  'Home favorites must create a bounded preview before the professional showcase.'
);
assert(
  homeFavorites.includes('canonicalIds(item)') &&
    homeFavorites.includes('Doke.publicServiceCard.create(item, { favoritePreview: true })'),
  'Home favorites must reconcile identifiers and render the compact card variant.'
);
assert(
  homeFavorites.includes('home-favorites__count') &&
    homeFavorites.includes("services.length === 1 ? ' favorito' : ' favoritos'"),
  'The home favorites action must expose a separated accessible total.'
);
assert(
  homeManifest.includes('./home/favorites.css?v=20260729-search-ux02-v1'),
  'The home manifest must load the dedicated favorites composition.'
);
assert(
  homeFavoritesCss.includes('grid-auto-flow: column') &&
    homeFavoritesCss.includes('.doke-ad-card--favorite-preview') &&
    homeFavoritesCss.includes('grid-auto-columns: minmax(292px, 340px)'),
  'Home favorites must use a compact horizontal rail instead of a full-width card.'
);
assert(
  !favoriteActionCss.includes('dokeFavoritePop') &&
    !favoriteActionCss.includes('animation:'),
  'Favorite hydration must not replay a pop animation or create a blinking heart.'
);
assert(
  profileFavorites.includes('function ensurePlacement()') &&
    profileFavorites.includes('feed.appendChild(section)') &&
    profileFavorites.includes('nav.appendChild(tab)'),
  'Favorites must become the last profile tab and content area.'
);
assert(
  profileFavorites.includes('serviceIdentifiers(item)'),
  'Profile favorites must reconcile canonical and public service identifiers.'
);
assert(
  migration.includes('create extension if not exists pg_trgm with schema extensions'),
  'Bounded typo recovery requires pg_trgm in the extensions schema.'
);
assert(
  migration.includes('private.search_public_services_v2_core'),
  'The closed v2 implementation must remain isolated as the core authority.'
);
assert(
  migration.includes('prefix_synonym_or_typo_recovery'),
  'The response must identify recovered intent.'
);
assert(
  noMatchFix.includes("'mode', 'no_match'"),
  'Unsuccessful expansion must remain an explicit no-match outcome.'
);
assert(
  !migration.includes('views_count') && !migration.includes('contacts_count'),
  'Intent recovery must not introduce manipulable behavioral ranking signals.'
);

function validateCanonicalCardIdRuntime() {
  const sandbox = {
    window: { Doke: {} },
    document: {
      addEventListener() {},
      createElement() { return {}; },
      createElementNS() { return { setAttribute() {}, appendChild() {} }; }
    },
    console,
    Date,
    Math
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(card, sandbox, { filename: 'public-service-card.js' });

  const uuid = 'c93c3f09-b3cb-4365-bd6e-d681e846c611';
  const resolved = sandbox.window.Doke.publicServiceCard.canonicalServiceId({
    id: 'service_public_id',
    serviceId: uuid
  });
  assert.strictEqual(resolved, uuid, 'Card runtime must choose serviceId over the public external ID.');
}

async function validateFallbackRuntime() {
  const requests = [];
  const appended = [];
  const renderedEvents = [];
  const Doke = {
    services: {
      search: {
        getContract() {
          return {
            expectedAuthority: 'public.search_public_services_v2',
            version: '2.0.0',
            transport: 'edge-v2'
          };
        },
        queryPage(request) {
          requests.push(JSON.parse(JSON.stringify(request)));
          if (request.query) {
            return Promise.resolve({
              authority: 'public.search_public_services_v2',
              contractVersion: '2.0.0',
              ranking: { version: 'search-rank-v0' },
              items: [],
              page: { hasNext: false, nextCursor: null }
            });
          }
          return Promise.resolve({
            authority: 'public.search_public_services_v2',
            contractVersion: '2.0.0',
            ranking: { version: 'search-rank-v0' },
            items: [{ serviceId: 'c93c3f09-b3cb-4365-bd6e-d681e846c611', title: 'Limpeza' }],
            page: { hasNext: false, nextCursor: null }
          });
        }
      }
    }
  };
  const sandbox = {
    window: { Doke },
    document: {
      dispatchEvent(event) { renderedEvents.push(event); }
    },
    CustomEvent: class CustomEvent {
      constructor(name, init) { this.type = name; this.detail = init && init.detail; }
    },
    console,
    Promise,
    Set,
    Object,
    JSON,
    String,
    Number,
    Boolean,
    Array
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(surface, sandbox, { filename: 'server-results-surface.js' });

  const title = { textContent: '' };
  const description = { textContent: '' };
  const count = { textContent: '' };
  const grid = {
    hidden: false,
    textContent: '',
    appendChild(node) { appended.push(node); }
  };
  let visibleState = '';
  const context = {
    query: 'termo inexistente',
    filters: {},
    grid,
    title,
    description,
    count,
    inlineEmpty: { hidden: false },
    createCard(item) { return { item }; },
    setResultsState(state) { visibleState = state; },
    settleHydration() {},
    refreshPreviews() {},
    renderActiveChips() {},
    loadMoreButton: {
      disabled: false,
      hidden: false,
      dataset: {},
      setAttribute() {}
    },
    pagination: { hidden: false }
  };

  const result = await sandbox.window.Doke.searchResultsServerSurface.render(context);
  assert.deepStrictEqual(requests.map((request) => request.query), ['termo inexistente', '']);
  assert.strictEqual(result.length, 1, 'Fallback must return the server catalog page.');
  assert.strictEqual(appended.length, 1, 'Fallback card must be rendered once.');
  assert.strictEqual(title.textContent, 'Outros anúncios');
  assert(description.textContent.includes('Nenhum anúncio correspondeu exatamente'));
  assert.strictEqual(visibleState, 'results');
  assert.strictEqual(sandbox.window.Doke.searchResultsServerSurface.getSnapshot().mode, 'fallback');
  assert(renderedEvents.some((event) => event.type === 'doke:search-server-page-rendered' && event.detail.fallbackUsed === true));
}

(async () => {
  validateCanonicalCardIdRuntime();
  await validateFallbackRuntime();
  console.log('SEARCH-UX02 runtime and migration contracts passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
