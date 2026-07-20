(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'detalhe-anuncio';
  var DEFAULT_SERVICE_ID = '';

  function getRoot() {
    return document.querySelector('[data-state-boundary="detalhe-anuncio"]')
      || document.querySelector('[data-detail-page-root]')
      || document.querySelector('[data-page="detalhe-anuncio"]');
  }

  function getServiceId(root) {
    var params = new URLSearchParams(window.location.search || '');
    var fromUrl = params.get('id') || params.get('serviceId') || params.get('servico');
    if (fromUrl) return String(fromUrl).trim();

    if (root && root.dataset && root.dataset.serviceId) {
      return String(root.dataset.serviceId).trim();
    }

    var serviceNode = root && root.querySelector && root.querySelector('[data-service-id]');
    if (serviceNode && serviceNode.dataset && serviceNode.dataset.serviceId) {
      return String(serviceNode.dataset.serviceId).trim();
    }

    return DEFAULT_SERVICE_ID;
  }

  function dispatch(root, name, detail) {
    var event = new CustomEvent(name, {
      bubbles: true,
      detail: detail || {}
    });

    (root || document).dispatchEvent(event);
  }

  function setNodeText(root, selector, value) {
    var node = root && root.querySelector && root.querySelector(selector);
    if (node && value) node.textContent = String(value);
  }

  function syncStateCopy(root, state, message) {
    if (state === 'empty') {
      setNodeText(root, '[data-detail-empty-title]', 'Anúncio não encontrado');
      setNodeText(root, '[data-detail-empty-message]', message || 'O anúncio pode ter sido removido ou o link está incompleto.');
    }
    if (state === 'error') {
      setNodeText(root, '[data-detail-error-title]', 'Não foi possível carregar o anúncio');
      setNodeText(root, '[data-detail-error-message]', message || 'Verifique sua conexão e tente novamente.');
    }
  }

  function bindRetry(root) {
    var retry = root && root.querySelector && root.querySelector('[data-detail-retry]');
    if (!retry || retry.dataset.detailRetryBound === 'true') return;
    retry.dataset.detailRetryBound = 'true';
    retry.addEventListener('click', function () {
      if (typeof window.DokeNavigate === 'function') {
        window.DokeNavigate(window.location.href, { replace: true, force: true });
        return;
      }
      window.location.reload();
    });
  }

  function setDataState(root, state, message) {
    if (!root || !root.dataset) return;
    root.dataset.dataState = state;
    if (state === 'loading') {
      root.dataset.detailLayoutState = 'data-loading';
    } else if (state === 'ready') {
      root.dataset.detailLayoutState = 'service-view';
    } else if (state === 'empty' || state === 'error') {
      root.dataset.detailLayoutState = state;
    }
    if (message) root.dataset.dataMessage = message;
    else delete root.dataset.dataMessage;
  }

  function hasDataDependencies() {
    return Boolean(
      Doke.pageDataOrchestrator &&
      typeof Doke.pageDataOrchestrator.getPageData === 'function' &&
      Doke.repositoryBoundary &&
      typeof Doke.repositoryBoundary.getRegisteredProviders === 'function'
    );
  }

  function ensureHydration(root) {
    if (!root) return null;
    if (root.__dokeDetailHydration) return root.__dokeDetailHydration;
    var hydration = window.DokePageHydration && typeof window.DokePageHydration.create === 'function'
      ? window.DokePageHydration.create({
          page: PAGE_NAME,
          root: root,
          loadingSelectors: ['[data-state-loading]'],
          emptySelectors: ['[data-state-empty]'],
          errorSelectors: ['[data-state-error]'],
          skeletonSelectors: ['[data-detail-hydration-skeleton]'],
          readySelectors: ['[data-detail-hydration-ready]'],
          skeletonMode: 'hard-load',
          readyPolicy: 'after-skeleton',
      preserveReadyDuringHydration: true,
          revealReadyOnEmpty: false,
          waitFor: ['dom', 'detail'],
          minDuration: 0,
          maxDuration: 8000,
          hasItems: function () { return root.dataset.dataState === 'ready'; }
        })
      : null;
    root.__dokeDetailHydration = hydration;
    if (hydration) {
      hydration.start();
      hydration.mark('dom');
    }
    return hydration;
  }

  function normalizePayload(payload) {
    var data = payload || {};
    return {
      service: data.service || null,
      workers: Array.isArray(data.workers) ? data.workers : [],
      publications: Array.isArray(data.publications) ? data.publications : [],
      reviews: Array.isArray(data.reviews) ? data.reviews : []
    };
  }

  function publishPayload(root, serviceId, payload, source) {
    var hydration = ensureHydration(root);
    var normalized = normalizePayload(payload);
    var state = normalized.service ? 'ready' : 'empty';
    var emptyMessage = serviceId
      ? 'Este anúncio não existe mais, foi removido ou não está disponível para esta conta.'
      : 'O link do anúncio não contém um identificador válido.';
    var result = {
      page: PAGE_NAME,
      serviceId: serviceId,
      data: normalized,
      source: source || 'repository',
      emptyReason: normalized.service ? '' : (serviceId ? 'not-found' : 'missing-id')
    };
    syncStateCopy(root, state, emptyMessage);
    setDataState(root, state);
    Doke.detailAdDataController.lastPayload = result;
    dispatch(root, 'doke:detail-ad-data-ready', result);
    hydration && hydration.mark('detail');
    return result;
  }

  function load(root, options) {
    options = options || {};
    var serviceId = getServiceId(root);
    var hydration = ensureHydration(root);
    bindRetry(root);

    if (!serviceId) {
      return Promise.resolve(publishPayload(root, '', { service: null }, 'missing-route-id'));
    }

    if (!hasDataDependencies()) {
      var dependencyError = new Error('As dependências do anúncio não foram carregadas.');
      syncStateCopy(root, 'error', dependencyError.message);
      setDataState(root, 'error', dependencyError.message);
      hydration && hydration.error(dependencyError, { source: 'detail-dependencies' });
      return Promise.resolve({ page: PAGE_NAME, serviceId: serviceId, error: dependencyError.message });
    }

    var hasReadyContent = root && root.dataset && (root.dataset.dataState === 'ready' || root.dataset.viewState === 'ready');
    setDataState(root, hasReadyContent ? 'refreshing' : 'loading');
    if (hasReadyContent) dispatch(root, 'doke:detail-ad-data-refreshing', { page: PAGE_NAME, serviceId: serviceId });

    return Doke.pageDataOrchestrator
      .getPageData(PAGE_NAME, { serviceId: serviceId, forceRefresh: Boolean(options.forceRefresh) })
      .then(function (payload) {
        return publishPayload(root, serviceId, payload, 'repository-or-cache');
      })
      .catch(function (error) {
        var detail = {
          page: PAGE_NAME,
          serviceId: serviceId,
          error: error && error.message ? error.message : 'Erro ao carregar dados do anúncio.'
        };

        syncStateCopy(root, 'error', detail.error);
        setDataState(root, 'error', detail.error);
        dispatch(root, 'doke:detail-ad-data-error', detail);
        hydration && hydration.error(error, { source: 'detail-controller' });
        return detail;
      });
  }

  function boot() {
    var root = getRoot();
    if (!root) return Promise.resolve(null);
    if (root.__dokeDetailBootPromise) return root.__dokeDetailBootPromise;
    if (root.__dokeDetailBootComplete) return Promise.resolve(Doke.detailAdDataController.lastPayload);
    root.__dokeDetailBootPromise = load(root).then(function (result) {
      root.__dokeDetailBootComplete = true;
      return result;
    }).finally(function () {
      root.__dokeDetailBootPromise = null;
    });
    return root.__dokeDetailBootPromise;
  }

  Doke.detailAdDataController = {
    page: PAGE_NAME,
    getRoot: getRoot,
    getServiceId: getServiceId,
    load: load,
    boot: boot,
    lastPayload: null
  };

  document.addEventListener('doke:page-data-revalidated', function (event) {
    if (event.detail && event.detail.page === PAGE_NAME) {
      var root = getRoot();
      if (!root) return;
      publishPayload(root, getServiceId(root), event.detail.data, 'stale-while-revalidate');
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
