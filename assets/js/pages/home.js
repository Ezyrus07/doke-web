window.DokeInitHome = function DokeInitHome() {
const routeController = new AbortController();
window.DokeHomeCleanup?.();
window.DokeHomeCleanup = () => {
  document.body.classList.remove("home-search-overlay-active");
  document.body.classList.remove("home-search-has-query");
  document.body.classList.remove("home-mobile-filters-open");
  document.body.classList.remove("mobile-home-drawer-open");
  document.body.classList.remove("worker-preview-open");
  document.body.classList.remove("before-after-preview-open");
  routeController.abort();
};
const { signal } = routeController;
/* Home page interactions: filters, location, tabs and rails. */
const searchData = window.DokeSearchData || {};
const locationOptions = searchData.locationOptions || { statés: [], citiesByStaté: {}, neighborhoodsByCity: {}, cepLookup: {} };
const moreFiltersToggles = document.querySelectorAll("[data-more-filters-toggle]");
const moreFiltersPanel = document.querySelector("[data-more-filters-panel]");
const moreFiltersCloseButtons = document.querySelectorAll("[data-more-filters-close]");
const moreFiltersApply = document.querySelector("[data-more-filters-apply]");
const moreFiltersTabsHost = document.querySelector("[data-more-filters-tabs-host]");
const moreFiltersSearchHost = document.querySelector("[data-more-filters-search-host]");
const moreFiltersNavButtons = document.querySelectorAll("[data-more-filters-nav]");
const moreFiltersSections = document.querySelectorAll("[data-more-filters-section]");
const mobileMoreFiltersMedia = window.matchMedia("(max-width: 760px)");
const leadingHeroFiltersButton = document.querySelector(".home-search-hero__leading-filter");
const homeStatéSelect = document.querySelector("[data-home-staté-select]");
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
const catégoryTrack = document.querySelector("[data-catégory-track]");
const catégoryArrows = document.querySelectorAll("[data-catégory-arrow]");
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

const initMobileHomeDrawer = window.DokeHomeDrawer?.create({ signal }) || (() => {});
const initHomeSearch = window.DokeHomeSearch?.create({ signal }) || (() => {});
const initHomeBeforeAfter = window.DokeHomeBeforeAfter?.create({ signal }) || (() => {});
const initHomeWorkers = window.DokeHomeWorkers?.create({ signal }) || (() => {});


const sideMeta = document.querySelector(".home-side-meta");
const sideMetaSearchButton = document.querySelector(".home-side-meta__search");
const sideMetaSearchInput = document.querySelector(".home-side-meta__search-input");
const homeProfileMenuToggle = document.querySelector("[data-home-profile-menu-toggle]");
const homeAccountMenuToggle = document.querySelector("[data-home-account-menu-toggle]");
const homeProfileMenu = document.querySelector("[data-home-profile-menu]");
const homeAccountMenu = document.querySelector("[data-home-account-menu]");
const desktopLocationTrigger = document.querySelector(".home-side-meta__location");
const locationTriggers = [
  ...document.querySelectorAll(".home-side-meta__location, .mobile-header-location[data-location-trigger], .home-mobile-hero__location[data-location-trigger]")
].filter(Boolean);
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
let lockedLocationAnchor = null;

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
  lockedLocationAnchor = activeLocationTrigger ? {
    node: activeLocationTrigger,
    top: activeLocationTrigger.getBoundingClientRect().top
  } : null;
  document.body.style.top = `-${lockedLocationScrollY}px`;
  document.body.classList.add("home-address-modal-open");
};

const unlockAddressViewport = () => {
  const top = document.body.style.top;
  document.body.classList.remove("home-address-modal-open");
  document.body.style.top = "";
  const nextScrollY = top ? Math.abs(parseInt(top, 10)) || lockedLocationScrollY : lockedLocationScrollY;
  const restore = () => window.scrollTo({ top: nextScrollY, behavior: "auto" });
  const restoreAnchor = () => {
    if (!lockedLocationAnchor?.node?.isConnected) return;
    const currentTop = lockedLocationAnchor.node.getBoundingClientRect().top;
    window.scrollTo({ top: Math.max(0, window.scrollY + currentTop - lockedLocationAnchor.top), behavior: "auto" });
  };
  restore();
  window.requestAnimationFrame(restore);
  window.setTimeout(restore, 50);
  window.setTimeout(() => {
    restore();
    restoreAnchor();
  }, 180);
  window.setTimeout(() => {
    restoreAnchor();
    lockedLocationAnchor = null;
  }, 420);
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

const activatéLocationById = (locationId) => {
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
  activatéLocationById(locationOption.dataset.locationId || "");
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

const syncHomeLocationSelects = (source = "staté") => {
  const selectedStaté = homeStatéSelect?.value || "";
  const cities = selectedStaté ? (locationOptions.citiesByStaté[selectedStaté] || []) : [];
  fillSelectOptions(homeCitySelect, cities, "Qualquer cidade");

  if (source === "staté" && homeCitySelect) {
    homeCitySelect.value = "";
    uiSelectApi?.refresh(homeCitySelect);
  }

  const selectedCity = homeCitySelect?.value || "";
  const neighborhoods = selectedCity ? (locationOptions.neighborhoodsByCity[selectedCity] || []) : [];
  fillSelectOptions(homeNeighborhoodSelect, neighborhoods, "Qualquer bairro");

  if ((source === "staté" || source === "city") && homeNeighborhoodSelect) {
    homeNeighborhoodSelect.value = "";
    uiSelectApi?.refresh(homeNeighborhoodSelect);
  }
};

const bootstrapHomeLocationSelects = () => {
  fillSelectOptions(homeStatéSelect, locationOptions.statés || [], "Qualquer estado");
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
    staté: data.uf || "",
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
  ensureSelectValue(homeStatéSelect, cepData.staté);
  fillSelectOptions(homeCitySelect, locationOptions.citiesByStaté[cepData.staté] || [], "Qualquer cidade");
  ensureSelectValue(homeCitySelect, cepData.city);
  fillSelectOptions(homeNeighborhoodSelect, locationOptions.neighborhoodsByCity[cepData.city] || [], "Qualquer bairro");
  ensureSelectValue(homeNeighborhoodSelect, cepData.neighborhood);
};

enhanceHomeSelects();
bootstrapHomeLocationSelects();

homeStatéSelect?.addEventListener("change", () => {
  syncHomeLocationSelects("staté");
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

document.querySelectorAll(".mini-tabs").forEach((group) => {
  group.addEventListener("click", (event) => {
    const tab = event.target.closest(".mini-tab");
    if (!tab) return;

    group.querySelectorAll(".mini-tab").forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });

    tab.classList.add("is-active");
    tab.setAttribute("aria-pressed", "true");
  }, { signal });
});

document.querySelectorAll(".search-dropdown__refine-chips").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest(".search-refine-chip");
    if (!chip) return;
    chip.classList.toggle("is-active");
    chip.setAttribute("aria-pressed", chip.classList.contains("is-active") ? "true" : "false");
  }, { signal });
});

document.querySelectorAll(".service-card__favorite").forEach((button) => {
  button.setAttribute("aria-pressed", "false");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const isActive = button.classList.toggle("is-active");
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.setAttribute("aria-label", isActive ? "Remover anúncio dos salvos" : "Salvar anúncio");
  }, { signal });
});

const homeFiltersApi = window.DokeHomeFilters?.create({
  signal,
  toggles: moreFiltersToggles,
  panel: moreFiltersPanel,
  closeButtons: moreFiltersCloseButtons,
  applyButton: moreFiltersApply,
  tabsHost: moreFiltersTabsHost,
  searchHost: moreFiltersSearchHost,
  navButtons: moreFiltersNavButtons,
  sections: moreFiltersSections,
  mobileMedia: mobileMoreFiltersMedia,
  leadingButton: leadingHeroFiltersButton
}) || {
  open: () => {},
  close: () => {},
  setSection: () => {},
  mountPanel: () => {}
};

const setMoreFiltersSection = homeFiltersApi.setSection;
const mountMoreFiltersPanel = homeFiltersApi.mountPanel;
const openMoreFilters = (source = "tabs") => {
  if (source === "search-dropdown" || source === "hero-field") {
    document.dispatchEvent(new CustomEvent("doke:home-search-close"));
  }
  homeFiltersApi.open(source);
};
const closeMoreFilters = homeFiltersApi.close;

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && uiModal && !uiModal.hidden) {
    closeUiModal({ confirmed: false });
  }

  if (event.key === "Enter" && uiModal && !uiModal.hidden && document.activeElement === uiModalInput) {
    event.preventDefault();
    closeUiModal({ confirmed: true, value: uiModalInput?.value || "" });
  }
}, { signal });

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
  track: catégoryTrack,
  arrows: catégoryArrows,
  directionAttr: "catégoryArrow",
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

initMobileHomeDrawer();
initHomeSearch();
initHomeWorkers();

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
