(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'index';
  var hydrationRoot = null;
  var hydration = null;
  var HOME_DATA_TIMEOUT_MS = 6500;
  var HOME_CATALOG_BOOT_TIMEOUT_MS = 5200;

  function withTimeout(promise, timeoutMs, label) {
    var timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise(function (_, reject) {
        timer = window.setTimeout(function () {
          reject(new Error((label || 'Operação') + ' excedeu o tempo limite.'));
        }, Math.max(1000, Number(timeoutMs) || HOME_DATA_TIMEOUT_MS));
      })
    ]).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function waitForSupabaseBootstrap() {
    var config = window.DOKE_SUPABASE_CONFIG || {};
    if (!config.enabled || config.servicesEnabled === false) return Promise.resolve('disabled');
    if (window.supabase && typeof window.supabase.createClient === 'function') return Promise.resolve('ready');

    return new Promise(function (resolve) {
      var settled = false;
      var timer = 0;

      function finish(state) {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        document.removeEventListener('doke:supabase-sdk-ready', onReady);
        document.removeEventListener('doke:supabase-sdk-unavailable', onUnavailable);
        resolve(state);
      }

      function onReady() { finish('ready'); }
      function onUnavailable() { finish('unavailable'); }

      document.addEventListener('doke:supabase-sdk-ready', onReady, { once: true });
      document.addEventListener('doke:supabase-sdk-unavailable', onUnavailable, { once: true });
      timer = window.setTimeout(function () { finish('timeout'); }, HOME_CATALOG_BOOT_TIMEOUT_MS);
    });
  }

  function loadAuthoritativeServices(context) {
    var servicesApi = Doke.services && Doke.services.services;
    if (!servicesApi || typeof servicesApi.list !== 'function') return Promise.resolve([]);

    return waitForSupabaseBootstrap().then(function () {
      var repository = Doke.repositories && Doke.repositories.services;
      if (repository && typeof repository.clearCache === 'function') repository.clearCache();
      return withTimeout(
        servicesApi.list({ status: 'active', limit: context.serviceLimit, sort: 'updated_desc', fresh: true }),
        HOME_CATALOG_BOOT_TIMEOUT_MS,
        'Catálogo público de serviços'
      );
    }).then(function (services) {
      return Array.isArray(services) ? services : [];
    }).catch(function (error) {
      console.warn('[Doke:index:authoritative-services]', error);
      return [];
    });
  }

  function loadSafeFallbackData(context) {
    return loadAuthoritativeServices(context).then(function (services) {
      return { services: services, workers: [], publications: [] };
    });
  }

  function getHydration(root) {
    if (!root || !window.DokePageHydration?.create) return null;
    if (hydrationRoot === root && hydration) return hydration;
    hydrationRoot = root;
    hydration = window.DokePageHydration.create({
      page: PAGE_NAME,
      root: root,
      skeletonSelectors: '[data-home-hydration-skeleton]',
      readySelectors: '[data-home-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'hard-load',
      readyPolicy: 'internal-immediate',
      preserveReadyDuringHydration: true,
      maxDuration: 9000
    });
    return hydration;
  }

  function getRoot() {
    // The body is preserved by the stable-shell router. Using it as the
    // hydration root would reuse the already-completed hydration instance
    // when the home DOM is replaced, leaving the new ready surfaces hidden.
    // The page boundary is replaced on every route commit and therefore is
    // the correct lifecycle root for a fresh home hydration.
    return document.querySelector('[data-state-boundary="index"], .shell-home__workspace');
  }

  function getRegion(root, kind) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-home-list-region="' + kind + '"]');
  }

  function getList(root, kind) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-home-list="' + kind + '"]');
  }

  function dispatch(root, name, detail) {
    var event = new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    });

    (root || document).dispatchEvent(event);
  }

  function setRootState(root, state, message) {
    if (!root || !root.dataset) return;
    root.dataset.dataState = state;
    if (message) root.dataset.dataMessage = message;
    else delete root.dataset.dataMessage;
  }

  function regionHasStaticList(region) {
    var list = region && region.querySelector ? region.querySelector('[data-list]') : null;
    return Boolean(list && list.children && list.children.length && !region.querySelector('[data-list-loading]'));
  }

  function setRegionState(root, kind, state, message) {
    var region = getRegion(root, kind);
    if (!region) return;

    if (state === 'loading' && regionHasStaticList(region)) {
      region.setAttribute('aria-busy', 'true');
      if (region.dataset && region.dataset.state !== 'ready') region.dataset.state = 'idle';
      return;
    }

    if (Doke.listState && typeof Doke.listState.setListState === 'function') {
      Doke.listState.setListState(region, state, message ? { message: message } : {});
      return;
    }

    if (region.dataset) region.dataset.state = state;
    region.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  function hasDataDependencies() {
    return Boolean(
      Doke.pageDataOrchestrator &&
      typeof Doke.pageDataOrchestrator.getPageData === 'function' &&
      Doke.repositoryBoundary &&
      typeof Doke.repositoryBoundary.getRegisteredProviders === 'function'
    );
  }

  function normalizePayload(payload) {
    var data = payload || {};
    return {
      services: Array.isArray(data.services) ? data.services : [],
      workers: Array.isArray(data.workers) ? data.workers : [],
      publications: Array.isArray(data.publications) ? data.publications : []
    };
  }

  function updateListHooks(root, data) {
    var sections = [
      { kind: 'featured-services', resource: 'services', items: data.services },
      { kind: 'recommended-services', resource: 'services', items: data.services },
      { kind: 'more-services', resource: 'services', items: data.services },
      { kind: 'workers', resource: 'workers', items: data.workers },
      { kind: 'publications', resource: 'publications', items: data.publications }
    ];

    sections.forEach(function (section) {
      var list = getList(root, section.kind);
      if (!list || !list.dataset) return;

      list.dataset.list = section.resource;
      list.dataset.listKind = section.kind;
      list.dataset.itemCount = String(section.items.length);
      list.dataset.dataSource = 'repository-boundary';
    });
  }

  function getHomeContext() {
    var params = new URLSearchParams(window.location.search || '');
    return {
      serviceLimit: Number(params.get('serviceLimit') || 18),
      workerLimit: Number(params.get('workerLimit') || 6),
      publicationLimit: Number(params.get('publicationLimit') || 6)
    };
  }

  function load(root) {
    var context = getHomeContext();
    var pageHydration = getHydration(root);
    pageHydration?.start();

    if (!hasDataDependencies()) {
      setRootState(root, 'idle', 'data-dependencies-not-loaded');
      ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
        setRegionState(root, kind, 'idle');
      });
      pageHydration?.ready({ hasItems: true });
      return Promise.resolve(null);
    }

    var cached = typeof Doke.pageDataOrchestrator.peekPageData === 'function'
      ? Doke.pageDataOrchestrator.peekPageData(PAGE_NAME, context)
      : null;
    var initialState = cached ? 'refreshing' : 'loading';

    setRootState(root, initialState);
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(root, initialState, { page: PAGE_NAME });
    }

    ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
      if (cached) {
        var region = getRegion(root, kind);
        if (region) region.setAttribute('aria-busy', 'true');
        return;
      }
      setRegionState(root, kind, 'loading');
    });

    var orchestratedData = withTimeout(
      Doke.pageDataOrchestrator.getPageData(PAGE_NAME, context, { maxAge: 45 * 1000 }),
      HOME_DATA_TIMEOUT_MS,
      'Carregamento da página inicial'
    ).catch(function (error) {
      console.warn('[Doke:index:data-timeout]', error);
      return { services: [], workers: [], publications: [] };
    });

    var authoritativeServices = loadAuthoritativeServices(context);

    return Promise.all([orchestratedData, authoritativeServices])
      .then(function (values) {
        var data = normalizePayload(values[0]);
        if (Array.isArray(values[1])) data.services = values[1];
        var result = {
          page: PAGE_NAME,
          context: context,
          data: data
        };

        var hasItems = Boolean(data.services.length || data.workers.length || data.publications.length);
        setRootState(root, hasItems ? 'ready' : 'empty');
        if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, hasItems ? 'ready' : 'empty', { page: PAGE_NAME });
        setRegionState(root, 'featured-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'recommended-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'more-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'workers', data.workers.length ? 'ready' : 'empty');
        setRegionState(root, 'publications', data.publications.length ? 'ready' : 'empty');
        updateListHooks(root, data);
        Doke.indexDataController.lastPayload = result;
        dispatch(root, 'doke:index-data-ready', result);
        pageHydration?.ready({ hasItems: hasItems });
        return result;
      })
      .catch(function (error) {
        var detail = {
          page: PAGE_NAME,
          context: context,
          error: error && error.message ? error.message : 'Erro ao preparar dados da home.'
        };

        setRootState(root, 'error', detail.error);
        if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, navigator.onLine === false ? 'offline' : 'error', { page: PAGE_NAME, error: detail.error });
        ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
          setRegionState(root, kind, 'error', detail.error);
        });
        dispatch(root, 'doke:index-data-error', detail);
        pageHydration?.error(error, { source: 'index-data-controller' });
        return detail;
      });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    return load(root);
  }

  Doke.indexDataController = {
    page: PAGE_NAME,
    getRoot: getRoot,
    getHomeContext: getHomeContext,
    load: load,
    boot: boot,
    lastPayload: null
  };

  document.addEventListener('doke:page-data-revalidated', function (event) {
    if (!event.detail || event.detail.page !== PAGE_NAME) return;
    var root = getRoot();
    if (!root) return;
    var data = normalizePayload(event.detail.data);
    setRootState(root, 'ready');
    if (Doke.experience && Doke.experience.states) Doke.experience.states.set(root, data.services.length || data.workers.length || data.publications.length ? 'ready' : 'empty', { page: PAGE_NAME, source: 'stale-while-revalidate' });
    ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
      var region = getRegion(root, kind);
      if (region) region.setAttribute('aria-busy', 'false');
    });
    updateListHooks(root, data);
    Doke.indexDataController.lastPayload = {
      page: PAGE_NAME,
      context: getHomeContext(),
      data: data,
      source: 'stale-while-revalidate'
    };
    dispatch(root, 'doke:index-data-ready', Doke.indexDataController.lastPayload);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
