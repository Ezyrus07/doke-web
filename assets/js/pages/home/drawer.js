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
