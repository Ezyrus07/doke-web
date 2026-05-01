(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function create(tagName, options) {
    var node = document.createElement(tagName);
    options = options || {};

    if (options.className) node.className = options.className;
    if (options.text != null) node.textContent = String(options.text);
    if (options.html != null) node.innerHTML = String(options.html);
    if (options.attrs) {
      Object.keys(options.attrs).forEach(function (key) {
        var value = options.attrs[key];
        if (value === false || value == null) return;
        if (value === true) node.setAttribute(key, '');
        else node.setAttribute(key, String(value));
      });
    }
    if (Array.isArray(options.children)) {
      options.children.forEach(function (child) {
        if (child == null) return;
        node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
      });
    }

    return node;
  }

  function clear(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderInto(target, nodes) {
    var root = typeof target === 'string' ? qs(target) : target;
    if (!root) return false;
    clear(root);
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (node) {
      if (node) root.appendChild(node);
    });
    return true;
  }

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  Doke.dom = Object.freeze({
    qs: qs,
    qsa: qsa,
    create: create,
    clear: clear,
    renderInto: renderInto,
    escapeText: escapeText
  });
})();
