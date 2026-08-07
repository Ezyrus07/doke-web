(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var CONTRACT = 'home-more-services-state-v1';
  var DEFAULT_INTENT = 'for-you';
  var INTENTS = Object.freeze({
    FOR_YOU: 'for-you',
    FOLLOWING: 'following',
    TOP_RATED: 'top-rated',
    GUARANTEED: 'guaranteed',
    AVAILABLE_TODAY: 'available-today',
    NEWEST: 'newest'
  });
  var INTENT_VALUES = Object.freeze(Object.keys(INTENTS).map(function (key) { return INTENTS[key]; }));
  var BOOLEAN_FILTER_KEYS = Object.freeze(['guaranteed', 'emergency', 'online', 'availableToday']);

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR');
  }

  function cleanNumber(value) {
    var number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function normalizeCategories(values) {
    var source = [];
    if (Array.isArray(values)) source = values;
    else if (values) source = [values];
    var seen = Object.create(null);
    return Object.freeze(source.map(cleanText).filter(function (value) {
      var key = normalizeText(value);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    }));
  }

  function freezeFilters(value) {
    value = value || {};
    return Object.freeze({
      categories: normalizeCategories(value.categories || value.category),
      state: cleanText(value.state || value.staté),
      city: cleanText(value.city),
      neighborhood: cleanText(value.neighborhood),
      minRating: cleanNumber(value.minRating),
      guaranteed: Boolean(value.guaranteed),
      emergency: Boolean(value.emergency),
      online: Boolean(value.online),
      availableToday: Boolean(value.availableToday)
    });
  }

  function activeFilterCount(filters) {
    filters = freezeFilters(filters);
    var count = filters.categories.length;
    if (filters.state) count += 1;
    if (filters.city) count += 1;
    if (filters.neighborhood) count += 1;
    if (filters.minRating) count += 1;
    BOOLEAN_FILTER_KEYS.forEach(function (key) {
      if (filters[key]) count += 1;
    });
    return count;
  }

  function resolveRating(item) {
    item = item || {};
    var candidates = [item.rating, item.providerRating, item.averageRating, item.average_rating];
    for (var candidate of candidates) {
      var rating = Number(candidate);
      if (Number.isFinite(rating) && rating > 0) return rating;
    }
    return 0;
  }

  function resolveTimestamp(item) {
    item = item || {};
    var candidates = [item.createdAt, item.created_at, item.updatedAt, item.updated_at];
    for (var candidate of candidates) {
      var timestamp = Date.parse(cleanText(candidate));
      if (Number.isFinite(timestamp)) return timestamp;
    }
    return 0;
  }

  function resolveCategory(item) {
    item = item || {};
    return cleanText(item.category || item.catégory);
  }

  function resolveState(item) {
    item = item || {};
    return cleanText(item.state || item.staté);
  }

  function matchesFilters(item, filters) {
    filters = freezeFilters(filters);
    item = item || {};

    var category = normalizeText(resolveCategory(item));
    var matchesCategory = !filters.categories.length || filters.categories.some(function (candidate) {
      var normalizedCandidate = normalizeText(candidate);
      return category === normalizedCandidate || category.includes(normalizedCandidate);
    });
    var matchesState = !filters.state || normalizeText(resolveState(item)) === normalizeText(filters.state);
    var matchesCity = !filters.city || normalizeText(item.city) === normalizeText(filters.city);
    var matchesNeighborhood = !filters.neighborhood || normalizeText(item.neighborhood) === normalizeText(filters.neighborhood);
    var matchesRating = !filters.minRating || resolveRating(item) >= filters.minRating;
    var matchesGuaranteed = !filters.guaranteed || item.guaranteed === true;
    var matchesEmergency = !filters.emergency || item.emergency === true;
    var matchesOnline = !filters.online || item.online === true;
    var matchesToday = !filters.availableToday || item.availableToday === true;

    return matchesCategory
      && matchesState
      && matchesCity
      && matchesNeighborhood
      && matchesRating
      && matchesGuaranteed
      && matchesEmergency
      && matchesOnline
      && matchesToday;
  }

  function validateIntent(intent) {
    var normalized = cleanText(intent) || DEFAULT_INTENT;
    if (INTENT_VALUES.includes(normalized)) return normalized;
    var error = new Error('Intent de Mais anúncios não reconhecido.');
    error.code = 'DOKE_HOME_MORE_SERVICES_INTENT_INVALID';
    throw error;
  }

  function applyIntent(items, intent) {
    var source = Array.isArray(items) ? items.slice() : [];
    intent = validateIntent(intent);

    if (intent === INTENTS.FOLLOWING) {
      return Object.freeze({
        availabilityState: 'unavailable',
        unavailableReason: 'following-authority-unavailable',
        items: Object.freeze([])
      });
    }

    if (intent === INTENTS.TOP_RATED) {
      source = source
        .map(function (item, index) { return { item: item, index: index, rating: resolveRating(item) }; })
        .filter(function (entry) { return entry.rating > 0; })
        .sort(function (left, right) { return right.rating - left.rating || left.index - right.index; })
        .map(function (entry) { return entry.item; });
    } else if (intent === INTENTS.GUARANTEED) {
      source = source.filter(function (item) { return item?.guaranteed === true; });
    } else if (intent === INTENTS.AVAILABLE_TODAY) {
      source = source.filter(function (item) { return item?.availableToday === true; });
    } else if (intent === INTENTS.NEWEST) {
      source = source
        .map(function (item, index) { return { item: item, index: index, timestamp: resolveTimestamp(item) }; })
        .filter(function (entry) { return entry.timestamp > 0; })
        .sort(function (left, right) { return right.timestamp - left.timestamp || left.index - right.index; })
        .map(function (entry) { return entry.item; });
    }

    return Object.freeze({
      availabilityState: 'available',
      unavailableReason: '',
      items: Object.freeze(source)
    });
  }

  function derive(items, intent, filters) {
    var intentResult = applyIntent(items, intent);
    if (intentResult.availabilityState !== 'available') return intentResult;
    return Object.freeze({
      availabilityState: 'available',
      unavailableReason: '',
      items: Object.freeze(intentResult.items.filter(function (item) {
        return matchesFilters(item, filters);
      }))
    });
  }

  function emit(snapshot) {
    if (!root.document || typeof root.document.dispatchEvent !== 'function' || typeof root.CustomEvent !== 'function') return;
    root.document.dispatchEvent(new root.CustomEvent('doke:home-more-services-state-change', {
      detail: Object.freeze({
        contract: CONTRACT,
        intent: snapshot.intent,
        activeFilterCount: snapshot.activeFilterCount,
        resultCount: snapshot.resultCount,
        visibleCount: snapshot.visibleCount,
        generation: snapshot.generation,
        availabilityState: snapshot.availabilityState,
        resultState: snapshot.resultState
      })
    }));
  }

  function positiveInteger(value, fallback) {
    var number = Number.parseInt(value, 10);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function createController(options) {
    options = options || {};
    var source = Array.isArray(options.items) ? options.items.slice() : [];
    var intent = validateIntent(options.intent || DEFAULT_INTENT);
    var appliedFilters = freezeFilters(options.filters);
    var draftFilters = appliedFilters;
    var initialLimit = positiveInteger(options.initialLimit, 6);
    var step = positiveInteger(options.step, 3);
    var visibleLimit = initialLimit;
    var generation = 1;

    function snapshot() {
      var result = derive(source, intent, appliedFilters);
      var resultCount = result.items.length;
      var visibleCount = Math.min(resultCount, visibleLimit);
      var resultState = 'empty';
      if (result.availabilityState !== 'available') resultState = 'unavailable';
      else if (resultCount > 0) resultState = 'ready';
      return Object.freeze({
        contract: CONTRACT,
        intent: intent,
        draftFilters: draftFilters,
        appliedFilters: appliedFilters,
        activeFilterCount: activeFilterCount(appliedFilters),
        availabilityState: result.availabilityState,
        unavailableReason: result.unavailableReason,
        resultState: resultState,
        resultCount: resultCount,
        visibleCount: visibleCount,
        hasMore: visibleCount < resultCount,
        generation: generation,
        items: result.items,
        visibleItems: Object.freeze(result.items.slice(0, visibleCount))
      });
    }

    function publish() {
      var current = snapshot();
      emit(current);
      return current;
    }

    function resetReveal() {
      visibleLimit = initialLimit;
    }

    function setSource(items) {
      source = Array.isArray(items) ? items.slice() : [];
      resetReveal();
      generation += 1;
      return publish();
    }

    function setIntent(nextIntent) {
      var normalized = validateIntent(nextIntent);
      if (normalized === intent) return snapshot();
      intent = normalized;
      resetReveal();
      generation += 1;
      return publish();
    }

    function setDraft(next) {
      if (!next) return draftFilters;
      draftFilters = freezeFilters({ ...draftFilters, ...next });
      return draftFilters;
    }

    function replaceDraft(next) {
      draftFilters = freezeFilters(next);
      return draftFilters;
    }

    function cancelDraft() {
      draftFilters = appliedFilters;
      return draftFilters;
    }

    function applyDraft() {
      appliedFilters = freezeFilters(draftFilters);
      draftFilters = appliedFilters;
      resetReveal();
      generation += 1;
      return publish();
    }

    function resetFilters() {
      appliedFilters = freezeFilters();
      draftFilters = appliedFilters;
      resetReveal();
      generation += 1;
      return publish();
    }

    function revealMore() {
      var current = snapshot();
      if (!current.hasMore) return current;
      visibleLimit = Math.min(current.resultCount, visibleLimit + step);
      generation += 1;
      return publish();
    }

    return Object.freeze({
      contract: CONTRACT,
      getSnapshot: snapshot,
      setSource: setSource,
      setIntent: setIntent,
      setDraft: setDraft,
      replaceDraft: replaceDraft,
      cancelDraft: cancelDraft,
      applyDraft: applyDraft,
      resetFilters: resetFilters,
      revealMore: revealMore
    });
  }

  Doke.homeMoreServicesState = Object.freeze({
    contract: CONTRACT,
    intents: INTENTS,
    freezeFilters: freezeFilters,
    activeFilterCount: activeFilterCount,
    resolveRating: resolveRating,
    resolveTimestamp: resolveTimestamp,
    matchesFilters: matchesFilters,
    applyIntent: applyIntent,
    derive: derive,
    createController: createController
  });
})();
