/* Doke data rendering foundation
   Responsibility: small DOM helpers for future dynamic rendering.
   This file intentionally does not fetch data and does not know page-specific layouts. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : Array.prototype.slice.call(value);
  }

  function query(root, selector) {
    return (root || document).querySelector(selector);
  }

  function queryAll(root, selector) {
    return toArray((root || document).querySelectorAll(selector));
  }

  function setText(root, selector, value, fallback) {
    var node = typeof selector === 'string' ? query(root, selector) : selector;
    if (!node) return null;
    var nextValue = value == null || value === '' ? fallback : value;
    node.textContent = nextValue == null ? '' : String(nextValue);
    return node;
  }

  function setAttribute(root, selector, attribute, value) {
    var node = typeof selector === 'string' ? query(root, selector) : selector;
    if (!node) return null;
    if (value == null || value === false) node.removeAttribute(attribute);
    else node.setAttribute(attribute, String(value));
    return node;
  }

  function setImage(root, selector, source, alt) {
    var image = typeof selector === 'string' ? query(root, selector) : selector;
    if (!image) return null;
    if (source) image.setAttribute('src', source);
    if (alt != null) image.setAttribute('alt', String(alt));
    return image;
  }

  function setHidden(root, selector, hidden) {
    var node = typeof selector === 'string' ? query(root, selector) : selector;
    if (!node) return null;
    node.hidden = Boolean(hidden);
    return node;
  }

  function cloneTemplate(templateSelector) {
    var template = typeof templateSelector === 'string' ? query(document, templateSelector) : templateSelector;
    if (!template || !template.content) return null;
    return template.content.firstElementChild.cloneNode(true);
  }

  function clear(node) {
    if (!node) return null;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function renderList(options) {
    options = options || {};
    var container = typeof options.container === 'string' ? query(document, options.container) : options.container;
    var items = toArray(options.items);
    var renderItem = options.renderItem;
    var emptyNode = typeof options.emptyNode === 'string' ? query(document, options.emptyNode) : options.emptyNode;
    var loadingNode = typeof options.loadingNode === 'string' ? query(document, options.loadingNode) : options.loadingNode;

    if (!container || typeof renderItem !== 'function') return [];

    clear(container);
    setHidden(document, loadingNode, true);
    setHidden(document, emptyNode, items.length > 0);

    return items.map(function (item, index) {
      var node = renderItem(item, index);
      if (node) container.appendChild(node);
      return node;
    }).filter(Boolean);
  }

  Doke.dataRendering = Object.freeze({
    query: query,
    queryAll: queryAll,
    setText: setText,
    setAttribute: setAttribute,
    setImage: setImage,
    setHidden: setHidden,
    cloneTemplate: cloneTemplate,
    clear: clear,
    renderList: renderList,
    toArray: toArray
  });
})();
