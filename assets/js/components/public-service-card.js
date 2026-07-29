(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function canonicalServiceId(service) {
    return clean(service && (service.serviceId || service.remoteId || service.remote_id || service.id));
  }
  function publicServiceId(service) {
    return clean(service && (service.id || service.externalId || service.external_id));
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
  function create(service, options) {
    service = service || {}; options = options || {};
    var article = document.createElement('article');
    article.className = 'doke-ad-card doke-ad-card--featured' + (options.results ? ' doke-ad-card--results' : '') + (options.similar ? ' doke-ad-card--similar' : '');
    var canonicalId = canonicalServiceId(service);
    var publicId = publicServiceId(service);
    if (canonicalId) article.dataset.serviceId = canonicalId;
    if (publicId && publicId !== canonicalId) article.dataset.publicServiceId = publicId;
    article.dataset.adProvider = clean(service.providerName || service.professionalName || 'Profissional Doke');

    var media = document.createElement('div'); media.className = 'doke-ad-card__media';
    var imageUrl = firstImage(service);
    if (imageUrl) { var img=document.createElement('img'); img.src=imageUrl; img.alt='Imagem de '+clean(service.title || 'serviço'); img.loading='lazy'; media.appendChild(img); }
    else media.classList.add('is-empty');
    var badge=document.createElement('span'); badge.className='doke-ad-card__badge'; badge.textContent=clean(service.badge || 'Publicado'); media.appendChild(badge);
    var favorite=document.createElement('button'); favorite.className='doke-ad-card__favorite doke-icon-btn doke-icon-btn--soft'; favorite.type='button'; favorite.dataset.serviceFavorite = ''; if (canonicalId) favorite.dataset.favoriteServiceId = canonicalId; favorite.setAttribute('aria-pressed', 'false'); favorite.setAttribute('aria-label','Salvar anúncio'); favorite.appendChild(svg('M20.8 5.9a5.1 5.1 0 0 0-7.2 0L12 7.5l-1.6-1.6a5.1 5.1 0 1 0-7.2 7.2L12 21l8.8-7.9a5.1 5.1 0 0 0 0-7.2Z')); media.appendChild(favorite);

    var body=document.createElement('div'); body.className='doke-ad-card__body';
    var category=document.createElement('span'); category.className='doke-ad-card__category'; category.textContent=clean(service.category || 'Serviço'); body.appendChild(category);
    var title=document.createElement('h3'); title.className='doke-ad-card__title'; title.textContent=clean(service.title || 'Serviço profissional'); body.appendChild(title);

    var seller=document.createElement('div'); seller.className='doke-ad-card__seller';
    var avatar=document.createElement('span'); avatar.className='doke-ad-card__avatar'; avatar.setAttribute('aria-hidden','true');
    var avatarUrl=clean(service.providerAvatar || service.providerAvatarUrl || service.avatarUrl);
    if (avatarUrl) { avatar.classList.add('has-image'); var ai=document.createElement('img'); ai.className='doke-ad-card__avatar-image'; ai.src=avatarUrl; ai.alt=''; ai.loading='lazy'; avatar.appendChild(ai); }
    else { avatar.classList.add('has-initials'); avatar.textContent=initials(service.providerName); }
    var sellerCopy=document.createElement('span'); sellerCopy.className='doke-ad-card__seller-copy';
    var sellerName=document.createElement('strong'); sellerName.className='doke-ad-card__seller-name'; sellerName.textContent=providerHandle(service); sellerName.title=sellerName.textContent; sellerCopy.appendChild(sellerName);
    var reviews=Number(service.reviewsCount || 0), rating=Number(service.rating || 0);
    if (reviews>0 && rating>0) { var meta=document.createElement('span'); meta.className='doke-ad-card__seller-meta'; var rat=document.createElement('span'); rat.className='doke-ad-card__rating'; rat.textContent='★ '+rating.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' ('+reviews+' avaliações)'; meta.appendChild(rat); sellerCopy.appendChild(meta); }
    seller.append(avatar,sellerCopy); body.appendChild(seller);

    var tags=(Array.isArray(service.tags)?service.tags:[]).filter(Boolean).slice(0,2);
    if(tags.length){var tagWrap=document.createElement('div');tagWrap.className='doke-ad-card__tags';tagWrap.setAttribute('aria-label','Tags do anúncio');tags.forEach(function(t){var n=document.createElement('span');n.textContent=clean(t).startsWith('#')?clean(t):'#'+clean(t);tagWrap.appendChild(n);});body.appendChild(tagWrap);}
    var location=clean(service.location || [service.city,service.state].filter(Boolean).join(', '));
    if(location){var loc=document.createElement('div');loc.className='doke-ad-card__location';var locText=document.createElement('span');locText.className='doke-ad-card__location-text';locText.appendChild(svg('M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z'));var lt=document.createElement('span');lt.textContent=location;locText.appendChild(lt);loc.appendChild(locText);body.appendChild(loc);}
    var footer=document.createElement('div');footer.className='doke-ad-card__footer';var price=document.createElement('strong');price.className='doke-ad-card__price';price.textContent=priceLabel(service);var cta=document.createElement('a');cta.className='doke-ad-card__cta doke-btn doke-btn--success';cta.href=service.href || (canonicalId?'detalhe-anuncio.html?id='+encodeURIComponent(canonicalId):'resultados.html');cta.textContent='Ver anúncio';footer.append(price,cta);body.appendChild(footer);
    article.append(media,body); return article;
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
