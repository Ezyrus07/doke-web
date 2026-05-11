(() => {
  const root = document.querySelector('[data-detail-page-root]');
  if (!root) return;

  const mainImage = root.querySelector('[data-gallery-main]');
  const thumbs = Array.from(root.querySelectorAll('[data-gallery-thumb]'));

  thumbs.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const nextSrc = thumb.dataset.src;
      if (!mainImage || !nextSrc) return;

      mainImage.src = nextSrc;
      thumbs.forEach((item) => item.classList.toggle('is-active', item === thumb));
    });
  });

  const favoriteButtons = Array.from(document.querySelectorAll('[data-favorite-toggle]'));
  favoriteButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const isPressed = button.getAttribute('aria-pressed') === 'true';
      button.setAttribute('aria-pressed', String(!isPressed));
      button.classList.toggle('is-active', !isPressed);
    });
  });

  const modal = document.querySelector('[data-worker-modal]');
  const modalTitle = modal?.querySelector('[data-worker-modal-title]');
  const modalImage = modal?.querySelector('[data-worker-modal-image]');
  const closeTriggers = Array.from(document.querySelectorAll('[data-worker-modal-close]'));
  let lastWorkerTrigger = null;

  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('worker-modal-open');
    lastWorkerTrigger?.focus?.();
  };

  const openModal = (trigger) => {
    if (!modal) return;
    lastWorkerTrigger = trigger;
    const title = trigger.dataset.workerTitle || 'Worker do serviço';
    const image = trigger.querySelector('img');

    if (modalTitle) modalTitle.textContent = title;
    if (modalImage && image?.src) {
      modalImage.src = image.src;
      modalImage.alt = image.alt || 'Prévia do worker selecionado';
    }

    modal.hidden = false;
    document.body.classList.add('worker-modal-open');
    modal.querySelector('[data-worker-modal-close]')?.focus?.();
  };

  root.querySelectorAll('[data-worker-card]').forEach((card) => {
    card.addEventListener('click', () => openModal(card));
  });

  closeTriggers.forEach((trigger) => trigger.addEventListener('click', closeModal));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });
})();
