window.DokeInitHome = function DokeInitHome() {
const routeController = new AbortController();
window.DokeHomeCleanup?.();
window.DokeHomeCleanup = () => {
  document.body.classList.remove("home-search-overlay-active");
  routeController.abort();
};
const { signal } = routeController;
/* Home page interactions: search suggestions, tabs and rails. */
const searchData = window.DokeSearchData || {};
const searchBox = document.querySelector("[data-searchbox]");
const searchInput = document.querySelector("[data-search-input]") || document.querySelector("#main-site-search");
const searchDropdown = document.querySelector("[data-search-dropdown]");
const searchRecommendationList = document.querySelector("[data-search-recommendation-list]");
const searchHistoryList = document.querySelector("[data-search-history-list]");
const searchResultsList = document.querySelector("[data-search-results-list]");
const searchResultsSection = document.querySelector("[data-search-results-section]");
const searchHistorySection = document.querySelector("[data-search-history-section]");
const searchRefineSection = document.querySelector("[data-search-refine-section]");
const searchClearButton = document.querySelector("[data-search-clear]");
const searchEmptyState = document.querySelector("[data-search-empty]");
const searchPrimaryCta = document.querySelector(".home-search-hero__cta--primary");

const searchRecommendations = searchData.recommendations || [];
const getSearchHistory = searchData.getSearchHistory || (() => []);
const saveSearchHistory = searchData.saveSearchHistory || (() => {});
const addSearchHistory = searchData.addSearchHistory || (() => {});
const getSuggestionMatches = searchData.getSuggestionMatches || (() => []);
const locationOptions = searchData.locationOptions || { states: [], citiesByState: {}, neighborhoodsByCity: {}, cepLookup: {} };
const moreFiltersToggles = document.querySelectorAll("[data-more-filters-toggle]");
const moreFiltersPanel = document.querySelector("[data-more-filters-panel]");
const moreFiltersClose = document.querySelector("[data-more-filters-close]");
const moreFiltersApply = document.querySelector("[data-more-filters-apply]");
const moreFiltersTabsHost = document.querySelector("[data-more-filters-tabs-host]");
const homeStateSelect = document.querySelector("[data-home-state-select]");
const homeCitySelect = document.querySelector("[data-home-city-select]");
const homeNeighborhoodSelect = document.querySelector("[data-home-neighborhood-select]");
const homeCepFillButton = document.querySelector("[data-home-cep-fill]");
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
const categoryTrack = document.querySelector("[data-category-track]");
const categoryArrows = document.querySelectorAll("[data-category-arrow]");
const railArrows = document.querySelectorAll("[data-rail-arrow]");
const customSelectRegistry = new Map();
let activeModalResolver = null;

if (!searchBox || !searchInput) {
  return;
}

const searchItemIcon = (type = "search") => {
  if (type === "history") {
    return '<svg viewBox="0 0 24 24"><path d="M12 7.5v5l3 2"></path><path d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1"></path><path d="M4.8 5.7v3.6h3.6"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>';
};

let activeSearchIndex = -1;
const isMobileSearchViewport = () => window.innerWidth <= 760;

const createSuggestionButton = ({ label, meta, badge, value, type = "search" }) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "search-suggestion";
  button.dataset.value = value || label;
  button.innerHTML = `
    <span class="search-suggestion__main">
      <span class="search-suggestion__icon" aria-hidden="true">${searchItemIcon(type)}</span>
      <span class="search-suggestion__text">
        <span class="search-suggestion__label">${label}</span>
        <span class="search-suggestion__meta">${meta}</span>
      </span>
    </span>
    <span class="search-suggestion__badge">${badge}</span>
  `;
  return button;
};

const renderRecommendationChips = () => {
  if (!searchRecommendationList) return;
  searchRecommendationList.innerHTML = "";
  searchRecommendations.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-chip";
    button.dataset.value = item;
    button.innerHTML = `${searchItemIcon()}<span>${item}</span>`;
    searchRecommendationList.appendChild(button);
  });
};

const renderSearchHistory = () => {
  if (!searchHistoryList || !searchHistorySection) return;
  const history = getSearchHistory();
  searchHistoryList.innerHTML = "";

  if (!history.length) {
    searchHistorySection.hidden = true;
    return;
  }

  searchHistorySection.hidden = false;
  history.forEach((item) => {
    searchHistoryList.appendChild(createSuggestionButton({
      label: item,
      meta: "Pesquisa recente",
      badge: "Historico",
      value: item,
      type: "history"
    }));
  });
};

const renderSearchSuggestions = (query = "") => {
  if (!searchResultsList || !searchResultsSection) return;

  searchResultsList.innerHTML = "";
  activeSearchIndex = -1;
  if (searchEmptyState) searchEmptyState.hidden = true;

  const cleanQuery = String(query || "").trim();
  if (searchRefineSection) {
    searchRefineSection.hidden = cleanQuery.length < 2;
  }

  if (cleanQuery.length < 2) {
    searchResultsSection.hidden = true;
    return;
  }

  const matches = getSuggestionMatches(cleanQuery);
  if (!matches.length) {
    searchResultsSection.hidden = false;
    if (searchEmptyState) searchEmptyState.hidden = false;
    return;
  }

  matches.forEach((item) => {
    searchResultsList.appendChild(createSuggestionButton(item));
  });
  searchResultsSection.hidden = false;
};

const openSearchDropdown = () => {
  if (!searchDropdown || !searchInput) return;
  searchDropdown.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  if (isMobileSearchViewport()) {
    document.body.classList.add("home-search-overlay-active");
  }
};

const closeSearchDropdown = () => {
  if (!searchDropdown || !searchInput) return;
  searchDropdown.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  activeSearchIndex = -1;
  document.body.classList.remove("home-search-overlay-active");
};

const goToSearchResults = (value) => {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return;
  addSearchHistory(cleanValue);
  const nextUrl = new URL("resultados.html", window.location.href);
  nextUrl.searchParams.set("q", cleanValue);
  if (window.DokeNavigate) {
    window.DokeNavigate(nextUrl.toString());
    return;
  }

  window.location.href = nextUrl.toString();
};

const getVisibleSearchOptions = () => {
  if (!searchDropdown || searchDropdown.hidden) return [];
  return [...searchDropdown.querySelectorAll(".search-suggestion:not([hidden])")];
};

renderRecommendationChips();
renderSearchHistory();
renderSearchSuggestions("");
if (searchDropdown) searchDropdown.hidden = true;

if (searchBox && searchInput && searchDropdown) {
  const syncSearchDropdown = () => {
    const query = searchInput.value.trim();
    renderSearchHistory();
    renderSearchSuggestions(query);

    if (!query.length) {
      const hasRecommendations = !!searchRecommendationList?.children.length;
      const hasHistory = !!searchHistoryList?.children.length;
      if (hasRecommendations || hasHistory) {
        openSearchDropdown();
        return;
      }
    }

    if (query.length >= 2) {
      openSearchDropdown();
      return;
    }

    closeSearchDropdown();
  };

  searchInput.addEventListener("focus", syncSearchDropdown);
  searchInput.addEventListener("click", syncSearchDropdown);
  searchInput.addEventListener("input", syncSearchDropdown);

  searchInput.addEventListener("keydown", (event) => {
    const options = getVisibleSearchOptions();

    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      activeSearchIndex = Math.min(activeSearchIndex + 1, options.length - 1);
      options.forEach((option, index) => option.classList.toggle("is-active", index === activeSearchIndex));
      options[activeSearchIndex].scrollIntoView({ block: "nearest" });
    }

    if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      activeSearchIndex = Math.max(activeSearchIndex - 1, 0);
      options.forEach((option, index) => option.classList.toggle("is-active", index === activeSearchIndex));
      options[activeSearchIndex].scrollIntoView({ block: "nearest" });
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeSearchIndex >= 0 && options[activeSearchIndex]) {
        goToSearchResults(options[activeSearchIndex].dataset.value || options[activeSearchIndex].textContent);
        return;
      }
      goToSearchResults(searchInput.value);
    }

    if (event.key === "Escape") {
      closeSearchDropdown();
    }
  });

  searchDropdown.addEventListener("click", (event) => {
    const suggestion = event.target.closest(".search-suggestion, .search-chip");
    if (!suggestion) return;
    goToSearchResults(suggestion.dataset.value || suggestion.textContent);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-searchbox]")) {
      closeSearchDropdown();
    }
  }, { signal });

  searchBox.addEventListener("submit", (event) => {
    event.preventDefault();
    goToSearchResults(searchInput.value);
  });
}

if (searchPrimaryCta && searchInput) {
  searchPrimaryCta.addEventListener("click", (event) => {
    event.preventDefault();
    goToSearchResults(searchInput.value);
  });
}

window.addEventListener("resize", () => {
  if (!isMobileSearchViewport()) {
    document.body.classList.remove("home-search-overlay-active");
  } else if (!searchDropdown.hidden) {
    document.body.classList.add("home-search-overlay-active");
  }
}, { signal });

if (searchClearButton) {
  searchClearButton.addEventListener("click", () => {
    saveSearchHistory([]);
    renderSearchHistory();
  });
}

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

const enhanceHomeSelects = () => {
  document.querySelectorAll("select[data-ui-select]").forEach((select) => {
    enhanceSelect(select);
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

const ensureSelectValue = (select, value) => {
  if (!select || !value) return;
  const hasOption = [...select.options].some((option) => option.value === value);

  if (!hasOption) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }

  select.value = value;
  refreshCustomSelect(select);
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

const syncHomeLocationSelects = (source = "state") => {
  const selectedState = homeStateSelect?.value || "";
  const cities = selectedState ? (locationOptions.citiesByState[selectedState] || []) : [];
  fillSelectOptions(homeCitySelect, cities, "Qualquer cidade");

  if (source === "state" && homeCitySelect) {
    homeCitySelect.value = "";
    refreshCustomSelect(homeCitySelect);
  }

  const selectedCity = homeCitySelect?.value || "";
  const neighborhoods = selectedCity ? (locationOptions.neighborhoodsByCity[selectedCity] || []) : [];
  fillSelectOptions(homeNeighborhoodSelect, neighborhoods, "Qualquer bairro");

  if ((source === "state" || source === "city") && homeNeighborhoodSelect) {
    homeNeighborhoodSelect.value = "";
    refreshCustomSelect(homeNeighborhoodSelect);
  }
};

const bootstrapHomeLocationSelects = () => {
  fillSelectOptions(homeStateSelect, locationOptions.states || [], "Qualquer estado");
  syncHomeLocationSelects();
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

const showNotice = (title, text) => openUiModal({
  eyebrow: "Localização",
  title,
  text,
  confirmLabel: "Entendi",
  mode: "notice"
});

const fetchCepData = async (cep) => {
  const cleanCep = String(cep || "").replace(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
  const localCep = locationOptions.cepLookup?.[cleanCep] || locationOptions.cepLookup?.[formattedCep];
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

const applyHomeCepPreset = async () => {
  const sampleCep = await promptCepValue();
  if (!sampleCep || !sampleCep.confirmed) return;

  const normalizedCep = String(sampleCep.value || "").trim();
  const cepData = await fetchCepData(normalizedCep);

  if (!cepData) {
    await showNotice("CEP não encontrado", "Não conseguimos localizar esse CEP. Confira o número digitado e tente novamente.");
    return;
  }

  extendLocationOptions(cepData);
  bootstrapHomeLocationSelects();
  ensureSelectValue(homeStateSelect, cepData.state);
  fillSelectOptions(homeCitySelect, locationOptions.citiesByState[cepData.state] || [], "Qualquer cidade");
  ensureSelectValue(homeCitySelect, cepData.city);
  fillSelectOptions(homeNeighborhoodSelect, locationOptions.neighborhoodsByCity[cepData.city] || [], "Qualquer bairro");
  ensureSelectValue(homeNeighborhoodSelect, cepData.neighborhood);
};

enhanceHomeSelects();
bootstrapHomeLocationSelects();

homeStateSelect?.addEventListener("change", () => {
  syncHomeLocationSelects("state");
});

homeCitySelect?.addEventListener("change", () => {
  syncHomeLocationSelects("city");
});

homeCepFillButton?.addEventListener("click", applyHomeCepPreset);
uiModalClose?.addEventListener("click", () => closeUiModal({ confirmed: false }));
uiModalCancel?.addEventListener("click", () => closeUiModal({ confirmed: false }));
uiModalConfirm?.addEventListener("click", () => {
  closeUiModal({ confirmed: true, value: uiModalInput?.value || "" });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".ui-select")) {
    closeAllCustomSelects();
  }
}, { signal });

document.querySelectorAll("[data-chip-group]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip, .filter-chip");
    if (!chip || chip.dataset.locked === "true") return;

    if (group.dataset.mode === "single") {
      group.querySelectorAll(".chip").forEach((item) => item.classList.remove("is-active"));
      chip.classList.add("is-active");
      return;
    }

    chip.classList.toggle("is-active");
  });
});

const openMoreFilters = () => {
  if (!moreFiltersToggles.length || !moreFiltersPanel) return;
  moreFiltersPanel.hidden = false;
  moreFiltersToggles.forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("is-active");
  });
};

const closeMoreFilters = () => {
  if (!moreFiltersToggles.length || !moreFiltersPanel) return;
  moreFiltersPanel.hidden = true;
  moreFiltersToggles.forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("is-active");
  });
};

if (moreFiltersToggles.length && moreFiltersPanel) {
  closeMoreFilters();

  moreFiltersToggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeMoreFilters();
        return;
      }
      openMoreFilters();
    });
  });

  moreFiltersClose?.addEventListener("click", closeMoreFilters);
  moreFiltersApply?.addEventListener("click", closeMoreFilters);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMoreFilters();
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
}

const bindScrollRail = ({ track, arrows, directionAttr, amountFactor }) => {
  if (!track || !arrows.length) return;

  arrows.forEach((arrow) => {
    arrow.addEventListener("click", () => {
      const direction = arrow.dataset[directionAttr] === "next" ? 1 : -1;
      const amount = Math.max(220, Math.round(track.clientWidth * amountFactor));
      track.scrollBy({ left: amount * direction, behavior: "smooth" });
    });
  });
};

bindScrollRail({
  track: categoryTrack,
  arrows: categoryArrows,
  directionAttr: "categoryArrow",
  amountFactor: 0.45
});

railArrows.forEach((arrow) => {
  const targetId = arrow.dataset.railTarget;
  if (!targetId) return;
  const track = document.getElementById(targetId);
  if (!track) return;

  bindScrollRail({
    track,
    arrows: [arrow],
    directionAttr: "railArrow",
    amountFactor: 0.82
  });
});

};

window.DokeInitHome();
