/* Doke UX-FILTERS-002
   Applied filter chip presentation for resultados.html.
   One removable chip produces one explicit commit through UX-FILTERS-001. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260805-ux-filters-002-v1';
  var CONTRACT = 'search-filter-presentation-v1';
  var CONTAINER_SELECTOR = '[data-results-active-chips]';
  var FILTER_FORM_SELECTOR = '[data-results-filters-form]';
  var FILTER_OPEN_SELECTOR = '[data-results-filters-open]';
  var REMOVE_SELECTOR = '[data-results-filter-chip-remove]';
  var PRESENTATION_MARKER = '[data-results-filter-presentation]';

  var GROUPS = Object.freeze([
    Object.freeze({ id: 'category', label: 'Categoria', keys: Object.freeze(['categories']) }),
    Object.freeze({ id: 'location', label: 'Localização', keys: Object.freeze(['state', 'city', 'neighborhood']) }),
    Object.freeze({ id: 'quality', label: 'Qualidade', keys: Object.freeze(['minRating']) }),
    Object.freeze({ id: 'availability', label: 'Disponibilidade', keys: Object.freeze(['guaranteed', 'emergency', 'online', 'availableToday']) })
  ]);

  var LABELS = Object.freeze({
    guaranteed: 'Com garantia',
    emergency: 'Atendimento emergencial',
    online: 'Online ou remoto',
    availableToday: 'Disponível hoje'
  });

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function authority() {
    return Doke.searchFilterState || null;
  }

  function normalize(snapshot) {
    var api = authority();
    if (api && typeof api.normalize === 'function') return api.normalize(snapshot || {});
    snapshot = snapshot || {};
    return Object.freeze({
      searchType: cleanText(snapshot.searchType) || 'services',
      categories: Object.freeze(Array.isArray(snapshot.categories) ? snapshot.categories.map(cleanText).filter(Boolean) : []),
      state: cleanText(snapshot.state),
      city: cleanText(snapshot.city),
      neighborhood: cleanText(snapshot.neighborhood),
      minRating: Number(snapshot.minRating || 0) || 0,
      guaranteed: Boolean(snapshot.guaranteed),
      emergency: Boolean(snapshot.emergency),
      online: Boolean(snapshot.online),
      availableToday: Boolean(snapshot.availableToday)
    });
  }

  function freezeChip(chip) {
    return Object.freeze({
      id: cleanText(chip.id),
      group: cleanText(chip.group),
      key: cleanText(chip.key),
      value: cleanText(chip.value),
      label: cleanText(chip.label)
    });
  }

  function createChip(group, key, value, label, suffix) {
    return freezeChip({
      id: [group, key, suffix || value].map(cleanText).join(':'),
      group: group,
      key: key,
      value: value,
      label: label
    });
  }

  function formatRating(value) {
    return String(Number(value || 0)).replace('.', ',');
  }

  function chipsFor(snapshot) {
    snapshot = normalize(snapshot);
    var chips = [];

    snapshot.categories.forEach(function (category) {
      chips.push(createChip('category', 'categories', category, category, category.toLocaleLowerCase('pt-BR')));
    });
    if (snapshot.state) chips.push(createChip('location', 'state', snapshot.state, 'Estado: ' + snapshot.state));
    if (snapshot.city) chips.push(createChip('location', 'city', snapshot.city, 'Cidade: ' + snapshot.city));
    if (snapshot.neighborhood) chips.push(createChip('location', 'neighborhood', snapshot.neighborhood, 'Bairro: ' + snapshot.neighborhood));
    if (snapshot.minRating) chips.push(createChip('quality', 'minRating', String(snapshot.minRating), 'Nota mínima ' + formatRating(snapshot.minRating)));
    Object.keys(LABELS).forEach(function (key) {
      if (snapshot[key]) chips.push(createChip('availability', key, '1', LABELS[key]));
    });

    return Object.freeze(chips);
  }

  function buildPresentation(snapshot) {
    var chips = chipsFor(snapshot);
    var groups = GROUPS.map(function (group) {
      var groupChips = chips.filter(function (chip) { return chip.group === group.id; });
      return Object.freeze({
        id: group.id,
        label: group.label,
        count: groupChips.length,
        chips: Object.freeze(groupChips)
      });
    }).filter(function (group) { return group.count > 0; });

    return Object.freeze({
      total: chips.length,
      groupCount: groups.length,
      groups: Object.freeze(groups),
      chips: chips
    });
  }

  function removeFromSnapshot(snapshot, key, value) {
    snapshot = normalize(snapshot);
    var next = {
      searchType: snapshot.searchType,
      categories: snapshot.categories.slice(),
      state: snapshot.state,
      city: snapshot.city,
      neighborhood: snapshot.neighborhood,
      minRating: snapshot.minRating,
      guaranteed: snapshot.guaranteed,
      emergency: snapshot.emergency,
      online: snapshot.online,
      availableToday: snapshot.availableToday
    };

    if (key === 'categories') {
      var normalizedValue = cleanText(value).toLocaleLowerCase('pt-BR');
      next.categories = next.categories.filter(function (category) {
        return cleanText(category).toLocaleLowerCase('pt-BR') !== normalizedValue;
      });
    } else if (key === 'state') {
      next.state = '';
      next.city = '';
      next.neighborhood = '';
    } else if (key === 'city') {
      next.city = '';
      next.neighborhood = '';
    } else if (key === 'neighborhood') {
      next.neighborhood = '';
    } else if (key === 'minRating') {
      next.minRating = 0;
    } else if (Object.prototype.hasOwnProperty.call(LABELS, key)) {
      next[key] = false;
    }

    return normalize(next);
  }

  function dispatch(name, detail) {
    if (!root.document || typeof root.document.dispatchEvent !== 'function') return;
    root.document.dispatchEvent(new CustomEvent(name, {
      detail: Object.freeze(detail || {})
    }));
  }

  function safeClosest(target, selector) {
    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
  }

  function refreshSelect(select) {
    if (select && root.DokeUiSelect && typeof root.DokeUiSelect.refresh === 'function') {
      root.DokeUiSelect.refresh(select);
    }
  }

  function writeSnapshotToForm(form, snapshot) {
    if (!form) return;
    snapshot = normalize(snapshot);

    Array.prototype.forEach.call(form.querySelectorAll('input[name="categories"]'), function (input) {
      input.checked = snapshot.categories.includes(cleanText(input.value));
    });

    var state = form.querySelector('[name="state"], [name="staté"]');
    var city = form.querySelector('[name="city"]');
    var neighborhood = form.querySelector('[name="neighborhood"]');
    var minRating = form.querySelector('[name="minRating"]');

    if (state) state.value = snapshot.state;
    if (city) city.value = snapshot.city;
    if (neighborhood) neighborhood.value = snapshot.neighborhood;
    if (minRating) minRating.value = snapshot.minRating ? String(snapshot.minRating) : '';

    refreshSelect(state);
    refreshSelect(city);
    refreshSelect(neighborhood);
    refreshSelect(minRating);

    Object.keys(LABELS).forEach(function (key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (input) input.checked = snapshot[key];
    });
  }

  function createCountBadge(button) {
    if (!button || !root.document || typeof root.document.createElement !== 'function') return null;
    var badge = button.querySelector('[data-results-filter-count]');
    if (badge) return badge;
    badge = root.document.createElement('span');
    badge.className = 'results-filter-count';
    badge.dataset.resultsFilterCount = '';
    badge.setAttribute('aria-hidden', 'true');
    button.appendChild(badge);
    return badge;
  }

  function updateFilterButtons(total) {
    if (!root.document || typeof root.document.querySelectorAll !== 'function') return;
    Array.prototype.forEach.call(root.document.querySelectorAll(FILTER_OPEN_SELECTOR), function (button) {
      var badge = createCountBadge(button);
      if (badge) {
        badge.textContent = String(total);
        badge.hidden = total === 0;
      }
      button.dataset.appliedFilterCount = String(total);
      var baseLabel = cleanText(button.dataset.filterBaseLabel || button.getAttribute('aria-label') || 'Filtros');
      if (!button.dataset.filterBaseLabel) button.dataset.filterBaseLabel = baseLabel;
      button.setAttribute('aria-label', total > 0 ? baseLabel + ', ' + total + ' aplicado' + (total === 1 ? '' : 's') : baseLabel);
    });
  }

  function appendChip(groupItems, chip) {
    var button = root.document.createElement('button');
    button.type = 'button';
    button.className = 'results-active-chip results-active-chip--removable';
    button.dataset.resultsFilterChipRemove = '';
    button.dataset.filterKey = chip.key;
    button.dataset.filterValue = chip.value;
    button.setAttribute('aria-label', 'Remover filtro ' + chip.label);

    var label = root.document.createElement('span');
    label.className = 'results-active-chip__label';
    label.textContent = chip.label;

    var icon = root.document.createElement('span');
    icon.className = 'results-active-chip__remove';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '×';

    button.appendChild(label);
    button.appendChild(icon);
    groupItems.appendChild(button);
  }

  function renderContainer(container, presentation) {
    if (!container || !root.document) return;
    container.textContent = '';
    container.hidden = presentation.total === 0;
    container.dataset.filterPresentationVersion = VERSION;
    container.dataset.appliedFilterCount = String(presentation.total);
    container.dataset.appliedFilterGroups = String(presentation.groupCount);

    var rootNode = root.document.createElement('div');
    rootNode.className = 'results-active-chip-groups';
    rootNode.dataset.resultsFilterPresentation = VERSION;

    presentation.groups.forEach(function (group) {
      var section = root.document.createElement('section');
      section.className = 'results-active-chip-group';
      section.dataset.filterGroup = group.id;
      section.setAttribute('aria-label', group.label);

      var heading = root.document.createElement('span');
      heading.className = 'results-active-chip-group__label';
      heading.textContent = group.label;

      var items = root.document.createElement('div');
      items.className = 'results-active-chip-group__items';

      group.chips.forEach(function (chip) {
        appendChip(items, chip);
      });

      section.appendChild(heading);
      section.appendChild(items);
      rootNode.appendChild(section);
    });

    container.appendChild(rootNode);
  }

  function install() {
    if (!root.document || typeof root.document.addEventListener !== 'function') {
      return Object.freeze({ cleanup: function () {}, render: function () { return null; } });
    }

    var lifecycle = new AbortController();
    var signal = lifecycle.signal;
    var observer = null;
    var observedContainer = null;
    var renderQueued = false;

    function installation() {
      return Doke.searchFilterStateInstallation || null;
    }

    function currentApplied() {
      var state = installation();
      var snapshot = state && typeof state.getSnapshot === 'function' ? state.getSnapshot() : null;
      if (snapshot && snapshot.applied) return snapshot.applied;
      var api = authority();
      return api && typeof api.parseUrl === 'function'
        ? api.parseUrl(root.location && root.location.search || '')
        : normalize({});
    }

    function observe(container) {
      if (container === observedContainer) return;
      if (observer) observer.disconnect();
      observedContainer = container;
      observer = null;
      if (!container || typeof root.MutationObserver !== 'function') return;
      observer = new root.MutationObserver(function () {
        if (!container.querySelector(PRESENTATION_MARKER)) queueRender();
      });
      observer.observe(container, { childList: true, subtree: false });
    }

    function render() {
      renderQueued = false;
      if (signal.aborted) return null;
      var container = root.document.querySelector(CONTAINER_SELECTOR);
      var presentation = buildPresentation(currentApplied());
      updateFilterButtons(presentation.total);
      if (container) {
        observe(container);
        renderContainer(container, presentation);
      }
      dispatch('doke:search-filter-presentation', {
        total: presentation.total,
        groupCount: presentation.groupCount,
        version: VERSION
      });
      return presentation;
    }

    function queueRender() {
      if (renderQueued || signal.aborted) return;
      renderQueued = true;
      if (typeof root.requestAnimationFrame === 'function') {
        root.requestAnimationFrame(render);
        return;
      }
      Promise.resolve().then(render);
    }

    function removeChip(button) {
      var state = installation();
      if (!state || typeof state.getSnapshot !== 'function' || typeof state.commit !== 'function') return null;
      var snapshot = state.getSnapshot();
      if (!snapshot || !snapshot.applied) return null;

      if (snapshot.dirty && typeof state.cancel === 'function') state.cancel();

      var key = cleanText(button.dataset.filterKey);
      var value = cleanText(button.dataset.filterValue);
      var next = removeFromSnapshot(snapshot.applied, key, value);
      var form = root.document.querySelector(FILTER_FORM_SELECTOR);
      if (!form) return null;

      writeSnapshotToForm(form, next);
      var receipt = state.commit();
      queueRender();
      dispatch('doke:search-filter-chip-removed', {
        key: key,
        group: GROUPS.find(function (group) { return group.keys.includes(key); })?.id || 'unknown',
        activeCount: receipt && Number(receipt.activeCount || 0),
        revision: receipt && Number(receipt.revision || 0),
        source: 'applied-chip'
      });
      return receipt;
    }

    function onClick(event) {
      var button = safeClosest(event.target, REMOVE_SELECTOR);
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      removeChip(button);
    }

    function onState(event) {
      if (event && event.detail && event.detail.dirty) return;
      queueRender();
    }

    root.document.addEventListener('click', onClick, { capture: true, signal: signal });
    root.document.addEventListener('doke:search-filters-committed', queueRender, { signal: signal });
    root.document.addEventListener('doke:search-filters-state', onState, { signal: signal });
    root.document.addEventListener('doke:navigation-lifecycle-route', queueRender, { signal: signal });
    root.document.addEventListener('doke:navigation-lifecycle-change', queueRender, { signal: signal });
    root.addEventListener && root.addEventListener('popstate', queueRender, { signal: signal });
    root.addEventListener && root.addEventListener('pageshow', queueRender, { signal: signal });
    root.addEventListener && root.addEventListener('pagehide', function () {
      lifecycle.abort();
    }, { once: true, signal: signal });

    queueRender();

    return Object.freeze({
      cleanup: function cleanup() {
        lifecycle.abort();
        if (observer) observer.disconnect();
        observer = null;
        observedContainer = null;
      },
      render: render,
      remove: removeChip
    });
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    groups: GROUPS,
    labels: LABELS,
    buildPresentation: buildPresentation,
    removeFromSnapshot: removeFromSnapshot,
    install: install
  });

  Doke.searchFilterPresentation = api;
  if (Doke.searchFilterPresentationInstallation && Doke.searchFilterPresentationInstallation.cleanup) {
    Doke.searchFilterPresentationInstallation.cleanup();
  }
  Doke.searchFilterPresentationInstallation = install();
}());
