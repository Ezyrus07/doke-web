/* Doke Home Mobile Interaction Contract
   Responsibility: page-specific mobile trigger bridge + search filter sheet.
   Drawer anatomy and state belong to the canonical shared drawer authority when present. */
(function () {
  const root = document.documentElement;

  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobileDrawer = () => window.matchMedia?.('(max-width: 1024px)').matches ?? window.innerWidth <= 1024;
  const isMobileFilter = () => window.matchMedia?.('(max-width: 760px)').matches ?? window.innerWidth <= 760;

  const drawerSelector = '[data-mobile-home-drawer]';
  const drawerOpenSelector = [
    '.home-index-topbar [data-home-profile-menu-toggle]',
    '.home-index-topbar [data-mobile-home-menu-open]',
    '.home-index-topbar .home-side-meta__profile',
    '.home-index-topbar .home-side-meta__avatar',
    '.home-index-topbar .doke-avatar',
    '[data-mobile-home-menu-open]',
    '[data-shell-profile]'
  ].join(',');

  const filterOpenSelector = [
    '[data-searchbox] .home-search-hero__button',
    '[data-searchbox] .doke-search-pill__button',
    '.home-search-hero [data-more-filters-toggle]',
    '[data-more-filters-toggle]'
  ].join(',');

  const getDrawer = () => document.querySelector(drawerSelector);
  const getDrawerPanel = () => getDrawer()?.querySelector('.home-mobile-drawer__panel');
  const getFilterPanel = () => document.querySelector('[data-more-filters-panel]');
  const getFilterHost = () => document.querySelector('[data-more-filters-tabs-host]');

  const clearBrokenOverlayState = () => {
    const panel = getFilterPanel();
    const panelIsActuallyOpen = Boolean(panel && !panel.hidden && panel.classList.contains('is-open'));
    if (!panelIsActuallyOpen) {
      document.body?.classList.remove('home-filter-sheet-open', 'home-inline-filters-open', 'home-mobile-filters-open');
    }

    const drawer = getDrawer();
    const drawerIsActuallyOpen = Boolean(drawer && !drawer.hidden && drawer.classList.contains('is-open'));
    if (!drawerIsActuallyOpen) {
      document.body?.classList.remove('mobile-home-drawer-open');
    }
  };

  const markControls = () => {
    document.querySelectorAll('.home-index-topbar [data-home-profile-menu-toggle], .home-index-topbar .home-side-meta__profile, .home-index-topbar .home-side-meta__avatar').forEach((node) => {
      node.setAttribute('data-mobile-home-menu-open', '');
      node.setAttribute('aria-haspopup', 'dialog');
    });

    document.querySelectorAll('[data-searchbox] .home-search-hero__button, [data-searchbox] .doke-search-pill__button').forEach((node) => {
      node.setAttribute('type', 'button');
      node.setAttribute('data-more-filters-toggle', '');
      node.setAttribute('data-more-filters-source', node.getAttribute('data-more-filters-source') || 'hero-field');
      node.setAttribute('aria-controls', 'more-filters-panel');
      node.setAttribute('aria-expanded', 'false');
      node.setAttribute('aria-label', node.getAttribute('aria-label') || 'Abrir filtros');
    });
  };

  const openDrawer = () => {
    const open = window.DokeCanonicalDrawerOpen || window.DokeStandardMobileDrawerOpen;
    return typeof open === 'function' ? open() : false;
  };

  const closeDrawer = () => {
    const close = window.DokeCanonicalDrawerClose || window.DokeStandardMobileDrawerClose;
    if (typeof close === 'function') close();
  };

  const showDefaultFilterSection = () => {
    const panes = Array.from(document.querySelectorAll('[data-more-filters-section]'));
    if (!panes.length) return;

    const quickPane = panes.find((pane) => pane.dataset.moreFiltersSection === 'quick') || panes[0];

    panes.forEach((pane) => {
      const active = pane === quickPane;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });

    document.querySelectorAll('[data-more-filters-nav]').forEach((button) => {
      const active = button.dataset.moreFiltersNav === quickPane.dataset.moreFiltersSection;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const openFilters = () => {
    const panel = getFilterPanel();
    if (!panel) return false;

    closeDrawer();

    if (isMobileFilter() && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    panel.hidden = false;
    panel.removeAttribute('hidden');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    panel.setAttribute('data-filter-sheet-state', 'open');

    showDefaultFilterSection();

    document.body.classList.add('home-filter-sheet-open');
    document.body.classList.remove('home-inline-filters-open', 'home-mobile-filters-open', 'home-search-overlay-active', 'mobile-search-active');

    document.querySelectorAll(filterOpenSelector).forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add('is-active');
    });

    return true;
  };

  const closeFilters = () => {
    const panel = getFilterPanel();
    if (!panel) return;

    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('data-filter-sheet-state', 'closed');
    panel.hidden = true;
    panel.setAttribute('hidden', '');

    document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open', 'home-mobile-filters-open');

    document.querySelectorAll(filterOpenSelector).forEach((trigger) => {
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove('is-active');
    });

    const host = getFilterHost();
    if (!isMobileFilter() && host && panel.parentElement !== host) {
      host.appendChild(panel);
    }
  };

  const captureOpeners = (event) => {
    if (!isHome()) return;

    clearBrokenOverlayState();

    const drawerTrigger = event.target.closest(drawerOpenSelector);
    if (drawerTrigger && isMobileDrawer()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openDrawer();
      return;
    }

    const filterTrigger = event.target.closest(filterOpenSelector);
    if (filterTrigger && isMobileFilter()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const panel = getFilterPanel();
      const isOpen = Boolean(panel && !panel.hidden && panel.classList.contains('is-open'));
      if (isOpen) {
        closeFilters();
      } else {
        openFilters();
      }
    }
  };

  const captureClosers = (event) => {
    if (!isHome()) return;

    if (event.target.closest('[data-mobile-home-menu-close]')) {
      event.preventDefault();
      event.stopPropagation();
      closeDrawer();
      return;
    }

    if (event.target.closest('[data-more-filters-close], [data-more-filters-apply]')) {
      event.preventDefault();
      event.stopPropagation();
      closeFilters();
      return;
    }

    const drawer = getDrawer();
    const drawerPanel = getDrawerPanel();
    if (drawer?.classList.contains('is-open') && drawerPanel && !drawerPanel.contains(event.target) && !event.target.closest(drawerOpenSelector)) {
      closeDrawer();
    }

    const filterPanel = getFilterPanel();
    if (filterPanel?.classList.contains('is-open') && isMobileFilter() && !filterPanel.contains(event.target) && !event.target.closest(filterOpenSelector)) {
      closeFilters();
    }
  };

  const bind = () => {
    if (!isHome() || root.dataset.homeMobileInteractionContract === 'v23') return;
    root.dataset.homeMobileInteractionContract = 'v23';

    markControls();
    clearBrokenOverlayState();

    document.addEventListener('click', captureOpeners, true);
    document.addEventListener('click', captureClosers, true);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeDrawer();
      closeFilters();
    }, true);

    window.addEventListener('resize', () => {
      clearBrokenOverlayState();
      const panel = getFilterPanel();
      const host = getFilterHost();
      if (panel && !panel.classList.contains('is-open') && host && panel.parentElement !== host) {
        host.appendChild(panel);
      }
    });

    window.DokeHomeMobileInteractions = {
      openDrawer,
      closeDrawer,
      openFilters,
      closeFilters,
      markControls,
      clearBrokenOverlayState
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
