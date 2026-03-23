/* Global shell interactions: sidebar, theme, auth avatar/profile menu and internal routing. */
const body = document.body;
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";
const SHELL_STATE_CLASSES = ["sidebar-collapsed", "sidebar-open", "theme-dark", "mobile-search-active"];
const INTERNAL_VIEW_PATHS = new Set(["/index.html", "/resultados.html", "/detalhe-anuncio.html", "/orcamento.html", "/orcamento-sucesso.html", "/pedidos.html", "/dashboard.html", "/"]);

if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true") {
  body.classList.add("sidebar-collapsed");
}

if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
  body.classList.add("theme-dark");
}

const authService = window.DokeAuth || null;

const getCurrentPath = (value = window.location.pathname) => {
  const url = new URL(value, window.location.origin);
  return url.pathname === "/" ? "/index.html" : url.pathname;
};

const isInternalViewUrl = (href) => {
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && INTERNAL_VIEW_PATHS.has(getCurrentPath(url.href));
  } catch {
    return false;
  }
};

const updateSidebarActiveState = () => {
  const path = getCurrentPath();
  const homeActive = path === "/index.html";
  const ordersActive = path === "/pedidos.html";

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => link.classList.remove("is-active"));
  document.querySelector(".nav-link--home")?.classList.toggle("is-active", homeActive);
  document.querySelector(".nav-link--orders")?.classList.toggle("is-active", ordersActive);
};

const syncAuthUi = () => {
  if (!authService) return;

  const avatar = document.querySelector(".avatar");
  const profileHandle = document.querySelector(".profile-dropdown__header");
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
};


const syncHeaderLocation = () => {
  const key = "doke.defaultServiceLocation";
  let value = "Adicionar endereço";
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      value = data?.titulo || data?.rua || value;
    }
  } catch {}
  document.querySelectorAll("[data-topbar-location-value]").forEach((node) => {
    node.textContent = value;
  });
};

const closeProfileMenu = () => {
  const profileMenu = document.querySelector("[data-profile-menu]");
  const profileMenuToggle = document.querySelector("[data-profile-menu-toggle]");
  if (!profileMenu || !profileMenuToggle) return;
  profileMenu.hidden = true;
  profileMenuToggle.setAttribute("aria-expanded", "false");
};

const closeMobileSearch = () => {
  body.classList.remove("mobile-search-active");
};

const navigateToSearchResults = (value) => {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return;

  const nextUrl = new URL("resultados.html", window.location.href);
  nextUrl.searchParams.set("q", cleanValue);

  if (window.DokeNavigate) {
    window.DokeNavigate(nextUrl.toString());
  } else {
    window.location.href = nextUrl.toString();
  }
};

const syncTopbarScrollState = () => {
  document.querySelector(".topbar")?.classList.toggle("is-scrolled", window.scrollY > 18);
};


const syncStylesFromDocument = (nextDoc) => {
  const currentHead = document.head;
  const existing = new Set([...currentHead.querySelectorAll('link[rel="stylesheet"]')].map((node) => new URL(node.href, window.location.href).href));
  nextDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const absolute = new URL(href, window.location.href).href;
    if (existing.has(absolute)) return;
    const clone = document.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = href;
    clone.setAttribute('data-doke-dynamic-style', 'true');
    currentHead.appendChild(clone);
    existing.add(absolute);
  });
};

const ensureScriptsFromDocument = async (nextDoc) => {
  const existing = new Set([...document.querySelectorAll('script[src]')].map((node) => new URL(node.src, window.location.href).href));
  const scripts = [...nextDoc.querySelectorAll('script[src]')]
    .map((node) => node.getAttribute('src'))
    .filter(Boolean)
    .filter((src) => !/assets\/js\/core\/app\.js$/i.test(src));

  for (const src of scripts) {
    const absolute = new URL(src, window.location.href).href;
    if (existing.has(absolute)) continue;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
      document.body.appendChild(script);
      existing.add(absolute);
    });
  }
};

const syncStandaloneUiFromDocument = (nextDoc) => {
  const currentModal = document.querySelector(".ui-modal");
  const nextModal = nextDoc.querySelector(".ui-modal");

  if (currentModal && !nextModal) {
    currentModal.remove();
    return;
  }

  if (!currentModal && nextModal) {
    document.body.appendChild(nextModal.cloneNode(true));
    return;
  }

  if (currentModal && nextModal) {
    currentModal.replaceWith(nextModal.cloneNode(true));
  }
};

const syncBodyClassesFromDocument = (nextDoc) => {
  const preserved = SHELL_STATE_CLASSES.filter((className) => body.classList.contains(className));
  body.className = "";
  nextDoc.body.classList.forEach((className) => {
    if (!SHELL_STATE_CLASSES.includes(className)) {
      body.classList.add(className);
    }
  });
  preserved.forEach((className) => body.classList.add(className));
};

const initializeCurrentView = () => {
  updateSidebarActiveState();
  syncAuthUi();
  syncTopbarScrollState();
  syncHeaderLocation();
  window.DokeInitHome?.();
  window.DokeInitSearchResults?.();
  window.DokeInitBudget?.();
};

const swapView = async (href, { replace = false, preserveScroll = false } = {}) => {
  const url = new URL(href, window.location.href);
  const response = await fetch(url.pathname + url.search, {
    headers: { "X-Requested-With": "doke-shell" }
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url.pathname}`);
  }

  const html = await response.text();
  const parser = new DOMParser();
  const nextDoc = parser.parseFromString(html, "text/html");
  const nextMain = nextDoc.querySelector(".page__content");
  const currentMain = document.querySelector(".page__content");

  if (!nextMain || !currentMain) {
    window.location.href = url.toString();
    return;
  }

  syncBodyClassesFromDocument(nextDoc);
  syncStylesFromDocument(nextDoc);
  await ensureScriptsFromDocument(nextDoc);
  syncStandaloneUiFromDocument(nextDoc);
  currentMain.replaceWith(nextMain.cloneNode(true));
  document.title = nextDoc.title || document.title;
  closeProfileMenu();
  closeMobileSearch();

  if (replace) {
    window.history.replaceState({ href: url.toString() }, "", url.toString());
  } else {
    window.history.pushState({ href: url.toString() }, "", url.toString());
  }

  if (!preserveScroll) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  initializeCurrentView();
};

window.DokeNavigate = async (href, options) => {
  if (!isInternalViewUrl(href)) {
    window.location.href = href;
    return;
  }

  try {
    await swapView(href, options);
  } catch (error) {
    console.error(error);
    window.location.href = href;
  }
};

document.addEventListener("submit", (event) => {
  const searchForm = event.target.closest("[data-global-topbar-search]");
  if (!searchForm) return;

  const searchInput = searchForm.querySelector('input[type="search"], input[type="text"]');
  const query = searchInput?.value || "";
  if (!String(query).trim()) return;

  event.preventDefault();
  closeMobileSearch();
  navigateToSearchResults(query);
});

document.addEventListener("keydown", (event) => {
  const activeInput = event.target.closest('[data-global-topbar-search] input[type="search"], [data-global-topbar-search] input[type="text"]');
  if (!activeInput || event.key !== "Enter") return;

  const query = activeInput.value || "";
  if (!String(query).trim()) return;

  event.preventDefault();
  closeMobileSearch();
  navigateToSearchResults(query);
});

document.addEventListener("click", (event) => {
  const submitButton = event.target.closest("[data-global-topbar-submit]");
  if (submitButton) {
    const searchForm = submitButton.closest("[data-global-topbar-search]");
    const searchInput = searchForm?.querySelector('input[type="search"], input[type="text"]');
    const query = searchInput?.value || "";

    if (String(query).trim()) {
      event.preventDefault();
      closeMobileSearch();
      navigateToSearchResults(query);
      return;
    }
  }

  const locationTrigger = event.target.closest("[data-location-trigger]");
  if (locationTrigger) {
    event.preventDefault();
    const modalButton = document.querySelector("[data-address-open]");
    modalButton?.click();
    return;
  }

  const cta = event.target.closest(".service-card__cta");
  if (cta) {
    event.preventDefault();
    window.DokeNavigate?.("detalhe-anuncio.html");
    return;
  }

  const link = event.target.closest("a[href]");
  if (!link) return;
  if (link.target && link.target !== "_self") return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!isInternalViewUrl(link.href)) return;

  event.preventDefault();
  window.DokeNavigate(link.href);
});

window.addEventListener("popstate", () => {
  swapView(window.location.href, { replace: true, preserveScroll: true }).catch((error) => {
    console.error(error);
    window.location.reload();
  });
});

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-sidebar-toggle]");
  if (toggleButton) {
    body.classList.toggle("sidebar-open");
    return;
  }

  const collapseButton = event.target.closest("[data-sidebar-collapse]");
  if (collapseButton) {
    body.classList.toggle("sidebar-collapsed");
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      body.classList.contains("sidebar-collapsed") ? "true" : "false"
    );
    return;
  }

  if (event.target.closest("[data-sidebar-scrim]")) {
    body.classList.remove("sidebar-open");
    return;
  }

  const themeToggleButton = event.target.closest("[data-theme-toggle]");
  if (themeToggleButton) {
    body.classList.toggle("theme-dark");
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      body.classList.contains("theme-dark") ? "dark" : "light"
    );
    return;
  }

  const profileMenuToggle = event.target.closest("[data-profile-menu-toggle]");
  const profileMenu = document.querySelector("[data-profile-menu]");
  if (profileMenuToggle && profileMenu) {
    event.stopPropagation();
    const isOpen = profileMenu.hidden === false;
    profileMenu.hidden = isOpen;
    profileMenuToggle.setAttribute("aria-expanded", isOpen ? "false" : "true");
    return;
  }

  if (event.target.closest("[data-profile-menu]")) {
    event.stopPropagation();
    return;
  }

  closeProfileMenu();

  const sidebarLogoutButton = document.querySelector("[data-sidebar-logout]");
  if (event.target.closest("[data-profile-logout]") && sidebarLogoutButton) {
    sidebarLogoutButton.click();
    return;
  }

  if (event.target.closest("[data-mobile-search-open]")) {
    body.classList.add("mobile-search-active");
    window.setTimeout(() => {
      document.querySelector(".topbar-search input")?.focus();
    }, 0);
    return;
  }

  if (event.target.closest("[data-mobile-search-close]")) {
    closeMobileSearch();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    body.classList.remove("sidebar-open");
  }

  if (window.innerWidth > 760) {
    closeMobileSearch();
  }
});

window.addEventListener("scroll", syncTopbarScrollState, { passive: true });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProfileMenu();
    closeMobileSearch();
  }
});

initializeCurrentView();
