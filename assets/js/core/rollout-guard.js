(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function shouldRun(featureName) {
    return !Doke.flags || Doke.flags.isEnabled(featureName);
  }

  function mark(featureName, status, reason) {
    var attr = 'data-doke-rollout-' + String(featureName || '').replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); });
    document.documentElement.setAttribute(attr, status || 'unknown');
    if (reason) document.documentElement.setAttribute(attr + '-reason', reason);
  }

  function run(featureName, callback) {
    if (!shouldRun(featureName)) {
      mark(featureName, 'skipped', 'feature-flag-disabled');
      return undefined;
    }
    try {
      var result = callback();
      mark(featureName, 'ready');
      return result;
    } catch (error) {
      mark(featureName, 'error', error && error.message ? error.message : String(error));
      throw error;
    }
  }

  Doke.rolloutGuard = Object.freeze({
    shouldRun: shouldRun,
    mark: mark,
    run: run
  });
})();
