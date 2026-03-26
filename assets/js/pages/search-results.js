window.DokeInitSearchResults = function DokeInitSearchResults() {
window.DokeSearchResultsCleanup?.();
const routeController = new AbortController();
const { signal } = routeController;
const searchData = window.DokeSearchData || {};
const params = new URLSearchParams(window.location.search);

const resultsSearchForm = document.querySelector("[data-results-search-form]");
const resultsSearchInput = document.querySelector("[data-results-search-input]");
const topbarSearchForm = document.querySelector("[data-results-topbar-search]");
const topbarSearchInput = document.querySelector("[data-results-topbar-input]");
const resultsFiltersOpenButton = document.querySelector("[data-results-filters-open]");
const resultsFiltersCloseButton = document.querySelector("[data-results-filters-close]");
const resultsFiltersBackdrop = document.querySelector("[data-results-filters-backdrop]");
const searchModeInputs = document.querySelectorAll('input[name="searchType"]');
const filtersForm = document.querySelector("[data-results-filters-form]");
const filtersReset = document.querySelector("[data-results-filters-reset]");
const categoryList = document.querySelector("[data-results-category-list]");
const stateSelect = document.querySelector("[data-results-state-select]");
const citySelect = document.querySelector("[data-results-city-select]");
const neighborhoodSelect = document.querySelector("[data-results-neighborhood-select]");
const cepFillButton = document.querySelector("[data-results-cep-fill]");
const loadingState = document.querySelector("[data-results-loading]");
const resultsGrid = document.querySelector("[data-results-grid]");
const resultsEmpty = document.querySelector("[data-results-empty]");
const resultsEmptyTitle = document.querySelector("[data-results-empty-title]");
const resultsEmptyText = document.querySelector("[data-results-empty-text]");
const resultsEmptySuggestions = document.querySelector("[data-results-empty-suggestions]");
const resultsEmptyGrid = document.querySelector("[data-results-empty-grid]");
const resultsEmptyHelper = document.querySelector("[data-results-empty-helper]");
const resultsSummary = document.querySelector("[data-results-summary]");
const resultsUsersSection = document.querySelector("[data-results-users]");
const resultsUsersGrid = document.querySelector("[data-results-users-grid]");
const resultsVideosSection = document.querySelector("[data-results-videos]");
const resultsVideosGrid = document.querySelector("[data-results-videos-grid]");
const resultsBeforeAfterSection = document.querySelector("[data-results-before-after]");
const resultsBeforeAfterGrid = document.querySelector("[data-results-before-after-grid]");
const resultsTitle = document.querySelector("[data-results-title]");
const resultsDescription = document.querySelector("[data-results-description]");
const resultsCount = document.querySelector("[data-results-count]");
const uiModal = document.querySelector("[data-ui-modal]");
const uiModalClose = document.querySelector("[data-ui-modal-close]");
const uiModalEyebrow = document.querySelector("[data-ui-modal-eyebrow]");
const uiModalTitle = document.querySelector("[data-ui-modal-title]");
const uiModalText = document.querySelector("[data-ui-modal-text]");
const uiModalField = document.querySelector("[data-ui-modal-field]");
const uiModalLabel = document.querySelector("[data-ui-modal-label]");
const uiModalInput = document.querySelector("[data-ui-modal-input]");
const uiModalCancel = document.querySelector("[data-ui-modal-cancel]");
const uiModalConfirm = document.querySelector("[data-ui-modal-confirm]");

if (!resultsSearchForm || !resultsSearchInput) {
  return;
}

const getServiceMatches = searchData.getServiceMatches || (() => []);
const servicePool = searchData.servicePool || [];
const getUserMatches = searchData.getUserMatches || (() => []);
const getShortVideoMatches = searchData.getShortVideoMatches || (() => []);
const getBeforeAfterMatches = searchData.getBeforeAfterMatches || (() => []);
const normalize = searchData.normalize || ((value) => String(value || "").toLowerCase());
const addSearchHistory = searchData.addSearchHistory || (() => {});
const categories = searchData.categories || [];
const locationOptions = searchData.locationOptions || { states: [], citiesByState: {}, neighborhoodsByCity: {}, cepLookup: {} };
const customSelectRegistry = new Map();
let activeModalResolver = null;
let resultsLoadTimer = null;
window.DokeSearchResultsCleanup = () => {
  routeController.abort();
  if (resultsLoadTimer) {
    window.clearTimeout(resultsLoadTimer);
  }
};

const getSearchMode = () => [...searchModeInputs].find((input) => input.checked)?.value || "services";

const getSelectedCategoriesFromParams = () => {
  const values = params.getAll("category")
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return [...new Set(values)];
};

const setSearchMode = (mode = "services") => {
  [...searchModeInputs].forEach((input) => {
    input.checked = input.value === mode;
  });
};

const getTagSearchValue = (value) => String(value || "").replace(/^#/, "").trim();
const goToAdDetails = () => {
  const nextUrl = new URL("detalhe-anuncio.html", window.location.href);

  if (window.DokeNavigate) {
    window.DokeNavigate(nextUrl.toString());
    return;
  }

  window.location.href = nextUrl.toString();
};

const setResultsState = (state) => {
  if (loadingState) {
    loadingState.hidden = state !== "loading";
  }

  if (resultsGrid) {
    resultsGrid.hidden = state !== "results";
  }

  if (resultsEmpty) {
    resultsEmpty.hidden = state !== "empty";
  }

  if (resultsSummary) {
    resultsSummary.hidden = state !== "results";
  }
};

const openMobileFilters = () => {
  document.body.classList.add("results-filters-open");
  if (resultsFiltersBackdrop) {
    resultsFiltersBackdrop.hidden = false;
  }
};

const closeMobileFilters = () => {
  document.body.classList.remove("results-filters-open");
  if (resultsFiltersBackdrop) {
    resultsFiltersBackdrop.hidden = true;
  }
};

const createServiceCard = (item) => {
  const article = document.createElement("article");
  article.className = "service-card service-card--featured service-card--feed";
  article.innerHTML = `
    <div class="service-card__media ${item.mediaClass}">
      <button class="service-card__favorite" type="button" aria-label="Salvar anúncio">
        <svg viewBox="0 0 24 24"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
      </button>
      <span class="service-card__badge ${item.badgeModifier || ""}">${item.badge}</span>
      <div class="service-card__media-content">
        <span class="service-card__category">${item.category}</span>
        <strong>${item.title}</strong>
      </div>
    </div>
    <div class="service-card__body">
      <div class="service-card__rating">&#9733; ${item.rating.toFixed(1).replace(".", ",")} <span>(${item.reviews})</span></div>
      <div class="service-card__meta-row">
        <div class="service-card__profile">
          <span class="service-card__avatar ${item.avatarClass}" aria-hidden="true"></span>
          <span class="service-card__location">${item.location}</span>
        </div>
      </div>
      <div class="service-card__tags">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
      <div class="service-card__footer">
        <div><strong class="service-card__price">${item.price}</strong></div>
        <span class="service-card__cta" aria-label="Ver anúncio">Ver anúncio</span>
      </div>
    </div>
  `;
  return article;
};

const createUserCard = (item) => {
  const article = document.createElement("article");
  article.className = "result-user-card";
  article.innerHTML = `
    <div class="result-user-card__top">
      <span class="service-card__avatar ${item.avatarClass}" aria-hidden="true"></span>
      <div class="result-user-card__identity">
        <strong>${item.name}</strong>
        <span>${item.handle}</span>
      </div>
    </div>
    <div class="result-user-card__body">
      <p>${item.role}</p>
      <span>${item.location}</span>
    </div>
    <div class="result-user-card__footer">
      <span>★ ${item.rating.toFixed(1).replace(".", ",")} • ${item.jobs} serviços</span>
      <a href="#">Ver perfil</a>
    </div>
  `;
  return article;
};

const createVideoCard = (item) => {
  const article = document.createElement("article");
  article.className = `video-card ${item.mediaClass}`;
  article.innerHTML = `
    <span class="video-card__play">▶</span>
    <div class="video-card__content">
      <strong>${item.title}</strong>
      <span>${item.author}</span>
    </div>
  `;
  return article;
};

const createBeforeAfterCard = (item) => {
  const article = document.createElement("article");
  article.className = "comparison-card";
  article.innerHTML = `
    <div class="comparison-card__visual ${item.visualClass}">
      <div class="comparison-card__half comparison-card__half--before"><span>Antes</span></div>
      <div class="comparison-card__half comparison-card__half--after"><span>Depois</span></div>
    </div>
    <div class="comparison-card__body">
      <strong>${item.title}</strong>
      <div class="comparison-card__meta">
        <span>Por ${item.author}</span>
        <span>★ ${String(item.rating).replace(".", ",")}</span>
      </div>
    </div>
  `;
  return article;
};

const getFilters = () => {
  const formData = new FormData(filtersForm);
  return {
    searchType: getSearchMode(),
    categories: formData.getAll("categories"),
    region: formData.get("region") || "",
    state: formData.get("state") || "",
    city: formData.get("city") || "",
    neighborhood: formData.get("neighborhood") || "",
    minRating: formData.get("minRating") || "",
    guaranteed: formData.get("guaranteed") === "on",
    emergency: formData.get("emergency") === "on",
    online: formData.get("online") === "on",
    availableToday: formData.get("availableToday") === "on"
  };
};

const renderCategoryFilters = () => {
  if (!categoryList) return;
  const selectedCategories = getSelectedCategoriesFromParams();
  categoryList.innerHTML = "";
  categories.forEach((category) => {
    const label = document.createElement("label");
    label.className = "results-category-chip";
    label.innerHTML = `
      <input type="checkbox" name="categories" value="${category}" ${selectedCategories.includes(category) ? "checked" : ""}>
      <span>${category}</span>
    `;
    categoryList.appendChild(label);
  });
};

const fillSelectOptions = (select, items, placeholder) => {
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });

  if (items.includes(currentValue)) {
    select.value = currentValue;
  }

  refreshCustomSelect(select);
};

const ensureSelectValue = (select, value, placeholder) => {
  if (!select || !value) return;

  const hasOption = [...select.options].some((option) => option.value === value);
  if (!hasOption) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value || placeholder;
    select.appendChild(option);
  }

  select.value = value;
  refreshCustomSelect(select);
};

const closeAllCustomSelects = (exceptSelect = null) => {
  customSelectRegistry.forEach((instance, select) => {
    if (exceptSelect && select === exceptSelect) return;
    instance.root.classList.remove("is-open");
    instance.menu.hidden = true;
    instance.trigger.setAttribute("aria-expanded", "false");
  });
};

const refreshCustomSelect = (select) => {
  const instance = customSelectRegistry.get(select);
  if (!instance) return;

  const selectedOption = select.options[select.selectedIndex];
  instance.label.textContent = selectedOption?.textContent || select.options[0]?.textContent || "";
  instance.menu.innerHTML = "";

  [...select.options].forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-select__option";
    button.textContent = option.textContent;
    button.dataset.value = option.value;

    if (option.value === select.value) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      select.value = option.value;
      refreshCustomSelect(select);
      closeAllCustomSelects();
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    instance.menu.appendChild(button);
  });
};

const enhanceSelect = (select) => {
  if (!select || customSelectRegistry.has(select)) return;

  const wrapper = document.createElement("div");
  wrapper.className = "ui-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ui-select__trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `
    <span class="ui-select__label"></span>
    <span class="ui-select__caret" aria-hidden="true"></span>
  `;

  const menu = document.createElement("div");
  menu.className = "ui-select__menu";
  menu.hidden = true;

  select.classList.add("ui-select__native");
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  const instance = {
    root: wrapper,
    trigger,
    menu,
    label: trigger.querySelector(".ui-select__label")
  };

  customSelectRegistry.set(select, instance);

  trigger.addEventListener("click", () => {
    const isOpen = !menu.hidden;
    closeAllCustomSelects(select);
    menu.hidden = isOpen;
    wrapper.classList.toggle("is-open", !isOpen);
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });

  select.addEventListener("change", () => {
    refreshCustomSelect(select);
  });

  refreshCustomSelect(select);
};

const enhanceResultsSelects = () => {
  document.querySelectorAll("select[data-ui-select]").forEach((select) => {
    enhanceSelect(select);
  });
};

const extendLocationOptions = ({ state = "", city = "", neighborhood = "" } = {}) => {
  if (state && !locationOptions.states.includes(state)) {
    locationOptions.states = [...locationOptions.states, state].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  if (state && city) {
    const existingCities = Array.isArray(locationOptions.citiesByState[state])
      ? locationOptions.citiesByState[state]
      : [];

    if (!existingCities.includes(city)) {
      locationOptions.citiesByState[state] = [...existingCities, city]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
  }

  if (city && neighborhood) {
    const existingNeighborhoods = Array.isArray(locationOptions.neighborhoodsByCity[city])
      ? locationOptions.neighborhoodsByCity[city]
      : [];

    if (!existingNeighborhoods.includes(neighborhood)) {
      locationOptions.neighborhoodsByCity[city] = [...existingNeighborhoods, neighborhood]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
  }
};

const syncLocationSelects = (source = "state") => {
  const selectedState = stateSelect?.value || "";
  const cities = selectedState ? (locationOptions.citiesByState[selectedState] || []) : [];
  fillSelectOptions(citySelect, cities, "Qualquer cidade");

  if (source === "state" && citySelect) {
    citySelect.value = "";
  }

  const selectedCity = citySelect?.value || "";
  const neighborhoods = selectedCity ? (locationOptions.neighborhoodsByCity[selectedCity] || []) : [];
  fillSelectOptions(neighborhoodSelect, neighborhoods, "Qualquer bairro");

  if ((source === "state" || source === "city") && neighborhoodSelect) {
    neighborhoodSelect.value = "";
  }
};

const bootstrapLocationSelects = () => {
  fillSelectOptions(stateSelect, locationOptions.states || [], "Qualquer estado");
  syncLocationSelects();
};

const closeUiModal = (payload = null) => {
  if (!uiModal) return;
  uiModal.hidden = true;
  document.body.classList.remove("has-modal-open");
  if (activeModalResolver) {
    activeModalResolver(payload);
    activeModalResolver = null;
  }
};

const openUiModal = ({
  eyebrow = "Aviso",
  title = "Mensagem",
  text = "",
  label = "Valor",
  value = "",
  placeholder = "",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  mode = "input"
} = {}) => {
  if (!uiModal || !uiModalTitle || !uiModalText || !uiModalConfirm || !uiModalCancel || !uiModalInput || !uiModalField) {
    return Promise.resolve(null);
  }

  uiModalEyebrow.textContent = eyebrow;
  uiModalTitle.textContent = title;
  uiModalText.textContent = text;
  uiModalLabel.textContent = label;
  uiModalInput.value = value;
  uiModalInput.placeholder = placeholder;
  uiModalConfirm.textContent = confirmLabel;
  uiModalCancel.textContent = cancelLabel;
  uiModalField.hidden = mode !== "input";
  uiModalCancel.hidden = mode === "notice";
  uiModal.hidden = false;
  document.body.classList.add("has-modal-open");

  window.setTimeout(() => {
    if (mode === "input") {
      uiModalInput.focus();
      uiModalInput.select();
    } else {
      uiModalConfirm.focus();
    }
  }, 0);

  return new Promise((resolve) => {
    activeModalResolver = resolve;
  });
};

const showNotice = (title, text) => openUiModal({
  eyebrow: "Localização",
  title,
  text,
  confirmLabel: "Entendi",
  mode: "notice"
});

const promptCepValue = () => openUiModal({
  eyebrow: "Localização",
  title: "Inserir CEP",
  text: "Digite o CEP para preencher estado, cidade e bairro automaticamente.",
  label: "CEP",
  value: "30140-071",
  placeholder: "30140-071",
  confirmLabel: "Preencher",
  cancelLabel: "Cancelar",
  mode: "input"
});

const fetchCepData = async (cep) => {
  const cleanCep = String(cep || "").replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
  const localCep = locationOptions.cepLookup?.[cep] || locationOptions.cepLookup?.[formattedCep];
  if (localCep) return localCep;

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.erro) return null;

  return {
    state: data.uf || "",
    city: data.localidade || "",
    neighborhood: data.bairro || ""
  };
};

const applyCepPreset = async () => {
  const sampleCep = await promptCepValue();
  if (!sampleCep || !sampleCep.confirmed) return;

  const normalizedCep = String(sampleCep.value || "").trim();
  const cepData = await fetchCepData(normalizedCep);

  if (!cepData) {
    await showNotice("CEP não encontrado", "Não conseguimos localizar esse CEP. Confira o número digitado e tente novamente.");
    return;
  }

  extendLocationOptions(cepData);
  bootstrapLocationSelects();

  if (stateSelect) {
    ensureSelectValue(stateSelect, cepData.state, "Qualquer estado");
  }

  fillSelectOptions(citySelect, locationOptions.citiesByState[cepData.state] || [], "Qualquer cidade");

  if (citySelect) {
    ensureSelectValue(citySelect, cepData.city, "Qualquer cidade");
  }

  fillSelectOptions(neighborhoodSelect, locationOptions.neighborhoodsByCity[cepData.city] || [], "Qualquer bairro");

  if (neighborhoodSelect) {
    ensureSelectValue(neighborhoodSelect, cepData.neighborhood, "Qualquer bairro");
  }

  renderResults();
};

const syncInputs = (value) => {
  if (resultsSearchInput) resultsSearchInput.value = value;
  if (topbarSearchInput) topbarSearchInput.value = value;
};

const getQueryTokens = (query = "") => normalize(query)
  .split(/[^a-z0-9]+/i)
  .map((token) => token.trim())
  .filter((token) => token.length > 2);

const getRelatedServices = (query, filters, limit = 1) => {
  const queryTokens = getQueryTokens(query);

  const scored = servicePool
    .filter((item) => {
      if (filters.state && normalize(item.state) !== normalize(filters.state)) return false;
      if (filters.city && normalize(item.city) !== normalize(filters.city)) return false;
      return true;
    })
    .map((item) => {
      const itemText = normalize([
        item.title,
        item.category,
        item.location,
        item.region,
        ...item.tags,
        ...item.keywords
      ].join(" "));

      let score = 0;

      queryTokens.forEach((token) => {
        if (itemText.includes(token)) score += 3;
      });

      if (filters.neighborhood && normalize(item.neighborhood) === normalize(filters.neighborhood)) score += 5;
      if (filters.city && normalize(item.city) === normalize(filters.city)) score += 4;
      if (filters.state && normalize(item.state) === normalize(filters.state)) score += 2;
      if (filters.categories?.length && filters.categories.some((category) => itemText.includes(normalize(category)))) score += 3;
      if (!queryTokens.length && filters.city && normalize(item.city) === normalize(filters.city)) score += 2;
      score += Math.max(0, Math.round(item.rating * 2));

      return { item, score };
    })
    .filter((entry) => entry.score > 0 || !queryTokens.length)
    .sort((a, b) => b.score - a.score || b.item.rating - a.item.rating)
    .slice(0, limit)
    .map((entry) => entry.item);

  if (scored.length >= limit) {
    return scored;
  }

  const fallback = servicePool
    .filter((item) => !scored.some((existing) => existing.id === item.id))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, Math.max(0, limit - scored.length));

  return [...scored, ...fallback];
};

const renderEmptySuggestions = (query, filters) => {
  if (!resultsEmptyGrid || !resultsEmptySuggestions || !resultsEmptyTitle || !resultsEmptyText || !resultsEmptyHelper) return;

  const relatedServices = getRelatedServices(query, filters);
  const hasLocation = filters.neighborhood || filters.city || filters.state;

  resultsEmptyTitle.textContent = query
    ? `Nao achamos um resultado exato para "${query}".`
    : "Nenhum anúncio encaixou nesses filtros.";
  resultsEmptyText.textContent = hasLocation
    ? "Mas ainda dá para explorar profissionais parecidos com a sua busca ou próximos da região selecionada."
    : "Separamos alternativas parecidas para você não sair da busca de mãos vazias.";
  resultsEmptyHelper.textContent = hasLocation
    ? "Priorizamos anúncios na mesma cidade, no mesmo bairro ou com termos parecidos com o que você digitou."
    : "Priorizamos anúncios com categorias e palavras próximas do que você procurou.";

  resultsEmptyGrid.innerHTML = "";
  relatedServices.forEach((item) => {
    resultsEmptyGrid.appendChild(createServiceCard(item));
  });

  resultsEmptySuggestions.hidden = relatedServices.length === 0;
};

const renderRelatedSections = (query) => {
  const users = query ? getUserMatches(query).slice(0, 3) : [];
  const videos = query ? getShortVideoMatches(query).slice(0, 4) : [];
  const beforeAfter = query ? getBeforeAfterMatches(query).slice(0, 2) : [];

  if (resultsUsersGrid && resultsUsersSection) {
    resultsUsersGrid.innerHTML = "";
    users.forEach((item) => {
      resultsUsersGrid.appendChild(createUserCard(item));
    });
    resultsUsersSection.hidden = users.length === 0;
  }

  if (resultsVideosGrid && resultsVideosSection) {
    resultsVideosGrid.innerHTML = "";
    videos.forEach((item) => {
      resultsVideosGrid.appendChild(createVideoCard(item));
    });
    resultsVideosSection.hidden = videos.length === 0;
  }

  if (resultsBeforeAfterGrid && resultsBeforeAfterSection) {
    resultsBeforeAfterGrid.innerHTML = "";
    beforeAfter.forEach((item) => {
      resultsBeforeAfterGrid.appendChild(createBeforeAfterCard(item));
    });
    resultsBeforeAfterSection.hidden = beforeAfter.length === 0;
  }
};

const setQuery = (value) => {
  const cleanValue = String(value || "").trim();
  params.set("type", getSearchMode());
  if (cleanValue) {
    params.set("q", cleanValue);
    addSearchHistory(cleanValue);
  } else {
    params.delete("q");
  }
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", nextUrl);
  syncInputs(cleanValue);
  return cleanValue;
};

const syncCategoryParams = () => {
  const filters = getFilters();
  params.delete("category");
  filters.categories.forEach((category) => {
    params.append("category", category);
  });
};

const renderResults = () => {
  if (!resultsGrid || !resultsTitle || !resultsDescription || !resultsCount) return;

  syncCategoryParams();
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  const query = String(params.get("q") || "").trim();
  const filters = getFilters();
  const userResults = getUserMatches(query);
  const serviceResults = getServiceMatches(query, filters);
  const isUserSearch = filters.searchType === "users";
  const results = isUserSearch ? [] : serviceResults;
  renderRelatedSections(query);

  resultsGrid.innerHTML = "";
  results.forEach((item) => {
    resultsGrid.appendChild(createServiceCard(item));
  });

  resultsCount.textContent = String(isUserSearch ? userResults.length : results.length);
  resultsTitle.textContent = isUserSearch
    ? (query ? `Usuários para "${query}"` : "Usuários em destaque")
    : (query ? `Resultados para "${query}"` : "Resultados em destaque");
  resultsDescription.textContent = isUserSearch
    ? (userResults.length
      ? "Perfis relacionados ao que você digitou."
      : "Não encontramos usuários com esse nome ou termo.")
    : (results.length
      ? "Ajuste os filtros laterais para refinar sem sair da busca."
      : "Não encontramos anúncios com essa combinação de termo e filtro.");

  if (resultsUsersSection) {
    resultsUsersSection.hidden = isUserSearch ? userResults.length === 0 : resultsUsersSection.hidden;
  }

  if (isUserSearch) {
    if (resultsGrid) {
      resultsGrid.innerHTML = "";
    }
    if (resultsUsersGrid) {
      resultsUsersGrid.innerHTML = "";
      userResults.slice(0, 6).forEach((item) => {
        resultsUsersGrid.appendChild(createUserCard(item));
      });
    }
    if (resultsUsersSection) {
      resultsUsersSection.hidden = userResults.length === 0;
    }
    if (userResults.length) {
      setResultsState("empty");
      if (resultsEmpty) {
        resultsEmpty.hidden = true;
      }
    } else {
      renderEmptySuggestions(query, filters);
      setResultsState("empty");
    }
    return;
  }

  if (results.length) {
    setResultsState("results");
  } else {
    renderEmptySuggestions(query, filters);
    setResultsState("empty");
  }
};

const loadResults = () => {
  if (resultsLoadTimer) {
    window.clearTimeout(resultsLoadTimer);
  }

  setResultsState("loading");

  resultsLoadTimer = window.setTimeout(() => {
    resultsLoadTimer = null;
    renderResults();
  }, 1300);
};

const handleSearchSubmit = (event, sourceInput) => {
  event.preventDefault();
  const query = setQuery(sourceInput?.value || "");
  if (!query) {
    sourceInput?.focus();
    return;
  }
  loadResults();
};

syncInputs(String(params.get("q") || ""));
setSearchMode(String(params.get("type") || "services"));
renderCategoryFilters();
enhanceResultsSelects();
bootstrapLocationSelects();
loadResults();

resultsSearchForm?.addEventListener("submit", (event) => handleSearchSubmit(event, resultsSearchInput));
topbarSearchForm?.addEventListener("submit", (event) => handleSearchSubmit(event, topbarSearchInput));

filtersForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  renderResults();
  closeMobileFilters();
});

filtersForm?.addEventListener("change", () => {
  renderResults();
});

document.addEventListener("click", (event) => {
  const tag = event.target.closest(".service-card__tags span");
  if (!tag) return;

  event.preventDefault();
  setQuery(getTagSearchValue(tag.textContent));
  renderCategoryFilters();
  loadResults();
}, { signal });

document.addEventListener("click", (event) => {
  const card = event.target.closest(".service-card");
  if (!card) return;

  if (event.target.closest(".service-card__profile, .service-card__tags, .service-card__favorite")) {
    return;
  }

  event.preventDefault();
  goToAdDetails();
}, { signal });

stateSelect?.addEventListener("change", () => {
  syncLocationSelects("state");
  renderResults();
});

citySelect?.addEventListener("change", () => {
  syncLocationSelects("city");
  renderResults();
});

filtersReset?.addEventListener("click", () => {
  filtersForm?.reset();
  setSearchMode("services");
  bootstrapLocationSelects();
  renderResults();
});

resultsFiltersOpenButton?.addEventListener("click", openMobileFilters);
resultsFiltersCloseButton?.addEventListener("click", closeMobileFilters);
resultsFiltersBackdrop?.addEventListener("click", closeMobileFilters);

[...searchModeInputs].forEach((input) => {
  input.addEventListener("change", () => {
    setQuery(resultsSearchInput?.value || topbarSearchInput?.value || "");
    renderResults();
  });
});

cepFillButton?.addEventListener("click", applyCepPreset);
uiModalClose?.addEventListener("click", () => closeUiModal({ confirmed: false }));
uiModalCancel?.addEventListener("click", () => closeUiModal({ confirmed: false }));
uiModalConfirm?.addEventListener("click", () => {
  closeUiModal({ confirmed: true, value: uiModalInput?.value || "" });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMobileFilters();
  }

  if (event.key === "Escape" && uiModal && !uiModal.hidden) {
    closeUiModal({ confirmed: false });
  }

  if (event.key === "Escape") {
    closeAllCustomSelects();
  }

  if (event.key === "Enter" && uiModal && !uiModal.hidden && document.activeElement === uiModalInput) {
    event.preventDefault();
    closeUiModal({ confirmed: true, value: uiModalInput?.value || "" });
  }
}, { signal });

document.addEventListener("click", (event) => {
  if (!event.target.closest(".ui-select")) {
    closeAllCustomSelects();
  }
}, { signal });

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    closeMobileFilters();
  }
}, { signal });

};

window.DokeInitSearchResults();
