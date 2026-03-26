(() => {
  const initOrdersPage = () => {
    const root = document.querySelector('.orders-page');
    if (!root || root.dataset.ordersReady === 'true') return;
    root.dataset.ordersReady = 'true';

    const filterButtons = Array.from(root.querySelectorAll('.orders-filter-item[data-filter]'));
    const cards = Array.from(root.querySelectorAll('.order-card[data-status]'));
    const searchInput = root.querySelector('.orders-header-search input');
    const filterToggle = root.querySelector('[data-orders-filter-toggle]');
    const popover = root.querySelector('[data-orders-filters-popover]');
    const activeChip = root.querySelector('[data-orders-active-chip]');
    const clearFilterButton = root.querySelector('[data-orders-clear-filter]');
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
    const detailPro = root.querySelector('[data-orders-detail-pro]');
    const detailSummary = root.querySelector('[data-orders-detail-summary]');
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
      cards.forEach((card) => {
        const matchesFilter = active === 'all' || card.dataset.status === active;
        const matchesSearch = !query || normalize(card.textContent || '').includes(query);
        card.hidden = !(matchesFilter && matchesSearch);
      });
      syncActiveChip();
    };

    const closePopover = () => {
      if (popover) popover.hidden = true;
      if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
    };

    const openPanel = (type, card) => {
      if (type === 'chat' && window.innerWidth < 768) {
        const id = card?.dataset.id || '';
        window.location.href = `mensagens.html?pedido=${encodeURIComponent(id)}`;
        return;
      }

      sidePanels.forEach((panel) => {
        panel.hidden = panel.dataset.ordersPanel !== type;
      });
      if (panelScrim) panelScrim.hidden = false;

      if (card && type === 'details') {
        if (detailTitle) detailTitle.textContent = card.querySelector('h2')?.textContent || 'Pedido';
        if (detailPro) detailPro.textContent = card.querySelector('.order-card__subtitle strong')?.textContent || 'Profissional';
        if (detailSummary) detailSummary.textContent = card.querySelector('.order-card__subtitle')?.textContent || '';
        if (detailNext) detailNext.textContent = card.querySelector('.order-card__deadline span:last-child')?.textContent || '';
      }
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
      if (!popover || popover.hidden) return;
      if (popover.contains(event.target) || filterToggle?.contains(event.target)) return;
      closePopover();
    });

    clearFilterButton?.addEventListener('click', () => {
      const allButton = filterButtons.find((button) => button.dataset.filter === 'all');
      allButton?.click();
    });

    searchInput?.addEventListener('input', applyFilters);

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrdersPage, { once: true });
  } else {
    initOrdersPage();
  }
})();
