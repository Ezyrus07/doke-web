(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function canonicalServiceId(service) {
    var direct = clean(service && (service.serviceId || service.remoteId || service.remote_id || service.id));
    if (direct) return direct;
    try {
      var url = new URL(clean(service && service.href), window.location.href);
      if (url.origin !== window.location.origin || url.pathname.split('/').pop() !== 'detalhe-anuncio.html') return '';
      return clean(url.searchParams.get('id') || url.searchParams.get('serviceId') || url.searchParams.get('servico'));
    } catch (_) { return ''; }
  }
  function ownerUserId(service) {
    // These normalized catalog fields represent services.professional_id (user_id), not professional_profiles.id.
    var ids = [service.professionalId, service.providerId, service.ownerId].map(clean).filter(Boolean);
    return ids.length && ids.every(function (id) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) && id.toLowerCase() === ids[0].toLowerCase();
    }) ? ids[0] : '';
  }
  function publicServiceId(service) {
    return clean(service && (service.id || service.externalId || service.external_id));
  }
  function initialFavoriteState(serviceId) {
    var controller = Doke.serviceFavoritesController;
    var loaded = Boolean(controller && typeof controller.getLoadedIdentity === 'function' && controller.getLoadedIdentity());
    var active = Boolean(serviceId && controller && typeof controller.isFavorite === 'function' && controller.isFavorite(serviceId));
    return { active: active, loaded: loaded };
  }
  function initials(name) {
    return clean(name).split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'DK';
  }
  function normalizeHandle(value) {
    var handle = clean(value).replace(/^@+/, '').replace(/\s+/g, '');
    return handle ? '@' + handle : '';
  }
  function providerHandle(service) {
    var direct = normalizeHandle(service && (service.providerHandle || service.providerUsername || service.professionalHandle || service.professionalUsername || service.handle || service.username));
    if (direct) return direct;
    var current = Doke.session && typeof Doke.session.getCurrentUser === 'function' ? Doke.session.getCurrentUser() : null;
    var serviceOwnerId = clean(service && (service.providerId || service.professionalId || service.ownerId));
    if (current && serviceOwnerId && clean(current.id) === serviceOwnerId) {
      var currentHandle = normalizeHandle(current.handle || current.username);
      if (currentHandle) return currentHandle;
    }
    var fallback = clean(service && (service.providerName || service.professionalName))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
    return fallback ? '@' + fallback : '@profissional';
  }
  function firstImage(service) {
    var images = Array.isArray(service && service.images) ? service.images.filter(Boolean) : [];
    return clean(images[0] || service && service.image);
  }
  function priceLabel(service) {
    var mode = clean(service && (service.priceMode || service.pricingType)).toLowerCase();
    if (mode === 'budget' || mode === 'quote' || mode === 'sob_orcamento') return 'Sob orçamento';
    if (clean(service && service.priceLabel)) return clean(service.priceLabel);
    var value = Number(service && (service.priceValue != null ? service.priceValue : service.price));
    return Number.isFinite(value) && value > 0 ? 'R$ ' + value.toLocaleString('pt-BR') : 'Sob orçamento';
  }
  function resultsDecisionSignals(service) {
    var signals = [];
    var responseTime = clean(service && service.responseTime);
    if (responseTime) signals.push('Responde ' + responseTime.replace(/^em\s+/i, ''));
    if (service && service.availableToday === true) signals.push('Disponível hoje');
    if (service && service.verified === true) signals.push('Perfil verificado');
    if (service && service.guaranteed === true) signals.push('Garantia');
    if (service && service.emergency === true) signals.push('Atendimento urgente');
    if (service && service.online === true) signals.push('Atendimento online');
    return signals.slice(0, 2);
  }
  function svg(path) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    node.setAttribute('viewBox', '0 0 24 24'); node.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', path); node.appendChild(p); return node;
  }
  function notifyFavorite(title, body) {
    var toast = Doke.operationalEventToast;
    if (!toast || typeof toast.notify !== 'function') return;
    toast.notify({
      id: 'favorite-' + Date.now() + '-' + Math.random().toString(16).slice(2),
      eventKey: '',
      type: 'favorite_feedback',
      status: '',
      category: 'notifications',
      title: title,
      body: body,
      targetUrl: '',
      actionLabel: '',
      createdAt: new Date().toISOString(),
      raw: {}
    }, { normalized: true });
  }
  function categoryIllustration(category) {
    var drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawing.classList.add('doke-ad-card__illustration');
    drawing.setAttribute('viewBox', '0 0 180 120');
    drawing.setAttribute('aria-hidden', 'true');
    var kind = clean(category).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    var cloud = '<path class="illustration-cloud" d="M17 79C3 46 34 33 47 30c9-26 48-29 66-10 29-6 61 14 52 43 21 35-12 50-43 44-36 15-92 8-105-28Z"/>';
    var art = kind.includes('tecnolog') ? '<rect class="illustration-light" x="35" y="33" width="110" height="63" rx="9"/><path class="illustration-ink" d="M44 42h92v45H44z"/><path class="illustration-fill" d="M25 96h130l-9 11H34z"/><path class="illustration-wire" d="M73 60q17-17 34 0M80 68q10-10 20 0"/><circle class="illustration-mint" cx="90" cy="77" r="4"/>' : kind.includes('pint') ? '<path class="illustration-light" d="M39 28h62v65H39z"/><path class="illustration-fill" d="M43 65q28-22 54-9v33H43z"/><rect class="illustration-mint" x="91" y="29" width="48" height="18" rx="7"/><path class="illustration-wire" d="M139 38h12v23h-30v15"/><rect class="illustration-ink" x="116" y="74" width="10" height="30" rx="4"/>' : '<rect class="illustration-light" x="38" y="30" width="104" height="72" rx="14"/><path class="illustration-fill" d="m62 76 28-28 13 13-28 28z"/><path class="illustration-mint" d="m103 43 17 3-4 16-14 3-13-13z"/><circle class="illustration-light" cx="69" cy="82" r="4"/>';
    drawing.innerHTML = cloud + art;
    return drawing;
  }
  function create(service, options) {
    service = service || {};
    options = options || {};
    var expanded = options.expanded === true, article = document.createElement('article');
    article.className = 'doke-ad-card doke-ad-card--featured ' + (expanded ? 'doke-ad-card--expanded' : 'doke-ad-card--compact') + (options.results ? ' doke-ad-card--results' : '') + (options.similar ? ' doke-ad-card--similar' : '') + (options.favoritePreview ? ' doke-ad-card--favorite-preview' : '');
    var canonicalId = canonicalServiceId(service), publicId = publicServiceId(service), name = clean(service.providerName || service.professionalName || 'Profissional Doke'), category = clean(service.category || 'Serviço'), location = clean(service.location || [
        service.city,
        service.state
      ].filter(Boolean).join(', '));
    if (canonicalId)
      article.dataset.serviceId = canonicalId;
    if (publicId && publicId !== canonicalId)
      article.dataset.publicServiceId = publicId;
    var providerUserId = ownerUserId(service);
    if (providerUserId) article.dataset.providerUserId = providerUserId;
    article.dataset.adProvider = name;
    article.dataset.adCategory = category;
    article.dataset.adLocation = location;
    var media = document.createElement('div');
    media.className = 'doke-ad-card__media';
    var imageUrl = firstImage(service);
    if (imageUrl) {
      var img = document.createElement('img');
      img.src = imageUrl;
      img.alt = 'Imagem de ' + clean(service.title || 'serviço');
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      media.classList.add('is-empty');
      article.classList.add('is-no-photo');
      media.appendChild(categoryIllustration(category));
      var note = document.createElement('span');
      note.className = 'doke-ad-card__media-note';
      note.textContent = 'Sem fotografia do serviço';
      media.appendChild(note);
    }
    var badge = document.createElement('span');
    badge.className = 'doke-ad-card__badge doke-ad-card__category';
    badge.textContent = category;
    if (clean(service.badge))
      badge.title = clean(service.badge);
    var favoriteState = initialFavoriteState(canonicalId), favorite = document.createElement('button');
    favorite.className = 'doke-ad-card__favorite doke-icon-btn doke-icon-btn--soft' + (favoriteState.active ? ' is-active' : '');
    favorite.type = 'button';
    favorite.dataset.serviceFavorite = '';
    favorite.dataset.favoriteState = favoriteState.loaded ? 'ready' : 'loading';
    if (canonicalId)
      favorite.dataset.favoriteServiceId = canonicalId;
    favorite.setAttribute('aria-pressed', String(favoriteState.active));
    favorite.setAttribute('aria-label', favoriteState.active ? 'Remover anúncio dos favoritos' : 'Salvar anúncio');
    favorite.appendChild(svg('M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 1 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2Z'));
    var body = document.createElement('div');
    body.className = 'doke-ad-card__body';
    var title = document.createElement('h3');
    title.className = 'doke-ad-card__title';
    title.textContent = clean(service.title || 'Serviço profissional');
    title.title = title.textContent;
    var identity = document.createElement('div');
    identity.className = 'doke-ad-card__identity';
    var seller = document.createElement('div');
    seller.className = 'doke-ad-card__seller';
    seller.setAttribute('aria-label', providerUserId ? 'Ver perfil de ' + name + ' (' + providerHandle(service) + ')' : name);
    var avatar = document.createElement('span');
    avatar.className = 'doke-ad-card__avatar';
    var avatarUrl = clean(service.providerAvatar || service.providerAvatarUrl || service.avatarUrl);
    if (avatarUrl) {
      avatar.classList.add('has-image');
      var ai = document.createElement('img');
      ai.className = 'doke-ad-card__avatar-image';
      ai.src = avatarUrl;
      ai.alt = '';
      ai.loading = 'lazy';
      avatar.appendChild(ai);
    } else {
      avatar.classList.add('has-initials');
      avatar.textContent = initials(name);
    }
    var sellerCopy = document.createElement('div');
    sellerCopy.className = 'doke-ad-card__seller-copy';
    var sellerName = document.createElement('strong');
    sellerName.className = 'doke-ad-card__seller-name';
    sellerName.textContent = name;
    sellerName.title = providerHandle(service);
    seller.appendChild(sellerName);
    sellerCopy.appendChild(seller);
    var reviews = Number(service.reviewsCount || 0), rating = Number(service.rating || 0);
    if (reviews > 0 && rating > 0) {
      var meta = document.createElement('span');
      meta.className = 'doke-ad-card__seller-meta';
      var rat = document.createElement('span');
      rat.className = 'doke-ad-card__rating';
      rat.textContent = '\u2605 ' + rating.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) + ' (' + reviews + ' avaliações)';
      meta.appendChild(rat);
      sellerCopy.appendChild(meta);
    }
    identity.append(avatar, sellerCopy);
    var context = document.createElement('div');
    context.className = 'doke-ad-card__context';
    var loc = document.createElement('div');
    loc.className = location ? 'doke-ad-card__location' : 'doke-ad-card__location-slot';
    if (location) {
      var locText = document.createElement('span');
      locText.className = 'doke-ad-card__location-text';
      locText.appendChild(svg('M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z'));
      var lt = document.createElement('span');
      lt.textContent = location;
      lt.title = location;
      locText.appendChild(lt);
      loc.appendChild(locText);
    }
    context.appendChild(loc);
    var tags = (Array.isArray(service.tags) ? service.tags : []).filter(Boolean).slice(0, 2), tagWrap = document.createElement('div');
    tagWrap.className = 'doke-ad-card__tags';
    tagWrap.setAttribute('role', 'group');
    tagWrap.setAttribute('aria-label', 'Tags do anúncio');
    tags.forEach(function (t) {
      var tag = document.createElement('span');
      tag.textContent = clean(t).startsWith('#') ? clean(t) : '#' + clean(t);
      tag.title = tag.textContent;
      tagWrap.appendChild(tag);
    });
    context.appendChild(tagWrap);
    if (options.results) {
      var signals = resultsDecisionSignals(service);
      if (signals.length) {
        var facts = document.createElement('div');
        facts.className = 'doke-ad-card__results-facts';
        facts.setAttribute('role', 'group');
        facts.setAttribute('aria-label', 'Informações para decisão');
        signals.forEach(function (label) {
          var fact = document.createElement('span');
          fact.className = 'doke-ad-card__result-fact';
          fact.dataset.resultsDecisionFact = '';
          fact.textContent = label;
          fact.title = label;
          facts.appendChild(fact);
        });
        context.appendChild(facts);
        article.classList.add('has-decision-facts');
      }
    }
    var footer = document.createElement('div');
    footer.className = 'doke-ad-card__footer';
    var price = document.createElement('strong');
    price.className = 'doke-ad-card__price';
    price.title = priceLabel(service);
    var value = document.createElement('span');
    value.textContent = priceLabel(service);
    price.append(svg('M3 4h8l10 10-7 7L3 10V4ZM7 8h.01'), value);
    var cta = document.createElement('a');
    cta.className = 'doke-ad-card__cta doke-btn doke-btn--success';
    if (canonicalId) cta.href = 'detalhe-anuncio.html?id=' + encodeURIComponent(canonicalId);
    else {
      cta.setAttribute('aria-disabled', 'true');
      cta.setAttribute('tabindex', '-1');
    }
    cta.textContent = canonicalId ? 'Ver serviço' : 'Serviço indisponível';
    cta.setAttribute('aria-label', canonicalId ? 'Ver serviço: ' + title.textContent : 'Serviço indisponível');
    cta.appendChild(svg('M5 12h14m-6-6 6 6-6 6'));
    footer.append(price, cta);
    body.append(title, identity, context, footer);
    article.append(media, body, badge, favorite);
    return article;
  }

  document.addEventListener('doke:service-favorite-changed', function (event) {
    var detail = event && event.detail || {};
    if (detail.source === 'broadcast') return;
    notifyFavorite(detail.isFavorite ? 'Anúncio salvo' : 'Anúncio removido', detail.isFavorite ? 'O anúncio foi adicionado aos seus favoritos.' : 'O anúncio foi removido dos seus favoritos.');
  });
  document.addEventListener('doke:service-favorite-error', function (event) {
    var detail = event && event.detail || {};
    if (detail.operation === 'list') return;
    notifyFavorite(detail.code === 'DOKE_FAVORITES_AUTH_REQUIRED' ? 'Entre para favoritar' : 'Não foi possível favoritar', detail.error || 'Tente novamente em instantes.');
  });

  Doke.publicServiceCard = Object.freeze({ create: create, priceLabel: priceLabel, canonicalServiceId: canonicalServiceId });
})();
