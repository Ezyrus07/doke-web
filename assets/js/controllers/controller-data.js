(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var pageResources = Object.freeze({
    index: ['services', 'communities', 'notifications'],
    resultados: ['services', 'users'],
    pedidos: ['orders'],
    mensagens: ['messages', 'users'],
    comunidade: ['communities'],
    perfil: ['users', 'services', 'orders'],
    carteira: ['wallet'],
    'finalizar-pedido': ['orders'],
    pagamento: ['orders', 'wallet'],
    'adicionar-cartao': ['wallet'],
    avaliacao: ['reviews', 'orders', 'services'],
    notificacoes: ['notifications'],
    configuracoes: ['users']
  });

  function normalizePageName(pageName) {
    return String(pageName || '').replace(/\.html$/, '') || 'index';
  }

  function getResourcesForPage(pageName) {
    return pageResources[normalizePageName(pageName)] || [];
  }

  function writeState(pageName, patch) {
    if (!Doke.state || typeof Doke.state.merge !== 'function') return;
    Doke.state.merge('controllers.' + normalizePageName(pageName), patch);
  }

  function countPayload(payload) {
    if (Array.isArray(payload)) return payload.length;
    if (payload && typeof payload === 'object') {
      return Object.keys(payload).reduce(function (sum, key) {
        return sum + (Array.isArray(payload[key]) ? payload[key].length : 0);
      }, 0);
    }
    return 0;
  }

  function toSummary(data) {
    return Object.keys(data || {}).reduce(function (summary, resourceName) {
      summary[resourceName] = countPayload(data[resourceName]);
      return summary;
    }, {});
  }

  function loadForPage(pageName) {
    pageName = normalizePageName(pageName);

    if (Doke.rolloutGuard && !Doke.rolloutGuard.shouldRun('mockDataControllers')) {
      writeState(pageName, {
        ready: true,
        mode: 'mock-data-disabled',
        dataStatus: 'disabled',
        resources: getResourcesForPage(pageName)
      });
      Doke.rolloutGuard.mark('mockDataControllers', 'skipped', 'feature-flag-disabled');
      return Promise.resolve({});
    }
    var resources = getResourcesForPage(pageName);

    writeState(pageName, {
      ready: true,
      mode: 'mock-data-bound',
      dataStatus: resources.length ? 'loading' : 'idle',
      resources: resources
    });

    if (!resources.length) return Promise.resolve({});

    if (Doke.domainData && typeof Doke.domainData.loadPageData === 'function') {
      return Doke.domainData.loadPageData(pageName)
        .then(function (data) {
          writeState(pageName, {
            dataStatus: 'ready',
            dataMode: 'domain-service',
            data: data,
            summary: toSummary(data),
            loadedAt: new Date().toISOString()
          });
          return data;
        })
        .catch(function (error) {
          writeState(pageName, {
            dataStatus: 'error',
            dataMode: 'domain-service',
            error: error && error.message ? error.message : String(error)
          });
          return {};
        });
    }

    if (!Doke.mockData || typeof Doke.mockData.loadMany !== 'function') {
      writeState(pageName, { dataStatus: 'error', error: 'Doke.mockData is not available' });
      return Promise.resolve({});
    }

    return Doke.mockData.loadMany(resources)
      .then(function (data) {
        writeState(pageName, {
          dataStatus: 'ready',
          dataMode: 'raw-mock-resource',
          data: data,
          summary: toSummary(data),
          loadedAt: new Date().toISOString()
        });
        return data;
      })
      .catch(function (error) {
        writeState(pageName, {
          dataStatus: 'error',
          dataMode: 'raw-mock-resource',
          error: error && error.message ? error.message : String(error)
        });
        return {};
      });
  }

  Doke.controllerData = Object.freeze({
    pageResources: pageResources,
    getResourcesForPage: getResourcesForPage,
    loadForPage: loadForPage,
    toSummary: toSummary
  });
})();
