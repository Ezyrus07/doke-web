(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260804-ux-search-001-results-v1';
  var initialized = false;
  var observer = null;
  var cleanup = [];

  function searchContract() {
    try {
      return Doke.services && Doke.services.search && typeof Doke.services.search.getContract === 'function'
        ? Doke.services.search.getContract() || {}
        : {};
    } catch (error) {
      return {};
    }
  }

  function currentMode() {
    var selected = document.querySelector('input[name="searchType"]:checked');
    var layout = document.querySelector('[data-results-layout]');
    return selected && selected.value || layout && layout.getAttribute('data-results-mode') || 'services';
  }

  function ensureDisclosure() {
    var existing = document.querySelector('[data-search-authority-note]');
    if (existing) return existing;
    var description = document.querySelector('[data-results-description]');
    var summary = document.querySelector('[data-results-summary]');
    var host = description && description.parentNode || summary || document.querySelector('[data-results-layout]');
    if (!host) return null;
    var note = document.createElement('p');
    note.className = 'doke-search-authority-note';
    note.dataset.searchAuthorityNote = '';
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    if (description && description.nextSibling) host.insertBefore(note, description.nextSibling);
    else host.appendChild(note);
    return note;
  }

  function ensureRetry() {
    var existing = document.querySelector('[data-search-retry]');
    if (existing) return existing;
    var note = ensureDisclosure();
    if (!note || !note.parentNode) return null;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'doke-btn doke-btn--secondary doke-search-retry';
    button.dataset.searchRetry = '';
    button.textContent = 'Tentar novamente';
    button.hidden = true;
    note.parentNode.insertBefore(button, note.nextSibling);
    button.addEventListener('click', function () {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      var action = Doke.searchResultsServerSurface && Doke.searchResultsServerSurface.retry;
      var operation = action ? action() : Promise.reject(new Error('Retry de busca indisponível.'));
      Promise.resolve(operation)
        .catch(function () {})
        .finally(function () {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        });
    });
    return button;
  }

  function applyDisclosure(mode) {
    if (!Doke.searchExperience) return null;
    var descriptor = Doke.searchExperience.describeMode(mode || currentMode(), searchContract());
    var layout = document.querySelector('[data-results-layout]');
    var grid = document.querySelector('[data-results-grid]');
    [layout, grid].forEach(function (node) {
      if (!node) return;
      node.dataset.searchAuthority = descriptor.authority;
      node.dataset.searchCoverage = descriptor.coverage;
      node.dataset.searchCanonical = String(descriptor.canonical);
    });
    var note = ensureDisclosure();
    if (note) {
      note.textContent = descriptor.label;
      note.dataset.searchAuthority = descriptor.authority;
      note.dataset.searchCoverage = descriptor.coverage;
    }
    try {
      document.dispatchEvent(new CustomEvent('doke:search-authority-disclosed', {
        detail: {
          mode: descriptor.mode,
          authority: descriptor.authority,
          coverage: descriptor.coverage,
          canonical: descriptor.canonical
        }
      }));
    } catch (error) {}
    return descriptor;
  }

  function setRetryVisible(visible) {
    var button = ensureRetry();
    if (button) button.hidden = !visible;
  }

  function bind() {
    var onModeChange = function (event) {
      if (!event.target || event.target.name !== 'searchType') return;
      applyDisclosure(event.target.value);
      setRetryVisible(false);
    };
    var onError = function (event) {
      var detail = event && event.detail || {};
      setRetryVisible(detail.retryAvailable === true);
    };
    var onSuccess = function () {
      setRetryVisible(false);
      applyDisclosure(currentMode());
    };
    document.addEventListener('change', onModeChange);
    document.addEventListener('doke:search-server-error', onError);
    document.addEventListener('doke:search-server-page-rendered', onSuccess);
    cleanup.push(function () { document.removeEventListener('change', onModeChange); });
    cleanup.push(function () { document.removeEventListener('doke:search-server-error', onError); });
    cleanup.push(function () { document.removeEventListener('doke:search-server-page-rendered', onSuccess); });

    var layout = document.querySelector('[data-results-layout]');
    if (layout && typeof root.MutationObserver === 'function') {
      observer = new root.MutationObserver(function (records) {
        records.forEach(function (record) {
          if (record.attributeName === 'data-results-mode') applyDisclosure(currentMode());
        });
      });
      observer.observe(layout, { attributes: true, attributeFilter: ['data-results-mode'] });
    }
  }

  function init() {
    if (initialized) {
      applyDisclosure(currentMode());
      return api;
    }
    initialized = true;
    ensureDisclosure();
    ensureRetry();
    bind();
    applyDisclosure(currentMode());
    return api;
  }

  function destroy() {
    cleanup.splice(0).forEach(function (dispose) {
      try { dispose(); } catch (error) {}
    });
    if (observer) observer.disconnect();
    observer = null;
    initialized = false;
  }

  var api = Object.freeze({
    version: VERSION,
    init: init,
    destroy: destroy,
    applyDisclosure: applyDisclosure
  });

  Doke.searchResultsAuthorityPilot = api;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
