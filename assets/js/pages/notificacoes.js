(() => {
  const initNotifications = () => {
    const root = document.querySelector('[data-notifications-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const buttons = [...root.querySelectorAll('[data-filter]')];
    const timeButtons = [...root.querySelectorAll('[data-time-filter]')];
    const cards = [...root.querySelectorAll('.notification-card')];
    const empty = root.querySelector('[data-notifications-empty]');
    const countNode = document.querySelector('[data-notifications-unread-count]');
    const pageTitle = root.querySelector('.notifications-page-header__heading h2');
    const searchInput = root.querySelector('[data-notifications-search]');
    const searchForm = searchInput?.closest('form');
    const searchTrigger = searchForm?.querySelector('.orders-header-search__icon');
    const searchClose = searchForm?.querySelector('.orders-header-search__close');
    const filtersToggle = root.querySelector('[data-notifications-filters-toggle]');
    const filtersPanel = root.querySelector('[data-notifications-filters-panel]');
    const selectToggle = root.querySelector('[data-notifications-select-toggle]');
    const selectPanel = root.querySelector('[data-notifications-select-panel]');
    const selectModeButtons = [...root.querySelectorAll('[data-notifications-select-mode]')];
    const markSelectedButton = root.querySelector('[data-notifications-mark-selected]');
    const dismissSelectedButton = root.querySelector('[data-notifications-dismiss-selected]');
    const settingsToggle = root.querySelector('[data-notifications-settings-toggle]');
    const settingsPanel = root.querySelector('[data-notifications-settings-panel]');
    const settingsClose = root.querySelector('[data-notifications-settings-close]');
    const settingsSave = root.querySelector('[data-notifications-settings-save]');
    const settingsReset = root.querySelector('[data-notifications-settings-reset]');
    const activeChip = root.querySelector('[data-notifications-active-chip]');
    const clearFilterButton = root.querySelector('[data-notifications-clear-filter]');
    const activeTimeChip = root.querySelector('[data-notifications-active-time-chip]');
    const filterCountNodes = {
      all: root.querySelector('[data-notifications-filter-count="all"]'),
      unread: root.querySelector('[data-notifications-filter-count="unread"]'),
      orders: root.querySelector('[data-notifications-filter-count="orders"]'),
      messages: root.querySelector('[data-notifications-filter-count="messages"]'),
      ads: root.querySelector('[data-notifications-filter-count="ads"]'),
      social: root.querySelector('[data-notifications-filter-count="social"]')
    };
    const statNodes = {
      all: root.querySelector('[data-notifications-stat="all"]'),
      unread: root.querySelector('[data-notifications-stat="unread"]'),
      orders: root.querySelector('[data-notifications-stat="orders"]'),
      messages: root.querySelector('[data-notifications-stat="messages"]'),
      ads: root.querySelector('[data-notifications-stat="ads"]'),
      social: root.querySelector('[data-notifications-stat="social"]')
    };

    let currentFilter = 'all';
    let currentTimeFilter = 'all';
    let selectionEnabled = false;
    const mobileSearchQuery = window.matchMedia('(max-width: 640px)');

    if (pageTitle) pageTitle.textContent = 'Notificações';

    const setSearchExpanded = (expanded) => {
      if (!mobileSearchQuery.matches) return;
      root.classList.toggle('is-search-open', expanded);
    };

    const selectedCards = () => cards.filter((card) => card.classList.contains('is-selected') && card.dataset.dismissed !== 'true');

    const closeFiltersPanel = () => {
      if (!filtersPanel) return;
      filtersPanel.hidden = true;
      filtersToggle?.setAttribute('aria-expanded', 'false');
    };

    const closeSelectPanel = () => {
      if (!selectPanel) return;
      selectPanel.hidden = true;
      selectToggle?.setAttribute('aria-expanded', 'false');
    };

    const openSelectPanel = () => {
      if (!selectPanel) return;
      selectPanel.hidden = false;
      selectToggle?.setAttribute('aria-expanded', 'true');
      closeFiltersPanel();
    };

    const clearSelection = () => {
      cards.forEach((card) => card.classList.remove('is-selected'));
    };

    const setSelectionEnabled = (enabled) => {
      selectionEnabled = enabled;
      root.classList.toggle('is-selection-mode', enabled);
      if (!enabled) clearSelection();
    };

    const closeSettingsPanel = () => {
      if (!settingsPanel) return;
      settingsPanel.hidden = true;
      settingsToggle?.setAttribute('aria-expanded', 'false');
    };

    const openFiltersPanel = () => {
      if (!filtersPanel) return;
      filtersPanel.hidden = false;
      filtersToggle?.setAttribute('aria-expanded', 'true');
      closeSelectPanel();
      closeSettingsPanel();
    };

    const openSettingsPanel = () => {
      if (!settingsPanel) return;
      settingsPanel.hidden = false;
      settingsToggle?.setAttribute('aria-expanded', 'true');
      closeFiltersPanel();
    };

    const updateUnread = () => {
      const count = [...root.querySelectorAll('.notification-card.is-unread')].filter((card) => card.dataset.dismissed !== 'true').length;
      if (countNode) countNode.textContent = String(count);
    };

    const updateStats = () => {
      const activeCards = cards.filter((card) => card.dataset.dismissed !== 'true');
      const all = activeCards.length;
      const unread = activeCards.filter((card) => card.classList.contains('is-unread')).length;
      const countBy = (token) => activeCards.filter((card) => (card.dataset.category || '').split(/\s+/).includes(token)).length;
      if (statNodes.all) statNodes.all.textContent = String(all);
      if (statNodes.unread) statNodes.unread.textContent = String(unread);
      if (statNodes.orders) statNodes.orders.textContent = String(countBy('orders'));
      if (statNodes.messages) statNodes.messages.textContent = String(countBy('messages'));
      if (statNodes.ads) statNodes.ads.textContent = String(countBy('ads'));
      if (statNodes.social) statNodes.social.textContent = String(countBy('social'));
      if (filterCountNodes.all) filterCountNodes.all.textContent = String(all);
      if (filterCountNodes.unread) filterCountNodes.unread.textContent = String(unread);
      if (filterCountNodes.orders) filterCountNodes.orders.textContent = String(countBy('orders'));
      if (filterCountNodes.messages) filterCountNodes.messages.textContent = String(countBy('messages'));
      if (filterCountNodes.ads) filterCountNodes.ads.textContent = String(countBy('ads'));
      if (filterCountNodes.social) filterCountNodes.social.textContent = String(countBy('social'));
    };

    const updateActiveChip = () => {
      const activeButton = root.querySelector('[data-filter].is-active');
      const activeTimeButton = root.querySelector('[data-time-filter].is-active');
      const label = activeButton?.textContent?.trim() || 'Todas';
      const timeLabel = activeTimeButton?.textContent?.trim() || 'Tudo';
      const showTypeChip = currentFilter !== 'all';
      const showTimeChip = currentTimeFilter !== 'all';
      if (activeChip) {
        activeChip.textContent = label;
        activeChip.hidden = !showTypeChip;
      }
      if (activeTimeChip) {
        activeTimeChip.textContent = timeLabel;
        activeTimeChip.hidden = !showTimeChip;
      }
      if (clearFilterButton) clearFilterButton.hidden = !(showTypeChip || showTimeChip);
    };

    const applyFilter = (filter = currentFilter, timeFilter = currentTimeFilter) => {
      currentFilter = filter;
      currentTimeFilter = timeFilter;
      const query = (searchInput?.value || '').trim().toLowerCase();
      let visible = 0;

      const matchTimeWindow = (card) => {
        if (timeFilter === 'all') return true;
        const ageRaw = card.dataset.age || '';
        const value = Number.parseInt(ageRaw, 10);
        if (Number.isNaN(value)) return true;
        if (ageRaw.endsWith('m')) return timeFilter === '1h' ? value <= 60 : timeFilter === '24h' ? value <= 1440 : value <= 10080;
        if (ageRaw.endsWith('h')) return timeFilter === '1h' ? value <= 1 : timeFilter === '24h' ? value <= 24 : value <= 168;
        if (ageRaw.endsWith('d')) return timeFilter === '7d' ? value <= 7 : false;
        return true;
      };

      cards.forEach((card) => {
        const tokens = (card.dataset.category || '').split(/\s+/);
        const text = card.textContent.toLowerCase();
        const matchFilter = filter === 'all' || tokens.includes(filter);
        const matchSearch = !query || text.includes(query);
        const matchTime = matchTimeWindow(card);
        const dismissed = card.dataset.dismissed === 'true';
        const match = !dismissed && matchFilter && matchSearch && matchTime;
        card.hidden = !match;
        if (match) visible += 1;
      });

      root.querySelectorAll('.notifications-group').forEach((group) => {
        const hasVisibleCard = [...group.querySelectorAll('.notification-card')].some((card) => !card.hidden);
        group.hidden = !hasVisibleCard;
      });

      if (empty) empty.hidden = visible > 0;
      updateActiveChip();
    };

    buttons.forEach((button) => button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      applyFilter(button.dataset.filter || 'all', currentTimeFilter);
    }));

    timeButtons.forEach((button) => button.addEventListener('click', () => {
      timeButtons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      applyFilter(currentFilter, button.dataset.timeFilter || 'all');
    }));

    filtersToggle?.addEventListener('click', () => {
      if (!filtersPanel) return;
      if (filtersPanel.hidden) openFiltersPanel();
      else closeFiltersPanel();
    });

    selectToggle?.addEventListener('click', () => {
      const nextState = !selectionEnabled;
      setSelectionEnabled(nextState);
      if (nextState) openSelectPanel();
      else closeSelectPanel();
    });

    selectModeButtons.forEach((button) => button.addEventListener('click', () => {
      const mode = button.dataset.notificationsSelectMode || 'single';
      setSelectionEnabled(true);
      clearSelection();
      if (mode === 'all') {
        cards.forEach((card) => {
          if (card.dataset.dismissed !== 'true' && !card.hidden) card.classList.add('is-selected');
        });
      }
    }));

    settingsToggle?.addEventListener('click', () => {
      if (!settingsPanel) return;
      if (settingsPanel.hidden) openSettingsPanel();
      else closeSettingsPanel();
    });

    settingsClose?.addEventListener('click', closeSettingsPanel);

    settingsReset?.addEventListener('click', () => {
      settingsPanel?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = ['No app','E-mail','Pedidos','Mensagens','Sociais','Anúncios'].includes(input.closest('label')?.querySelector('strong')?.textContent || '');
      });
    });

    settingsSave?.addEventListener('click', () => {
      if (!settingsPanel) return;
      const existing = settingsPanel.querySelector('.notifications-settings-feedback');
      if (existing) existing.remove();
      const feedback = document.createElement('div');
      feedback.className = 'notifications-settings-feedback';
      feedback.textContent = 'Preferências salvas.';
      settingsPanel.querySelector('.notifications-settings-panel__footer')?.prepend(feedback);
      window.setTimeout(() => {
        feedback.remove();
        closeSettingsPanel();
      }, 1200);
    });

    clearFilterButton?.addEventListener('click', () => {
      const allButton = root.querySelector('[data-filter="all"]');
      const allTimeButton = root.querySelector('[data-time-filter="all"]');
      if (allButton) { buttons.forEach((item) => item.classList.remove('is-active')); allButton.classList.add('is-active'); }
      if (allTimeButton) { timeButtons.forEach((item) => item.classList.remove('is-active')); allTimeButton.classList.add('is-active'); }
      applyFilter('all', 'all');
    });

    searchInput?.addEventListener('input', () => applyFilter(currentFilter));
    searchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (mobileSearchQuery.matches && !root.classList.contains('is-search-open')) {
        setSearchExpanded(true);
        searchInput?.focus();
        return;
      }
      applyFilter(currentFilter, currentTimeFilter);
    });

    searchTrigger?.addEventListener('click', (event) => {
      if (!mobileSearchQuery.matches) return;
      event.preventDefault();
      event.stopPropagation();
      if (!root.classList.contains('is-search-open')) setSearchExpanded(true);
      window.setTimeout(() => searchInput?.focus(), 0);
    });

    searchInput?.addEventListener('focus', () => {
      if (mobileSearchQuery.matches) setSearchExpanded(true);
    });

    searchClose?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!mobileSearchQuery.matches) return;
      if (searchInput) searchInput.value = '';
      setSearchExpanded(false);
      searchInput?.blur();
      applyFilter(currentFilter, currentTimeFilter);
    });

    root.querySelectorAll('[data-mark-read]').forEach((button) => button.addEventListener('click', () => {
      button.closest('.notification-card')?.classList.remove('is-unread');
      updateUnread();
      updateStats();
      applyFilter(currentFilter, currentTimeFilter);
    }));

    markSelectedButton?.addEventListener('click', () => {
      const targetCards = selectionEnabled ? selectedCards() : cards.filter((card) => !card.hidden && card.dataset.dismissed !== 'true');
      targetCards.forEach((card) => card.classList.remove('is-unread'));
      updateUnread();
      updateStats();
      applyFilter(currentFilter, currentTimeFilter);
      setSelectionEnabled(false);
      closeSelectPanel();
    });

    root.querySelectorAll('[data-dismiss-notification]').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('.notification-card');
      if (!card) return;
      card.dataset.dismissed = 'true';
      card.hidden = true;
      updateUnread();
      updateStats();
      applyFilter(currentFilter, currentTimeFilter);
    }));

    dismissSelectedButton?.addEventListener('click', () => {
      const targetCards = selectionEnabled ? selectedCards() : cards.filter((card) => !card.hidden && card.dataset.dismissed !== 'true');
      targetCards.forEach((card) => {
        card.dataset.dismissed = 'true';
        card.hidden = true;
      });
      updateUnread();
      updateStats();
      applyFilter(currentFilter, currentTimeFilter);
      setSelectionEnabled(false);
      closeSelectPanel();
    });

    cards.forEach((card) => card.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.notification-card__inline-actions')) return;
      if (selectionEnabled) {
        event.preventDefault();
        card.classList.toggle('is-selected');
        return;
      }

      const primaryAction = card.querySelector('.notification-card__inline-actions a[href]');
      const href = primaryAction?.getAttribute('href');
      if (href) window.location.href = href;
    }));

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (mobileSearchQuery.matches && root.classList.contains('is-search-open')) {
        const clickedInsideSearch = target.closest('.notifications-page-header__search');
        if (!clickedInsideSearch && !(searchInput?.value || '').trim()) setSearchExpanded(false);
      }

      if (settingsPanel && !settingsPanel.hidden) {
        const clickedInsideSettings = target.closest('[data-notifications-settings-panel]');
        const clickedSettingsToggle = target.closest('[data-notifications-settings-toggle]');
        if (!clickedInsideSettings && !clickedSettingsToggle) closeSettingsPanel();
      }

      if (filtersPanel && !filtersPanel.hidden) {
        const clickedInsideFilters = target.closest('[data-notifications-filters-panel]');
        const clickedFiltersToggle = target.closest('[data-notifications-filters-toggle]');
        if (!clickedInsideFilters && !clickedFiltersToggle) closeFiltersPanel();
      }

      if (selectPanel && !selectPanel.hidden) {
        const clickedInsideSelect = target.closest('[data-notifications-select-panel]');
        const clickedSelectToggle = target.closest('[data-notifications-select-toggle]');
        if (!clickedInsideSelect && !clickedSelectToggle) closeSelectPanel();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setSearchExpanded(false);
      closeSettingsPanel();
      closeFiltersPanel();
      closeSelectPanel();
      setSelectionEnabled(false);
    });

    updateUnread();
    updateStats();
    applyFilter('all', 'all');
  };

  window.DokeInitNotifications = initNotifications;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNotifications, { once: true }); else initNotifications();
})();
