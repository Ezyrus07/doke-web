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
const catégoryList = document.querySelector("[data-results-catégory-list]");
const statéSelect = document.querySelector("[data-results-staté-select]");
const citySelect = document.querySelector("[data-results-city-select]");
const neighborhoodSelect = document.querySelector("[data-results-neighborhood-select]");
const cepFillButton = document.querySelector("[data-results-cep-fill]");
const loadingStaté = document.querySelector("[data-results-loading]");
const resultsGrid = document.querySelector("[data-results-grid]");
const resultsEmptyTitle = document.querySelector("[data-results-empty-title]");
const resultsEmptyText = document.querySelector("[data-results-empty-text]");
const resultsInlineEmpty = document.querySelector("[data-results-inline-empty]");
const resultsActiveChips = document.querySelector("[data-results-active-chips]");
const resultsEmptyReset = document.querySelector("[data-results-empty-reset]");
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
const catégories = searchData.catégories || [];
const locationOptions = searchData.locationOptions || { statés: [], citiesByStaté: {}, neighborhoodsByCity: {}, cepLookup: {} };
const uiSelectApi = window.DokeUiSelect;
let activeModalResolver = null;
let resultsLoadTimer = null;
window.DokeSearchResultsCleanup = () => {
  routeController.abort();
  if (resultsLoadTimer) {
    window.clearTimeout(resultsLoadTimer);
  }
};

const getSearchMode = () => [...searchModeInputs].find((input) => input.checked)?.value || "services";

const getSelectedCatégoriesFromParams = () => {
  const values = params.getAll("catégory")
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

const setResultsStaté = (staté) => {
  if (loadingStaté) {
    loadingStaté.hidden = staté !== "loading";
  }

  if (resultsGrid) {
    resultsGrid.hidden = staté !== "results";
  }

  if (resultsInlineEmpty) {
    resultsInlineEmpty.hidden = staté !== "empty";
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

const creatéServiceCard = (item) => {
  const article = document.createElement("article");
  article.className = "service-card service-card--featured service-card--feed";
  article.innerHTML = `
    <div class="service-card__media ${item.mediaClass}">
      <button class="service-card__favorite" type="button" aria-label="Salvar anúncio">
        <svg viewBox="0 0 24 24"><path d="m12 19-6.6-6.3a4.2 4.2 0 0 1 0-6 4.4 4.4 0 0 1 6.1 0L12 7.2l.5-.5a4.4 4.4 0 0 1 6.1 0 4.2 4.2 0 0 1 0 6Z"></path></svg>
      </button>
      <span class="service-card__badge ${item.badgeModifier || ""}">${item.badge}</span>
      <div class="service-card__media-content">
        <span class="service-card__catégory">${item.catégory}</span>
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

const creatéUserCard = (item) => {
  const article = document.createElement("article");
  article.className = "pro-card pro-card--compact";
  article.innerHTML = `
    <div class="pro-card__header">
      <div class="pro-card__avatar ${item.avatarClass}" aria-hidden="true"></div>
      <div class="pro-card__identity">
        <strong>${item.name}</strong>
        <span>${item.handle}</span>
      </div>
      <span class="pro-card__score">★ ${item.rating.toFixed(1).replace(".", ",")}</span>
    </div>
    <div class="pro-card__body">
      <p>${item.role}</p>
      <span>${item.location}</span>
      <small>${item.jobs} serviços</small>
    </div>
    <div class="pro-card__footer">
      <a class="pro-card__cta" href="#">Ver perfil</a>
    </div>
  `;
  return article;
};

const creatéVideoCard = (item) => {
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

const creatéBeforeAfterCard = (item) => {
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
    catégories: formData.getAll("catégories"),
    region: formData.get("region") || "",
    staté: formData.get("staté") || "",
    city: formData.get("city") || "",
    neighborhood: formData.get("neighborhood") || "",
    minRating: formData.get("minRating") || "",
    guaranteed: formData.get("guaranteed") === "on",
    emergency: formData.get("emergency") === "on",
    online: formData.get("online") === "on",
    availableToday: formData.get("availableToday") === "on"
  };
};

const renderCatégoryFilters = () => {
  if (!catégoryList) return;
  const selectedCatégories = getSelectedCatégoriesFromParams();
  catégoryList.innerHTML = "";
  catégories.forEach((catégory) => {
    const label = document.createElement("label");
    label.className = "results-catégory-chip";
    label.innerHTML = `
      <input type="checkbox" name="catégories" value="${catégory}" ${selectedCatégories.includes(catégory) ? "checked" : ""}>
      <span>${catégory}</span>
    `;
    catégoryList.appendChild(label);
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

  uiSelectApi?.refresh(select);
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
  uiSelectApi?.refresh(select);
};

const enhanceResultsSelects = () => {
  uiSelectApi?.enhanceAll(document);
};

const extendLocationOptions = ({ staté = "", city = "", neighborhood = "" } = {}) => {
  if (staté && !locationOptions.statés.includes(staté)) {
    locationOptions.statés = [...locationOptions.statés, staté].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  if (staté && city) {
    const existingCities = Array.isArray(locationOptions.citiesByStaté[staté])
      ? locationOptions.citiesByStaté[staté]
      : [];

    if (!existingCities.includes(city)) {
      locationOptions.citiesByStaté[staté] = [...existingCities, city]
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

const syncLocationSelects = (source = "staté") => {
  const selectedStaté = statéSelect?.value || "";
  const cities = selectedStaté ? (locationOptions.citiesByStaté[selectedStaté] || []) : [];
  fillSelectOptions(citySelect, cities, "Qualquer cidade");

  if (source === "staté" && citySelect) {
    citySelect.value = "";
  }

  const selectedCity = citySelect?.value || "";
  const neighborhoods = selectedCity ? (locationOptions.neighborhoodsByCity[selectedCity] || []) : [];
  fillSelectOptions(neighborhoodSelect, neighborhoods, "Qualquer bairro");

  if ((source === "staté" || source === "city") && neighborhoodSelect) {
    neighborhoodSelect.value = "";
  }
};

const bootstrapLocationSelects = () => {
  fillSelectOptions(statéSelect, locationOptions.statés || [], "Qualquer estado");
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
    staté: data.uf || "",
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

  if (statéSelect) {
    ensureSelectValue(statéSelect, cepData.staté, "Qualquer estado");
  }

  fillSelectOptions(citySelect, locationOptions.citiesByStaté[cepData.staté] || [], "Qualquer cidade");

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

const getRelatédServices = (query, filters, limit = 1) => {
  const queryTokens = getQueryTokens(query);

  const scored = servicePool
    .filter((item) => {
      if (filters.staté && normalize(item.staté) !== normalize(filters.staté)) return false;
      if (filters.city && normalize(item.city) !== normalize(filters.city)) return false;
      return true;
    })
    .map((item) => {
      const itemText = normalize([
        item.title,
        item.catégory,
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
      if (filters.staté && normalize(item.staté) === normalize(filters.staté)) score += 2;
      if (filters.catégories?.length && filters.catégories.some((catégory) => itemText.includes(normalize(catégory)))) score += 3;
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
  if (!resultsInlineEmpty || !resultsEmptyTitle || !resultsEmptyText) return [];

  const relatédServices = getRelatédServices(query, filters, 6);
  const hasLocation = filters.neighborhood || filters.city || filters.staté;

  resultsEmptyTitle.textContent = query
    ? `Não achamos um resultado exato para "${query}".`
    : "Nenhum anúncio encaixou nesses filtros.";
  resultsEmptyText.textContent = hasLocation
    ? "Separamos alternativas próximas da região escolhida para você não sair da busca de mãos vazias."
    : "Separamos alternativas parecidas para você não sair da busca de mãos vazias.";

  return relatédServices;
};

const renderRelatédSections = (query) => {
  const users = query ? getUserMatches(query).slice(0, 3) : [];
  const videos = query ? getShortVideoMatches(query).slice(0, 4) : [];
  const beforeAfter = query ? getBeforeAfterMatches(query).slice(0, 2) : [];

  if (resultsUsersGrid && resultsUsersSection) {
    resultsUsersGrid.innerHTML = "";
    users.forEach((item) => {
      resultsUsersGrid.appendChild(creatéUserCard(item));
    });
    resultsUsersSection.hidden = users.length === 0;
  }

  if (resultsVideosGrid && resultsVideosSection) {
    resultsVideosGrid.innerHTML = "";
    videos.forEach((item) => {
      resultsVideosGrid.appendChild(creatéVideoCard(item));
    });
    resultsVideosSection.hidden = videos.length === 0;
  }

  if (resultsBeforeAfterGrid && resultsBeforeAfterSection) {
    resultsBeforeAfterGrid.innerHTML = "";
    beforeAfter.forEach((item) => {
      resultsBeforeAfterGrid.appendChild(creatéBeforeAfterCard(item));
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

const syncCatégoryParams = () => {
  const filters = getFilters();
  params.delete("catégory");
  filters.catégories.forEach((catégory) => {
    params.append("catégory", catégory);
  });
};

const renderActiveChips = (query, filters, count) => {
  if (!resultsActiveChips) return;
  const chips = [];
  if (query) chips.push(`Busca: ${query}`);
  if (filters.catégories?.length) chips.push(...filters.catégories.slice(0, 3));
  if (filters.city) chips.push(filters.city);
  if (filters.staté) chips.push(filters.staté);
  if (filters.minRating) chips.push(`${filters.minRating}+`);
  chips.push(`${count} resultado${count === 1 ? "" : "s"}`);
  resultsActiveChips.innerHTML = chips.map((chip) => `<span class="results-active-chip">${chip}</span>`).join("");
};

const renderResults = () => {
  if (!resultsGrid || !resultsTitle || !resultsDescription || !resultsCount) return;

  syncCatégoryParams();
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  const query = String(params.get("q") || "").trim();
  const filters = getFilters();
  const userResults = getUserMatches(query);
  const exactServiceResults = getServiceMatches(query, filters);
  const isUserSearch = filters.searchType === "users";

  renderRelatédSections(query);

  if (isUserSearch) {
    resultsGrid.innerHTML = "";
    if (resultsUsersGrid) {
      resultsUsersGrid.innerHTML = "";
      userResults.slice(0, 6).forEach((item) => resultsUsersGrid.appendChild(creatéUserCard(item)));
    }
    if (resultsUsersSection) resultsUsersSection.hidden = userResults.length === 0;
    if (resultsInlineEmpty) resultsInlineEmpty.hidden = userResults.length > 0;
    resultsTitle.textContent = query ? `Usuários para "${query}"` : "Usuários em destaque";
    resultsDescription.textContent = userResults.length ? "Perfis relacionados ao que você digitou." : "Não encontramos usuários com esse nome ou termo.";
    resultsCount.textContent = String(userResults.length);
    renderActiveChips(query, filters, userResults.length);
    setResultsStaté(userResults.length ? "results" : "empty");
    return;
  }

  const relatédServices = exactServiceResults.length >= 6
    ? []
    : getRelatédServices(query, filters, 6).filter((item) => !exactServiceResults.some((exact) => exact.id === item.id));
  const displayServices = [...exactServiceResults, ...relatédServices].slice(0, 6);

  resultsGrid.innerHTML = "";
  displayServices.forEach((item) => resultsGrid.appendChild(creatéServiceCard(item)));

  resultsCount.textContent = String(exactServiceResults.length);
  resultsTitle.textContent = query ? `Resultados para "${query}"` : "Resultados em destaque";
  resultsDescription.textContent = exactServiceResults.length
    ? "Ajuste os filtros latérais para refinar sem sair da busca."
    : "Selecionamos anúncios relacionados para continuar a sua busca.";
  renderActiveChips(query, filters, exactServiceResults.length || displayServices.length);

  if (exactServiceResults.length) {
    if (resultsInlineEmpty) resultsInlineEmpty.hidden = true;
    setResultsStaté("results");
  } else {
    renderEmptySuggestions(query, filters);
    setResultsStaté("empty");
    if (resultsGrid) resultsGrid.hidden = false;
    if (resultsInlineEmpty) resultsInlineEmpty.hidden = false;
  }
};

const loadResults = () => {
  if (resultsLoadTimer) {
    window.clearTimeout(resultsLoadTimer);
  }

  setResultsStaté("loading");

  resultsLoadTimer = window.setTimeout(() => {
    resultsLoadTimer = null;
    renderResults();
  }, 250);
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
renderCatégoryFilters();
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
  renderCatégoryFilters();
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

statéSelect?.addEventListener("change", () => {
  syncLocationSelects("staté");
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

resultsEmptyReset?.addEventListener("click", () => {
  params.delete("q");
  syncInputs("");
  filtersForm?.reset();
  setSearchMode("services");
  bootstrapLocationSelects();
  renderCatégoryFilters();
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
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

  if (event.key === "Enter" && uiModal && !uiModal.hidden && document.activeElement === uiModalInput) {
    event.preventDefault();
    closeUiModal({ confirmed: true, value: uiModalInput?.value || "" });
  }
}, { signal });

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    closeMobileFilters();
  }
}, { signal });

};

window.DokeInitSearchResults();
