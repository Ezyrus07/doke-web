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

/* Home mobile filter sheet resilience contract.
   The filter button must open a visible fixed sheet on mobile even if another
   initializer moves the panel host or stops event propagation. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 760px)').matches ?? window.innerWidth <= 760;

  const getPanel = () => document.querySelector('[data-more-filters-panel]');
  const getToggles = () => Array.from(document.querySelectorAll('[data-more-filters-toggle]'));
  const getTabsHost = () => document.querySelector('[data-more-filters-tabs-host]');

  const setSection = (section = 'quick') => {
    document.querySelectorAll('[data-more-filters-section]').forEach((pane) => {
      const active = pane.dataset.moreFiltersSection === section;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });
    document.querySelectorAll('[data-more-filters-nav]').forEach((button) => {
      const active = button.dataset.moreFiltersNav === section;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const mountForMobile = () => {
    const panel = getPanel();
    if (!panel) return null;
    if (isMobile() && panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    } else if (!isMobile()) {
      const host = getTabsHost();
      if (host && panel.parentElement !== host) host.appendChild(panel);
    }
    return panel;
  };

  const setOpen = (open, source = 'tabs') => {
    const panel = mountForMobile();
    if (!panel) return;

    if (open) {
      panel.hidden = false;
      panel.removeAttribute('hidden');
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      setSection('quick');
    } else {
      panel.hidden = true;
      panel.setAttribute('hidden', '');
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    }

    document.body.classList.toggle('home-filter-sheet-open', open && isMobile());
    document.body.classList.toggle('home-inline-filters-open', open && !isMobile());
    document.body.classList.remove('home-search-overlay-active', 'mobile-search-active', 'home-mobile-filters-open');

    getToggles().forEach((toggle) => {
      const sameSource = (toggle.dataset.moreFiltersSource || 'tabs') === source;
      toggle.setAttribute('aria-expanded', open && sameSource ? 'true' : 'false');
      toggle.classList.toggle('is-active', open && sameSource);
    });
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeFilterSheetRescueBound === 'true') return;
    document.documentElement.dataset.homeFilterSheetRescueBound = 'true';

    document.addEventListener('click', (event) => {
      const toggle = event.target.closest('[data-more-filters-toggle], .home-search-hero__filter-button, .filter-toggle');
      if (toggle) {
        const panel = getPanel();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        const shouldOpen = !panel || panel.hidden || !panel.classList.contains('is-open');
        setOpen(shouldOpen, toggle.dataset.moreFiltersSource || 'tabs');
        return;
      }

      if (event.target.closest('[data-more-filters-close], [data-more-filters-apply]')) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      const panel = getPanel();
      if (!panel || panel.hidden || !isMobile()) return;
      const clickedPanel = event.target.closest('[data-more-filters-panel]');
      if (!clickedPanel) setOpen(false);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    window.addEventListener('resize', () => {
      const panel = getPanel();
      if (!panel || panel.hidden) return;
      mountForMobile();
      document.body.classList.toggle('home-filter-sheet-open', isMobile());
      document.body.classList.toggle('home-inline-filters-open', !isMobile());
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();


/* HOME FILTER SHEET HARD BINDER v21
   Pointer-first fallback. Opens the actual filter panel above the blurred page,
   independent from the progressive home initializer. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 760px)').matches ?? window.innerWidth <= 760;
  const toggleSelector = '[data-more-filters-toggle], .filter-toggle, .home-search-hero__filter-button';

  const panel = () => document.querySelector('[data-more-filters-panel]');
  const toggles = () => Array.from(document.querySelectorAll('[data-more-filters-toggle], .filter-toggle'));

  const setSection = (section = 'quick') => {
    const panes = Array.from(document.querySelectorAll('[data-more-filters-section]'));
    const targetExists = panes.some((pane) => pane.dataset.moreFiltersSection === section);
    const next = targetExists ? section : (panes[0]?.dataset.moreFiltersSection || section);

    panes.forEach((pane) => {
      const active = pane.dataset.moreFiltersSection === next;
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });

    document.querySelectorAll('[data-more-filters-nav]').forEach((button) => {
      const active = button.dataset.moreFiltersNav === next;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const mount = () => {
    const el = panel();
    if (!el) return null;

    if (isMobile() && el.parentElement !== document.body) {
      document.body.appendChild(el);
    } else if (!isMobile()) {
      const host = document.querySelector('[data-more-filters-tabs-host]');
      if (host && el.parentElement !== host) host.appendChild(el);
    }

    return el;
  };

  const setOpen = (open, source = 'tabs') => {
    const el = mount();
    if (!el) return false;

    if (open) {
      el.hidden = false;
      el.removeAttribute('hidden');
      el.classList.add('is-open');
      el.dataset.filterSheetState = 'open';
      el.setAttribute('aria-hidden', 'false');
      setSection('quick');
    } else {
      el.classList.remove('is-open');
      el.dataset.filterSheetState = 'closed';
      el.setAttribute('aria-hidden', 'true');
      el.hidden = true;
      el.setAttribute('hidden', '');
    }

    document.body.classList.toggle('home-filter-sheet-open', open && isMobile());
    document.body.classList.toggle('home-inline-filters-open', open && !isMobile());
    document.body.classList.remove('mobile-home-drawer-open', 'home-search-overlay-active', 'mobile-search-active', 'home-mobile-filters-open');

    toggles().forEach((toggle) => {
      const sameSource = (toggle.dataset.moreFiltersSource || 'tabs') === source || toggle.classList.contains('filter-toggle');
      toggle.setAttribute('aria-expanded', open && sameSource ? 'true' : 'false');
      toggle.classList.toggle('is-active', open && sameSource);
    });

    return true;
  };

  const onToggle = (event) => {
    if (!isHome()) return;
    const trigger = event.target.closest(toggleSelector);
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const el = panel();
    const shouldOpen = !el || el.hidden || !el.classList.contains('is-open') || el.dataset.filterSheetState !== 'open';
    setOpen(shouldOpen, trigger.dataset.moreFiltersSource || 'tabs');
  };

  const onClose = (event) => {
    if (!isHome()) return;

    if (event.target.closest('[data-more-filters-close], [data-more-filters-apply]')) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }

    const el = panel();
    if (!el || el.hidden || !isMobile()) return;

    if (!event.target.closest('[data-more-filters-panel]') && !event.target.closest(toggleSelector)) {
      setOpen(false);
    }
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeFilterHardBound === 'true') return;
    document.documentElement.dataset.homeFilterHardBound = 'true';

    document.addEventListener('pointerdown', onToggle, true);
    document.addEventListener('click', onToggle, true);
    document.addEventListener('click', onClose, true);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    }, true);

    window.DokeHomeFilterHardOpen = () => setOpen(true, 'tabs');
    window.DokeHomeFilterHardClose = () => setOpen(false);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();


/* HOME SEARCH PILL FILTER DIRECT BINDER v22
   Directly supports the mobile search pill filter button in index.html. */
(function () {
  const isHome = () => document.body?.classList.contains('home-index-shell');
  const isMobile = () => window.matchMedia?.('(max-width: 760px)').matches ?? window.innerWidth <= 760;

  const panel = () => document.querySelector('[data-more-filters-panel]');
  const triggerSelector = '.home-search-hero__button[data-more-filters-toggle], [data-more-filters-toggle]';

  const openPanel = () => {
    const el = panel();
    if (!el) return false;

    if (isMobile() && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }

    el.hidden = false;
    el.removeAttribute('hidden');
    el.classList.add('is-open');
    el.dataset.filterSheetState = 'open';
    el.setAttribute('aria-hidden', 'false');

    document.body.classList.add('home-filter-sheet-open');
    document.body.classList.remove('home-inline-filters-open', 'home-search-overlay-active', 'mobile-search-active');

    document.querySelectorAll('[data-more-filters-section]').forEach((pane, index) => {
      const active = pane.dataset.moreFiltersSection === 'quick' || (index === 0 && !document.querySelector('[data-more-filters-section="quick"]'));
      pane.hidden = !active;
      pane.classList.toggle('is-active', active);
    });

    document.querySelectorAll(triggerSelector).forEach((button) => {
      button.setAttribute('aria-expanded', 'true');
      button.classList.add('is-active');
    });

    return true;
  };

  const closePanel = () => {
    const el = panel();
    if (!el) return;
    el.classList.remove('is-open');
    el.dataset.filterSheetState = 'closed';
    el.setAttribute('aria-hidden', 'true');
    el.hidden = true;
    el.setAttribute('hidden', '');
    document.body.classList.remove('home-filter-sheet-open', 'home-inline-filters-open');
    document.querySelectorAll(triggerSelector).forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      button.classList.remove('is-active');
    });
  };

  const bind = () => {
    if (!isHome() || document.documentElement.dataset.homeSearchPillFilterBound === 'true') return;
    document.documentElement.dataset.homeSearchPillFilterBound = 'true';

    document.addEventListener('pointerdown', (event) => {
      const trigger = event.target.closest(triggerSelector);
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();

      const el = panel();
      const isOpen = el && !el.hidden && el.classList.contains('is-open');
      if (isOpen) closePanel();
      else openPanel();
    }, true);

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest(triggerSelector);
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        return;
      }

      const el = panel();
      if (!el || el.hidden || !isMobile()) return;
      if (!event.target.closest('[data-more-filters-panel]')) closePanel();
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePanel();
    }, true);

    window.DokeOpenHomeFiltersDirect = openPanel;
    window.DokeCloseHomeFiltersDirect = closePanel;
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();

