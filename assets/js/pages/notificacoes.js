(() => {
  const initNotifications = () => {
    const root = document.querySelector('[data-notifications-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const drawerController = new AbortController();
    window.DokeHomeDrawer?.create({ signal: drawerController.signal })?.();

    const buttons = [...root.querySelectorAll('[data-filter]')];
    const timeButtons = [...root.querySelectorAll('[data-time-filter]')];
    const notificationsList = root.querySelector('.notifications-list');
    const localCards = [];
    let cards = [];
    const refreshCards = () => {
      cards = [...root.querySelectorAll('.notification-card')];
      return cards;
    };
    const empty = root.querySelector('[data-notifications-empty]');
    const countNodes = [...document.querySelectorAll('[data-notifications-unread-count], [data-notifications-hero-count]')];
    const pageTitle = root.querySelector('.notifications-page-header__heading h2');
    const searchInputs = [...root.querySelectorAll('[data-notifications-search]')];
    const searchInput = searchInputs[0] || null;
    const searchForms = [...new Set(searchInputs.map((input) => input.closest('form')).filter(Boolean))];
    const searchCloseButtons = [...root.querySelectorAll('.orders-header-search__close')];
    const mobileSearchToggle = root.querySelector('[data-notifications-mobile-search-toggle]');
    const filtersToggles = [...document.querySelectorAll('[data-notifications-filters-toggle]')];
    const filtersPanel = root.querySelector('[data-notifications-filters-panel]');
    const headerControls = root.querySelector('.notifications-page-header__controls');
    const selectToggles = [...document.querySelectorAll('[data-notifications-select-toggle]')];
    const selectPanel = root.querySelector('[data-notifications-select-panel]');
    const selectSummary = root.querySelector('[data-notifications-select-summary]');
    const selectModeButtons = [...root.querySelectorAll('[data-notifications-select-mode]')];
    const openSelectedButton = root.querySelector('[data-notifications-open-selected]');
    const openChatSelectedButton = root.querySelector('[data-notifications-open-chat-selected]');
    const clearSelectedButton = root.querySelector('[data-notifications-clear-selected]');
    const settingsToggle = root.querySelector('[data-notifications-settings-toggle]');
    const settingsPanel = root.querySelector('[data-notifications-settings-panel]');
    const settingsClose = root.querySelector('[data-notifications-settings-close]');
    const settingsSave = root.querySelector('[data-notifications-settings-save]');
    const settingsReset = root.querySelector('[data-notifications-settings-reset]');
    const activeChip = root.querySelector('[data-notifications-active-chip]');
    const filterStatusStack = root.querySelector('.notifications-filter-stack');
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
    let longPressTimer = null;

    const getNotificationsService = () => window.Doke?.services?.notifications || null;

    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const toAgeToken = (value) => {
      const date = value ? new Date(value) : new Date();
      const diff = Math.max(0, Date.now() - (Number.isNaN(date.getTime()) ? Date.now() : date.getTime()));
      const minutes = Math.max(1, Math.round(diff / 60000));
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.round(minutes / 60);
      if (hours < 48) return `${hours}h`;
      return `${Math.round(hours / 24)}d`;
    };

    const toTimeLabel = (value) => {
      const date = value ? new Date(value) : new Date();
      if (Number.isNaN(date.getTime())) return 'agora';
      const diff = Math.max(0, Date.now() - date.getTime());
      const minutes = Math.round(diff / 60000);
      if (minutes < 1) return 'agora';
      if (minutes < 60) return `há ${minutes} min`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `há ${hours} h`;
      return `há ${Math.round(hours / 24)} d`;
    };

    const getCategoryClass = (category) => {
      if (category === 'messages') return 'notification-card--message doke-message-card';
      if (category === 'orders') return 'notification-card--order doke-order-card';
      if (category === 'ads') return 'notification-card--ad';
      return 'notification-card--info';
    };

    const getIconSvg = (category) => {
      if (category === 'messages') return '<svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>';
      if (category === 'orders') return '<svg viewBox="0 0 24 24"><path d="M5 6.5h14"></path><path d="M5 11.5h14"></path><path d="M5 16.5h8"></path><rect x="3.5" y="4" width="17" height="16" rx="2.5"></rect></svg>';
      return '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>';
    };

    const renderLocalNotificationCard = (notification) => {
      const category = notification.category || 'social';
      const unreadClass = notification.read ? '' : ' is-unread';
      const unreadToken = notification.read ? '' : ' unread';
      const card = document.createElement('article');
      card.className = `notification-card${unreadClass} ${getCategoryClass(category)} doke-card doke-notification-card`;
      card.dataset.category = `${category}${unreadToken}`;
      card.dataset.catégory = `${category}${unreadToken}`;
      card.dataset.age = toAgeToken(notification.createdAt);
      card.dataset.notificationId = notification.id;
      card.dataset.localNotification = 'true';
      card.innerHTML = `
        <button class="notification-card__read-toggle doke-icon-btn doke-icon-btn--flat" type="button" data-mark-read-icon aria-label="Marcar como lida">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
        </button>
        <div class="notification-card__icon" aria-hidden="true">${getIconSvg(category)}</div>
        <div class="notification-card__body">
          <div class="notification-card__meta">
            <span class="notification-card__tag doke-badge">${category === 'messages' ? 'Mensagem' : category === 'orders' ? 'Pedido' : 'Doke'}</span>
            <span class="notification-card__time">${toTimeLabel(notification.createdAt)}</span>
          </div>
          <h3>${escapeHtml(notification.title)}</h3>
          <p>${escapeHtml(notification.body)}</p>
          <div class="notification-card__inline-actions">
            <a href="${escapeHtml(notification.targetUrl || 'notificacoes.html')}">${escapeHtml(notification.actionLabel || 'Abrir')}</a>
            <button type="button" data-mark-read>Marcar lida</button>
            <button type="button" data-dismiss-notification>Dispensar</button>
          </div>
        </div>
      `;
      return card;
    };

    const getCanonicalTodayGroup = () => {
      if (!notificationsList) return null;

      let group = notificationsList.querySelector('[data-local-notifications-group="true"]');

      if (!group) {
        group = document.createElement('div');
        group.className = 'notifications-group';
        group.dataset.localNotificationsGroup = 'true';
        const emptyState = notificationsList.querySelector('[data-notifications-empty]');
        notificationsList.insertBefore(group, emptyState || notificationsList.firstChild);
      }

      return group;
    };

    const bindNotificationCard = (card) => {
      if (!card || card.dataset.runtimeBound === 'true') return;
      card.dataset.runtimeBound = 'true';
      card.classList.add('doke-selectable-card');
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', 'false');
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;

      card.querySelectorAll('[data-mark-read], [data-mark-read-icon]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const id = card.dataset.notificationId || '';
          getNotificationsService()?.markAsRead?.(id);
          card.classList.remove('is-unread');
          const tokens = (card.dataset.catégory || card.dataset.category || '').split(/\s+/).filter((token) => token !== 'unread');
          card.dataset.catégory = tokens.join(' ');
          card.dataset.category = tokens.join(' ');
          updatéUnread();
          updatéStats();
          applyFilter(currentFilter, currentTimeFilter);
        });
      });

      card.querySelectorAll('[data-dismiss-notification]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const id = card.dataset.notificationId || '';
          getNotificationsService()?.dismiss?.(id);
          card.dataset.dismissed = 'true';
          card.hidden = true;
          updatéUnread();
          updatéStats();
          applyFilter(currentFilter, currentTimeFilter);
        });
      });

      card.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.notification-card__inline-actions')) return;
        if (selectionEnabled) {
          if (target.closest(selectableCardInteractiveSelector)) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
          return;
        }
        const id = card.dataset.notificationId || '';
        if (id) getNotificationsService()?.markAsRead?.(id);
        const primaryAction = card.querySelector('.notification-card__inline-actions a[href]');
        const href = primaryAction?.getAttribute('href');
        if (href) window.location.href = href;
      });
    };

    const hydrateLocalNotifications = () => {
      const service = getNotificationsService();
      if (!service || typeof service.listLocal !== 'function') return false;
      const group = getCanonicalTodayGroup();
      if (!group) return false;

      root.querySelectorAll('[data-local-notification="true"]').forEach((card) => card.remove());
      localCards.length = 0;

      const insertionAnchor = group.firstChild;
      const items = service.listLocal({ dismissed: false }) || [];
      items
        .filter((notification) => !notification.dismissed)
        .slice()
        .reverse()
        .forEach((notification) => {
          const card = renderLocalNotificationCard(notification);
          group.insertBefore(card, insertionAnchor);
          localCards.unshift(card);
          bindNotificationCard(card);
        });

      if (!localCards.length) group.remove();

      refreshCards().forEach(bindNotificationCard);
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
      syncSelectedActions();
      return true;
    };

    const refreshLocalNotifications = () => {
      if (hydrateLocalNotifications()) return;
      window.setTimeout(hydrateLocalNotifications, 120);
      window.setTimeout(hydrateLocalNotifications, 420);
    };


    const syncContextPanelHost = () => {
      if (!headerControls) return;
      [filtersPanel, selectPanel].filter(Boolean).forEach((panel) => {
        if (panel.parentElement !== headerControls) headerControls.appendChild(panel);
      });
    };

    const revealContextPanel = () => {
      if (!headerControls || !window.matchMedia('(max-width: 760px)').matches) return;
      if (document.body.classList.contains('doke-mobile-shell-mounted')) return;
      window.requestAnimationFrame(() => {
        headerControls.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      });
    };

    if (pageTitle) pageTitle.textContent = 'Notificações';

    const setSearchExpanded = (expanded) => {
      root.classList.toggle('is-search-open', expanded);
      mobileSearchToggle?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    const closeContextMenu = () => {
      refreshCards().forEach((card) => card.classList.remove('is-context-open'));
    };

    const openContextMenu = (card) => {
      closeContextMenu();
      card.classList.add('is-context-open');
    };

    const selectableCardInteractiveSelector = 'a, button, input, textarea, select, summary, [role="button"]';

    notificationsList?.setAttribute('role', 'listbox');
    notificationsList?.setAttribute('aria-multiselectable', 'false');

    refreshCards().forEach((card) => {
      card.classList.add('doke-selectable-card');
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', 'false');
      if (!card.hasAttribute('tabindex')) card.tabIndex = 0;
    });

    const setCardSelected = (card, selected) => {
      if (!card) return;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-selected', selected ? 'true' : 'false');
    };

    const toggleCardSelected = (card) => {
      if (!card) return;
      setCardSelected(card, !card.classList.contains('is-selected'));
    };

    const selectedCards = () => refreshCards().filter((card) => card.classList.contains('is-selected') && card.dataset.dismissed !== 'true');

    const setToggleExpanded = (toggles, expanded) => {
      toggles.forEach((toggle) => {
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggle.classList.toggle('is-active', expanded);
      });
    };

    const closeFiltersPanel = () => {
      if (!filtersPanel) return;
      filtersPanel.hidden = true;
      setToggleExpanded(filtersToggles, false);
      syncHeaderControls();
    };

    const closeSelectPanel = () => {
      if (!selectPanel) return;
      selectPanel.hidden = true;
      selectPanel.setAttribute('hidden', '');
      setToggleExpanded(selectToggles, false);
      if (selectionEnabled) setSelectionEnabled(false);
      syncHeaderControls();
    };

    const openSelectPanel = () => {
      if (!selectPanel) return;
      syncContextPanelHost();
      if (headerControls) headerControls.hidden = false;
      selectPanel.hidden = false;
      selectPanel.removeAttribute('hidden');
      setToggleExpanded(selectToggles, true);
      closeFiltersPanel();
      if (headerControls) headerControls.hidden = false;
      setSelectionEnabled(true);
      syncHeaderControls();
      revealContextPanel();
    };

    const clearSelection = () => {
      refreshCards().forEach((card) => setCardSelected(card, false));
    };

    const syncSelectedActions = () => {
      refreshCards().forEach((card) => {
        card.setAttribute('aria-selected', card.classList.contains('is-selected') ? 'true' : 'false');
      });

      const selected = selectedCards();
      const count = selected.length;
      const hasConversation = selected.some((card) => (card.dataset.catégory || '').split(/\s+/).includes('messages'));
      if (selectSummary) selectSummary.textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
      if (openSelectedButton) openSelectedButton.disabled = count === 0;
      if (openChatSelectedButton) openChatSelectedButton.disabled = count === 0 || !hasConversation;
      if (clearSelectedButton) clearSelectedButton.disabled = count === 0;
    };

    const setSelectionEnabled = (enabled) => {
      selectionEnabled = enabled;
      root.classList.toggle('is-selection-mode', enabled);
      notificationsList?.setAttribute('aria-multiselectable', enabled ? 'true' : 'false');
      setToggleExpanded(selectToggles, enabled);
      if (!enabled) clearSelection();
      syncSelectedActions();
      syncHeaderControls();
    };

    const closeSettingsPanel = () => {
      if (!settingsPanel) return;
      settingsPanel.hidden = true;
      settingsToggle?.setAttribute('aria-expanded', 'false');
    };

    const openFiltersPanel = () => {
      if (!filtersPanel) return;
      syncContextPanelHost();
      filtersPanel.hidden = false;
      setToggleExpanded(filtersToggles, true);
      closeSelectPanel();
      closeSettingsPanel();
      syncHeaderControls();
      revealContextPanel();
    };

    const openSettingsPanel = () => {
      if (!settingsPanel) return;
      settingsPanel.hidden = false;
      settingsToggle?.setAttribute('aria-expanded', 'true');
      closeFiltersPanel();
    };

    const updatéUnread = () => {
      const count = [...root.querySelectorAll('.notification-card.is-unread')].filter((card) => card.dataset.dismissed !== 'true').length;
      countNodes.forEach((node) => { node.textContent = String(count); });
    };

    const updatéStats = () => {
      const activeCards = refreshCards().filter((card) => card.dataset.dismissed !== 'true');
      const all = activeCards.length;
      const unread = activeCards.filter((card) => card.classList.contains('is-unread')).length;
      const countBy = (token) => activeCards.filter((card) => (card.dataset.catégory || '').split(/\s+/).includes(token)).length;
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

    const updatéActiveChip = () => {
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
      syncHeaderControls();
    };

    const syncHeaderControls = () => {
      const showStatusStack = Boolean(
        (activeChip && !activeChip.hidden)
        || (activeTimeChip && !activeTimeChip.hidden)
        || (clearFilterButton && !clearFilterButton.hidden)
      );
      if (filterStatusStack) filterStatusStack.hidden = !showStatusStack && (!filtersPanel || filtersPanel.hidden);
      const hasOpenPanel = Boolean(
        (filtersPanel && !filtersPanel.hidden)
        || (selectPanel && !selectPanel.hidden)
      );
      const showControls = Boolean(hasOpenPanel || showStatusStack);
      if (headerControls) headerControls.hidden = !showControls;
      document.body.classList.toggle('has-notifications-action-panel-open', hasOpenPanel);
      root.classList.toggle('has-action-panel-open', hasOpenPanel);
    };

    const toggleFiltersPanel = () => {
      const willOpen = !filtersPanel || filtersPanel.hidden;
      closeFiltersPanel();
      closeSelectPanel();
      if (willOpen) openFiltersPanel();
      return willOpen;
    };

    const toggleSelectPanel = () => {
      const willOpen = !selectPanel || selectPanel.hidden;
      closeFiltersPanel();
      if (willOpen) {
        openSelectPanel();
      } else {
        setSelectionEnabled(false);
        closeSelectPanel();
      }
      return willOpen;
    };

    window.DokeNotificationsPanels = {
      openFilters: openFiltersPanel,
      closeFilters: closeFiltersPanel,
      toggleFilters: toggleFiltersPanel,
      openSelect: openSelectPanel,
      closeSelect: closeSelectPanel,
      toggleSelect: toggleSelectPanel
    };

    const applyFilter = (filter = currentFilter, timeFilter = currentTimeFilter) => {
      currentFilter = filter;
      currentTimeFilter = timeFilter;
      const query = (searchInputs.find((input) => (input.value || '').trim())?.value || '').trim().toLowerCase();
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

      refreshCards().forEach((card) => {
        const tokens = (card.dataset.catégory || '').split(/\s+/);
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
      updatéActiveChip();
    };

    buttons.forEach((button) => button.addEventListener('click', () => {
      buttons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      applyFilter(button.dataset.filter || 'all', currentTimeFilter);
      if (mobileSearchQuery.matches) closeFiltersPanel();
    }));

    timeButtons.forEach((button) => button.addEventListener('click', () => {
      timeButtons.forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      applyFilter(currentFilter, button.dataset.timeFilter || 'all');
      if (mobileSearchQuery.matches) closeFiltersPanel();
    }));

    filtersToggles.forEach((toggle) => toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleFiltersPanel();
    }));

    selectToggles.forEach((toggle) => toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSelectPanel();
    }));

    root.querySelectorAll('[data-doke-panel-close]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeFiltersPanel();
        closeSelectPanel();
      });
    });

    selectModeButtons.forEach((button) => button.addEventListener('click', () => {
      const mode = button.dataset.notificationsSelectMode || 'single';
      setSelectionEnabled(true);
      clearSelection();
      if (mode === 'all') {
        refreshCards().forEach((card) => {
          if (card.dataset.dismissed !== 'true' && !card.hidden) setCardSelected(card, true);
        });
      }
      syncSelectedActions();
      openSelectPanel();
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

    root.querySelectorAll('[data-notifications-clear-filter]').forEach((button) => button.addEventListener('click', () => {
      const allButton = root.querySelector('[data-filter="all"]');
      const allTimeButton = root.querySelector('[data-time-filter="all"]');
      if (allButton) { buttons.forEach((item) => item.classList.remove('is-active')); allButton.classList.add('is-active'); }
      if (allTimeButton) { timeButtons.forEach((item) => item.classList.remove('is-active')); allTimeButton.classList.add('is-active'); }
      applyFilter('all', 'all');
      closeFiltersPanel();
    }));

    const syncSearchInputs = (source) => {
      const value = source?.value || '';
      searchInputs.forEach((input) => {
        if (input !== source) input.value = value;
      });
    };

    searchInputs.forEach((input) => {
      input.addEventListener('input', () => {
        syncSearchInputs(input);
        applyFilter(currentFilter, currentTimeFilter);
      });

      input.addEventListener('focus', () => {
        setSearchExpanded(true);
      });
    });

    searchForms.forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (mobileSearchQuery.matches && !root.classList.contains('is-search-open')) {
          setSearchExpanded(true);
          searchInputs.at(-1)?.focus();
          return;
        }
        applyFilter(currentFilter, currentTimeFilter);
      });
    });

    mobileSearchToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setSearchExpanded(true);
      window.setTimeout(() => searchInputs.at(-1)?.focus(), 0);
    });

    searchCloseButtons.forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      searchInputs.forEach((input) => {
        input.value = '';
        input.blur();
      });
      setSearchExpanded(false);
      applyFilter(currentFilter, currentTimeFilter);
    }));

    root.querySelectorAll('[data-mark-read]').forEach((button) => button.addEventListener('click', () => {
      button.closest('.notification-card')?.classList.remove('is-unread');
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
    }));

    root.querySelectorAll('[data-mark-read-icon]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.closest('.notification-card')?.classList.remove('is-unread');
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
    }));

    const getPrimaryHref = (card) => card?.querySelector('.notification-card__inline-actions a[href]')?.getAttribute('href') || '';

    const openSelectedCard = (preferredToken = '') => {
      const selected = selectedCards();
      const target = preferredToken
        ? selected.find((card) => (card.dataset.catégory || '').split(/\s+/).includes(preferredToken))
        : selected.find(Boolean);

      const href = getPrimaryHref(target);
      if (href) window.location.href = href;
    };

    openSelectedButton?.addEventListener('click', () => {
      openSelectedCard('orders');
    });

    openChatSelectedButton?.addEventListener('click', () => {
      openSelectedCard('messages');
    });

    root.querySelectorAll('[data-dismiss-notification]').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('.notification-card');
      if (!card) return;
      card.dataset.dismissed = 'true';
      card.hidden = true;
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
    }));

    clearSelectedButton?.addEventListener('click', () => {
      clearSelection();
      syncSelectedActions();
    });

    refreshCards().forEach((card) => {
      card.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.notification-card__inline-actions')) return;
        if (selectionEnabled) {
          if (target.closest(selectableCardInteractiveSelector)) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
          return;
        }

        const primaryAction = card.querySelector('.notification-card__inline-actions a[href]');
        const href = primaryAction?.getAttribute('href');
        if (href) window.location.href = href;
      });

      card.addEventListener('keydown', (event) => {
        if (!selectionEnabled || (event.key !== ' ' && event.key !== 'Enter')) return;
        event.preventDefault();
        toggleCardSelected(card);
        syncSelectedActions();
      });
    });

    refreshCards().forEach((card) => {
      if (!card.querySelector('.notification-card__context-actions')) {
        const actions = document.createElement('div');
        actions.className = 'notification-card__context-actions';
        actions.innerHTML = `
          <button class="notification-card__context-button" type="button" data-context-action="select">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
            <span>Selecionar</span>
          </button>
          <button class="notification-card__context-button notification-card__context-button--danger" type="button" data-context-action="delete">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5h6"></path><path d="M5.5 7.5h13"></path><path d="M8 7.5v11"></path><path d="M16 7.5v11"></path><path d="M6.5 7.5 7 19a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l.5-11.5"></path></svg>
            <span>Apagar</span>
          </button>
        `;
        card.appendChild(actions);

        actions.querySelector('[data-context-action="select"]')?.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelectionEnabled(true);
          openSelectPanel();
          toggleCardSelected(card);
          if (!selectedCards().length) {
            setSelectionEnabled(false);
            closeSelectPanel();
          }
          syncSelectedActions();
          closeContextMenu();
        });

        actions.querySelector('[data-context-action="delete"]')?.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          card.dataset.dismissed = 'true';
          card.hidden = true;
          updatéUnread();
          updatéStats();
          applyFilter(currentFilter, currentTimeFilter);
          closeContextMenu();
        });
      }

      card.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        openContextMenu(card);
      });

      card.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        longPressTimer = window.setTimeout(() => {
          openContextMenu(card);
        }, 450);
      });

      ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach((eventName) => {
        card.addEventListener(eventName, () => {
          if (longPressTimer) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        });
      });
    });

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
        const clickedFiltersToggle = target.closest('[data-notifications-filters-toggle], [data-shell-filter]');
        if (!clickedInsideFilters && !clickedFiltersToggle) closeFiltersPanel();
      }

      if (selectPanel && !selectPanel.hidden) {
        const clickedInsideSelect = target.closest('[data-notifications-select-panel]');
        const clickedSelectToggle = target.closest('[data-notifications-select-toggle], [data-shell-select]');
        if (!clickedInsideSelect && !clickedSelectToggle) {
          closeSelectPanel();
          setSelectionEnabled(false);
        }
      }

      if (!target.closest('.notification-card')) closeContextMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setSearchExpanded(false);
      closeSettingsPanel();
      closeFiltersPanel();
      closeSelectPanel();
      setSelectionEnabled(false);
      closeContextMenu();
    });

    syncContextPanelHost();
    refreshCards().forEach(bindNotificationCard);
    refreshLocalNotifications();
    document.addEventListener('doke:notification-created', refreshLocalNotifications);
    document.addEventListener('doke:order-created', refreshLocalNotifications);
    document.addEventListener('doke:message-sent', refreshLocalNotifications);
    document.addEventListener('doke:auth-session-change', refreshLocalNotifications);
    document.addEventListener('doke:auth-surface-ready', refreshLocalNotifications);
    updatéUnread();
    updatéStats();
    applyFilter('all', 'all');
    syncHeaderControls();
  };

  window.DokeInitNotifications = initNotifications;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNotifications, { once: true }); else initNotifications();
})();


(() => {
  const initInternalMobileHeaderMenu = () => {
    const toggle = document.querySelector('[data-internal-mobile-menu-toggle]');
    const menu = document.querySelector('[data-internal-mobile-menu]');
    if (!toggle || !menu || toggle.dataset.bound === 'true') return;
    toggle.dataset.bound = 'true';

    const close = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = menu.hidden;
      menu.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    menu.addEventListener('click', (event) => event.stopPropagation());

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-internal-mobile-menu]') || target.closest('[data-internal-mobile-menu-toggle]')) return;
      close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInternalMobileHeaderMenu, { once: true });
  } else {
    initInternalMobileHeaderMenu();
  }
})();
