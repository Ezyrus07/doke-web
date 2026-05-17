/* Global shell interactions: sidebar, theme, auth avatar/profile menu and internal routing. */
const body = document.body;
try {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
} catch {}

const ensureInstantRouteStyle = () => {
  if (document.getElementById("doke-instant-route-style")) return;
  const style = document.createElement("style");
  style.id = "doke-instant-route-style";
  style.textContent = `
    body.is-shell-swapping :is(
      .page,
      .page *,
      .topbar,
      .topbar *,
      .home-side-meta,
      .home-side-meta *,
      .page__content,
      .page__content *,
      .orders-page,
      .orders-page *,
      .notifications-page,
      .notifications-page *,
      .communities-page,
      .communities-page *
    ),
    body.is-route-instant-swap :is(
      .page,
      .page *,
      .topbar,
      .topbar *,
      .home-side-meta,
      .home-side-meta *,
      .page__content,
      .page__content *,
      .orders-page,
      .orders-page *,
      .notifications-page,
      .notifications-page *,
      .communities-page,
      .communities-page *
    ) {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
      animation-delay: 0ms !important;
      scroll-behavior: auto !important;
    }

    body.is-shell-swapping {
      cursor: progress;
    }
  `;
  document.head.appendChild(style);
};
ensureInstantRouteStyle();
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const SIDEBAR_COLLAPSED_HTML_CLASS = "doke-sidebar-collapsed";
const SIDEBAR_EXPANDED_HTML_CLASS = "doke-sidebar-expanded";
const SIDEBAR_STATE_READY_HTML_CLASS = "doke-shell-state-ready";
const THEME_STORAGE_KEY = "doke.theme";
const LEGACY_HOME_WIDTH_VARS = [
  "--doke-home-desktop-gutter",
  "--doke-home-desktop-workspace",
  "--home-desktop-content-width",
];
const SHELL_STATE_CLASSES = ["sidebar-collapsed", "sidebar-open", "theme-dark", "mobile-search-active"];
const ROUTE_SWAP_STATE_CLASSES = ["is-shell-swapping", "is-route-instant-swap"];
const PRESERVED_BODY_STATE_CLASSES = [...SHELL_STATE_CLASSES, ...ROUTE_SWAP_STATE_CLASSES];
const INTERNAL_PROFILE_PATH = "/perfil.html";
const INTERNAL_VIEW_PATHS = new Set(["/index.html", "/resultados.html", "/detalhe-anuncio.html", "/pedidos.html", "/mensagens.html", "/notificacoes.html", "/carteira.html", "/comunidade.html", "/comunidade-interna.html", "/pagamento.html", "/finalizar-pedido.html", "/avaliacao.html", "/adicionar-cartao.html", INTERNAL_PROFILE_PATH, "/configuracoes.html", "/mais.html", "/"]);
const MESSAGES_VIEW_PATH = "/mensagens.html";
const SIDEBAR_PRIMARY_VIEWS = ["/index.html", "/pedidos.html", "/notificacoes.html", "/comunidade.html", "/comunidade-interna.html", INTERNAL_PROFILE_PATH, "/configuracoes.html"];
let sidebarViewsHinted = false;
const isMobileSidebarViewport = () => window.innerWidth <= 1024;


if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
  body.classList.add("theme-dark");
}

const readStoredSidebarCollapsed = () => {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const syncSidebarCollapsedState = () => {
  const root = document.documentElement;
  LEGACY_HOME_WIDTH_VARS.forEach((name) => root.style.removeProperty(name));
  const applySidebarWidthVars = (width) => {
    root.style.setProperty("--doke-current-sidebar-width", width);
    root.style.setProperty("--sidebar-width", width);
    root.style.setProperty("--doke-desktop-sidebar-width", width);
    root.style.setProperty("--doke-app-sidebar-width", width);
    root.style.setProperty("--doke-app-shell-sidebar-width", width);
    root.style.setProperty("--doke-home-sidebar-width", width);
  };

  if (isMobileSidebarViewport()) {
    body.classList.remove("sidebar-collapsed");
    root.classList.remove(SIDEBAR_COLLAPSED_HTML_CLASS);
    root.classList.add(SIDEBAR_EXPANDED_HTML_CLASS, SIDEBAR_STATE_READY_HTML_CLASS);
    applySidebarWidthVars("0px");
    return;
  }

  const isCollapsed = readStoredSidebarCollapsed();
  const sidebarWidth = isCollapsed ? "96px" : "272px";
  body.classList.toggle("sidebar-collapsed", isCollapsed);
  root.classList.toggle(SIDEBAR_COLLAPSED_HTML_CLASS, isCollapsed);
  root.classList.toggle(SIDEBAR_EXPANDED_HTML_CLASS, !isCollapsed);
  root.classList.add(SIDEBAR_STATE_READY_HTML_CLASS);
  applySidebarWidthVars(sidebarWidth);
};

window.addEventListener("resize", syncSidebarCollapsedState, { passive: true });
window.addEventListener("pageshow", syncSidebarCollapsedState, { passive: true });
syncSidebarCollapsedState();

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


const isInstantShellNavigationEnabled = () => {
  try {
    return window.Doke?.flags?.isEnabled?.('instantShellNavigation') === true;
  } catch {
    return false;
  }
};

const shouldBypassShellSwap = (href) => {
  try {
    if (!isInstantShellNavigationEnabled()) return true;
    const url = new URL(href, window.location.href);
    const path = getCurrentPath(url.href);

    if (url.origin !== window.location.origin) return true;
    if (!INTERNAL_VIEW_PATHS.has(path)) return true;
    if (url.hash && url.pathname === window.location.pathname && url.search === window.location.search) return true;

    // Keep highly transactional/payment subflows on native navigation until their
    // lifecycle is fully normalized. The menu and main app views still use the
    // app-shell router, which removes the heavy reload feeling in daily use.
    const nativeOnlyPaths = new Set([
      "/pagamento.html",
      "/finalizar-pedido.html",
      "/avaliacao.html",
      "/adicionar-cartao.html"
    ]);

    return nativeOnlyPaths.has(path);
  } catch {
    return true;
  }
};



const SHARED_SIDEBAR_MARKUP = `
  <button
    class="sidebar__collapse-button"
    type="button"
    data-sidebar-collapse
    aria-label="Diminuir ou expandir menu lateral"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 6.5-5 5 5 5"></path>
    </svg>
  </button>

  <div class="sidebar__brand">
    <div class="brand-logo" aria-label="Doke">
      <img src="assets/img/doke-logo-lockup.png" alt="Doke" />
    </div>
  </div>

  <div class="sidebar__group">
    <div class="sidebar__label">Principal</div>
    <a class="nav-link nav-link--home" href="index.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg></span>
        <span>Início</span>
      </span>
      <span class="nav-link__count">Base</span>
    </a>
    <a class="nav-link nav-link--orders" href="pedidos.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg></span>
        <span>Pedidos</span>
      </span>
    </a>
    <a class="nav-link nav-link--messages" href="mensagens.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg></span>
        <span>Mensagens</span>
      </span>
    </a>
    <a class="nav-link nav-link--notifications" href="notificacoes.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4.5a4.8 4.8 0 0 0-4.8 4.8v2.6c0 1.4-.4 2.7-1.2 3.8h12c-.8-1.1-1.2-2.4-1.2-3.8V9.3A4.8 4.8 0 0 0 12 4.5z"></path><path d="M9.5 18a2.5 2.5 0 0 0 5 0"></path></svg></span>
        <span>Notificações</span>
      </span>
      <span class="nav-link__count">3</span>
    </a>
    <a class="nav-link nav-link--communities" href="comunidade.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg></span>
        <span>Comunidade</span>
      </span>
    </a>
  </div>

  <div class="sidebar__group sidebar__group--account">
    <div class="sidebar__label">Conta</div>
    <a class="nav-link nav-link--profile" href="perfil.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg></span><span>Meu perfil</span></span>
    </a>
    <a class="nav-link nav-link--wallet" href="carteira.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.8" y="6.5" width="16.4" height="11" rx="2.4"></rect><path d="M6 9.5h12"></path><path d="M15.2 13.2h2"></path></svg></span><span>Carteira</span></span>
    </a>
    <a class="nav-link nav-link--settings" href="configuracoes.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg></span><span>Configurações</span></span>
    </a>
  </div>

`;

const renderSharedSidebar = () => {
  const sidebar = document.querySelector('.app-shell > .sidebar');
  if (!sidebar) return;
  if (sidebar.dataset.shellRendered === 'true') return;
  sidebar.innerHTML = SHARED_SIDEBAR_MARKUP;
  sidebar.dataset.shellRendered = 'true';
  sidebar.setAttribute('data-internal-sidebar', 'true');
};

const updateSidebarActiveState = (pathOverride = null) => {
  const path = pathOverride || getCurrentPath();
  const homeActive = path === "/index.html";
  const ordersActive = path === "/pedidos.html";
  const messagesActive = path === "/mensagens.html" || path === "/pagamento.html" || path === "/finalizar-pedido.html" || path === "/avaliacao.html";
  const notificationsActive = path === "/notificacoes.html";
  const communitiesActive = path === "/comunidade.html" || path === "/comunidade-interna.html";
  const profileActive = path === INTERNAL_PROFILE_PATH;
  const walletActive = path === "/carteira.html" || path === "/adicionar-cartao.html";
  const settingsActive = path === "/configuracoes.html" || path === "/mais.html";

  const stateMap = new Map([
    [".nav-link--home", homeActive],
    [".nav-link--orders", ordersActive],
    [".nav-link--messages", messagesActive],
    [".nav-link--notifications", notificationsActive],
    [".nav-link--communities", communitiesActive],
    [".nav-link--profile", profileActive],
    [".nav-link--wallet", walletActive],
    [".nav-link--settings", settingsActive]
  ]);

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
    link.classList.remove("is-active");
    link.removeAttribute("aria-current");
  });

  stateMap.forEach((isActive, selector) => {
    const node = document.querySelector(selector);
    if (!node) return;
    node.classList.toggle("is-active", isActive);
    if (isActive) node.setAttribute("aria-current", "page");
  });
};

const syncSettingsLinks = () => {
  document.querySelectorAll('.nav-link--settings, .nav-link--profile, .profile-dropdown__item').forEach((link) => {
    const text = (link.textContent || '').trim().toLowerCase();

    if (link.classList.contains('nav-link--settings') || text.includes('configurações')) {
      if (link.tagName === 'A') link.setAttribute('href', 'configuracoes.html');
    }

    if (link.classList.contains('nav-link--profile') || text.includes('meu perfil') || text === 'perfil') {
      if (link.tagName === 'A') link.setAttribute('href', INTERNAL_PROFILE_PATH.replace('/', ''));
    }
  });
};


const syncAuthUi = () => {
  syncSettingsLinks();
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

const closeSecondaryHeaderMenus = () => {
  const homeProfileMenu = document.querySelector("[data-home-profile-menu]");
  const homeAccountMenu = document.querySelector("[data-home-account-menu]");
  const homeProfileToggle = document.querySelector("[data-home-profile-menu-toggle]");
  const homeAccountToggle = document.querySelector("[data-home-account-menu-toggle]");

  if (homeProfileMenu) homeProfileMenu.hidden = true;
  if (homeAccountMenu) homeAccountMenu.hidden = true;
  homeProfileToggle?.setAttribute("aria-expanded", "false");
  homeAccountToggle?.setAttribute("aria-expanded", "false");
};

const toggleSecondaryHeaderMenu = (menuSelector, toggle) => {
  const menu = document.querySelector(menuSelector);
  if (!menu || !toggle) return;
  const shouldOpen = menu.hidden;
  closeSecondaryHeaderMenus();
  menu.hidden = !shouldOpen;
  toggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
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
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/results/index.css"
  ],
  "/pedidos.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/pedidos.css"
  ],
  "/mensagens.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/mensagens/message-boot.css",
    "assets/css/pages/mensagens/desktop-redesign.css",
    "assets/css/pages/mensagens.css",
    "assets/css/patterns/chat-screen-fill.css"
  ],
  "/notificacoes.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/pedidos.css",
    "assets/css/pages/notificacoes.css"
  ],
  "/carteira.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/carteira.css"
  ],
  "/comunidade.html": [
    "assets/css/pages/comunidade.css"
  ],
  "/comunidade-interna.html": [
    "assets/css/pages/comunidade-interna.css",
    "assets/css/pages/comunidade-interna/message-rebuild.css",
    "assets/css/patterns/chat-screen-fill.css"
  ],
  "/pagamento.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/pagamento.css"
  ],
  "/finalizar-pedido.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/post-service.css"
  ],
  "/avaliacao.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/post-service.css"
  ],
  "/perfil.html": [
    "assets/css/pages/perfil.css"
  ],
  "/perfil-profissional.html": [
    "assets/css/pages/perfil-profissional.css"
  ],
  "/configuracoes.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/configuracoes.css",
    "assets/js/pages/configuracoes.js"
  ],
  "/mais.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/configuracoes.css",
    "assets/js/pages/configuracoes.js"
  ],
  "/detalhe-anuncio.html": [
    "assets/css/components/actions/action-button.css",
    "assets/css/components/cards/card-system.css",
    "assets/css/components/cards/publication-card.css",
    "assets/css/components/cards/worker-media-card.css",
    "assets/css/pages/detalhe-anuncio.css"
  ]
};

const preloadedStyleHrefs = new Set();

const INTERNAL_VIEW_SCRIPT_HINTS = {
  "/index.html": [
    "assets/js/pages/search-data.js",
    "assets/js/ui/mobile-drawer.js",
    "assets/js/pages/home/filters.js",
    "assets/js/pages/home/search.js",
    "assets/js/pages/home.js"
  ],
  "/resultados.html": [
    "assets/js/pages/search-data.js",
    "assets/js/pages/results/index.js"
  ],
  "/pedidos.html": ["assets/js/pages/pedidos.js"],
  "/mensagens.html": ["assets/js/pages/mensagens.js"],
  "/notificacoes.html": ["assets/js/pages/notificacoes.js"],
  "/carteira.html": ["assets/js/pages/carteira.js"],
  "/pagamento.html": ["assets/js/pages/pagamento.js"],
  "/finalizar-pedido.html": ["assets/js/pages/finalizar-pedido.js"],
  "/avaliacao.html": ["assets/js/pages/avaliacao.js"],
  "/perfil.html": ["assets/js/pages/perfil.js"],
  "/perfil-profissional.html": ["assets/js/pages/perfil-base.js"],
  "/detalhe-anuncio.html": ["assets/js/pages/detalhe-anuncio.js"]
};

const preloadedScriptHrefs = new Set();
const prefetchedInternalViews = new Map();


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


const hintInternalViewScripts = (href) => {
  const path = getCurrentPath(href);
  const hints = INTERNAL_VIEW_SCRIPT_HINTS[path] || [];

  hints.forEach((scriptHref) => {
    const absolute = new URL(scriptHref, window.location.href).href;
    if (preloadedScriptHrefs.has(absolute)) return;

    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "script";
    preload.href = scriptHref;
    preload.setAttribute("data-doke-script-hint", "true");
    document.head.appendChild(preload);
    preloadedScriptHrefs.add(absolute);
  });
};

const prefetchInternalViewDocument = (href) => {
  try {
    const url = new URL(href, window.location.href);
    const key = url.pathname + url.search;
    if (prefetchedInternalViews.has(key)) return;

    const request = fetch(key, {
      headers: { "X-Requested-With": "doke-shell" }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha ao pré-carregar ${key}`);
        }
        return response.text();
      })
      .catch(() => null);

    prefetchedInternalViews.set(key, request);
  } catch {}
};

const warmInternalViewLink = (link) => {
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
  hintInternalViewScripts(link.href);
  prefetchInternalViewDocument(link.href);
};

const getPrimaryNavigationLinks = () =>
  document.querySelectorAll('.sidebar a[href], .bottom-nav a[href], .doke-bottom-nav a[href], [data-header-nav][href]');

const scheduleSidebarViewHints = () => {
  if (sidebarViewsHinted) return;
  sidebarViewsHinted = true;

  // Navegação de menu precisa parecer instantânea. Pré-aquecemos as telas
  // principais cedo, não apenas em hover, para evitar o clique frio.
  const warm = () => getPrimaryNavigationLinks().forEach(warmInternalViewLink);
  warm();
  window.setTimeout(warm, 350);
};

const syncStylesFromDocument = async (nextDoc) => {
  const currentHead = document.head;
  const existing = new Set(
    [...currentHead.querySelectorAll('link[rel="stylesheet"]')].map((node) => new URL(node.href, window.location.href).href)
  );

  const pending = [];
  const staged = [];

  nextDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    const absolute = new URL(href, window.location.href).href;
    if (BASE_SHELL_STYLE_PATTERNS.some((pattern) => pattern.test(absolute))) {
      return;
    }
    if (existing.has(absolute)) return;

    const clone = document.createElement('link');
    const originalMedia = link.getAttribute('media') || 'all';
    clone.rel = 'stylesheet';
    clone.href = href;
    clone.media = 'not all';
    clone.setAttribute('data-doke-dynamic-style', 'true');
    clone.setAttribute('data-doke-staged-style', 'true');
    clone.setAttribute('data-doke-original-media', originalMedia);

    const loaded = new Promise((resolve) => {
      const finish = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = window.setTimeout(finish, 1800);
      clone.addEventListener('load', finish, { once: true });
      clone.addEventListener('error', finish, { once: true });
    });

    currentHead.appendChild(clone);
    existing.add(absolute);
    staged.push(clone);
    pending.push(loaded);
  });

  if (pending.length) {
    await Promise.all(pending);
  }

  return staged;
};

const activateStagedStyles = (stagedStyles = []) => {
  stagedStyles.forEach((node) => {
    if (!node?.isConnected) return;
    node.media = node.getAttribute('data-doke-original-media') || 'all';
    node.removeAttribute('data-doke-staged-style');
    node.removeAttribute('data-doke-original-media');
  });
};

const discardStagedStyles = (stagedStyles = []) => {
  stagedStyles.forEach((node) => {
    if (node?.isConnected && node.getAttribute('data-doke-staged-style') === 'true') {
      node.remove();
    }
  });
};

const ensureScriptsFromDocument = async (nextDoc) => {
  const existing = new Set([...document.querySelectorAll('script[src]')].map((node) => new URL(node.src, window.location.href).href));
  const scripts = [...nextDoc.querySelectorAll('script[src]')]
    .map((node) => node.getAttribute('src'))
    .filter(Boolean)
    .filter((src) => !/assets\/js\/core\/app\.js(?:\?.*)?$/i.test(src));

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

const createUiSelectApi = () => {
  const registry = new Map();

  const pruneDisconnected = () => {
    registry.forEach((instance, select) => {
      if (select.isConnected && instance.root.isConnected) return;
      registry.delete(select);
    });
  };

  const closeAll = (exceptSelect = null) => {
    pruneDisconnected();
    registry.forEach((instance, select) => {
      if (exceptSelect && select === exceptSelect) return;
      instance.root.classList.remove("is-open");
      instance.menu.hidden = true;
      instance.trigger.setAttribute("aria-expanded", "false");
    });
  };

  const refresh = (select) => {
    pruneDisconnected();
    const instance = registry.get(select);
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
        refresh(select);
        closeAll();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });

      instance.menu.appendChild(button);
    });
  };

  const enhance = (select) => {
    pruneDisconnected();
    if (!select || registry.has(select)) return select;

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

    registry.set(select, instance);

    trigger.addEventListener("click", () => {
      const isOpen = !menu.hidden;
      closeAll(select);
      menu.hidden = isOpen;
      wrapper.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });

    select.addEventListener("change", () => {
      refresh(select);
    });

    refresh(select);
    return select;
  };

  const enhanceAll = (root = document) => {
    root.querySelectorAll("select[data-ui-select]").forEach((select) => {
      enhance(select);
    });
  };

  document.addEventListener("pointerdown", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  warmInternalViewLink(link);
}, { passive: true, capture: true });

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".ui-select")) return;
    closeAll();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });

  return { enhance, enhanceAll, refresh, closeAll };
};

window.DokeUiSelect = window.DokeUiSelect || createUiSelectApi();

const PRESERVED_HTML_CLASS_NAMES = ["doke-js-mobile", "doke-js-desktop", "doke-mobile-shell-ready", "doke-mobile-shell-pending", SIDEBAR_COLLAPSED_HTML_CLASS, SIDEBAR_EXPANDED_HTML_CLASS, SIDEBAR_STATE_READY_HTML_CLASS];
const PRESERVED_BODY_ATTRS = ["style"];

const syncElementAttributesFromDocument = (target, source, { preserveAttrs = [], preserveClasses = [] } = {}) => {
  if (!target || !source) return;

  const preservedAttrs = new Map();
  preserveAttrs.forEach((name) => {
    if (target.hasAttribute(name)) preservedAttrs.set(name, target.getAttribute(name));
  });

  [...target.attributes].forEach((attr) => {
    if (preserveAttrs.includes(attr.name)) return;
    target.removeAttribute(attr.name);
  });

  [...source.attributes].forEach((attr) => {
    if (attr.name === "class") return;
    if (preserveAttrs.includes(attr.name) && preservedAttrs.has(attr.name)) return;
    target.setAttribute(attr.name, attr.value);
  });

  preservedAttrs.forEach((value, name) => target.setAttribute(name, value));

  const preservedClassNames = preserveClasses.filter((className) => target.classList.contains(className));
  target.className = "";
  source.classList.forEach((className) => {
    if (!preserveClasses.includes(className)) target.classList.add(className);
  });
  preservedClassNames.forEach((className) => target.classList.add(className));
};

const syncDocumentStateFromDocument = (nextDoc) => {
  syncElementAttributesFromDocument(document.documentElement, nextDoc.documentElement, {
    preserveClasses: PRESERVED_HTML_CLASS_NAMES
  });

  syncElementAttributesFromDocument(body, nextDoc.body, {
    preserveAttrs: PRESERVED_BODY_ATTRS,
    preserveClasses: PRESERVED_BODY_STATE_CLASSES
  });

  // Re-apply persisted shell state after the route body contract is replaced.
  if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
    body.classList.add("theme-dark");
  } else {
    body.classList.remove("theme-dark");
  }
  syncSidebarCollapsedState();
};

const suppressRouteTransitionsBriefly = () => {
  body.classList.add("is-route-instant-swap");
  window.setTimeout(() => body.classList.remove("is-route-instant-swap"), 90);
};

const runViewInitializer = (label, initializer) => {
  if (typeof initializer !== "function") return;
  try {
    initializer();
  } catch (error) {
    console.error(`[Doke:init:${label}]`, error);
  }
};

const syncLucideIcons = () => {
  if (!window.lucide?.createIcons) return;
  try {
    window.lucide.createIcons();
  } catch (error) {
    console.error("[Doke:init:lucide]", error);
  }
};

const initializeCurrentView = () => {
  body.dataset.currentViewPath = getCurrentPath();
  renderSharedSidebar();
  updateSidebarActiveState();
  syncAuthUi();
  syncTopbarScrollState();
  syncHeaderLocation();
  if (usesPageSearchOnlyMobile()) {
    closeMobileSearch();
  }
  runViewInitializer("home", window.DokeInitHome);
  runViewInitializer("search-results", window.DokeInitSearchResults);
  runViewInitializer("detail", window.DokeInitDetailPage);
  runViewInitializer("budget", window.DokeInitBudget);
  runViewInitializer("orders", window.DokeInitOrders);
  runViewInitializer("messages", window.DokeInitMessages);
  runViewInitializer("payment", window.DokeInitPayment);
  runViewInitializer("order-finalize", window.DokeInitOrderFinalize);
  runViewInitializer("review", window.DokeInitReview);
  runViewInitializer("notifications", window.DokeInitNotifications);
  runViewInitializer("wallet", window.DokeInitWallet);
  runViewInitializer("profile", window.DokeInitProfile);
  runViewInitializer("professional-profile", window.DokeInitProfessionalProfile);
  syncLucideIcons();
  runViewInitializer("mobile-shell", window.DokeMobileAppShell?.refresh);

  try {
    initChipRails();
  } catch (error) {
    console.error("[Doke:init:chip-rails]", error);
  }

  try {
    scheduleSidebarViewHints();
  } catch (error) {
    console.error("[Doke:init:view-hints]", error);
  }
};

const waitForNextPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

const ROUTE_SCROLL_RESET_SELECTORS = [
  '.app-shell',
  '.page',
  '.page__content',
  '.page__content-inner',
  '[data-shell-main]',
  '.shell-home__workspace',
  '.doke-page-shell',
  '.orders-shell-content',
  '.notifications-page',
  '.communities-page',
  '.settings-shell-content'
];

const setScrollInstantly = (node) => {
  if (!node) return;
  try {
    node.scrollTop = 0;
    node.scrollLeft = 0;
  } catch {}
};

const resetRouteScrollPosition = () => {
  const html = document.documentElement;
  const previousHtmlBehavior = html.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';

  const reset = () => {
    try { window.scrollTo(0, 0); } catch {}
    setScrollInstantly(document.scrollingElement);
    setScrollInstantly(html);
    setScrollInstantly(body);
    ROUTE_SCROLL_RESET_SELECTORS.forEach((selector) => {
      document.querySelectorAll(selector).forEach(setScrollInstantly);
    });
  };

  reset();
  window.requestAnimationFrame(() => {
    reset();
    window.requestAnimationFrame(() => {
      reset();
      html.style.scrollBehavior = previousHtmlBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
    });
  });
};

const swapView = async (href, { replace = false, preserveScroll = false } = {}) => {
  const url = new URL(href, window.location.href);
  const cacheKey = url.pathname + url.search;
  let stagedStyles = [];

  body.classList.add("is-shell-swapping");
  suppressRouteTransitionsBriefly();
  hintInternalViewStyles(url.toString());

  try {
    let html = await prefetchedInternalViews.get(cacheKey);

    if (!html) {
      const response = await fetch(cacheKey, {
        headers: { "X-Requested-With": "doke-shell" }
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar ${url.pathname}`);
      }

      html = await response.text();
    } else {
      prefetchedInternalViews.delete(cacheKey);
    }

    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(html, "text/html");
    const nextShell = nextDoc.querySelector(".app-shell");
    const currentShell = document.querySelector(".app-shell");

    if (!nextShell || !currentShell) {
      window.location.href = url.toString();
      return;
    }

    stagedStyles = await syncStylesFromDocument(nextDoc);

    const nextShellNode = nextShell.cloneNode(true);
    const currentSidebar = currentShell.querySelector(":scope > .sidebar");
    const nextSidebar = nextShellNode.querySelector(":scope > .sidebar");

    if (currentSidebar && nextSidebar) {
      nextSidebar.replaceWith(currentSidebar);
    }

    // Critical section: body classes, app shell, topbar and page content move
    // together. Swapping only .page leaves route-specific chrome/styles stale
    // and causes the F5-only layout correction bug.
    syncDocumentStateFromDocument(nextDoc);
    syncStandaloneUiFromDocument(nextDoc);
    currentShell.replaceWith(nextShellNode);
    activateStagedStyles(stagedStyles);

    cleanupDynamicStyles(nextDoc);
    document.title = nextDoc.title || document.title;
    await ensureScriptsFromDocument(nextDoc);
    closeProfileMenu();
    closeMobileSearch();

    if (replace) {
      window.history.replaceState({ href: url.toString() }, "", url.toString());
    } else {
      window.history.pushState({ href: url.toString() }, "", url.toString());
    }

    if (!preserveScroll) {
      resetRouteScrollPosition();
    }

    try {
      initializeCurrentView();
      document.dispatchEvent(new CustomEvent("doke:route-ready", { detail: { href: url.toString(), path: getCurrentPath(url.href) } }));
      if (!preserveScroll) resetRouteScrollPosition();
    } catch (error) {
      console.error("[Doke:swap:init-after-replace]", error);
    }
  } catch (error) {
    discardStagedStyles(stagedStyles);
    throw error;
  } finally {
    window.requestAnimationFrame(() => {
      body.classList.remove("is-shell-swapping");
    });
  }
};

window.DokeNavigate = (href, options = {}) => {
  if (shouldBypassShellSwap(href)) {
    if (options.replace) {
      window.location.replace(href);
      return;
    }
    window.location.href = href;
    return;
  }

  try {
    updateSidebarActiveState(getCurrentPath(href));
    closeProfileMenu();
    closeMobileSearch();
  } catch {}

  swapView(href, options).catch((error) => {
    console.error('[Doke:navigation]', error);
    if (options.replace) {
      window.location.replace(href);
      return;
    }
    window.location.href = href;
  });
};

document.addEventListener("submit", (event) => {
  if (document.body.classList.contains("search-results-body")) return;
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
  if (document.body.classList.contains("search-results-body")) return;
  const activeInput = event.target.closest('[data-global-topbar-search] input[type="search"], [data-global-topbar-search] input[type="text"]');
  if (!activeInput) return;

  if (event.key === "Escape") {
    const searchForm = activeInput.closest('[data-global-topbar-search]');
    if (window.innerWidth > 760 && document.body.classList.contains('home-index-shell') && !String(activeInput.value || '').trim()) {
      searchForm?.classList.remove('is-expanded');
    }
    activeInput.blur();
    return;
  }

  if (event.key !== "Enter") return;

  const query = activeInput.value || "";
  if (!String(query).trim()) return;

  event.preventDefault();
  closeMobileSearch();
  navigateToSearchResults(query);
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  if (document.body.classList.contains("search-results-body")) {
    document.body.classList.remove("mobile-search-active", "home-search-overlay-active");
  }
  const submitButton = event.target.closest("[data-global-topbar-submit]");
  if (submitButton) {
    const searchForm = submitButton.closest("[data-global-topbar-search]");
    const searchInput = searchForm?.querySelector('input[type="search"], input[type="text"]');
    const query = searchInput?.value || "";
    const isDesktopHomeTopbar = window.innerWidth > 760 && document.body.classList.contains("home-index-shell") && searchForm?.closest(".topbar--location");

    if (isDesktopHomeTopbar && searchForm && !searchForm.classList.contains("is-expanded")) {
      event.preventDefault();
      searchForm.classList.add("is-expanded");
      window.setTimeout(() => searchInput?.focus(), 0);
      return;
    }

    if (String(query).trim()) {
      event.preventDefault();
      closeMobileSearch();
      navigateToSearchResults(query);
      return;
    }
  }

  const expandedDesktopSearch = document.querySelector('.home-index-shell .topbar--location [data-global-topbar-search].is-expanded');
  if (expandedDesktopSearch && !event.target.closest('[data-global-topbar-search]')) {
    const expandedInput = expandedDesktopSearch.querySelector('input[type="search"], input[type="text"]');
    if (!String(expandedInput?.value || '').trim()) {
      expandedDesktopSearch.classList.remove('is-expanded');
    }
  }

  const locationTrigger = event.target.closest("[data-location-trigger]");
  if (locationTrigger) {
    event.preventDefault();
    const modalButton = document.querySelector("[data-address-open]");
    modalButton?.click();
    return;
  }


  const quickSearchTrigger = event.target.closest(".home-side-meta__search");
  if (quickSearchTrigger) {
    event.preventDefault();
    const group = quickSearchTrigger.closest(".home-side-meta__group");
    const form = group?.querySelector(".home-side-meta__search-form");
    const input = form?.querySelector("input[type='search'], input[type='text']");
    if (input) {
      form?.classList.add("is-expanded");
      window.setTimeout(() => input.focus(), 0);
    }
    return;
  }

  const cta = event.target.closest(".service-card__cta, .doke-ad-card__cta");
  if (cta) {
    event.preventDefault();
    window.DokeNavigate?.("detalhe-anuncio.html");
    return;
  }

  const headerNavTrigger = event.target.closest("[data-header-nav]");
  if (headerNavTrigger) {
    event.preventDefault();
    const href = headerNavTrigger.getAttribute("data-header-nav") || "";
    if (href) {
      window.DokeNavigate?.(href);
    }
    return;
  }

  const link = event.target.closest("a[href]");
  if (!link) return;
  if (link.target && link.target !== "_self") return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!isInternalViewUrl(link.href)) return;
  if (shouldBypassShellSwap(link.href)) return;

  event.preventDefault();
  window.DokeNavigate(link.href);
});

document.addEventListener("pointerenter", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
}, true);

document.addEventListener("focusin", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
});

document.addEventListener("touchstart", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
  hintInternalViewScripts(link.href);
  prefetchInternalViewDocument(link.href);
}, { passive: true });

document.addEventListener("mouseover", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
  hintInternalViewScripts(link.href);
  prefetchInternalViewDocument(link.href);
}, { passive: true });

document.addEventListener("focusin", (event) => {
  const link = event.target.closest("a[href]");
  if (!link || !isInternalViewUrl(link.href) || shouldBypassShellSwap(link.href)) return;
  hintInternalViewStyles(link.href);
  hintInternalViewScripts(link.href);
  prefetchInternalViewDocument(link.href);
});

window.addEventListener("popstate", () => {
  if (!isInstantShellNavigationEnabled()) return;

  const href = window.location.href;
  if (shouldBypassShellSwap(href)) {
    window.location.reload();
    return;
  }

  swapView(href, { replace: true, preserveScroll: true }).catch((error) => {
    console.error('[Doke:navigation:popstate]', error);
    window.location.reload();
  });
});

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const toggleButton = event.target.closest("[data-sidebar-toggle]");
  if (toggleButton) {
    if (isMobileSidebarViewport()) {
      body.classList.remove("sidebar-collapsed");
    }
    if (!body.classList.contains("sidebar-open")) { closeMobileSearch(); }
    body.classList.toggle("sidebar-open");
    return;
  }

  const collapseButton = event.target.closest("[data-sidebar-collapse]");
  if (collapseButton) {
    if (isMobileSidebarViewport()) {
      body.classList.remove("sidebar-collapsed");
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "false");
      return;
    }
    const nextCollapsed = !body.classList.contains("sidebar-collapsed");
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, nextCollapsed ? "true" : "false");
    syncSidebarCollapsedState();
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

  const homeProfileMenuToggle = event.target.closest("[data-home-profile-menu-toggle]");
  if (homeProfileMenuToggle) {
    event.preventDefault();
    event.stopPropagation();
    toggleSecondaryHeaderMenu("[data-home-profile-menu]", homeProfileMenuToggle);
    return;
  }

  const homeAccountMenuToggle = event.target.closest("[data-home-account-menu-toggle]");
  if (homeAccountMenuToggle) {
    event.preventDefault();
    event.stopPropagation();
    toggleSecondaryHeaderMenu("[data-home-account-menu]", homeAccountMenuToggle);
    return;
  }

  if (event.target.closest("[data-profile-menu], [data-home-profile-menu], [data-home-account-menu]")) {
    event.stopPropagation();
    return;
  }

  closeProfileMenu();
  closeSecondaryHeaderMenus();

  const sidebarLogoutButton = document.querySelector("[data-sidebar-logout]");
  if (event.target.closest("[data-profile-logout]") && sidebarLogoutButton) {
    sidebarLogoutButton.click();
    return;
  }

  if (event.target.closest("[data-mobile-search-open]")) {
    if (document.body.classList.contains("search-results-body") || usesPageSearchOnlyMobile()) {
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
    closeSecondaryHeaderMenus();
    closeMobileSearch();
  }
});

initializeCurrentView();
