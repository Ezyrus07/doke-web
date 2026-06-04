(() => {
  const initOrdersPage = () => {
    const root = document.querySelector('.orders-page');
    if (!root || root.dataset.ordersReady === 'true') return;
    root.dataset.ordersReady = 'true';

    const filterButtons = Array.from(root.querySelectorAll('.orders-filter-item[data-filter]'));
    const cards = Array.from(root.querySelectorAll('.order-card[data-status]'));
    const searchInput = root.querySelector('.orders-header-search input');
    const searchForm = searchInput?.closest('form');
    const searchTrigger = searchForm?.querySelector('.orders-header-search__icon');
    const searchClose = searchForm?.querySelector('.orders-header-search__close');
    const filterToggle = root.querySelector('[data-orders-filter-toggle]');
    const popover = root.querySelector('[data-orders-filters-popover]');
    const headerControls = root.querySelector('.orders-page-header__controls');
    const activeChip = root.querySelector('[data-orders-active-chip]');
    const filterStatusStack = root.querySelector('.orders-filter-status-stack');
    const clearFilterButton = root.querySelector('[data-orders-clear-filter]');
    const emptyState = root.querySelector('[data-orders-empty]');
    const emptyText = root.querySelector('[data-orders-empty-text]');
    const resetEmptyButton = root.querySelector('[data-orders-reset-empty]');
    const statNodes = {
      all: root.querySelector('[data-orders-stat="all"]'),
      pending: root.querySelector('[data-orders-stat="pending"]'),
      conversation: root.querySelector('[data-orders-stat="conversation"]'),
      completed: root.querySelector('[data-orders-stat="completed"]')
    };
    const selectToggle = root.querySelector('[data-orders-select-toggle]');
    const selectPanel = root.querySelector('[data-orders-select-panel]');
    const deleteSelectedButton = root.querySelector('[data-orders-delete-selected]');
    const agendaToggle = root.querySelector('[data-orders-agenda-toggle]');
    const panelScrim = root.querySelector('.orders-panel-scrim');
    const sidePanels = Array.from(root.querySelectorAll('.orders-sidepanel'));
    const detailTitle = root.querySelector('[data-orders-detail-title]');
    const detailStatus = root.querySelector('[data-orders-detail-status]');
    const detailPro = root.querySelector('[data-orders-detail-pro]');
    const detailAddress = root.querySelector('[data-orders-detail-address]');
    const detailSummary = root.querySelector('[data-orders-detail-summary]');
    const detailScope = root.querySelector('[data-orders-detail-scope]');
    const detailTimeline = root.querySelector('[data-orders-detail-timeline]');
    const detailMaterials = root.querySelector('[data-orders-detail-materials]');
    const detailBudget = root.querySelector('[data-orders-detail-budget]');
    const detailPayment = root.querySelector('[data-orders-detail-payment]');
    const detailFlow = root.querySelector('[data-orders-detail-flow]');
    const detailNext = root.querySelector('[data-orders-detail-next]');
    const planner = root.querySelector('[data-orders-planner]');
    const plannerEvents = Array.from(root.querySelectorAll('[data-orders-event-date]'));
    const plannerAgendaTitle = root.querySelector('[data-orders-agenda-title]');
    const plannerAgendaSubtitle = root.querySelector('[data-orders-agenda-subtitle]');
    const plannerAgendaEmpty = root.querySelector('[data-orders-agenda-empty]');
    const plannerCalendarDays = root.querySelector('[data-orders-calendar-days]');
    const plannerMonthLabel = root.querySelector('[data-orders-month-label]');
    const plannerMonthPopover = root.querySelector('[data-orders-month-popover]');
    const plannerMonthSelect = root.querySelector('[data-orders-month-select]');
    const plannerYearInput = root.querySelector('[data-orders-year-input]');
    const plannerMonthApply = root.querySelector('[data-orders-month-apply]');
    const plannerMonthCancel = root.querySelector('[data-orders-month-cancel]');
    const plannerCalendarSummary = root.querySelector('[data-orders-calendar-summary]');
    const plannerCalendarSummaryLabel = root.querySelector('[data-orders-calendar-summary-label]');
    const plannerCalendarSummaryAction = root.querySelector('[data-orders-calendar-summary-action]');
    const mobileCalendarQuery = window.matchMedia('(max-width: 760px)');
    let longPressTimer = null;

    const labels = {
      all: 'Todos',
      pending: 'Aguardando resposta',
      conversation: 'Em conversa',
      responded: 'Respondidos',
      completed: 'Concluídos',
      cancelled: 'Cancelados',
    };

    const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const counts = { all: 0, pending: 0, conversation: 0, responded: 0, completed: 0, cancelled: 0 };

    const recountCards = () => {
      counts.all = root.querySelectorAll('.order-card').length;
      counts.pending = root.querySelectorAll('.order-card[data-status="pending"]').length;
      counts.conversation = root.querySelectorAll('.order-card[data-status="conversation"]').length;
      counts.responded = root.querySelectorAll('.order-card[data-status="responded"]').length;
      counts.completed = root.querySelectorAll('.order-card[data-status="completed"]').length;
      counts.cancelled = root.querySelectorAll('.order-card[data-status="cancelled"]').length;
    };

    const syncStats = () => {
      Object.entries(statNodes).forEach(([key, node]) => {
        if (node) node.textContent = String(counts[key] ?? 0);
      });

      filterButtons.forEach((button) => {
        const filter = button.dataset.filter;
        button.textContent = `${labels[filter]} (${counts[filter] ?? 0})`;
      });
    };

    const syncActiveChip = () => {
      const active = root.dataset.activeFilter || 'all';
      if (activeChip) {
        activeChip.textContent = `${labels[active]} (${counts[active] ?? 0})`;
        activeChip.hidden = active === 'all';
      }
      if (clearFilterButton) clearFilterButton.hidden = active === 'all';
      syncHeaderControls();
    };

    const syncHeaderControls = () => {
      if (!headerControls) return;
      const showStatusStack = Boolean(
        (activeChip && !activeChip.hidden)
        || (clearFilterButton && !clearFilterButton.hidden)
      );
      if (filterStatusStack) filterStatusStack.hidden = !showStatusStack;
      const showControls = Boolean((popover && !popover.hidden) || showStatusStack);
      headerControls.hidden = !showControls;
    };

    const applyFilters = () => {
      const active = root.dataset.activeFilter || 'all';
      const query = normalize(searchInput?.value || '');
      let visibleCount = 0;
      cards.forEach((card) => {
        const matchesFilter = active === 'all' || card.dataset.status === active;
        const matchesSearch = !query || normalize(card.textContent || '').includes(query);
        const visible = matchesFilter && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      if (emptyState) {
        const hasQuery = Boolean(query);
        emptyState.hidden = visibleCount > 0;
        if (emptyText) {
          emptyText.textContent = hasQuery
            ? 'Nenhum pedido combinou com essa busca. Tente outro termo ou limpe os filtros para voltar a ver tudo.'
            : 'Você pode limpar o filtro atual ou voltar para a base para solicitar um novo orçamento.';
        }
      }
      syncActiveChip();
    };

    const closePopover = () => {
      if (popover) popover.hidden = true;
      if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
      syncHeaderControls();
    };

    const closeContextMenu = () => {
      cards.forEach((card) => card.classList.remove('is-context-open'));
    };

    const openContextMenu = (card) => {
      closeContextMenu();
      card.classList.add('is-context-open');
    };

    const openPanel = (type, card) => {
      if (type === 'chat') {
        const id = card?.dataset.id || '';
        const href = `mensagens.html?pedido=${encodeURIComponent(id)}`;
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
      if (panelScrim) panelScrim.hidden = false;

      if (card && type === 'details') {
        if (detailTitle) detailTitle.textContent = card.querySelector('h2')?.textContent || 'Pedido';
        if (detailStatus) detailStatus.textContent = card.dataset.detailStatus || card.querySelector('.order-card__status-text')?.textContent || 'Status indisponível';
        if (detailPro) detailPro.textContent = card.querySelector('.order-card__subtitle strong')?.textContent || 'Profissional';
        if (detailAddress) detailAddress.textContent = card.dataset.detailAddress || card.querySelector('.order-card__location')?.textContent || 'Endereço indisponível';
        if (detailSummary) detailSummary.textContent = card.querySelector('.order-card__subtitle')?.textContent || '';
        if (detailScope) detailScope.textContent = card.dataset.detailScope || 'Escopo não informado';
        if (detailTimeline) detailTimeline.textContent = card.dataset.detailTimeline || card.querySelector('.order-card__meta span:last-child')?.textContent || 'Prazo não informado';
        if (detailMaterials) detailMaterials.textContent = card.dataset.detailMaterials || 'Materiais não informados';
        if (detailBudget) detailBudget.textContent = card.dataset.detailBudget || 'Faixa de orçamento não informada';
        if (detailPayment) detailPayment.textContent = card.dataset.detailPayment || 'Pagamento não informado';
        if (detailFlow) detailFlow.textContent = card.dataset.detailFlow || card.querySelector('.order-card__deadline span:last-child')?.textContent || 'Próximo passo não informado';
        if (detailNext) detailNext.textContent = card.querySelector('.order-card__deadline span:last-child')?.textContent || '';
      }
    };

    const eventsByDate = new Map();
    plannerEvents.forEach((eventItem) => {
      const date = eventItem.dataset.ordersEventDate;
      if (!date) return;
      const list = eventsByDate.get(date) || [];
      list.push(eventItem);
      eventsByDate.set(date, list);
    });

    let plannerDayButtons = [];
    let currentPlannerDate = '2026-04-14';
    let currentPlannerMonth = { year: 2026, month: 3 };

    const formatAgendaTitle = (date) => {
      const today = '2026-04-14';
      const tomorrow = '2026-04-15';
      if (date === today) return 'Hoje';
      if (date === tomorrow) return 'Amanhã';
      const parsed = new Date(`${date}T12:00:00`);
      return parsed.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    };

    const updatePlannerMonthLabel = () => {
      const labelDate = new Date(currentPlannerMonth.year, currentPlannerMonth.month, 1, 12);
      if (plannerMonthLabel) {
        plannerMonthLabel.textContent = labelDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      }
    };

    const formatPlannerSummaryDate = (date) => {
      const parsed = new Date(`${date}T12:00:00`);
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
      const total = (eventsByDate.get(currentPlannerDate) || []).length;
      plannerCalendarSummaryLabel.textContent = `${formatPlannerSummaryDate(currentPlannerDate)} • ${total} compromisso${total === 1 ? '' : 's'}`;
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
        const isoDate = `${currentPlannerMonth.year}-${String(currentPlannerMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasEvents = eventsByDate.has(isoDate);
        const active = isoDate === currentPlannerDate;
        cells.push(
          `<button class="orders-planner__day${hasEvents ? ' has-events' : ''}${active ? ' is-active' : ''}" type="button" data-orders-day="${isoDate}">${day}</button>`
        );
      }

      const totalCells = Math.ceil(cells.length / 7) * 7;
      const trailing = totalCells - cells.length;
      for (let index = 1; index <= trailing; index += 1) {
        cells.push(`<button class="orders-planner__day is-muted" type="button" disabled>${index}</button>`);
      }

      plannerCalendarDays.innerHTML = cells.join('');
      plannerDayButtons = Array.from(root.querySelectorAll('[data-orders-day]'));
      plannerDayButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const date = button.dataset.ordersDay;
          if (!date) return;
          currentPlannerDate = date;
          syncPlannerDay(date);
          renderPlannerCalendar();
        });
      });
      updatePlannerMonthLabel();
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

    const syncPlannerDay = (date) => {
      if (!planner) return;

      plannerDayButtons.forEach((button) => {
        button.classList.toggle('is-active', button.dataset.ordersDay === date);
      });

      let visibleEvents = 0;
      plannerEvents.forEach((eventItem) => {
        const visible = eventItem.dataset.ordersEventDate === date;
        eventItem.hidden = !visible;
        if (visible) visibleEvents += 1;
      });

      if (plannerAgendaTitle) plannerAgendaTitle.textContent = formatAgendaTitle(date);
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
    };

    const closePanels = () => {
      sidePanels.forEach((panel) => {
        panel.hidden = true;
      });
      if (panelScrim) panelScrim.hidden = true;
    };

    const setAgendaExpanded = (expanded) => {
      root.classList.toggle('is-agenda-collapsed', !expanded);
      agendaToggle?.setAttribute('aria-expanded', String(expanded));
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((item) => item.classList.remove('is-active'));
        button.classList.add('is-active');
        root.dataset.activeFilter = button.dataset.filter || 'all';
        applyFilters();
        closePopover();
      });
    });

    filterToggle?.addEventListener('click', (event) => {
      event.preventDefault();
      const next = popover?.hidden !== false;
      if (popover) popover.hidden = !next;
      filterToggle.setAttribute('aria-expanded', String(next));
      syncHeaderControls();
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (root.classList.contains('is-search-open')) {
        const clickedInsideSearch = target.closest('.orders-page-header__search');
        if (!clickedInsideSearch && !(searchInput?.value || '').trim()) setSearchExpanded(false);
      }

      if (popover && !popover.hidden) {
        if (!popover.contains(target) && !filterToggle?.contains(target)) {
          closePopover();
        }
      }

      if (selectPanel && !selectPanel.hidden) {
        const clickedInsideSelect = target.closest('[data-orders-select-panel]');
        const clickedSelectToggle = target.closest('[data-orders-select-toggle]');
        if (!clickedInsideSelect && !clickedSelectToggle) {
          closeSelectPanel();
        }
      }

      if (plannerMonthPopover && !plannerMonthPopover.hidden) {
        if (!plannerMonthPopover.contains(target) && !plannerMonthLabel?.contains(target)) {
          setPlannerMonthPopover(false);
        }
      }
    });

    clearFilterButton?.addEventListener('click', () => {
      const allButton = filterButtons.find((button) => button.dataset.filter === 'all');
      allButton?.click();
    });

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
    const cardSelectButtons = Array.from(root.querySelectorAll('.order-card__select'));

    const clearSelectedCards = () => cards.forEach((card) => card.classList.remove('is-selected'));

    const closeSelectPanel = () => {
      if (selectPanel) selectPanel.hidden = true;
      selectToggle?.setAttribute('aria-expanded', 'false');
    };

    const openSelectPanel = () => {
      if (selectPanel) selectPanel.hidden = false;
      selectToggle?.setAttribute('aria-expanded', 'true');
      closePopover();
    };

    const syncSelectState = () => {
      root.classList.toggle('orders-is-selecting', selecting);
      if (selecting) openSelectPanel();
      else {
        closeSelectPanel();
        clearSelectedCards();
      }
    };

    selectToggle?.addEventListener('click', () => {
      selecting = !selecting;
      syncSelectState();
    });

    agendaToggle?.addEventListener('click', () => {
      const expanded = root.classList.contains('is-agenda-collapsed');
      setAgendaExpanded(expanded);
    });

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
          cards.filter((card) => !card.hidden).forEach((card) => card.classList.add('is-selected'));
        }
      });
    });

    cardSelectButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!selecting) return;
        button.closest('.order-card')?.classList.toggle('is-selected');
      });
    });

    deleteSelectedButton?.addEventListener('click', () => {
      cards.filter((card) => card.classList.contains('is-selected')).forEach((card) => card.remove());
      recountCards();
      syncStats();
      selecting = false;
      syncSelectState();
      applyFilters();
    });

    panelScrim?.addEventListener('click', closePanels);
    root.querySelectorAll('[data-orders-panel-close]').forEach((button) => {
      button.addEventListener('click', closePanels);
    });

    root.querySelectorAll('[data-order-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const card = button.closest('.order-card');
        openPanel(button.dataset.orderOpen, card);
      });
    });

    cards.forEach((card) => {
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
          card.classList.toggle('is-selected');
          if (!cards.some((item) => item.classList.contains('is-selected'))) {
            selecting = false;
            syncSelectState();
          }
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

    const syncPlannerDateToMonth = () => {
      const daysInMonth = new Date(currentPlannerMonth.year, currentPlannerMonth.month + 1, 0).getDate();
      const nextDate = new Date(currentPlannerMonth.year, currentPlannerMonth.month, Math.min(new Date(`${currentPlannerDate}T12:00:00`).getDate(), daysInMonth), 12);
      currentPlannerDate = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      renderPlannerCalendar();
      syncPlannerDay(currentPlannerDate);
    };

    plannerMonthLabel?.addEventListener('click', () => {
      setPlannerMonthPopover(plannerMonthPopover?.hidden !== true);
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
      syncPlannerDateToMonth();
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


    recountCards();
    syncStats();
    root.dataset.activeFilter = 'all';
    syncSelectState();
    setAgendaExpanded(true);
    applyFilters();
    syncHeaderControls();
    if (planner) {
      renderPlannerCalendar();
      syncPlannerDay(currentPlannerDate);
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
