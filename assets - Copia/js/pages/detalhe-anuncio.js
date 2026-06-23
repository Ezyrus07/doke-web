(() => {
  const formatRating = (value) => {
    if (value == null || Number.isNaN(Number(value))) return 'Novo';
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatId = (value) => {
    const id = String(value || '').replace(/^service[-_]?/i, '').replace(/[-_]/g, '').slice(0, 8).toUpperCase();
    return id ? `ID: #${id}` : 'ID: #DOKE';
  };

  const getPriceLabel = (service) => service?.priceLabel || (typeof service?.price === 'number'
    ? `R$ ${Number(service.price).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
    : 'Sob orçamento');

  const getBudgetHref = (service) => {
    const api = window.Doke?.services?.services;
    if (api?.getBudgetUrl) return api.getBudgetUrl(service);

    const params = new URLSearchParams();
    if (service?.id) params.set('serviceId', service.id);
    if (service?.professionalId) params.set('professionalId', service.professionalId);
    return `orcamento.html${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const getDetailHref = (service) => {
    const api = window.Doke?.services?.services;
    if (api?.getDetailUrl) return api.getDetailUrl(service);
    return service?.id ? `detalhe-anuncio.html?id=${encodeURIComponent(service.id)}` : 'detalhe-anuncio.html';
  };

  const setText = (root, selector, value) => {
    const node = root?.querySelector(selector);
    if (node && value != null) node.textContent = String(value);
    return node;
  };

  const replaceChildrenText = (node, entries) => {
    if (!node) return;
    node.textContent = '';
    entries.forEach((entry) => {
      if (entry == null) return;
      if (typeof entry === 'string') {
        node.appendChild(document.createTextNode(entry));
        return;
      }
      node.appendChild(entry);
    });
  };

  const firstImage = (service) => {
    const images = Array.isArray(service?.images) && service.images.length ? service.images : [];
    return images[0] || service?.image || 'assets/img/community/covers/renovation-photo.jpg';
  };

  const updateGallery = (root, service) => {
    const images = Array.isArray(service.images) && service.images.length ? service.images : [firstImage(service)];
    const mainImage = root.querySelector('[data-gallery-main]');
    const thumbs = Array.from(root.querySelectorAll('[data-gallery-thumb]'));

    if (mainImage) {
      mainImage.src = firstImage(service);
      mainImage.alt = service.detailTitle || service.title || 'Imagem do serviço';
    }

    thumbs.forEach((thumb, index) => {
      const image = images[index % images.length];
      thumb.dataset.src = image;
      thumb.setAttribute('aria-label', `Ver imagem ${index + 1} de ${service.title || 'serviço'}`);
      const img = thumb.querySelector('img');
      if (img) {
        img.src = image;
        img.alt = `Prévia de ${service.title || 'serviço'}`;
      }
    });

    window.DokeRefreshDetailGallery?.();
  };

  const updateProviderLine = (root, service) => {
    const line = root.querySelector('.ad-detail-provider-line');
    if (!line) return;

    const link = document.createElement('a');
    link.href = service.providerId ? `perfil.html?professionalId=${encodeURIComponent(service.providerId)}` : 'perfil.html';
    link.textContent = service.providerName || 'Profissional Doke';

    replaceChildrenText(line, ['Por ', link, ' · Dados mockados locais']);
  };

  const updateStats = (root, service) => {
    const stats = root.querySelectorAll('.ad-detail-stats li .ad-detail-stat-copy strong');
    const values = [service.views, service.likes, service.messages, service.saves].map((value) => Number(value) || 0);
    stats.forEach((node, index) => {
      if (values[index]) node.textContent = String(values[index]);
    });
  };

  const updateDescription = (root, service) => {
    setText(root, '#descricao-title', service.descriptionTitle || `Detalhes de ${service.title || 'serviço'}`);

    const descriptionSection = root.querySelector('.detail-section--description');
    const description = descriptionSection?.querySelector('.detail-section__header + p');
    if (description && service.description) description.textContent = service.description;

    const checklist = descriptionSection?.querySelector('.detail-checklist');
    if (checklist && Array.isArray(service.checklist)) {
      checklist.textContent = '';
      service.checklist.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        checklist.appendChild(li);
      });
    }
  };

  const updateSpecs = (root, service) => {
    const specs = root.querySelector('.detail-spec-grid');
    if (!specs) return;

    const rows = Object.assign({
      Categoria: service.category || 'Serviço',
      'Materiais inclusos': service.specs?.['Materiais inclusos'] || 'Sob orçamento',
      'Tipo de serviço': service.specs?.['Tipo de serviço'] || service.category || 'Serviço',
      Garantia: service.specs?.Garantia || service.guarantee || 'Sob orçamento',
      'Prazo médio': service.specs?.['Prazo médio'] || 'Sob orçamento',
      Atendimento: service.specs?.Atendimento || service.location || 'Local a combinar'
    }, service.specs || {});

    specs.textContent = '';
    Object.entries(rows).slice(0, 6).forEach(([label, value]) => {
      const item = document.createElement('div');
      item.className = 'detail-spec';
      const labelNode = document.createElement('span');
      labelNode.textContent = label;
      const valueNode = document.createElement('strong');
      valueNode.textContent = value;
      item.append(labelNode, valueNode);
      specs.appendChild(item);
    });
  };

  const updateReviews = (root, service) => {
    root.querySelectorAll('[data-reviews-scope="service"]').forEach((node) => {
      node.dataset.serviceId = service.id || '';
    });

    setText(root, '.doke-reviews-scoreline__score', formatRating(service.rating));
    setText(root, '.doke-reviews-count', `· ${service.reviews || `${service.reviewsCount || 0} avaliações verificadas`}`);

    const ratingStat = root.querySelector('.provider-card__stat--rating strong');
    if (ratingStat) ratingStat.textContent = formatRating(service.rating);
  };

  const updateActionCard = (root, service) => {
    setText(root, '.ad-action-card__price', getPriceLabel(service));
    setText(root, '.ad-action-card__subtext', service.paymentLabel || 'Valor final após orçamento');

    const primary = root.querySelector('.ad-action-card__actions .detail-btn--primary');
    if (primary) {
      primary.href = getBudgetHref(service);
      primary.dataset.budgetCta = '';
      const svg = primary.querySelector('svg');
      primary.textContent = '';
      if (svg) primary.appendChild(svg);
      primary.appendChild(document.createTextNode(service.budgetLabel || 'Solicitar orçamento'));
      primary.setAttribute('aria-label', `Solicitar orçamento para ${service.title || 'serviço'}`);
    }

    const meta = root.querySelectorAll('.ad-action-card__meta dd');
    if (meta[0]) meta[0].textContent = service.responseTime || 'a combinar';
    if (meta[1]) meta[1].textContent = service.guarantee || service.specs?.Garantia || 'sob orçamento';
  };

  const updateProviderCard = (root, service) => {
    const avatar = root.querySelector('.provider-card__avatar');
    if (avatar) {
      avatar.src = service.providerAvatar || firstImage(service);
      avatar.alt = `Foto de ${service.providerName || 'profissional'}`;
    }

    const title = root.querySelector('#provider-card-title');
    if (title) {
      const verified = service.verified ? ' ✓' : '';
      title.textContent = `${service.providerName || 'Profissional Doke'}${verified}`;
    }

    setText(root, '.provider-card__identity p', service.verified ? 'Profissional verificado' : 'Profissional Doke');

    const summary = root.querySelectorAll('.provider-card__summary .provider-card__stat');
    if (summary[0]) summary[0].textContent = `${formatRating(service.rating)} avaliação`;
    if (summary[1]) summary[1].textContent = service.reviews || `${service.reviewsCount || 0} avaliações`;
    if (summary[2]) summary[2].textContent = service.responseTime ? `Responde ${service.responseTime.replace(/^em\s+/i, '')}` : 'Resposta a combinar';

    const cta = root.querySelector('.provider-card__cta');
    if (cta) cta.href = service.providerId ? `perfil.html?professionalId=${encodeURIComponent(service.providerId)}` : 'perfil.html';
  };

  const updateLocation = (root, service) => {
    const locationCard = root.querySelector('.location-card p');
    if (locationCard) {
      locationCard.innerHTML = '';
      locationCard.appendChild(document.createTextNode(service.location || 'Local a combinar'));
      if (service.region) {
        locationCard.appendChild(document.createElement('br'));
        locationCard.appendChild(document.createTextNode(`Região ${service.region}`));
      }
    }
  };

  const updateSimilarLinks = (root, service) => {
    var ids = ['svc-pintura-carlos', 'svc-eletrica-marcos', 'svc-limpeza-elaine', 'svc-encanador-bruno', 'svc-reforma-casa', 'svc-montagem-moveis'];
    root.querySelectorAll('[data-similar-ads-grid] .doke-ad-card__cta').forEach((link, index) => {
      var id = ids[index % ids.length];
      if (id === service.id) id = ids[(index + 1) % ids.length];
      link.href = `detalhe-anuncio.html?id=${encodeURIComponent(id)}`;
    });
  };

  const hydrateDetail = (payload) => {
    const root = document.querySelector('[data-detail-page-root]');
    const service = payload?.data?.service || payload?.service;
    if (!root || !service) return;

    root.dataset.serviceId = service.id || '';
    updateGallery(root, service);
    setText(root, '.ad-detail-breadcrumb span:last-child', service.category || 'Detalhe do anúncio');
    setText(root, '.ad-detail-title-block .detail-eyebrow', service.category || 'Serviço Doke');
    setText(root, '#ad-detail-title', service.detailTitle || service.title || 'Serviço Doke');
    setText(root, '.ad-detail-id', formatId(service.id));
    updateProviderLine(root, service);
    updateStats(root, service);
    updateDescription(root, service);
    updateSpecs(root, service);
    updateReviews(root, service);
    updateActionCard(root, service);
    updateProviderCard(root, service);
    updateLocation(root, service);
    updateSimilarLinks(root, service);

    root.dispatchEvent(new CustomEvent('doke:detail-ad-hydrated', {
      bubbles: true,
      detail: { service }
    }));
  };

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

    let galleryItems = [];
    let currentIndex = Math.max(0, thumbs.findIndex((thumb) => thumb.classList.contains('is-active')));
    if (currentIndex < 0) currentIndex = 0;

    const refreshGalleryItems = () => {
      galleryItems = thumbs.map((thumb) => ({
        src: thumb.dataset.src,
        alt: thumb.querySelector('img')?.alt || thumb.getAttribute('aria-label') || 'Foto do serviço'
      })).filter((item) => item.src);
    };

    const syncGallery = () => {
      refreshGalleryItems();
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
      refreshGalleryItems();
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
      refreshGalleryItems();
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

    window.DokeRefreshDetailGallery = syncGallery;
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
  window.DokeHydrateDetailAd = hydrateDetail;

  document.addEventListener('doke:detail-ad-data-ready', (event) => hydrateDetail(event.detail));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailAd, { once: true });
  } else {
    initDetailAd();
  }
})();
