(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var BINDING_KEY = 'DokeHomeMoreServicesSurfaceBinding';
  var REGION_SELECTOR = '[data-home-list-region="more-services"]';
  var GRID_SELECTOR = '[data-more-services-grid]';
  var TAB_SELECTOR = '[data-more-services-intent], #more-services-tabs-track .mini-tab';
  var QUICK_FILTER_SELECTOR = '[data-more-filters-section="quick"] .filter-chip';
  var FILTER_APPLY_SELECTOR = '[data-more-filters-apply]';
  var FILTER_CLOSE_SELECTOR = '[data-more-filters-close]';
  var FILTER_RESET_SELECTOR = '[data-more-services-reset]';
  var LOAD_SELECTOR = '[data-more-services-load]';
  var INITIAL_LIMIT = 6;
  var REVEAL_STEP = 3;

  var INTENT_BY_LABEL = Object.freeze({
    'para voce': 'for-you',
    'seguindo': 'following',
    'bem avaliados': 'top-rated',
    'com garantia': 'guaranteed',
    'disponiveis hoje': 'available-today',
    'novos': 'newest'
  });

  var QUICK_FILTER_BY_LABEL = Object.freeze({
    'com garantia': 'guaranteed',
    'emergencia': 'emergency',
    'online': 'online',
    'hoje': 'availableToday'
  });

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }

  function getRoot() {
    return document.querySelector('[data-state-boundary="index"], .shell-home__workspace');
  }

  function getRegion(scope) {
    if (!scope?.querySelector) return null;
    return scope.querySelector(REGION_SELECTOR);
  }

  function currentRoot(scope) {
    return Boolean(scope && scope === getRoot() && scope.isConnected !== false);
  }

  function activeServices(items) {
    return (Array.isArray(items) ? items : []).filter(function (item) {
      return normalize(item?.status || 'active') === 'active';
    });
  }

  function moreServices(items) {
    return activeServices(items).slice(6);
  }

  function freshRail(region) {
    if (!region?.dataset) return false;
    return region.dataset.homeRailFreshnessState === 'fresh'
      && (region.dataset.homeRailDataState === 'ready' || region.dataset.homeRailDataState === 'empty');
  }

  function acceptedSource(scope, payload) {
    var region = getRegion(scope);
    if (!freshRail(region)) return null;
    var services = payload?.data?.services;
    return Array.isArray(services) ? moreServices(services) : null;
  }

  function optionByText(select, label) {
    if (!select?.options) return null;
    var wanted = normalize(label);
    return Array.from(select.options).find(function (option) {
      return normalize(option.textContent) === wanted;
    }) || null;
  }

  function setSelectByText(select, label, fallbackLabel) {
    if (!select) return;
    var option = optionByText(select, label) || optionByText(select, fallbackLabel);
    if (option) select.value = option.value;
  }

  function labelText(select) {
    var label = select?.closest?.('label');
    var text = label?.querySelector?.('.filter-field__label')?.textContent || '';
    return normalize(text);
  }

  function markUnsupportedSelect(select, unsupportedValues) {
    if (!select) return;
    if (unsupportedValues === true) {
      select.disabled = true;
      select.setAttribute('aria-disabled', 'true');
      select.dataset.moreServicesUnsupported = 'true';
      return;
    }
    Array.from(select.options || []).forEach(function (option) {
      if ((unsupportedValues || []).includes(normalize(option.textContent))) option.disabled = true;
    });
  }

  function configureFilterControls(region) {
    var selects = Array.from(region.querySelectorAll('[data-more-filters-panel] select'));
    selects.forEach(function (select) {
      var label = labelText(select);
      if (select.matches('[data-home-staté-select]')) select.dataset.moreServicesFilter = 'state';
      else if (select.matches('[data-home-city-select]')) select.dataset.moreServicesFilter = 'city';
      else if (select.matches('[data-home-neighborhood-select]')) select.dataset.moreServicesFilter = 'neighborhood';
      else if (label === 'categoria') select.dataset.moreServicesFilter = 'categories';
      else if (label === 'avaliacao') select.dataset.moreServicesFilter = 'minRating';
      else if (label === 'garantia') {
        select.dataset.moreServicesFilter = 'guaranteed';
        markUnsupportedSelect(select, ['sem garantia']);
      } else if (label === 'atende emergencias') {
        select.dataset.moreServicesFilter = 'emergency';
        markUnsupportedSelect(select, ['nao']);
      } else if (label === 'online ou presencial') {
        select.dataset.moreServicesFilter = 'online';
        markUnsupportedSelect(select, ['presencial', 'hibrido']);
      } else {
        markUnsupportedSelect(select, true);
      }
    });

    Array.from(region.querySelectorAll(QUICK_FILTER_SELECTOR)).forEach(function (chip) {
      var key = QUICK_FILTER_BY_LABEL[normalize(chip.textContent)];
      if (!key) {
        chip.disabled = true;
        chip.setAttribute('aria-disabled', 'true');
        chip.dataset.moreServicesUnsupported = 'true';
        chip.classList.remove('is-active');
        return;
      }
      chip.dataset.moreServicesFilter = key;
      chip.setAttribute('aria-pressed', 'false');
      chip.classList.remove('is-active');
    });
  }

  function configureTabs(region, intents) {
    Array.from(region.querySelectorAll(TAB_SELECTOR)).forEach(function (tab) {
      var intent = tab.dataset.moreServicesIntent || INTENT_BY_LABEL[normalize(tab.textContent)];
      if (!intent) return;
      tab.dataset.moreServicesIntent = intent;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(intent === intents.FOR_YOU));
      tab.setAttribute('aria-pressed', String(intent === intents.FOR_YOU));
      if (intent === intents.FOLLOWING) {
        tab.dataset.moreServicesAvailability = 'unavailable';
        tab.title = 'Em breve: depende da autoridade canônica de profissionais seguidos.';
      }
    });
  }

  function ensureStateNodes(region) {
    var empty = region.querySelector('[data-list-empty]');
    if (!empty) {
      empty = document.createElement('div');
      empty.className = 'doke-list-state';
      empty.dataset.listEmpty = '';
      empty.hidden = true;

      var message = document.createElement('p');
      message.className = 'doke-list-state__description';
      message.dataset.listEmptyMessage = '';
      empty.appendChild(message);

      var controls = region.querySelector('.more-services__controls');
      if (controls?.parentNode) controls.parentNode.insertBefore(empty, controls.nextSibling);
      else region.appendChild(empty);
    }

    var feedback = region.querySelector('[data-more-services-count-feedback]');
    if (!feedback) {
      feedback = document.createElement('span');
      feedback.className = 'sr-only';
      feedback.dataset.moreServicesCountFeedback = '';
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      region.appendChild(feedback);
    }

    var reset = region.querySelector(FILTER_RESET_SELECTOR);
    var actions = region.querySelector('.more-filters__actions');
    if (!reset && actions) {
      reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'filter-action filter-action--ghost doke-btn doke-btn--ghost';
      reset.dataset.moreServicesReset = '';
      reset.textContent = 'Limpar filtros';
      actions.insertBefore(reset, actions.firstChild);
    }

    return { empty: empty, feedback: feedback, reset: reset };
  }

  function readRating(select) {
    var label = normalize(select?.selectedOptions?.[0]?.textContent || '');
    if (label.startsWith('4,8')) return 4.8;
    if (label.startsWith('4,5')) return 4.5;
    if (label.startsWith('4,0')) return 4.0;
    return 0;
  }

  function readBooleanSelect(select, positiveLabel) {
    return normalize(select?.selectedOptions?.[0]?.textContent || '') === normalize(positiveLabel);
  }

  function readControlValue(control) {
    var key = control.dataset.moreServicesFilter;
    if (control.matches('.filter-chip')) return { key: key, value: control.classList.contains('is-active') };
    if (key === 'categories') {
      var category = String(control.value || '').trim();
      return { key: key, value: normalize(category) === 'todas' || !category ? [] : [category] };
    }
    if (key === 'minRating') return { key: key, value: readRating(control) };
    if (key === 'guaranteed') return { key: key, value: readBooleanSelect(control, 'Com garantia') };
    if (key === 'emergency') return { key: key, value: readBooleanSelect(control, 'Sim') };
    if (key === 'online') return { key: key, value: readBooleanSelect(control, 'Online') };
    return { key: key, value: String(control.value || '').trim() };
  }

  function readDraft(region) {
    var draft = {};
    Array.from(region.querySelectorAll('[data-more-services-filter]')).forEach(function (control) {
      var key = control.dataset.moreServicesFilter;
      if (!key || control.disabled) return;
      var entry = readControlValue(control);
      draft[entry.key] = entry.value;
    });
    return draft;
  }

  function syncDraftUi(region, filters) {
    filters = filters || {};
    Array.from(region.querySelectorAll('[data-more-services-filter]')).forEach(function (control) {
      var key = control.dataset.moreServicesFilter;
      if (!key || control.disabled) return;
      if (control.matches('.filter-chip')) {
        var active = Boolean(filters[key]);
        control.classList.toggle('is-active', active);
        control.setAttribute('aria-pressed', String(active));
        return;
      }
      if (key === 'categories') {
        setSelectByText(control, filters.categories?.[0] || 'Todas', 'Todas');
      } else if (key === 'minRating') {
        var ratingLabel = filters.minRating ? String(filters.minRating).replace('.', ',') + '+ estrelas' : 'Qualquer nota';
        setSelectByText(control, ratingLabel, 'Qualquer nota');
      } else if (key === 'guaranteed') {
        setSelectByText(control, filters.guaranteed ? 'Com garantia' : 'Tanto faz', 'Tanto faz');
      } else if (key === 'emergency') {
        setSelectByText(control, filters.emergency ? 'Sim' : 'Tanto faz', 'Tanto faz');
      } else if (key === 'online') {
        setSelectByText(control, filters.online ? 'Online' : 'Tanto faz', 'Tanto faz');
      } else {
        control.value = String(filters[key] || '');
      }
    });
  }

  function syncTabs(region, snapshot) {
    Array.from(region.querySelectorAll(TAB_SELECTOR)).forEach(function (tab) {
      var selected = tab.dataset.moreServicesIntent === snapshot.intent;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-pressed', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
  }

  function abortLegacyReveal(grid) {
    grid?.__dokeProgressiveRevealController?.abort?.();
    if (grid?.__dokeProgressiveRevealController) delete grid.__dokeProgressiveRevealController;
  }

  function renderCards(grid, items) {
    if (!grid) return;
    abortLegacyReveal(grid);
    grid.replaceChildren();
    items.forEach(function (item) {
      grid.appendChild(Doke.publicServiceCard.create(item, { results: true }));
    });
  }

  function updateListState(region, snapshot) {
    if (!Doke.listState?.setListState) return;
    if (snapshot.resultState === 'ready') {
      Doke.listState.setListState(region, 'ready');
      return;
    }
    var message = 'Nenhum anúncio corresponde aos filtros aplicados.';
    if (snapshot.resultState === 'unavailable') {
      message = 'A aba Seguindo ficará disponível quando a Doke tiver uma fonte canônica de profissionais seguidos.';
    }
    Doke.listState.setListState(region, 'empty', { message: message });
  }

  function resultFeedback(snapshot) {
    if (snapshot.resultState === 'unavailable') return 'Seguindo ainda não está disponível.';
    var suffix = snapshot.resultCount === 1 ? ' anúncio encontrado.' : ' anúncios encontrados.';
    return snapshot.resultCount + suffix;
  }

  function render(binding, snapshot) {
    if (!binding || !currentRoot(binding.root)) return snapshot;
    var region = binding.region;
    var grid = binding.grid;
    if (!freshRail(region)) return snapshot;

    renderCards(grid, snapshot.visibleItems);
    syncTabs(region, snapshot);
    syncDraftUi(region, snapshot.draftFilters);
    updateListState(region, snapshot);

    var loadHost = region.querySelector('[data-more-services-load-host]');
    var loadButton = region.querySelector(LOAD_SELECTOR);
    if (loadHost) loadHost.hidden = snapshot.resultState !== 'ready' || snapshot.resultCount <= INITIAL_LIMIT;
    if (loadButton) loadButton.hidden = !snapshot.hasMore;

    region.dataset.moreServicesIntent = snapshot.intent;
    region.dataset.moreServicesAvailability = snapshot.availabilityState;
    region.dataset.moreServicesResultCount = String(snapshot.resultCount);
    region.dataset.moreServicesVisibleCount = String(snapshot.visibleCount);
    region.dataset.moreServicesActiveFilterCount = String(snapshot.activeFilterCount);
    region.dataset.moreServicesGeneration = String(snapshot.generation);
    grid.dataset.itemCount = String(snapshot.resultCount);

    var feedback = region.querySelector('[data-more-services-count-feedback]');
    if (feedback) feedback.textContent = resultFeedback(snapshot);
    return snapshot;
  }

  function acceptPayload(binding, payload) {
    if (!binding || !currentRoot(binding.root)) return null;
    var source = acceptedSource(binding.root, payload);
    if (source === null) return null;
    var nextSnapshot = binding.controller.setSource(source);
    return render(binding, nextSnapshot);
  }

  function supportedControl(target, selector) {
    return target?.closest?.(selector) || null;
  }

  function handleClick(binding, event) {
    if (!binding || !currentRoot(binding.root)) return;
    var target = event.target;

    var tab = supportedControl(target, TAB_SELECTOR);
    if (tab && binding.region.contains(tab) && tab.dataset.moreServicesIntent) {
      event.preventDefault();
      event.stopPropagation();
      var intentSnapshot = binding.controller.setIntent(tab.dataset.moreServicesIntent);
      render(binding, intentSnapshot);
      return;
    }

    var quick = supportedControl(target, QUICK_FILTER_SELECTOR);
    if (quick && binding.region.contains(quick) && quick.dataset.moreServicesFilter && !quick.disabled) {
      event.preventDefault();
      event.stopPropagation();
      var key = quick.dataset.moreServicesFilter;
      var currentDraft = binding.controller.getSnapshot().draftFilters;
      binding.controller.setDraft({ [key]: !currentDraft[key] });
      syncDraftUi(binding.region, binding.controller.getSnapshot().draftFilters);
      return;
    }

    var loadButton = supportedControl(target, LOAD_SELECTOR);
    if (loadButton && binding.region.contains(loadButton)) {
      event.preventDefault();
      event.stopPropagation();
      render(binding, binding.controller.revealMore());
      return;
    }

    var apply = supportedControl(target, FILTER_APPLY_SELECTOR);
    if (apply && binding.region.contains(apply)) {
      binding.controller.replaceDraft(readDraft(binding.region));
      render(binding, binding.controller.applyDraft());
      return;
    }

    var reset = supportedControl(target, FILTER_RESET_SELECTOR);
    if (reset && binding.region.contains(reset)) {
      event.preventDefault();
      var resetSnapshot = binding.controller.resetFilters();
      syncDraftUi(binding.region, resetSnapshot.appliedFilters);
      render(binding, resetSnapshot);
      return;
    }

    var close = supportedControl(target, FILTER_CLOSE_SELECTOR);
    if (close && binding.region.contains(close)) {
      var filters = binding.controller.cancelDraft();
      syncDraftUi(binding.region, filters);
    }
  }

  function handleChange(binding, event) {
    var control = supportedControl(event.target, '[data-more-services-filter]');
    if (!control || !binding.region.contains(control) || control.disabled) return;
    binding.controller.replaceDraft(readDraft(binding.region));
  }

  function createBinding(scope) {
    var region = getRegion(scope);
    var grid = region?.querySelector(GRID_SELECTOR);
    var stateApi = Doke.homeMoreServicesState;
    if (!region || !grid || !stateApi?.createController || !Doke.publicServiceCard?.create) return null;

    root[BINDING_KEY]?.abortController?.abort();
    var abortController = new AbortController();
    var controller = stateApi.createController({
      items: [],
      initialLimit: Number.parseInt(grid.dataset.moreServicesLimit || '', 10) || INITIAL_LIMIT,
      step: Number.parseInt(grid.dataset.moreServicesStep || '', 10) || REVEAL_STEP
    });
    var binding = {
      root: scope,
      region: region,
      grid: grid,
      controller: controller,
      abortController: abortController
    };

    configureTabs(region, stateApi.intents);
    configureFilterControls(region);
    ensureStateNodes(region);
    syncDraftUi(region, controller.getSnapshot().draftFilters);

    region.addEventListener('click', function (event) {
      handleClick(binding, event);
    }, { capture: true, signal: abortController.signal });
    region.addEventListener('change', function (event) {
      handleChange(binding, event);
    }, { signal: abortController.signal });

    root[BINDING_KEY] = binding;
    return binding;
  }

  function ensureBinding() {
    var scope = getRoot();
    if (!scope) return null;
    var current = root[BINDING_KEY];
    if (current?.root === scope && currentRoot(scope)) return current;
    return createBinding(scope);
  }

  function boot() {
    var binding = ensureBinding();
    if (!binding) return null;
    var last = Doke.indexDataController?.lastPayload;
    if (last) acceptPayload(binding, last);
    return binding;
  }

  document.addEventListener('doke:index-data-ready', function (event) {
    var binding = ensureBinding();
    if (!binding) return;
    acceptPayload(binding, event.detail);
  });

  document.addEventListener('doke:home-services-rendered', function () {
    var binding = ensureBinding();
    if (!binding || !freshRail(binding.region)) return;
    root.setTimeout(function () {
      if (!currentRoot(binding.root)) return;
      render(binding, binding.controller.getSnapshot());
    }, 0);
  });

  Doke.homeMoreServicesSurface = Object.freeze({
    boot: boot,
    acceptPayload: function (payload) {
      var binding = ensureBinding();
      return binding ? acceptPayload(binding, payload) : null;
    },
    getSnapshot: function () {
      return root[BINDING_KEY]?.controller?.getSnapshot() || null;
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
