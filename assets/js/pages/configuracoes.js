(function () {
  'use strict';

  let activeController = null;
  let activeInitialization = null;
  let activeInitializationRoot = null;
  let activeReadyRoot = null;

  window.DokeInitSettings = function DokeInitSettings() {
    const settingsRoot = document.querySelector('.settings-shell, [data-settings-page], .settings-layout');
    if (!settingsRoot) return Promise.resolve(null);
    if (activeReadyRoot === settingsRoot) return Promise.resolve(true);
    if (activeInitializationRoot === settingsRoot && activeInitialization) return activeInitialization;

    activeInitializationRoot = settingsRoot;
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const { signal } = controller;
    const hydration = window.DokePageHydration?.create?.({
      page: 'configuracoes',
      root: settingsRoot,
      pendingSelectors: '[data-settings-hydration-pending]',
      readySelectors: '[data-settings-hydration-ready]',
      errorSelectors: '[data-state-error]',
      skeletonMode: 'never',
      maxDuration: 9000,
      hasItems: () => true
    }) || null;
    hydration?.start();

  const pageBody = document.body;
  const sidebarItems = Array.from(document.querySelectorAll('.settings-sidebar__item'));
  const panels = Array.from(document.querySelectorAll('.settings-panel'));
  const professionalOnlyItems = Array.from(document.querySelectorAll('[data-settings-professional-only]'));
  const clientOnlyItems = Array.from(document.querySelectorAll('[data-settings-client-only]'));
  const professionalPanels = Array.from(document.querySelectorAll('[data-settings-professional-panel]'));
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
  const paymentSummary = document.querySelector('[data-settings-payment-summary]');
  const pixSummary = document.querySelector('[data-settings-pix-summary]');
  const focusFieldButtons = Array.from(document.querySelectorAll('[data-settings-focus-field]'));
  const availabilitySummaries = Array.from(document.querySelectorAll('[data-settings-availability-summary]'));
  const supportSummary = document.querySelector('[data-settings-support-summary]');
  const supportDraftSummary = document.querySelector('[data-settings-support-draft-summary]');
  const profileForm = document.querySelector('[data-settings-profile-form]');
  const profileFields = Array.from(document.querySelectorAll('[data-profile-field]'));
  const profileSaveButton = document.querySelector('[data-settings-save-profile]');
  const profileError = document.querySelector('[data-settings-profile-error]');
  const profileInitials = document.querySelector('[data-settings-profile-initials]');
  const profileAvatar = document.querySelector('[data-settings-profile-avatar]');
  const profileCover = document.querySelector('[data-settings-profile-cover]');
  const profileCoverFallback = document.querySelector('[data-settings-profile-cover-fallback]');
  const profileMediaInputs = Array.from(document.querySelectorAll('[data-settings-profile-media]'));
  const profileMediaFeedback = document.querySelector('[data-settings-media-feedback]');
  let persistedProfile = null;


  const DEFAULT_SETTINGS = Object.freeze({
    account: Object.freeze({ fullName: '', displayName: '', document: '', phone: '', email: '' }),
    professional: Object.freeze({
      professionalName: '',
      professionalType: '',
      professionalDescription: '',
      mainCategory: '',
      experience: '',
      baseCity: '',
      serviceRadius: '',
      neighborhoods: '',
      receiveOrders: true,
      urgentAvailability: false
    }),
    payments: Object.freeze({
      preferredMethod: 'Cartão principal',
      pixKey: '',
      payoutSchedule: 'Após conclusão do pedido',
      receiptDisplayName: '',
      autoReceipts: true,
      preferPix: false
    }),
    availability: Object.freeze({
      responseTime: 'Até 2 horas úteis',
      serviceDays: 'Segunda a sexta',
      serviceStart: '08:00',
      serviceEnd: '18:00',
      availabilityNote: '',
      channelChat: true,
      channelOrders: true,
      channelUpdates: true
    }),
    support: Object.freeze({
      preferredChannel: 'Chat Doke',
      topic: 'Pedido ou orçamento',
      contactEmail: '',
      message: '',
      attachDiagnostics: true,
      allowWhatsApp: false
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

  let settingsState = cloneSettings(DEFAULT_SETTINGS);

  const hydrateSettings = async () => {
    try {
      const stored = await window.Doke?.services?.profile?.getCurrentSettings?.();
      settingsState = mergeSettings(DEFAULT_SETTINGS, stored);
    } catch (error) {
      console.warn('[Doke] Não foi possível ler as preferências de configurações.', error);
      settingsState = cloneSettings(DEFAULT_SETTINGS);
    }
  };

  const saveSettings = () => {
    const request = window.Doke?.services?.profile?.updateCurrentSettings?.(cloneSettings(settingsState));
    if (!request || typeof request.then !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));
    return request;
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

  const getAvailablePanelNames = () => new Set(panels.filter((panel) => panel.dataset.settingsAccess !== 'denied').map((panel) => panel.dataset.settingsPanel).filter(Boolean));

  const normalizeRole = (value) => {
    const role = String(value || '').trim().toLowerCase();
    if (role === 'pro' || role === 'worker' || role === 'profissional') return 'professional';
    if (role === 'customer' || role === 'user') return 'client';
    return role;
  };

  const applyAccountSurface = (user) => {
    const isProfessional = normalizeRole(user?.role || user?.type) === 'professional';
    professionalOnlyItems.forEach((item) => {
      item.hidden = !isProfessional;
      item.setAttribute('aria-hidden', String(!isProfessional));
    });
    clientOnlyItems.forEach((item) => {
      item.hidden = isProfessional;
      item.setAttribute('aria-hidden', String(isProfessional));
    });
    professionalPanels.forEach((panel) => {
      panel.dataset.settingsAccess = isProfessional ? 'allowed' : 'denied';
      if (!isProfessional) {
        panel.hidden = true;
        panel.classList.remove('is-active');
      }
    });
    pageBody.dataset.settingsAccountRole = isProfessional ? 'professional' : 'client';
    updateSectionVisibility();
    return isProfessional;
  };

  const normalizePanelName = (panelName) => {
    const normalized = String(panelName || '').trim().replace(/^#/, '');
    if (!normalized) return '';
    return getAvailablePanelNames().has(normalized) ? normalized : '';
  };

  const getRequestedPanelName = () => {
    const params = new URLSearchParams(window.location.search);
    return String(params.get('tab') || params.get('settings') || window.location.hash || '').trim().replace(/^#/, '');
  };

  const getPanelFromLocation = () => normalizePanelName(getRequestedPanelName());

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
      const navigation = window.DokeNavigationLifecycle?.navigation?.go || window.Doke?.navigation?.go || window.DokeNavigate;
      if (typeof navigation === 'function') {
        await navigation('auth/login.html', { replace: true, forceDocument: true, source: 'settings-sign-out' });
      } else {
        window.location.replace('auth/login.html');
      }
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


  const getProfileService = () => window.Doke?.services?.profile || null;

  const getProfileField = (name) => profileFields.find((field) => field.dataset.profileField === name);

  const profileInitialsFromName = (value) => {
    const parts = String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length ? parts.map((part) => part.charAt(0).toUpperCase()).join('') : 'DK';
  };

  const renderProfileMedia = (profile = {}) => {
    const avatarUrl = String(profile.avatarUrl || '').trim();
    const coverUrl = String(profile.coverUrl || '').trim();
    if (profileAvatar) {
      profileAvatar.hidden = !avatarUrl;
      if (avatarUrl) profileAvatar.src = avatarUrl;
      else profileAvatar.removeAttribute('src');
    }
    if (profileInitials) {
      profileInitials.hidden = Boolean(avatarUrl);
      profileInitials.textContent = profileInitialsFromName(profile.name);
    }
    if (profileCover) {
      profileCover.hidden = !coverUrl;
      if (coverUrl) profileCover.src = coverUrl;
      else profileCover.removeAttribute('src');
    }
    if (profileCoverFallback) profileCoverFallback.hidden = Boolean(coverUrl);
  };

  const setMediaFeedback = (message, isError = false) => {
    if (!profileMediaFeedback) return;
    profileMediaFeedback.hidden = !message;
    profileMediaFeedback.textContent = message || '';
    profileMediaFeedback.dataset.state = isError ? 'error' : 'success';
  };

  const updateProfileMedia = async (input) => {
    const service = getProfileService();
    const file = input.files?.[0];
    const mediaKind = input.dataset.settingsProfileMedia;
    const field = mediaKind === 'cover' ? 'coverUrl' : 'avatarUrl';
    if (!file || !service?.prepareLocalImage || !service?.updateCurrentProfile) return;
    const previousProfile = { ...(persistedProfile || {}) };
    try {
      setMediaFeedback('Preparando imagem...');
      const url = await service.prepareLocalImage(file);
      persistedProfile = { ...previousProfile, [field]: url };
      renderProfileMedia(persistedProfile);
      setMediaFeedback('Salvando...');
      persistedProfile = await service.updateCurrentProfile({ [field]: url });
      renderProfileMedia(persistedProfile);
      setMediaFeedback(mediaKind === 'cover' ? 'Capa atualizada.' : 'Foto atualizada.');
    } catch (error) {
      persistedProfile = previousProfile;
      renderProfileMedia(persistedProfile);
      setMediaFeedback(error?.message || 'Não foi possível atualizar a imagem.', true);
    } finally {
      input.value = '';
    }
  };

  const hydrateProfileForm = async () => {
    const service = getProfileService();
    if (!service?.getCurrentProfile || !profileForm) return;
    try {
      persistedProfile = await service.getCurrentProfile();
      const profile = persistedProfile || {};
      profileFields.forEach((field) => {
        const key = field.dataset.profileField;
        const value = key === 'interests' && Array.isArray(profile.interests)
          ? profile.interests.join(', ')
          : profile[key] || '';
        setInputValue(field, value);
      });
      renderProfileMedia(profile);
      if (profileError) profileError.textContent = '';
    } catch (error) {
      if (profileError) profileError.textContent = error?.message || 'Não foi possível carregar o perfil.';
    }
  };

  const saveProfile = async (button) => {
    const service = getProfileService();
    if (!service?.updateCurrentProfile || !profileForm) return;
    const payload = Object.fromEntries(new FormData(profileForm).entries());
    if (profileError) profileError.textContent = '';
    setButtonSubmittingFeedback(button);
    try {
      persistedProfile = await service.updateCurrentProfile(payload);
      renderProfileMedia(persistedProfile);
      setButtonSavedFeedback(button);
    } catch (error) {
      if (profileError) profileError.textContent = error?.message || 'Não foi possível salvar o perfil.';
      restoreButtonPendingLabel(button);
      button.setAttribute('data-action-state', 'error');
      button.setAttribute('aria-busy', 'false');
    } finally {
      button.disabled = false;
    }
  };

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

  const maskPaymentKey = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 'Chave PIX não configurada.';
    if (raw.length <= 6) return raw;
    return `${raw.slice(0, 3)}•••${raw.slice(-3)}`;
  };

  const syncPaymentsSurface = () => {
    const payments = settingsState.payments || {};
    if (paymentSummary) {
      const method = payments.preferredMethod || 'Cartão principal';
      const receiptLabel = payments.autoReceipts ? 'comprovantes automáticos' : 'comprovantes manuais';
      paymentSummary.textContent = `${method} · ${receiptLabel}`;
    }
    if (pixSummary) {
      pixSummary.textContent = maskPaymentKey(payments.pixKey);
    }
  };

  const syncAvailabilitySurface = () => {
    const professional = settingsState.professional || {};
    availabilitySummaries.forEach((summary) => {
      const type = summary.dataset.settingsAvailabilitySummary;
      if (type === 'receiveOrders') {
        summary.textContent = professional.receiveOrders
          ? 'Seu perfil aparece como disponível para orçamentos.'
          : 'Seu perfil fica pausado para novas solicitações.';
      }
      if (type === 'urgentAvailability') {
        summary.textContent = professional.urgentAvailability
          ? 'Você aparece disponível para pedidos com prazo curto.'
          : 'Pedidos urgentes ficam ocultos do seu perfil.';
      }
    });
  };

  const syncSupportSurface = () => {
    const support = settingsState.support || {};
    const channel = support.preferredChannel || 'Chat Doke';
    const topic = support.topic || 'Pedido ou orçamento';
    const hasMessage = Boolean(String(support.message || '').trim());

    if (supportSummary) {
      supportSummary.textContent = `${channel} · ${topic}`;
    }

    if (supportDraftSummary) {
      supportDraftSummary.textContent = hasMessage
        ? `Rascunho salvo para ${topic.toLowerCase()}.`
        : 'Nenhum pedido de suporte salvo neste dispositivo.';
    }
  };

  const focusSettingsField = (path) => {
    const target = settingsFieldInputs.find((input) => input.dataset.settingsField === path);
    if (!target) return;
    const panel = target.closest('[data-settings-panel]');
    if (panel?.dataset.settingsPanel) activateTab(panel.dataset.settingsPanel, { scroll: false });
    target.focus({ preventScroll: false });
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

  const pendingActionLabels = new WeakMap();

  const setButtonSubmittingFeedback = (button) => {
    if (!button || !button.hasAttribute('data-action-state')) return false;
    if (!pendingActionLabels.has(button)) {
      pendingActionLabels.set(button, button.getAttribute('aria-label'));
    }
    const loadingLabel = button.dataset.actionLoadingLabel || '';
    const setActionState = window.Doke?.stateContracts?.setActionState;
    if (typeof setActionState === 'function' && setActionState(button, 'submitting', loadingLabel)) {
      return true;
    }
    button.setAttribute('data-action-state', 'submitting');
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
    if (loadingLabel) button.setAttribute('aria-label', loadingLabel);
    return true;
  };

  const restoreButtonPendingLabel = (button) => {
    if (!button || !pendingActionLabels.has(button)) return;
    const originalAriaLabel = pendingActionLabels.get(button);
    pendingActionLabels.delete(button);
    if (originalAriaLabel === null) button.removeAttribute('aria-label');
    else button.setAttribute('aria-label', originalAriaLabel);
  };

  const setButtonSavedFeedback = (button) => {
    if (!button) return;
    restoreButtonPendingLabel(button);
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

  const savePanelSettings = async (panelName, button) => {
    const changed = collectPanelFields(panelName);
    const panel = document.querySelector(`[data-settings-panel="${panelName}"]`);
    if (changed) await saveSettings();
    panel?.setAttribute('data-settings-dirty', 'false');
    syncPaymentsSurface();
    syncAvailabilitySurface();
    syncSupportSurface();
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
    syncPaymentsSurface();
    syncAvailabilitySurface();
    syncSupportSurface();
    document.querySelector(`[data-settings-panel="${panelName}"]`)?.setAttribute('data-settings-dirty', 'false');
  };

  preferenceInputs.forEach((input) => {
    input.addEventListener('change', async () => {
      const preferencePath = input.dataset.settingsPreference;
      if (!preferencePath) return;
      const previousValue = getSettingValue(preferencePath);
      const changed = setSettingValue(preferencePath, Boolean(input.checked));
      input.closest('.settings-list-item')?.classList.toggle('is-disabled', !input.checked);
      if (!changed) return;
      try {
        await saveSettings();
      } catch (error) {
        setSettingValue(preferencePath, previousValue);
        input.checked = Boolean(previousValue);
        input.closest('.settings-list-item')?.classList.toggle('is-disabled', !input.checked);
        console.warn('[Doke] Não foi possível salvar a preferência.', error);
        return;
      }
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
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const panelName = normalizePanelName(button.dataset.settingsSavePanel);
      if (!panelName) return;
      if (button.hasAttribute('data-action-state')) {
        setButtonSubmittingFeedback(button);
      } else {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
      }
      try {
        await savePanelSettings(panelName, button);
      } catch (error) {
        restoreButtonPendingLabel(button);
        button.setAttribute('data-action-state', 'error');
        button.setAttribute('aria-busy', 'false');
        console.warn('[Doke] Não foi possível salvar a seção.', error);
      } finally {
        button.disabled = false;
      }
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

  focusFieldButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      focusSettingsField(button.dataset.settingsFocusField);
    }, { signal });
  });

  profileSaveButton?.addEventListener('click', (event) => {
    event.preventDefault();
    saveProfile(profileSaveButton);
  }, { signal });

  profileFields.forEach((field) => {
    field.addEventListener('input', () => {
      if (profileError) profileError.textContent = '';
      if (field.dataset.profileField === 'name' && profileInitials) {
        profileInitials.textContent = profileInitialsFromName(field.value);
      }
    }, { signal });
  });

  profileMediaInputs.forEach((input) => {
    input.addEventListener('change', () => updateProfileMedia(input), { signal });
  });

  securitySignOutButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      signOutFromSettings(button);
    }, { signal });
  });

  document.addEventListener('doke:auth-session-change', () => {
    syncSecuritySessionSurface();
    hydrateProfileForm();
  }, { signal });

  if (window.DokeHomeDrawer?.create) {
    const initDrawer = window.DokeHomeDrawer.create({ signal });
    if (typeof initDrawer === 'function') initDrawer();
  }

  const initState = async () => {
    try {
      const access = window.Doke?.services?.accountAccess;
      if (!access?.guardPage) throw new Error('O guard da conta não está disponível.');
      const accessResult = await access.guardPage({
        name: 'settings-account-access',
        source: 'configuracoes.html',
        loginRedirect: 'auth/login.html'
      });
      if (signal.aborted || !accessResult?.allowed) return null;

      applyAccountSurface(accessResult.user);
      const rawRequestedPanel = getRequestedPanelName();
      const requestedPanel = normalizePanelName(rawRequestedPanel);
      const initialPanel = requestedPanel || document.querySelector('.settings-sidebar__item.is-active:not([hidden])')?.dataset.settingsTab || sidebarItems.find((item) => item.dataset.settingsTab && !item.hidden)?.dataset.settingsTab;
      if (initialPanel) {
        activateTab(initialPanel, { scroll: false, updateLocation: Boolean(rawRequestedPanel) });
      }

      await hydrateSettings();
      if (signal.aborted) return;
      filterSettings('');
      syncPreferenceInputs();
      syncSettingsFieldInputs();
      syncPaymentsSurface();
      syncAvailabilitySurface();
      syncSupportSurface();
      syncSecuritySessionSurface();
      await hydrateProfileForm();
      if (signal.aborted) return;
      updateSearchClearState();
      setMobileSearchOpen(false);

      setNarrowMenuMode(isNarrowSettings() && !requestedPanel);
      document.querySelector('.settings-sidebar')?.removeAttribute('hidden');
      hydration?.ready({ hasItems: true });
      activeReadyRoot = settingsRoot;
    } catch (error) {
      hydration?.error(error, { source: 'settings-controller' });
    }
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

    activeInitialization = Promise.resolve(initState()).finally(() => {
      activeInitialization = null;
    });
    return activeInitialization;
  };

  Promise.resolve(window.DokeInitSettings()).catch(() => {});
})();
