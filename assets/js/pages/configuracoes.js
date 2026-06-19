(function () {
  'use strict';

  const controller = new AbortController();
  const { signal } = controller;

  const pageBody = document.body;
  const sidebarItems = Array.from(document.querySelectorAll('.settings-sidebar__item'));
  const panels = Array.from(document.querySelectorAll('.settings-panel'));
  const sectionBlocks = Array.from(document.querySelectorAll('.settings-sidebar__section'));
  const searchInputs = Array.from(document.querySelectorAll('[data-settings-search-input], .settings-sidebar-search__input'));
  const sidebarSearchForms = Array.from(document.querySelectorAll('.settings-sidebar-search'));
  const searchClearButtons = Array.from(document.querySelectorAll('[data-settings-search-clear]'));
  const mobileSearchToggle = document.querySelector('[data-settings-mobile-search-toggle]');
  const mobileSearchClose = document.querySelector('[data-settings-mobile-search-close]');
  const mobileSearchForm = document.querySelector('.settings-mobile-header__search');
  const mobileSearchInput = document.querySelector('.settings-mobile-header__search-input');
  const mobileBackButton = document.querySelector('[data-settings-mobile-back]');
  const narrowBreakpoint = 1024;

  const isMobileSettings = () => window.innerWidth <= 760;
  const isNarrowSettings = () => window.innerWidth <= narrowBreakpoint;

  const setNarrowMenuMode = (isMenuMode) => {
    if (!isNarrowSettings()) {
      pageBody.classList.remove('settings-mobile-menu-mode', 'settings-narrow-menu-mode', 'settings-narrow-panel-mode');
      return;
    }

    pageBody.classList.toggle('settings-narrow-menu-mode', isMenuMode);
    pageBody.classList.toggle('settings-narrow-panel-mode', !isMenuMode);
    pageBody.classList.toggle('settings-mobile-menu-mode', isMenuMode && isMobileSettings());
  };

  const activateTab = (panelName, { scroll = true } = {}) => {
    if (!panelName) return;

    sidebarItems.forEach((button) => {
      const isActive = button.dataset.settingsTab === panelName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.settingsPanel === panelName;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });

    if (isNarrowSettings()) {
      setNarrowMenuMode(false);
      document.querySelector('.settings-main')?.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (scroll) {
      document.querySelector('.settings-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const updateSectionVisibility = () => {
    sectionBlocks.forEach((section) => {
      const items = Array.from(section.querySelectorAll('.settings-sidebar__item'));
      section.hidden = !items.some((item) => !item.hidden);
    });
  };

  const filterSettings = (rawQuery) => {
    const query = String(rawQuery || '').trim().toLowerCase();

    sidebarItems.forEach((item) => {
      const label = item.textContent.toLowerCase();
      item.hidden = Boolean(query) && !label.includes(query);
    });

    updateSectionVisibility();

    const activeButton = sidebarItems.find((item) => item.classList.contains('is-active') && !item.hidden);
    if (!activeButton) {
      const firstVisible = sidebarItems.find((item) => !item.hidden);
      if (firstVisible) {
        sidebarItems.forEach((item) => item.classList.remove('is-active'));
        firstVisible.classList.add('is-active');
      }
    }
  };

  const updateSearchClearState = () => {
    const hasValue = searchInputs.some((input) => Boolean(input.value.trim()));
    sidebarSearchForms.forEach((form) => form.classList.toggle('has-value', hasValue));
    searchClearButtons.forEach((button) => {
      button.setAttribute('aria-disabled', String(!hasValue));
    });
  };

  const syncSearchInputs = (source) => {
    const value = source?.value || '';
    searchInputs.forEach((input) => {
      if (input !== source) input.value = value;
    });
    filterSettings(value);
    updateSearchClearState();
  };

  const setMobileSearchOpen = (open) => {
    if (!mobileSearchToggle) return;

    if (!mobileSearchForm) {
      mobileSearchToggle.setAttribute('aria-expanded', 'false');
      if (open) {
        document.querySelector('[data-settings-search-input], .settings-sidebar-search__input')?.focus();
      }
      return;
    }

    mobileSearchForm.hidden = !open;
    mobileSearchToggle.setAttribute('aria-expanded', String(open));
    document.querySelector('.settings-mobile-header')?.classList.toggle('is-search-open', open);
    if (open) {
      mobileSearchInput?.focus();
      return;
    }
    mobileSearchInput?.blur();
  };

  sidebarItems.forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.settingsTab), { signal });
  });

  searchInputs.forEach((input) => {
    input.addEventListener('input', () => syncSearchInputs(input), { signal });
  });

  sidebarSearchForms.forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      syncSearchInputs(form.querySelector('[data-settings-search-input], .settings-sidebar-search__input'));
    }, { signal });
  });

  searchClearButtons.forEach((button) => {
    button.addEventListener('click', () => {
      searchInputs.forEach((input) => {
        input.value = '';
      });
      filterSettings('');
      updateSearchClearState();
      button.closest('.settings-sidebar-search')?.querySelector('[data-settings-search-input], .settings-sidebar-search__input')?.focus();
    }, { signal });
  });

  mobileSearchToggle?.addEventListener('click', () => {
    const isOpen = mobileSearchToggle.getAttribute('aria-expanded') === 'true';
    setMobileSearchOpen(!isOpen);
  }, { signal });

  mobileSearchClose?.addEventListener('click', () => setMobileSearchOpen(false), { signal });

  mobileSearchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    filterSettings(mobileSearchInput?.value || '');
  }, { signal });

  mobileBackButton?.addEventListener('click', () => {
    setMobileSearchOpen(false);
    setNarrowMenuMode(true);
  }, { signal });

  document.querySelectorAll('.settings-card__footer .button--ghost').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const card = button.closest('.settings-card');
      card?.querySelectorAll('input').forEach((input) => {
        if ('defaultValue' in input) input.value = input.defaultValue;
      });
    }, { signal });
  });

  if (window.DokeHomeDrawer?.create) {
    const initDrawer = window.DokeHomeDrawer.create({ signal });
    if (typeof initDrawer === 'function') initDrawer();
  }

  const initState = () => {
    const initialPanel = document.querySelector('.settings-sidebar__item.is-active')?.dataset.settingsTab || sidebarItems[0]?.dataset.settingsTab;
    if (initialPanel) {
      panels.forEach((panel) => {
        const isActive = panel.dataset.settingsPanel === initialPanel;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    }

    filterSettings('');
    updateSearchClearState();
    setMobileSearchOpen(false);

    setNarrowMenuMode(isNarrowSettings());

    document.querySelector('.settings-sidebar')?.removeAttribute('hidden');
  };

  let wasNarrow = isNarrowSettings();
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const isNarrow = isNarrowSettings();
      if (isNarrow && !wasNarrow) {
        setNarrowMenuMode(true);
      }
      if (!isNarrow) {
        setNarrowMenuMode(false);
        setMobileSearchOpen(false);
      }
      wasNarrow = isNarrow;
    });
  }, { signal });

  initState();
})();
