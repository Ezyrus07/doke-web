(() => {
  const formatRating = (value) => {
    if (value == null || Number.isNaN(Number(value))) return 'Novo';
    return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const formatId = (value) => {
    const id = String(value || '').replace(/^service[-_]?/i, '').replace(/[-_]/g, '').slice(0, 8).toUpperCase();
    return id ? `ID: #${id}` : 'ID: #DOKE';
  };

  const firstCount = (...values) => {
    for (const value of values) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return 0;
  };

  const formatCount = (value) => firstCount(value).toLocaleString('pt-BR');

  const formatUpdatedLabel = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Agora';
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayDiff = Math.round((dayStart - dateStart) / 86400000);
    if (dayDiff === 0) return 'Hoje';
    if (dayDiff === 1) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getOwnerStatusPresentation = (value) => {
    const status = String(value || 'active').trim().toLowerCase();
    if (status === 'inactive') return { label: 'Inativo', tone: 'warning', action: 'Reativar anúncio', nextStatus: 'active' };
    if (status === 'archived') return { label: 'Arquivado', tone: 'neutral', action: '', nextStatus: '' };
    if (status === 'draft') return { label: 'Rascunho', tone: 'neutral', action: '', nextStatus: '' };
    return { label: 'Publicado', tone: 'success', action: 'Desativar anúncio', nextStatus: 'inactive' };
  };

  const getOwnerSyncPresentation = (service) => {
    const syncStatus = String(service?.syncStatus || '').trim().toLowerCase();
    if (syncStatus === 'synced' || service?.remoteId) {
      return { label: 'Sincronizado', tone: 'success', detail: 'O anúncio está salvo no catálogo compartilhado da Doke.' };
    }
    if (syncStatus === 'pending' || service?.syncError) {
      return {
        label: 'Salvo neste dispositivo',
        tone: 'warning',
        detail: 'O anúncio está preservado neste navegador e será enviado ao catálogo compartilhado quando a sincronização concluir.'
      };
    }
    return { label: 'Salvo neste dispositivo', tone: 'neutral', detail: 'O anúncio ainda não possui confirmação remota.' };
  };

  const getPriceLabel = (service) => {
    const mode = String(service?.priceMode || service?.pricingMode || service?.priceType || '').trim().toLowerCase();
    if (['budget', 'quote', 'sob_orcamento', 'sob orçamento'].includes(mode)) return 'Sob orçamento';

    const explicitLabel = String(service?.priceLabel || '').trim();
    const numericPrice = Number(service?.price ?? service?.startingPrice ?? service?.priceValue ?? explicitLabel.replace(/[^0-9,.-]/g, '').replace(',', '.'));
    if (Number.isFinite(numericPrice) && numericPrice > 0) {
      return `R$ ${numericPrice.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
    }

    return 'Sob orçamento';
  };

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

  const getMessageHref = (service) => {
    const params = new URLSearchParams();
    if (service?.id) params.set('serviceId', service.id);
    if (service?.professionalId || service?.providerId) params.set('professionalId', service.professionalId || service.providerId);
    return `mensagens.html${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const getMetricsRepository = () => window.Doke?.repositories?.serviceMetrics || null;


  const normalizeIdentity = (value) => String(value || '').trim().toLowerCase();

  const getCurrentUser = () => {
    try {
      return window.Doke?.session?.getCurrentUser?.()
        || window.DokeAuth?.service?.getCurrentUser?.()
        || null;
    } catch (error) {
      return null;
    }
  };

  const getUserIdentityKeys = (user = getCurrentUser()) => {
    if (!user) return [];
    const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const profiles = Array.isArray(user.profiles) ? user.profiles : [];
    return [
      user.id,
      user.userId,
      user.providerProfileId,
      user.professionalId,
      profile.id,
      profile.userId,
      profile.ownerId,
      ...profiles.flatMap((item) => [item?.id, item?.userId, item?.ownerId])
    ].map(normalizeIdentity).filter(Boolean);
  };

  const getServiceOwnerKeys = (service) => [
    service?.ownerId,
    service?.professionalId,
    service?.providerId,
    service?.professionalProfileId,
    service?.profileId
  ].map(normalizeIdentity).filter(Boolean);

  const isCurrentUserOwner = (service, user = getCurrentUser()) => {
    const userKeys = new Set(getUserIdentityKeys(user));
    return getServiceOwnerKeys(service).some((key) => userKeys.has(key));
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
    return images[0] || service?.image || 'assets/img/doke-logo-lockup.png';
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
    link.href = service.providerId ? `perfil.html?id=${encodeURIComponent(service.providerId)}` : 'perfil.html';
    link.textContent = service.providerName || 'Profissional Doke';

    replaceChildrenText(line, ['Por ', link]);
  };

  const updateStats = (root, service) => {
    const stats = root.querySelectorAll('.ad-detail-stats li .ad-detail-stat-copy strong');
    const values = [service.views, service.likes, service.messages, service.saves].map((value) => Number(value) || 0);
    stats.forEach((node, index) => { node.textContent = String(values[index] || 0); });
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

  const splitItems = (value) => {
    if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
    return String(value || '').split(/\n|;|,/).map((item) => item.trim()).filter(Boolean);
  };

  const updateAvailability = (root, service) => {
    const section = root.querySelector('[data-detail-availability-section]');
    const list = root.querySelector('[data-detail-availability-list]');
    if (!section || !list) return;
    const schedule = Array.isArray(service.availabilitySchedule) ? service.availabilitySchedule.filter((item) => item && item.start && item.end) : [];
    list.textContent = '';
    schedule.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'detail-availability-item';
      const day = document.createElement('strong');
      day.textContent = item.label || item.day || 'Dia';
      const time = document.createElement('span');
      time.textContent = `${item.start}–${item.end}`;
      row.append(day, time);
      list.appendChild(row);
    });
    section.hidden = schedule.length === 0;
  };

  const renderScopeList = (root, selector, cardSelector, items) => {
    const list = root.querySelector(selector);
    const card = root.querySelector(cardSelector);
    if (!list || !card) return;
    list.textContent = '';
    items.forEach((text) => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });
    card.hidden = items.length === 0;
  };

  const updateScope = (root, service) => {
    const included = splitItems(service.includedItems || service.checklist);
    const excluded = splitItems(service.excludedItems);
    renderScopeList(root, '[data-detail-included-list]', '[data-detail-included-card]', included);
    renderScopeList(root, '[data-detail-excluded-list]', '[data-detail-excluded-card]', excluded);
    const section = root.querySelector('[data-detail-scope-section]');
    if (section) section.hidden = included.length === 0 && excluded.length === 0;
  };

  const updateRelatedSections = (root, payload) => {
    const reviews = Array.isArray(payload?.data?.reviews) ? payload.data.reviews : [];
    const workers = Array.isArray(payload?.data?.workers) ? payload.data.workers : [];
    const publications = Array.isArray(payload?.data?.publications) ? payload.data.publications : [];
    const reviewSection = root.querySelector('[data-reviews-scope="service"]');
    const workerSection = root.querySelector('[data-announcement-related="workers"]');
    const publicationSection = root.querySelector('[data-announcement-related="publications"]');
    if (reviewSection) reviewSection.hidden = reviews.length === 0 || Number(payload?.data?.service?.reviewsCount || 0) === 0;
    if (workerSection) workerSection.hidden = workers.length === 0;
    if (publicationSection) publicationSection.hidden = publications.length === 0;
  };

  const updateListingStatus = (root, service) => {
    const status = String(service.status || 'active').toLowerCase();
    const active = status === 'active';
    const owner = root.dataset.viewerRelation === 'owner';
    const statusNode = root.querySelector('[data-detail-status-message]');
    const visitorActions = root.querySelector('[data-detail-visitor-actions]');
    const budget = root.querySelector('[data-budget-cta]');
    const message = root.querySelector('[data-detail-message-cta]');
    if (statusNode) {
      statusNode.hidden = active;
      statusNode.textContent = status === 'archived'
        ? 'Este anúncio foi arquivado e está disponível apenas para consulta.'
        : 'Este anúncio está temporariamente inativo e não aceita novos pedidos.';
    }
    if (visitorActions) visitorActions.hidden = owner || !active;
    [budget, message].forEach((control) => {
      if (!control) return;
      const unavailable = owner || !active;
      control.hidden = unavailable;
      control.setAttribute('aria-disabled', unavailable ? 'true' : 'false');
    });
    root.dataset.listingStatus = status;
  };

  const updateOwnerDashboard = (root, service) => {
    const status = getOwnerStatusPresentation(service?.status);
    const sync = getOwnerSyncPresentation(service);
    const dashboard = root.querySelector('[data-detail-owner-dashboard]');
    const statusNode = root.querySelector('[data-detail-owner-status]');
    const syncNode = root.querySelector('[data-detail-owner-sync]');
    const toggle = root.querySelector('[data-detail-owner-status-toggle]');

    setText(root, '[data-detail-owner-status-label]', status.label);
    setText(root, '[data-detail-owner-sync]', sync.label);
    setText(root, '[data-detail-owner-price]', getPriceLabel(service));
    setText(root, '[data-detail-owner-price-note]', service?.paymentLabel || (getPriceLabel(service) === 'Sob orçamento'
      ? 'Valor definido após o cliente solicitar orçamento'
      : 'Valor exibido aos clientes'));
    setText(root, '[data-detail-owner-views]', formatCount(firstCount(
      service?.viewsCount,
      service?.viewCount,
      service?.views,
      service?.metrics?.views,
      service?.analytics?.views
    )));
    setText(root, '[data-detail-owner-contacts]', formatCount(firstCount(
      service?.contactsCount,
      service?.contactCount,
      service?.leadsCount,
      service?.inquiriesCount,
      service?.messages,
      service?.metrics?.contacts,
      service?.analytics?.contacts
    )));
    setText(root, '[data-detail-owner-reviews]', formatCount(firstCount(
      service?.reviewCount,
      service?.reviewsCount,
      service?.metrics?.reviews,
      service?.analytics?.reviews
    )));
    setText(root, '[data-detail-owner-updated]', formatUpdatedLabel(service?.updatedAt || service?.createdAt));

    if (dashboard) dashboard.dataset.ownerStatus = String(service?.status || 'active').toLowerCase();
    if (statusNode) statusNode.dataset.statusTone = status.tone;
    if (syncNode) {
      syncNode.dataset.syncTone = sync.tone;
      syncNode.title = sync.detail || sync.label;
      syncNode.setAttribute('aria-label', `${sync.label}. ${sync.detail || ''}`.trim());
    }
    if (toggle) {
      toggle.hidden = !status.nextStatus;
      toggle.disabled = false;
      toggle.removeAttribute('aria-busy');
      toggle.dataset.nextStatus = status.nextStatus;
      toggle.textContent = status.action;
    }
  };

  const updateViewerActions = (root, service) => {
    const owner = isCurrentUserOwner(service);
    const ownerDashboard = root.querySelector('[data-detail-owner-dashboard]');
    const ownerActions = root.querySelector('[data-detail-owner-actions]');
    const visitorActions = root.querySelector('[data-detail-visitor-actions]');
    const visitorOnly = root.querySelectorAll('[data-detail-visitor-only]');
    const ownerNote = root.querySelector('[data-detail-owner-note]');
    const edit = root.querySelector('[data-detail-owner-edit]');
    const manage = root.querySelector('[data-detail-owner-manage]');

    root.dataset.viewerRelation = owner ? 'owner' : 'visitor';
    if (ownerDashboard) ownerDashboard.hidden = !owner;
    if (ownerActions) ownerActions.hidden = !owner;
    if (visitorActions) visitorActions.hidden = owner;
    visitorOnly.forEach((node) => { node.hidden = owner; });
    if (ownerNote && !owner) {
      ownerNote.hidden = true;
      ownerNote.textContent = '';
      delete ownerNote.dataset.messageTone;
    }
    if (edit) edit.href = service?.id
      ? `anunciar-servico.html?mode=edit&edit=${encodeURIComponent(service.id)}`
      : 'anunciar-servico.html';
    if (manage) manage.href = 'perfil-profissional.html#profile-ads';
    updateOwnerDashboard(root, service);
    return owner;
  };

  const updateActionCard = (root, service) => {
    setText(root, '.ad-action-card__price', getPriceLabel(service));
    setText(root, '.ad-action-card__subtext', service.paymentLabel || 'Valor final após orçamento');

    const primary = root.querySelector('[data-budget-cta]');
    if (primary) {
      primary.href = getBudgetHref(service);
      primary.dataset.budgetCta = '';
      const svg = primary.querySelector('svg');
      primary.textContent = '';
      if (svg) primary.appendChild(svg);
      primary.appendChild(document.createTextNode(service.budgetLabel || 'Solicitar orçamento'));
      primary.setAttribute('aria-label', `Solicitar orçamento para ${service.title || 'serviço'}`);
    }

    const messageCta = root.querySelector('[data-detail-message-cta]');
    if (messageCta) messageCta.href = getMessageHref(service);

    const meta = root.querySelectorAll('.ad-action-card__meta dd');
    if (meta[0]) meta[0].textContent = service.responseTime || 'calculada pela Doke';
    if (meta[1]) meta[1].textContent = service.guarantee || service.specs?.Garantia || 'sob orçamento';
    updateOwnerDashboard(root, service);
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
    if (summary[2]) summary[2].textContent = service.responseTime ? `Responde ${service.responseTime.replace(/^em\s+/i, '')}` : 'Tempo de resposta ainda não calculado';

    const cta = root.querySelector('.provider-card__cta');
    if (cta) cta.href = service.providerId ? `perfil.html?id=${encodeURIComponent(service.providerId)}` : 'perfil.html';
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

  const updateSimilarServices = (root, service) => {
    const grid = root.querySelector('[data-similar-ads-grid]');
    const section = root.querySelector('[data-similar-services-section]');
    const api = window.Doke?.services?.services;
    if (!grid || !section || !api?.list || !window.Doke?.publicServiceCard?.create) {
      if (section) section.hidden = true;
      return Promise.resolve([]);
    }
    return api.list({ status: 'active', fresh: true }).then((items) => {
      const related = (Array.isArray(items) ? items : [])
        .filter((item) => item && item.id !== service.id)
        .sort((a, b) => Number(b.category === service.category) - Number(a.category === service.category))
        .slice(0, 4);
      grid.textContent = '';
      related.forEach((item) => grid.appendChild(window.Doke.publicServiceCard.create(item, { similar: true })));
      section.hidden = related.length === 0;
      return related;
    }).catch(() => {
      grid.textContent = '';
      section.hidden = true;
      return [];
    });
  };

  let lastHydratedService = null;
  let lastTrackedViewServiceId = '';
  let ownerMetricsRequestKey = '';

  const refreshOwnerMetrics = (root, service) => {
    const repository = getMetricsRepository();
    const serviceKey = String(service?.remoteId || service?.id || '');
    if (!root || root.dataset.viewerRelation !== 'owner' || !serviceKey || typeof repository?.getTotals !== 'function') {
      return Promise.resolve(null);
    }
    if (ownerMetricsRequestKey === serviceKey) return Promise.resolve(null);
    ownerMetricsRequestKey = serviceKey;
    return Promise.resolve(repository.getTotals(service)).then((totals) => {
      if (!totals || String(lastHydratedService?.id || '') !== String(service?.id || '')) return totals;
      const next = Object.assign({}, lastHydratedService, {
        remoteId: totals.remoteId || lastHydratedService.remoteId,
        syncStatus: totals.syncStatus || lastHydratedService.syncStatus,
        syncError: totals.syncStatus === 'synced' ? '' : lastHydratedService.syncError,
        metrics: Object.assign({}, lastHydratedService.metrics || {}, {
          views: Number(totals.viewsCount || 0) || 0,
          contacts: Number(totals.contactsCount || 0) || 0,
          budgets: Number(totals.budgetCount || 0) || 0,
          messages: Number(totals.messageCount || 0) || 0
        })
      });
      lastHydratedService = next;
      updateOwnerDashboard(root, next);
      return totals;
    }).catch(() => null).finally(() => {
      ownerMetricsRequestKey = '';
    });
  };

  const recordVisitorView = (root, service) => {
    const repository = getMetricsRepository();
    const serviceKey = String(service?.remoteId || service?.id || '');
    if (!root || root.dataset.viewerRelation !== 'visitor' || String(service?.status || 'active').toLowerCase() !== 'active') return;
    if (!serviceKey || lastTrackedViewServiceId === serviceKey || typeof repository?.recordView !== 'function') return;
    lastTrackedViewServiceId = serviceKey;
    Promise.resolve(repository.recordView(service)).catch(() => {});
  };

  const hydrateDetail = (payload) => {
    const root = document.querySelector('[data-detail-page-root]');
    const service = payload?.data?.service || payload?.service;
    if (!root || !service) return;

    lastHydratedService = service;
    root.dataset.serviceId = service.id || '';
    updateGallery(root, service);
    setText(root, '.ad-detail-breadcrumb span:last-child', service.category || 'Detalhe do anúncio');
    setText(root, '.ad-detail-title-block .detail-eyebrow', service.category || 'Serviço Doke');
    setText(root, '#ad-detail-title', service.detailTitle || service.title || 'Serviço Doke');
    setText(root, '.ad-detail-id', formatId(service.id));
    updateProviderLine(root, service);
    updateStats(root, service);
    document.title = `Doke | ${service.title || 'Detalhe do serviço'}`;
    updateDescription(root, service);
    updateSpecs(root, service);
    updateAvailability(root, service);
    updateScope(root, service);
    updateReviews(root, service);
    updateRelatedSections(root, payload);
    updateActionCard(root, service);
    const owner = updateViewerActions(root, service);
    updateListingStatus(root, service);
    if (owner) refreshOwnerMetrics(root, service);
    else recordVisitorView(root, service);
    updateProviderCard(root, service);
    updateLocation(root, service);
    updateSimilarServices(root, service);

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

    window.Doke?.detailAdExperience?.syncFavoriteButtons?.(root.dataset.serviceId || '');

    const ownerStatusToggle = root.querySelector('[data-detail-owner-status-toggle]');
    const ownerNote = root.querySelector('[data-detail-owner-note]');
    const showOwnerMessage = (message, tone = 'neutral') => {
      if (!ownerNote) return;
      ownerNote.textContent = message;
      ownerNote.dataset.messageTone = tone;
      ownerNote.hidden = !message;
    };

    ownerStatusToggle?.addEventListener('click', () => {
      const service = lastHydratedService;
      const nextStatus = ownerStatusToggle.dataset.nextStatus;
      const api = window.Doke?.services?.services;
      if (!service?.id || root.dataset.viewerRelation !== 'owner' || !nextStatus) return;

      const transition = nextStatus === 'active' ? api?.reactivateOwned : api?.deactivateOwned;
      if (typeof transition !== 'function') {
        showOwnerMessage('A gestão de status não está disponível. Atualize a página e tente novamente.', 'danger');
        return;
      }

      ownerStatusToggle.disabled = true;
      ownerStatusToggle.setAttribute('aria-busy', 'true');
      showOwnerMessage(nextStatus === 'active' ? 'Reativando anúncio…' : 'Desativando anúncio…', 'neutral');

      Promise.resolve(transition.call(api, service.id)).then((updated) => {
        if (!updated) throw new Error('O anúncio não foi atualizado.');
        lastHydratedService = updated;
        updateActionCard(root, updated);
        updateViewerActions(root, updated);
        updateListingStatus(root, updated);
        showOwnerMessage(nextStatus === 'active'
          ? 'Anúncio reativado e disponível para novos clientes.'
          : 'Anúncio desativado. Novos clientes não poderão solicitar orçamento.', 'success');
        window.dispatchEvent(new CustomEvent('doke:service-updated', { detail: { service: updated } }));
      }).catch((error) => {
        updateOwnerDashboard(root, service);
        showOwnerMessage(error?.message || 'Não foi possível atualizar o status do anúncio.', 'danger');
      }).finally(() => {
        ownerStatusToggle.removeAttribute('aria-busy');
        ownerStatusToggle.disabled = false;
      });
    });

    const navigateAfterMetric = (event, anchor, metricMethod) => {
      if (!anchor || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (root.dataset.viewerRelation !== 'visitor' || anchor.getAttribute('aria-disabled') === 'true') return;
      const href = anchor.href;
      if (!href) return;
      event.preventDefault();
      event.stopPropagation();
      const repository = getMetricsRepository();
      const metricPromise = typeof repository?.[metricMethod] === 'function' && lastHydratedService
        ? Promise.resolve(repository[metricMethod](lastHydratedService)).catch(() => null)
        : Promise.resolve(null);
      const timeout = new Promise((resolve) => window.setTimeout(resolve, 550));
      Promise.race([metricPromise, timeout]).finally(() => {
        if (typeof window.DokeNavigate === 'function') {
          window.DokeNavigate(href);
          return;
        }
        window.location.href = href;
      });
    };

    const budgetCta = root.querySelector('[data-budget-cta]');
    const messageCta = root.querySelector('[data-detail-message-cta]');
    budgetCta?.addEventListener('click', (event) => navigateAfterMetric(event, budgetCta, 'recordBudgetContact'));
    messageCta?.addEventListener('click', (event) => navigateAfterMetric(event, messageCta, 'recordMessageContact'));

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
  window.DokeDetailAdOwnership = Object.freeze({
    isCurrentUserOwner,
    getUserIdentityKeys,
    getServiceOwnerKeys,
    getOwnerStatusPresentation,
    getOwnerSyncPresentation,
    updateOwnerDashboard
  });

  document.addEventListener('doke:detail-ad-data-ready', (event) => hydrateDetail(event.detail));
  document.addEventListener('doke:auth-session-change', () => {
    const root = document.querySelector('[data-detail-page-root]');
    if (!root || !lastHydratedService) return;
    const owner = updateViewerActions(root, lastHydratedService);
    updateListingStatus(root, lastHydratedService);
    if (owner) refreshOwnerMetrics(root, lastHydratedService);
    else recordVisitorView(root, lastHydratedService);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDetailAd, { once: true });
  } else {
    initDetailAd();
  }
})();
