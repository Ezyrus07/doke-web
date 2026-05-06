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
          pane.classList.toggle('is-active', isActive);
        });

        safeNavButtons.forEach((button) => {
          const isActive = button.dataset.moreFiltersNav === section;
          button.classList.toggle('is-active', isActive);
          button.setAttribute('aria-selected', String(isActive));
        });
      };

      const mountPanel = (source = 'tabs') => {
        if (!panel) return;

        const shouldUseSearchHost = source === 'search-dropdown' || source === 'hero-field';
        const nextHost = shouldUseSearchHost ? searchHost : tabsHost;

        if (mobileMedia?.matches) {
          if (nextHost && panel.parentElement !== nextHost) {
            nextHost.appendChild(panel);
          }
          return;
        }
        if (nextHost && panel.parentElement !== nextHost) {
          nextHost.appendChild(panel);
        }
      };

      const open = (source = 'tabs') => {
        if (!safeToggles.length || !panel) return;

        mountPanel(source);

        if (source === 'search-dropdown' || source === 'hero-field') {
          document.dispatchEvent(new CustomEvent('doke:home-search-close'));
        }

        document.body.classList.remove('home-search-overlay-active', 'mobile-search-active', 'home-inline-filters-open');
        document.body.classList.toggle('home-filter-sheet-open', Boolean(mobileMedia?.matches));
        document.body.classList.toggle('home-inline-filters-open', !mobileMedia?.matches);

        setSection('quick');
        panel.hidden = false;
        panel.classList.add('is-open');
        safeToggles.forEach((toggle) => {
          const sameSource = (toggle.dataset.moreFiltersSource || 'tabs') === source;
          toggle.setAttribute('aria-expanded', sameSource ? 'true' : 'false');
        });
      };

      const close = () => {
        if (!safeToggles.length || !panel) return;

        panel.hidden = true;
        panel.classList.remove('is-open');
        document.body.classList.remove('home-mobile-filters-open', 'home-inline-filters-open', 'home-filter-sheet-open');
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
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            const source = toggle.dataset.moreFiltersSource || 'tabs';
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

        document.addEventListener('click', (event) => {
          if (!panel || panel.hidden) return;

          const clickedToggle = event.target.closest('[data-more-filters-toggle]');
          const clickedInsidePanel = Boolean(event.target.closest('[data-more-filters-panel]'));

          if (mobileMedia?.matches) {
            const clickedBackdrop = event.target === panel;
            const clickedPanelContent = Boolean(event.target.closest('.more-filters__header, .more-filters__split-body, .more-filters__actions'));
            if ((clickedBackdrop || (!clickedPanelContent && !clickedToggle)) && !clickedToggle) close();
            return;
          }

          if (!clickedInsidePanel && !clickedToggle) close();
        }, { signal });

        mobileMedia?.addEventListener('change', () => {
          if (panel.hidden) {
            setSection('service');
            return;
          }

          if (mobileMedia.matches) {
            document.body.classList.remove('home-inline-filters-open');
            document.body.classList.add('home-filter-sheet-open');
            mountPanel('hero-field');
            setSection('service');
            return;
          }

          document.body.classList.remove('home-mobile-filters-open', 'home-filter-sheet-open');
          document.body.classList.add('home-inline-filters-open');
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

        const api = { open, close, setSection, mountPanel };
        window.DokeHomeFiltersApi = api;
        return api;
      };

      return bind();
    }
  };
})();



/* More services defensive binder.
   Keeps "Mais anúncios" usable even if another home initializer aborts before wiring filters. */
(function () {
  const state = {
    initialized: false
  };

  const isMobile = () => window.matchMedia && window.matchMedia("(max-width: 760px)").matches;

  const getEls = () => ({
    section: document.querySelector("section.more-services"),
    toggles: Array.from(document.querySelectorAll("[data-more-filters-toggle]")),
    panel: document.querySelector("[data-more-filters-panel]"),
    tabsHost: document.querySelector("[data-more-filters-tabs-host]"),
    cardsRail: document.querySelector("section.more-services .more-services__cards-rail"),
    grid: document.querySelector("[data-more-services-grid]")
  });

  const repairCards = () => {
    const { section, tabsHost, cardsRail, grid } = getEls();
    if (!section || !cardsRail || !grid) return;

    if (tabsHost && tabsHost.contains(cardsRail)) {
      section.insertBefore(cardsRail, section.querySelector(".featured-pros") || null);
    }

    const limit = Number.parseInt(grid.dataset.moreServicesLimit || "6", 10);
    Array.from(grid.querySelectorAll(":scope > .doke-ad-card")).forEach((card, index) => {
      if (index < limit) {
        card.hidden = false;
        card.removeAttribute("hidden");
      }
    });

    section.classList.add("more-services--cards-ready");
  };

  const setOpen = (open, source = "tabs") => {
    const { panel, toggles } = getEls();
    if (!panel) return;

    panel.hidden = !open;
    if (open) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
    }
    panel.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");

    document.body.classList.toggle("home-filter-sheet-open", open && isMobile());
    document.body.classList.toggle("home-inline-filters-open", open && !isMobile());
    document.body.classList.remove("home-search-overlay-active", "mobile-search-active");

    toggles.forEach((toggle) => {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("is-active", open && ((toggle.dataset.moreFiltersSource || "tabs") === source));
    });
  };

  const bind = () => {
    if (state.initialized) return;
    state.initialized = true;

    repairCards();

    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-more-filters-toggle]");
      if (toggle) {
        const { panel } = getEls();
        if (!panel) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        repairCards();
        setOpen(panel.hidden, toggle.dataset.moreFiltersSource || "tabs");
        return;
      }

      if (event.target.closest("[data-more-filters-close], [data-more-filters-apply]")) {
        setOpen(false);
        return;
      }

      const { panel } = getEls();
      if (!panel || panel.hidden) return;

      if (!event.target.closest("[data-more-filters-panel]")) {
        setOpen(false);
      }
    }, true);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });

    window.DokeMoreServicesRepair = {
      open: () => {
        repairCards();
        setOpen(true);
      },
      close: () => setOpen(false),
      repairCards
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }
})();
