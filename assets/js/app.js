const body = document.body;
const toggleButton = document.querySelector("[data-sidebar-toggle]");
const collapseButton = document.querySelector("[data-sidebar-collapse]");
const scrim = document.querySelector("[data-sidebar-scrim]");
const themeToggleButtons = document.querySelectorAll("[data-theme-toggle]");
const sidebarLogoutButton = document.querySelector("[data-sidebar-logout]");
const profileMenuToggle = document.querySelector("[data-profile-menu-toggle]");
const profileMenu = document.querySelector("[data-profile-menu]");
const profileLogoutButton = document.querySelector("[data-profile-logout]");
const searchBox = document.querySelector("[data-searchbox]");
const searchInput = document.querySelector("[data-search-input]");
const searchDropdown = document.querySelector("[data-search-dropdown]");
const searchRecommendationList = document.querySelector("[data-search-recommendation-list]");
const searchHistoryList = document.querySelector("[data-search-history-list]");
const searchResultsList = document.querySelector("[data-search-results-list]");
const searchResultsSection = document.querySelector("[data-search-results-section]");
const searchHistorySection = document.querySelector("[data-search-history-section]");
const searchClearButton = document.querySelector("[data-search-clear]");
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";
const SEARCH_HISTORY_STORAGE_KEY = "doke.search.history";

if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
  body.classList.add("sidebar-collapsed");
}

const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
if (savedTheme === "dark") {
  body.classList.add("theme-dark");
}


if (toggleButton) {
  toggleButton.addEventListener("click", () => {
    body.classList.toggle("sidebar-open");
  });
}

if (collapseButton) {
  collapseButton.addEventListener("click", () => {
    body.classList.toggle("sidebar-collapsed");
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      body.classList.contains("sidebar-collapsed") ? "true" : "false"
    );
  });
}

if (scrim) {
  scrim.addEventListener("click", () => {
    body.classList.remove("sidebar-open");
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    body.classList.remove("sidebar-open");
  }
});

themeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    body.classList.toggle("theme-dark");
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      body.classList.contains("theme-dark") ? "dark" : "light"
    );
  });
});


const searchRecommendations = [
  "Eletricista 24h",
  "Diarista perto de mim",
  "Marceneiro sob medida",
  "Frete pequeno"
];

const searchSuggestionPool = [
  { label: "Eletricista residencial", meta: "Instalação e reparo", badge: "Serviço", value: "eletricista residencial" },
  { label: "Encanador urgente", meta: "Vazamentos e tubulação", badge: "Serviço", value: "encanador urgente" },
  { label: "Pintor profissional", meta: "Paredes e acabamento", badge: "Serviço", value: "pintor profissional" },
  { label: "Marceneiro sob medida", meta: "Móveis planejados", badge: "Serviço", value: "marceneiro sob medida" },
  { label: "Diarista semanal", meta: "Limpeza residencial", badge: "Serviço", value: "diarista semanal" },
  { label: "Frete para mudança", meta: "Transporte local", badge: "Serviço", value: "frete para mudança" },
  { label: "Aulas de inglês", meta: "Professor particular", badge: "Categoria", value: "aulas de inglês" },
  { label: "Designer para logo", meta: "Criativo e branding", badge: "Profissional", value: "designer para logo" },
  { label: "Rua Maranhão, 343", meta: "Localização atual", badge: "Endereço", value: "Rua Maranhão, 343" }
];

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
  window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(items.slice(0, 4)));
};

const searchItemIcon = (type = "search") => {
  if (type === "history") {
    return '<svg viewBox="0 0 24 24"><path d="M12 7.5v5l3 2"></path><path d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1"></path><path d="M4.8 5.7v3.6h3.6"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>';
};

let activeSearchIndex = -1;

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
    searchHistoryList.innerHTML = "";
    return;
  }

  searchHistorySection.hidden = false;

  history.forEach((item) => {
    searchHistoryList.appendChild(createSuggestionButton({
      label: item,
      meta: "Pesquisa recente",
      badge: "Histórico",
      value: item,
      type: "history"
    }));
  });
};

const renderSearchResults = (query = "") => {
  if (!searchResultsList || !searchResultsSection) return;
  const normalizedQuery = query.trim().toLowerCase();
  searchResultsList.innerHTML = "";
  activeSearchIndex = -1;

  if (!normalizedQuery) {
    searchResultsSection.hidden = true;
    return;
  }

  const results = searchSuggestionPool
    .filter((item) => `${item.label} ${item.meta} ${item.value}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 4);

  if (!results.length) {
    searchResultsSection.hidden = true;
    searchResultsList.innerHTML = "";
    return;
  }

  results.forEach((item) => {
    searchResultsList.appendChild(createSuggestionButton(item));
  });
  searchResultsSection.hidden = false;
};

const openSearchDropdown = () => {
  if (!searchDropdown || !searchInput) return;
  searchDropdown.hidden = false;
  searchInput.setAttribute("aria-expanded", "true");
};

const closeSearchDropdown = () => {
  if (!searchDropdown || !searchInput) return;
  searchDropdown.hidden = true;
  searchInput.setAttribute("aria-expanded", "false");
  activeSearchIndex = -1;
};

const commitSearchValue = (value) => {
  if (!searchInput || !value) return;
  const cleanValue = String(value).trim();
  if (!cleanValue) return;
  searchInput.value = cleanValue;
  const history = getSearchHistory().filter((item) => item.toLowerCase() !== cleanValue.toLowerCase());
  history.unshift(cleanValue);
  saveSearchHistory(history);
  renderSearchHistory();
  renderSearchResults(cleanValue);
  closeSearchDropdown();
};

const getVisibleSearchOptions = () => {
  if (!searchDropdown || searchDropdown.hidden) return [];
  return [...searchDropdown.querySelectorAll(".search-suggestion:not([hidden])")];
};

renderRecommendationChips();
renderSearchHistory();
renderSearchResults("");

if (searchDropdown) {
  searchDropdown.hidden = true;
}

if (searchBox && searchInput && searchDropdown) {
  let searchDropdownOpenedByClick = false;

  const syncSearchDropdown = () => {
    const query = searchInput.value.trim();
    renderSearchHistory();
    renderSearchResults(query);
    openSearchDropdown();
  };

  searchInput.addEventListener("click", () => {
    searchDropdownOpenedByClick = true;
    syncSearchDropdown();
  });

  searchInput.addEventListener("focus", () => {
    if (!searchDropdownOpenedByClick) {
      closeSearchDropdown();
    }
  });

  searchInput.addEventListener("input", () => {
    if (!searchDropdownOpenedByClick) return;
    syncSearchDropdown();
  });

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
        commitSearchValue(options[activeSearchIndex].dataset.value || options[activeSearchIndex].textContent);
        return;
      }
      commitSearchValue(searchInput.value);
    }

    if (event.key === "Escape") {
      searchDropdownOpenedByClick = false;
      closeSearchDropdown();
    }
  });

  searchDropdown.addEventListener("click", (event) => {
    const suggestion = event.target.closest(".search-suggestion, .search-chip");
    if (!suggestion) return;
    commitSearchValue(suggestion.dataset.value || suggestion.textContent);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-searchbox]")) {
      searchDropdownOpenedByClick = false;
      closeSearchDropdown();
    }
  });
}

if (searchClearButton) {
  searchClearButton.addEventListener("click", () => {
    saveSearchHistory([]);
    renderSearchHistory();
  });
}


document.querySelectorAll("[data-chip-group]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    if (chip.dataset.locked === "true") return;

    if (group.dataset.mode === "single") {
      group.querySelectorAll(".chip").forEach((item) => item.classList.remove("is-active"));
      chip.classList.add("is-active");
      return;
    }

    chip.classList.toggle("is-active");
  });
});

const authService = window.DokeAuth || null;

if (authService) {
  const avatar = document.querySelector(".avatar");
  const session = authService.getSession();

  if (avatar) {
    if (session && session.user) {
      avatar.textContent = session.user.initials || "DK";
      avatar.title = session.user.email || session.user.phone || session.user.name;
    } else {
      avatar.textContent = "DK";
      avatar.title = "Conta Doke";
    }
  }

  const profileHandle = document.querySelector(".profile-dropdown__header");
  if (profileHandle) {
    if (session && session.user) {
      const sourceName = session.user.name || session.user.email || session.user.phone || "gabriel";
      const handle = String(sourceName)
        .split("@")[0]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      profileHandle.textContent = `@${handle || "gabriel"}`;
    } else {
      profileHandle.textContent = "@gabriel";
    }
  }
}


if (profileMenuToggle && profileMenu) {
  const closeProfileMenu = () => {
    profileMenu.hidden = true;
    profileMenuToggle.setAttribute("aria-expanded", "false");
  };

  const openProfileMenu = () => {
    profileMenu.hidden = false;
    profileMenuToggle.setAttribute("aria-expanded", "true");
  };

  profileMenuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (profileMenu.hidden === false) {
      closeProfileMenu();
    } else {
      openProfileMenu();
    }
  });

  profileMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".topbar-profile")) {
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfileMenu();
    }
  });
}

if (profileLogoutButton && sidebarLogoutButton) {
  profileLogoutButton.addEventListener("click", () => {
    sidebarLogoutButton.click();
  });
}
