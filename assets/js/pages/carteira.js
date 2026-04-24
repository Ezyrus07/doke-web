(() => {
  const modal = document.querySelector('[data-wallet-withdraw-modal]');
  const openButtons = document.querySelectorAll('[data-wallet-open-withdraw]');
  const closeButtons = document.querySelectorAll('[data-wallet-close-withdraw]');
  const form = document.querySelector('[data-wallet-withdraw-form]');
  const filterButtons = document.querySelectorAll('[data-wallet-filter]');
  const transactions = document.querySelectorAll('[data-wallet-type]');
  const scrollButtons = document.querySelectorAll('[data-wallet-scroll-to]');

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
