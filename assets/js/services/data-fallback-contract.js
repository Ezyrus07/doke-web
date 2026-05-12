(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function normalizeResult(result) {
    if (result && Array.isArray(result.items)) {
      return {
        status: result.items.length ? 'ready' : 'empty',
        items: result.items,
        meta: result.meta || {},
        error: null
      };
    }

    if (Array.isArray(result)) {
      return {
        status: result.length ? 'ready' : 'empty',
        items: result,
        meta: {},
        error: null
      };
    }

    if (result && result.error) {
      return {
        status: 'error',
        items: [],
        meta: result.meta || {},
        error: result.error
      };
    }

    return {
      status: 'empty',
      items: [],
      meta: {},
      error: null
    };
  }

  function fromError(error) {
    return {
      status: 'error',
      items: [],
      meta: {},
      error: error || new Error('Unknown data fallback error')
    };
  }

  Doke.dataFallbackContract = Object.freeze({
    normalizeResult: normalizeResult,
    fromError: fromError
  });
})();
