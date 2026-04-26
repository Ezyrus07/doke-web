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
    resultsSearchForm: queryAny('[data-results-search-form]'),
    resultsSearchInput: queryAny('[data-results-search-input]'),
    resultsSearchBox: queryAny('[data-results-searchbox]'),
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
    resultsFiltersOpenButton: queryAny('[data-results-filters-open]'),
    resultsFiltersCloseButton: queryAny('[data-results-filters-close]'),
    resultsFiltersBackdrop: queryAny('[data-results-filters-backdrop]'),
    searchModeInputs: queryAllAny('input[name="searchType"]'),
    filtersForm: queryAny('[data-results-filters-form]'),
    categoryList: queryAny('[data-results-category-list]', '[data-results-catégory-list]'),
    stateSelect: queryAny('[data-results-state-select]', '[data-results-staté-select]'),
    citySelect: queryAny('[data-results-city-select]'),
    neighborhoodSelect: queryAny('[data-results-neighborhood-select]'),
    cepFillButton: queryAny('[data-results-cep-fill]'),
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

    if (els.resultsRecommendationsSection) {
      els.resultsRecommendationsSection.hidden = recommendationCount === 0 || hasQuery;
    }

    if (els.resultsHistorySection) {
      els.resultsHistorySection.hidden = historyCount === 0 || hasQuery;
    }

    if (els.resultsSuggestionsSection) {
      els.resultsSuggestionsSection.hidden = suggestionCount === 0;
    }

    if (els.resultsSearchEmpty) {
      els.resultsSearchEmpty.hidden = !hasQuery || suggestionCount > 0;
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

    const shouldOpen =
      (els.resultsSearchInput.value || '').trim().length >= 2 ||
      (els.resultsRecommendationList?.children.length || 0) > 0 ||
      (els.resultsSearchHistoryList?.children.length || 0) > 0;

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
  const isDesktopFilters = () => window.innerWidth > 960;

  const syncFilterUi = (isOpen) => {
    if (els.resultsFiltersOpenButton) els.resultsFiltersOpenButton.setAttribute('aria-expanded', String(isOpen));
    if (resultsLayout) resultsLayout.classList.toggle('is-filters-collapsed', !isOpen && isDesktopFilters());
    if (els.resultsFiltersBackdrop) els.resultsFiltersBackdrop.hidden = !(!isDesktopFilters() && isOpen);
    document.body.classList.toggle('results-filters-open', isOpen);
  };

  const openMobileFilters = () => {
    syncFilterUi(true);
  };

  const closeMobileFilters = () => {
    syncFilterUi(false);
  };

  const toggleFilters = () => {
    const currentlyOpen = els.resultsFiltersOpenButton?.getAttribute('aria-expanded') === 'true';
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

    article.className = 'service-card service-card--result';
    article.innerHTML = `
      <a class="service-card__media ${item.mediaClass || ''}" href="${detailHref}" aria-label="Ver anúncio de ${item.title || 'profissional'}">
        <span class="service-card__badge ${item.badgeModifier || ''}">${item.badge || 'Em destaque'}</span>
        <button class="service-card__favorite" type="button" aria-label="Salvar anúncio">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
        </button>
      </a>

      <div class="service-card__body">
        <span class="service-card__category service-card__category--body">${item.category || item.catégory || ''}</span>
        <h3 class="service-card__title">${item.title || ''}</h3>

        <div class="service-card__rating">
          <strong>★ ${rating}</strong>
          <span>${reviews}</span>
        </div>

        <p class="service-card__location">${item.location || ''}</p>

        <div class="service-card__tags">
          ${tags.map((tag) => `<span>${tag}</span>`).join('')}
        </div>

        <div class="service-card__footer">
          <strong class="service-card__price">${item.price || ''}</strong>
          <a class="service-card__cta" href="${detailHref}" aria-label="Ver anúncio">Ver anúncio</a>
        </div>
      </div>
    `;
    return article;
  };

  const createUserCard = (item) => {
    const article = document.createElement('article');
    const normalizedText = normalize(`${item.id || ''} ${item.name || ''} ${item.role || ''}`);
    let avatarClass = item.avatarClass || '';
    if (!avatarClass.includes('pro-card__avatar--')) {
      if (normalizedText.includes('elaine') || normalizedText.includes('diarista')) {
        avatarClass = 'pro-card__avatar--cleaner';
      } else if (normalizedText.includes('renata') || normalizedText.includes('marina') || normalizedText.includes('professora')) {
        avatarClass = 'pro-card__avatar--teacher';
      } else {
        avatarClass = 'pro-card__avatar--painter';
      }
    }

    article.className = 'pro-card pro-card--compact';
    article.innerHTML = `
      <div class="pro-card__header">
        <div class="pro-card__avatar ${avatarClass}" aria-hidden="true"></div>
        <div class="pro-card__identity">
          <strong>${item.name || ''}</strong>
        </div>
        <span class="pro-card__score">★ ${(Number(item.rating) || 0).toFixed(1).replace('.', ',')}</span>
      </div>
      <div class="pro-card__body">
        <p>${item.role || ''}</p>
        <span>${item.location || ''}</span>
        <small>${item.jobs || 0} serviços</small>
      </div>
      <div class="pro-card__footer">
        <a class="pro-card__cta" href="perfil.html">Ver perfil</a>
      </div>
    `;
    return article;
  };

  const createVideoCard = (item) => {
    const article = document.createElement('article');
    article.className = `video-card ${item.mediaClass || ''}`;
    article.dataset.workerTrigger = '';
    article.dataset.workerId = item.id || '';
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-haspopup', 'dialog');
    article.setAttribute('aria-label', `Abrir worker: ${item.title || 'vídeo'}`);
    article.innerHTML = `
      <span class="video-card__play">▶</span>
      <div class="video-card__content">
        <strong>${item.title || ''}</strong>
        <span>${item.author || ''}</span>
      </div>
    `;
    return article;
  };

  const createBeforeAfterCard = (item) => {
    const article = document.createElement('article');
    const previewId = getBeforeAfterPreviewId(item);
    const rating = String(item.rating || '').replace('.', ',');
    article.className = 'comparison-card';
    article.dataset.beforeAfterTrigger = '';
    article.dataset.beforeAfterId = previewId;
    article.setAttribute('role', 'button');
    article.setAttribute('tabindex', '0');
    article.setAttribute('aria-haspopup', 'dialog');
    article.setAttribute('aria-label', `Abrir caso: ${item.title || 'antes e depois'}`);
    article.innerHTML = `
      <div class="comparison-card__visual ${item.visualClass || ''}">
        <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
        <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
      </div>
      <div class="comparison-card__body">
        <strong class="comparison-card__title">${item.title || ''}</strong>
        <div class="comparison-card__meta">
          <span class="comparison-card__provider">Por <span>${item.author || ''}</span></span>
          <span class="comparison-card__rating" aria-label="Avaliação ${rating} de 5">★ <strong>${rating}</strong></span>
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
    if (query) chips.push(`Busca: ${query}`);
    if (filters.categories.length) chips.push(...filters.categories);
    if (filters.state) chips.push(filters.state);
    if (filters.city) chips.push(filters.city);
    if (filters.neighborhood) chips.push(filters.neighborhood);
    if (filters.guaranteed) chips.push('Com garantia');
    if (filters.emergency) chips.push('Atendimento emergencial');
    if (filters.online) chips.push('Online');
    if (filters.availableToday) chips.push('Disponível hoje');
    if (filters.minRating) chips.push(`Nota mínima ${String(filters.minRating).replace('.', ',')}`);
    if (!chips.length && count > 0) chips.push('Sem filtros extras');

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
      if (els.resultsTitle) els.resultsTitle.textContent = query ? `Antes e depois para "${query}"` : 'Casos de antes e depois';
      if (els.resultsDescription) {
        els.resultsDescription.textContent = beforeAfterResults.length
          ? 'Casos visuais para comparar o trabalho antes e depois.'
          : 'Não encontramos casos de antes e depois com esse termo.';
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

    if (els.resultsCount) els.resultsCount.textContent = formatCount(exactServiceResults.length || displayServices.length);
    if (els.resultsTitle) els.resultsTitle.textContent = query ? `Resultados para "${query}"` : 'Resultados em destaque';
    if (els.resultsDescription) {
      els.resultsDescription.textContent = exactServiceResults.length
        ? 'Ajuste os filtros laterais para refinar sem sair da busca.'
        : 'Selecionamos anúncios relacionados para continuar a sua busca.';
    }
    renderActiveChips(query, filters, exactServiceResults.length || displayServices.length);

    if (exactServiceResults.length) {
      if (els.resultsInlineEmpty) els.resultsInlineEmpty.hidden = true;
      setResultsState('results');
      refreshResultPreviews();
      return;
    }

    const emptyFallback = renderEmptySuggestions(query, filters);
    els.resultsGrid.innerHTML = '';
    emptyFallback.forEach((item) => els.resultsGrid.appendChild(createServiceCard(item)));
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

  const applyCep = async () => {
    const cep = await openCepModal();
    if (!cep) return;

    const cleanCep = String(cep).replace(/\D/g, '');
    const formattedCep = cleanCep.length === 8 ? `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}` : cep;
    const cepData = cepLookup[formattedCep] || cepLookup[cleanCep];
    if (!cepData) return;

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
    if (normalizedQuery.includes('antes e depois') || normalizedQuery.includes('antes depois')) return 'before-after';
    return 'services';
  })();
  syncInputs(initialQuery);
  setSearchMode(inferredType);
  renderCategoryFilters();
  enhanceResultsSelects();
  bootstrapLocationSelects();
  syncResultsSearchDropdown();
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
  els.resultsFiltersOpenButton?.addEventListener('click', toggleFilters, { signal });
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
    applyCep();
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


window.DokeInitSearchResults();
