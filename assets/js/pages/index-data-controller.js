(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'index';
  var hydrationRoot = null;
  var hydration = null;
  var railStateRoot = null;
  var railStateController = null;
  var serviceRefreshFlight = null;
  var HOME_DATA_TIMEOUT_MS = 6500;
  var HOME_CATALOG_BOOT_TIMEOUT_MS = 5200;

  function withTimeout(promise, timeoutMs, label) {
    var timer = 0;
    return Promise.race([
      Promise.resolve(promise),
      new Promise(function (_, reject) {
        timer = window.setTimeout(function () {
          var error = new Error((label || 'Operação') + ' excedeu o tempo limite.');
          error.code = 'DOKE_HOME_TIMEOUT';
          reject(error);
        }, Math.max(1000, Number(timeoutMs) || HOME_DATA_TIMEOUT_MS));
      })
    ]).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  function sanitizeErrorCode(error, fallback) {
    if (isOffline()) return 'DOKE_HOME_OFFLINE';
    var candidate = error?.code || fallback;
    var normalized = String(candidate || 'DOKE_HOME_FAILED').trim().toUpperCase();
    return normalized.replace(/[^A-Z0-9_:-]/g, '').slice(0, 96) || 'DOKE_HOME_FAILED';
  }

  function outcome(ok, data, source, errorCode) {
    return Object.freeze({
      ok: Boolean(ok),
      data: data,
      source: String(source || 'unknown'),
      errorCode: errorCode ? sanitizeErrorCode({ code: errorCode }, 'DOKE_HOME_FAILED') : ''
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
    if (!servicesApi || typeof servicesApi.list !== 'function') {
      return Promise.resolve(outcome(false, [], 'canonical-remote', 'DOKE_HOME_CATALOG_UNAVAILABLE'));
    }

    return waitForSupabaseBootstrap().then(function (bootstrapState) {
      if (bootstrapState === 'unavailable' || bootstrapState === 'timeout') {
        var bootstrapError = new Error('Public catalog bootstrap unavailable.');
        bootstrapError.code = bootstrapState === 'timeout'
          ? 'DOKE_HOME_CATALOG_BOOT_TIMEOUT'
          : 'DOKE_HOME_CATALOG_BOOT_UNAVAILABLE';
        throw bootstrapError;
      }

      var repository = Doke.repositories && Doke.repositories.services;
      if (repository && typeof repository.clearCache === 'function') repository.clearCache();
      return withTimeout(
        servicesApi.list({ status: 'active', limit: context.serviceLimit, sort: 'updated_desc', fresh: true }),
        HOME_CATALOG_BOOT_TIMEOUT_MS,
        'Catálogo público de serviços'
      );
    }).then(function (services) {
      return outcome(true, Array.isArray(services) ? services : [], 'canonical-remote');
    }).catch(function (error) {
      var code = sanitizeErrorCode(error, 'DOKE_HOME_CATALOG_FAILED');
      console.warn('[Doke:index:authoritative-services]', code);
      return outcome(false, [], 'canonical-remote', code);
    });
  }

  function loadOrchestratedData(context) {
    return withTimeout(
      Doke.pageDataOrchestrator.getPageData(PAGE_NAME, context, { maxAge: 45 * 1000 }),
      HOME_DATA_TIMEOUT_MS,
      'Carregamento da página inicial'
    ).then(function (payload) {
      return outcome(true, normalizePayload(payload), 'repository-boundary');
    }).catch(function (error) {
      var code = sanitizeErrorCode(error, 'DOKE_HOME_ORCHESTRATOR_FAILED');
      console.warn('[Doke:index:orchestrator]', code);
      return outcome(false, normalizePayload(null), 'repository-boundary', code);
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

  function getRailStateController(root) {
    if (!root || !Doke.homeRailState || typeof Doke.homeRailState.createController !== 'function') return null;
    if (railStateRoot === root && railStateController) return railStateController;
    railStateRoot = root;
    railStateController = Doke.homeRailState.createController({ dispatchTarget: root });
    return railStateController;
  }

  function getRoot() {
    return document.querySelector('[data-state-boundary="index"], .shell-home__workspace');
  }

  function isCurrentRoot(root) {
    return Boolean(root && root === getRoot() && root.isConnected !== false);
  }

  function getRegion(root, kind) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-home-list-region="' + kind + '"]');
  }

  function getList(root, kind) {
    if (!root || !root.querySelector) return null;
    return root.querySelector('[data-home-list="' + kind + '"]');
  }

  function getRenderedItemCount(root, kind) {
    var list = getList(root, kind);
    if (!list?.children) return 0;
    return Array.prototype.reduce.call(list.children, function (total, child) {
      if (child?.hidden ?? true) return total;
      if (child.matches?.('[data-list-loading], [data-home-rail-feedback]')) return total;
      return total + 1;
    }, 0);
  }

  function dispatch(root, name, detail) {
    var event = new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    });
    (root || document).dispatchEvent(event);
  }

  function setRootState(root, state, code) {
    if (!root || !root.dataset) return;
    root.dataset.dataState = state;
    if (code) root.dataset.dataCode = sanitizeErrorCode({ code: code }, 'DOKE_HOME_FAILED');
    else delete root.dataset.dataCode;
    delete root.dataset.dataMessage;
  }

  function regionHasStaticList(region) {
    var list = region && region.querySelector ? region.querySelector('[data-list]') : null;
    return Boolean(list && list.children && list.children.length && !region.querySelector('[data-list-loading]'));
  }

  function setRegionState(root, kind, state) {
    var region = getRegion(root, kind);
    if (!region) return;

    if (state === 'loading' && regionHasStaticList(region)) {
      region.setAttribute('aria-busy', 'true');
      if (region.dataset && region.dataset.state !== 'ready') region.dataset.state = 'idle';
      return;
    }

    if (Doke.listState && typeof Doke.listState.setListState === 'function') {
      Doke.listState.setListState(region, state);
      return;
    }

    if (region.dataset) region.dataset.state = state;
    region.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
  }

  function ensureRailFeedback(root, kind) {
    var region = getRegion(root, kind);
    if (!region?.querySelector) return null;
    var existing = region.querySelector('[data-home-rail-feedback="' + kind + '"]');
    if (existing) return existing;

    var feedback = document.createElement('div');
    feedback.className = 'doke-state-region home-rail-feedback';
    feedback.dataset.homeRailFeedback = kind;
    feedback.hidden = true;

    var status = document.createElement('p');
    status.className = 'doke-error-state';
    status.dataset.homeRailFeedbackStatus = '';
    status.setAttribute('role', 'status');

    var retry = document.createElement('button');
    retry.className = 'doke-btn doke-btn--link';
    retry.type = 'button';
    retry.textContent = 'Tentar novamente';
    retry.dataset.homeRailRetry = kind;
    retry.addEventListener('click', function () {
      retry.disabled = true;
      Promise.resolve(Doke.indexDataController.retryServices()).finally(function () {
        retry.disabled = false;
      });
    });

    feedback.appendChild(status);
    feedback.appendChild(retry);
    region.appendChild(feedback);
    return feedback;
  }

  function updateRailFeedback(root, snapshot) {
    if (!snapshot || (snapshot.id !== 'featured-services' && snapshot.id !== 'more-services')) return;
    var feedback = ensureRailFeedback(root, snapshot.id);
    if (!feedback) return;
    var status = feedback.querySelector('[data-home-rail-feedback-status]');
    var show = snapshot.dataState === 'error' || snapshot.freshnessState === 'stale';
    feedback.hidden = !show;
    if (status) {
      var message = 'Não foi possível carregar estes anúncios.';
      if (snapshot.freshnessState === 'stale') {
        message = 'Não foi possível atualizar estes anúncios. Exibindo a última versão disponível.';
      } else if (snapshot.errorCode === 'DOKE_HOME_OFFLINE') {
        message = 'Você está offline. Conecte-se e tente novamente.';
      }
      status.textContent = message;
    }
  }

  function applyRailSnapshot(root, controller, snapshot) {
    if (!snapshot || !isCurrentRoot(root)) return snapshot;
    var region = getRegion(root, snapshot.id);
    if (!region) return snapshot;
    if (controller && typeof controller.apply === 'function') {
      controller.apply(region, snapshot, {
        afterApply: function () { updateRailFeedback(root, snapshot); }
      });
      return snapshot;
    }
    setRegionState(root, snapshot.id, snapshot.dataState);
    return snapshot;
  }

  function beginRail(root, controller, kind, options) {
    if (!controller) {
      setRegionState(root, kind, 'loading');
      return null;
    }
    var receipt = controller.begin(kind, options || {});
    applyRailSnapshot(root, controller, controller.get(kind));
    return receipt;
  }

  function commitRail(root, controller, receipt, input) {
    if (!controller || !receipt) return null;
    return applyRailSnapshot(root, controller, controller.commit(receipt, input));
  }

  function failRail(root, controller, receipt, errorCode) {
    if (!controller || !receipt) return null;
    return applyRailSnapshot(root, controller, controller.fail(receipt, errorCode, { preserveContent: true }));
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

  function renderServiceListsBeforeReveal(services) {
    var renderer = Doke.homePublicServices && Doke.homePublicServices.render;
    if (typeof renderer !== 'function') return 0;
    return renderer(Array.isArray(services) ? services : []);
  }

  function deriveServiceCollections(services) {
    if (Doke.homeRailState && typeof Doke.homeRailState.deriveServiceCollections === 'function') {
      return Doke.homeRailState.deriveServiceCollections(services);
    }
    var normalized = Array.isArray(services) ? services.slice() : [];
    return {
      all: normalized,
      featured: normalized.slice(0, 6),
      more: normalized.slice(6),
      totalCount: normalized.length,
      featuredCount: Math.min(normalized.length, 6),
      moreCount: Math.max(normalized.length - 6, 0)
    };
  }

  function editorialCounts(root) {
    return {
      workers: getRenderedItemCount(root, 'workers'),
      publications: getRenderedItemCount(root, 'publications')
    };
  }

  function commitEditorialRails(root, controller) {
    var counts = editorialCounts(root);
    ['workers', 'publications'].forEach(function (kind) {
      if (!controller) {
        setRegionState(root, kind, counts[kind] ? 'ready' : 'empty');
        return;
      }
      var receipt = controller.begin(kind);
      commitRail(root, controller, receipt, {
        itemCount: counts[kind],
        dataState: counts[kind] ? 'ready' : 'empty',
        freshnessState: 'fresh',
        visibilityState: 'visible'
      });
    });
    return counts;
  }

  function updateListHook(root, kind, resource, itemCount, source) {
    var list = getList(root, kind);
    if (!list || !list.dataset) return;
    list.dataset.list = resource;
    list.dataset.listKind = kind;
    list.dataset.itemCount = String(Math.max(0, Number(itemCount) || 0));
    list.dataset.dataSource = source;
  }

  function updateListHooks(root, serviceCollections, counts) {
    updateListHook(root, 'featured-services', 'services', serviceCollections.featuredCount, 'canonical-remote');
    updateListHook(root, 'more-services', 'services', serviceCollections.moreCount, 'canonical-remote');
    updateListHook(root, 'workers', 'workers', counts.workers, 'editorial-local');
    updateListHook(root, 'publications', 'publications', counts.publications, 'editorial-local');
  }

  function getHomeContext() {
    var params = new URLSearchParams(window.location.search || '');
    return {
      serviceLimit: Number(params.get('serviceLimit') || 18),
      workerLimit: Number(params.get('workerLimit') || 6),
      publicationLimit: Number(params.get('publicationLimit') || 6)
    };
  }

  function refreshServiceRails(root, context, options) {
    options = options || {};
    if (!root || !isCurrentRoot(root)) return Promise.resolve(null);
    if (serviceRefreshFlight && serviceRefreshFlight.root === root) return serviceRefreshFlight.promise;

    var controller = getRailStateController(root);
    var featuredReceipt = beginRail(root, controller, 'featured-services', {
      retry: Boolean(options.retry),
      preserveContent: true,
      visibilityState: 'visible'
    });
    var moreReceipt = beginRail(root, controller, 'more-services', {
      retry: Boolean(options.retry),
      preserveContent: true,
      visibilityState: 'visible'
    });

    var promise = loadAuthoritativeServices(context).then(function (catalogResult) {
      if (!isCurrentRoot(root)) return null;
      if (!catalogResult.ok) {
        failRail(root, controller, featuredReceipt, catalogResult.errorCode);
        failRail(root, controller, moreReceipt, catalogResult.errorCode);
        return {
          ok: false,
          errorCode: catalogResult.errorCode,
          services: [],
          collections: deriveServiceCollections([]),
          renderedServiceCount: 0
        };
      }

      var collections = deriveServiceCollections(catalogResult.data);
      var renderedServiceCount = renderServiceListsBeforeReveal(collections.all);
      commitRail(root, controller, featuredReceipt, {
        itemCount: collections.featuredCount,
        dataState: collections.featuredCount ? 'ready' : 'empty',
        freshnessState: 'fresh',
        visibilityState: 'visible'
      });
      commitRail(root, controller, moreReceipt, {
        itemCount: collections.moreCount,
        dataState: collections.moreCount ? 'ready' : 'empty',
        freshnessState: 'fresh',
        visibilityState: collections.moreCount ? 'visible' : 'hidden-insufficient-items'
      });
      return {
        ok: true,
        errorCode: '',
        services: collections.all,
        collections: collections,
        renderedServiceCount: renderedServiceCount
      };
    }).finally(function () {
      if (serviceRefreshFlight?.promise === promise) serviceRefreshFlight = null;
    });

    serviceRefreshFlight = { root: root, promise: promise };
    return promise;
  }

  function resolveRootState(hasItems, remoteAccepted) {
    if (hasItems) return 'ready';
    if (remoteAccepted) return 'empty';
    return isOffline() ? 'offline' : 'error';
  }

  function publishRootExperience(root, state, code) {
    setRootState(root, state, code);
    if (Doke.experience && Doke.experience.states) {
      Doke.experience.states.set(root, state, { page: PAGE_NAME, code: code || '' });
    }
  }

  function load(root) {
    var context = getHomeContext();
    var pageHydration = getHydration(root);
    var controller = getRailStateController(root);
    pageHydration?.start();

    var counts = commitEditorialRails(root, controller);
    if (!hasDataDependencies()) {
      var missingCode = 'DOKE_HOME_DATA_DEPENDENCIES_UNAVAILABLE';
      var featuredReceipt = beginRail(root, controller, 'featured-services');
      var moreReceipt = beginRail(root, controller, 'more-services');
      failRail(root, controller, featuredReceipt, missingCode);
      failRail(root, controller, moreReceipt, missingCode);
      var hasEditorial = Boolean(counts.workers || counts.publications);
      publishRootExperience(root, hasEditorial ? 'ready' : 'error', missingCode);
      if (hasEditorial) pageHydration?.ready({ hasItems: true });
      else pageHydration?.error(new Error(missingCode), { source: 'index-data-controller' });
      return Promise.resolve(null);
    }

    var cached = typeof Doke.pageDataOrchestrator.peekPageData === 'function'
      ? Doke.pageDataOrchestrator.peekPageData(PAGE_NAME, context)
      : null;
    publishRootExperience(root, cached ? 'refreshing' : 'loading');

    var orchestratedData = loadOrchestratedData(context);
    var serviceData = refreshServiceRails(root, context, { retry: false });

    return Promise.all([orchestratedData, serviceData]).then(function (values) {
      if (!isCurrentRoot(root)) return null;
      var orchestrationResult = values[0];
      var serviceResult = values[1] || {
        ok: false,
        errorCode: 'DOKE_HOME_CATALOG_CANCELLED',
        services: [],
        collections: deriveServiceCollections([]),
        renderedServiceCount: 0
      };
      counts = commitEditorialRails(root, controller);
      updateListHooks(root, serviceResult.collections, counts);

      var hasItems = Boolean(
        serviceResult.collections.featuredCount ||
        serviceResult.collections.moreCount ||
        counts.workers ||
        counts.publications
      );
      var acceptedEmpty = serviceResult.ok && !hasItems;
      var rootCode = serviceResult.ok ? orchestrationResult.errorCode : serviceResult.errorCode;
      var rootState = resolveRootState(hasItems, serviceResult.ok);
      publishRootExperience(root, rootState, rootCode);

      var result = {
        page: PAGE_NAME,
        context: context,
        data: {
          services: serviceResult.services,
          workers: [],
          publications: []
        },
        railCounts: Object.freeze({
          featuredServices: serviceResult.collections.featuredCount,
          moreServices: serviceResult.collections.moreCount,
          workers: counts.workers,
          publications: counts.publications
        }),
        renderedServiceCount: serviceResult.renderedServiceCount,
        partialFailures: Object.freeze([
          serviceResult.ok ? '' : 'services',
          orchestrationResult.ok ? '' : 'orchestration'
        ].filter(Boolean))
      };

      Doke.indexDataController.lastPayload = result;
      if (hasItems || acceptedEmpty) {
        dispatch(root, 'doke:index-data-ready', result);
        pageHydration?.ready({ hasItems: hasItems });
      } else {
        dispatch(root, 'doke:index-data-error', {
          page: PAGE_NAME,
          errorCode: rootCode || 'DOKE_HOME_FAILED',
          failedRails: Object.freeze(['featured-services', 'more-services'])
        });
        pageHydration?.error(new Error(rootCode || 'DOKE_HOME_FAILED'), { source: 'index-data-controller' });
      }
      return result;
    }).catch(function (error) {
      if (!isCurrentRoot(root)) return null;
      var errorCode = sanitizeErrorCode(error, 'DOKE_HOME_UNEXPECTED_FAILURE');
      publishRootExperience(root, isOffline() ? 'offline' : 'error', errorCode);
      dispatch(root, 'doke:index-data-error', {
        page: PAGE_NAME,
        errorCode: errorCode,
        failedRails: Object.freeze(['featured-services', 'more-services'])
      });
      pageHydration?.error(error, { source: 'index-data-controller' });
      return { page: PAGE_NAME, context: context, errorCode: errorCode };
    });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    return load(root);
  }

  function retryServices() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    return refreshServiceRails(root, getHomeContext(), { retry: true }).then(function (result) {
      if (!result || !isCurrentRoot(root)) return result;
      var counts = commitEditorialRails(root, getRailStateController(root));
      updateListHooks(root, result.collections, counts);
      var retryHasItems = Boolean(result.collections.featuredCount || result.collections.moreCount || counts.workers || counts.publications);
      publishRootExperience(root, resolveRootState(retryHasItems, result.ok), result.errorCode);
      return result;
    });
  }

  Doke.indexDataController = {
    page: PAGE_NAME,
    getRoot: getRoot,
    getHomeContext: getHomeContext,
    load: load,
    boot: boot,
    retryServices: retryServices,
    lastPayload: null
  };

  document.addEventListener('doke:page-data-revalidated', function (event) {
    if (!event.detail || event.detail.page !== PAGE_NAME) return;
    var root = getRoot();
    if (!root) return;
    commitEditorialRails(root, getRailStateController(root));
    refreshServiceRails(root, getHomeContext(), { retry: false }).then(function (result) {
      if (!result || !isCurrentRoot(root)) return;
      var counts = editorialCounts(root);
      updateListHooks(root, result.collections, counts);
      var revalidatedHasItems = Boolean(result.collections.featuredCount || result.collections.moreCount || counts.workers || counts.publications);
      publishRootExperience(root, resolveRootState(revalidatedHasItems, result.ok), result.errorCode);
      Doke.indexDataController.lastPayload = {
        page: PAGE_NAME,
        context: getHomeContext(),
        data: { services: result.services, workers: [], publications: [] },
        railCounts: {
          featuredServices: result.collections.featuredCount,
          moreServices: result.collections.moreCount,
          workers: counts.workers,
          publications: counts.publications
        },
        renderedServiceCount: result.renderedServiceCount,
        source: 'stale-while-revalidate'
      };
      dispatch(root, 'doke:index-data-ready', Doke.indexDataController.lastPayload);
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
