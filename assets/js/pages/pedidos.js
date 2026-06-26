(() => {
  const initOrdersPage = () => {
    const root = document.querySelector('.orders-page');
    if (!root || root.dataset.ordersReady === 'true') return;
    root.dataset.ordersReady = 'true';

    const drawerController = new AbortController();
    window.DokeHomeDrawer?.create({ signal: drawerController.signal })?.();

    const filterButtons = Array.from(root.querySelectorAll('.orders-filter-item[data-filter]'));
    let cards = [];
    const ordersList = root.querySelector('.orders-list');
    const refreshCards = () => {
      cards = Array.from(root.querySelectorAll('.order-card[data-status]'));
      return cards;
    };
    const searchInput = root.querySelector('.orders-header-search input');
    const searchForm = searchInput?.closest('form');
    const searchTrigger = root.querySelector('[data-orders-mobile-search-toggle]') || searchForm?.querySelector('.orders-header-search__icon');
    const searchClose = searchForm?.querySelector('.orders-header-search__close');
    const filterToggles = Array.from(root.querySelectorAll('[data-orders-filter-toggle]'));
    const popover = root.querySelector('[data-orders-filters-popover]');
    const headerControls = root.querySelector('.orders-page-header__controls');
    const activeChip = root.querySelector('[data-orders-active-chip]');
    const filterStatusStack = root.querySelector('.orders-filter-status-stack');
    const clearFilterButtons = Array.from(root.querySelectorAll('[data-orders-clear-filter]'));
    const clearFilterButton = clearFilterButtons[0] || null;
    const filterCountNodes = {
      all: root.querySelector('[data-orders-filter-count="all"]'),
      pending: root.querySelector('[data-orders-filter-count="pending"]'),
      conversation: root.querySelector('[data-orders-filter-count="conversation"]'),
      responded: root.querySelector('[data-orders-filter-count="responded"]'),
      completed: root.querySelector('[data-orders-filter-count="completed"]'),
      cancelled: root.querySelector('[data-orders-filter-count="cancelled"]')
    };
    const emptyStaté = root.querySelector('[data-orders-empty]');
    const emptyText = root.querySelector('[data-orders-empty-text]');
    const resetEmptyButton = root.querySelector('[data-orders-reset-empty]');
    const hydration = window.DokePageHydration?.create({
      page: 'pedidos',
      root,
      emptySelectors: ['[data-orders-empty]'],
      skeletonSelectors: [
        '[data-orders-hydration-skeleton]',
        '[data-orders-hydration-count-skeleton]'
      ],
      readySelectors: [
        '[data-orders-hydration-ready]',
        '[data-orders-hydration-count-ready]'
      ],
      splashSelectors: ['[data-orders-document-preloader]'],
      splashDuration: 520,
      skeletonMode: 'document-load',
      waitFor: ['dom', 'auth', 'local-orders'],
      minDuration: 220,
      maxDuration: 1000,
      hasItems: () => Array.from(root.querySelectorAll('.orders-list .order-card[data-status]'))
        .some((card) => !card.hidden && card.getAttribute('aria-hidden') !== 'true')
    }) || null;
    hydration?.start();
    const statNodes = {
      all: root.querySelector('[data-orders-stat="all"]'),
      pending: root.querySelector('[data-orders-stat="pending"]'),
      conversation: root.querySelector('[data-orders-stat="conversation"]'),
      completed: root.querySelector('[data-orders-stat="completed"]')
    };
    const selectToggles = Array.from(root.querySelectorAll('[data-orders-select-toggle]'));
    const selectPanel = root.querySelector('[data-orders-select-panel]');
    const clearSelectedButton = root.querySelector('[data-orders-clear-selected]');
    const openSelectedButton = root.querySelector('[data-orders-open-selected]');
    const openChatSelectedButton = root.querySelector('[data-orders-open-chat-selected]');
    const selectSummary = root.querySelector('[data-orders-select-summary]');
    const agendaToggles = Array.from(document.querySelectorAll('[data-orders-agenda-toggle]'));
    const panelScrim = root.querySelector('.orders-panel-scrim');
    const sidePanels = Array.from(root.querySelectorAll('.orders-sidepanel'));
    const detailTitle = root.querySelector('[data-orders-detail-title]');
    const detailStatus = root.querySelector('[data-orders-detail-status]');
    const detailPro = root.querySelector('[data-orders-detail-pro]');
    const detailAddress = root.querySelector('[data-orders-detail-address]');
    const detailSummary = root.querySelector('[data-orders-detail-summary]');
    const detailScope = root.querySelector('[data-orders-detail-scope]');
    const detailTimeline = root.querySelector('[data-orders-detail-timeline]');
    const detailMatérials = root.querySelector('[data-orders-detail-matérials]');
    const detailBudget = root.querySelector('[data-orders-detail-budget]');
    const detailPayment = root.querySelector('[data-orders-detail-payment]');
    const detailFlow = root.querySelector('[data-orders-detail-flow]');
    const detailNext = root.querySelector('[data-orders-detail-next]');
    const planner = root.querySelector('[data-orders-planner]');
    const plannerEvents = Array.from(root.querySelectorAll('[data-orders-event-daté]'));
    const plannerAgendaTitle = root.querySelector('[data-orders-agenda-title]');
    const plannerAgendaSubtitle = root.querySelector('[data-orders-agenda-subtitle]');
    const plannerAgendaEmpty = root.querySelector('[data-orders-agenda-empty]');
    const plannerCalendarDays = root.querySelector('[data-orders-calendar-days]');
    const plannerMonthLabel = root.querySelector('[data-orders-month-label]');
    const plannerMonthPrev = root.querySelector('[data-orders-month-prev]');
    const plannerMonthNext = root.querySelector('[data-orders-month-next]');
    const plannerMonthPopover = root.querySelector('[data-orders-month-popover]');
    const plannerMonthSelect = root.querySelector('[data-orders-month-select]');
    const plannerYearInput = root.querySelector('[data-orders-year-input]');
    const plannerMonthApply = root.querySelector('[data-orders-month-apply]');
    const plannerMonthCancel = root.querySelector('[data-orders-month-cancel]');
    const plannerCalendarSummary = root.querySelector('[data-orders-calendar-summary]');
    const plannerCalendarSummaryLabel = root.querySelector('[data-orders-calendar-summary-label]');
    const plannerCalendarSummaryAction = root.querySelector('[data-orders-calendar-summary-action]');

    const mobileMenuToggle = document.querySelector('[data-orders-mobile-menu-toggle]');
    const mobileMenu = document.querySelector('[data-orders-mobile-menu]');

    const closeMobileMenu = () => {
      if (!mobileMenu || !mobileMenuToggle) return;
      mobileMenu.hidden = true;
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
    };

    const toggleMobileMenu = () => {
      if (!mobileMenu || !mobileMenuToggle) return;
      const willOpen = mobileMenu.hidden;
      mobileMenu.hidden = !willOpen;
      mobileMenuToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    };

    const mobileCalendarQuery = window.matchMedia('(max-width: 760px)');
    let longPressTimer = null;

    const labels = {
      all: 'Todos',
      pending: 'Aguardando resposta',
      conversation: 'Pedido aceito',
      responded: 'Propostas',
      completed: 'Concluídos',
      cancelled: 'Cancelados',
    };

    const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const counts = { all: 0, pending: 0, conversation: 0, responded: 0, completed: 0, cancelled: 0 };

    const recountCards = () => {
      counts.all = root.querySelectorAll('.order-card').length;
      counts.pending = root.querySelectorAll('.order-card[data-status="pending"]').length;
      counts.conversation = root.querySelectorAll('.order-card[data-status="accepted"], .order-card[data-status="conversation"]').length;
      counts.responded = root.querySelectorAll('.order-card[data-status="responded"], .order-card[data-status="quoted"], .order-card[data-status="in_progress"]').length;
      counts.completed = root.querySelectorAll('.order-card[data-status="completed"]').length;
      counts.cancelled = root.querySelectorAll('.order-card[data-status="cancelled"]').length;
    };

    const syncStats = () => {
      Object.entries(statNodes).forEach(([key, node]) => {
        if (node) node.textContent = String(counts[key] ?? 0);
      });

      Object.entries(filterCountNodes).forEach(([key, node]) => {
        if (node) node.textContent = String(counts[key] ?? 0);
      });

      filterButtons.forEach((button) => {
        const filter = button.dataset.filter;
        const labelNode = button.childNodes[0];
        if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
          labelNode.textContent = `${labels[filter]} `;
        }
      });
    };

    const syncActiveChip = () => {
      const active = root.dataset.activeFilter || 'all';
      const hasOpenPanels = Boolean(
        (popover && !popover.hidden)
        || (selectPanel && !selectPanel.hidden)
      );
      if (activeChip) {
        activeChip.textContent = `${labels[active]} ${counts[active] ?? 0}`;
        activeChip.hidden = active === 'all';
      }
      if (clearFilterButton) clearFilterButton.hidden = selecting || (active === 'all' && !hasOpenPanels);
      syncHeaderControls();
    };

    const syncHeaderControls = () => {
      if (!headerControls) return;
      const showStatusStack = Boolean(
        (activeChip && !activeChip.hidden)
        || (clearFilterButton && !clearFilterButton.hidden)
      );
      if (filterStatusStack) filterStatusStack.hidden = !showStatusStack;
      const showControls = Boolean(
        (popover && !popover.hidden)
        || (selectPanel && !selectPanel.hidden)
        || showStatusStack
      );
      headerControls.hidden = !showControls;
    };

    const syncOrdersEmptyState = (visibleCount = 0, hasQuery = false) => {
      if (!emptyStaté) return;
      const hasAnyVisibleCard = Array.from(root.querySelectorAll('.orders-list .order-card[data-status]'))
        .some((card) => !card.hidden && card.getAttribute('aria-hidden') !== 'true');
      const hasVisibleOrder = visibleCount > 0 || hasAnyVisibleCard;
      if (hydration && !hydration.canShowEmpty()) {
        hydration.syncEmpty({ hasItems: true });
      } else if (hydration) {
        hydration.syncEmpty({ hasItems: hasVisibleOrder });
      } else {
        emptyStaté.hidden = hasVisibleOrder;
        emptyStaté.setAttribute('aria-hidden', hasVisibleOrder ? 'true' : 'false');
      }
      if (!emptyText) return;
      emptyText.textContent = hasQuery
        ? 'Nenhum pedido combinou com essa busca. Tente outro termo ou limpe os filtros para voltar a ver tudo.'
        : 'Você pode limpar o filtro atual ou voltar para a base para solicitar um novo orçamento.';
    };

    const applyFilters = () => {
      const active = root.dataset.activeFilter || 'all';
      const query = normalize(searchInput?.value || '');
      let visibleCount = 0;
      const groupedStatuses = {
        conversation: ['accepted', 'conversation'],
        responded: ['responded', 'quoted', 'in_progress']
      };
      refreshCards().forEach((card) => {
        const cardStatus = card.dataset.status || '';
        const filterStatuses = groupedStatuses[active] || [active];
        const matchesFilter = active === 'all' || filterStatuses.includes(cardStatus);
        const matchesSearch = !query || normalize(card.textContent || '').includes(query);
        const visible = matchesFilter && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      syncOrdersEmptyState(visibleCount, Boolean(query));
      syncActiveChip();
    };

    const closePopover = () => {
      if (popover) popover.hidden = true;
      filterToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
      syncHeaderControls();
    };

    const openPopover = () => {
      if (!popover) return;
      if (headerControls) headerControls.hidden = false;
      popover.hidden = false;
      filterToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'true'));
      closeSelectPanel();
      syncHeaderControls();
    };

    const closeContextMenu = () => {
      refreshCards().forEach((card) => card.classList.remove('is-context-open'));
    };

    const openContextMenu = (card) => {
      closeContextMenu();
      card.classList.add('is-context-open');
    };

    const openPanel = (type, card) => {
      if (type === 'chat') {
        const id = card?.dataset.id || '';
        const href = `mensagens.html?order=${encodeURIComponent(id)}`;
        if (window.DokeNavigate) {
          window.DokeNavigate(href);
        } else {
          window.location.href = href;
        }
        return;
      }

      sidePanels.forEach((panel) => {
        panel.hidden = panel.dataset.ordersPanel !== type;
      });
      document.body.classList.add('orders-overlay-open');
      if (panelScrim) panelScrim.hidden = false;

      if (card && type === 'details') {
        if (detailTitle) detailTitle.textContent = card.querySelector('h2')?.textContent || 'Pedido';
        if (detailStatus) detailStatus.textContent = card.dataset.detailStatus || card.querySelector('.order-card__status-text')?.textContent || 'Status indisponível';
        if (detailPro) detailPro.textContent = card.querySelector('.order-card__subtitle strong')?.textContent || 'Profissional';
        if (detailAddress) detailAddress.textContent = card.dataset.detailAddress || card.querySelector('.order-card__location')?.textContent || 'Endereço indisponível';
        if (detailSummary) detailSummary.textContent = card.querySelector('.order-card__subtitle')?.textContent || '';
        if (detailScope) detailScope.textContent = card.dataset.detailScope || 'Escopo não informado';
        if (detailTimeline) detailTimeline.textContent = card.dataset.detailTimeline || card.querySelector('.order-card__meta span:last-child')?.textContent || 'Prazo não informado';
        if (detailMatérials) detailMatérials.textContent = card.dataset.detailMatérials || 'Matériais não informados';
        if (detailBudget) detailBudget.textContent = card.dataset.detailBudget || 'Faixa de orçamento não informada';
        if (detailPayment) detailPayment.textContent = card.dataset.detailPayment || 'Pagamento não informado';
        if (detailFlow) detailFlow.textContent = card.dataset.detailFlow || card.querySelector('.order-card__deadline span:last-child')?.textContent || 'Próximo passo não informado';
        if (detailNext) detailNext.textContent = card.querySelector('.order-card__deadline span:last-child')?.textContent || '';
      }
    };

    const eventsByDaté = new Map();
    plannerEvents.forEach((eventItem) => {
      const daté = eventItem.dataset.ordersEventDaté;
      if (!daté) return;
      const list = eventsByDaté.get(daté) || [];
      list.push(eventItem);
      eventsByDaté.set(daté, list);
    });

    let plannerDayButtons = [];
    let currentPlannerDaté = '2026-04-14';
    let currentPlannerMonth = { year: 2026, month: 3 };

    const getPlannerVisibleEventsCount = (daté) => (eventsByDaté.get(daté) || []).length;

    const syncPlannerFirstPaintState = () => {
      if (!planner) return;
      root.classList.add('is-calendar-expanded');
      const visibleEvents = getPlannerVisibleEventsCount(currentPlannerDaté);
      if (plannerAgendaTitle) plannerAgendaTitle.textContent = 'Hoje';
      if (plannerAgendaSubtitle) {
        plannerAgendaSubtitle.textContent = visibleEvents
          ? `${visibleEvents} compromisso${visibleEvents > 1 ? 's' : ''} no dia`
          : 'Sem compromissos marcados para este dia';
      }
      if (plannerCalendarSummaryLabel) {
        plannerCalendarSummaryLabel.textContent = `14 abr • ${visibleEvents} compromisso${visibleEvents === 1 ? '' : 's'}`;
      }
      if (plannerCalendarSummaryAction) plannerCalendarSummaryAction.textContent = 'Fechar calendário';
    };

    const formatAgendaTitle = (daté) => {
      const today = '2026-04-14';
      const tomorrow = '2026-04-15';
      if (daté === today) return 'Hoje';
      if (daté === tomorrow) return 'Amanhã';
      const parsed = new Date(`${daté}T12:00:00`);
      return parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    };

    const updatéPlannerMonthLabel = () => {
      const labelDaté = new Date(currentPlannerMonth.year, currentPlannerMonth.month, 1, 12);
      if (plannerMonthLabel) {
        plannerMonthLabel.textContent = labelDaté.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }
    };

    const formatPlannerSummaryDaté = (daté) => {
      const parsed = new Date(`${daté}T12:00:00`);
      return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    };

    const setCalendarExpanded = (expanded) => {
      root.classList.toggle('is-calendar-expanded', expanded);
      if (plannerCalendarSummaryAction) {
        plannerCalendarSummaryAction.textContent = expanded ? 'Fechar calendário' : 'Ver calendário';
      }
    };

    const syncCalendarSummary = () => {
      if (!plannerCalendarSummaryLabel) return;
      const total = getPlannerVisibleEventsCount(currentPlannerDaté);
      plannerCalendarSummaryLabel.textContent = `${formatPlannerSummaryDaté(currentPlannerDaté)} • ${total} compromisso${total === 1 ? '' : 's'}`;
      if (plannerCalendarSummaryAction) {
        plannerCalendarSummaryAction.textContent = root.classList.contains('is-calendar-expanded') ? 'Fechar calendário' : 'Ver calendário';
      }
    };

    const syncCalendarPresentation = () => {
      if (mobileCalendarQuery.matches) {
        if (!root.dataset.calendarMobileReady) {
          setCalendarExpanded(false);
          root.dataset.calendarMobileReady = 'true';
        }
      } else {
        setCalendarExpanded(true);
        delete root.dataset.calendarMobileReady;
      }
      syncCalendarSummary();
    };

    const renderPlannerCalendar = () => {
      if (!plannerCalendarDays) return;

      const firstDay = new Date(currentPlannerMonth.year, currentPlannerMonth.month, 1, 12);
      const startWeekday = (firstDay.getDay() + 6) % 7;
      const daysInMonth = new Date(currentPlannerMonth.year, currentPlannerMonth.month + 1, 0).getDate();
      const daysInPrevMonth = new Date(currentPlannerMonth.year, currentPlannerMonth.month, 0).getDate();
      const cells = [];

      for (let index = 0; index < startWeekday; index += 1) {
        const dayNumber = daysInPrevMonth - startWeekday + index + 1;
        cells.push(`<button class="orders-planner__day is-muted" type="button" disabled>${dayNumber}</button>`);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const isoDaté = `${currentPlannerMonth.year}-${String(currentPlannerMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvents = eventsByDaté.has(isoDaté);
        const active = isoDaté === currentPlannerDaté;
        cells.push(
          `<button class="orders-planner__day${hasEvents ? ' has-events' : ''}${active ? ' is-active' : ''}" type="button" data-orders-day="${isoDaté}">${day}</button>`
        );
      }

      const totalCells = 42;
      const trailing = totalCells - cells.length;
      for (let index = 1; index <= trailing; index += 1) {
        cells.push(`<button class="orders-planner__day is-muted" type="button" disabled>${index}</button>`);
      }

      plannerCalendarDays.innerHTML = cells.join('');
      plannerDayButtons = Array.from(root.querySelectorAll('[data-orders-day]'));
      plannerDayButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const daté = button.dataset.ordersDay;
          if (!daté) return;
          currentPlannerDaté = daté;
          syncPlannerDay(daté);
          renderPlannerCalendar();
        });
      });
      updatéPlannerMonthLabel();
      syncCalendarSummary();
    };

    const syncPlannerMonthForm = () => {
      if (plannerMonthSelect) plannerMonthSelect.value = String(currentPlannerMonth.month);
      if (plannerYearInput) plannerYearInput.value = String(currentPlannerMonth.year);
    };

    const setPlannerMonthPopover = (open) => {
      if (!plannerMonthPopover) return;
      plannerMonthPopover.hidden = !open;
      if (open) syncPlannerMonthForm();
    };

    const syncPlannerDay = (daté) => {
      if (!planner) return;

      plannerDayButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.ordersDay === daté);
      });

      let visibleEvents = 0;
      plannerEvents.forEach((eventItem) => {
        const visible = eventItem.dataset.ordersEventDaté === daté;
        eventItem.hidden = !visible;
        if (visible) visibleEvents += 1;
      });

      if (plannerAgendaTitle) plannerAgendaTitle.textContent = formatAgendaTitle(daté);
      if (plannerAgendaSubtitle) {
        plannerAgendaSubtitle.textContent = visibleEvents
          ? `${visibleEvents} compromisso${visibleEvents > 1 ? 's' : ''} no dia`
          : 'Sem compromissos marcados para este dia';
      }
      if (plannerAgendaEmpty) plannerAgendaEmpty.hidden = visibleEvents !== 0;
      syncCalendarSummary();
    };

    const mobileSearchQuery = window.matchMedia('(max-width: 640px)');

    const setSearchExpanded = (expanded) => {
      root.classList.toggle('is-search-open', expanded);
      if (searchTrigger) searchTrigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    };

    if (panelScrim && panelScrim.parentElement !== document.body) {
      document.body.appendChild(panelScrim);
    }
    sidePanels.forEach((panel) => {
      if (panel.parentElement !== document.body) {
        document.body.appendChild(panel);
      }
    });

    const closePanels = () => {
      sidePanels.forEach((panel) => {
        panel.hidden = true;
      });
      document.body.classList.remove('orders-overlay-open');
      if (panelScrim) panelScrim.hidden = true;
    };

    const setAgendaExpanded = (expanded) => {
      root.classList.toggle('is-agenda-collapsed', !expanded);
      agendaToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', String(expanded)));
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
        root.dataset.activeFilter = button.dataset.filter || 'all';
        applyFilters();
        syncHeaderControls();
      });
    });

    filterToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !popover || popover.hidden;
        closePopover();
        closeSelectPanel();
        if (willOpen) openPopover();
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (root.classList.contains('is-search-open')) {
        const clickedInsideSearch = target.closest('.orders-page-header__search');
        if (!clickedInsideSearch && !(searchInput?.value || '').trim()) setSearchExpanded(false);
      }

      if (popover && !popover.hidden) {
        const clickedFilterToggle = target.closest('[data-orders-filter-toggle], [data-shell-filter]');
        if (!popover.contains(target) && !clickedFilterToggle) {
          closePopover();
        }
      }

      if (selectPanel && !selectPanel.hidden) {
        const clickedInsideSelect = target.closest('[data-orders-select-panel]');
        const clickedSelectToggle = target.closest('[data-orders-select-toggle], [data-shell-select]');
        if (!clickedInsideSelect && !clickedSelectToggle) {
          selecting = false;
          syncSelectState();
        }
      }

      if (plannerMonthPopover && !plannerMonthPopover.hidden) {
        if (!plannerMonthPopover.contains(target) && !plannerMonthLabel?.contains(target)) {
          setPlannerMonthPopover(false);
        }
      }
    });

    clearFilterButtons.forEach((clearFilterButton) => clearFilterButton.addEventListener('click', () => {
      const allButton = filterButtons.find((button) => button.dataset.filter === 'all');
      allButton?.click();
    }));

    resetEmptyButton?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      const allButton = filterButtons.find((button) => button.dataset.filter === 'all');
      allButton?.click();
      applyFilters();
    });

    searchInput?.addEventListener('input', applyFilters);
    searchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!root.classList.contains('is-search-open')) {
        setSearchExpanded(true);
        searchInput?.focus();
        return;
      }
      applyFilters();
    });

    searchTrigger?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!root.classList.contains('is-search-open')) setSearchExpanded(true);
      window.setTimeout(() => searchInput?.focus(), 0);
    });

    searchInput?.addEventListener('focus', () => {
      setSearchExpanded(true);
    });

    searchClose?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (searchInput) searchInput.value = '';
      setSearchExpanded(false);
      searchInput?.blur();
      applyFilters();
    });

    let selecting = false;
    const selectableCardInteractiveSelector = 'a, button, input, textarea, select, summary, [role="button"], [data-order-open]';

    ordersList?.setAttribute('role', 'listbox');
    ordersList?.setAttribute('aria-multiselectable', 'false');

    const setCardSelected = (card, selected) => {
      if (!card) return;
      card.classList.toggle('is-selected', selected);
      card.setAttribute('aria-selected', selected ? 'true' : 'false');
      card.querySelector('.order-card__select')?.setAttribute('aria-pressed', selected ? 'true' : 'false');
    };

    const toggleCardSelected = (card) => {
      if (!card) return;
      setCardSelected(card, !card.classList.contains('is-selected'));
    };

    const clearSelectedCards = () => refreshCards().forEach((card) => setCardSelected(card, false));

    const selectedCards = () => refreshCards().filter((card) => !card.hidden && card.classList.contains('is-selected'));

    const syncSelectedActions = () => {
      refreshCards().forEach((card) => {
        const selected = card.classList.contains('is-selected');
        card.setAttribute('aria-selected', selected ? 'true' : 'false');
        card.querySelector('.order-card__select')?.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      const selected = selectedCards();
      const count = selected.length;
      if (selectSummary) selectSummary.textContent = `${count} selecionado${count === 1 ? '' : 's'}`;
      if (openSelectedButton) openSelectedButton.disabled = count === 0;
      if (openChatSelectedButton) openChatSelectedButton.disabled = count === 0;
      if (clearSelectedButton) clearSelectedButton.disabled = count === 0;
    };

    const closeSelectPanel = () => {
      if (selectPanel) selectPanel.hidden = true;
      selectToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'false'));
      syncHeaderControls();
    };

    const openSelectPanel = () => {
      if (headerControls) headerControls.hidden = false;
      if (selectPanel) selectPanel.hidden = false;
      selectToggles.forEach((toggle) => toggle.setAttribute('aria-expanded', 'true'));
      closePopover();
      syncHeaderControls();
    };

    const syncSelectState = () => {
      root.classList.toggle('orders-is-selecting', selecting);
      ordersList?.setAttribute('aria-multiselectable', selecting ? 'true' : 'false');
      if (selecting) openSelectPanel();
      else {
        closeSelectPanel();
        clearSelectedCards();
      }
      syncSelectedActions();
    };

    const syncOrderCardBindings = () => {
      refreshCards().forEach((card, index) => {
        card.classList.add('doke-selectable-card');
        card.setAttribute('role', 'option');
        card.setAttribute('aria-selected', card.classList.contains('is-selected') ? 'true' : 'false');
        if (!card.hasAttribute('tabindex')) card.tabIndex = 0;

        const selectButton = card.querySelector('.order-card__select');
        if (selectButton) {
          selectButton.classList.add('doke-selection-check');
          selectButton.setAttribute('aria-label', `Selecionar pedido ${index + 1}`);
          selectButton.setAttribute('aria-pressed', card.classList.contains('is-selected') ? 'true' : 'false');
        }

        if (!card.querySelector('.order-card__context-actions')) {
          const actions = document.createElement('div');
          actions.className = 'order-card__context-actions';
          actions.innerHTML = `
            <button class="order-card__context-button" type="button" data-context-action="select">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 12 3 3 7-7"></path><rect x="4" y="4" width="16" height="16" rx="3"></rect></svg>
              <span>Selecionar</span>
            </button>
            <button class="order-card__context-button order-card__context-button--danger" type="button" data-context-action="delete"${card.dataset.status !== 'completed' ? ' disabled' : ''}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5h6"></path><path d="M5.5 7.5h13"></path><path d="M8 7.5v11"></path><path d="M16 7.5v11"></path><path d="M6.5 7.5 7 19a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l.5-11.5"></path></svg>
              <span>Apagar</span>
            </button>
          `;
          card.appendChild(actions);

          actions.querySelector('[data-context-action="select"]')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            selecting = true;
            syncSelectState();
            toggleCardSelected(card);
            if (!refreshCards().some((item) => item.classList.contains('is-selected'))) {
              selecting = false;
              syncSelectState();
            }
            syncSelectedActions();
            closeContextMenu();
          });

          actions.querySelector('[data-context-action="delete"]')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (card.dataset.status !== 'completed') return;
            card.remove();
            recountCards();
            syncStats();
            applyFilters();
            closeContextMenu();
          });
        }

        if (card.dataset.ordersCardBound === 'true') return;
        card.dataset.ordersCardBound = 'true';

        card.addEventListener('click', (event) => {
          if (!selecting) return;
          const target = event.target;
          if (target instanceof Element && target.closest(selectableCardInteractiveSelector)) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
        });

        card.addEventListener('keydown', (event) => {
          if (!selecting || (event.key !== ' ' && event.key !== 'Enter')) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
        });

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
    };

    const refreshOrdersSurface = () => {
      syncOrderCardBindings();
      recountCards();
      syncStats();
      applyFilters();
      syncSelectedActions();
    };

    selectToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const willOpen = !selectPanel || selectPanel.hidden;
        closePopover();
        selecting = willOpen;
        syncSelectState();
      });
    });

    root.addEventListener('doke:orders-selection-panel', (event) => {
      selecting = Boolean(event.detail?.active);
      syncSelectState();
    });

    root.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const selectButton = target.closest('.order-card__select');
      if (selectButton && root.contains(selectButton)) {
        event.preventDefault();
        event.stopPropagation();
        if (!selecting) return;
        toggleCardSelected(selectButton.closest('.order-card'));
        syncSelectedActions();
        return;
      }

      const openButton = target.closest('[data-order-open]');
      if (!openButton || !root.contains(openButton)) return;
      event.preventDefault();
      const card = openButton.closest('.order-card');
      if (selecting) {
        toggleCardSelected(card);
        syncSelectedActions();
        return;
      }
      openPanel(openButton.dataset.orderOpen, card);
    });

    root.querySelectorAll('[data-doke-panel-close]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePopover();
        selecting = false;
        syncSelectState();
      });
    });

    const toggleAgenda = () => {
      const expanded = root.classList.contains('is-agenda-collapsed');
      closePopover();
      selecting = false;
      syncSelectState();
      setAgendaExpanded(expanded);
    };

    agendaToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        toggleAgenda();
      });
    });

    window.DokeOrdersAgenda = {
      toggle: toggleAgenda,
      open: () => setAgendaExpanded(true),
      close: () => setAgendaExpanded(false),
    };

    plannerCalendarSummary?.addEventListener('click', () => {
      if (!mobileCalendarQuery.matches) return;
      setCalendarExpanded(!root.classList.contains('is-calendar-expanded'));
    });

    root.querySelectorAll('[data-orders-select-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.ordersSelectMode;
        selecting = true;
        syncSelectState();
        clearSelectedCards();
        if (mode === 'all') {
          refreshCards().filter((card) => !card.hidden).forEach((card) => setCardSelected(card, true));
        }
        syncSelectedActions();
        syncHeaderControls();
      });
    });

    clearSelectedButton?.addEventListener('click', () => {
      clearSelectedCards();
      syncSelectedActions();
    });

    openSelectedButton?.addEventListener('click', () => {
      const card = selectedCards()[0];
      if (!card) return;
      openPanel('details', card);
    });

    openChatSelectedButton?.addEventListener('click', () => {
      const card = selectedCards()[0];
      if (!card) return;
      openPanel('chat', card);
    });

    panelScrim?.addEventListener('click', closePanels);
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-orders-panel-close]')) return;
      event.preventDefault();
      closePanels();
    });
    root.querySelectorAll('[data-orders-panel-close]').forEach((button) => {
      button.addEventListener('click', closePanels);
    });

    const syncPlannerDatéToMonth = () => {
      const daysInMonth = new Date(currentPlannerMonth.year, currentPlannerMonth.month + 1, 0).getDate();
      const nextDaté = new Date(currentPlannerMonth.year, currentPlannerMonth.month, Math.min(new Date(`${currentPlannerDaté}T12:00:00`).getDate(), daysInMonth), 12);
      currentPlannerDaté = `${nextDaté.getFullYear()}-${String(nextDaté.getMonth() + 1).padStart(2, '0')}-${String(nextDaté.getDate()).padStart(2, '0')}`;
      renderPlannerCalendar();
      syncPlannerDay(currentPlannerDaté);
    };

    const shiftPlannerMonth = (offset) => {
      const nextMonthDate = new Date(currentPlannerMonth.year, currentPlannerMonth.month + offset, 1, 12);
      currentPlannerMonth = {
        year: nextMonthDate.getFullYear(),
        month: nextMonthDate.getMonth(),
      };
      syncPlannerDatéToMonth();
      setPlannerMonthPopover(false);
    };

    plannerMonthLabel?.addEventListener('click', () => {
      setPlannerMonthPopover(plannerMonthPopover?.hidden !== true);
    });

    plannerMonthPrev?.addEventListener('click', () => {
      shiftPlannerMonth(-1);
    });

    plannerMonthNext?.addEventListener('click', () => {
      shiftPlannerMonth(1);
    });

    plannerMonthCancel?.addEventListener('click', () => {
      setPlannerMonthPopover(false);
    });

    plannerMonthApply?.addEventListener('click', () => {
      const nextMonth = Number(plannerMonthSelect?.value ?? currentPlannerMonth.month);
      const nextYear = Number(plannerYearInput?.value ?? currentPlannerMonth.year);
      if (Number.isNaN(nextMonth) || Number.isNaN(nextYear)) return;
      currentPlannerMonth = {
        month: Math.min(11, Math.max(0, nextMonth)),
        year: Math.min(2035, Math.max(2024, nextYear)),
      };
      syncPlannerDatéToMonth();
      setPlannerMonthPopover(false);
    });

    plannerEvents.forEach((eventItem) => {
      const action = eventItem.querySelector('.orders-planner__event-action');
      action?.addEventListener('click', () => {
        const card = root.querySelector(`.order-card[data-id="${eventItem.dataset.orderId}"]`);
        if (card) openPanel('details', card);
      });
    });

    const handleCalendarQueryChange = () => {
      syncCalendarPresentation();
    };

    if (typeof mobileCalendarQuery.addEventListener === 'function') {
      mobileCalendarQuery.addEventListener('change', handleCalendarQueryChange);
    } else if (typeof mobileCalendarQuery.addListener === 'function') {
      mobileCalendarQuery.addListener(handleCalendarQueryChange);
    }


    root.dataset.activeFilter = 'all';
    syncSelectState();
    setAgendaExpanded(true);
    refreshOrdersSurface();
    syncHeaderControls();
    scheduleRequestedOrderFocus();
    hydration?.mark('dom');
    const markOrdersHydrationAuth = () => {
      hydration?.mark('auth');
      refreshOrdersSurface();
    };
    const markOrdersHydrationLocal = () => {
      hydration?.mark('local-orders');
      refreshOrdersSurface();
      scheduleRequestedOrderFocus();
    };
    const markOrdersHydrationCommand = () => {
      hydration?.mark('command-center');
      refreshOrdersSurface();
    };
    document.addEventListener('doke:auth-surface-ready', markOrdersHydrationAuth);
    document.addEventListener('doke:auth-session-change', markOrdersHydrationAuth);
    document.addEventListener('doke:orders-command-center-ready', markOrdersHydrationCommand);
    document.addEventListener('doke:page-hydration-ready', (event) => {
      if (event.detail?.page !== 'pedidos') return;
      refreshOrdersSurface();
    });
    document.addEventListener('doke:orders-list-hydrated', markOrdersHydrationLocal);
    window.setTimeout(() => hydration?.mark('auth'), 360);
    window.setTimeout(() => hydration?.mark('local-orders'), 520);
    window.setTimeout(() => hydration?.mark('command-center'), 700);
    window.setTimeout(() => {
      if (!hydration || hydration.canShowEmpty()) return;
      hydration.ready();
      refreshOrdersSurface();
    }, 1050);
    document.addEventListener('doke:orders-command-center-ready', () => {
      refreshOrdersSurface();
    });
    document.addEventListener('doke:auth-surface-ready', () => {
      refreshOrdersSurface();
    });
    window.setTimeout(refreshOrdersSurface, 220);
    window.setTimeout(refreshOrdersSurface, 560);
    if (planner) {
      syncPlannerFirstPaintState();
      renderPlannerCalendar();
      syncPlannerDay(currentPlannerDaté);
      syncCalendarPresentation();
    }

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('.order-card')) closeContextMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      closeContextMenu();
      selecting = false;
      syncSelectState();
      closePopover();
    });
  };

    window.initOrdersPage = initOrdersPage;
    window.DokeInitOrders = initOrdersPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrdersPage, { once: true });
  } else {
    initOrdersPage();
  }
})();
