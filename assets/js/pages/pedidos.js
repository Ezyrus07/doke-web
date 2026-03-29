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
    const activeChip = root.querySelector('[data-orders-active-chip]');
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

    const mobileSearchQuery = window.matchMedia('(max-width: 640px)');

    const setSearchExpanded = (expanded) => {
      if (!mobileSearchQuery.matches) return;
      root.classList.toggle('is-search-open', expanded);
    };

    const closePanels = () => {
      sidePanels.forEach((panel) => {
        panel.hidden = true;
      });
      if (panelScrim) panelScrim.hidden = true;
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
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (mobileSearchQuery.matches && root.classList.contains('is-search-open')) {
        const clickedInsideSearch = target.closest('.orders-page-header__search');
        if (!clickedInsideSearch && !(searchInput?.value || '').trim()) setSearchExpanded(false);
      }

      if (!popover || popover.hidden) return;
      if (popover.contains(target) || filterToggle?.contains(target)) return;
      closePopover();
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
      if (mobileSearchQuery.matches && !root.classList.contains('is-search-open')) {
        setSearchExpanded(true);
        searchInput?.focus();
        return;
      }
      applyFilters();
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
      applyFilters();
    });

    let selecting = false;
    const cardSelectButtons = Array.from(root.querySelectorAll('.order-card__select'));

    const clearSelectedCards = () => cards.forEach((card) => card.classList.remove('is-selected'));

    const syncSelectState = () => {
      root.classList.toggle('orders-is-selecting', selecting);
      if (selectPanel) selectPanel.hidden = !selecting;
      if (!selecting) clearSelectedCards();
    };

    selectToggle?.addEventListener('click', () => {
      selecting = !selecting;
      syncSelectState();
      closePopover();
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

    recountCards();
    syncStats();
    root.dataset.activeFilter = 'all';
    syncSelectState();
    applyFilters();
  };

    window.initOrdersPage = initOrdersPage;
    window.DokeInitOrders = initOrdersPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrdersPage, { once: true });
  } else {
    initOrdersPage();
  }
})();

