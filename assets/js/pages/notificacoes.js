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
    let banCountdownTimer = 0;
    let cards = [];
    const refreshCards = () => {
      cards = [...root.querySelectorAll('.notification-card')];
      return cards;
    };
    const empty = root.querySelector('[data-notifications-empty]');
    let notificationsHydrationLocalReady = false;
    const hydration = window.DokePageHydration?.create({
      page: 'notificacoes',
      root,
      emptySelectors: ['[data-notifications-empty]'],
      skeletonSelectors: ['[data-notifications-hydration-skeleton]'],
      readySelectors: ['[data-notifications-hydration-ready]'],
      skeletonMode: 'route-and-document',
      readyPolicy: 'after-skeleton',
      waitFor: ['dom', 'auth', 'local-notifications'],
      minDuration: 0,
      maxDuration: 8000,
      hasItems: () => !notificationsHydrationLocalReady || [...root.querySelectorAll('.notification-card')]
        .some((card) => !card.hidden && card.dataset.dismissed !== 'true')
    }) || null;
    hydration?.start();
    hydration?.mark('dom');
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
    const dndDuration = root.querySelector('[data-notification-dnd-duration]');
    const priorityMin = root.querySelector('[data-notification-priority-min]');
    const mutedScopes = root.querySelector('[data-notification-muted-scopes]');
    const mutedScopesList = root.querySelector('[data-notification-muted-scopes-list]');
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
    let notificationsAccessAllowed = false;
    const navigateTo = (href, options = {}) => {
      if (!href || typeof window.DokeNavigate !== 'function') return false;
      window.DokeNavigate(href, Object.assign({ source: 'notifications-page' }, options));
      return true;
    };

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

    const getBanNotificationState = (notification) => {
      if (!notification || notification.type !== 'community_member_banned') return null;
      try {
        const url = new URL(notification.targetUrl || '', window.location.href);
        const expiresAt = url.searchParams.get('banExpiresAt') || '';
        const expiresAtMs = expiresAt ? Date.parse(expiresAt) : 0;
        return {
          expiresAt,
          expiresAtMs: Number.isFinite(expiresAtMs) ? expiresAtMs : 0,
          reason: url.searchParams.get('banReason') || '',
          moderator: url.searchParams.get('banModerator') || ''
        };
      } catch (_error) {
        return { expiresAt: '', expiresAtMs: 0, reason: '', moderator: '' };
      }
    };

    const formatBanCountdown = (expiresAtMs) => {
      if (!expiresAtMs) return 'Banimento permanente';
      const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
      if (!remainingSeconds) return 'Banimento encerrado';
      const days = Math.floor(remainingSeconds / 86400);
      const hours = Math.floor((remainingSeconds % 86400) / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;
      if (days) return `Tempo restante: ${days}d ${String(hours).padStart(2, '0')}h`;
      if (hours) return `Tempo restante: ${hours}h ${String(minutes).padStart(2, '0')}m`;
      if (minutes) return `Tempo restante: ${minutes}m ${String(seconds).padStart(2, '0')}s`;
      return `Tempo restante: ${seconds}s`;
    };

    const refreshBanNotificationCountdowns = () => {
      const nodes = [...root.querySelectorAll('[data-notification-ban-countdown]')];
      if (!nodes.length) {
        if (banCountdownTimer) window.clearInterval(banCountdownTimer);
        banCountdownTimer = 0;
        return;
      }
      nodes.forEach((node) => {
        const expiresAtMs = Number(node.dataset.notificationBanExpiresAt || 0);
        node.textContent = formatBanCountdown(expiresAtMs);
        node.classList.toggle('is-expired', Boolean(expiresAtMs && expiresAtMs <= Date.now()));
      });
    };

    const ensureBanNotificationCountdown = () => {
      refreshBanNotificationCountdowns();
      if (banCountdownTimer || !root.querySelector('[data-notification-ban-countdown]')) return;
      banCountdownTimer = window.setInterval(refreshBanNotificationCountdowns, 1000);
    };

    const renderLocalNotificationCard = (notification) => {
      const category = notification.category || 'social';
      const isRead = Boolean(notification.read);
      const unreadClass = isRead ? '' : ' is-unread';
      const unreadToken = isRead ? '' : ' unread';
      const markReadLabel = isRead ? 'Lida' : 'Marcar lida';
      const banState = getBanNotificationState(notification);
      const banCountdownMarkup = banState
        ? `<div class="notification-card__ban-status" data-notification-ban-countdown data-notification-ban-expires-at="${escapeHtml(String(banState.expiresAtMs || ''))}">${escapeHtml(formatBanCountdown(banState.expiresAtMs))}</div>`
        : '';
      const card = document.createElement('article');
      card.className = `notification-card${unreadClass} ${getCategoryClass(category)} doke-card doke-notification-card`;
      card.dataset.category = `${category}${unreadToken}`;
      card.dataset.catégory = `${category}${unreadToken}`;
      card.dataset.age = toAgeToken(notification.createdAt);
      card.dataset.notificationId = notification.id;
      card.dataset.domainCard = 'notification';
      card.dataset.localNotification = 'true';
      card.dataset.read = isRead ? 'true' : 'false';
      card.innerHTML = `
        <button class="notification-card__read-toggle doke-icon-btn doke-icon-btn--flat" type="button" data-mark-read-icon aria-label="${isRead ? 'Notificação lida' : 'Marcar como lida'}"${isRead ? ' disabled aria-disabled="true"' : ''}>
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
          ${banCountdownMarkup}
          ${notification.actionMessage ? `<p class="notification-card__action-status" data-status="${escapeHtml(notification.actionStatus || 'completed')}">${escapeHtml(notification.actionMessage)}</p>` : ''}
          <div class="notification-card__inline-actions">
            <a class="notification-card__inline-action doke-btn doke-btn--link" href="${escapeHtml(notification.targetUrl || 'notificacoes.html')}">${escapeHtml(notification.actionLabel || 'Abrir')}</a>
            <button class="notification-card__inline-action doke-btn doke-btn--link" type="button" data-mark-read${isRead ? ' disabled aria-disabled="true"' : ''}>${markReadLabel}</button>
            <button class="notification-card__inline-action notification-card__inline-action--danger doke-btn doke-btn--link" type="button" data-dismiss-notification>Dispensar</button>
          </div>
        </div>
      `;
      return card;
    };

    const syncReadControls = (card) => {
      if (!card) return;
      const isRead = !card.classList.contains('is-unread');
      card.dataset.read = isRead ? 'true' : 'false';

      card.querySelectorAll('[data-mark-read-icon]').forEach((button) => {
        button.setAttribute('aria-label', isRead ? 'Notificação lida' : 'Marcar como lida');
        button.toggleAttribute('disabled', isRead);
        button.setAttribute('aria-disabled', isRead ? 'true' : 'false');
      });

      card.querySelectorAll('[data-mark-read]').forEach((button) => {
        button.textContent = isRead ? 'Lida' : 'Marcar lida';
        button.toggleAttribute('disabled', isRead);
        button.setAttribute('aria-disabled', isRead ? 'true' : 'false');
      });
    };

    const setNotificationRead = (card) => {
      if (!card || !card.classList.contains('is-unread')) {
        syncReadControls(card);
        return;
      }

      const id = card.dataset.notificationId || '';
      if (id) { getNotificationsService()?.markAsRead?.(id); window.DokeInAppNotifications?.markAsRead?.(id); }
      card.classList.remove('is-unread');
      const tokens = (card.dataset.catégory || card.dataset.category || '').split(/\s+/).filter((token) => token !== 'unread');
      card.dataset.catégory = tokens.join(' ');
      card.dataset.category = tokens.join(' ');
      syncReadControls(card);
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
    };

    const finalizeDismissNotification = (card) => {
      if (!card) return;
      const group = card.closest('.notifications-group');
      card.dataset.dismissed = 'true';
      card.classList.remove('is-dismissing');
      card.remove();

      if (group && !group.querySelector('.notification-card')) {
        group.remove();
      }

      refreshCards();
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
      syncEmptyState();
      syncSelectedActions();
    };

    const restoreDismissedCard = (snapshot) => {
      if (!snapshot?.card || !snapshot.parent) return;
      const { card, parent, nextSibling } = snapshot;
      if (!card.isConnected) parent.insertBefore(card, nextSibling?.isConnected ? nextSibling : null);
      card.dataset.dismissed = 'false';
      card.classList.remove('is-dismissing');
      card.removeAttribute('aria-hidden');
      card.querySelectorAll('a, button, input, select, textarea').forEach((control) => {
        control.removeAttribute('tabindex');
        if (control instanceof HTMLButtonElement) control.disabled = false;
      });
      syncReadControls(card);
      refreshCards().forEach(bindNotificationCard);
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
      syncEmptyState();
      syncSelectedActions();
    };

    const dismissNotificationCard = (card) => {
      if (!card || card.dataset.dismissed === 'true' || card.classList.contains('is-dismissing')) return;

      const id = card.dataset.notificationId || '';
      const service = getNotificationsService();
      if (!id || !service || typeof service.dismiss !== 'function') {
        finalizeDismissNotification(card);
        return;
      }

      const mutation = window.Doke?.experience?.optimistic;
      if (!mutation?.mutate) {
        Promise.resolve(service.dismiss(id))
          .then(() => finalizeDismissNotification(card))
          .catch(() => restoreDismissedCard({ card, parent: card.parentElement, nextSibling: card.nextSibling }));
        return;
      }

      mutation.mutate({
        key: `notifications:dismiss:${id}`,
        boundary: root,
        finalState: 'ready',
        apply: () => {
          const snapshot = { card, parent: card.parentElement, nextSibling: card.nextSibling };
          card.classList.add('is-dismissing');
          card.setAttribute('aria-hidden', 'true');
          card.querySelectorAll('a, button, input, select, textarea').forEach((control) => {
            control.tabIndex = -1;
            if (control instanceof HTMLButtonElement) control.disabled = true;
          });
          return snapshot;
        },
        request: () => service.dismiss(id).then((result) => {
          if (!result) throw new Error('A notificação não pôde ser dispensada.');
          return result;
        }),
        commit: () => {
          finalizeDismissNotification(card);
          window.Doke?.experience?.cache?.invalidatePrefix?.('notifications:');
          window.Doke?.stableShellRouter?.invalidate?.('notificacoes.html');
        },
        rollback: (snapshot, error) => {
          restoreDismissedCard(snapshot);
          document.dispatchEvent(new CustomEvent('doke:notification-action-error', {
            detail: { action: 'dismiss', id, error: error?.message || String(error || '') }
          }));
        }
      }).catch(() => {});
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

      syncReadControls(card);

      card.querySelectorAll('[data-mark-read], [data-mark-read-icon]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setNotificationRead(card);
        });
      });

      card.querySelectorAll('[data-dismiss-notification]').forEach((button) => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          dismissNotificationCard(card);
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
        if (id) { getNotificationsService()?.markAsRead?.(id); window.DokeInAppNotifications?.markAsRead?.(id); }
        const primaryAction = card.querySelector('.notification-card__inline-actions a[href]');
        const href = primaryAction?.getAttribute('href');
        if (href) navigateTo(href);
      });
    };

    const renderNotificationItems = (items) => {
      const group = getCanonicalTodayGroup();
      if (!group) return false;

      root.querySelectorAll('[data-local-notification="true"]').forEach((card) => card.remove());
      localCards.length = 0;

      const insertionAnchor = group.firstChild;
      (Array.isArray(items) ? items : [])
        .filter((notification) => !notification.dismissed)
        .slice()
        .forEach((notification) => {
          const card = renderLocalNotificationCard(notification);
          group.insertBefore(card, insertionAnchor);
          localCards.push(card);
          bindNotificationCard(card);
        });

      if (!localCards.length) group.remove();

      refreshCards().forEach(bindNotificationCard);
      updatéUnread();
      updatéStats();
      applyFilter(currentFilter, currentTimeFilter);
      syncSelectedActions();
      notificationsHydrationLocalReady = true;
      ensureBanNotificationCountdown();
      hydration?.mark('local-notifications');
      return true;
    };

    const getNotificationsCacheKey = () => {
      const user = window.Doke?.session?.getCurrentUser?.();
      return `notifications:${user?.id || 'guest'}`;
    };

    const refreshLocalNotifications = ({ force = false } = {}) => {
      const service = getNotificationsService();
      const center = window.DokeInAppNotifications;
      if (!notificationsAccessAllowed) return Promise.resolve(false);
      if (!service && !center) {
        notificationsHydrationLocalReady = true;
        hydration?.mark('local-notifications');
        return Promise.resolve(true);
      }

      const cache = window.Doke?.experience?.cache;
      const fetcher = () => {
        const centerItems = center?.list?.() || [];
        if (typeof service?.list === 'function') return Promise.resolve(service.list({ dismissed: false, currentUser: true })).then((items) => [...centerItems, ...(Array.isArray(items) ? items : [])].filter((item, index, all) => all.findIndex((entry) => String(entry.id) === String(item.id)) === index));
        if (typeof service?.listLocal === 'function') return Promise.resolve([...centerItems, ...service.listLocal({ dismissed: false })].filter((item, index, all) => all.findIndex((entry) => String(entry.id) === String(item.id)) === index));
        return Promise.resolve(centerItems);
      };

      if (!cache?.query) {
        return fetcher().then(renderNotificationItems);
      }

      const hasRenderedItems = refreshCards().some((card) => card.dataset.dismissed !== 'true');
      window.Doke?.experience?.states?.set?.(root, hasRenderedItems ? 'refreshing' : 'loading');

      return cache.query({
        key: getNotificationsCacheKey(),
        fetcher,
        staleTime: 15000,
        keepPreviousData: true,
        force
      }).then((result) => {
        renderNotificationItems(result.data);
        window.Doke?.experience?.states?.set?.(root, 'ready');
        if (result.revalidate) {
          result.revalidate
            .then((freshItems) => renderNotificationItems(freshItems))
            .catch(() => window.Doke?.experience?.states?.set?.(root, 'ready'));
        }
        return true;
      }).catch((error) => {
        window.Doke?.experience?.states?.set?.(root, hasRenderedItems ? 'ready' : 'error', { error: error.message });
        if (!hasRenderedItems) hydration?.error(error, { source: 'notifications-service' });
        return false;
      });
    };


    const authorizeNotifications = ({ force = false } = {}) => {
      const accountAccess = window.Doke?.services?.accountAccess;
      if (!accountAccess?.guardPage) {
        const error = new Error('Serviço de autenticação indisponível.');
        hydration?.error(error, { source: 'notifications-account-access' });
        return Promise.resolve(false);
      }

      return accountAccess.guardPage({
        name: 'notifications-account-access',
        source: 'notificacoes.html'
      }).then((access) => {
        if (!access?.allowed) return false;
        notificationsAccessAllowed = true;
        hydration?.mark('auth');
        window.Doke?.experience?.cache?.invalidatePrefix?.('notifications:');
        return refreshLocalNotifications({ force: true });
      }).catch((error) => {
        notificationsAccessAllowed = false;
        hydration?.error(error, { source: 'notifications-account-access' });
        return false;
      });
    };
    document.addEventListener('doke:auth-session-change', () => authorizeNotifications({ force: true }));
    document.addEventListener('doke:page-hydration-ready', (event) => {
      if (event.detail?.page !== 'notificacoes') return;
      applyFilter(currentFilter, currentTimeFilter);
    });

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
      syncReadControls(card);
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
      const prefs = window.DokeInAppNotifications?.getPreferences?.() || {};
      settingsPanel.querySelectorAll('[data-notification-pref]').forEach((input) => { input.checked = prefs[input.dataset.notificationPref] !== false; });
      if (priorityMin) priorityMin.value = prefs.priorityMin || 'silent';
      if (mutedScopes && mutedScopesList) {
        const scopes = Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [];
        mutedScopes.hidden = scopes.length === 0;
        mutedScopesList.innerHTML = scopes.map((scope) => `<button class="doke-chip doke-btn" type="button" data-notification-unmute-scope="${escapeHtml(scope)}">${escapeHtml(prefs.mutedScopeLabels?.[scope] || scope)} <span aria-hidden="true">×</span></button>`).join('');
      }
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

    const hasVisibleNotificationCards = () => refreshCards().some((card) => {
      if (!card || card.dataset.dismissed === 'true' || card.hidden) return false;
      const group = card.closest('.notifications-group');
      return !group || !group.hidden;
    });

    const syncEmptyState = (hasVisibleNotification = hasVisibleNotificationCards()) => {
      if (!empty) return;
      const hasVisible = Boolean(hasVisibleNotification || hasVisibleNotificationCards());

      if (hydration && !hydration.canShowEmpty()) {
        hydration.syncEmpty({ hasItems: true });
      } else if (hydration) {
        hydration.syncEmpty({ hasItems: hasVisible });
      }

      root.classList.toggle('has-visible-notifications', hasVisible);
      root.classList.toggle('has-no-visible-notifications', !hasVisible);
      empty.hidden = hasVisible;
      empty.classList.toggle('is-hidden', hasVisible);
      empty.setAttribute('aria-hidden', hasVisible ? 'true' : 'false');
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

      syncEmptyState(visible > 0);
      window.requestAnimationFrame?.(() => syncEmptyState()) || syncEmptyState();
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
      settingsPanel?.querySelectorAll('[data-notification-pref]').forEach((input) => { input.checked = !['dndEnabled'].includes(input.dataset.notificationPref); });
      if (priorityMin) priorityMin.value = 'silent';
      if (dndDuration) dndDuration.value = '60';
    });

    settingsSave?.addEventListener('click', () => {
      if (!settingsPanel) return;
      const nextPrefs = {};
      settingsPanel.querySelectorAll('[data-notification-pref]').forEach((input) => { nextPrefs[input.dataset.notificationPref] = input.checked; });
      nextPrefs.priorityMin = priorityMin?.value || 'silent';
      if (nextPrefs.dndEnabled) nextPrefs.dndUntil = Date.now() + (Number(dndDuration?.value || 60) * 60000);
      else nextPrefs.dndUntil = 0;
      window.DokeInAppNotifications?.setPreferences?.(nextPrefs);
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

    settingsPanel?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-notification-unmute-scope]');
      if (!button) return;
      window.DokeInAppNotifications?.unmuteScope?.(button.dataset.notificationUnmuteScope || '');
      button.remove();
      if (mutedScopes && mutedScopesList && !mutedScopesList.children.length) mutedScopes.hidden = true;
    });

    document.addEventListener('doke:notification-center-changed', () => refreshLocalNotifications({ force: true }));

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

    root.querySelectorAll('[data-mark-read]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setNotificationRead(button.closest('.notification-card'));
    }));

    root.querySelectorAll('[data-mark-read-icon]').forEach((button) => button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setNotificationRead(button.closest('.notification-card'));
    }));

    const getPrimaryHref = (card) => card?.querySelector('.notification-card__inline-actions a[href]')?.getAttribute('href') || '';

    const openSelectedCard = (preferredToken = '') => {
      const selected = selectedCards();
      const target = preferredToken
        ? selected.find((card) => (card.dataset.catégory || '').split(/\s+/).includes(preferredToken))
        : selected.find(Boolean);

      const href = getPrimaryHref(target);
      if (href) navigateTo(href);
    };

    openSelectedButton?.addEventListener('click', () => {
      openSelectedCard('orders');
    });

    openChatSelectedButton?.addEventListener('click', () => {
      openSelectedCard('messages');
    });

    root.querySelectorAll('[data-dismiss-notification]').forEach((button) => button.addEventListener('click', () => {
      const card = button.closest('.notification-card');
      dismissNotificationCard(card);
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
        if (href) navigateTo(href);
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
          <button class="notification-card__context-button doke-btn doke-btn--ghost" type="button" data-context-action="select">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
            <span>Selecionar</span>
          </button>
          <button class="notification-card__context-button notification-card__context-button--danger doke-btn doke-btn--danger" type="button" data-context-action="delete">
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
          dismissNotificationCard(card);
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
    authorizeNotifications({ force: true });
    const refreshAfterDomainEvent = () => {
      window.Doke?.experience?.cache?.invalidatePrefix?.('notifications:');
      refreshLocalNotifications({ force: true });
    };
    document.addEventListener('doke:notification-created', refreshAfterDomainEvent);
    document.addEventListener('doke:order-created', refreshAfterDomainEvent);
    document.addEventListener('doke:message-sent', refreshAfterDomainEvent);
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
