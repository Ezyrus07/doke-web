/* Doke UX-RESULTS-001
   Single DOM writer for Resultados summary, state, pagination and related sections. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260805-ux-results-001-dom-v1';
  var CONTRACT = 'search-results-dom-adapter-v1';

  function authority() {
    return Doke.searchResultsPresentation || null;
  }

  function query(selector) {
    return root.document && typeof root.document.querySelector === 'function'
      ? root.document.querySelector(selector)
      : null;
  }

  function queryAll(selector) {
    return root.document && typeof root.document.querySelectorAll === 'function'
      ? Array.prototype.slice.call(root.document.querySelectorAll(selector))
      : [];
  }

  function resolveNodes() {
    return {
      boundary: query('[data-state-boundary="resultados"]'),
      layout: query('[data-results-layout]'),
      summary: query('[data-results-summary]'),
      title: query('[data-results-title]'),
      description: query('[data-results-description]'),
      count: query('[data-results-count]'),
      loading: query('[data-results-loading]'),
      grid: query('[data-results-grid]'),
      inlineEmpty: query('[data-results-inline-empty]'),
      pagination: query('[data-results-pagination]'),
      loadMore: query('[data-results-load-more]'),
      stateLoading: query('[data-state-loading]'),
      stateEmpty: query('[data-state-empty]'),
      stateError: query('[data-state-error]'),
      stateHosts: queryAll('[data-results-state]'),
      sections: {
        users: { section: query('[data-results-users]'), grid: query('[data-results-users-grid]') },
        workers: { section: query('[data-results-videos]'), grid: query('[data-results-videos-grid]') },
        publications: { section: query('[data-results-before-after]'), grid: query('[data-results-before-after-grid]') }
      }
    };
  }

  function setAttribute(node, name, value) {
    if (!node || typeof node.setAttribute !== 'function') return;
    node.setAttribute(name, String(value));
  }

  function applyRelated(nodes, snapshot) {
    Object.keys(nodes.sections || {}).forEach(function (key) {
      var target = nodes.sections[key] || {};
      var sectionState = snapshot.sections && snapshot.sections[key] || {};
      var visible = sectionState.visible === true;
      if (target.section) target.section.hidden = !visible;
      if (!visible && target.grid) target.grid.textContent = '';
      if (target.section && target.section.dataset) {
        target.section.dataset.resultsIntentFingerprint = sectionState.intentFingerprint || '';
      }
    });
  }

  function applySnapshot(nodes, snapshot) {
    if (!snapshot || snapshot.committable === false) return false;
    var state = snapshot.state;
    var loading = state === 'loading';
    var paginating = state === 'paginating';
    var empty = state === 'empty';
    var error = state === 'error';
    var hasPreservedContent = Number(snapshot.previousCount || 0) > 0 && snapshot.preserveContent === true;
    var showBlockingLoading = loading && !hasPreservedContent;

    if (nodes.title) nodes.title.textContent = snapshot.summary && snapshot.summary.title || '';
    if (nodes.description) nodes.description.textContent = snapshot.summary && snapshot.summary.description || '';
    if (nodes.count) nodes.count.textContent = String(Math.max(0, Number(snapshot.count || 0)));

    [nodes.layout, nodes.summary, nodes.grid].forEach(function (node) {
      if (!node || !node.dataset) return;
      node.dataset.resultsPresentationVersion = VERSION;
      node.dataset.resultsState = state;
      node.dataset.resultsMode = snapshot.mode;
      node.dataset.resultsIntentFingerprint = snapshot.searchFingerprint || '';
      node.dataset.searchAuthority = snapshot.authority;
      node.dataset.searchCoverage = snapshot.coverage;
      node.dataset.searchCanonical = String(snapshot.canonical === true);
    });

    if (nodes.summary && nodes.summary.dataset) {
      nodes.summary.dataset.resultsTone = snapshot.summary && snapshot.summary.tone || 'ready';
    }

    (nodes.stateHosts || []).forEach(function (host) {
      if (host.dataset) host.dataset.resultsState = state;
      setAttribute(host, 'aria-busy', loading || paginating ? 'true' : 'false');
    });

    if (nodes.boundary) {
      if (nodes.boundary.dataset) nodes.boundary.dataset.viewState = state;
      setAttribute(nodes.boundary, 'aria-busy', loading || paginating ? 'true' : 'false');
    }

    if (nodes.loading) nodes.loading.hidden = !showBlockingLoading;
    if (nodes.grid) nodes.grid.hidden = showBlockingLoading || (error && !hasPreservedContent);
    if (nodes.inlineEmpty) nodes.inlineEmpty.hidden = !empty;
    if (nodes.stateLoading) nodes.stateLoading.hidden = true;
    if (nodes.stateEmpty) nodes.stateEmpty.hidden = true;
    if (nodes.stateError) nodes.stateError.hidden = !error;

    var paginationVisible = snapshot.pagination && (snapshot.pagination.visible || snapshot.pagination.busy);
    if (nodes.pagination) nodes.pagination.hidden = !paginationVisible;
    if (nodes.loadMore) {
      var busy = Boolean(snapshot.pagination && snapshot.pagination.busy);
      nodes.loadMore.hidden = !paginationVisible;
      nodes.loadMore.disabled = busy;
      nodes.loadMore.textContent = busy ? 'Carregando mais...' : 'Carregar mais';
      nodes.loadMore.dataset.actionState = busy ? 'loading' : 'idle';
      setAttribute(nodes.loadMore, 'aria-busy', busy ? 'true' : 'false');
    }

    applyRelated(nodes, snapshot);
    return true;
  }

  function createView(nodes) {
    var resolved = nodes || resolveNodes();
    return Object.freeze({
      nodes: resolved,
      apply: function (snapshot) { return applySnapshot(resolved, snapshot); },
      clearRelatedSections: function () {
        applyRelated(resolved, { sections: {} });
      }
    });
  }

  function fingerprintFor(input) {
    if (Doke.searchExperience && typeof Doke.searchExperience.normalizeIntent === 'function') {
      return Doke.searchExperience.normalizeIntent(input || {}).searchFingerprint;
    }
    var source = JSON.stringify(input || {});
    var hash = 2166136261;
    for (var index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function install(options) {
    options = options || {};
    var presentation = authority();
    if (!presentation || typeof presentation.createController !== 'function') return null;
    var view = createView(options.nodes);
    var controller = presentation.createController({ initial: options.initial || {} });
    var disposed = false;
    var activeTicket = null;

    function dispatch(snapshot) {
      if (!root.document || typeof root.document.dispatchEvent !== 'function') return;
      try {
        root.document.dispatchEvent(new CustomEvent('doke:search-results-presentation-applied', {
          detail: presentation.diagnosticFor(snapshot)
        }));
      } catch (error) {}
    }

    function begin(input) {
      if (disposed) return null;
      input = Object.assign({}, input || {});
      if (!input.searchFingerprint) input.searchFingerprint = fingerprintFor(input);
      var previousSnapshot = controller.getSnapshot();
      var snapshot = controller.begin(input);
      view.apply(snapshot);
      dispatch(snapshot);
      activeTicket = Object.freeze({
        generation: snapshot.generation,
        searchFingerprint: snapshot.searchFingerprint,
        snapshot: snapshot,
        previousSnapshot: previousSnapshot
      });
      return activeTicket;
    }

    function commit(ticket, input) {
      if (disposed || !ticket) return null;
      var receipt = controller.commit(Object.assign({}, input || {}, {
        applied: input && input.applied === true,
        generation: ticket.generation,
        searchFingerprint: ticket.searchFingerprint
      }));
      if (receipt && receipt.applied === true) {
        activeTicket = null;
        view.apply(receipt.snapshot);
        dispatch(receipt.snapshot);
      }
      return receipt;
    }

    function cancel(ticket, reason) {
      if (disposed || !ticket || !activeTicket) return null;
      if (ticket.generation !== activeTicket.generation || ticket.searchFingerprint !== activeTicket.searchFingerprint) return null;
      controller.cancel(reason || 'presentation-cancelled');
      activeTicket = null;
      if (ticket.previousSnapshot) {
        view.apply(ticket.previousSnapshot);
        dispatch(ticket.previousSnapshot);
      }
      return ticket.previousSnapshot || null;
    }

    function commitLocal(input) {
      input = Object.assign({}, input || {});
      var ticket = begin({
        mode: input.mode,
        operation: 'initial',
        query: input.query,
        filters: input.filters,
        authority: 'local_editorial',
        coverage: 'editorial_sample',
        sections: input.sections
      });
      return commit(ticket, {
        applied: true,
        state: Number(input.count || 0) > 0 ? 'ready' : 'empty',
        mode: input.mode,
        query: input.query,
        count: input.count,
        hasNext: false,
        authority: 'local_editorial',
        coverage: 'editorial_sample',
        sections: input.sections
      });
    }

    function fail(ticket, input) {
      input = input || {};
      return commit(ticket, {
        applied: true,
        state: 'error',
        mode: input.mode || 'services',
        query: input.query,
        count: Number(input.count || 0),
        retryAvailable: input.retryAvailable === true,
        errorCode: input.errorCode || 'DOKE_SEARCH_FAILED',
        authority: input.authority || 'unknown',
        coverage: input.coverage || 'unknown'
      });
    }

    return Object.freeze({
      version: VERSION,
      contract: CONTRACT,
      begin: begin,
      commit: commit,
      commitLocal: commitLocal,
      fail: fail,
      cancel: cancel,
      clearRelatedSections: view.clearRelatedSections,
      getSnapshot: controller.getSnapshot,
      cleanup: function () { disposed = true; controller.cancel('adapter-cleanup'); }
    });
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    resolveNodes: resolveNodes,
    applySnapshot: applySnapshot,
    createView: createView,
    install: install
  });

  Doke.searchResultsDomAdapter = api;
}());
