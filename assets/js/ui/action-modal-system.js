(function () {
  const OPEN_CLASS = 'doke-action-modal-open';

  const getModal = (name) => {
    if (!name) return null;
    return document.querySelector(`[data-doke-action-modal="${name}"]`);
  };

  const getOpenModals = () => [...document.querySelectorAll('[data-doke-action-modal]:not([hidden])')];

  const openModal = (modal) => {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add(OPEN_CLASS);
    window.setTimeout(() => {
      const target = modal.querySelector('[autofocus], input, select, textarea, button, a[href]');
      target?.focus?.();
    }, 60);
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    if (!getOpenModals().length) document.body.classList.remove(OPEN_CLASS);
  };

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-doke-action-modal-open]');
    if (opener) {
      event.preventDefault();
      openModal(getModal(opener.dataset.dokeActionModalOpen));
      return;
    }

    const closer = event.target.closest('[data-doke-action-modal-close]');
    if (closer) {
      event.preventDefault();
      closeModal(closer.closest('[data-doke-action-modal]'));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const modals = getOpenModals();
    closeModal(modals[modals.length - 1]);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-doke-action-modal-form]');
    if (!form) return;
    event.preventDefault();
    const modal = form.closest('[data-doke-action-modal]');
    const feedback = modal?.querySelector('[data-doke-action-modal-feedback]');
    if (feedback) {
      feedback.textContent = feedback.dataset.successMessage || 'Solicitação registrada.';
      feedback.hidden = false;
    }
  });
})();
