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

  const SETTINGS_STORAGE_KEY = 'doke.settings.local.v1';
  const DEFAULT_SETTINGS = Object.freeze({
    notifications: Object.freeze({
      messages: true,
      orders: true,
      budgets: true,
      payments: true,
      community: false
    }),
    privacy: Object.freeze({
      publicProfile: true,
      showPhone: false,
      searchable: true
    })
  });

  const cloneSettings = (value) => JSON.parse(JSON.stringify(value));

  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const mergeSettings = (base, override) => {
    const next = cloneSettings(base || {});
    if (!isPlainObject(override)) return next;

    Object.keys(override).forEach((key) => {
      if (isPlainObject(next[key]) && isPlainObject(override[key])) {
        next[key] = mergeSettings(next[key], override[key]);
        return;
      }
      if (typeof override[key] === 'boolean') next[key] = override[key];
    });

    return next;
  };

  const readStoredSettings = () => {
    try {
      const raw = window.localStorage?.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return cloneSettings(DEFAULT_SETTINGS);
      return mergeSettings(DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (error) {
      console.warn('[Doke] Não foi possível ler as preferências de configurações.', error);
      return cloneSettings(DEFAULT_SETTINGS);
    }
  };

  let settingsState = readStoredSettings();

  const saveSettings = () => {
    try {
      window.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsState));
    } catch (error) {
      console.warn('[Doke] Não foi possível salvar as preferências de configurações.', error);
    }
  };

  const getSettingValue = (path) => {
    if (!path) return undefined;
    return String(path).split('.').reduce((acc, key) => (isPlainObject(acc) ? acc[key] : undefined), settingsState);
  };

  const setSettingValue = (path, value) => {
    const keys = String(path || '').split('.').filter(Boolean);
    if (!keys.length) return false;

    let cursor = settingsState;
    keys.slice(0, -1).forEach((key) => {
      if (!isPlainObject(cursor[key])) cursor[key] = {};
      cursor = cursor[key];
    });

    const lastKey = keys[keys.length - 1];
    if (cursor[lastKey] === value) return false;
    cursor[lastKey] = value;
    return true;
  };

  const preferenceInputs = Array.from(document.querySelectorAll('[data-settings-preference]'));
  const narrowBreakpoint = 1024;

  const isMobileSettings = () => window.innerWidth <= 760;
  const isNarrowSettings = () => window.innerWidth <= narrowBreakpoint;

  const getAvailablePanelNames = () => new Set(panels.map((panel) => panel.dataset.settingsPanel).filter(Boolean));

  const normalizePanelName = (panelName) => {
    const normalized = String(panelName || '').trim().replace(/^#/, '');
    if (!normalized) return '';
    return getAvailablePanelNames().has(normalized) ? normalized : '';
  };

  const getPanelFromLocation = () => {
    const params = new URLSearchParams(window.location.search);
    return normalizePanelName(params.get('tab') || params.get('settings') || window.location.hash);
  };

  const syncLocationPanel = (panelName) => {
    const normalized = normalizePanelName(panelName);
    if (!normalized || !window.history?.replaceState) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get('tab') === normalized && !url.hash) return;

    url.searchParams.set('tab', normalized);
    url.hash = '';
    window.history.replaceState({ settingsPanel: normalized }, '', `${url.pathname}${url.search}`);
  };

  const setNarrowMenuMode = (isMenuMode) => {
    if (!isNarrowSettings()) {
      pageBody.classList.remove('settings-mobile-menu-mode', 'settings-narrow-menu-mode', 'settings-narrow-panel-mode');
      return;
    }

    pageBody.classList.toggle('settings-narrow-menu-mode', isMenuMode);
    pageBody.classList.toggle('settings-narrow-panel-mode', !isMenuMode);
    pageBody.classList.toggle('settings-mobile-menu-mode', isMenuMode && isMobileSettings());
  };

  const activateTab = (panelName, { scroll = true, updateLocation = true } = {}) => {
    const normalizedPanelName = normalizePanelName(panelName);
    if (!normalizedPanelName) return;

    sidebarItems.forEach((button) => {
      const isActive = button.dataset.settingsTab === normalizedPanelName;
      button.classList.toggle('is-active', isActive);
      if (button.dataset.settingsTab) {
        button.setAttribute('aria-selected', String(isActive));
        button.setAttribute('aria-current', isActive ? 'page' : 'false');
      }
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.settingsPanel === normalizedPanelName;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });

    if (updateLocation) syncLocationPanel(normalizedPanelName);

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
    button.addEventListener('click', () => {
      if (!button.dataset.settingsTab) return;
      activateTab(button.dataset.settingsTab);
    }, { signal });
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


  const syncPreferenceInputs = () => {
    preferenceInputs.forEach((input) => {
      const value = getSettingValue(input.dataset.settingsPreference);
      if (typeof value !== 'boolean') return;
      input.checked = value;
      input.closest('.settings-list-item')?.classList.toggle('is-disabled', !value);
    });
  };

  preferenceInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const preferencePath = input.dataset.settingsPreference;
      if (!preferencePath) return;
      const changed = setSettingValue(preferencePath, Boolean(input.checked));
      input.closest('.settings-list-item')?.classList.toggle('is-disabled', !input.checked);
      if (!changed) return;
      saveSettings();
      document.dispatchEvent(new CustomEvent('doke:settings-updated', {
        detail: {
          path: preferencePath,
          value: Boolean(input.checked),
          settings: cloneSettings(settingsState)
        }
      }));
    }, { signal });
  });

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
    const initialPanel = getPanelFromLocation() || document.querySelector('.settings-sidebar__item.is-active')?.dataset.settingsTab || sidebarItems.find((item) => item.dataset.settingsTab)?.dataset.settingsTab;
    if (initialPanel) {
      activateTab(initialPanel, { scroll: false, updateLocation: Boolean(getPanelFromLocation()) });
    }

    filterSettings('');
    syncPreferenceInputs();
    updateSearchClearState();
    setMobileSearchOpen(false);

    setNarrowMenuMode(isNarrowSettings());

    document.querySelector('.settings-sidebar')?.removeAttribute('hidden');
  };

  let wasNarrow = isNarrowSettings();
  let resizeRaf = null;
  window.addEventListener('popstate', () => {
    const panelFromLocation = getPanelFromLocation();
    if (panelFromLocation) activateTab(panelFromLocation, { scroll: false, updateLocation: false });
  }, { signal });

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
