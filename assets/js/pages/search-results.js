window.DokeInitSearchResults = function DokeInitSearchResults() {
  window.DokeSearchResultsCleanup?.();

  const routeController = new AbortController();
  const { signal } = routeController;
  const searchData = window.DokeSearchData || {};
  const params = new URLSearchParams(window.location.search);
  const uiSelectApi = window.DokeUiSelect;

  const queryAny = (...selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) return node;
    }
    return null;
  };

  const queryAllAny = (...selectors) => {
    for (const selector of selectors) {
      const nodes = [...document.querySelectorAll(selector)];
      if (nodes.length) return nodes;
    }
    return [];
  };

  const els = {
    resultsSearchForm: queryAny('[data-results-search-form]', '[data-results-topbar-search]', '[data-global-topbar-search]'),
    resultsSearchInput: queryAny('[data-results-search-input]', '[data-results-topbar-search] input[type="search"]', '[data-global-topbar-search] input[type="search"]'),
    resultsSearchBox: queryAny('[data-results-searchbox]', '[data-results-topbar-search]', '[data-global-topbar-search]'),
    resultsSearchDropdown: queryAny('[data-results-search-dropdown]'),
    resultsRecommendationList: queryAny('[data-results-recommendation-list]'),
    resultsRecommendationsSection: queryAny('[data-results-recommendations-section]'),
    resultsHistorySection: queryAny('[data-results-history-section]'),
    resultsSearchHistoryList: queryAny('[data-results-search-history-list]'),
    resultsSuggestionsSection: queryAny('[data-results-suggestions-section]'),
    resultsSearchResultsList: queryAny('[data-results-search-results-list]'),
    resultsSearchEmpty: queryAny('[data-results-search-empty]'),
    resultsSearchClear: queryAny('[data-results-search-clear]'),
    topbarSearchForm: queryAny('[data-results-topbar-search]', '[data-global-topbar-search]'),
    topbarSearchInput: queryAny('[data-results-topbar-search] input[type="search"]', '[data-results-topbar-input]', '[data-global-topbar-search] input[type="search"]'),
    resultsFiltersOpenButtons: queryAllAny('[data-results-filters-open]'),
    resultsFiltersCloseButton: queryAny('[data-results-filters-close]'),
    resultsFiltersBackdrop: queryAny('[data-results-filters-backdrop]'),
    searchModeInputs: queryAllAny('input[name="searchType"]'),
    filtersForm: queryAny('[data-results-filters-form]'),
    categoryList: queryAny('[data-results-category-list]', '[data-results-catégory-list]'),
    stateSelect: queryAny('[data-results-state-select]', '[data-results-staté-select]'),
    citySelect: queryAny('[data-results-city-select]'),
    neighborhoodSelect: queryAny('[data-results-neighborhood-select]'),
    cepFillButton: queryAny('[data-results-cep-fill]'),
    cepRow: queryAny('[data-results-cep-row]'),
    cepInput: queryAny('[data-results-cep-input]'),
    loadingState: queryAny('[data-results-loading]'),
    resultsGrid: queryAny('[data-results-grid]'),
    resultsEmptyTitle: queryAny('[data-results-empty-title]'),
    resultsEmptyText: queryAny('[data-results-empty-text]'),
    resultsInlineEmpty: queryAny('[data-results-inline-empty]'),
    resultsActiveChips: queryAny('[data-results-active-chips]'),
    resultsEmptyReset: queryAny('[data-results-empty-reset]'),
    resultsSummary: queryAny('[data-results-summary]'),
    resultsUsersSection: queryAny('[data-results-users]'),
    resultsUsersGrid: queryAny('[data-results-users-grid]'),
    resultsVideosSection: queryAny('[data-results-videos]'),
    resultsVideosGrid: queryAny('[data-results-videos-grid]'),
    resultsBeforeAfterSection: queryAny('[data-results-before-after]'),
    resultsBeforeAfterGrid: queryAny('[data-results-before-after-grid]'),
    resultsTitle: queryAny('[data-results-title]'),
    resultsDescription: queryAny('[data-results-description]'),
    resultsCount: queryAny('[data-results-count]'),
    uiModal: queryAny('[data-ui-modal]'),
    uiModalClose: queryAny('[data-ui-modal-close]'),
    uiModalEyebrow: queryAny('[data-ui-modal-eyebrow]'),
    uiModalTitle: queryAny('[data-ui-modal-title]'),
    uiModalText: queryAny('[data-ui-modal-text]'),
    uiModalField: queryAny('[data-ui-modal-field]'),
    uiModalLabel: queryAny('[data-ui-modal-label]'),
    uiModalInput: queryAny('[data-ui-modal-input]'),
    uiModalCancel: queryAny('[data-ui-modal-cancel]'),
    uiModalConfirm: queryAny('[data-ui-modal-confirm]'),
    stateHosts: queryAllAny('[data-results-state]')
  };

  if (!els.resultsSearchForm || !els.resultsSearchInput || !els.filtersForm || !els.resultsGrid) {
    return;
  }

  const normalize = searchData.normalize || ((value = '') => String(value || '').toLowerCase());
  const servicePool = searchData.servicePool || [];
  const getServiceMatches = searchData.getServiceMatches || (() => []);
  const getUserMatches = searchData.getUserMatches || (() => []);
  const getShortVideoMatches = searchData.getShortVideoMatches || (() => []);
  const getBeforeAfterMatches = searchData.getBeforeAfterMatches || (() => []);
  const addSearchHistory = searchData.addSearchHistory || (() => {});
  const getSearchHistory = searchData.getSearchHistory || (() => []);
  const saveSearchHistory = searchData.saveSearchHistory || (() => {});
  const getSuggestionMatches = searchData.getSuggestionMatches || (() => []);
  const recommendations = searchData.recommendations || [];
  const categories = searchData.categories || searchData.catégories || [];
  const locationOptions = searchData.locationOptions || {};
  const states = locationOptions.states || locationOptions.statés || [];
  const citiesByState = locationOptions.citiesByState || locationOptions.citiesByStaté || {};
  const neighborhoodsByCity = locationOptions.neighborhoodsByCity || {};
  const cepLookup = locationOptions.cepLookup || {};

  let activeModalResolver = null;
  let resultsLoadTimer = null;
  let activeSearchIndex = -1;
  let activeSearchMode = 'services';
  let previewController = null;

  window.DokeSearchResultsCleanup = () => {
    routeController.abort();
    document.body.classList.remove('results-filters-open');
    if (resultsLoadTimer) window.clearTimeout(resultsLoadTimer);
    previewController?.abort();
    previewController = null;
    closeResultsSearchDropdown();
    closeModal(false);
    closeInlineCep(false);
  };


  const searchItemIcon = (type = 'search') => {
    if (type === 'history') {
      return '<svg viewBox="0 0 24 24"><path d="M12 7.5v5l3 2"></path><path d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1"></path><path d="M4.8 5.7v3.6h3.6"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>';
  };

  const createSuggestionButton = ({ label, meta, badge, value, type = 'search' }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-suggestion';
    button.dataset.value = value || label;
    button.innerHTML = `
      <span class="search-suggestion__main">
        <span class="search-suggestion__icon" aria-hidden="true">${searchItemIcon(type)}</span>
        <span class="search-suggestion__text">
          <span class="search-suggestion__label">${label}</span>
          <span class="search-suggestion__meta">${meta || ''}</span>
        </span>
      </span>
      <span class="search-suggestion__badge">${badge || ''}</span>
    `;
    return button;
  };

  const renderResultsRecommendations = () => {
    if (!els.resultsRecommendationList) return;
    els.resultsRecommendationList.innerHTML = '';
    recommendations.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-chip';
      button.dataset.value = item;
      button.innerHTML = `${searchItemIcon()}<span>${item}</span>`;
      els.resultsRecommendationList.appendChild(button);
    });
  };

  const renderResultsHistory = () => {
    if (!els.resultsSearchHistoryList) return 0;
    const history = getSearchHistory();
    els.resultsSearchHistoryList.innerHTML = '';
    history.forEach((item) => {
      els.resultsSearchHistoryList.appendChild(
        createSuggestionButton({
          label: item,
          meta: 'Pesquisa recente',
          badge: 'Histórico',
          value: item,
          type: 'history'
        })
      );
    });
    return history.length;
  };

  const renderResultsSuggestions = (query = '') => {
    if (!els.resultsSearchResultsList) return 0;
    els.resultsSearchResultsList.innerHTML = '';
    activeSearchIndex = -1;

    const cleanQuery = String(query || '').trim();
    if (cleanQuery.length < 2) {
      return 0;
    }

    const matches = getSuggestionMatches(cleanQuery);
    matches.forEach((item) => {
      els.resultsSearchResultsList.appendChild(createSuggestionButton(item));
    });

    return matches.length;
  };

  const syncResultsSearchSections = (query = '') => {
    const cleanQuery = String(query || '').trim();
    const recommendationCount = els.resultsRecommendationList?.children.length || 0;
    const historyCount = els.resultsSearchHistoryList?.children.length || 0;
    const suggestionCount = els.resultsSearchResultsList?.children.length || 0;
    const hasQuery = cleanQuery.length >= 2;

    if (els.resultsSuggestionsSection) {
      // Static recommendation chips live in the “Sugestões” section.
      els.resultsSuggestionsSection.hidden = recommendationCount === 0;
    }

    if (els.resultsHistorySection) {
      // Match index.html: empty input shows recent searches; typed queries prioritize suggestions/results.
      els.resultsHistorySection.hidden = historyCount === 0 || hasQuery;
    }

    if (els.resultsRecommendationsSection) {
      // Matched autocomplete rows live in the “Resultados” section.
      els.resultsRecommendationsSection.hidden = suggestionCount === 0 || !hasQuery;
    }

    if (els.resultsSearchEmpty) {
      // resultados.html already renders its own fallback cards/empty state.
      // The autocomplete should stay compact and never duplicate an empty-results panel.
      els.resultsSearchEmpty.hidden = true;
    }
  };

  const openResultsSearchDropdown = () => {
    if (!els.resultsSearchDropdown || !els.resultsSearchInput) return;
    els.resultsSearchDropdown.hidden = false;
    els.resultsSearchBox?.classList.add('is-search-open');
    els.resultsSearchInput.setAttribute('aria-expanded', 'true');
  };

  function closeResultsSearchDropdown() {
    if (!els.resultsSearchDropdown || !els.resultsSearchInput) return;
    els.resultsSearchDropdown.hidden = true;
    els.resultsSearchBox?.classList.remove('is-search-open');
    els.resultsSearchInput.setAttribute('aria-expanded', 'false');
    activeSearchIndex = -1;
  }

  const syncResultsSearchDropdown = () => {
    if (!els.resultsSearchDropdown || !els.resultsSearchInput) return;

    renderResultsRecommendations();
    renderResultsHistory();
    renderResultsSuggestions(els.resultsSearchInput.value);
    syncResultsSearchSections(els.resultsSearchInput.value);

    const shouldOpen = Boolean(
      (els.resultsRecommendationsSection && !els.resultsRecommendationsSection.hidden) ||
      (els.resultsHistorySection && !els.resultsHistorySection.hidden) ||
      (els.resultsSuggestionsSection && !els.resultsSuggestionsSection.hidden)
    );

    if (shouldOpen) {
      openResultsSearchDropdown();
      return;
    }

    closeResultsSearchDropdown();
  };

  const getVisibleResultsSearchOptions = () => {
    if (!els.resultsSearchDropdown || els.resultsSearchDropdown.hidden) return [];
    return [...els.resultsSearchDropdown.querySelectorAll('.search-suggestion:not([hidden]), .search-chip:not([hidden])')];
  };

  const getSearchMode = () =>
    els.searchModeInputs.find((input) => input.checked)?.value || activeSearchMode || 'services';

  const setSearchMode = (mode = 'services') => {
    activeSearchMode = ['services', 'users', 'workers', 'before-after'].includes(mode) ? mode : 'services';
    els.searchModeInputs.forEach((input) => {
      input.checked = input.value === activeSearchMode;
    });
    syncResultsMode(activeSearchMode);
  };

  const syncResultsMode = (mode = getSearchMode()) => {
    const safeMode = ['services', 'users', 'workers', 'before-after'].includes(mode) ? mode : 'services';
    resultsLayout?.setAttribute('data-results-mode', safeMode);
    els.resultsGrid?.setAttribute('data-results-mode', safeMode);
  };

  const refreshResultPreviews = () => {
    previewController?.abort();
    previewController = new AbortController();
    const previewSignal = previewController.signal;
    window.DokeHomeBeforeAfter?.create({ signal: previewSignal });
    window.DokeHomeWorkers?.create({ signal: previewSignal });
  };

  const BEFORE_AFTER_PREVIEW_IDS = {
    'ba-cozinha': 'case-kitchen',
    'ba-sala': 'case-reforma',
    'ba-banheiro': 'case-bathroom'
  };

  const getBeforeAfterPreviewId = (item = {}) => {
    if (item.previewId) return item.previewId;
    if (BEFORE_AFTER_PREVIEW_IDS[item.id]) return BEFORE_AFTER_PREVIEW_IDS[item.id];
    if (String(item.visualClass || '').includes('bathroom')) return 'case-bathroom';
    return 'case-reforma';
  };

  const fillSelectOptions = (select, values, placeholder) => {
    if (!select) return;
    const current = select.value;
    const options = ['<option value="">' + placeholder + '</option>']
      .concat((values || []).map((value) => `<option value="${String(value)}">${String(value)}</option>`));
    select.innerHTML = options.join('');
    if ([...select.options].some((option) => option.value === current)) {
      select.value = current;
    }
    uiSelectApi?.refresh(select);
  };

  const enhanceResultsSelects = () => {
    uiSelectApi?.enhanceAll(document);
    [els.stateSelect, els.citySelect, els.neighborhoodSelect].forEach((select) => {
      if (select) uiSelectApi?.refresh(select);
    });
  };

  const getSelectedCategoriesFromParams = () => {
    const raw = [
      ...params.getAll('category'),
      ...params.getAll('categories'),
      ...params.getAll('catégory'),
      ...params.getAll('catégorie')
    ];

    return [...new Set(raw.map((value) => String(value || '').trim()).filter(Boolean))];
  };

  const renderCategoryFilters = () => {
    if (!els.categoryList) return;

    const selected = getSelectedCategoriesFromParams();
    els.categoryList.innerHTML = categories
      .map((category) => {
        const checked = selected.some((item) => normalize(item) === normalize(category));
        return `
          <label class="results-category-chip">
            <input type="checkbox" name="categories" value="${category}" ${checked ? 'checked' : ''} />
            <span>${category}</span>
          </label>
        `;
      })
      .join('');
  };

  const bootstrapLocationSelects = () => {
    fillSelectOptions(els.stateSelect, states, 'Qualquer estado');

    const stateValue = params.get('state') || params.get('staté') || '';
    if (els.stateSelect && stateValue) {
      els.stateSelect.value = stateValue;
      uiSelectApi?.refresh(els.stateSelect);
    }

    const cityOptions = citiesByState[els.stateSelect?.value || ''] || [];
    fillSelectOptions(els.citySelect, cityOptions, 'Qualquer cidade');
    const cityValue = params.get('city') || '';
    if (els.citySelect && cityValue) {
      els.citySelect.value = cityValue;
      uiSelectApi?.refresh(els.citySelect);
    }

    const neighborhoodOptions = neighborhoodsByCity[els.citySelect?.value || ''] || [];
    fillSelectOptions(els.neighborhoodSelect, neighborhoodOptions, 'Qualquer bairro');
    const neighborhoodValue = params.get('neighborhood') || '';
    if (els.neighborhoodSelect && neighborhoodValue) {
      els.neighborhoodSelect.value = neighborhoodValue;
      uiSelectApi?.refresh(els.neighborhoodSelect);
    }

    const minRatingSelect = els.filtersForm.querySelector('select[name="minRating"]');
    const minRatingValue = params.get('minRating') || '';
    if (minRatingSelect && minRatingValue) {
      minRatingSelect.value = minRatingValue;
      uiSelectApi?.refresh(minRatingSelect);
    }

    ['guaranteed', 'emergency', 'online', 'availableToday'].forEach((name) => {
      const input = els.filtersForm.querySelector(`[name="${name}"]`);
      if (input) input.checked = params.get(name) === '1';
    });
  };

  const syncInputs = (value) => {
    if (els.resultsSearchInput) els.resultsSearchInput.value = value;
    if (els.topbarSearchInput) els.topbarSearchInput.value = value;
  };

  const applySearchSuggestion = (value) => {
    const cleanValue = String(value || '').trim();
    if (!cleanValue) return;
    syncInputs(cleanValue);
    closeResultsSearchDropdown();
    setQuery(cleanValue);
    loadResults();
  };

  const setResultsState = (state) => {
    const isLoading = state === 'loading';
    const isEmpty = state === 'empty';

    els.stateHosts.forEach((host) => {
      host.dataset.resultsState = state;
      host.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    });

    if (els.loadingState) els.loadingState.hidden = !isLoading;
    if (els.resultsGrid) els.resultsGrid.hidden = isLoading;
    if (els.resultsInlineEmpty) els.resultsInlineEmpty.hidden = !isEmpty;
  };

  const resultsLayout = queryAny('[data-results-layout]');
  const RESULTS_FILTERS_DESKTOP_MEDIA = '(min-width: 961px)';
  const filtersDesktopMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia(RESULTS_FILTERS_DESKTOP_MEDIA)
    : null;
  const isDesktopFilters = () => filtersDesktopMedia ? filtersDesktopMedia.matches : window.innerWidth > 960;

  const syncFilterUi = (isOpen) => {
    els.resultsFiltersOpenButtons.forEach((button) => button.setAttribute('aria-expanded', String(isOpen)));
    if (resultsLayout) {
      resultsLayout.classList.toggle('is-filters-open', isOpen && isDesktopFilters());
      resultsLayout.classList.toggle('is-filters-collapsed', !isOpen && isDesktopFilters());
    }
    if (els.resultsFiltersBackdrop) els.resultsFiltersBackdrop.hidden = !(!isDesktopFilters() && isOpen);
    document.body.classList.toggle('results-filters-open', isOpen);
    document.body.classList.toggle('results-filters-collapsed', !isOpen && isDesktopFilters());
  };

  const openMobileFilters = () => {
    syncFilterUi(true);
  };

  const closeMobileFilters = () => {
    syncFilterUi(false);
  };

  const toggleFilters = () => {
    const currentlyOpen = els.resultsFiltersOpenButtons.some((button) => button.getAttribute('aria-expanded') === 'true');
    syncFilterUi(!currentlyOpen);
  };

  const setQuery = (value) => {
    const cleanValue = String(value || '').trim();
    params.set('type', getSearchMode());

    if (cleanValue) {
      params.set('q', cleanValue);
      addSearchHistory(cleanValue);
    } else {
      params.delete('q');
    }

    syncInputs(cleanValue);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    return cleanValue;
  };

  const persistFiltersToParams = (filters) => {
    params.set('type', filters.searchType || getSearchMode());
    params.delete('category');
    params.delete('categories');
    params.delete('state');
    params.delete('city');
    params.delete('neighborhood');
    params.delete('minRating');
    ['guaranteed', 'emergency', 'online', 'availableToday'].forEach((name) => params.delete(name));

    filters.categories.forEach((category) => params.append('category', category));
    if (filters.state) params.set('state', filters.state);
    if (filters.city) params.set('city', filters.city);
    if (filters.neighborhood) params.set('neighborhood', filters.neighborhood);
    if (filters.minRating) params.set('minRating', String(filters.minRating));
    ['guaranteed', 'emergency', 'online', 'availableToday'].forEach((name) => {
      if (filters[name]) params.set(name, '1');
    });
  };

  const getFilters = () => {
    const formData = new FormData(els.filtersForm);
    return {
      searchType: getSearchMode(),
      categories: [...formData.getAll('categories')].map((value) => String(value || '').trim()).filter(Boolean),
      state: String(formData.get('state') || formData.get('staté') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      neighborhood: String(formData.get('neighborhood') || '').trim(),
      minRating: Number(formData.get('minRating') || 0),
      guaranteed: formData.get('guaranteed') === 'on',
      emergency: formData.get('emergency') === 'on',
      online: formData.get('online') === 'on',
      availableToday: formData.get('availableToday') === 'on'
    };
  };

  const formatCount = (value) => String(Math.max(0, Number(value) || 0));

  const createServiceCard = (item) => {
    const article = document.createElement('article');
    const rating = (Number(item.rating) || 0).toFixed(1).replace('.', ',');
    const reviews = item.reviews || '0 avaliações';
    const tags = (item.tags || []).slice(0, 2);
    const detailHref = item.href || 'detalhe-anuncio.html';
    const category = item.category || item.catégory || '';
    const mediaClass = String(item.mediaClass || '').replace(/service-card__media/g, 'doke-ad-card__media');

    article.className = 'doke-ad-card doke-ad-card--featured doke-ad-card--results';
    article.innerHTML = `
      <div class="doke-ad-card__media ${mediaClass}">
        <span class="doke-ad-card__badge ${item.badgeModifier || ''}">${item.badge || 'Em destaque'}</span>
        <button class="doke-ad-card__favorite" type="button" aria-label="Salvar anúncio">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 1 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2Z"></path></svg>
        </button>
      </div>

      <div class="doke-ad-card__body">
        <span class="doke-ad-card__category">${category}</span>
        <h3 class="doke-ad-card__title">${item.title || ''}</h3>

        <div class="doke-ad-card__rating" aria-label="Avaliação ${rating} baseada em ${reviews}">
          <span class="doke-ad-card__rating-star">★</span>
          <strong>${rating}</strong>
          <span>(${reviews})</span>
        </div>

        <div class="doke-ad-card__tags" aria-label="Tags do anúncio">
          ${tags.map((tag) => `<span>${tag}</span>`).join('')}
        </div>

        <div class="doke-ad-card__location">
          <span class="doke-ad-card__avatar ${item.avatarClass || ''}" aria-hidden="true"></span>
          <span class="doke-ad-card__location-text"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z"></path></svg><span>${item.location || ''}</span></span>
        </div>

        <div class="doke-ad-card__footer">
          <strong class="doke-ad-card__price">${item.price || ''}</strong>
          <a class="doke-ad-card__cta doke-btn doke-btn--success" href="${detailHref}" aria-label="Ver anúncio">Ver anúncio</a>
        </div>
      </div>
    `;
    return article;
  };

  const createUserCard = (item) => {
    const article = document.createElement('article');
    const rating = (Number(item.rating) || 0).toFixed(1).replace('.', ',');
    const reviews = item.jobs || item.reviews || 0;
    const normalizedText = normalize(`${item.id || ''} ${item.name || ''} ${item.role || ''}`);
    const avatarMap = {
      carlos: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=240',
      marcos: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=240',
      elaine: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=240',
      renata: 'https://images.pexels.com/photos/5212339/pexels-photo-5212339.jpeg?auto=compress&cs=tinysrgb&w=240',
      rafael: 'https://images.pexels.com/photos/8961438/pexels-photo-8961438.jpeg?auto=compress&cs=tinysrgb&w=240'
    };
    let avatarSrc = avatarMap.carlos;
    if (normalizedText.includes('marcos') || normalizedText.includes('eletricista')) avatarSrc = avatarMap.marcos;
    if (normalizedText.includes('elaine') || normalizedText.includes('diarista')) avatarSrc = avatarMap.elaine;
    if (normalizedText.includes('renata') || normalizedText.includes('professora')) avatarSrc = avatarMap.renata;
    if (normalizedText.includes('rafael') || normalizedText.includes('encanador')) avatarSrc = avatarMap.rafael;

    article.className = 'professional-showcase-card professional-showcase-card--results results-user-card';
    article.innerHTML = `
      <div class="professional-showcase-card__avatar-wrap">
        <img class="professional-showcase-card__avatar" src="${avatarSrc}" alt="${item.name || 'Profissional'}">
      </div>
      <div class="professional-showcase-card__identity">
        <h3 class="professional-showcase-card__name">${item.name || ''}</h3>
        <p class="professional-showcase-card__summary"><strong>(${rating})</strong> · ${reviews} avaliações</p>
        <p class="professional-showcase-card__role">${item.role || item.profession || 'Profissional Doke'}</p>
      </div>
      <div class="professional-showcase-card__actions">
        <a class="professional-showcase-card__cta doke-btn doke-btn--primary" href="perfil.html">Ver perfil</a>
      </div>
    `;
    return article;
  };

  const createVideoCard = (item) => {
    const article = document.createElement('article');
    const meta = searchData.getWorkerCardMeta ? searchData.getWorkerCardMeta(item) : item;
    article.className = `video-card doke-card doke-worker-card doke-media-card ${item.mediaClass || ''}`;
    article.dataset.workerTrigger = '';
    article.dataset.workerId = item.id || '';
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-haspopup', 'dialog');
    article.setAttribute('aria-label', `Abrir worker: ${item.title || 'vídeo'}`);
    article.innerHTML = `
      <div class="video-card__header">
        <span class="video-card__badge">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="3"></rect><path d="m10 9 4 3-4 3Z"></path></svg>
          <span>${meta.badgeLabel}</span>
        </span>
        <span class="video-card__save" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-7-4-7 4V6a1.5 1.5 0 0 1 1.5-1.5Z"></path></svg>
        </span>
      </div>
      <div class="video-card__content">
        <div class="video-card__identity">
          <span class="video-card__avatar" aria-hidden="true">${meta.avatarInitials}</span>
          <div class="video-card__text">
            <strong>${meta.author}</strong>
            <span>${meta.description}</span>
          </div>
        </div>
        <div class="video-card__meta">
          <span class="video-card__stat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            ${meta.views}
          </span>
          <span class="video-card__stat">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v4l3 2"></path></svg>
            ${meta.durationShort}
          </span>
        </div>
      </div>
    `;
    return article;
  };

  const createBeforeAfterCard = (item) => {
    const article = document.createElement('article');
    const previewId = getBeforeAfterPreviewId(item);
    const normalizedId = normalize(`${item.id || ''} ${item.title || ''}`);
    const isBeforeAfter = normalizedId.includes('banheiro') || normalizedId.includes('before') || normalizedId.includes('after') || normalizedId.includes('depois');
    const isVideo = normalizedId.includes('sala') || normalizedId.includes('tour') || normalizedId.includes('video');
    const title = isVideo ? 'Tour rápido da reforma' : (item.title || (isBeforeAfter ? 'Banheiro revitalizado sem quebra-quebra' : 'Cozinha com marcenaria sob medida'));
    const author = item.author || (isVideo || isBeforeAfter ? 'Renato Acabamentos' : 'Studio Casa Viva');
    const likes = item.likes || (isBeforeAfter ? 176 : isVideo ? 98 : 142);
    const comments = item.comments || (isBeforeAfter ? 31 : isVideo ? 19 : 28);
    const saves = item.saves || (isBeforeAfter ? 45 : isVideo ? 22 : 36);

    article.className = `publication-card ${isBeforeAfter ? 'publication-card--before-after' : isVideo ? 'publication-card--video' : 'publication-card--photo'} doke-card`;
    article.setAttribute('aria-label', `Publicação: ${title}`);
    article.dataset.beforeAfterTrigger = '';
    article.dataset.beforeAfterId = previewId;
    article.dataset.publicationKind = isBeforeAfter ? 'before-after' : isVideo ? 'video' : 'photo';
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-haspopup', 'dialog');

    const mediaMarkup = isBeforeAfter
      ? `<div class="publication-card__media publication-card__comparison">
          <span class="publication-card__type publication-card__type--comparison">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="6" height="14" rx="1.5"></rect><rect x="14" y="5" width="6" height="14" rx="1.5"></rect></svg>
            Antes e depois
          </span>
          <div class="publication-card__half publication-card__half--before"><span>Antes</span></div>
          <div class="publication-card__half publication-card__half--after"><span>Depois</span></div>
        </div>`
      : `<div class="publication-card__media ${isVideo ? 'publication-card__media--living' : 'publication-card__media--kitchen'}">
          <span class="publication-card__type">
            <svg viewBox="0 0 24 24" aria-hidden="true">${isVideo ? '<rect x="4" y="6" width="13" height="12" rx="2"></rect><path d="m17 10 3-2v8l-3-2"></path>' : '<rect x="4" y="7" width="16" height="12" rx="2"></rect><path d="M8 7l1.5-2h5L16 7"></path><circle cx="12" cy="13" r="3"></circle>'}</svg>
            ${isVideo ? 'Vídeo' : 'Foto'}
          </span>
          ${isVideo ? '<span class="publication-card__play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"></path></svg></span>' : ''}
        </div>`;

    article.innerHTML = `
      ${mediaMarkup}
      <div class="publication-card__content">
        <h3 class="publication-card__title">${title}</h3>
        <p class="publication-card__author">Por <a href="perfil.html">${author}</a></p>
        <div class="publication-card__actions" aria-label="Interações da publicação">
          <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4Z"></path></svg>${likes}</span>
          <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.2 11.5a7.3 7.3 0 0 1 7.6-7.1 7.3 7.3 0 0 1 7.6 7.1 7.3 7.3 0 0 1-7.6 7.1 8.7 8.7 0 0 1-2.9-.5L5 19.4l1.2-3.2a6.7 6.7 0 0 1-2-4.7Z"></path></svg>${comments}</span>
          <span class="publication-card__action"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v14l-7-4-7 4V6a1.5 1.5 0 0 1 1.5-1.5Z"></path></svg>${saves}</span>
        </div>
      </div>
    `;
    return article;
  };

  const getQueryTokens = (query = '') =>
    normalize(query)
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2);

  const getRelatedServices = (query, filters, limit = 6) => {
    const queryTokens = getQueryTokens(query);

    const scored = servicePool
      .filter((item) => {
        if (filters.state && normalize(item.state || item.staté) !== normalize(filters.state)) return false;
        if (filters.city && normalize(item.city) !== normalize(filters.city)) return false;
        return true;
      })
      .map((item) => {
        const itemText = normalize([
          item.title,
          item.category || item.catégory,
          item.location,
          item.region,
          ...(item.tags || []),
          ...(item.keywords || [])
        ].join(' '));

        let score = 0;
        queryTokens.forEach((token) => {
          if (itemText.includes(token)) score += 3;
        });
        if (filters.neighborhood && normalize(item.neighborhood) === normalize(filters.neighborhood)) score += 5;
        if (filters.state && normalize(item.state || item.staté) === normalize(filters.state)) score += 2;
        if (filters.categories.length && filters.categories.some((category) => itemText.includes(normalize(category)))) score += 3;
        if (!queryTokens.length && filters.city && normalize(item.city) === normalize(filters.city)) score += 2;
        score += Math.max(0, Math.round((Number(item.rating) || 0) * 2));
        return { item, score };
      })
      .filter((entry) => entry.score > 0 || !queryTokens.length)
      .sort((a, b) => b.score - a.score || (Number(b.item.rating) || 0) - (Number(a.item.rating) || 0))
      .slice(0, limit)
      .map((entry) => entry.item);

    if (scored.length >= limit) return scored;

    const fallback = servicePool
      .filter((item) => !scored.some((existing) => existing.id === item.id))
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, Math.max(0, limit - scored.length));

    return [...scored, ...fallback];
  };

  const renderActiveChips = (query, filters, count) => {
    if (!els.resultsActiveChips) return;

    const chips = [];
    // The visible search pill already communicates the current query. Keep this
    // rail for secondary filters only to avoid duplicate “Busca: ...” chips.
    if (filters.categories.length) chips.push(...filters.categories);
    if (filters.state) chips.push(filters.state);
    if (filters.city) chips.push(filters.city);
    if (filters.neighborhood) chips.push(filters.neighborhood);
    if (filters.guaranteed) chips.push('Com garantia');
    if (filters.emergency) chips.push('Atendimento emergencial');
    if (filters.online) chips.push('Online');
    if (filters.availableToday) chips.push('Disponível hoje');
    if (filters.minRating) chips.push(`Nota mínima ${String(filters.minRating).replace('.', ',')}`);

    els.resultsActiveChips.hidden = !chips.length;
    els.resultsActiveChips.innerHTML = chips.map((chip) => `<span class="results-active-chip">${chip}</span>`).join('');
  };

  const renderRelatedSections = (query) => {
    const hide = (section, grid) => {
      if (grid) grid.innerHTML = '';
      if (section) section.hidden = true;
    };

    hide(els.resultsUsersSection, els.resultsUsersGrid);
    hide(els.resultsVideosSection, els.resultsVideosGrid);
    hide(els.resultsBeforeAfterSection, els.resultsBeforeAfterGrid);
  };

  const renderEmptySuggestions = (query, filters) => {
    const relatedServices = getRelatedServices(query, filters, 6);
    const hasLocation = Boolean(filters.neighborhood || filters.city || filters.state);

    if (els.resultsEmptyTitle) {
      els.resultsEmptyTitle.textContent = query
        ? `Não achamos um resultado exato para "${query}".`
        : 'Nenhum anúncio encaixou nesses filtros.';
    }

    if (els.resultsEmptyText) {
      els.resultsEmptyText.textContent = hasLocation
        ? 'Separamos alternativas próximas da região escolhida para você não sair da busca de mãos vazias.'
        : 'Separamos alternativas parecidas para você não sair da busca de mãos vazias.';
    }

    return relatedServices;
  };

  const renderResults = () => {
    const query = String(params.get('q') || '').trim();
    const filters = getFilters();
    syncResultsMode(filters.searchType);
    persistFiltersToParams(filters);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    const userResults = getUserMatches(query);
    const exactServiceResults = getServiceMatches(query, {
      catégories: filters.categories,
      categories: filters.categories,
      staté: filters.state,
      state: filters.state,
      city: filters.city,
      neighborhood: filters.neighborhood,
      guaranteed: filters.guaranteed,
      emergency: filters.emergency,
      online: filters.online,
      availableToday: filters.availableToday,
      minRating: filters.minRating
    });
    const isUserSearch = filters.searchType === 'users';
    const isWorkerSearch = filters.searchType === 'workers';
    const isBeforeAfterSearch = filters.searchType === 'before-after';

    renderRelatedSections(query);

    if (isUserSearch) {
      const displayUsers = query ? userResults : (searchData.userPool || []);
      els.resultsGrid.innerHTML = '';
      displayUsers.slice(0, 6).forEach((item) => els.resultsGrid.appendChild(createUserCard(item)));
      if (els.resultsTitle) els.resultsTitle.textContent = query ? `Usuários para "${query}"` : 'Usuários em destaque';
      if (els.resultsDescription) {
        els.resultsDescription.textContent = displayUsers.length
          ? 'Perfis relacionados ao que você digitou.'
          : 'Não encontramos usuários com esse nome ou termo.';
      }
      if (els.resultsCount) els.resultsCount.textContent = formatCount(displayUsers.length);
      renderActiveChips(query, filters, displayUsers.length);
      setResultsState(displayUsers.length ? 'results' : 'empty');
      refreshResultPreviews();
      return;
    }

    if (isWorkerSearch) {
      const workerResults = query ? getShortVideoMatches(query) : (searchData.shortVideoPool || []);
      els.resultsGrid.innerHTML = '';
      workerResults.slice(0, 8).forEach((item) => els.resultsGrid.appendChild(createVideoCard(item)));
      if (els.resultsTitle) els.resultsTitle.textContent = query ? `Workers para "${query}"` : 'Workers em destaque';
      if (els.resultsDescription) {
        els.resultsDescription.textContent = workerResults.length
          ? 'Vídeos curtos de profissionais relacionados ao que você pesquisou.'
          : 'Não encontramos workers com esse termo.';
      }
      if (els.resultsCount) els.resultsCount.textContent = formatCount(workerResults.length);
      renderActiveChips(query, filters, workerResults.length);
      setResultsState(workerResults.length ? 'results' : 'empty');
      refreshResultPreviews();
      return;
    }

    if (isBeforeAfterSearch) {
      const beforeAfterResults = query ? getBeforeAfterMatches(query) : (searchData.beforeAfterPool || []);
      els.resultsGrid.innerHTML = '';
      beforeAfterResults.slice(0, 8).forEach((item) => els.resultsGrid.appendChild(createBeforeAfterCard(item)));
      if (els.resultsTitle) els.resultsTitle.textContent = query ? `Publicações para "${query}"` : 'Publicações em destaque';
      if (els.resultsDescription) {
        els.resultsDescription.textContent = beforeAfterResults.length
          ? 'Publicações visuais de profissionais relacionadas ao que você pesquisou.'
          : 'Não encontramos publicações com esse termo.';
      }
      if (els.resultsCount) els.resultsCount.textContent = formatCount(beforeAfterResults.length);
      renderActiveChips(query, filters, beforeAfterResults.length);
      setResultsState(beforeAfterResults.length ? 'results' : 'empty');
      refreshResultPreviews();
      return;
    }

    const relatedServices = exactServiceResults.length >= 6
      ? []
      : getRelatedServices(query, filters, 6).filter(
          (item) => !exactServiceResults.some((exact) => exact.id === item.id)
        );

    const displayServices = [...exactServiceResults, ...relatedServices].slice(0, 6);

    els.resultsGrid.innerHTML = '';
    displayServices.forEach((item) => els.resultsGrid.appendChild(createServiceCard(item)));

    if (els.resultsCount) els.resultsCount.textContent = formatCount(displayServices.length);
    if (els.resultsTitle) els.resultsTitle.textContent = query ? `Resultados para "${query}"` : 'Resultados em destaque';
    if (els.resultsDescription) {
      els.resultsDescription.textContent = exactServiceResults.length
        ? 'Ajuste os filtros laterais para refinar sem sair da busca.'
        : 'Selecionamos anúncios relacionados para continuar a sua busca.';
    }
    renderActiveChips(query, filters, displayServices.length);

    if (displayServices.length) {
      // Related cards are still useful results. Do not show the inline
      // "não encontrado" block when the grid has cards to offer.
      if (els.resultsInlineEmpty) els.resultsInlineEmpty.hidden = true;
      setResultsState('results');
      refreshResultPreviews();
      return;
    }

    renderEmptySuggestions(query, filters);
    setResultsState('empty');
    els.resultsGrid.hidden = false;
    refreshResultPreviews();
  };

  const loadResults = () => {
    if (resultsLoadTimer) window.clearTimeout(resultsLoadTimer);
    setResultsState('loading');
    resultsLoadTimer = window.setTimeout(() => {
      resultsLoadTimer = null;
      renderResults();
    }, 220);
  };

  const openCepModal = () => {
    if (!els.uiModal || !els.uiModalInput) return Promise.resolve(null);

    els.uiModal.hidden = false;
    document.body.classList.add('ui-modal-open');
    if (els.uiModalEyebrow) els.uiModalEyebrow.textContent = 'Localização';
    if (els.uiModalTitle) els.uiModalTitle.textContent = 'Inserir CEP';
    if (els.uiModalText) els.uiModalText.textContent = 'Digite o CEP para preencher estado, cidade e bairro automaticamente.';
    if (els.uiModalLabel) els.uiModalLabel.textContent = 'CEP';
    els.uiModalInput.value = '';
    window.requestAnimationFrame(() => els.uiModalInput.focus());

    return new Promise((resolve) => {
      activeModalResolver = resolve;
    });
  };

  const closeModal = (value = null) => {
    if (!els.uiModal) return;
    els.uiModal.hidden = true;
    document.body.classList.remove('ui-modal-open');
    if (activeModalResolver) activeModalResolver(value);
    activeModalResolver = null;
  };

  const formatCepInputValue = (value = '') => {
    const cleanValue = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (cleanValue.length <= 5) return cleanValue;
    return `${cleanValue.slice(0, 5)}-${cleanValue.slice(5)}`;
  };

  const openInlineCep = () => {
    if (!els.cepInput) return;
    els.cepRow?.classList.add('is-editing');
    if (els.cepFillButton) els.cepFillButton.hidden = true;
    els.cepInput.hidden = false;
    els.cepInput.removeAttribute('aria-invalid');
    window.requestAnimationFrame(() => {
      els.cepInput.focus();
      els.cepInput.select?.();
    });
  };

  const closeInlineCep = (clearValue = false) => {
    if (!els.cepInput) return;
    els.cepRow?.classList.remove('is-editing');
    els.cepInput.hidden = true;
    if (els.cepFillButton) els.cepFillButton.hidden = false;
    if (clearValue) {
      els.cepInput.value = '';
      els.cepInput.removeAttribute('aria-invalid');
    }
  };

  const applyCepValue = (cep) => {
    const cleanCep = String(cep || '').replace(/\D/g, '');
    const formattedCep = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : cep;
    const cepData = cepLookup[formattedCep] || cepLookup[cleanCep];
    if (!cepData) {
      els.cepInput?.setAttribute('aria-invalid', 'true');
      return false;
    }

    if (els.stateSelect) {
      els.stateSelect.value = cepData.state || cepData.staté || '';
      uiSelectApi?.refresh(els.stateSelect);
    }
    fillSelectOptions(els.citySelect, citiesByState[els.stateSelect?.value || ''] || [], 'Qualquer cidade');
    if (els.citySelect) {
      els.citySelect.value = cepData.city || '';
      uiSelectApi?.refresh(els.citySelect);
    }
    fillSelectOptions(els.neighborhoodSelect, neighborhoodsByCity[els.citySelect?.value || ''] || [], 'Qualquer bairro');
    if (els.neighborhoodSelect) {
      els.neighborhoodSelect.value = cepData.neighborhood || '';
      uiSelectApi?.refresh(els.neighborhoodSelect);
    }

    renderResults();
    return true;
  };

  const applyCep = async () => {
    const cep = await openCepModal();
    if (!cep) return;
    applyCepValue(cep);
  };

  const applyInlineCep = () => {
    if (!els.cepInput) return;
    const cleanCep = String(els.cepInput.value || '').replace(/\D/g, '');
    if (!cleanCep) {
      closeInlineCep(true);
      return;
    }
    if (cleanCep.length < 8) return;
    const applied = applyCepValue(els.cepInput.value);
    if (applied) {
      if (els.cepFillButton) els.cepFillButton.textContent = formatCepInputValue(els.cepInput.value);
      closeInlineCep(false);
    }
  };

  const handleSearchSubmit = (event, sourceInput) => {
    event.preventDefault();
    const query = setQuery(sourceInput?.value || '');
    if (!query && sourceInput) sourceInput.focus();
    closeResultsSearchDropdown();
    loadResults();
    if (isDesktopFilters()) {
      syncFilterUi(true);
    }
  };

  const initialQuery = String(params.get('q') || '');
  const initialType = String(params.get('type') || '').trim();
  const inferredType = (() => {
    const normalizedQuery = normalize(initialQuery);
    if (initialType) return initialType;
    if (/\bworkers?\b|\bvideos?\b/.test(normalizedQuery)) return 'workers';
    if (normalizedQuery.includes('antes e depois') || normalizedQuery.includes('antes depois') || normalizedQuery.includes('publicacoes') || normalizedQuery.includes('publicações')) return 'before-after';
    return 'services';
  })();
  syncInputs(initialQuery);
  setSearchMode(inferredType);
  renderCategoryFilters();
  enhanceResultsSelects();
  bootstrapLocationSelects();
  renderResultsRecommendations();
  renderResultsHistory();
  renderResultsSuggestions(els.resultsSearchInput.value);
  syncResultsSearchSections(els.resultsSearchInput.value);
  closeResultsSearchDropdown();
  loadResults();
  syncFilterUi(isDesktopFilters());

  els.resultsSearchForm.addEventListener('submit', (event) => handleSearchSubmit(event, els.resultsSearchInput), { signal });
  els.topbarSearchForm?.addEventListener('submit', (event) => handleSearchSubmit(event, els.topbarSearchInput), { signal });

  els.resultsSearchInput?.addEventListener('focus', syncResultsSearchDropdown, { signal });
  els.resultsSearchInput?.addEventListener('click', syncResultsSearchDropdown, { signal });
  els.resultsSearchInput?.addEventListener('input', () => {
    syncResultsSearchDropdown();
  }, { signal });

  els.resultsSearchInput?.addEventListener('keydown', (event) => {
    const options = getVisibleResultsSearchOptions();

    if (event.key === 'ArrowDown' && options.length) {
      event.preventDefault();
      activeSearchIndex = Math.min(activeSearchIndex + 1, options.length - 1);
      options.forEach((option, index) => option.classList.toggle('is-active', index === activeSearchIndex));
      options[activeSearchIndex]?.scrollIntoView({ block: 'nearest' });
    }

    if (event.key === 'ArrowUp' && options.length) {
      event.preventDefault();
      activeSearchIndex = Math.max(activeSearchIndex - 1, 0);
      options.forEach((option, index) => option.classList.toggle('is-active', index === activeSearchIndex));
      options[activeSearchIndex]?.scrollIntoView({ block: 'nearest' });
    }

    if (event.key === 'Enter' && activeSearchIndex >= 0 && options[activeSearchIndex]) {
      event.preventDefault();
      applySearchSuggestion(options[activeSearchIndex].dataset.value || options[activeSearchIndex].textContent || '');
    }

    if (event.key === 'Escape') {
      closeResultsSearchDropdown();
    }
  }, { signal });

  els.resultsSearchDropdown?.addEventListener('click', (event) => {
    const action = event.target.closest('.search-suggestion, .search-chip');
    if (!action) return;
    applySearchSuggestion(action.dataset.value || action.textContent || '');
  }, { signal });

  const isResultsPreviewTrigger = (trigger) => Boolean(
    trigger?.closest?.('[data-results-grid], [data-results-videos-grid], [data-results-before-after-grid]')
  );

  const openResultsPreviewTrigger = (trigger, event) => {
    if (!trigger || !isResultsPreviewTrigger(trigger)) return false;

    const workerTrigger = trigger.closest('[data-worker-trigger]');
    if (workerTrigger) {
      event?.preventDefault?.();
      if (!window.DokeOpenWorkerPreview) refreshResultPreviews();
      window.DokeOpenWorkerPreview?.(workerTrigger.dataset.workerId || '', workerTrigger);
      return true;
    }

    const beforeAfterTrigger = trigger.closest('[data-before-after-trigger]');
    if (beforeAfterTrigger) {
      event?.preventDefault?.();
      if (!window.DokeOpenBeforeAfterPreview) refreshResultPreviews();
      window.DokeOpenBeforeAfterPreview?.(beforeAfterTrigger.dataset.beforeAfterId || '', beforeAfterTrigger);
      return true;
    }

    return false;
  };

  document.addEventListener('click', (event) => {
    const previewTrigger = event.target.closest('[data-worker-trigger], [data-before-after-trigger]');
    if (openResultsPreviewTrigger(previewTrigger, event)) return;

    if (!event.target.closest('[data-results-searchbox]')) {
      closeResultsSearchDropdown();
    }
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const previewTrigger = event.target.closest('[data-worker-trigger], [data-before-after-trigger]');
    openResultsPreviewTrigger(previewTrigger, event);
  }, { signal });

  els.resultsSearchClear?.addEventListener('click', () => {
    saveSearchHistory([]);
    syncResultsSearchDropdown();
  }, { signal });
  els.resultsFiltersOpenButtons.forEach((button) => button.addEventListener('click', toggleFilters, { signal }));
  els.resultsFiltersCloseButton?.addEventListener('click', toggleFilters, { signal });
  els.resultsFiltersBackdrop?.addEventListener('click', closeMobileFilters, { signal });
  window.addEventListener('resize', () => {
    if (isDesktopFilters()) {
      const keepOpen = !resultsLayout?.classList.contains('is-filters-collapsed');
      syncFilterUi(keepOpen);
      return;
    }
    syncFilterUi(false);
  }, { signal });
  els.resultsEmptyReset?.addEventListener('click', () => {
    els.filtersForm.reset();
    renderCategoryFilters();
    bootstrapLocationSelects();
    loadResults();
    if (isDesktopFilters()) {
      syncFilterUi(true);
    }
  }, { signal });
  els.cepFillButton?.addEventListener('click', () => {
    openInlineCep();
  }, { signal });

  els.cepInput?.addEventListener('input', () => {
    els.cepInput.value = formatCepInputValue(els.cepInput.value);
    els.cepInput.removeAttribute('aria-invalid');
    if (String(els.cepInput.value || '').replace(/\D/g, '').length === 8) {
      applyInlineCep();
    }
  }, { signal });

  els.cepInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeInlineCep(true);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      applyInlineCep();
    }
  }, { signal });

  els.cepInput?.addEventListener('blur', () => {
    applyInlineCep();
  }, { signal });

  els.filtersForm.addEventListener('submit', (event) => {
    event.preventDefault();
    renderResults();
    closeMobileFilters();
  }, { signal });

  els.filtersForm.addEventListener('change', (event) => {
    if (event.target === els.stateSelect) {
      fillSelectOptions(els.citySelect, citiesByState[els.stateSelect?.value || ''] || [], 'Qualquer cidade');
      fillSelectOptions(els.neighborhoodSelect, [], 'Qualquer bairro');
    }

    if (event.target === els.citySelect) {
      fillSelectOptions(els.neighborhoodSelect, neighborhoodsByCity[els.citySelect?.value || ''] || [], 'Qualquer bairro');
    }

    renderResults();
  }, { signal });

  els.searchModeInputs.forEach((input) => {
    input.addEventListener('change', () => {
      params.set('type', getSearchMode());
      renderResults();
    }, { signal });
  });

  els.uiModalClose?.addEventListener('click', () => closeModal(null), { signal });
  els.uiModalCancel?.addEventListener('click', () => closeModal(null), { signal });
  els.uiModalConfirm?.addEventListener('click', () => closeModal(els.uiModalInput?.value || ''), { signal });
  els.uiModalInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      closeModal(els.uiModalInput?.value || '');
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal(null);
    }
  }, { signal });
};


// Initialized by assets/js/core/app.js on direct load and by stable-shell-router on route swaps.
