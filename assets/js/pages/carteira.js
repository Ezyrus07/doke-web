(() => {
  const modal = document.querySelector('[data-wallet-withdraw-modal]');
  const openButtons = document.querySelectorAll('[data-wallet-open-withdraw]');
  const closeButtons = document.querySelectorAll('[data-wallet-close-withdraw]');
  const form = document.querySelector('[data-wallet-withdraw-form]');
  const filterButtons = document.querySelectorAll('[data-wallet-filter]');
  const transactions = document.querySelectorAll('[data-wallet-type]');
  const scrollButtons = document.querySelectorAll('[data-wallet-scroll-to]');
  const viewButtons = document.querySelectorAll('[data-wallet-view-toggle]');
  const viewPanels = document.querySelectorAll('[data-wallet-view-panel]');

  const openModal = () => {
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('wallet-modal-open');
    modal.querySelector('input')?.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('wallet-modal-open');
  };

  openButtons.forEach((button) => button.addEventListener('click', openModal));
  closeButtons.forEach((button) => button.addEventListener('click', closeModal));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    closeModal();
  });

  scrollButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.walletScrollTo;
      const target = id ? document.getElementById(id) : null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  let currentView = 'overview';

  const setView = (view) => {
    if (!viewPanels.length) return;

    currentView = view;

    viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.walletViewPanel !== view;
    });

    viewButtons.forEach((button) => {
      button.classList.toggle('is-view-active', button.dataset.walletViewToggle === view);
      button.setAttribute('aria-pressed', String(button.dataset.walletViewToggle === view));
    });
  };

  viewButtons.forEach((button) => {
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('click', () => {
      const requestedView = button.dataset.walletViewToggle || 'overview';
      const view = requestedView === 'statistics' && currentView === 'statistics'
        ? 'overview'
        : requestedView;

      setView(view);

      const scrollTargetId = view === 'overview' ? 'wallet-statement-title' : button.dataset.walletScrollTo;
      const targetPanel = document.querySelector(`[data-wallet-view-panel="${view}"]`);
      const target = scrollTargetId ? document.getElementById(scrollTargetId) : targetPanel;

      requestAnimationFrame(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  });

  if (viewPanels.length) {
    setView('overview');
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.walletFilter || 'all';

      filterButtons.forEach((item) => {
        item.classList.toggle('is-active', item === button);
      });

      transactions.forEach((transaction) => {
        const type = transaction.dataset.walletType;
        transaction.hidden = filter !== 'all' && type !== filter;
      });
    });
  });
})();
