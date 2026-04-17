(function () {
  window.DokeHomeDrawer = {
    create({ signal }) {
      return function initMobileHomeDrawer() {
        const drawer = document.querySelector('[data-mobile-home-drawer]');
        if (!drawer) return;

        const panel = drawer.querySelector('.home-mobile-drawer__panel');
        const shouldUseDrawer = () => window.innerWidth <= 760;

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
          if (window.innerWidth > 760 && drawer.classList.contains('is-open')) {
            setOpen(false);
          }
        }, { signal });
      };
    }
  };
})();
