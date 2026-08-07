'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = (path) => fs.readFileSync(path, 'utf8');
const card = read('assets/js/components/public-service-card.js');
const interactions = read('assets/js/components/ad-card-interactions.js');
const SURFACE_PATH = 'assets/js/pages/search/server-results-surface.js';
const surface = read(SURFACE_PATH);
const surfaceModulePath = require.resolve('../assets/js/pages/search/server-results-surface.js');
const homePublicServices = read('assets/js/pages/home/public-services.js');
const homeFavorites = read('assets/js/pages/home/favorites-surface.js');
const profileFavorites = read('assets/js/pages/profile/favorites-surface.js');
const accountAccess = read('assets/js/services/account-access-service.js');
const homeManifest = read('assets/css/pages/home.css');
const homeFavoritesCss = read('assets/css/pages/home/favorites.css');
const favoriteActionCss = read('assets/css/components/actions/favorite-action.css');
const migration = read('supabase/migrations/20260729143000_service_search_intent_recovery_v1.sql');
const noMatchFix = read('supabase/migrations/20260729144500_service_search_intent_no_match_fix.sql');

[
  [card, 'public-service-card.js'],
  [interactions, 'ad-card-interactions.js'],
  [surface, 'server-results-surface.js'],
  [homePublicServices, 'home-public-services.js'],
  [homeFavorites, 'home-favorites-surface.js'],
  [profileFavorites, 'profile-favorites-surface.js'],
  [accountAccess, 'account-access-service.js']
].forEach(([source, filename]) => new vm.Script(source, { filename }));

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
  interactions.includes('resolveCanonicalFavoriteId') &&
    interactions.includes("operation: 'resolve-service-id'"),
  'Legacy/public card identifiers must resolve observably before mutation.'
);

assert(
  surface.includes("? 'Outros anúncios'") &&
    surface.includes('queryWithEditorialFallback') &&
    surface.includes("var fallbackRequest = buildRequest('', context.filters, '')"),
  'Empty searches must use an explicit server-authoritative editorial fallback.'
);

assert(
  homePublicServices.includes('ensureHomeFavoritesModule') &&
    homePublicServices.includes('assets/js/pages/home/favorites-surface.js'),
  'The home services boundary must load the dedicated favorites surface.'
);
assert(
  homeFavorites.includes('function ensureSurface()'),
  'Home favorites must expose a dedicated surface boundary.'
);
assert(
  homeFavorites.includes("workspace.querySelector('.professional-showcase')"),
  'Home favorites must anchor placement against the professional showcase.'
);
assert(
  homeFavorites.includes('function buildPreviewNodes(items)'),
  'Home favorites must use an explicit bounded-preview builder.'
);
assert(
  homeFavorites.includes('var preview = items.slice(0, 6)'),
  'Home favorites must cap the preview at six services.'
);
assert(
  homeFavorites.includes('anchor.parentNode.insertBefore(section, anchor)'),
  'Home favorites must render before the professional showcase.'
);
assert(
  homeFavorites.includes('canonicalIds(item)') &&
    homeFavorites.includes('Doke.publicServiceCard.create(item)') &&
    !homeFavorites.includes('favoritePreview: true') &&
    !homeFavorites.includes('service-grid--compact'),
  'Home favorites must reuse the canonical card without a private anatomy or inherited service grid.'
);
assert(
  homeFavorites.includes('home-favorites__count'),
  'Home favorites must expose a visible total element.'
);
assert(
  homeFavorites.includes('function updateCount(ui, count)'),
  'Home favorites must centralize count publication.'
);
assert(
  homeFavorites.includes("total === 1 ? ' favorito' : ' favoritos'"),
  'Home favorites must preserve singular and plural count labels.'
);
assert(
  homeFavorites.includes("ui.count.setAttribute('aria-label'"),
  'Home favorites must publish the total through an accessible label.'
);
assert(
  homeManifest.includes('./home/favorites.css?v=20260729-search-ux02-v2') &&
    homeManifest.includes('.account-onboarding__actions') &&
    homeManifest.includes('@media (max-width: 620px)') &&
    homeManifest.trim().endsWith('}'),
  'The complete home manifest must be preserved and load the current favorites composition.'
);
assert(
  homeFavoritesCss.includes('font-size: 0.9rem') &&
    homeFavoritesCss.includes('letter-spacing: 0.14em') &&
    homeFavoritesCss.includes('text-transform: uppercase') &&
    homeFavoritesCss.includes('grid-template-columns: none') &&
    homeFavoritesCss.includes('grid-auto-columns: minmax(292px, 340px)') &&
    !homeFavoritesCss.includes('.doke-ad-card__body') &&
    !homeFavoritesCss.includes('.doke-ad-card__media'),
  'Favorites must follow the canonical home title and must not own advertisement card anatomy.'
);
assert(
  !favoriteActionCss.includes('dokeFavoritePop') &&
    !favoriteActionCss.includes('animation:'),
  'Favorite hydration must not replay a pop animation or create a blinking heart.'
);

assert(
  profileFavorites.includes('function ensurePlacement()') &&
    profileFavorites.includes('feed.appendChild(section)') &&
    profileFavorites.includes('nav.appendChild(tab)') &&
    profileFavorites.includes('serviceIdentifiers(item)'),
  'Favorites must remain the last profile tab and reconcile canonical/public identifiers.'
);
assert(
  accountAccess.includes('function refreshCanonicalSession()') &&
    accountAccess.includes("auth.refreshSession({ silent: true })") &&
    accountAccess.includes('return refreshCanonicalSession().then(function ()') &&
    accountAccess.includes("setGuardState('allowed')"),
  'Owner guards must refresh the canonical session before denying access or leaving hydration pending.'
);

assert(
  migration.includes('create extension if not exists pg_trgm with schema extensions') &&
    migration.includes('private.search_public_services_v2_core') &&
    migration.includes('prefix_synonym_or_typo_recovery'),
  'Bounded intent recovery must preserve the closed search authority.'
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
  const controller = {
    run(intent, executor) {
      return Promise.resolve(executor({
        intent,
        generation: 1,
        signal: { aborted: false },
        operation: intent.operation
      })).then((value) => ({ applied: true, status: 'applied', value }));
    },
    cancel() {},
    getSnapshot() {
      return { initialInFlight: false, paginationInFlight: false, retryAvailable: false };
    }
  };
  const Doke = {
    searchExperience: {
      version: '20260804-ux-search-001-v1',
      operations: { INITIAL: 'initial', PAGINATION: 'pagination', RETRY: 'retry' },
      createController() { return controller; },
      replaceUrl() { return ''; }
    },
    searchResultsAuthorityPilot: {
      version: '20260804-ux-search-001-results-v1',
      init() {}
    },
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
  const runtimeWindow = { Doke };
  runtimeWindow.window = runtimeWindow;
  const runtimeDocument = {
    currentScript: null,
    baseURI: 'https://doke.local/resultados.html',
    scripts: [],
    styleSheets: [],
    querySelector(selector) {
      return selector.startsWith('link[') ? {} : null;
    },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent(event) { renderedEvents.push(event); }
  };
  class RuntimeCustomEvent {
    constructor(name, init) {
      this.type = name;
      this.detail = init?.detail;
    }
  }

  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousCustomEvent = global.CustomEvent;
  delete require.cache[surfaceModulePath];
  global.window = runtimeWindow;
  global.document = runtimeDocument;
  global.CustomEvent = RuntimeCustomEvent;

  try {
    require(surfaceModulePath);

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

    const result = await runtimeWindow.Doke.searchResultsServerSurface.render(context);
    assert.deepStrictEqual(requests.map((request) => request.query), ['termo inexistente', '']);
    assert.strictEqual(result.length, 1, 'Fallback must return the server catalog page.');
    assert.strictEqual(appended.length, 1, 'Fallback card must be rendered once.');
    assert.strictEqual(title.textContent, 'Outros anúncios');
    assert(description.textContent.includes('Nenhum anúncio correspondeu exatamente'));
    assert.strictEqual(visibleState, 'results');
    assert.strictEqual(runtimeWindow.Doke.searchResultsServerSurface.getSnapshot().mode, 'fallback');
    assert(renderedEvents.some((event) => event.type === 'doke:search-server-page-rendered' && event.detail.fallbackUsed === true));
  } finally {
    delete require.cache[surfaceModulePath];
    global.window = previousWindow;
    global.document = previousDocument;
    global.CustomEvent = previousCustomEvent;
  }
}

(async () => {
  validateCanonicalCardIdRuntime();
  await validateFallbackRuntime();
  console.log('SEARCH-UX02 runtime and migration contracts passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
