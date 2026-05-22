(function () {
  const normalizePath = (value) => String(value || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase() || 'index.html';

  const routeGroup = (path) => {
    const current = normalizePath(path);
    if (current === 'detalhe-anuncio.html' || current === 'resultados.html') return 'index.html';
    if (current === 'pagamento-profissional.html' || current === 'avaliacao.html') return 'pedidos.html';
    return current;
  };

  const isDrawerViewport = () => window.matchMedia?.('(max-width: 1024px)').matches ?? window.innerWidth <= 1024;

  const drawerSelector = '[data-mobile-home-drawer]';
  const panelSelector = '.home-mobile-drawer__panel';
  const openSelector = [
    '[data-mobile-home-menu-open]',
    '[data-home-profile-menu-toggle]',
    '.mobile-toggle',
    '.home-mobile-hero__profile',
    '.orders-page-header__hero-profile',
    '.settings-mobile-header__profile',
    '.detail-topbar__menu'
  ].join(',');
  const closeSelector = '[data-mobile-home-menu-close]';

  const getDrawer = () => document.querySelector(drawerSelector);
  const getPanel = () => getDrawer()?.querySelector(panelSelector);

  const syncActiveDrawerItem = (drawer) => {
    if (!drawer) return;
    const active = routeGroup(window.location.pathname);

    drawer.querySelectorAll('.home-mobile-drawer__item[href]').forEach((item) => {
      const matched = routeGroup(item.getAttribute('href')) === active ||
        (active === 'perfil.html' && routeGroup(item.getAttribute('href')) === 'perfil.html');

      item.classList.toggle('home-mobile-drawer__item--active', matched);
      if (matched) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  };

  let lastOpenAt = 0;
  let closeTimer = 0;

  const setOpen = (open) => {
    const drawer = getDrawer();
    if (!drawer) return false;

    window.clearTimeout(closeTimer);

    if (open) {
      lastOpenAt = performance.now();
      syncActiveDrawerItem(drawer);
      drawer.hidden = false;
      drawer.removeAttribute('hidden');
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      drawer.setAttribute('data-mobile-drawer-state', 'open');
      document.body.classList.add('mobile-home-drawer-open', 'doke-mobile-drawer-open');
      document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open', 'home-mobile-filters-open');
    } else {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('data-mobile-drawer-state', 'closed');
      document.body.classList.remove('mobile-home-drawer-open', 'doke-mobile-drawer-open');
      closeTimer = window.setTimeout(() => {
        if (!drawer.classList.contains('is-open')) {
          drawer.hidden = true;
          drawer.setAttribute('hidden', '');
        }
      }, 240);
    }

    document.querySelectorAll('[data-mobile-home-menu-open], [data-home-profile-menu-toggle]').forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(open));
    });

    return true;
  };

  const recentlyOpened = () => performance.now() - lastOpenAt < 260;

  const bindDrawer = (signal) => {
    const drawer = getDrawer();
    if (!drawer) return;

    syncActiveDrawerItem(drawer);

    const handleOpen = (event) => {
      const trigger = event.target.closest(openSelector);
      if (!trigger || !isDrawerViewport()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      setOpen(true);
    };

    const handleClick = (event) => {
      const trigger = event.target.closest(openSelector);
      if (trigger && isDrawerViewport()) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setOpen(true);
        return;
      }

      if (event.target.closest(closeSelector)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setOpen(false);
        return;
      }

      const root = getDrawer();
      const panel = getPanel();
      if (!root?.classList.contains('is-open') || !panel) return;

      if (recentlyOpened()) return;
      if (!panel.contains(event.target)) setOpen(false);
    };

    document.addEventListener('pointerdown', handleOpen, { capture: true, signal });
    document.addEventListener('click', handleClick, { capture: true, signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    }, { capture: true, signal });

    window.addEventListener('resize', () => {
      if (!isDrawerViewport() && getDrawer()?.classList.contains('is-open')) setOpen(false);
    }, { signal });
  };

  window.DokeHomeDrawer = {
    create({ signal } = {}) {
      return function initMobileHomeDrawer() {
        bindDrawer(signal);
      };
    }
  };

  window.DokeHomeDrawerHardOpen = () => setOpen(true);
  window.DokeHomeDrawerHardClose = () => setOpen(false);
  window.DokeOpenHomeDrawerDirect = () => setOpen(true);
  window.DokeCloseHomeDrawerDirect = () => setOpen(false);

  const autoBind = () => {
    if (!document.body?.classList.contains('home-index-shell')) return;
    if (document.documentElement.dataset.homeDrawerStableBound === 'true') return;
    document.documentElement.dataset.homeDrawerStableBound = 'true';
    bindDrawer();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBind, { once: true });
  } else {
    autoBind();
  }
})();
