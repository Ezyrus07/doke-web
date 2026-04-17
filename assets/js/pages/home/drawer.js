(function () {
  window.DokeHomeDrawer = {
    create({ signal }) {
      return function initMobileHomeDrawer() {
        const drawer = document.querySelector('[data-mobile-home-drawer]');
        if (!drawer) return;

        const panel = drawer.querySelector('.home-mobile-drawer__panel');
        const openButtons = document.querySelectorAll('[data-mobile-home-menu-open]');

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
          event?.preventDefault();
          event?.stopPropagation();
          setOpen(true);
        };

        const closeMenu = (event) => {
          event?.preventDefault();
          event?.stopPropagation();
          setOpen(false);
        };

        openButtons.forEach((button) => {
          button.addEventListener('click', openMenu, { signal });
        });

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
          if (window.innerWidth > 768 && drawer.classList.contains('is-open')) {
            setOpen(false);
          }
        }, { signal });
      };
    }
  };
})();
