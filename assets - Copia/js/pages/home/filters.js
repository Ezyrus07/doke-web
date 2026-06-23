(function () {
  const DESKTOP_QUERY = '(min-width: 761px)';

  const isDesktop = (media) => {
    if (media && typeof media.matches === 'boolean') return !media.matches;
    return window.matchMedia ? window.matchMedia(DESKTOP_QUERY).matches : window.innerWidth > 760;
  };

  const getContext = () => 'tabs';

  window.DokeHomeFilters = {
    create({
      signal,
      toggles,
      panel,
      closeButtons,
      applyButton,
      tabsHost,
      navButtons,
      sections,
      mobileMedia
    }) {
      const safeToggles = Array.from(toggles || []);
      const safeCloseButtons = Array.from(closeButtons || []);
      const safeNavButtons = Array.from(navButtons || []);
      const safeSections = Array.from(sections || []);

      if (!panel) {
        const noop = () => {};
        return { open: noop, close: noop, setSection: noop, mountPanel: noop };
      }

      const setTriggerState = (open, source = 'tabs') => {
        safeToggles.forEach((toggle) => {
          const sameSource = (toggle.dataset.moreFiltersSource || 'tabs') === source;
          toggle.setAttribute('aria-expanded', open && sameSource ? 'true' : 'false');
          toggle.classList.toggle('is-active', open && sameSource);
        });
      };

      const setAllDesktopSections = () => {
        safeSections.forEach((pane) => {
          pane.hidden = false;
          pane.classList.add('is-active');
        });
        safeNavButtons.forEach((button) => {
          button.classList.remove('is-active');
          button.setAttribute('aria-selected', 'false');
        });
      };

      const setSection = (section = 'quick') => {
        if (!safeSections.length) return;

        if (isDesktop(mobileMedia)) {
          setAllDesktopSections();
          return;
        }

        safeSections.forEach((pane) => {
          const isActive = pane.dataset.moreFiltersSection === section;
          pane.hidden = !isActive;
          pane.classList.toggle('is-active', isActive);
        });

        safeNavButtons.forEach((button) => {
          const isActive = button.dataset.moreFiltersNav === section;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', String(isActive));
        });
      };

      const mountPanel = (source = 'tabs') => {
        const context = getContext(source);
        const targetHost = tabsHost;

        if (!isDesktop(mobileMedia)) {
          if (panel.parentElement !== document.body) document.body.appendChild(panel);
          return panel;
        }

        if (targetHost && panel.parentElement !== targetHost) {
          targetHost.appendChild(panel);
        }

        return panel;
      };

      const open = (source = 'tabs') => {
        const context = getContext(source);
        mountPanel(source);

        panel.dataset.filterContext = context;
        panel.hidden = false;
        panel.removeAttribute('hidden');
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');

        document.body.classList.toggle('home-filter-sheet-open', !isDesktop(mobileMedia));
        document.body.classList.toggle('home-inline-filters-open', isDesktop(mobileMedia));
        document.body.classList.remove('home-search-overlay-active', 'mobile-search-active', 'home-mobile-filters-open');

        setSection(isDesktop(mobileMedia) ? 'all' : 'quick');
        setTriggerState(true, source);
      };

      const close = () => {
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
        panel.hidden = true;
        panel.setAttribute('hidden', '');
        panel.dataset.filterContext = '';

        document.body.classList.remove('home-mobile-filters-open', 'home-inline-filters-open', 'home-filter-sheet-open');
        setTriggerState(false);

        if (isDesktop(mobileMedia)) mountPanel('tabs');
        setSection('quick');
      };

      close();

      safeToggles.forEach((toggle) => {
        toggle.addEventListener('click', (event) => {
          event.preventDefault();
          const source = toggle.dataset.moreFiltersSource || 'tabs';
          const context = getContext(source);
          const shouldClose = !panel.hidden && panel.classList.contains('is-open') && panel.dataset.filterContext === context;
          if (shouldClose) {
            close();
            return;
          }
          open(source);
        }, { signal });
      });

      safeCloseButtons.forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          close();
        }, { signal });
      });

      applyButton?.addEventListener('click', (event) => {
        event.preventDefault();
        close();
      }, { signal });

      safeNavButtons.forEach((button) => {
        button.addEventListener('click', () => {
          setSection(button.dataset.moreFiltersNav || 'quick');
        }, { signal });
      });

      document.addEventListener('click', (event) => {
        if (panel.hidden) return;
        if (event.target.closest('[data-more-filters-panel]')) return;
        if (event.target.closest('[data-more-filters-toggle]')) return;

        if (!isDesktop(mobileMedia)) close();
      }, { signal });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close();
      }, { signal });

      mobileMedia?.addEventListener('change', () => {
        if (panel.hidden) return;
        const context = panel.dataset.filterContext || 'tabs';
        mountPanel('tabs');
        document.body.classList.toggle('home-filter-sheet-open', !isDesktop(mobileMedia));
        document.body.classList.toggle('home-inline-filters-open', isDesktop(mobileMedia));
        setSection(isDesktop(mobileMedia) ? 'all' : 'quick');
      }, { signal });

      const api = { open, close, setSection, mountPanel };
      window.DokeHomeFiltersApi = api;
      return api;
    }
  };
})();
