(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'finalizar-pedido';
  var latestSnapshot = null;

  function getSearchParams() {
    try {
      return new URLSearchParams(window.location.search || '');
    } catch (error) {
      return new URLSearchParams('');
    }
  }

  function getText(root, selector) {
    var node = root && root.querySelector(selector);
    return node ? String(node.textContent || '').trim() : '';
  }

  function getImageSource(root, selector) {
    var node = root && root.querySelector(selector);
    return node ? String(node.getAttribute('src') || '').trim() : '';
  }

  function readPageContext() {
    var params = getSearchParams();
    var root = document.querySelector('[data-order-finalize-page]');
    var professional = params.get('professional') || getText(root, '[data-finalize-professional]') || 'Studio Aquarela';

    return {
      orderId: params.get('orderId') || params.get('pedido') || null,
      conversationId: params.get('conversation') || 'painting',
      professional: professional,
      amount: params.get('amount') || getText(root, '[data-finalize-amount]') || 'R$ 280,00',
      installments: params.get('installments') || getText(root, '[data-finalize-installments]') || 'À vista',
      avatar: params.get('avatar') || getImageSource(root, '[data-finalize-avatar]') || 'assets/img/auth/carpenter-cutout.png',
      title: params.get('title') || getText(root, '[data-finalize-title]') || ('Finalizar pedido com ' + professional),
      hasRoot: Boolean(root),
      visualContract: 'provisional-layout-preserved'
    };
  }

  function writeState(patch) {
    if (!Doke.state || typeof Doke.state.merge !== 'function') return;
    Doke.state.merge('controllers.' + PAGE_NAME, patch);
  }

  function markBoundaryReady(context) {
    writeState({
      ready: true,
      page: PAGE_NAME,
      mode: 'transactional-boundary',
      dataStatus: 'initializing',
      context: context,
      hooks: {
        root: '[data-order-finalize-page]',
        imageInput: '[data-finalize-image-input]',
        note: '[data-finalize-note]',
        submit: '[data-finalize-submit]',
        summary: '[data-finalize-title], [data-finalize-professional], [data-finalize-amount], [data-finalize-installments]'
      }
    });
  }

  function loadPageData(context) {
    if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
      return Doke.controllerData.loadForPage(PAGE_NAME).then(function (data) {
        writeState({
          dataStatus: 'ready',
          orderId: context.orderId,
          conversationId: context.conversationId,
          source: 'controller-data-boundary'
        });
        return data;
      });
    }

    writeState({
      dataStatus: 'idle',
      source: 'controller-data-unavailable'
    });
    return Promise.resolve({});
  }

  function init(runtimeContext) {
    var context = readPageContext();
    markBoundaryReady(context);
    return loadPageData(context).then(function (data) {
      latestSnapshot = {
        context: context,
        data: data,
        runtimeContext: runtimeContext || {}
      };
      return data;
    });
  }

  Doke.finalizeOrderController = Object.freeze({
    readPageContext: readPageContext,
    init: init,
    getLatest: function () { return latestSnapshot; }
  });

  if (Doke.controllers) Doke.controllers.register(PAGE_NAME, { init: init });
})();
