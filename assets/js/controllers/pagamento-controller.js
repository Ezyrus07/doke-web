(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'pagamento';
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

  function getActiveMethod(root) {
    var active = root && root.querySelector('[data-payment-method].is-active');
    return active ? String(active.getAttribute('data-payment-method') || '').trim() : 'card';
  }

  function readPageContext() {
    var params = getSearchParams();
    var root = document.querySelector('[data-payment-page]');
    var professional = params.get('professional') || getText(root, '[data-payment-professional]') || 'Studio Aquarela';

    return {
      orderId: params.get('orderId') || params.get('pedido') || null,
      conversationId: params.get('conversation') || 'painting',
      professional: professional,
      amount: params.get('amount') || getText(root, '[data-payment-amount]') || 'R$ 280,00',
      installments: params.get('installments') || getText(root, '[data-payment-installments]') || 'À vista',
      description: params.get('description') || getText(root, '[data-payment-description]') || 'Proposta pronta para aprovação.',
      avatar: params.get('avatar') || getImageSource(root, '[data-payment-avatar]') || 'assets/img/auth/carpenter-cutout.png',
      title: params.get('title') || getText(root, '[data-payment-title]') || 'Pagamento do pedido',
      activeMethod: getActiveMethod(root),
      pointsEnabled: Boolean(root && root.querySelector('[data-payment-points-toggle]') && root.querySelector('[data-payment-points-toggle]').checked),
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
      mode: 'transactional-payment-boundary',
      dataStatus: 'initializing',
      context: context,
      hooks: {
        root: '[data-payment-page]',
        methods: '[data-payment-method]',
        panels: '[data-payment-panel]',
        form: '[data-payment-form]',
        submit: '[data-payment-submit]',
        overlay: '[data-payment-overlay]',
        summary: '[data-payment-title], [data-payment-professional], [data-payment-amount], [data-payment-installments], [data-payment-description]',
        points: '[data-payment-points-toggle], [data-payment-points-input], [data-payment-points-summary]'
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

  Doke.paymentController = Object.freeze({
    readPageContext: readPageContext,
    init: init,
    getLatest: function () { return latestSnapshot; }
  });

  if (Doke.controllers) Doke.controllers.register(PAGE_NAME, { init: init });
})();
