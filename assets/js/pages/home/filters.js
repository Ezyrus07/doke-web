(function () {
  window.DokeHomeFilters = {
    create({
      signal,
      toggles,
      panel,
      closeButtons,
      applyButton,
      tabsHost,
      searchHost,
      navButtons,
      sections,
      mobileMedia,
      leadingButton
    }) {
      const safeToggles = Array.from(toggles || []);
      const safeCloseButtons = Array.from(closeButtons || []);
      const safeNavButtons = Array.from(navButtons || []);
      const safeSections = Array.from(sections || []);

      const setSection = (section = 'service') => {
        if (!safeSections.length) return;

        safeSections.forEach((pane) => {
          const isActive = pane.dataset.moreFiltersSection === section;
          pane.hidden = !isActive;
        });

        safeNavButtons.forEach((button) => {
          const isActive = button.dataset.moreFiltersNav === section;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', String(isActive));
        });
      };

      const mountPanel = (source = 'tabs') => {
        if (!panel) return;

        if (mobileMedia?.matches) {
          if (panel.parentElement !== document.body) {
            document.body.appendChild(panel);
          }
          return;
        }

        const shouldUseSearchHost = source === 'search-dropdown' || source === 'hero-field';
        const nextHost = shouldUseSearchHost ? searchHost : tabsHost;
        if (nextHost && panel.parentElement !== nextHost) {
          nextHost.appendChild(panel);
        }
      };

      const open = (source = 'tabs') => {
        if (!safeToggles.length || !panel) return;

        mountPanel(source);

        if (source === 'search-dropdown' || source === 'hero-field') {
          document.dispatchEvent(new CustomEvent('doke:home-search-close'));
          document.body.classList.add('home-mobile-filters-open');
          if (mobileMedia?.matches) {
            searchHost?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          document.body.classList.remove('home-mobile-filters-open');
        }

        setSection(source === 'tabs' ? 'quick' : 'service');
        panel.hidden = false;
        safeToggles.forEach((toggle) => {
          const sameSource = (toggle.dataset.moreFiltersSource || 'tabs') === source;
          toggle.setAttribute('aria-expanded', sameSource ? 'true' : 'false');
        });
      };

      const close = () => {
        if (!safeToggles.length || !panel) return;

        panel.hidden = true;
        document.body.classList.remove('home-mobile-filters-open');
        safeToggles.forEach((toggle) => {
          toggle.setAttribute('aria-expanded', 'false');
        });
        mountPanel('tabs');
        setSection('service');
      };

      const bind = () => {
        if (!safeToggles.length || !panel) return { open, close, setSection, mountPanel };

        close();

        safeToggles.forEach((toggle) => {
          toggle.addEventListener('click', (event) => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            const source = toggle.dataset.moreFiltersSource || 'tabs';
            event.preventDefault();
            event.stopPropagation();
            if (isOpen) {
              close();
              return;
            }
            open(source);
          }, { signal });
        });

        safeCloseButtons.forEach((button) => {
          button.addEventListener('click', close, { signal });
        });

        applyButton?.addEventListener('click', close, { signal });

        safeNavButtons.forEach((button) => {
          button.addEventListener('click', () => {
            setSection(button.dataset.moreFiltersNav || 'service');
          }, { signal });
        });

        mobileMedia?.addEventListener('change', () => {
          if (panel.hidden) {
            setSection('service');
            return;
          }

          if (mobileMedia.matches) {
            document.body.classList.add('home-mobile-filters-open');
            mountPanel('hero-field');
            setSection('service');
            return;
          }

          document.body.classList.remove('home-mobile-filters-open');
          mountPanel('tabs');
          safeSections.forEach((pane) => {
            pane.hidden = false;
          });
        }, { signal });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            close();
          }
        }, { signal });

        return { open, close, setSection, mountPanel };
      };

      return bind();
    }
  };
})();
