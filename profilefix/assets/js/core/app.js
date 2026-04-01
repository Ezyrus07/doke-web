/* Global shell interactions: sidebar, theme, auth avatar/profile menu and internal routing. */
const body = document.body;
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";
const SHELL_STATE_CLASSES = ["sidebar-collapsed", "sidebar-open", "theme-dark", "mobile-search-active"];
const INTERNAL_VIEW_PATHS = new Set(["/index.html", "/resultados.html", "/detalhe-anuncio.html", "/orcamento.html", "/orcamento-sucesso.html", "/pedidos.html", "/mensagens.html", "/notificacoes.html", "/pagamento.html", "/finalizar-pedido.html", "/avaliacao.html", "/dashboard.html", "/carteira.html", "/adicionar-cartao.html", "/conta-bancaria.html", "/perfil.html", "/"]);
const MESSAGES_VIEW_PATH = "/mensagens.html";

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

const shouldBypassShellSwap = (href) => {
  const currentPath = body.dataset.currentViewPath || getCurrentPath();
  const nextPath = getCurrentPath(href);
  return currentPath === MESSAGES_VIEW_PATH || nextPath === MESSAGES_VIEW_PATH;
};

const updateSidebarActiveState = () => {
  const path = getCurrentPath();
  const homeActive = path === "/index.html";
  const ordersActive = path === "/pedidos.html";
  const messagesActive = path === "/mensagens.html" || path === "/pagamento.html" || path === "/finalizar-pedido.html" || path === "/avaliacao.html";
  const notificationsActive = path === "/notificacoes.html";
  const walletActive = path === "/carteira.html" || path === "/adicionar-cartao.html" || path === "/conta-bancaria.html";
  const profileActive = path === "/perfil.html";

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => link.classList.remove("is-active"));
  document.querySelector(".nav-link--home")?.classList.toggle("is-active", homeActive);
  document.querySelector(".nav-link--orders")?.classList.toggle("is-active", ordersActive);
  document.querySelector(".nav-link--messages")?.classList.toggle("is-active", messagesActive);
  document.querySelector(".nav-link--notifications")?.classList.toggle("is-active", notificationsActive);
  document.querySelector(".nav-link--wallet")?.classList.toggle("is-active", walletActive);
  document.querySelector(".nav-link--profile")?.classList.toggle("is-active", profileActive);
};

const ensureWalletProfileItem = () => {
  const dropdownBody = document.querySelector(".profile-dropdown__body");
  if (!dropdownBody) return;

  const hasWallet = [...dropdownBody.querySelectorAll(".profile-dropdown__item")].some((item) =>
    item.textContent?.trim().toLowerCase().includes("carteira")
  );

  if (hasWallet) return;

  const walletLink = document.createElement("a");
  walletLink.className = "profile-dropdown__item";
  walletLink.href = "carteira.html";
  walletLink.innerHTML =
    '<span class="profile-dropdown__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 8.5A2.5 2.5 0 0 1 7 6h11.5v12H7a2.5 2.5 0 1 1 0-5h12"></path><path d="M16 13h3"></path></svg></span><span>Carteira</span>';

  const firstItem = dropdownBody.querySelector(".profile-dropdown__item");
  if (firstItem) {
    firstItem.insertAdjacentElement("afterend", walletLink);
  } else {
    dropdownBody.appendChild(walletLink);
  }
};

const syncAuthUi = () => {
  ensureWalletProfileItem();
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

const usesPageSearchOnlyMobile = () =>
  window.innerWidth <= 767 &&
  ["/pedidos.html", "/mensagens.html", "/notificacoes.html"].includes(getCurrentPath());

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


const BASE_SHELL_STYLE_PATTERNS = [
  /assets\/css\/core\/tokens\.css$/i,
  /assets\/css\/core\/base\.css$/i,
  /assets\/css\/core\/layout\.css$/i,
  /assets\/css\/core\/components\.css$/i
];

const INTERNAL_VIEW_STYLE_HINTS = {
  "/index.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/search-results.css"
  ],
  "/resultados.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/search-results.css"
  ],
  "/pedidos.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pedidos.css"
  ],
  "/mensagens.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/mensagens.css"
  ],
  "/notificacoes.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pedidos.css",
    "assets/css/pages/notificacoes.css"
  ],
  "/pagamento.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pagamento.css"
  ],
  "/finalizar-pedido.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pagamento.css"
  ],
  "/avaliacao.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pagamento.css"
  ],
  "/carteira.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/carteira.css"
  ],
  "/perfil.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/perfil.css"
  ],
  "/adicionar-cartao.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/carteira.css"
  ],
  "/conta-bancaria.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/carteira.css"
  ],
  "/dashboard.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/dashboard.css"
  ],
  "/detalhe-anuncio.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/detalhe-anuncio.css"
  ]
};

const preloadedStyleHrefs = new Set();

const hintInternalViewStyles = (href) => {
  const path = getCurrentPath(href);
  const hints = INTERNAL_VIEW_STYLE_HINTS[path] || [];

  hints.forEach((styleHref) => {
    const absolute = new URL(styleHref, window.location.href).href;
    if (preloadedStyleHrefs.has(absolute)) return;
    if (document.querySelector(`link[rel="preload"][as="style"][href="${styleHref}"]`)) {
      preloadedStyleHrefs.add(absolute);
      return;
    }

    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "style";
    preload.href = styleHref;
    preload.setAttribute("data-doke-style-hint", "true");
    preload.addEventListener("load", () => preloadedStyleHrefs.add(absolute), { once: true });
    preload.addEventListener("error", () => preloadedStyleHrefs.delete(absolute), { once: true });
    document.head.appendChild(preload);
    preloadedStyleHrefs.add(absolute);
  });
};

const syncStylesFromDocument = async (nextDoc) => {
  const currentHead = document.head;
  const existing = new Set(
    [...currentHead.querySelectorAll('link[rel="stylesheet"]')].map((node) => new URL(node.href, window.location.href).href)
  );

  const pending = [];

  nextDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const absolute = new URL(href, window.location.href).href;
    if (BASE_SHELL_STYLE_PATTERNS.some((pattern) => pattern.test(absolute))) {
      return;
    }
    if (existing.has(absolute)) return;

    const clone = document.createElement('link');
    clone.rel = 'stylesheet';
    clone.href = href;
    clone.setAttribute('data-doke-dynamic-style', 'true');

    const loaded = new Promise((resolve) => {
      clone.addEventListener('load', resolve, { once: true });
      clone.addEventListener('error', resolve, { once: true });
    });

    currentHead.appendChild(clone);
    existing.add(absolute);
    pending.push(loaded);
  });

  if (pending.length) {
    await Promise.all(pending);
  }
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

const syncShellFromDocument = (nextDoc) => {
  // Keep shell chrome stable across internal navigations to avoid
  // sidebar/header flicker, logo reload, and mobile-search jank.
  const currentScrim = document.querySelector('.mobile-scrim');
  const nextScrim = nextDoc.querySelector('.mobile-scrim');
  const currentTopbarRight = document.querySelector('.topbar__right');
  const nextTopbarRight = nextDoc.querySelector('.topbar__right');

  if (!currentScrim && nextScrim) {
    document.body.appendChild(nextScrim.cloneNode(true));
  }

  // The profile dropdown lives inside the stable shell header. Without
  // syncing this region, internal navigations keep showing stale menu
  // content until a full refresh.
  if (currentTopbarRight && nextTopbarRight) {
    currentTopbarRight.replaceWith(nextTopbarRight.cloneNode(true));
  }
};


const cleanupDynamicStyles = (nextDoc) => {
  const nextStyles = new Set(
    [...nextDoc.querySelectorAll('link[rel="stylesheet"]')]
      .map((node) => node.getAttribute("href"))
      .filter(Boolean)
      .map((href) => new URL(href, window.location.href).href)
  );

  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    const absolute = new URL(node.href, window.location.href).href;
    if (BASE_SHELL_STYLE_PATTERNS.some((pattern) => pattern.test(absolute))) return;
    if (!nextStyles.has(absolute)) {
      node.remove();
    }
  });
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


const initChipRails = () => {
  document.querySelectorAll('[data-chip-arrow]').forEach((button) => {
    if (button.dataset.boundChipArrow === 'true') return;
    button.dataset.boundChipArrow = 'true';
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-chip-target');
      const track = targetId ? document.getElementById(targetId) : null;
      if (!track) return;
      const direction = button.getAttribute('data-chip-arrow') === 'next' ? 1 : -1;
      const amount = Math.max(180, track.clientWidth * 0.55);
      track.scrollBy({ left: amount * direction, behavior: 'smooth' });
    });
  });
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
  body.dataset.currentViewPath = getCurrentPath();
  updateSidebarActiveState();
  syncAuthUi();
  syncTopbarScrollState();
  syncHeaderLocation();
  if (usesPageSearchOnlyMobile()) {
    closeMobileSearch();
  }
  window.DokeInitHome?.();
  window.DokeInitSearchResults?.();
  window.DokeInitDetailPage?.();
  window.DokeInitBudget?.();
  window.DokeInitOrders?.();
  window.DokeInitMessages?.();
  window.DokeInitPayment?.();
  window.DokeInitOrderFinalize?.();
  window.DokeInitReview?.();
  window.DokeInitNotifications?.();
  window.DokeInitWallet?.();
  initChipRails();
};

const swapView = async (href, { replace = false, preserveScroll = false } = {}) => {
  const url = new URL(href, window.location.href);
  hintInternalViewStyles(url.toString());

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

  await syncStylesFromDocument(nextDoc);
  await ensureScriptsFromDocument(nextDoc);

  body.classList.add("is-shell-swapping");
  syncBodyClassesFromDocument(nextDoc);
  syncShellFromDocument(nextDoc);
  syncStandaloneUiFromDocument(nextDoc);
  currentMain.replaceWith(nextMain.cloneNode(true));
  cleanupDynamicStyles(nextDoc);
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
  requestAnimationFrame(() => body.classList.remove("is-shell-swapping"));
};

window.DokeNavigate = async (href, options = {}) => {
  if (!isInternalViewUrl(href) || shouldBypassShellSwap(href)) {
    if (options.replace) {
      window.location.replace(href);
    } else {
      window.location.href = href;
    }
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

document.addEventListener("pointerenter", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href)) return;
  hintInternalViewStyles(link.href);
}, true);

document.addEventListener("focusin", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href)) return;
  hintInternalViewStyles(link.href);
});

document.addEventListener("touchstart", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href)) return;
  hintInternalViewStyles(link.href);
}, { passive: true });

hintInternalViewStyles(window.location.href);

window.addEventListener("popstate", () => {
  if (shouldBypassShellSwap(window.location.href)) {
    window.location.reload();
    return;
  }

  swapView(window.location.href, { replace: true, preserveScroll: true }).catch((error) => {
    console.error(error);
    window.location.reload();
  });
});

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-sidebar-toggle]");
  if (toggleButton) {
    if (!body.classList.contains("sidebar-open")) { closeMobileSearch(); }
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
    if (usesPageSearchOnlyMobile()) {
      closeMobileSearch();
      return;
    }
    body.classList.remove("sidebar-open");
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
