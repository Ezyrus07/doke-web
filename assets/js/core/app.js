/* Global shell interactions: sidebar, theme, auth avatar/profile menu and internal routing. */
const body = document.body;
const SIDEBAR_STORAGE_KEY = "doke.sidebar.collapsed";
const THEME_STORAGE_KEY = "doke.theme";
const SHELL_STATE_CLASSES = ["sidebar-collapsed", "sidebar-open", "theme-dark", "mobile-search-active"];
const INTERNAL_PROFILE_PATH = "/perfil.html";
const INTERNAL_VIEW_PATHS = new Set(["/index.html", "/resultados.html", "/detalhe-anuncio.html", "/pedidos.html", "/mensagens.html", "/notificacoes.html", "/comunidade.html", "/pagamento.html", "/finalizar-pedido.html", "/avaliacao.html", "/carteira.html", "/adicionar-cartao.html", "/conta-bancaria.html", INTERNAL_PROFILE_PATH, "/mais.html", "/"]);
const MESSAGES_VIEW_PATH = "/mensagens.html";
const SIDEBAR_PRIMARY_VIEWS = ["/index.html", "/pedidos.html", "/notificacoes.html", "/comunidade.html", INTERNAL_PROFILE_PATH, "/mais.html", "/carteira.html"];
let sidebarViewsHinted = false;
const isMobileSidebarViewport = () => window.innerWidth <= 760;

if (body.classList.contains("sidebar-collapsed")) {
  body.classList.remove("sidebar-collapsed");
}

try {
  window.localStorage.removeItem(SIDEBAR_STORAGE_KEY);
} catch {}

if (window.localStorage.getItem(THEME_STORAGE_KEY) === "dark") {
  body.classList.add("theme-dark");
}

const syncSidebarCollapsedState = () => {
  body.classList.remove("sidebar-collapsed");
};

window.addEventListener("resize", syncSidebarCollapsedState, { passive: true });
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

const shouldBypassShellSwap = (_href) => false;


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

  <div class="sidebar__group">
    <div class="sidebar__label">Conta</div>
    <a class="nav-link nav-link--profile" href="perfil.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg></span><span>Meu perfil</span></span>
    </a>
    <a class="nav-link nav-link--wallet" href="carteira.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4.5 8.5A2.5 2.5 0 0 1 7 6h11.5v12H7a2.5 2.5 0 1 1 0-5h12"></path><path d="M16 13h3"></path></svg></span><span>Carteira</span></span>
    </a>
    <a class="nav-link nav-link--settings" href="mais.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg></span><span>Configurações</span></span>
    </a>
  </div>

  <div class="sidebar__footer">
    <div class="sidebar__group sidebar__group--footer">
      <button class="nav-link nav-link--footer-action" type="button" data-sidebar-logout aria-label="Sair">
        <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 7.5V5.8A1.8 1.8 0 0 0 13.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.7"></path><path d="M10 12h10"></path><path d="m17 8 3 4-3 4"></path></svg></span><span>Sair</span></span>
      </button>
    </div>
  </div>
`;

const renderSharedSidebar = () => {
  const sidebar = document.querySelector('.app-shell > .sidebar');
  if (!sidebar) return;
  if (sidebar.dataset.shellRendered === 'true') return;
  sidebar.innerHTML = SHARED_SIDEBAR_MARKUP;
  sidebar.dataset.shellRendered = 'true';
};

const updateSidebarActiveState = () => {
  const path = getCurrentPath();
  const homeActive = path === "/index.html";
  const ordersActive = path === "/pedidos.html";
  const messagesActive = path === "/mensagens.html" || path === "/pagamento.html" || path === "/finalizar-pedido.html" || path === "/avaliacao.html";
  const notificationsActive = path === "/notificacoes.html";
  const communitiesActive = path === "/comunidade.html";
  const walletActive = path === "/carteira.html" || path === "/adicionar-cartao.html" || path === "/conta-bancaria.html";
  const profileActive = path === INTERNAL_PROFILE_PATH;
  const settingsActive = path === "/mais.html";

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => link.classList.remove("is-active"));
  document.querySelector(".nav-link--home")?.classList.toggle("is-active", homeActive);
  document.querySelector(".nav-link--orders")?.classList.toggle("is-active", ordersActive);
  document.querySelector(".nav-link--messages")?.classList.toggle("is-active", messagesActive);
  document.querySelector(".nav-link--notifications")?.classList.toggle("is-active", notificationsActive);
  document.querySelector(".nav-link--communities")?.classList.toggle("is-active", communitiesActive);
  document.querySelector(".nav-link--wallet")?.classList.toggle("is-active", walletActive);
  document.querySelector(".nav-link--profile")?.classList.toggle("is-active", profileActive);
  document.querySelector(".nav-link--settings")?.classList.toggle("is-active", settingsActive);
};

const syncSettingsLinks = () => {
  document.querySelectorAll('.nav-link--settings, .nav-link--profile, .profile-dropdown__item').forEach((link) => {
    const text = (link.textContent || '').trim().toLowerCase();

    if (link.classList.contains('nav-link--settings') || text.includes('configurações')) {
      if (link.tagName === 'A') link.setAttribute('href', 'mais.html');
    }

    if (link.classList.contains('nav-link--profile') || text.includes('meu perfil') || text === 'perfil') {
      if (link.tagName === 'A') link.setAttribute('href', INTERNAL_PROFILE_PATH.replace('/', ''));
    }
  });
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
  "/comunidade.html": [
    "assets/css/pages/comunidade.css"
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
  "/carteira.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/carteira.css"
  ],
  "/perfil.html": [
    "assets/css/pages/perfil.css"
  ],
  "/perfil-profissional.html": [
    "assets/css/pages/perfil-profissional.css"
  ],
  "/mais.html": [
    "assets/css/pages/internal-shell.css",
    "assets/css/pages/mais.css"
  ],
  "/adicionar-cartao.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/wallet-manage.css"
  ],
  "/conta-bancaria.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home.css",
    "assets/css/pages/wallet-manage.css"
  ],
  "/detalhe-anuncio.html": [
    "assets/css/pages/home-shared.css",
    "assets/css/pages/home-refresh.css",
    "assets/css/pages/search-results.css",
    "assets/css/pages/orcamento.css",
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

const scheduleSidebarViewHints = () => {
  if (sidebarViewsHinted) return;
  sidebarViewsHinted = true;

  const run = () => {
    SIDEBAR_PRIMARY_VIEWS.forEach((path) => hintInternalViewStyles(path));
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 1200 });
    return;
  }

  window.setTimeout(run, 180);
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

  document.addEventListener("click", (event) => {
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
  renderSharedSidebar();
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
  window.DokeInitProfile?.();
  window.DokeInitProfessionalProfile?.();
  initChipRails();
  scheduleSidebarViewHints();
};

const waitForNextPaint = () =>
  new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve);
    });
  });

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
  const nextPage = nextDoc.querySelector(".page");
  const currentPage = document.querySelector(".page");
  const nextSidebar = nextDoc.querySelector(".app-shell > .sidebar");
  const currentSidebar = document.querySelector(".app-shell > .sidebar");

  if (!nextPage || !currentPage) {
    window.location.href = url.toString();
    return;
  }

  await syncStylesFromDocument(nextDoc);
  await ensureScriptsFromDocument(nextDoc);

  body.classList.add("is-shell-swapping");
  syncBodyClassesFromDocument(nextDoc);
  syncStandaloneUiFromDocument(nextDoc);

  if (currentSidebar && nextSidebar) {
    currentSidebar.replaceWith(nextSidebar.cloneNode(true));
  }

  currentPage.replaceWith(nextPage.cloneNode(true));

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
  await waitForNextPaint();
  body.classList.remove("is-shell-swapping");
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
  swapView(window.location.href, { replace: true, preserveScroll: true }).catch((error) => {
    console.error(error);
    window.location.reload();
  });
});

document.addEventListener("click", (event) => {
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
