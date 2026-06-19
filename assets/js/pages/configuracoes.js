(function () {
  'use strict';

  const controller = new AbortController();
  const { signal } = controller;

  const pageBody = document.body;
  const sidebarItems = Array.from(document.querySelectorAll('.settings-sidebar__item'));
  const panels = Array.from(document.querySelectorAll('.settings-panel'));
  const sectionBlocks = Array.from(document.querySelectorAll('.settings-sidebar__section'));
  const searchInputs = Array.from(document.querySelectorAll('[data-settings-search-input], .settings-sidebar-search__input'));
  const mobileSearchToggle = document.querySelector('[data-settings-mobile-search-toggle]');
  const mobileSearchClose = document.querySelector('[data-settings-mobile-search-close]');
  const mobileSearchForm = document.querySelector('.settings-mobile-header__search');
  const mobileSearchInput = document.querySelector('.settings-mobile-header__search-input');
  const mobileBackButton = document.querySelector('[data-settings-mobile-back]');

  const isMobileSettings = () => window.innerWidth <= 760;

  const setMobileMenuMode = (isMenuMode) => {
    if (!isMobileSettings()) {
      pageBody.classList.remove('settings-mobile-menu-mode');
      return;
    }

    pageBody.classList.toggle('settings-mobile-menu-mode', isMenuMode);
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

    if (isMobileSettings()) {
      pageBody.classList.remove('settings-mobile-menu-mode');
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

  const syncSearchInputs = (source) => {
    const value = source?.value || '';
    searchInputs.forEach((input) => {
      if (input !== source) input.value = value;
    });
    filterSettings(value);
  };

  const setMobileSearchOpen = (open) => {
    if (!mobileSearchForm || !mobileSearchToggle) return;
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
    setMobileMenuMode(true);
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
    setMobileSearchOpen(false);

    if (isMobileSettings()) {
      pageBody.classList.add('settings-mobile-menu-mode');
    } else {
      pageBody.classList.remove('settings-mobile-menu-mode');
    }

    document.querySelector('.settings-sidebar')?.removeAttribute('hidden');
  };

  let wasMobile = isMobileSettings();
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const isMobile = isMobileSettings();
      if (isMobile && !wasMobile) {
        pageBody.classList.add('settings-mobile-menu-mode');
      }
      if (!isMobile) {
        pageBody.classList.remove('settings-mobile-menu-mode');
        setMobileSearchOpen(false);
      }
      wasMobile = isMobile;
    });
  }, { signal });

  initState();
})();
