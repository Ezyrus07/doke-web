(function () {
  const normalizePath = (value) => String(value || '').split('?')[0].split('#')[0].toLowerCase();

  const syncActiveDrawerItem = (drawer) => {
    if (!drawer) return;

    const currentPath = normalizePath(window.location.pathname.split('/').pop() || 'index.html');
    const items = [...drawer.querySelectorAll('.home-mobile-drawer__item[href]')];

    items.forEach((item) => {
      item.classList.remove('home-mobile-drawer__item--active');
      item.removeAttribute('aria-current');

      const href = item.getAttribute('href');
      const itemPath = normalizePath(href);
      if (!itemPath) return;

      const isProfileRoute = currentPath === 'perfil.html' && itemPath.startsWith('perfil.html');
      const isMatch = itemPath === currentPath || isProfileRoute;

      if (isMatch) {
        item.classList.add('home-mobile-drawer__item--active');
        item.setAttribute('aria-current', 'page');
      }
    });
  };

  window.DokeHomeDrawer = {
    create({ signal }) {
      return function initMobileHomeDrawer() {
        const drawer = document.querySelector('[data-mobile-home-drawer]');
        if (!drawer) return;

        const panel = drawer.querySelector('.home-mobile-drawer__panel');
        const shouldUseDrawer = () => window.innerWidth <= 1024;
        syncActiveDrawerItem(drawer);

        const setOpen = (isOpen) => {
          drawer.hidden = false;
          drawer.classList.toggle('is-open', isOpen);
          drawer.setAttribute('aria-hidden', String(!isOpen));
          document.body.classList.toggle('mobile-home-drawer-open', isOpen);

          if (!isOpen) {
            window.setTimeout(() => {
              if (!drawer.classList.contains('is-open')) {
                drawer.hidden = true;
              }
            }, 240);
          }
        };

        const openMenu = (event) => {
          if (!shouldUseDrawer()) return;
          event?.preventDefault();
          event?.stopPropagation();
          setOpen(true);
        };

        const closeMenu = (event) => {
          event?.preventDefault();
          event?.stopPropagation();
          setOpen(false);
        };

        document.addEventListener('click', (event) => {
          const openTrigger = event.target.closest('[data-mobile-home-menu-open], .home-mobile-hero__profile, [data-home-profile-menu-toggle]');
          if (openTrigger && shouldUseDrawer()) {
            openMenu(event);
            return;
          }

          const closeTrigger = event.target.closest('[data-mobile-home-menu-close]');
          if (closeTrigger) {
            closeMenu(event);
            return;
          }

          if (drawer.classList.contains('is-open') && panel && !panel.contains(event.target)) {
            closeMenu(event);
          }
        }, { signal });

        drawer.addEventListener('click', (event) => {
          const closeTrigger = event.target.closest('[data-mobile-home-menu-close]');
          if (closeTrigger) {
            closeMenu(event);
            return;
          }

          if (panel && !panel.contains(event.target)) {
            closeMenu(event);
          }
        }, { signal });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
            closeMenu(event);
          }
        }, { signal });

        window.addEventListener('resize', () => {
          if (window.innerWidth > 1024 && drawer.classList.contains('is-open')) {
            setOpen(false);
          }
        }, { signal });
      };
    }
  };
})();

/* Home mobile drawer resilience contract.
   Keeps the account/sidebar drawer independent from later page initializers. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 1024px)').matches ?? window.innerWidth <= 1024;

  const getDrawer = () => document.querySelector('[data-mobile-home-drawer]');
  const getPanel = (drawer) => drawer?.querySelector('.home-mobile-drawer__panel');

  const setOpen = (open) => {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.hidden = false;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('mobile-home-drawer-open', open);

    document.querySelectorAll('[data-mobile-home-menu-open], [data-home-profile-menu-toggle]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(open));
    });

    if (!open) {
      window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) drawer.hidden = true;
      }, 240);
    }
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeDrawerRescueBound === 'true') return;
    document.documentElement.dataset.homeDrawerRescueBound = 'true';

    document.addEventListener('click', (event) => {
      const openTrigger = event.target.closest('[data-mobile-home-menu-open], [data-home-profile-menu-toggle], .home-side-meta__avatar, .home-mobile-hero__profile, .mobile-header-logo');
      if (openTrigger && isMobile()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setOpen(true);
        return;
      }

      const drawer = getDrawer();
      if (!drawer) return;
      const panel = getPanel(drawer);

      if (event.target.closest('[data-mobile-home-menu-close]')) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (drawer.classList.contains('is-open') && panel && !panel.contains(event.target)) {
        setOpen(false);
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();


/* HOME DRAWER HARD BINDER v21
   Pointer-first fallback for Safari/mobile and stale overlay states. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 1024px)').matches ?? window.innerWidth <= 1024;
  const openSelectors = [
    '[data-mobile-home-menu-open]',
    '[data-home-profile-menu-toggle]',
    '.home-side-meta__profile',
    '.home-side-meta__avatar',
    '.mobile-toggle'
  ].join(',');

  const drawer = () => document.querySelector('[data-mobile-home-drawer]');
  const panel = () => drawer()?.querySelector('.home-mobile-drawer__panel');

  const setDrawerOpen = (open) => {
    const root = drawer();
    if (!root) return false;

    if (open) {
      root.hidden = false;
      root.removeAttribute('hidden');
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
    } else {
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
    }

    document.body.classList.toggle('mobile-home-drawer-open', open);
    document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open');

    document.querySelectorAll('[data-mobile-home-menu-open], [data-home-profile-menu-toggle]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(open));
    });

    if (!open) {
      window.setTimeout(() => {
        if (!root.classList.contains('is-open')) {
          root.hidden = true;
          root.setAttribute('hidden', '');
        }
      }, 240);
    }

    return true;
  };

  const handleOpenEvent = (event) => {
    if (!isHome() || !isMobile()) return;
    const trigger = event.target.closest(openSelectors);
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    setDrawerOpen(true);
  };

  const handleCloseEvent = (event) => {
    if (!isHome()) return;

    if (event.target.closest('[data-mobile-home-menu-close]')) {
      event.preventDefault();
      event.stopPropagation();
      setDrawerOpen(false);
      return;
    }

    const root = drawer();
    const activePanel = panel();
    if (root?.classList.contains('is-open') && activePanel && !activePanel.contains(event.target)) {
      setDrawerOpen(false);
    }
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeDrawerHardBound === 'true') return;
    document.documentElement.dataset.homeDrawerHardBound = 'true';

    document.addEventListener('pointerdown', handleOpenEvent, true);
    document.addEventListener('click', handleOpenEvent, true);
    document.addEventListener('click', handleCloseEvent, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    }, true);

    window.DokeHomeDrawerHardOpen = () => setDrawerOpen(true);
    window.DokeHomeDrawerHardClose = () => setDrawerOpen(false);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();


/* HOME PROFILE DRAWER DIRECT BINDER v22
   Directly opens the mobile drawer from the index top DK/profile control. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 1024px)').matches ?? window.innerWidth <= 1024;
  const triggerSelector = '[data-mobile-home-menu-open], [data-home-profile-menu-toggle], .home-side-meta__profile, .home-side-meta__avatar';

  const openDrawer = () => {
    const drawer = document.querySelector('[data-mobile-home-drawer]');
    if (!drawer) return false;
    drawer.hidden = false;
    drawer.removeAttribute('hidden');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mobile-home-drawer-open');
    document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open');
    document.querySelectorAll(triggerSelector).forEach((button) => button.setAttribute?.('aria-expanded', 'true'));
    return true;
  };

  const closeDrawer = () => {
    const drawer = document.querySelector('[data-mobile-home-drawer]');
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mobile-home-drawer-open');
    document.querySelectorAll(triggerSelector).forEach((button) => button.setAttribute?.('aria-expanded', 'false'));
    window.setTimeout(() => {
      if (!drawer.classList.contains('is-open')) {
        drawer.hidden = true;
        drawer.setAttribute('hidden', '');
      }
    }, 240);
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeProfileDrawerDirectBound === 'true') return;
    document.documentElement.dataset.homeProfileDrawerDirectBound = 'true';

    document.addEventListener('pointerdown', (event) => {
      const trigger = event.target.closest(triggerSelector);
      if (!trigger || !isMobile()) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openDrawer();
    }, true);

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest(triggerSelector);
      if (trigger && isMobile()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      if (event.target.closest('[data-mobile-home-menu-close]')) {
        event.preventDefault();
        closeDrawer();
        return;
      }

      const drawer = document.querySelector('[data-mobile-home-drawer]');
      const panel = drawer?.querySelector('.home-mobile-drawer__panel');
      if (drawer?.classList.contains('is-open') && panel && !panel.contains(event.target)) closeDrawer();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeDrawer();
    }, true);

    window.DokeOpenHomeDrawerDirect = openDrawer;
    window.DokeCloseHomeDrawerDirect = closeDrawer;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();

