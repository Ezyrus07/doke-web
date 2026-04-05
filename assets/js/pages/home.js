window.DokeInitHome = function DokeInitHome() {
const routeController = new AbortController();
window.DokeHomeCleanup?.();
window.DokeHomeCleanup = () => {
  document.body.classList.remove("home-search-overlay-active");
  document.body.classList.remove("home-search-has-query");
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
const moreFiltersSearchHost = document.querySelector("[data-more-filters-search-host]");
const leadingHeroFiltersButton = document.querySelector(".home-search-hero__leading-filter");
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
const orderFeedback = document.querySelector("[data-order-feedback]");
const orderFeedbackLoading = document.querySelector("[data-order-feedback-loading]");
const orderFeedbackSuccess = document.querySelector("[data-order-feedback-success]");
const orderFeedbackClose = document.querySelector("[data-order-feedback-close]");
const orderFeedbackProvider = document.querySelector("[data-order-feedback-provider]");
const orderFeedbackLocation = document.querySelector("[data-order-feedback-location]");
const orderFeedbackUrgency = document.querySelector("[data-order-feedback-urgency]");
const uiSelectApi = window.DokeUiSelect;
let activeModalResolver = null;

const sideMeta = document.querySelector(".home-side-meta");
const sideMetaSearchButton = document.querySelector(".home-side-meta__search");
const sideMetaSearchInput = document.querySelector(".home-side-meta__search-input");
const homeProfileMenuToggle = document.querySelector("[data-home-profile-menu-toggle]");
const homeAccountMenuToggle = document.querySelector("[data-home-account-menu-toggle]");
const homeProfileMenu = document.querySelector("[data-home-profile-menu]");
const homeAccountMenu = document.querySelector("[data-home-account-menu]");
const desktopLocationTrigger = document.querySelector(".home-side-meta__location");
const mobileLocationTrigger = document.querySelector(".mobile-header-location[data-location-trigger]");
const locationTriggers = [desktopLocationTrigger, mobileLocationTrigger].filter(Boolean);
const locationMenu = document.querySelector("[data-home-location-menu]");
const locationMenuContent = document.querySelector("[data-home-location-content]");
const locationMenuClose = document.querySelector("[data-home-location-close]");
const locationMenuAdd = document.querySelector("[data-home-location-add]");
const locationMenuFooter = document.querySelector("[data-home-location-footer]");
const addressModal = document.querySelector("[data-home-address-modal]");
const addressForm = document.querySelector("[data-home-address-form]");
const addressCloseButtons = document.querySelectorAll("[data-home-address-close]");
const topbarLocationValues = document.querySelectorAll("[data-topbar-location-value]");
const defaultServiceLocationKey = "doke.defaultServiceLocation";
const savedServiceLocationsKey = "doke.savedServiceLocations";
let activeLocationTrigger = null;
let lockedLocationScrollY = 0;

if (sideMeta && sideMetaSearchButton && sideMetaSearchInput) {
  const closeSideMetaSearch = () => sideMeta.classList.remove("is-search-open");
  sideMetaSearchButton.addEventListener("click", (event) => {
    event.preventDefault();
    const willOpen = !sideMeta.classList.contains("is-search-open");
    sideMeta.classList.toggle("is-search-open", willOpen);
    if (willOpen) {
      window.requestAnimationFrame(() => sideMetaSearchInput.focus());
    }
  }, { signal });

  document.addEventListener("click", (event) => {
    if (!sideMeta.contains(event.target)) {
      closeSideMetaSearch();
    }
  }, { signal });

  sideMetaSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSideMetaSearch();
      sideMetaSearchButton.focus();
    }
  }, { signal });
}

const closeHomeProfileMenus = () => {
  homeProfileMenu && (homeProfileMenu.hidden = true);
  homeAccountMenu && (homeAccountMenu.hidden = true);
  homeProfileMenuToggle?.setAttribute("aria-expanded", "false");
  homeAccountMenuToggle?.setAttribute("aria-expanded", "false");
};

const toggleHomeProfileMenu = (menu, toggle) => {
  if (!menu || !toggle) return;
  const shouldOpen = menu.hidden;
  closeHomeProfileMenus();
  menu.hidden = !shouldOpen;
  toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
};

homeProfileMenuToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleHomeProfileMenu(homeProfileMenu, homeProfileMenuToggle);
}, { signal });

homeAccountMenuToggle?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  toggleHomeProfileMenu(homeAccountMenu, homeAccountMenuToggle);
}, { signal });

homeProfileMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
}, { signal });

homeAccountMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
}, { signal });

const readSavedLocations = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(savedServiceLocationsKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
};

const readDefaultLocation = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(defaultServiceLocationKey) || "null");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const persistSavedLocations = (items) => {
  window.localStorage.setItem(savedServiceLocationsKey, JSON.stringify(items));
};

const persistDefaultLocation = (item) => {
  if (!item) {
    window.localStorage.removeItem(defaultServiceLocationKey);
    return;
  }

  window.localStorage.setItem(defaultServiceLocationKey, JSON.stringify(item));
};

const buildLocationId = (item) => [
  item.titulo,
  item.rua,
  item.numero,
  item.bairro,
  item.cidade,
  item.uf
].map((value) => String(value || "").trim().toLowerCase()).join("|");

const normalizeLocation = (item = {}) => ({
  id: item.id || buildLocationId(item),
  titulo: String(item.titulo || "").trim(),
  rua: String(item.rua || "").trim(),
  numero: String(item.numero || "").trim(),
  bairro: String(item.bairro || "").trim(),
  cidade: String(item.cidade || "").trim(),
  uf: String(item.uf || "").trim().toUpperCase(),
  complemento: String(item.complemento || "").trim(),
  referencia: String(item.referencia || "").trim()
});

const ensureLocationCollection = () => {
  const savedLocations = readSavedLocations().map(normalizeLocation);
  const defaultLocation = readDefaultLocation();
  if (!defaultLocation) {
    persistSavedLocations(savedLocations);
    return savedLocations;
  }

  const normalizedDefault = normalizeLocation(defaultLocation);
  const hasDefault = savedLocations.some((item) => item.id === normalizedDefault.id);
  const nextLocations = hasDefault ? savedLocations : [normalizedDefault, ...savedLocations];
  persistSavedLocations(nextLocations);
  return nextLocations;
};

const formatLocationSummary = (item) => {
  if (!item) return "";
  return [item.rua && item.numero ? `${item.rua}, ${item.numero}` : item.rua, item.bairro, item.cidade, item.uf]
    .filter(Boolean)
    .join(" · ");
};

const formatLocationTriggerValue = (item) => {
  if (!item) return "Adicionar endereço";
  if (item.cidade && item.uf) return `${item.cidade}, ${item.uf}`;
  return item.titulo || item.rua || "Adicionar endereço";
};

const syncTopbarLocationValues = () => {
  const currentLocation = readDefaultLocation();
  const value = formatLocationTriggerValue(currentLocation);
  topbarLocationValues.forEach((node) => {
    node.textContent = value;
  });
};

const closeLocationMenu = () => {
  if (!locationMenu) return;
  locationMenu.hidden = true;
  locationTriggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  activeLocationTrigger = null;
};

const renderLocationMenu = () => {
  if (!locationMenuContent) return;
  const savedLocations = ensureLocationCollection();
  const defaultLocation = readDefaultLocation();
  if (locationMenuFooter) {
    locationMenuFooter.hidden = savedLocations.length === 0;
  }

  if (!savedLocations.length) {
    locationMenuContent.innerHTML = `
      <div class="home-location-popover__empty">
        <strong>Nenhum endereço cadastrado</strong>
        <p>Adicione um endereço para reutilizar nesta home e nos próximos fluxos.</p>
      </div>
    `;
    return;
  }

  locationMenuContent.innerHTML = "";
  savedLocations.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "home-location-option";
    if (defaultLocation && normalizeLocation(defaultLocation).id === item.id) {
      button.classList.add("is-active");
    }
    button.dataset.locationId = item.id;
    button.innerHTML = `
      <span class="home-location-option__text">
        <strong>${item.titulo || formatLocationTriggerValue(item)}</strong>
        <span>${formatLocationSummary(item)}</span>
      </span>
      <span class="home-location-option__check" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12.5 9.2 17 19 7.5"></path></svg>
      </span>
    `;
    locationMenuContent.appendChild(button);
  });
};

const positionLocationMenu = (trigger) => {
  if (!locationMenu || !trigger) return;
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const menuWidth = Math.min(360, Math.max(280, rect.width));
  const left = Math.min(
    Math.max(16, rect.left),
    Math.max(16, viewportWidth - menuWidth - 16)
  );

  locationMenu.style.setProperty("--home-location-popover-top", `${rect.bottom + 12}px`);
  locationMenu.style.setProperty("--home-location-popover-left", `${left}px`);
  locationMenu.style.setProperty("--home-location-popover-width", `${menuWidth}px`);
};

const openLocationMenu = (trigger) => {
  if (!locationMenu || !trigger) return;
  if (!ensureLocationCollection().length) {
    openAddressModal();
    return;
  }
  activeLocationTrigger = trigger;
  renderLocationMenu();
  positionLocationMenu(trigger);
  locationMenu.hidden = false;
  locationTriggers.forEach((item) => item.setAttribute("aria-expanded", item === trigger ? "true" : "false"));
};

const lockAddressViewport = () => {
  lockedLocationScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = `-${lockedLocationScrollY}px`;
  document.body.classList.add("home-address-modal-open");
};

const unlockAddressViewport = () => {
  const top = document.body.style.top;
  document.body.classList.remove("home-address-modal-open");
  document.body.style.top = "";
  const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedLocationScrollY : lockedLocationScrollY;
  window.scrollTo(0, nextScrollY);
};

const openAddressModal = () => {
  if (!addressModal || !addressForm) return;
  addressForm.reset();
  const cityField = addressForm.elements.namedItem("cidade");
  const ufField = addressForm.elements.namedItem("uf");
  const defaultCheckbox = addressForm.elements.namedItem("padrao");
  if (cityField) cityField.value = "Belo Horizonte";
  if (ufField) ufField.value = "MG";
  if (defaultCheckbox && "checked" in defaultCheckbox) defaultCheckbox.checked = !readDefaultLocation();
  lockAddressViewport();
  addressModal.showModal();
  window.requestAnimationFrame(() => {
    const firstInput = addressForm.querySelector("input:not([type='checkbox'])");
    firstInput?.focus();
  });
};

const closeAddressModal = () => {
  addressModal?.close();
};

const saveLocation = (item, makeDefault = false) => {
  const normalized = normalizeLocation(item);
  const savedLocations = ensureLocationCollection().filter((location) => location.id !== normalized.id);
  const nextLocations = [normalized, ...savedLocations];
  persistSavedLocations(nextLocations);
  if (makeDefault || !readDefaultLocation()) {
    persistDefaultLocation(normalized);
  }
  syncTopbarLocationValues();
  renderLocationMenu();
};

const activateLocationById = (locationId) => {
  const selected = ensureLocationCollection().find((item) => item.id === locationId);
  if (!selected) return;
  persistDefaultLocation(selected);
  syncTopbarLocationValues();
  renderLocationMenu();
  closeLocationMenu();
};

syncTopbarLocationValues();
ensureLocationCollection();

desktopLocationTrigger?.setAttribute("data-location-trigger", "");

locationTriggers.forEach((trigger) => {
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (locationMenu && !locationMenu.hidden && activeLocationTrigger === trigger) {
      closeLocationMenu();
      return;
    }
    openLocationMenu(trigger);
  }, { signal });
});

locationMenuClose?.addEventListener("click", () => {
  closeLocationMenu();
}, { signal });

locationMenuAdd?.addEventListener("click", () => {
  closeLocationMenu();
  openAddressModal();
}, { signal });

locationMenuContent?.addEventListener("click", (event) => {
  event.stopPropagation();
  const locationOption = event.target.closest("[data-location-id]");
  if (!locationOption) return;
  activateLocationById(locationOption.dataset.locationId || "");
}, { signal });

locationMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
}, { signal });

addressCloseButtons.forEach((button) => {
  button.addEventListener("click", closeAddressModal, { signal });
});

addressModal?.addEventListener("click", (event) => {
  const dialog = addressModal.querySelector(".home-address-modal__dialog");
  if (dialog && !dialog.contains(event.target)) {
    closeAddressModal();
  }
}, { signal });

addressModal?.addEventListener("close", unlockAddressViewport, { signal });

addressForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!addressForm.reportValidity()) return;
  const data = new FormData(addressForm);
  const nextLocation = {
    titulo: data.get("titulo"),
    rua: data.get("rua"),
    numero: data.get("numero"),
    bairro: data.get("bairro"),
    cidade: data.get("cidade"),
    uf: data.get("uf"),
    complemento: data.get("complemento"),
    referencia: data.get("referencia")
  };
  saveLocation(nextLocation, Boolean(data.get("padrao")));
  closeAddressModal();
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".home-side-meta__profile-wrap")) return;
  if (event.target.closest(".home-side-meta__location, .mobile-header-location, [data-home-location-menu]")) return;
  closeLocationMenu();
  closeHomeProfileMenus();
}, { signal });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLocationMenu();
    closeHomeProfileMenus();
  }
}, { signal });

window.addEventListener("resize", () => {
  if (activeLocationTrigger && locationMenu && !locationMenu.hidden) {
    positionLocationMenu(activeLocationTrigger);
  }
}, { signal });

window.addEventListener("scroll", () => {
  if (activeLocationTrigger && locationMenu && !locationMenu.hidden) {
    positionLocationMenu(activeLocationTrigger);
  }
}, { signal, passive: true });

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
const shouldUseSearchDropdown = () => !isMobileSearchViewport();
const syncSearchOverlayState = (query = "") => {
  document.body.classList.toggle("home-search-has-query", isMobileSearchViewport() && String(query || "").trim().length >= 2);
};

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
  const visibleHistory = isMobileSearchViewport() ? history.slice(0, 2) : history;
  visibleHistory.forEach((item) => {
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
  if (!shouldUseSearchDropdown()) {
    closeSearchDropdown();
    return;
  }
  searchDropdown.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
  if (isMobileSearchViewport()) {
    document.body.classList.add("home-search-overlay-active");
  }
  syncSearchOverlayState(searchInput.value);
};

const closeSearchDropdown = () => {
  if (!searchDropdown || !searchInput) return;
  searchDropdown.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  activeSearchIndex = -1;
  document.body.classList.remove("home-search-overlay-active");
  document.body.classList.remove("home-search-has-query");
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

const getTagSearchValue = (value) => String(value || "").replace(/^#/, "").trim();
const goToAdDetails = () => {
  const nextUrl = new URL("detalhe-anuncio.html", window.location.href);

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
    if (!shouldUseSearchDropdown()) {
      closeSearchDropdown();
      return;
    }

    const query = searchInput.value.trim();
    renderSearchHistory();
    renderSearchSuggestions(query);
    syncSearchOverlayState(query);

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
    if (!shouldUseSearchDropdown()) return;
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
    if (!shouldUseSearchDropdown()) return;
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

document.addEventListener("click", (event) => {
  const tag = event.target.closest(".service-card__tags span");
  if (!tag) return;

  event.preventDefault();
  goToSearchResults(getTagSearchValue(tag.textContent));
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

window.addEventListener("resize", () => {
  if (!isMobileSearchViewport()) {
    document.body.classList.remove("home-search-overlay-active");
    document.body.classList.remove("home-search-has-query");
  } else if (!searchDropdown.hidden) {
    document.body.classList.add("home-search-overlay-active");
    syncSearchOverlayState(searchInput?.value || "");
  }
}, { signal });

if (searchClearButton) {
  searchClearButton.addEventListener("click", () => {
    saveSearchHistory([]);
    renderSearchHistory();
  });
}

const enhanceHomeSelects = () => {
  uiSelectApi?.enhanceAll(document);
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
  uiSelectApi?.refresh(select);
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
    uiSelectApi?.refresh(homeCitySelect);
  }

  const selectedCity = homeCitySelect?.value || "";
  const neighborhoods = selectedCity ? (locationOptions.neighborhoodsByCity[selectedCity] || []) : [];
  fillSelectOptions(homeNeighborhoodSelect, neighborhoods, "Qualquer bairro");

  if ((source === "state" || source === "city") && homeNeighborhoodSelect) {
    homeNeighborhoodSelect.value = "";
    uiSelectApi?.refresh(homeNeighborhoodSelect);
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

const mountMoreFiltersPanel = (source = "tabs") => {
  if (!moreFiltersPanel) return;
  const nextHost = source === "search-dropdown" ? moreFiltersSearchHost : moreFiltersTabsHost;
  if (nextHost && moreFiltersPanel.parentElement !== nextHost) {
    nextHost.appendChild(moreFiltersPanel);
  }
};

const openMoreFilters = (source = "tabs") => {
  if (!moreFiltersToggles.length || !moreFiltersPanel) return;
  mountMoreFiltersPanel(source);
  if (source === "search-dropdown") {
    closeSearchDropdown();
    moreFiltersSearchHost?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  moreFiltersPanel.hidden = false;
  moreFiltersToggles.forEach((toggle) => {
    const sameSource = (toggle.dataset.moreFiltersSource || "tabs") === source;
    toggle.setAttribute("aria-expanded", sameSource ? "true" : "false");
    toggle.classList.toggle("is-active", sameSource);
  });
};

const closeMoreFilters = () => {
  if (!moreFiltersToggles.length || !moreFiltersPanel) return;
  moreFiltersPanel.hidden = true;
  mountMoreFiltersPanel("tabs");
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
      const source = toggle.dataset.moreFiltersSource || "tabs";
      if (isOpen) {
        closeMoreFilters();
        return;
      }
      openMoreFilters(source);
    });
  });

  moreFiltersClose?.addEventListener("click", closeMoreFilters);
  moreFiltersApply?.addEventListener("click", closeMoreFilters);

  leadingHeroFiltersButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const isOpen = leadingHeroFiltersButton.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMoreFilters();
      return;
    }
    openMoreFilters("hero-field");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMoreFilters();
    }

    if (event.key === "Escape" && uiModal && !uiModal.hidden) {
      closeUiModal({ confirmed: false });
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

const closeOrderFeedback = () => {
  if (!orderFeedback) return;
  orderFeedback.hidden = true;
  document.body.classList.remove("order-feedback-active");
  if (orderFeedbackLoading) orderFeedbackLoading.hidden = true;
  if (orderFeedbackSuccess) orderFeedbackSuccess.hidden = true;
};

const openOrderFeedback = (payload) => {
  if (!orderFeedback || !payload) return;
  if (orderFeedbackProvider) orderFeedbackProvider.textContent = payload.provider || "Profissional";
  if (orderFeedbackLocation) orderFeedbackLocation.textContent = payload.locationTitle || payload.location || "Endereco salvo";
  if (orderFeedbackUrgency) orderFeedbackUrgency.textContent = payload.urgency || "Sem pressa";

  orderFeedback.hidden = false;
  document.body.classList.add("order-feedback-active");
  if (orderFeedbackSuccess) orderFeedbackSuccess.hidden = true;
  if (orderFeedbackLoading) orderFeedbackLoading.hidden = false;

  window.setTimeout(() => {
    if (orderFeedbackLoading) orderFeedbackLoading.hidden = true;
    if (orderFeedbackSuccess) orderFeedbackSuccess.hidden = false;
  }, 1250);
};

orderFeedbackClose?.addEventListener("click", closeOrderFeedback);

try {
  const shouldShowOrderFeedback = new URLSearchParams(window.location.search).get("quote") === "sent";
  const storedOrderFeedback = window.sessionStorage.getItem("doke.quoteOverlay");
  if (shouldShowOrderFeedback && storedOrderFeedback) {
    const payload = JSON.parse(storedOrderFeedback);
    window.sessionStorage.removeItem("doke.quoteOverlay");
    openOrderFeedback(payload);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("quote");
    window.history.replaceState({}, "", nextUrl.toString());
  }
} catch {}

};

window.DokeInitHome();
