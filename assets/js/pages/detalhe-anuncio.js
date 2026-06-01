(() => {
  const initDetailAd = () => {
  const root = document.querySelector('[data-detail-page-root]');
  if (!root || root.dataset.detailAdReady === 'true') return;
  root.dataset.detailAdReady = 'true';

  const mainImage = root.querySelector('[data-gallery-main]');
  const stage = root.querySelector('.ad-gallery__stage');
  const thumbs = Array.from(root.querySelectorAll('[data-gallery-thumb]'));
  const prevButton = root.querySelector('.ad-gallery__nav--prev');
  const nextButton = root.querySelector('.ad-gallery__nav--next');
  const moreButton = root.querySelector('.ad-gallery__more[data-lightbox-open]');

  const galleryItems = thumbs.map((thumb) => ({
    src: thumb.dataset.src,
    alt: thumb.querySelector('img')?.alt || thumb.getAttribute('aria-label') || 'Foto do serviço'
  })).filter((item) => item.src);

  let currentIndex = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains('is-active')));
  if (currentIndex < 0) currentIndex = 0;

  const syncGallery = () => {
    const item = galleryItems[currentIndex];
    if (mainImage && item) {
      mainImage.src = item.src;
      mainImage.alt = item.alt;
    }

    thumbs.forEach((thumb, index) => {
      const isActive = index === currentIndex;
      thumb.classList.toggle('is-active', isActive);
      thumb.setAttribute('aria-pressed', String(isActive));
    });
  };

  const goTo = (index) => {
    if (!galleryItems.length) return;
    currentIndex = (index + galleryItems.length) % galleryItems.length;
    syncGallery();
  };

  thumbs.forEach((thumb, index) => {
    thumb.addEventListener('click', () => goTo(index));
  });

  prevButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    goTo(currentIndex - 1);
  });

  nextButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    goTo(currentIndex + 1);
  });

  const openLightbox = () => {
    if (!window.DokeMediaLightbox || !galleryItems.length) return;
    window.DokeMediaLightbox.open({
      items: galleryItems,
      index: currentIndex,
      title: 'Fotos do serviço'
    });
  };

  stage?.addEventListener('click', (event) => {
    if (event.target.closest('.ad-gallery__nav') || event.target.closest('.ad-gallery__favorite')) return;
    openLightbox();
  });

  stage?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openLightbox();
  });

  moreButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openLightbox();
  });

  syncGallery();

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
  };

  window.DokeInitDetailAd = initDetailAd;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailAd, { once: true });
  } else {
    initDetailAd();
  }
})();
