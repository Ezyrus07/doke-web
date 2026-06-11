(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'index';

  function getRoot() {
    return document.querySelector('[data-page="home"], .home-index-shell, .shell-home__workspace');
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

  function setRegionState(root, kind, state, message) {
    var region = getRegion(root, kind);
    if (!region) return;

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
      serviceLimit: Number(params.get('serviceLimit') || 6),
      workerLimit: Number(params.get('workerLimit') || 6),
      publicationLimit: Number(params.get('publicationLimit') || 6)
    };
  }

  function load(root) {
    var context = getHomeContext();

    if (!hasDataDependencies()) {
      setRootState(root, 'idle', 'data-dependencies-not-loaded');
      ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
        setRegionState(root, kind, 'idle');
      });
      return Promise.resolve(null);
    }

    setRootState(root, 'loading');
    ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
      setRegionState(root, kind, 'loading');
    });

    return Doke.pageDataOrchestrator
      .getPageData(PAGE_NAME, context)
      .then(function (payload) {
        var data = normalizePayload(payload);
        var result = {
          page: PAGE_NAME,
          context: context,
          data: data
        };

        setRootState(root, 'ready');
        setRegionState(root, 'featured-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'recommended-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'more-services', data.services.length ? 'ready' : 'empty');
        setRegionState(root, 'workers', data.workers.length ? 'ready' : 'empty');
        setRegionState(root, 'publications', data.publications.length ? 'ready' : 'empty');
        updateListHooks(root, data);
        Doke.indexDataController.lastPayload = result;
        dispatch(root, 'doke:index-data-ready', result);
        return result;
      })
      .catch(function (error) {
        var detail = {
          page: PAGE_NAME,
          context: context,
          error: error && error.message ? error.message : 'Erro ao preparar dados da home.'
        };

        setRootState(root, 'error', detail.error);
        ['featured-services', 'recommended-services', 'more-services', 'workers', 'publications'].forEach(function (kind) {
          setRegionState(root, kind, 'error', detail.error);
        });
        dispatch(root, 'doke:index-data-error', detail);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
