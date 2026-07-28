/* Global shell interactions: sidebar, theme, auth avatar/profile menu and internal routing. */
const body = document.body;
const navigationLifecycle = window.DokeNavigationLifecycle || window.Doke?.navigationLifecycle || null;
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
const SIDEBAR_QUICK_ALERT_DURATION_MS = 1120;
const SIDEBAR_QUICK_NOTICE_STAGGER_MS = 3040;
const SIDEBAR_QUICK_ALERT_STAGGER_MS = 180;
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
const PRESERVED_BODY_STATE_CLASSES = [...SHELL_STATE_CLASSES];
const INTERNAL_PROFILE_PATH = "/perfil.html";
const OWNER_PROFILE_PATH = "/meu-perfil.html";
const NAVIGATION_REGISTRY = window.DokeNavigationRegistry || null;

const normalizeIdentityText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const initialsFromIdentityName = (value, fallback = "DK") => {
  const parts = normalizeIdentityText(value).split(" ").filter(Boolean);
  if (!parts.length) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase() || fallback;
};

const handleFromIdentityName = (value, fallback = "dokepro") => {
  const handle = normalizeIdentityText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);
  return handle || fallback;
};

const getSavedProfessionalIdentity = () => {
  const user = getCurrentSessionUser();
  const profile = user?.profile || {};
  if (!user) return null;

  const name = normalizeIdentityText(profile.name || user.name);
  const baseCity = normalizeIdentityText(profile.city || user.city);
  if (!name && !baseCity) return null;

  return {
    name,
    baseCity,
    handle: normalizeIdentityText(profile.handle || user.handle) || handleFromIdentityName(name || "Doke Pro"),
    initials: normalizeIdentityText(profile.initials || user.initials) || initialsFromIdentityName(name || "Doke Pro", "DP")
  };
};

const shouldUseProfessionalIdentitySurface = () => {
  const user = getCurrentSessionUser();
  const role = String(user?.role || user?.type || "").trim().toLowerCase();
  if (role === "professional") return true;

  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  return page === "perfil-profissional.html";
};

const syncProfessionalSettingsIdentity = () => {
  const identity = getSavedProfessionalIdentity();
  if (!identity || !shouldUseProfessionalIdentitySurface()) return;

  const displayName = identity.name;
  const baseCity = identity.baseCity;
  const handle = identity.handle;
  const initials = identity.initials;

  if (displayName) {
    document.querySelectorAll(".home-side-meta__identity strong, [data-user-name]").forEach((node) => {
      node.textContent = displayName;
      node.setAttribute("title", displayName);
    });

    document.querySelectorAll(".profile-dropdown__header").forEach((node) => {
      node.textContent = `@${handle}`;
    });
  }

  document.querySelectorAll(".home-side-meta__identity span, [data-user-role]").forEach((node) => {
    node.textContent = baseCity || "Profissional";
  });

  const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (page !== "perfil-profissional.html" && page !== "perfil.html") return;

  const profileName = document.querySelector("#profile-title, [data-profile-name]");
  if (profileName && displayName) profileName.textContent = displayName;

  const profileMeta = document.querySelector(".profile-heading__meta, [data-profile-username]");
  if (profileMeta && displayName) {
    profileMeta.textContent = `@${handle}${baseCity ? ` · ${baseCity}` : ""}`;
  }

  const profileAvatar = document.querySelector(".profile-avatar span, [data-profile-avatar]");
  if (profileAvatar && initials) profileAvatar.textContent = initials;

  const profileAvatarWrap = document.querySelector(".profile-avatar");
  if (profileAvatarWrap && displayName) profileAvatarWrap.setAttribute("aria-label", `Avatar de ${displayName}`);

  document.querySelectorAll("[data-professional-name]").forEach((node) => {
    if (displayName) node.setAttribute("data-professional-name", displayName);
  });

  if (displayName) document.title = document.title.replace(/^[^|]+/, displayName + " ");
};

const INTERNAL_VIEW_PATHS = new Set(Array.isArray(NAVIGATION_REGISTRY?.getInternalPaths?.())
  ? NAVIGATION_REGISTRY.getInternalPaths()
  : []);
const MESSAGES_VIEW_PATH = "/mensagens.html";
const SIDEBAR_PRIMARY_VIEWS = Array.isArray(NAVIGATION_REGISTRY?.getPriorityWarmRoutes?.())
  ? NAVIGATION_REGISTRY.getPriorityWarmRoutes()
  : [];
let sidebarViewsHinted = false;
let sidebarQuickCountsSnapshot = null;
let sidebarQuickPrioritySignature = null;
const sidebarQuickAlertTimers = new Map();
const sidebarQuickTransitionTimers = new Map();
const isTabletLandscapeSidebarViewport = () => false;
const isMobileSidebarViewport = () => window.innerWidth < 1200;
const isTabletSidebarViewport = () => false;

const ensureShellChromeContracts = (root = document) => {
  const shell = root.querySelector?.(".app-shell");
  if (shell && shell.getAttribute("data-shell-contract") !== "app-shell") {
    shell.setAttribute('data-shell-contract', 'app-shell');
  }

  const sidebar = root.querySelector?.(".app-shell > .sidebar, [data-shell-sidebar]");
  if (sidebar) {
    if (!sidebar.hasAttribute("data-shell-sidebar")) {
      sidebar.setAttribute("data-shell-sidebar", "");
    }
    if (sidebar.getAttribute("data-sidebar-contract") !== "global-sidebar") {
      sidebar.setAttribute('data-sidebar-contract', 'global-sidebar');
    }
  }

  const header = root.querySelector?.("[data-app-header]");
  if (header) {
    if (header.getAttribute("data-header-contract") !== "app-header") {
      header.setAttribute("data-header-contract", "app-header");
    }
    const variant = header.getAttribute("data-header-variant") || "standard";
    if (!header.getAttribute("data-header-family")) {
      header.setAttribute("data-header-family", variant);
    }
  }

  const scrim = root.querySelector?.("[data-sidebar-scrim]");
  if (scrim && !scrim.hasAttribute("aria-hidden")) {
    scrim.setAttribute("aria-hidden", "true");
  }
};
ensureShellChromeContracts();

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

  const isTabletSidebar = isTabletSidebarViewport();
  const isCollapsed = !isTabletSidebar && readStoredSidebarCollapsed();
  const sidebarWidth = isCollapsed ? "92px" : "240px";
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
    if (!NAVIGATION_REGISTRY || typeof NAVIGATION_REGISTRY.isNativeOnlyRoute !== 'function') return true;
    return NAVIGATION_REGISTRY.isNativeOnlyRoute(path);
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

  <div class="sidebar__brand" data-sidebar-brand>
    <div class="brand-logo" aria-label="Doke" data-sidebar-brand-logo>
      <img src="assets/img/doke-logo-lockup.png" alt="Doke" />
    </div>
    <div class="sidebar__quick-chip" data-sidebar-quick-chip hidden aria-label="Prioridade profissional">
      <a class="sidebar__quick-priority" href="perfil-profissional.html" data-sidebar-quick-priority data-sidebar-quick-target="profile" aria-live="polite">
        <span class="sidebar__quick-priority-icon sidebar__quick-priority-icon--orders" data-sidebar-quick-priority-icon="orders" hidden aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg></span>
        <span class="sidebar__quick-priority-icon sidebar__quick-priority-icon--messages" data-sidebar-quick-priority-icon="messages" hidden aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg></span>
        <span class="sidebar__quick-priority-icon sidebar__quick-priority-icon--notifications" data-sidebar-quick-priority-icon="notifications" hidden aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4.5a4.8 4.8 0 0 0-4.8 4.8v2.6c0 1.4-.4 2.7-1.2 3.8h12c-.8-1.1-1.2-2.4-1.2-3.8V9.3A4.8 4.8 0 0 0 12 4.5z"></path><path d="M9.5 18a2.5 2.5 0 0 0 5 0"></path></svg></span>
        <span class="sidebar__quick-priority-icon sidebar__quick-priority-icon--profile" data-sidebar-quick-priority-icon="profile" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"></path><path d="M4.8 20c1.1-3.4 3.6-5.2 7.2-5.2s6.1 1.8 7.2 5.2"></path></svg></span>
        <span class="sidebar__quick-priority-copy">
          <span class="sidebar__quick-priority-kicker" data-sidebar-quick-priority-kicker>Ação recomendada</span>
          <strong data-sidebar-quick-priority-title>Complete seu perfil</strong>
          <span data-sidebar-quick-priority-summary>Receba mais pedidos</span>
        </span>
        <span class="sidebar__quick-priority-action" data-sidebar-quick-priority-action aria-hidden="true">Completar</span>
      </a>
    </div>
  </div>

  <div class="sidebar__group">
    <div class="sidebar__label">Principal</div>
    <a class="nav-link nav-link--home" href="index.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg></span>
        <span>Início</span>
      </span>
    </a>
    <a class="nav-link nav-link--orders" href="pedidos.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg></span>
        <span>Pedidos</span>
      </span>
      <span class="nav-link__count" data-sidebar-orders-count hidden>0</span>
    </a>
    <a class="nav-link nav-link--messages" href="mensagens.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg></span>
        <span>Mensagens</span>
      </span>
      <span class="nav-link__count" data-sidebar-messages-count hidden>0</span>
    </a>
    <a class="nav-link nav-link--notifications" href="notificacoes.html">
      <span class="nav-link__start">
        <span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4.5a4.8 4.8 0 0 0-4.8 4.8v2.6c0 1.4-.4 2.7-1.2 3.8h12c-.8-1.1-1.2-2.4-1.2-3.8V9.3A4.8 4.8 0 0 0 12 4.5z"></path><path d="M9.5 18a2.5 2.5 0 0 0 5 0"></path></svg></span>
        <span>Notificações</span>
      </span>
      <span class="nav-link__count" data-sidebar-notifications-count hidden>0</span>
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
    <a class="nav-link nav-link--profile" href="meu-perfil.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg></span><span>Meu perfil</span></span>
    </a>
    <a class="nav-link nav-link--wallet" href="carteira.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3.8" y="6.5" width="16.4" height="11" rx="2.4"></rect><path d="M6 9.5h12"></path><path d="M15.2 13.2h2"></path></svg></span><span>Carteira</span></span>
    </a>
    <a class="nav-link nav-link--admin" href="admin.html" data-sidebar-admin-link hidden>
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5 18 6v5.2c0 4.4-2.6 7.3-6 9.3-3.4-2-6-4.9-6-9.3V6l6-2.5Z"></path><path d="M9 12h6"></path></svg></span><span>Admin</span></span>
    </a>
    <a class="nav-link nav-link--settings" href="configuracoes.html">
      <span class="nav-link__start"><span class="nav-link__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg></span><span>Configurações</span></span>
    </a>
  </div>

`;

const renderSharedSidebar = () => {
  const sidebar = document.querySelector('.app-shell > .sidebar');
  if (!sidebar) return;
  ensureShellChromeContracts();
  if (sidebar.dataset.shellRendered === 'true') return;
  sidebar.innerHTML = SHARED_SIDEBAR_MARKUP;
  sidebar.dataset.shellRendered = 'true';
  sidebar.setAttribute('data-internal-sidebar', 'true');
  syncSidebarAdminLink();
};

const safeReadLocalCollection = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const getCurrentSessionUser = () => {
  try {
    return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || null;
  } catch (error) {
    return null;
  }
};

const getOwnerProfileHref = (user = getCurrentSessionUser()) => {
  try {
    const registryHref = NAVIGATION_REGISTRY?.getOwnerProfileUrl?.(user);
    if (registryHref) return String(registryHref).replace(/^\//, '');
  } catch (error) {}

  if (!user || !user.id) return OWNER_PROFILE_PATH.replace('/', '');
  const role = String(user.role || user.type || '').trim().toLowerCase();
  return role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html';
};

const isAccountProfileNavigationTarget = (target) => {
  if (!target) return false;
  const text = (target.textContent || '').trim().toLowerCase();
  const label = (target.getAttribute?.('aria-label') || '').trim().toLowerCase();
  const explicitTarget = target.getAttribute?.('data-header-nav') || target.getAttribute?.('href') || '';
  const targetPage = String(explicitTarget).split('?')[0].split('#')[0].split('/').pop()?.toLowerCase() || '';
  return (
    target.classList?.contains('nav-link--profile') ||
    target.getAttribute?.('data-nav-id') === 'profile' ||
    target.classList?.contains('bottom-nav__item--profile') ||
    target.classList?.contains('doke-mobile-bottom-nav__item--profile') ||
    target.getAttribute?.('data-owner-profile-link') === 'true' ||
    targetPage === 'meu-perfil.html' ||
    text.includes('meu perfil') ||
    text === 'perfil' ||
    label === 'abrir conta' ||
    label === 'meu perfil'
  );
};

const ensureOwnerProfileLinkLabel = (link) => {
  if (!link || !link.classList?.contains('nav-link--profile')) return;
  const start = link.querySelector('.nav-link__start');
  if (!start) return;
  const icon = start.querySelector('.nav-link__icon');
  let label = Array.from(start.children).find((child) => child !== icon && (child.textContent || '').trim());
  if (!label) {
    label = document.createElement('span');
    label.textContent = 'Meu perfil';
    start.appendChild(label);
  } else if (!(label.textContent || '').trim()) {
    label.textContent = 'Meu perfil';
  }
};

const syncOwnerProfileLinks = () => {
  const href = getOwnerProfileHref();
  document.querySelectorAll('.nav-link--profile, [data-nav-id="profile"], .bottom-nav__item--profile, .doke-mobile-bottom-nav__item--profile, .profile-dropdown__item, [data-owner-profile-link="true"], a[href="meu-perfil.html"], [data-header-nav="meu-perfil.html"]').forEach((target) => {
    if (!isAccountProfileNavigationTarget(target)) return;
    if (target.tagName === 'A') target.setAttribute('href', href);
    if (target.hasAttribute('data-header-nav')) target.setAttribute('data-header-nav', href);
    target.setAttribute('data-owner-profile-link', 'true');
    ensureOwnerProfileLinkLabel(target);
    if (target.tagName === 'A') warmInternalViewLink(target);
  });
};

const syncProfessionalOwnerProfileRoute = () => {
  const page = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (page !== 'meu-perfil.html') return;
  const user = getCurrentSessionUser();
  const role = String(user?.role || user?.type || '').trim().toLowerCase();
  if (role !== 'professional') return;
  const target = getOwnerProfileHref(user);
  if (!target || target === 'meu-perfil.html') return;

  const params = new URLSearchParams(window.location.search || '');
  if (params.get('view') === 'personal' || params.get('personal') === '1') return;

  const hash = window.location.hash || '';
  window.location.replace(target + hash);
};

const isCurrentDemoProfessional = (user) => Boolean(user?.role === 'professional' && String(user?.id) === 'user_profissional_demo');

const canUseAdminPanel = (user = getCurrentSessionUser()) => {
  const role = String(user?.role || user?.type || '').trim().toLowerCase();
  if (role === 'admin' || role === 'support') return true;
  if (user?.isMockSupport === true || user?.mockSupport === true) return true;
  return false;
};

const syncSidebarAdminLink = () => {
  const nodes = Array.from(document.querySelectorAll('[data-sidebar-admin-link], .nav-link--admin[href="admin.html"]'));
  if (!nodes.length) return;
  const allowed = canUseAdminPanel();
  nodes.forEach((node) => {
    if (!allowed) {
      node.remove();
      return;
    }

    node.hidden = false;
    node.removeAttribute('aria-hidden');
    node.removeAttribute('tabindex');
  });
};

const syncSidebarBadgeNode = (selector, count) => {
  const node = document.querySelector(selector);
  if (!node) return;
  const value = Math.max(0, Number(count) || 0);
  node.textContent = String(value);
  node.hidden = value === 0;
};

const getLocalUnreadMessageCount = () => {
  const user = getCurrentSessionUser();
  const notifications = safeReadLocalCollection('doke.notifications.local.v1');
  return notifications.filter((notification) => {
    if (notification?.read === true || notification?.dismissed === true) return false;
    if (String(notification?.category || notification?.type || '').toLowerCase().indexOf('message') === -1) return false;
    if (!user?.id || !notification?.userId) return true;
    return String(notification.userId) === String(user.id);
  }).length;
};

const getLocalOpenOrdersCount = () => {
  const user = getCurrentSessionUser();
  const orders = safeReadLocalCollection('doke.orders.local.v1');
  return orders.filter((order) => {
    const status = String(order?.status || 'pending');
    const isOpen = !['completed', 'cancelled'].includes(status);
    if (!isOpen) return false;
    if (!user?.id) return true;
    if (String(order?.clientId || '') === String(user.id)) return true;
    if (String(order?.professionalId || order?.providerId || '') === String(user.id)) return true;
    return isCurrentDemoProfessional(user) && Boolean(order?.id);
  }).length;
};

const getOperationalIdentityKeys = (user) => {
  const profile = user?.profile || {};
  const profiles = Array.isArray(user?.profiles) ? user.profiles : [];
  const values = [
    user?.id,
    user?.userId,
    user?.accountId,
    user?.email,
    user?.providerProfileId,
    user?.professionalId,
    user?.clientId,
    profile?.id,
    profile?.userId,
    profile?.accountId,
    profile?.email,
    ...profiles.flatMap((item) => [item?.id, item?.userId, item?.accountId, item?.email]),
  ];
  return new Set(values.map((value) => String(value || '').trim().toLowerCase()).filter(Boolean));
};

const notificationTargetsCurrentUser = (notification, user) => {
  const userKeys = getOperationalIdentityKeys(user);
  if (!userKeys.size) return true;
  const recipientKeys = [
    notification?.recipientAccountKey,
    notification?.recipientId,
    notification?.userId,
    notification?.accountKey,
    notification?.email,
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
  if (!recipientKeys.length) return true;
  return recipientKeys.some((key) => userKeys.has(key));
};

const getLocalUnreadNotificationsCount = () => {
  const user = getCurrentSessionUser();
  const notifications = safeReadLocalCollection('doke.notifications.local.v1');
  return notifications.filter((notification) => {
    if (notification?.read === true || notification?.dismissed === true) return false;
    return notificationTargetsCurrentUser(notification, user);
  }).length;
};

const isProfessionalSessionUser = (user) => Boolean(String(user?.role || user?.type || '').toLowerCase() === 'professional');

const SIDEBAR_QUICK_UPDATE_TYPES = ['orders', 'messages', 'notifications'];

const isSidebarQuickType = (value) => SIDEBAR_QUICK_UPDATE_TYPES.includes(value);

const SIDEBAR_QUICK_PRIORITY_CONFIG = {
  orders: {
    href: 'pedidos.html',
    action: 'Ver pedido',
    kicker: 'Prioridade agora',
    title(count) {
      return count === 1 ? 'Novo pedido recebido' : `${count} pedidos aguardando`;
    },
    summary(count) {
      return count === 1 ? 'Responda rápido para aumentar sua chance.' : 'Responda os pedidos mais recentes primeiro.';
    },
  },
  messages: {
    href: 'mensagens.html',
    action: 'Responder',
    kicker: 'Cliente aguardando',
    title(count) {
      return count === 1 ? 'Mensagem não lida' : `${count} mensagens não lidas`;
    },
    summary(count) {
      return count === 1 ? 'Uma conversa precisa da sua resposta.' : 'Priorize clientes que já chamaram você.';
    },
  },
  notifications: {
    href: 'notificacoes.html',
    action: 'Ver agora',
    kicker: 'Avisos pendentes',
    title(count) {
      return count === 1 ? 'Nova notificação' : `${count} notificações novas`;
    },
    summary() {
      return 'Revise atualizações importantes da sua conta.';
    },
  },
  profile: {
    href: 'perfil-profissional.html',
    action: 'Completar',
    kicker: 'Ação recomendada',
    title() {
      return 'Complete seu perfil';
    },
    summary() {
      return 'Perfis completos recebem mais pedidos.';
    },
  },
};

const resolveSidebarQuickPriority = (counts) => {
  const normalized = cloneSidebarQuickCounts(counts);
  if (normalized.orders > 0) return { type: 'orders', count: normalized.orders, ...SIDEBAR_QUICK_PRIORITY_CONFIG.orders };
  if (normalized.messages > 0) return { type: 'messages', count: normalized.messages, ...SIDEBAR_QUICK_PRIORITY_CONFIG.messages };
  if (normalized.notifications > 0) return { type: 'notifications', count: normalized.notifications, ...SIDEBAR_QUICK_PRIORITY_CONFIG.notifications };
  return { type: 'profile', count: 0, ...SIDEBAR_QUICK_PRIORITY_CONFIG.profile };
};

const getSidebarQuickCounts = () => ({
  orders: getLocalOpenOrdersCount(),
  messages: getLocalUnreadMessageCount(),
  notifications: getLocalUnreadNotificationsCount(),
});

const cloneSidebarQuickCounts = (counts) => ({
  orders: Math.max(0, Number(counts?.orders) || 0),
  messages: Math.max(0, Number(counts?.messages) || 0),
  notifications: Math.max(0, Number(counts?.notifications) || 0),
});

const resetSidebarQuickAttentionNode = (node) => {
  if (!node) return;
  const timer = sidebarQuickAlertTimers.get(node);
  if (timer) window.clearTimeout(timer);
  sidebarQuickAlertTimers.delete(node);
  node.classList.remove('is-updating', 'is-reacting');
};

const showSidebarQuickChipNotice = () => {
  const chip = document.querySelector('[data-sidebar-quick-chip]');
  if (!chip || chip.hidden) return;
  resetSidebarQuickAttentionNode(chip);
  chip.classList.add('is-reacting');
  void chip.offsetWidth;
  sidebarQuickAlertTimers.set(chip, window.setTimeout(() => {
    chip.classList.remove('is-reacting');
    sidebarQuickAlertTimers.delete(chip);
  }, SIDEBAR_QUICK_ALERT_DURATION_MS));
};

const triggerSidebarQuickTargetAttention = (type, delay = 0) => {
  window.setTimeout(() => {
    document.querySelectorAll(`[data-sidebar-quick-target="${type}"]`).forEach((node) => {
      resetSidebarQuickAttentionNode(node);
      node.classList.add('is-updating');
      void node.offsetWidth;
      sidebarQuickAlertTimers.set(node, window.setTimeout(() => {
        node.classList.remove('is-updating');
        sidebarQuickAlertTimers.delete(node);
      }, SIDEBAR_QUICK_ALERT_DURATION_MS));
    });

    document.querySelectorAll('[data-sidebar-quick-chip]:not([hidden])').forEach((surface) => {
      resetSidebarQuickAttentionNode(surface);
      surface.classList.add('is-reacting');
      void surface.offsetWidth;
      sidebarQuickAlertTimers.set(surface, window.setTimeout(() => {
        surface.classList.remove('is-reacting');
        sidebarQuickAlertTimers.delete(surface);
      }, SIDEBAR_QUICK_ALERT_DURATION_MS));
    });
  }, delay);
};

const getSidebarQuickCountDeltas = (counts, shouldMount) => {
  const nextCounts = cloneSidebarQuickCounts(counts);
  if (!shouldMount) {
    sidebarQuickCountsSnapshot = null;
    return [];
  }
  if (!sidebarQuickCountsSnapshot) {
    sidebarQuickCountsSnapshot = nextCounts;
    return [];
  }
  const deltas = SIDEBAR_QUICK_UPDATE_TYPES.map((type) => ({
    type,
    delta: nextCounts[type] - (Number(sidebarQuickCountsSnapshot[type]) || 0),
  })).filter((entry) => entry.delta > 0);
  sidebarQuickCountsSnapshot = nextCounts;
  return deltas;
};

const triggerSidebarQuickAttention = (deltas) => {
  if (!Array.isArray(deltas) || !deltas.length) return;
  deltas.forEach((entry, index) => {
    triggerSidebarQuickTargetAttention(entry.type, index * SIDEBAR_QUICK_ALERT_STAGGER_MS);
    window.setTimeout(showSidebarQuickChipNotice, index * SIDEBAR_QUICK_NOTICE_STAGGER_MS);
  });
};

const triggerSidebarQuickPriorityTransition = (priorityCard, signature) => {
  if (!priorityCard || sidebarQuickPrioritySignature === signature) return;
  sidebarQuickPrioritySignature = signature;

  const previousTimer = sidebarQuickTransitionTimers.get(priorityCard);
  if (previousTimer) window.clearTimeout(previousTimer);

  priorityCard.classList.remove('is-transitioning');
  void priorityCard.offsetWidth;
  priorityCard.classList.add('is-transitioning');

  sidebarQuickTransitionTimers.set(priorityCard, window.setTimeout(() => {
    priorityCard.classList.remove('is-transitioning');
    sidebarQuickTransitionTimers.delete(priorityCard);
  }, 260));
};

const syncSidebarQuickPanel = () => {
  const chip = document.querySelector('[data-sidebar-quick-chip]');
  const priorityCard = document.querySelector('[data-sidebar-quick-priority]');
  const brandLogo = document.querySelector('[data-sidebar-brand-logo]');
  const brand = document.querySelector('[data-sidebar-brand]');
  if (!chip || !priorityCard || !brandLogo || !brand) return;

  const user = getCurrentSessionUser();
  const counts = getSidebarQuickCounts();
  const shouldMount = isProfessionalSessionUser(user);
  const deltas = getSidebarQuickCountDeltas(counts, shouldMount);
  const priority = resolveSidebarQuickPriority(counts);
  const title = priority.title(priority.count);
  const summary = priority.summary(priority.count);

  brandLogo.hidden = false;
  chip.hidden = !shouldMount;
  brand.dataset.sidebarQuickState = shouldMount ? 'priority' : 'idle';
  brand.dataset.sidebarQuickActiveType = shouldMount ? priority.type : '';
  if (!shouldMount) return;

  priorityCard.dataset.sidebarQuickTarget = priority.type;
  priorityCard.dataset.sidebarQuickPriorityType = priority.type;
  priorityCard.setAttribute('href', priority.href);
  priorityCard.setAttribute('aria-label', `${priority.kicker}. ${title}. ${summary} ${priority.action}.`);

  const kickerNode = priorityCard.querySelector('[data-sidebar-quick-priority-kicker]');
  const titleNode = priorityCard.querySelector('[data-sidebar-quick-priority-title]');
  const summaryNode = priorityCard.querySelector('[data-sidebar-quick-priority-summary]');
  const actionNode = priorityCard.querySelector('[data-sidebar-quick-priority-action]');

  if (kickerNode) kickerNode.textContent = priority.kicker;
  if (titleNode) titleNode.textContent = title;
  if (summaryNode) summaryNode.textContent = summary;
  if (actionNode) actionNode.textContent = priority.action;

  priorityCard.querySelectorAll('[data-sidebar-quick-priority-icon]').forEach((icon) => {
    icon.hidden = icon.getAttribute('data-sidebar-quick-priority-icon') !== priority.type;
  });

  triggerSidebarQuickPriorityTransition(priorityCard, [
    priority.type,
    priority.href,
    title,
    summary,
    priority.action,
  ].join('|'));
  triggerSidebarQuickAttention(deltas);
};

const syncSidebarOperationalBadges = () => {
  syncSidebarBadgeNode('[data-sidebar-orders-count]', getLocalOpenOrdersCount());
  syncSidebarBadgeNode('[data-sidebar-messages-count]', getLocalUnreadMessageCount());
  syncSidebarBadgeNode('[data-sidebar-notifications-count]', getLocalUnreadNotificationsCount());
  syncSidebarQuickPanel();
};

window.Doke = window.Doke || {};
window.Doke.syncOperationalBadges = syncSidebarOperationalBadges;

const updateSidebarActiveState = (pathOverride = null) => {
  const path = pathOverride || getCurrentPath();
  const registryActiveId = NAVIGATION_REGISTRY?.getActiveId?.(path) || "";
  const fallbackState = {
    home: path === "/index.html" || path === "/resultados.html" || path === "/detalhe-anuncio.html",
    orders: path === "/pedidos.html" || path === "/orcamento.html" || path === "/pagamento-profissional.html" || path === "/avaliacao-profissional.html",
    messages: path === "/mensagens.html",
    notifications: path === "/notificacoes.html" || path === "/novidades.html",
    communities: path === "/comunidade.html" || path === "/comunidade-interna.html",
    profile: path === INTERNAL_PROFILE_PATH || path === "/meu-perfil.html" || path === "/perfil-cliente.html" || path === "/perfil-profissional.html" || path === "/tornar-profissional.html" || path === "/verificacao-profissional.html" || path === "/anunciar-servico.html",
    wallet: path === "/carteira.html",
    admin: path === "/admin.html" || path === "/admin-verificacao.html" || path === "/admin-anuncio-revisao.html" || path === "/admin-pedidos-operacao.html",
    settings: path === "/configuracoes.html" || path === "/ajuda.html"
  };
  const isActive = (id) => registryActiveId ? registryActiveId === id : Boolean(fallbackState[id]);

  const stateMap = new Map([
    [".nav-link--home", isActive("home")],
    [".nav-link--orders", isActive("orders")],
    [".nav-link--messages", isActive("messages")],
    [".nav-link--notifications", isActive("notifications")],
    [".nav-link--communities", isActive("communities")],
    [".nav-link--profile", isActive("profile")],
    [".nav-link--wallet", isActive("wallet")],
    [".nav-link--admin", isActive("admin")],
    [".nav-link--settings", isActive("settings")]
  ]);

  document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
    link.classList.remove("is-active");
    link.removeAttribute("aria-current");
  });

  stateMap.forEach((active, selector) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.classList.toggle("is-active", active);
      if (active) node.setAttribute("aria-current", "page");
    });
  });
};

window.Doke.syncAccountNavigationState = (pathOverride = null) => {
  syncOwnerProfileLinks();
  updateSidebarActiveState(pathOverride);
};

const syncSettingsLinks = () => {
  document.querySelectorAll('.nav-link--settings, .nav-link--profile, .profile-dropdown__item').forEach((link) => {
    const text = (link.textContent || '').trim().toLowerCase();

    if (link.classList.contains('nav-link--settings') || text.includes('configurações')) {
      if (link.tagName === 'A') link.setAttribute('href', 'configuracoes.html');
    }

    if (link.classList.contains('nav-link--profile') || text.includes('meu perfil') || text === 'perfil') {
      if (link.tagName === 'A') link.setAttribute('href', getOwnerProfileHref());
    }
  });
};


const syncAuthUi = () => {
  syncSettingsLinks();
  syncOwnerProfileLinks();
  syncProfessionalOwnerProfileRoute();
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
      const sourceName = session.user.name || session.user.email || session.user.phone || "conta";
      const handle = String(sourceName)
        .split("@")[0]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
      profileHandle.textContent = `@${handle || "conta"}`;
    } else {
      profileHandle.textContent = "Conta Doke";
    }
  }
};


const syncHeaderLocation = () => {
  const key = "doke.defaultServiceLocation";
  let value = "";
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      value = data?.cidade && data?.uf ? `${data.cidade}, ${data.uf}` : data?.titulo || data?.rua || value;
    }
  } catch {}
  document.querySelectorAll("[data-topbar-location-value]").forEach((node) => {
    node.textContent = value || node.dataset.locationFallback || node.textContent.trim() || "Belo Horizonte, MG";
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

const HEADER_SEARCH_SELECTOR = ".app-header .home-side-meta__search-form";

const headerSearchPlaceholderForPage = () => {
  const page = document.body?.dataset?.page || "";
  const labels = {
    pedidos: "Buscar pedidos",
    notificacoes: "Buscar notificações",
    mensagens: "Buscar conversas",
    comunidade: "Buscar comunidades",
    carteira: "Buscar carteira",
    configuracoes: "Buscar configurações",
    ajuda: "Buscar ajuda"
  };
  return labels[page] || "Buscar serviço";
};

const ensureHeaderSearchDisclosure = (trigger) => {
  if (!trigger) return null;
  const group = trigger.closest(".home-side-meta__group, .app-header__group, [data-header-slot]");
  if (!group) return null;

  let form = group.querySelector(".home-side-meta__search-form");
  if (!form) {
    form = document.createElement("form");
    form.className = "home-side-meta__search-form";
    form.setAttribute("action", "resultados.html");
    form.setAttribute("role", "search");
    form.setAttribute("aria-label", trigger.getAttribute("aria-label") || "Busca rápida");

    const label = document.createElement("label");
    label.className = "home-side-meta__search-label doke-label";
    const id = `doke-header-search-${document.body?.dataset?.page || "page"}`;
    label.setAttribute("for", id);
    label.textContent = "Buscar";

    const input = document.createElement("input");
    input.id = id;
    input.className = "home-side-meta__search-input doke-input";
    input.type = "search";
    input.name = "q";
    input.placeholder = headerSearchPlaceholderForPage();
    input.autocomplete = "off";

    form.append(label, input);
    trigger.insertAdjacentElement("afterend", form);
  }

  if (!form.hasAttribute("data-header-search-disclosure")) {
    form.setAttribute("data-header-search-disclosure", "");
  }

  if (!form.getAttribute("action") && !form.querySelector("[data-notifications-search], [data-community-search]")) {
    form.setAttribute("action", "resultados.html");
  }

  return form;
};

const setHeaderSearchExpanded = (form, expanded) => {
  if (!form) return;
  const header = form.closest(".app-header");
  const trigger = header?.querySelector(".home-side-meta__search");
  form.classList.toggle("is-expanded", expanded);
  form.toggleAttribute("data-search-expanded", expanded);
  header?.classList.toggle("is-search-expanded", expanded);
  trigger?.setAttribute("aria-expanded", expanded ? "true" : "false");
};

const closeHeaderSearchDisclosures = (except = null) => {
  document.querySelectorAll(HEADER_SEARCH_SELECTOR).forEach((form) => {
    if (form === except) return;
    const input = form.querySelector("input[type='search'], input[type='text']");
    if (String(input?.value || "").trim()) return;
    setHeaderSearchExpanded(form, false);
  });
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


const HEADER_ACTION_ROUTES = new Map([
  ["novidades", "novidades.html"],
  ["noticias", "novidades.html"],
  ["notícias", "novidades.html"],
  ["ajuda", "ajuda.html"],
  ["suporte", "ajuda.html"],
  ["ajuda e suporte", "ajuda.html"],
  ["notificacoes", "notificacoes.html"],
  ["notificações", "notificacoes.html"],
  ["pedidos", "pedidos.html"],
  ["comunidade", "comunidade.html"],
  ["mensagens", "mensagens.html"],
  ["carteira", "carteira.html"],
  ["admin", "admin.html"],
  ["configuracoes", "configuracoes.html"],
  ["configurações", "configuracoes.html"],
]);

const normalizeHeaderActionLabel = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const resolveHeaderActionHref = (trigger) => {
  if (!trigger) return "";
  if (isAccountProfileNavigationTarget(trigger)) return getOwnerProfileHref();
  const explicitHref = trigger.getAttribute("data-header-nav") || trigger.getAttribute("href");
  if (explicitHref) return explicitHref;

  const label = normalizeHeaderActionLabel(
    trigger.getAttribute("aria-label") || trigger.textContent || ""
  );
  if (!label) return "";

  for (const [key, href] of HEADER_ACTION_ROUTES) {
    if (label === key || label.includes(key)) return href;
  }

  return "";
};

const navigateHeaderAction = (href) => {
  if (!href) return;
  const targetUrl = new URL(href, window.location.href);

  if (window.DokeNavigate && isInternalViewUrl(targetUrl.href) && !shouldBypassShellSwap(targetUrl.href)) {
    window.DokeNavigate(targetUrl.href);
    return;
  }

  window.location.href = targetUrl.href;
};

const normalizeHeaderActionButtons = () => {
  document.querySelectorAll(".home-side-meta__alert").forEach((button) => {
    if (!(button instanceof HTMLElement)) return;
    const href = resolveHeaderActionHref(button);
    if (!href) return;
    button.setAttribute("data-header-nav", href);
    if (button.tagName === "BUTTON" && !button.getAttribute("type")) {
      button.setAttribute("type", "button");
    }
  });
};


const BASE_SHELL_STYLE_PATTERNS = [
  /assets\/css\/core\/tokens\.css$/i,
  /assets\/css\/core\/base\.css$/i,
  /assets\/css\/core\/layout\.css$/i,
  /assets\/css\/core\/components\.css$/i
];

const INTERNAL_VIEW_STYLE_HINTS = {
  "/index.html": ["assets/css/pages/home-foundation.css"],
  "/resultados.html": [
    "assets/css/pages/marketplace-foundation.css",
    "assets/css/pages/search-results.css"
  ],
  "/pedidos.html": ["assets/css/pages/pedidos-foundation.css"],
  "/mensagens.html": ["assets/css/pages/messaging-foundation.css"],
  "/notificacoes.html": ["assets/css/pages/notificacoes-foundation.css"],
  "/novidades.html": ["assets/css/pages/novidades-foundation.css"],
  "/ajuda.html": ["assets/css/pages/ajuda-foundation.css"],
  "/carteira.html": ["assets/css/pages/carteira-foundation.css"],
  "/admin.html": ["assets/css/pages/admin-foundation.css"],
  "/admin-pedidos-operacao.html": ["assets/css/pages/admin-foundation.css", "assets/css/pages/admin-order-operations.css"],
  "/comunidade.html": [
    "assets/css/pages/comunidade-foundation.css",
    "assets/css/pages/comunidade-ui-foundation.css",
    "assets/css/pages/comunidade-post-shell-foundation.css"
  ],
  "/comunidade-interna.html": ["assets/css/pages/comunidade-interna-foundation.css"],
  "/perfil.html": ["assets/css/pages/profile-foundation.css"],
  "/configuracoes.html": ["assets/css/pages/configuracoes-foundation.css"],
  "/verificacao-profissional.html": ["assets/css/pages/verificacao-profissional-foundation.css"],
  "/orcamento.html": ["assets/css/pages/orcamento.css"],
  "/detalhe-anuncio.html": ["assets/css/pages/marketplace-detail-foundation.css"]
};

const preloadedStyleHrefs = new Set();

const INTERNAL_VIEW_SCRIPT_HINTS = {
  "/index.html": [
    "assets/js/pages/search-data.js",
    "assets/js/pages/home/filters.js",
    "assets/js/pages/home/search.js",
    "assets/js/pages/home.js"
  ],
  "/resultados.html": [
    "assets/js/pages/search-data.js",
    "assets/js/pages/home/before-after.js",
    "assets/js/pages/home/workers.js",
    "assets/js/pages/search-results.js"
  ],
  "/pedidos.html": ["assets/js/pages/pedidos.js"],
  "/mensagens.html": ["assets/js/pages/mensagens.js"],
  "/notificacoes.html": ["assets/js/pages/notificacoes.js"],
  "/novidades.html": ["assets/js/pages/novidades.js"],
  "/ajuda.html": ["assets/js/pages/ajuda.js"],
  "/carteira.html": ["assets/js/pages/carteira.js"],
  "/admin.html": ["assets/js/pages/admin.js"],
  "/admin-pedidos-operacao.html": ["assets/js/repositories/order-event-operations-repository.js", "assets/js/pages/admin-order-operations.js"],
  "/comunidade.html": ["assets/js/pages/comunidade.js"],
  "/comunidade-interna.html": ["assets/js/pages/comunidade-interna.js"],
  "/perfil.html": ["assets/js/controllers/perfil-controller.js"],
  "/detalhe-anuncio.html": ["assets/js/pages/detalhe-anuncio.js"],
  "/orcamento.html": ["assets/js/pages/orcamento.js"],
  "/tornar-profissional.html": ["assets/js/pages/tornar-profissional.js"],
  "/verificacao-profissional.html": ["assets/js/pages/verificacao-profissional.js"]
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

const warmPriorityInternalViews = () => {
  [
    'perfil-profissional.html',
    'meu-perfil.html',
    'comunidade.html',
    'comunidade-interna.html'
  ].forEach((href) => {
    try {
      hintInternalViewStyles(href);
      hintInternalViewScripts(href);
      prefetchInternalViewDocument(href);
    } catch (error) {}
  });
};

const scheduleSidebarViewHints = () => {
  if (sidebarViewsHinted) return;
  sidebarViewsHinted = true;

  // Navegação de menu precisa parecer instantânea. Pré-aquecemos as telas
  // principais cedo, não apenas em hover, para evitar o clique frio.
  const warm = () => {
    getPrimaryNavigationLinks().forEach(warmInternalViewLink);
    warmPriorityInternalViews();
  };
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

const canonicalRouteScriptKey = (src) => {
  try {
    const url = new URL(src, window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return String(src || "");
  }
};

const ensureScriptsFromDocument = async (nextDoc) => {
  const existingScripts = new Map([...document.querySelectorAll('script[src]')].map((node) => [canonicalRouteScriptKey(node.src), node]));
  const existing = new Set(existingScripts.keys());
  const scripts = [...nextDoc.querySelectorAll('script[src]')]
    .map((node) => node.getAttribute('src'))
    .filter(Boolean)
    .filter((src) => !/assets\/js\/core\/(?:navigation-lifecycle|app|stable-shell-router|social-page-router|runtime-config|feature-flags)\.js(?:\?.*)?$/i.test(src));

  for (const src of scripts) {
    const absolute = new URL(src, window.location.href).href;
    const key = canonicalRouteScriptKey(absolute);
    const existingScript = existingScripts.get(key);
    const shouldReloadCommunityRoomScript = /assets\/js\/pages\/comunidade-interna\.js$/i.test(key) && existingScript && existingScript.src !== absolute;
    if (existing.has(key) && !shouldReloadCommunityRoomScript) continue;
    if (shouldReloadCommunityRoomScript) {
      existingScript.remove();
      existing.delete(key);
      existingScripts.delete(key);
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
      document.body.appendChild(script);
      existing.add(key);
      existingScripts.set(key, script);
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

  const refreshInstance = (select) => {
    const instance = registry.get(select);
    if (!instance) return;

    const selectedOption = select.options[select.selectedIndex];
    instance.label.textContent = selectedOption?.textContent || select.options[0]?.textContent || "";
    instance.root.classList.toggle("has-value", Boolean(select.value));
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
        refreshInstance(select);
        closeAll();
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });

      instance.menu.appendChild(button);
    });
  };

  const isSelectElement = (node) => node instanceof HTMLSelectElement;

  const refresh = (target = document) => {
    pruneDisconnected();

    if (isSelectElement(target)) {
      refreshInstance(target);
      return;
    }

    const root = target && typeof target.querySelectorAll === "function" ? target : document;
    enhanceAll(root);
    pruneDisconnected();

    registry.forEach((instance, select) => {
      if (root === document || root === select || root.contains(select) || root.contains(instance.root)) {
        refreshInstance(select);
      }
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
      refreshInstance(select);
    });

    refreshInstance(select);
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

const initDokeUiSelects = () => {
  window.DokeUiSelect?.enhanceAll?.(document);
  window.DokeUiSelect?.refresh?.(document);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDokeUiSelects, { once: true });
} else {
  initDokeUiSelects();
}

const PRESERVED_HTML_CLASS_NAMES = ["doke-js-mobile", "doke-js-desktop", "doke-mobile-shell-ready", "doke-mobile-shell-pending", SIDEBAR_COLLAPSED_HTML_CLASS, SIDEBAR_EXPANDED_HTML_CLASS, SIDEBAR_STATE_READY_HTML_CLASS];
const PRESERVED_BODY_ATTRS = [];

const ROUTE_TRANSIENT_CLASSES = [
  "before-after-preview-open",
  "budget-modal-open",
  "community-modal-open",
  "detail-budget-open",
  "doke-help-drawer-open",
  "doke-mobile-drawer-open",
  "doke-mobile-overlay-open",
  "has-modal-open",
  "home-address-modal-open",
  "home-filter-sheet-open",
  "home-inline-filters-open",
  "home-search-overlay-active",
  "is-media-lightbox-open",
  "is-route-instant-swap",
  "is-shell-swapping",
  "is-messages-header-search-open",
  "is-search-open",
  "is-wallet-modal-open",
  "messages-thread-is-open",
  "mobile-home-drawer-open",
  "mobile-search-active",
  "news-detail-open",
  "order-feedback-active",
  "orders-chat-open",
  "orders-detail-open",
  "orders-overlay-open",
  "payment-finish-modal-open",
  "payment-modal-open",
  "pro-review-modal-open",
  "results-filters-open",
  "results-filters-open-from-home",
  "search-open",
  "ui-modal-open",
  "worker-modal-open",
  "worker-preview-open"
];

const ROUTE_SCROLL_LOCK_STYLE_PROPS = ["overflow", "overflow-x", "overflow-y", "height", "min-height", "max-height", "position", "top", "left", "right", "width"];

const clearInlineRouteScrollLocks = (node) => {
  if (!node?.style) return;
  ROUTE_SCROLL_LOCK_STYLE_PROPS.forEach((prop) => node.style.removeProperty(prop));
};

const clearRouteTransientState = () => {
  ROUTE_TRANSIENT_CLASSES.forEach((className) => {
    document.documentElement.classList.remove(className);
    body.classList.remove(className);
  });

  clearInlineRouteScrollLocks(document.documentElement);
  clearInlineRouteScrollLocks(body);

  document.documentElement.style.removeProperty("--messages-shell-sidebar-width");
  document.documentElement.style.removeProperty("--messages-app-inline-size");

  [".app-shell", ".page", ".page__content", ".page__content-inner", ".shell-home__workspace", ".doke-page-shell", ".messages-shell-content", ".messages-app"].forEach((selector) => {
    document.querySelectorAll(selector).forEach(clearInlineRouteScrollLocks);
  });
};

const runRouteLeavingCleanup = (toPath) => {
  const fromPath = getCurrentPath();
  try {
    document.dispatchEvent(new CustomEvent("doke:route-leaving", { detail: { from: fromPath, to: toPath, router: "core-app-shell-swap" } }));
  } catch {}

  if (fromPath === MESSAGES_VIEW_PATH && typeof window.DokeCleanupMessages === "function") {
    try {
      window.DokeCleanupMessages({ from: fromPath, to: toPath, router: "core-app-shell-swap" });
    } catch (error) {
      console.error("[Doke:cleanup:messages]", error);
    }
  }

  clearRouteTransientState();
};

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
  clearRouteTransientState();
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
  syncProfessionalSettingsIdentity();
  updateSidebarActiveState();
  syncTopbarScrollState();
  syncHeaderLocation();
  syncSidebarOperationalBadges();
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
  runViewInitializer("community", window.DokeInitCommunity);
  runViewInitializer("community-room", window.DokeInitCommunityRoom);
  runViewInitializer("wallet", window.DokeInitWallet);
  runViewInitializer("profile", window.DokeInitProfile);
  runViewInitializer("owner-profile", window.DokeInitOwnerProfile);
  runViewInitializer("client-profile", window.DokeInitClientProfile);
  runViewInitializer("settings", window.DokeInitSettings);
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
  clearRouteTransientState();
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

const swapView = async (href, options = {}) => {
  const {
    replace = false,
    preserveScroll = false,
    restoreScroll = false,
    skipHistory = false
  } = options;
  const lifecycleRouteId = Number(options.lifecycleRouteId || 0) || (navigationLifecycle?.route?.begin?.({
    from: window.location.href,
    to: href,
    source: options.source || 'legacy-shell',
    replace,
    restore: restoreScroll,
    adapter: options.lifecycleAdapter || 'legacy-shell'
  }) || 0);
  const url = new URL(href, window.location.href);
  const cacheKey = url.pathname + url.search;
  let stagedStyles = [];

  runRouteLeavingCleanup(getCurrentPath(url.href));
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

    if (!skipHistory) {
      if (replace) {
        window.history.replaceState({ href: url.toString() }, "", url.toString());
      } else {
        window.history.pushState({ href: url.toString() }, "", url.toString());
      }
    }
    if (lifecycleRouteId) {
      navigationLifecycle?.route?.commit?.(lifecycleRouteId, {
        adapter: options.lifecycleAdapter || 'legacy-shell',
        skipHistory
      });
    }

    if (!preserveScroll && !restoreScroll) {
      resetRouteScrollPosition();
    }

    try {
      initializeCurrentView();
      document.dispatchEvent(new CustomEvent("doke:route-ready", { detail: { href: url.toString(), path: getCurrentPath(url.href) } }));
      if (restoreScroll && navigationLifecycle?.scroll) {
        await navigationLifecycle.scroll.restore(url.toString());
      } else if (!preserveScroll) {
        resetRouteScrollPosition();
      }
      if (lifecycleRouteId) {
        navigationLifecycle?.route?.ready?.(lifecycleRouteId, {
          state: 'ready',
          to: getCurrentPath(url.href),
          adapter: options.lifecycleAdapter || 'legacy-shell'
        });
      }
    } catch (error) {
      console.error("[Doke:swap:init-after-replace]", error);
      if (lifecycleRouteId) {
        navigationLifecycle?.route?.fail?.(lifecycleRouteId, error, {
          to: getCurrentPath(url.href),
          adapter: options.lifecycleAdapter || 'legacy-shell',
          phase: 'initializer'
        });
      }
    }
  } catch (error) {
    discardStagedStyles(stagedStyles);
    if (lifecycleRouteId) {
      navigationLifecycle?.route?.fail?.(lifecycleRouteId, error, {
        to: getCurrentPath(url.href),
        adapter: options.lifecycleAdapter || 'legacy-shell'
      });
    }
    throw error;
  } finally {
    // Release the legacy shell gate immediately. Waiting for the next paint
    // can leave route content hidden if the initializer is expensive.
    body.classList.remove("is-shell-swapping");
    clearRouteTransientState();
    window.requestAnimationFrame(() => {
      clearRouteTransientState();
    });
  }
};

const legacyShellNavigate = (href, options = {}) => {
  if (shouldBypassShellSwap(href)) {
    if (options.replace) {
      window.location.replace(href);
      return Promise.resolve(true);
    }
    window.location.href = href;
    return Promise.resolve(true);
  }

  try {
    updateSidebarActiveState(getCurrentPath(href));
    closeProfileMenu();
    closeMobileSearch();
  } catch {}

  return swapView(href, options).catch((error) => {
    console.error('[Doke:navigation]', error);
    if (options.replace) {
      window.location.replace(href);
      return false;
    }
    window.location.href = href;
    return false;
  });
};

if (navigationLifecycle?.navigation?.registerAdapter) {
  navigationLifecycle.navigation.registerAdapter('legacy-shell', {
    navigate: legacyShellNavigate,
    warm: (href) => {
      hintInternalViewStyles(href);
      hintInternalViewScripts(href);
      return prefetchInternalViewDocument(href);
    },
    canHandle: (href) => (
      isInstantShellNavigationEnabled()
      && isInternalViewUrl(href)
      && !shouldBypassShellSwap(href)
    )
  }, { priority: 20 });
} else {
  window.DokeNavigate = legacyShellNavigate;
}

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

normalizeHeaderActionButtons();


document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const trigger = event.target.closest("[data-header-nav], .home-side-meta__alert");
  if (!trigger) return;
  if (trigger.matches(".home-side-meta__search, [data-mobile-home-menu-open], [data-home-profile-menu-toggle], [data-home-account-menu-toggle]")) return;

  const href = resolveHeaderActionHref(trigger);
  if (!href) return;

  event.preventDefault();
  event.stopPropagation();
  if (typeof event.stopImmediatePropagation === "function") {
    event.stopImmediatePropagation();
  }
  navigateHeaderAction(href);
}, true);

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
    const form = ensureHeaderSearchDisclosure(quickSearchTrigger);
    const input = form?.querySelector("input[type='search'], input[type='text']");
    if (form && input) {
      const isOpen = form.classList.contains("is-expanded");
      const value = String(input.value || "").trim();
      closeHeaderSearchDisclosures(form);
      if (isOpen && value) {
        navigateToSearchResults(value);
        return;
      }
      setHeaderSearchExpanded(form, true);
      window.setTimeout(() => input.focus(), 0);
    }
    return;
  }

  const headerSearchSubmit = event.target.closest(".home-side-meta__search-form button[type='submit']");
  if (headerSearchSubmit) {
    const form = headerSearchSubmit.closest(".home-side-meta__search-form");
    const input = form?.querySelector("input[type='search'], input[type='text']");
    const value = String(input?.value || "").trim();
    if (value && form?.getAttribute("action")?.includes("resultados.html")) {
      event.preventDefault();
      navigateToSearchResults(value);
      return;
    }
  }

  if (!event.target.closest(".home-side-meta__search, .home-side-meta__search-form")) {
    closeHeaderSearchDisclosures();
  }

  const cta = event.target.closest(".service-card__cta, .doke-ad-card__cta");
  if (cta) {
    event.preventDefault();
    window.DokeNavigate?.("detalhe-anuncio.html");
    return;
  }

  const headerNavTrigger = event.target.closest("[data-header-nav], .home-side-meta__alert");
  if (headerNavTrigger) {
    const href = resolveHeaderActionHref(headerNavTrigger);
    if (href) {
      event.preventDefault();
      navigateHeaderAction(href);
      return;
    }
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

if (!navigationLifecycle) {
  window.addEventListener("popstate", () => {
    if (!isInstantShellNavigationEnabled()) return;

    const href = window.location.href;
    if (shouldBypassShellSwap(href)) {
      window.location.reload();
      return;
    }

    swapView(href, { replace: true, preserveScroll: true, skipHistory: true }).catch((error) => {
      console.error('[Doke:navigation:popstate]', error);
      window.location.reload();
    });
  });
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!isAccountProfileNavigationTarget(link)) return;
  const href = getOwnerProfileHref();
  if (!href || link.getAttribute('href') === href) return;
  link.setAttribute('href', href);
}, { capture: true });

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
  if (!isMobileSidebarViewport()) {
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
    closeHeaderSearchDisclosures();
  }
});

initializeCurrentView();

['doke:notification-created', 'doke:notification-updated', 'doke:notifications-synced', 'doke:message-sent', 'doke:order-created', 'doke:order-status-changed', 'doke:auth-session-change', 'doke:auth-surface-ready'].forEach((eventName) => {
  document.addEventListener(eventName, () => {
    syncSidebarOperationalBadges();
    syncSidebarAdminLink();
    syncOwnerProfileLinks();
    syncProfessionalSettingsIdentity();
    updateSidebarActiveState();
    syncProfessionalOwnerProfileRoute();
  });
});
window.addEventListener('storage', () => {
  syncProfessionalSettingsIdentity();
  syncSidebarOperationalBadges();
  syncSidebarAdminLink();
  syncOwnerProfileLinks();
  updateSidebarActiveState();
  syncProfessionalOwnerProfileRoute();
});
window.setTimeout(() => {
  syncProfessionalSettingsIdentity();
  syncOwnerProfileLinks();
  updateSidebarActiveState();
  warmPriorityInternalViews();
  syncProfessionalOwnerProfileRoute();
}, 0);
