(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function setDisplayName(selector, value, fallback) {
    var node = document.querySelector(selector);
    var name = clean(value) || clean(fallback);
    if (!node) return name;

    node.textContent = name;
    if (name) {
      node.setAttribute('title', name);
      node.setAttribute('aria-label', name);
    } else {
      node.removeAttribute('title');
      node.removeAttribute('aria-label');
    }
    return name;
  }

  Doke.profilePresentation = Object.freeze({
    setDisplayName: setDisplayName
  });
})();
