(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var PAGE_NAME = 'adicionar-cartao';
  var latestSnapshot = null;

  function getInputValue(root, selector) {
    var node = root && root.querySelector(selector);
    return node ? String(node.value || '').trim() : '';
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function detectBrand(numberDigits) {
    if (/^4/.test(numberDigits)) return 'visa';
    if (/^5[1-5]/.test(numberDigits)) return 'mastercard';
    if (/^3[47]/.test(numberDigits)) return 'amex';
    if (/^6(?:011|5)/.test(numberDigits)) return 'discover';
    return 'unknown';
  }

  function readPageContext() {
    var root = document.querySelector('[data-card-add-page]');
    var numberDigits = onlyDigits(getInputValue(root, '[data-card-add-number]'));
    var cvvDigits = onlyDigits(getInputValue(root, '[data-card-add-cvv]'));

    return {
      holderName: getInputValue(root, '[data-card-add-holder-name]') || null,
      cardNumberLast4: numberDigits ? numberDigits.slice(-4) : null,
      cardNumberLength: numberDigits.length,
      cardBrand: detectBrand(numberDigits),
      expiry: getInputValue(root, '[data-card-add-expiry]') || null,
      hasCvv: Boolean(cvvDigits),
      hasRoot: Boolean(root),
      sensitiveDataPolicy: 'do-not-store-full-card-number-or-cvv-in-state',
      tokenizationStatus: 'pending-backend-provider',
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
      mode: 'payment-method-boundary',
      dataStatus: 'initializing',
      context: context,
      hooks: {
        root: '[data-card-add-page]',
        card: '[data-card-add-card]',
        fields: '[data-card-add-fields]',
        holderName: '[data-card-add-holder-name]',
        number: '[data-card-add-number]',
        expiry: '[data-card-add-expiry]',
        cvv: '[data-card-add-cvv]',
        actions: '[data-card-add-actions]',
        submit: '[data-card-add-submit]',
        cancel: '[data-card-add-cancel]',
        back: '[data-card-add-back]'
      }
    });
  }

  function loadPageData(context) {
    if (Doke.controllerData && typeof Doke.controllerData.loadForPage === 'function') {
      return Doke.controllerData.loadForPage(PAGE_NAME).then(function (data) {
        writeState({
          dataStatus: 'ready',
          source: 'controller-data-boundary',
          tokenizationStatus: context.tokenizationStatus,
          paymentMethodPreview: {
            brand: context.cardBrand,
            last4: context.cardNumberLast4,
            expiry: context.expiry
          }
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

  Doke.addCardController = Object.freeze({
    readPageContext: readPageContext,
    init: init,
    getLatest: function () { return latestSnapshot; }
  });

  if (Doke.controllers) Doke.controllers.register(PAGE_NAME, { init: init });
})();
