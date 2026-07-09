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
  const securitySessionSummary = document.querySelector('[data-settings-session-summary]');
  const securitySessionMeta = document.querySelector('[data-settings-session-meta]');
  const securitySignOutButtons = Array.from(document.querySelectorAll('[data-settings-sign-out]'));

  const SETTINGS_STORAGE_KEY = 'doke.settings.local.v1';
  const DEFAULT_SETTINGS = Object.freeze({
    account: Object.freeze({
      fullName: 'Gabriel Oliveira',
      displayName: 'Gabriel',
      document: '123.456.789-00',
      phone: '(11) 99999-9999',
      email: 'gabriel@example.com'
    }),
    professional: Object.freeze({
      professionalName: 'Gabriel Oliveira',
      professionalType: 'Autônomo',
      professionalDescription: 'Atendimento residencial com foco em qualidade, prazo e comunicação clara.',
      mainCategory: 'Pintura',
      experience: 'Menos de 1 ano',
      baseCity: 'Salvador, BA',
      serviceRadius: 'Até 5 km',
      neighborhoods: '',
      receiveOrders: true,
      urgentAvailability: false
    }),
    notifications: Object.freeze({
      messages: true,
      orders: true,
      budgets: true,
      payments: true,
      community: false
    }),
    security: Object.freeze({
      twoFactor: false,
      loginAlerts: true
    }),
    privacy: Object.freeze({
      publicProfile: true,
      showPhone: false,
      searchable: true
    })
  });

  const cloneSettings = (value) => JSON.parse(JSON.stringify(value));

  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

  const isSupportedSettingValue = (value) => {
    if (['boolean', 'string', 'number'].includes(typeof value)) return true;
    if (value === null) return true;
    return false;
  };

  const mergeSettings = (base, override) => {
    const next = cloneSettings(base || {});
    if (!isPlainObject(override)) return next;

    Object.keys(override).forEach((key) => {
      if (isPlainObject(next[key]) && isPlainObject(override[key])) {
        next[key] = mergeSettings(next[key], override[key]);
        return;
      }
      if (isSupportedSettingValue(override[key])) next[key] = override[key];
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

  const getInputValue = (input) => {
    if (!input) return '';
    if (input.type === 'checkbox') return Boolean(input.checked);
    return String(input.value || '').trim();
  };

  const setInputValue = (input, value) => {
    if (!input) return;
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
      return;
    }
    input.value = value == null ? '' : String(value);
  };

  const preferenceInputs = Array.from(document.querySelectorAll('[data-settings-preference]'));
  const settingsFieldInputs = Array.from(document.querySelectorAll('[data-settings-field]'));
  const settingsSaveButtons = Array.from(document.querySelectorAll('[data-settings-save-panel]'));
  const settingsResetButtons = Array.from(document.querySelectorAll('[data-settings-reset-panel]'));
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

    const getCurrentSession = () => {
    try {
      return window.DokeAuth?.service?.getSession?.() || window.Doke?.session?.getSession?.() || null;
    } catch {
      return null;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const syncSecuritySessionSurface = () => {
    if (!securitySessionSummary && !securitySessionMeta) return;

    const session = getCurrentSession();
    const user = session?.user || null;
    const provider = session?.provider || 'mock';
    const issuedAt = formatDateTime(session?.issuedAt || session?.updatedAt);
    const userLabel = user?.email || user?.name || 'Usuário local';

    if (securitySessionSummary) {
      securitySessionSummary.textContent = user
        ? `Sessão ativa para ${userLabel}.`
        : 'Nenhuma sessão autenticada neste dispositivo.';
    }

    if (securitySessionMeta) {
      securitySessionMeta.textContent = user
        ? `Provedor ${provider}${issuedAt ? ` · iniciada em ${issuedAt}` : ''}.`
        : 'Entre novamente para acessar pedidos, mensagens e carteira.';
    }

    securitySignOutButtons.forEach((button) => {
      button.disabled = !user;
      button.setAttribute('aria-disabled', String(!user));
    });
  };

  const signOutFromSettings = async (button) => {
    if (!button || button.disabled) return;
    const originalLabel = button.dataset.settingsOriginalLabel || button.textContent.trim();
    button.dataset.settingsOriginalLabel = originalLabel;
    button.textContent = 'Saindo...';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      if (window.DokeAuth?.service?.logout) {
        await window.DokeAuth.service.logout({ redirect: true, redirectTo: 'auth/login.html' });
        return;
      }
      window.Doke?.session?.clear?.();
      window.location.assign('auth/login.html');
    } catch (error) {
      console.warn('[Doke] Não foi possível encerrar a sessão pelas configurações.', error);
      button.textContent = originalLabel;
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
    }
  };

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

  const getCurrentSession = () => {
    try {
      return window.DokeAuth?.service?.getSession?.() || window.Doke?.session?.getSession?.() || null;
    } catch {
      return null;
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const syncSecuritySessionSurface = () => {
    if (!securitySessionSummary && !securitySessionMeta) return;

    const session = getCurrentSession();
    const user = session?.user || null;
    const provider = session?.provider || 'mock';
    const issuedAt = formatDateTime(session?.issuedAt || session?.updatedAt);
    const userLabel = user?.email || user?.name || 'Usuário local';

    if (securitySessionSummary) {
      securitySessionSummary.textContent = user
        ? `Sessão ativa para ${userLabel}.`
        : 'Nenhuma sessão autenticada neste dispositivo.';
    }

    if (securitySessionMeta) {
      securitySessionMeta.textContent = user
        ? `Provedor ${provider}${issuedAt ? ` · iniciada em ${issuedAt}` : ''}.`
        : 'Entre novamente para acessar pedidos, mensagens e carteira.';
    }

    securitySignOutButtons.forEach((button) => {
      button.disabled = !user;
      button.setAttribute('aria-disabled', String(!user));
    });
  };

  const signOutFromSettings = async (button) => {
    if (!button || button.disabled) return;
    const originalLabel = button.dataset.settingsOriginalLabel || button.textContent.trim();
    button.dataset.settingsOriginalLabel = originalLabel;
    button.textContent = 'Saindo...';
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');

    try {
      if (window.DokeAuth?.service?.logout) {
        await window.DokeAuth.service.logout({ redirect: true, redirectTo: 'auth/login.html' });
        return;
      }
      window.Doke?.session?.clear?.();
      window.location.assign('auth/login.html');
    } catch (error) {
      console.warn('[Doke] Não foi possível encerrar a sessão pelas configurações.', error);
      button.textContent = originalLabel;
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
    }
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

  const syncSettingsFieldInputs = () => {
    settingsFieldInputs.forEach((input) => {
      const value = getSettingValue(input.dataset.settingsField);
      if (value === undefined) return;
      setInputValue(input, value);
    });
  };

  const getPanelFields = (panelName) => {
    const panel = document.querySelector(`[data-settings-panel="${panelName}"]`);
    if (!panel) return [];
    return settingsFieldInputs.filter((input) => panel.contains(input));
  };

  const collectPanelFields = (panelName) => {
    let changed = false;
    getPanelFields(panelName).forEach((input) => {
      const fieldPath = input.dataset.settingsField;
      if (!fieldPath) return;
      changed = setSettingValue(fieldPath, getInputValue(input)) || changed;
    });
    return changed;
  };

  const markPanelDirty = (input) => {
    const panel = input.closest('[data-settings-panel]');
    panel?.setAttribute('data-settings-dirty', 'true');
  };

  const setButtonSavedFeedback = (button) => {
    if (!button) return;
    const originalLabel = button.dataset.settingsOriginalLabel || button.textContent.trim();
    button.dataset.settingsOriginalLabel = originalLabel;
    button.textContent = 'Salvo';
    button.setAttribute('data-action-state', 'success');
    button.setAttribute('aria-busy', 'false');
    window.setTimeout(() => {
      button.textContent = originalLabel;
      button.setAttribute('data-action-state', 'idle');
    }, 1200);
  };

  const savePanelSettings = (panelName, button) => {
    const changed = collectPanelFields(panelName);
    const panel = document.querySelector(`[data-settings-panel="${panelName}"]`);
    panel?.setAttribute('data-settings-dirty', 'false');
    if (changed) saveSettings();
    setButtonSavedFeedback(button);
    document.dispatchEvent(new CustomEvent('doke:settings-updated', {
      detail: {
        section: panelName,
        settings: cloneSettings(settingsState)
      }
    }));
    document.dispatchEvent(new CustomEvent('doke:settings-profile-updated', {
      detail: {
        section: panelName,
        account: cloneSettings(settingsState.account || {}),
        professional: cloneSettings(settingsState.professional || {})
      }
    }));
  };

  const resetPanelFields = (panelName) => {
    getPanelFields(panelName).forEach((input) => {
      const value = getSettingValue(input.dataset.settingsField);
      if (value === undefined) return;
      setInputValue(input, value);
    });
    document.querySelector(`[data-settings-panel="${panelName}"]`)?.setAttribute('data-settings-dirty', 'false');
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

  settingsFieldInputs.forEach((input) => {
    input.addEventListener('input', () => markPanelDirty(input), { signal });
    input.addEventListener('change', () => markPanelDirty(input), { signal });
  });

  settingsSaveButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const panelName = normalizePanelName(button.dataset.settingsSavePanel);
      if (!panelName) return;
      savePanelSettings(panelName, button);
    }, { signal });
  });

  settingsResetButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const panelName = normalizePanelName(button.dataset.settingsResetPanel);
      if (!panelName) return;
      resetPanelFields(panelName);
    }, { signal });
  });

  securitySignOutButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      signOutFromSettings(button);
    }, { signal });
  });

  document.addEventListener('doke:auth-session-change', syncSecuritySessionSurface, { signal });

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
    syncSettingsFieldInputs();
    syncSecuritySessionSurface();
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
