(() => {
  const SELECTOR = '[data-media-lightbox], .message-bubble__image img, .community-message__image img, [data-gallery-main]';
  let root;
  let image;
  let thumbs;
  let prev;
  let next;
  let items = [];
  let activeIndex = 0;
  let lastFocused;

  const iconClose = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>';
  const iconPrev = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
  const iconNext = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>';

  const normalizeItem = (item) => ({
    src: item?.src || '',
    alt: item?.alt || item?.caption || 'Imagem ampliada',
    caption: item?.caption || item?.alt || '',
    title: item?.title || 'Visualização da imagem'
  });

  const lockScroll = (locked) => {
    document.documentElement.classList.toggle('is-media-lightbox-open', locked);
    document.body.style.overflow = locked ? 'hidden' : '';
  };

  const ensureRoot = () => {
    if (root) return root;
    root = document.createElement('div');
    root.className = 'doke-media-lightbox';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="doke-media-lightbox__surface" data-media-lightbox-surface>
        <button class="doke-media-lightbox__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-media-lightbox-close aria-label="Fechar imagem">${iconClose}</button>
        <div class="doke-media-lightbox__stage">
          <button class="doke-media-lightbox__nav doke-media-lightbox__nav--prev doke-icon-btn doke-icon-btn--soft" type="button" data-media-lightbox-prev aria-label="Imagem anterior">${iconPrev}</button>
          <img class="doke-media-lightbox__image" data-media-lightbox-image src="" alt="Imagem ampliada">
          <button class="doke-media-lightbox__nav doke-media-lightbox__nav--next doke-icon-btn doke-icon-btn--soft" type="button" data-media-lightbox-next aria-label="Próxima imagem">${iconNext}</button>
        </div>
        <div class="doke-media-lightbox__thumbs" data-media-lightbox-thumbs aria-label="Miniaturas da galeria"></div>
      </div>
    `;
    document.body.appendChild(root);
    image = root.querySelector('[data-media-lightbox-image]');
    thumbs = root.querySelector('[data-media-lightbox-thumbs]');
    prev = root.querySelector('[data-media-lightbox-prev]');
    next = root.querySelector('[data-media-lightbox-next]');

    root.querySelector('[data-media-lightbox-close]')?.addEventListener('click', close);
    prev?.addEventListener('click', () => go(-1));
    next?.addEventListener('click', () => go(1));
    root.addEventListener('click', (event) => {
      if (event.target === root) close();
    });
    return root;
  };

  const renderThumbs = () => {
    if (!thumbs) return;
    thumbs.innerHTML = '';
    if (items.length <= 1) return;

    items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `doke-media-lightbox__thumb${index === activeIndex ? ' is-active' : ''}`;
      button.setAttribute('aria-label', `Abrir imagem ${index + 1}`);
      button.innerHTML = `<img src="${item.src}" alt="${item.alt || 'Miniatura'}">`;
      button.addEventListener('click', () => {
        activeIndex = index;
        render();
      });
      thumbs.appendChild(button);
    });
  };

  const render = () => {
    const item = items[activeIndex];
    if (!item || !image) return;
    image.src = item.src;
    image.alt = item.alt || 'Imagem ampliada';
    root?.classList.toggle('has-gallery', items.length > 1);
    if (prev) prev.disabled = items.length <= 1;
    if (next) next.disabled = items.length <= 1;
    renderThumbs();
  };

  const open = (payload = {}) => {
    ensureRoot();
    const rawItems = Array.isArray(payload.items) && payload.items.length
      ? payload.items
      : [{ src: payload.src, alt: payload.alt, caption: payload.caption, title: payload.title }];
    items = rawItems.map(normalizeItem).filter((item) => item.src);
    if (!items.length) return;
    activeIndex = Math.min(Math.max(Number(payload.index || 0), 0), items.length - 1);
    lastFocused = document.activeElement;
    render();
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    root.querySelector('[data-media-lightbox-close]')?.focus({ preventScroll: true });
  };

  function close() {
    if (!root?.classList.contains('is-open')) return;
    root.classList.remove('is-open', 'has-gallery');
    root.setAttribute('aria-hidden', 'true');
    lockScroll(false);
    if (image) {
      image.src = '';
      image.alt = 'Imagem ampliada';
    }
    if (thumbs) thumbs.innerHTML = '';
    if (lastFocused?.focus) lastFocused.focus({ preventScroll: true });
  }

  const go = (step) => {
    if (items.length <= 1) return;
    activeIndex = (activeIndex + step + items.length) % items.length;
    render();
  };

  const galleryItems = (contextNode) => {
    const gallery = contextNode?.closest?.('[data-gallery], [data-detail-gallery], .ad-gallery, .detail-gallery') || document.querySelector('[data-gallery], [data-detail-gallery], .ad-gallery, .detail-gallery');
    if (!gallery) return [];
    const list = [];
    gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
      const src = thumb.dataset.src || thumb.querySelector('img')?.currentSrc || thumb.querySelector('img')?.src;
      const alt = thumb.querySelector('img')?.alt || thumb.dataset.alt || thumb.getAttribute('aria-label') || 'Foto do serviço';
      if (!src || list.some((item) => item.src === src)) return;
      list.push({ src, alt, caption: alt, title: 'Fotos do serviço' });
    });
    const main = gallery.querySelector('[data-gallery-main]');
    const mainSrc = main?.currentSrc || main?.src;
    if (mainSrc && !list.some((item) => item.src === mainSrc)) {
      list.unshift({ src: mainSrc, alt: main?.alt || 'Foto do serviço', caption: main?.alt || '', title: 'Fotos do serviço' });
    }
    return list;
  };

  document.addEventListener('click', (event) => {
    const detailTrigger = event.target.closest('[data-lightbox-open]');
    if (detailTrigger) {
      const gallery = galleryItems(detailTrigger);
      if (gallery.length) {
        const currentSrc = detailTrigger.closest('[data-gallery], [data-detail-gallery], .ad-gallery, .detail-gallery')?.querySelector('[data-gallery-main]')?.currentSrc
          || detailTrigger.closest('[data-gallery], [data-detail-gallery], .ad-gallery, .detail-gallery')?.querySelector('[data-gallery-main]')?.src;
        const currentIndex = Math.max(0, gallery.findIndex((item) => item.src === currentSrc));
        event.preventDefault();
        event.stopPropagation();
        open({ items: gallery, index: currentIndex, title: 'Fotos do serviço' });
      }
      return;
    }

    const galleryImage = event.target.closest('.detail-gallery img, .ad-gallery img');
    if (galleryImage) {
      const gallery = galleryItems(galleryImage);
      const src = galleryImage.closest('[data-gallery-thumb]')?.dataset.src || galleryImage.currentSrc || galleryImage.src;
      const index = Math.max(0, gallery.findIndex((item) => item.src === src));
      event.preventDefault();
      event.stopPropagation();
      open({ items: gallery.length ? gallery : [{ src, alt: galleryImage.alt }], index, title: 'Fotos do serviço' });
      return;
    }

    const imageNode = event.target.closest(SELECTOR);
    if (!imageNode || imageNode.closest('.doke-media-lightbox')) return;
    const src = imageNode.dataset.mediaSrc || imageNode.currentSrc || imageNode.src;
    if (!src) return;
    event.preventDefault();
    open({
      src,
      alt: imageNode.alt || imageNode.dataset.mediaAlt || 'Imagem ampliada',
      caption: imageNode.dataset.mediaCaption || imageNode.alt || '',
      title: imageNode.dataset.mediaTitle || 'Imagem da conversa'
    });
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!root?.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') go(-1);
    if (event.key === 'ArrowRight') go(1);
  });

  window.DokeMediaLightbox = { open, close };
})();
