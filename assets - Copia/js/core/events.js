(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function on(target, eventName, selectorOrHandler, handlerOrOptions, maybeOptions) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) return function () {};

    var delegated = typeof selectorOrHandler === 'string';
    var selector = delegated ? selectorOrHandler : null;
    var handler = delegated ? handlerOrOptions : selectorOrHandler;
    var options = delegated ? maybeOptions : handlerOrOptions;

    function listener(event) {
      if (!delegated) {
        handler.call(root, event);
        return;
      }

      var match = event.target.closest(selector);
      if (match && root.contains(match)) {
        handler.call(match, event, match);
      }
    }

    root.addEventListener(eventName, listener, options || false);
    return function dispose() {
      root.removeEventListener(eventName, listener, options || false);
    };
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {}, bubbles: true }));
  }

  Doke.events = Object.freeze({
    on: on,
    emit: emit
  });
})();
