window.DokeSearchData = (() => {
  const SEARCH_HISTORY_STORAGE_KEY = "doke.search.history";

  const recommendations = [
    "Eletricista 24h",
    "Diarista perto de mim",
    "Marceneiro sob medida",
    "Frete pequeno"
  ];

  const suggestionPool = [
    { label: "Eletricista residencial", meta: "Instalacao e reparo", badge: "Servico", value: "eletricista residencial" },
    { label: "Encanador urgente", meta: "Vazamentos e tubulacao", badge: "Servico", value: "encanador urgente" },
    { label: "Pintor profissional", meta: "Paredes e acabamento", badge: "Servico", value: "pintor profissional" },
    { label: "Marceneiro sob medida", meta: "Moveis planejados", badge: "Servico", value: "marceneiro sob medida" },
    { label: "Diarista semanal", meta: "Limpeza residencial", badge: "Servico", value: "diarista semanal" },
    { label: "Frete para mudanca", meta: "Transporte local", badge: "Servico", value: "frete para mudanca" },
    { label: "Aulas de ingles", meta: "Professor particular", badge: "Catégoria", value: "aulas de ingles" },
    { label: "Designer para logo", meta: "Criativo e branding", badge: "Profissional", value: "designer para logo" },
    { label: "Rua Maranhao, 343", meta: "Localizacao atual", badge: "Endereco", value: "Rua Maranhao, 343" }
  ];

  const servicePool = [];

  const userPool = [
    {
      id: "usr-carlos",
      name: "Carlos Andrade",
      handle: "@carlospintura",
      role: "Pintor residencial",
      location: "Centro, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 128,
      avatarClass: "service-card__avatar--carlos",
      keywords: ["carlos", "pintor", "pintura", "acabamento", "residencial"]
    },
    {
      id: "usr-marcos",
      name: "Marcos Luz",
      handle: "@marcos24h",
      role: "Eletricista 24h",
      location: "Savassi, Belo Horizonte, MG",
      rating: 4.8,
      jobs: 96,
      avatarClass: "service-card__avatar--marcos",
      keywords: ["marcos", "eletricista", "eletrica", "24h", "manutencao"]
    },
    {
      id: "usr-elaine",
      name: "Elaine Santos",
      handle: "@elainepremium",
      role: "Diarista premium",
      location: "Funcionarios, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 74,
      avatarClass: "service-card__avatar--elaine",
      keywords: ["elaine", "diarista", "limpeza", "casa", "faxina"]
    },
    {
      id: "usr-renata",
      name: "Renata Alves",
      handle: "@renataensina",
      role: "Professora particular",
      location: "Sion, Belo Horizonte, MG",
      rating: 4.9,
      jobs: 52,
      avatarClass: "service-card__avatar--renata",
      keywords: ["renata", "professora", "aulas", "reforco", "particular"]
    }
  ];

  const shortVideoPool = [
    {
      id: "vid-pintura",
      title: "Como renovar parede sem sujeira",
      author: "Carlos Andrade",
      description: "Dicas rápidas de pintura",
      views: "48 mil",
      durationShort: "0:32",
      mediaClass: "video-card--one",
      keywords: ["worker", "workers", "video", "pintura", "parede", "acabamento", "reforma", "carlos"]
    },
    {
      id: "vid-cozinha",
      title: "Antes e depois de cozinha planejada",
      author: "Studio Casa Viva",
      description: "Reforma e marcenaria",
      views: "36 mil",
      durationShort: "0:41",
      mediaClass: "video-card--two",
      keywords: ["worker", "workers", "video", "cozinha", "planejada", "marcenaria", "reforma", "antes e depois"]
    },
    {
      id: "vid-eletrica",
      title: "5 erros elétricos que custam caro",
      author: "Marcos Luz",
      description: "Dicas rápidas de elétrica",
      views: "52 mil",
      durationShort: "0:28",
      mediaClass: "video-card--three",
      keywords: ["worker", "workers", "video", "eletrica", "eletricista", "fiacao", "seguranca", "marcos"]
    },
    {
      id: "vid-limpeza",
      title: "Limpeza pós-obra em 40 segundos",
      author: "Elaine Santos",
      description: "Dicas rápidas de limpeza",
      views: "29 mil",
      durationShort: "0:24",
      mediaClass: "video-card--four",
      keywords: ["worker", "workers", "video", "limpeza", "pos-obra", "diarista", "faxina", "elaine"]
    }
  ];

  const beforeAfterPool = [
    {
      id: "ba-cozinha",
      title: "Cozinha com marcenaria sob medida",
      author: "Studio Casa Viva",
      rating: 4.9,
      previewId: "case-kitchen",
      visualClass: "comparison-card__visual--kitchen",
      likes: 142,
      comments: 28,
      saves: 36,
      keywords: ["cozinha", "marcenaria", "foto", "publicacao", "reforma"]
    },
    {
      id: "ba-sala",
      title: "Tour rápido da reforma",
      author: "Renato Acabamentos",
      rating: 4.9,
      previewId: "case-reforma",
      visualClass: "comparison-card__visual--reforma",
      likes: 98,
      comments: 19,
      saves: 22,
      keywords: ["reforma", "sala", "tour", "video", "acabamento", "antes", "depois"]
    },
    {
      id: "ba-banheiro",
      title: "Banheiro revitalizado sem quebra-quebra",
      author: "Renato Acabamentos",
      rating: 4.8,
      previewId: "case-bathroom",
      visualClass: "comparison-card__visual--bathroom",
      likes: 176,
      comments: 31,
      saves: 45,
      keywords: ["banheiro", "reforma", "acabamento", "antes", "depois"]
    }
  ];

  const quickFilters = [
    "Com garantia",
    "Emergencia",
    "Disponivel hoje",
    "Perto de mim"
  ];
  const catégories = [
    "Eletricista",
    "Encanador",
    "Pintura",
    "Limpeza",
    "Frete",
    "Tecnologia",
    "Aulas",
    "Beleza",
    "Reforma",
    "Montagem"
  ];

  const locationOptions = {
    statés: ["MG", "SP", "RJ"],
    citiesByStaté: {
      MG: ["Belo Horizonte", "Contagem", "Nova Lima"],
      SP: ["São Paulo", "Campinas"],
      RJ: ["Rio de Janeiro", "Niteroi"]
    },
    neighborhoodsByCity: {
      "Belo Horizonte": [
        "Belvedere",
        "Buritis",
        "Centro",
        "Funcionarios",
        "Lourdes",
        "Mangabeiras",
        "Prado",
        "Santo Agostinho",
        "Savassi",
        "Sion"
      ],
      Contagem: ["Eldorado", "Inconfidentes"],
      "Nova Lima": ["Vila da Serra"],
      "São Paulo": ["Pinheiros", "Moema"],
      Campinas: ["Cambuí", "Taquaral"],
      "Rio de Janeiro": ["Botafogo", "Barra da Tijuca"],
      Niteroi: ["Icarai", "Charitas"]
    },
    cepLookup: {
      "30130-110": { staté: "MG", city: "Belo Horizonte", neighborhood: "Centro" },
      "30140-071": { staté: "MG", city: "Belo Horizonte", neighborhood: "Funcionarios" },
      "30380-435": { staté: "MG", city: "Belo Horizonte", neighborhood: "Belvedere" },
      "30350-540": { staté: "MG", city: "Belo Horizonte", neighborhood: "Mangabeiras" },
      "30411-186": { staté: "MG", city: "Belo Horizonte", neighborhood: "Prado" },
      "30380-000": { staté: "MG", city: "Belo Horizonte", neighborhood: "Savassi" }
    }
  };

  const normalize = (value = "") => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const getSearchHistory = () => {
    try {
      const raw = window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 4) : [];
    } catch (error) {
      return [];
    }
  };

  const saveSearchHistory = (items) => {
    window.localStorage.setItem(
      SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(items.filter(Boolean).slice(0, 4))
    );
  };

  const addSearchHistory = (value) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) return;
    const nextItems = getSearchHistory().filter((item) => normalize(item) !== normalize(cleanValue));
    nextItems.unshift(cleanValue);
    saveSearchHistory(nextItems);
  };

  const getSuggestionMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    const baseMatches = suggestionPool
      .filter((item) => normalize(`${item.label} ${item.meta} ${item.value}`).includes(normalizedQuery))
      .slice(0, 3);

    const userMatches = userPool
      .filter((item) => normalize(`${item.name} ${item.handle} ${item.role} ${item.location} ${item.keywords.join(" ")}`).includes(normalizedQuery))
      .slice(0, 2)
      .map((item) => ({
        label: item.name,
        meta: `${item.role} • ${item.location}`,
        badge: "Usuario",
        value: item.name
      }));

    const workerMatches = shortVideoPool
      .filter((item) => normalize(`${item.title} ${item.author} ${item.keywords.join(" ")}`).includes(normalizedQuery))
      .slice(0, 2)
      .map((item) => ({
        label: item.title,
        meta: `${item.author} • Worker em vídeo`,
        badge: "Worker",
        value: item.title
      }));

    return [...baseMatches, ...workerMatches, ...userMatches].slice(0, 6);
  };

  const getUserMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    return userPool.filter((item) => normalize(
      `${item.name} ${item.handle} ${item.role} ${item.location} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getShortVideoMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];

    return shortVideoPool.filter((item) => normalize(
      `${item.title} ${item.author} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getBeforeAfterMatches = (query = "") => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return [];
    if (normalizedQuery.includes("antes e depois") || normalizedQuery.includes("antes depois")) {
      return beforeAfterPool;
    }

    return beforeAfterPool.filter((item) => normalize(
      `${item.title} ${item.author} ${item.keywords.join(" ")}`
    ).includes(normalizedQuery));
  };

  const getWorkerCardMeta = (item = {}) => {
    const author = String(item.author || item.title || "Workers").trim();
    const initials = author
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "WK";

    return {
      badgeLabel: item.badgeLabel || "Workers",
      author,
      description: item.description || item.title || "Dicas rápidas",
      views: item.views || "48 mil",
      durationShort: item.durationShort || item.duration || "0:32",
      avatarInitials: item.avatarInitials || initials
    };
  };

  const getServiceMatches = (query = "", filters = {}) => {
    const normalizedQuery = normalize(query.trim());

    return servicePool.filter((item) => {
      const haystack = normalize([
        item.title,
        item.catégory,
        item.location,
        item.region,
        item.badge,
        ...item.tags,
        ...item.keywords
      ].join(" "));

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const catégoryFilters = Array.isArray(filters.catégories) ? filters.catégories.filter(Boolean) : [];
      const matchesCatégory = !catégoryFilters.length
        || catégoryFilters.some((catégory) => normalize(item.catégory).includes(normalize(catégory)));
      const matchesRegion = !filters.region || normalize(item.region).includes(normalize(filters.region));
      const matchesStaté = !filters.staté || normalize(item.staté).includes(normalize(filters.staté));
      const matchesCity = !filters.city || normalize(item.city).includes(normalize(filters.city));
      const matchesNeighborhood = !filters.neighborhood || normalize(item.neighborhood).includes(normalize(filters.neighborhood));
      const matchesGuarantee = !filters.guaranteed || item.guaranteed;
      const matchesEmergency = !filters.emergency || item.emergency;
      const matchesOnline = !filters.online || item.online;
      const matchesToday = !filters.availableToday || item.availableToday;
      const matchesRating = !filters.minRating || item.rating >= Number(filters.minRating);

      return matchesQuery
        && matchesCatégory
        && matchesRegion
        && matchesStaté
        && matchesCity
        && matchesNeighborhood
        && matchesGuarantee
        && matchesEmergency
        && matchesOnline
        && matchesToday
        && matchesRating;
    });
  };

  return {
    SEARCH_HISTORY_STORAGE_KEY,
    recommendations,
    catégories,
    locationOptions,
    suggestionPool,
    servicePool,
    userPool,
    shortVideoPool,
    beforeAfterPool,
    quickFilters,
    normalize,
    getSearchHistory,
    saveSearchHistory,
    addSearchHistory,
    getSuggestionMatches,
    getServiceMatches,
    getUserMatches,
    getShortVideoMatches,
    getBeforeAfterMatches,
    getWorkerCardMeta
  };
})();


/* Doke UX-FILTERS-001
   Canonical applied/draft filter authority for resultados.html.
   Draft edits never mutate URL, results or pagination until an explicit commit. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var VERSION = '20260805-ux-filters-001-v1';
  var CONTRACT = 'search-filter-state-v1';
  var FILTER_FORM_SELECTOR = '[data-results-filters-form]';
  var FILTER_OPEN_SELECTOR = '[data-results-filters-open]';
  var FILTER_CLOSE_SELECTOR = '[data-results-filters-close]';
  var FILTER_BACKDROP_SELECTOR = '[data-results-filters-backdrop]';
  var FILTER_RESET_SELECTOR = '[data-results-filters-reset]';
  var EMPTY_RESET_SELECTOR = '[data-results-empty-reset]';
  var SEARCH_SUBMIT_SELECTOR = '[data-results-search-form], [data-results-topbar-search], [data-global-topbar-search]';
  var SEARCH_SUGGESTION_SELECTOR = '.search-suggestion, .search-chip';
  var CEP_INPUT_SELECTOR = '[data-results-cep-input]';
  var SEARCH_TYPES = Object.freeze(['services', 'users', 'workers', 'before-after']);
  var BOOLEAN_KEYS = Object.freeze(['guaranteed', 'emergency', 'online', 'availableToday']);
  var SCALAR_KEYS = Object.freeze(['state', 'city', 'neighborhood', 'minRating']);
  var ALL_FILTER_KEYS = Object.freeze([
    'searchType',
    'categories',
    'state',
    'city',
    'neighborhood',
    'minRating',
    'guaranteed',
    'emergency',
    'online',
    'availableToday'
  ]);

  function cleanText(value) {
    return String(value == null ? '' : value).trim();
  }

  function cleanNumber(value) {
    var number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function normalizeCategories(values) {
    var seen = Object.create(null);
    return Object.freeze((Array.isArray(values) ? values : [])
      .map(cleanText)
      .filter(function (value) {
        var key = value.toLocaleLowerCase('pt-BR');
        if (!value || seen[key]) return false;
        seen[key] = true;
        return true;
      }));
  }

  function freezeSnapshot(value) {
    value = value || {};
    var searchType = cleanText(value.searchType);
    if (SEARCH_TYPES.indexOf(searchType) < 0) searchType = 'services';
    return Object.freeze({
      searchType: searchType,
      categories: normalizeCategories(value.categories),
      state: cleanText(value.state),
      city: cleanText(value.city),
      neighborhood: cleanText(value.neighborhood),
      minRating: cleanNumber(value.minRating),
      guaranteed: Boolean(value.guaranteed),
      emergency: Boolean(value.emergency),
      online: Boolean(value.online),
      availableToday: Boolean(value.availableToday)
    });
  }

  function stableValue(snapshot) {
    snapshot = freezeSnapshot(snapshot);
    return JSON.stringify({
      searchType: snapshot.searchType,
      categories: snapshot.categories,
      state: snapshot.state,
      city: snapshot.city,
      neighborhood: snapshot.neighborhood,
      minRating: snapshot.minRating,
      guaranteed: snapshot.guaranteed,
      emergency: snapshot.emergency,
      online: snapshot.online,
      availableToday: snapshot.availableToday
    });
  }

  function equalSnapshots(left, right) {
    return stableValue(left) === stableValue(right);
  }

  function changedKeys(left, right) {
    left = freezeSnapshot(left);
    right = freezeSnapshot(right);
    return Object.freeze(ALL_FILTER_KEYS.filter(function (key) {
      if (key === 'categories') {
        return JSON.stringify(left.categories) !== JSON.stringify(right.categories);
      }
      return left[key] !== right[key];
    }));
  }

  function activeCount(snapshot) {
    snapshot = freezeSnapshot(snapshot);
    var count = snapshot.categories.length;
    SCALAR_KEYS.forEach(function (key) {
      if (snapshot[key]) count += 1;
    });
    BOOLEAN_KEYS.forEach(function (key) {
      if (snapshot[key]) count += 1;
    });
    return count;
  }

  function parseUrl(search) {
    var params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    var categories = []
      .concat(params.getAll('category'))
      .concat(params.getAll('categories'))
      .concat(params.getAll('catégory'))
      .concat(params.getAll('catégorie'));
    return freezeSnapshot({
      searchType: params.get('type') || 'services',
      categories: categories,
      state: params.get('state') || params.get('staté') || '',
      city: params.get('city') || '',
      neighborhood: params.get('neighborhood') || '',
      minRating: params.get('minRating') || 0,
      guaranteed: params.get('guaranteed') === '1',
      emergency: params.get('emergency') === '1',
      online: params.get('online') === '1',
      availableToday: params.get('availableToday') === '1'
    });
  }

  function serializeUrl(snapshot, search) {
    snapshot = freezeSnapshot(snapshot);
    var params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    [
      'type',
      'category',
      'categories',
      'catégory',
      'catégorie',
      'state',
      'staté',
      'city',
      'neighborhood',
      'minRating',
      'guaranteed',
      'emergency',
      'online',
      'availableToday'
    ].forEach(function (key) {
      params.delete(key);
    });

    params.set('type', snapshot.searchType);
    snapshot.categories.forEach(function (category) {
      params.append('category', category);
    });
    if (snapshot.state) params.set('state', snapshot.state);
    if (snapshot.city) params.set('city', snapshot.city);
    if (snapshot.neighborhood) params.set('neighborhood', snapshot.neighborhood);
    if (snapshot.minRating) params.set('minRating', String(snapshot.minRating));
    BOOLEAN_KEYS.forEach(function (key) {
      if (snapshot[key]) params.set(key, '1');
    });
    return params.toString();
  }

  function createController(options) {
    options = options || {};
    var applied = freezeSnapshot(options.applied);
    var draft = applied;
    var revision = 0;

    function snapshot() {
      return Object.freeze({
        applied: applied,
        draft: draft,
        dirty: !equalSnapshots(applied, draft),
        revision: revision,
        activeAppliedCount: activeCount(applied),
        activeDraftCount: activeCount(draft)
      });
    }

    function replaceDraft(value) {
      draft = freezeSnapshot(value);
      revision += 1;
      return snapshot();
    }

    return Object.freeze({
      begin: function begin(value) {
        if (value) applied = freezeSnapshot(value);
        draft = applied;
        revision += 1;
        return snapshot();
      },
      update: function update(patch) {
        patch = patch || {};
        return replaceDraft(Object.assign({}, draft, patch));
      },
      replaceDraft: replaceDraft,
      clearDraft: function clearDraft() {
        return replaceDraft({ searchType: draft.searchType });
      },
      cancel: function cancel() {
        draft = applied;
        revision += 1;
        return snapshot();
      },
      replaceApplied: function replaceApplied(value) {
        applied = freezeSnapshot(value);
        draft = applied;
        revision += 1;
        return snapshot();
      },
      commit: function commit(value) {
        if (value) draft = freezeSnapshot(value);
        var before = applied;
        var keys = changedKeys(before, draft);
        applied = draft;
        revision += 1;
        return Object.freeze({
          applied: applied,
          previous: before,
          changedKeys: keys,
          changed: keys.length > 0,
          activeCount: activeCount(applied),
          revision: revision
        });
      },
      getSnapshot: snapshot
    });
  }

  function safeClosest(target, selector) {
    return target && typeof target.closest === 'function' ? target.closest(selector) : null;
  }

  function dispatch(name, detail) {
    if (!root.document || typeof root.document.dispatchEvent !== 'function') return;
    root.document.dispatchEvent(new CustomEvent(name, {
      detail: Object.freeze(detail || {})
    }));
  }

  function defer(callback) {
    if (typeof root.queueMicrotask === 'function') {
      root.queueMicrotask(callback);
      return;
    }
    Promise.resolve().then(callback);
  }

  function locationData() {
    var data = root.DokeSearchData && root.DokeSearchData.locationOptions || {};
    return {
      states: data.states || data.statés || [],
      citiesByState: data.citiesByState || data.citiesByStaté || {},
      neighborhoodsByCity: data.neighborhoodsByCity || {},
      cepLookup: data.cepLookup || {}
    };
  }

  function setSelectOptions(select, values, placeholder, selected) {
    if (!select || !root.document || typeof root.document.createElement !== 'function') return;
    while (select.firstChild) select.removeChild(select.firstChild);
    var empty = root.document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    select.appendChild(empty);
    (values || []).forEach(function (value) {
      var option = root.document.createElement('option');
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    });
    select.value = (values || []).map(String).indexOf(String(selected || '')) >= 0 ? String(selected || '') : '';
    root.DokeUiSelect && root.DokeUiSelect.refresh && root.DokeUiSelect.refresh(select);
  }

  function currentSearchType() {
    var checked = root.document && root.document.querySelector
      ? root.document.querySelector('input[name="searchType"]:checked')
      : null;
    return checked && checked.value || 'services';
  }

  function snapshotFromForm(form) {
    if (!form) return freezeSnapshot({ searchType: currentSearchType() });
    var categories = Array.prototype.map.call(
      form.querySelectorAll('input[name="categories"]:checked'),
      function (input) { return input.value; }
    );
    function value(name) {
      var input = form.querySelector('[name="' + name + '"]');
      return input && input.value || '';
    }
    function checked(name) {
      var input = form.querySelector('[name="' + name + '"]');
      return Boolean(input && input.checked);
    }
    return freezeSnapshot({
      searchType: currentSearchType(),
      categories: categories,
      state: value('state') || value('staté'),
      city: value('city'),
      neighborhood: value('neighborhood'),
      minRating: value('minRating'),
      guaranteed: checked('guaranteed'),
      emergency: checked('emergency'),
      online: checked('online'),
      availableToday: checked('availableToday')
    });
  }

  function writeForm(form, snapshot) {
    if (!form) return;
    snapshot = freezeSnapshot(snapshot);
    var data = locationData();
    Array.prototype.forEach.call(form.querySelectorAll('input[name="categories"]'), function (input) {
      input.checked = snapshot.categories.indexOf(cleanText(input.value)) >= 0;
    });

    var stateSelect = form.querySelector('[name="state"], [name="staté"]');
    var citySelect = form.querySelector('[name="city"]');
    var neighborhoodSelect = form.querySelector('[name="neighborhood"]');
    setSelectOptions(stateSelect, data.states, 'Qualquer estado', snapshot.state);
    setSelectOptions(citySelect, data.citiesByState[snapshot.state] || [], 'Qualquer cidade', snapshot.city);
    setSelectOptions(
      neighborhoodSelect,
      data.neighborhoodsByCity[snapshot.city] || [],
      'Qualquer bairro',
      snapshot.neighborhood
    );

    var minRating = form.querySelector('[name="minRating"]');
    if (minRating) {
      minRating.value = snapshot.minRating ? String(snapshot.minRating) : '';
      root.DokeUiSelect && root.DokeUiSelect.refresh && root.DokeUiSelect.refresh(minRating);
    }

    BOOLEAN_KEYS.forEach(function (key) {
      var input = form.querySelector('[name="' + key + '"]');
      if (input) input.checked = snapshot[key];
    });

    if (root.document && root.document.querySelectorAll) {
      Array.prototype.forEach.call(root.document.querySelectorAll('input[name="searchType"]'), function (input) {
        input.checked = input.value === snapshot.searchType;
      });
    }
  }

  function ensureStatus(form) {
    if (!form || !root.document || typeof root.document.createElement !== 'function') return null;
    var status = form.querySelector('[data-results-filter-status]');
    if (status) return status;
    status = root.document.createElement('p');
    status.className = 'doke-sr-only';
    status.dataset.resultsFilterStatus = '';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Filtros aplicados.';
    form.appendChild(status);
    return status;
  }

  function updateFormState(runtime, announcement) {
    var form = runtime.form;
    if (!form || !runtime.controller) return;
    var snapshot = runtime.controller.getSnapshot();
    form.dataset.filterAuthority = VERSION;
    form.dataset.filterContract = CONTRACT;
    form.dataset.filterState = snapshot.dirty ? 'draft' : 'applied';
    form.dataset.filterDirty = String(snapshot.dirty);

    var applyButton = form.querySelector('button[type="submit"]');
    if (applyButton) {
      applyButton.disabled = !snapshot.dirty;
      applyButton.setAttribute('aria-disabled', String(!snapshot.dirty));
    }
    var resetButton = form.querySelector(FILTER_RESET_SELECTOR);
    if (resetButton) {
      resetButton.disabled = snapshot.activeDraftCount === 0;
      resetButton.setAttribute('aria-disabled', String(snapshot.activeDraftCount === 0));
    }
    var status = ensureStatus(form);
    if (status && announcement) status.textContent = announcement;

    dispatch('doke:search-filters-state', {
      dirty: snapshot.dirty,
      activeAppliedCount: snapshot.activeAppliedCount,
      activeDraftCount: snapshot.activeDraftCount,
      revision: snapshot.revision
    });
  }

  function isDesktop() {
    if (typeof root.matchMedia === 'function') return root.matchMedia('(min-width: 961px)').matches;
    return Number(root.innerWidth || 0) > 960;
  }

  function closeFilterUi() {
    if (!root.document) return;
    Array.prototype.forEach.call(root.document.querySelectorAll(FILTER_OPEN_SELECTOR), function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
    var layout = root.document.querySelector('[data-results-layout]');
    if (layout) {
      layout.classList.remove('is-filters-open');
      layout.classList.toggle('is-filters-collapsed', isDesktop());
    }
    var backdrop = root.document.querySelector(FILTER_BACKDROP_SELECTOR);
    if (backdrop) backdrop.hidden = true;
    root.document.body && root.document.body.classList.remove('results-filters-open');
    root.document.body && root.document.body.classList.toggle('results-filters-collapsed', isDesktop());
    root.document.documentElement && root.document.documentElement.classList.remove('results-filters-open');
  }

  function markCommitEvent(event) {
    try {
      Object.defineProperty(event, '__dokeFiltersCommit', {
        configurable: false,
        enumerable: false,
        value: true
      });
    } catch (error) {
      event.__dokeFiltersCommit = true;
    }
    return event;
  }

  function dispatchSingleSearchCommit(form) {
    var event = markCommitEvent(new Event('change', { bubbles: true }));
    form.dispatchEvent(event);
  }

  function install() {
    if (!root.document || typeof root.document.addEventListener !== 'function') {
      return Object.freeze({ cleanup: function () {} });
    }

    var controller = null;
    var form = null;
    var armed = false;
    var lifecycle = new AbortController();
    var signal = lifecycle.signal;
    var lastDirty = false;

    var runtime = {
      get controller() { return controller; },
      get form() { return form; }
    };

    function ensure() {
      var nextForm = root.document.querySelector(FILTER_FORM_SELECTOR);
      if (!nextForm) return null;
      if (form !== nextForm || !controller) {
        form = nextForm;
        controller = createController({ applied: snapshotFromForm(form) });
        lastDirty = false;
        updateFormState(runtime, 'Filtros aplicados.');
      }
      return controller;
    }

    function announceFromSnapshot() {
      if (!controller) return;
      var dirty = controller.getSnapshot().dirty;
      var announcement = '';
      if (dirty !== lastDirty) {
        announcement = dirty
          ? 'Alterações de filtro não aplicadas.'
          : 'Filtros aplicados.';
      }
      lastDirty = dirty;
      updateFormState(runtime, announcement);
    }

    function rollback(announcement) {
      if (!ensure()) return;
      var snapshot = controller.cancel();
      writeForm(form, snapshot.applied);
      lastDirty = false;
      updateFormState(runtime, announcement || 'Alterações descartadas. Filtros aplicados restaurados.');
    }

    function updateDraftFromForm() {
      if (!ensure()) return;
      controller.replaceDraft(snapshotFromForm(form));
      announceFromSnapshot();
    }

    function commitCurrent(options) {
      options = options || {};
      if (!ensure()) return null;
      controller.replaceDraft(snapshotFromForm(form));
      var receipt = controller.commit();
      lastDirty = false;
      updateFormState(runtime, receipt.changed ? 'Filtros aplicados.' : 'Nenhuma alteração de filtro para aplicar.');
      dispatch('doke:search-filters-committed', {
        changed: receipt.changed,
        changedKeys: receipt.changedKeys,
        activeCount: receipt.activeCount,
        revision: receipt.revision,
        source: cleanText(options.source || 'apply')
      });
      dispatchSingleSearchCommit(form);
      if (!isDesktop()) closeFilterUi();
      return receipt;
    }

    function clearDraft() {
      if (!ensure()) return;
      var snapshot = controller.clearDraft();
      writeForm(form, snapshot.draft);
      lastDirty = snapshot.dirty;
      updateFormState(runtime, snapshot.dirty
        ? 'Filtros limpos no rascunho. Selecione Aplicar para confirmar.'
        : 'Nenhum filtro aplicado.');
    }

    function clearApplied() {
      if (!ensure()) return;
      controller.clearDraft();
      var receipt = controller.commit();
      writeForm(form, receipt.applied);
      lastDirty = false;
      updateFormState(runtime, 'Filtros removidos.');
      dispatch('doke:search-filters-committed', {
        changed: receipt.changed,
        changedKeys: receipt.changedKeys,
        activeCount: 0,
        revision: receipt.revision,
        source: 'empty-reset'
      });
      dispatchSingleSearchCommit(form);
    }

    function rebuildLocationDraft(target) {
      if (!ensure()) return;
      var data = locationData();
      var stateSelect = form.querySelector('[name="state"], [name="staté"]');
      var citySelect = form.querySelector('[name="city"]');
      var neighborhoodSelect = form.querySelector('[name="neighborhood"]');
      if (target === stateSelect) {
        setSelectOptions(citySelect, data.citiesByState[stateSelect.value] || [], 'Qualquer cidade', '');
        setSelectOptions(neighborhoodSelect, [], 'Qualquer bairro', '');
      } else if (target === citySelect) {
        setSelectOptions(
          neighborhoodSelect,
          data.neighborhoodsByCity[citySelect.value] || [],
          'Qualquer bairro',
          ''
        );
      }
    }

    function resolveCep(input) {
      if (!ensure() || !input) return false;
      var digits = cleanText(input.value).replace(/\D/g, '').slice(0, 8);
      input.value = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
      if (!digits) {
        input.removeAttribute('aria-invalid');
        return false;
      }
      if (digits.length < 8) {
        input.setAttribute('aria-invalid', 'true');
        return false;
      }
      var formatted = digits.slice(0, 5) + '-' + digits.slice(5);
      var data = locationData();
      var match = data.cepLookup[formatted] || data.cepLookup[digits];
      if (!match) {
        input.setAttribute('aria-invalid', 'true');
        return false;
      }

      var draft = controller.getSnapshot().draft;
      controller.replaceDraft(Object.assign({}, draft, {
        state: match.state || match.staté || '',
        city: match.city || '',
        neighborhood: match.neighborhood || ''
      }));
      writeForm(form, controller.getSnapshot().draft);
      input.value = formatted;
      input.removeAttribute('aria-invalid');
      var button = root.document.querySelector('[data-results-cep-fill]');
      if (button) button.textContent = formatted;
      announceFromSnapshot();
      return true;
    }

    function beginEditing() {
      if (!ensure()) return;
      var snapshot = controller.begin();
      writeForm(form, snapshot.draft);
      lastDirty = false;
      updateFormState(runtime, 'Filtros prontos para edição.');
    }

    function rollbackBeforeExternalSearch() {
      if (!ensure()) return;
      if (!controller.getSnapshot().dirty) return;
      rollback('Alterações não aplicadas foram descartadas antes da nova busca.');
    }

    function preserveDraftForRefresh() {
      if (!ensure()) return;
      var snapshot = controller.getSnapshot();
      if (!snapshot.dirty) return;
      var draft = snapshot.draft;
      writeForm(form, snapshot.applied);
      defer(function () {
        if (!signal.aborted && form && controller && controller.getSnapshot().dirty) {
          writeForm(form, draft);
          updateFormState(runtime, '');
        }
      });
    }

    function onSubmit(event) {
      if (!armed) return;
      var targetForm = safeClosest(event.target, 'form');
      if (targetForm && targetForm.matches && targetForm.matches(FILTER_FORM_SELECTOR)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        commitCurrent({ source: 'apply' });
        return;
      }
      if (safeClosest(event.target, SEARCH_SUBMIT_SELECTOR)) {
        rollbackBeforeExternalSearch();
      }
    }

    function onChange(event) {
      if (!armed || event.__dokeFiltersCommit) return;
      var target = event.target;
      if (safeClosest(target, 'input[name="searchType"]')) {
        if (ensure()) {
          var nextType = cleanText(target.value);
          var snapshot = controller.getSnapshot();
          if (snapshot.dirty) rollback('Alterações não aplicadas foram descartadas ao trocar o tipo de resultado.');
          controller.replaceApplied(Object.assign({}, controller.getSnapshot().applied, {
            searchType: nextType
          }));
          writeForm(form, controller.getSnapshot().applied);
          updateFormState(runtime, 'Tipo de resultado atualizado.');
        }
        return;
      }
      if (!safeClosest(target, FILTER_FORM_SELECTOR)) return;
      event.stopImmediatePropagation();
      rebuildLocationDraft(target);
      updateDraftFromForm();
    }

    function onInput(event) {
      if (!armed) return;
      var input = safeClosest(event.target, CEP_INPUT_SELECTOR);
      if (!input) return;
      event.stopImmediatePropagation();
      var digits = cleanText(input.value).replace(/\D/g, '').slice(0, 8);
      input.value = digits.length > 5 ? digits.slice(0, 5) + '-' + digits.slice(5) : digits;
      input.removeAttribute('aria-invalid');
      if (digits.length === 8) resolveCep(input);
    }

    function onFocusOut(event) {
      if (!armed) return;
      var input = safeClosest(event.target, CEP_INPUT_SELECTOR);
      if (!input) return;
      event.stopImmediatePropagation();
      var digits = cleanText(input.value).replace(/\D/g, '');
      if (digits && digits.length !== 8) input.setAttribute('aria-invalid', 'true');
    }

    function onClick(event) {
      if (!armed) return;
      var target = event.target;
      var reset = safeClosest(target, FILTER_RESET_SELECTOR);
      if (reset) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearDraft();
        return;
      }
      var emptyReset = safeClosest(target, EMPTY_RESET_SELECTOR);
      if (emptyReset) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearApplied();
        return;
      }
      var close = safeClosest(target, FILTER_CLOSE_SELECTOR);
      var backdrop = safeClosest(target, FILTER_BACKDROP_SELECTOR);
      if (close || backdrop) {
        rollback();
        return;
      }
      var opener = safeClosest(target, FILTER_OPEN_SELECTOR);
      if (opener) {
        if (opener.getAttribute('aria-expanded') === 'true') rollback();
        else beginEditing();
        return;
      }
      if (safeClosest(target, SEARCH_SUGGESTION_SELECTOR)) {
        rollbackBeforeExternalSearch();
      }
    }

    function onKeydown(event) {
      if (!armed) return;
      var input = safeClosest(event.target, CEP_INPUT_SELECTOR);
      if (input && event.key === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        resolveCep(input);
        return;
      }
      if (input && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        input.value = '';
        input.removeAttribute('aria-invalid');
        var row = safeClosest(input, '[data-results-cep-row]');
        row && row.classList.remove('is-editing');
        input.hidden = true;
        var button = root.document.querySelector('[data-results-cep-fill]');
        if (button) button.hidden = false;
        return;
      }
      if (event.key !== 'Escape') return;
      var panel = root.document.querySelector(FILTER_FORM_SELECTOR);
      var expanded = Array.prototype.some.call(root.document.querySelectorAll(FILTER_OPEN_SELECTOR), function (button) {
        return button.getAttribute('aria-expanded') === 'true';
      });
      if (!expanded && !safeClosest(event.target, FILTER_FORM_SELECTOR)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      rollback();
      closeFilterUi();
      var openButton = root.document.querySelector(FILTER_OPEN_SELECTOR);
      openButton && openButton.focus && openButton.focus();
    }

    function onPopState() {
      if (!ensure()) return;
      var next = parseUrl(root.location && root.location.search || '');
      controller.replaceApplied(next);
      writeForm(form, next);
      lastDirty = false;
      updateFormState(runtime, 'Filtros restaurados do histórico.');
    }

    function arm() {
      if (signal.aborted) return;
      armed = true;
      ensure();
    }

    root.document.addEventListener('submit', onSubmit, { capture: true, signal: signal });
    root.document.addEventListener('change', onChange, { capture: true, signal: signal });
    root.document.addEventListener('input', onInput, { capture: true, signal: signal });
    root.document.addEventListener('focusout', onFocusOut, { capture: true, signal: signal });
    root.document.addEventListener('click', onClick, { capture: true, signal: signal });
    root.document.addEventListener('keydown', onKeydown, { capture: true, signal: signal });
    root.document.addEventListener('doke:service-created', preserveDraftForRefresh, { capture: true, signal: signal });
    root.document.addEventListener('doke:service-updated', preserveDraftForRefresh, { capture: true, signal: signal });
    root.addEventListener && root.addEventListener('popstate', onPopState, { signal: signal });
    root.addEventListener && root.addEventListener('pagehide', function () {
      lifecycle.abort();
    }, { once: true, signal: signal });
    root.document.addEventListener('doke:route-leaving', function () {
      defer(function () {
        lifecycle.abort();
      });
    }, { once: true, signal: signal });

    function scheduleArm() {
      if (typeof root.setTimeout === 'function') {
        root.setTimeout(arm, 0);
        return;
      }
      defer(arm);
    }

    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', scheduleArm, { once: true, signal: signal });
    } else {
      scheduleArm();
    }

    return Object.freeze({
      cleanup: function cleanup() {
        lifecycle.abort();
        controller = null;
        form = null;
        armed = false;
      },
      getSnapshot: function getSnapshot() {
        return controller ? controller.getSnapshot() : null;
      },
      commit: function commit() {
        return commitCurrent({ source: 'api' });
      },
      cancel: function cancel() {
        rollback();
      }
    });
  }

  var api = Object.freeze({
    version: VERSION,
    contract: CONTRACT,
    searchTypes: SEARCH_TYPES,
    booleanKeys: BOOLEAN_KEYS,
    filterKeys: ALL_FILTER_KEYS,
    normalize: freezeSnapshot,
    equals: equalSnapshots,
    changedKeys: changedKeys,
    activeCount: activeCount,
    parseUrl: parseUrl,
    serializeUrl: serializeUrl,
    createController: createController,
    install: install
  });

  Doke.searchFilterState = api;

  function installCanonicalSearchFilterState() {
    if (Doke.searchFilterStateInstallation && Doke.searchFilterStateInstallation.cleanup) {
      Doke.searchFilterStateInstallation.cleanup();
    }
    Doke.searchFilterStateInstallation = install();
    return Doke.searchFilterStateInstallation;
  }

  root.DokeInitSearchFilterState = installCanonicalSearchFilterState;
  installCanonicalSearchFilterState();
}());
