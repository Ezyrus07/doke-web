/*
 * Doke Ad Card Interactions
 * Owner: components/ad-card-interactions.js
 * Contract:
 * - Provider name/avatar -> advertiser profile.
 * - Reviews/rating -> detail page reviews section.
 * - Location -> search results filtered by location.
 * - Hashtag -> search results filtered by tag/query.
 * - Favorite -> local visual toggle only.
 * - Remaining card area -> service detail page.
 */
(function () {
  const DETAIL_PAGE = 'detalhe-anuncio.html';
  const PROFILE_PAGE = 'perfil.html';
  const RESULTS_PAGE = 'resultados.html';

  const slugify = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const textOf = (root, selector) => {
    const node = root?.querySelector(selector);
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  };

  const buildCardContext = (card) => {
    const provider = card.dataset.adProvider || textOf(card, '.doke-ad-card__seller-name') || textOf(card, '.doke-ad-card__seller .doke-ad-card__title') || textOf(card, '.doke-ad-card__title');
    const category = card.dataset.adCategory || textOf(card, '.doke-ad-card__category');
    const locationText = card.dataset.adLocation || textOf(card, '.doke-ad-card__location-text span') || textOf(card, '.doke-ad-card__location');
    const firstTag = textOf(card, '.doke-ad-card__tags span');
    const slugBase = [provider, category].filter(Boolean).join(' ');
    const ad = card.dataset.adSlug || slugify(slugBase || 'anuncio');

    return {
      provider,
      category,
      locationText,
      firstTag,
      ad,
      providerSlug: slugify(provider || 'anunciante')
    };
  };

  const withParams = (base, params, hash) => {
    const url = new URL(base, window.location.href);
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        url.searchParams.set(key, value);
      }
    });
    if (hash) url.hash = hash.replace(/^#/, '');
    return `${url.pathname.split('/').pop()}${url.search}${url.hash}`;
  };

  const go = (href) => {
    window.location.assign(href);
  };

  const toggleFavorite = (button) => {
    const isActive = !button.classList.contains('is-active');
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    button.setAttribute('aria-label', isActive ? 'Remover anúncio dos salvos' : 'Salvar anúncio');
  };

  const hydrateAdCardMedia = (card) => {
    if (!card || card.dataset.adMediaHydrated === '1') return;

    /* CSS-background cards already reserve their final media geometry in the
       component stylesheet. Do not add a loading overlay after first paint; it
       makes tablet cards look different while images are already being fetched
       by CSS. Explicit data-rendered skeletons can use is-media-skeleton from
       the renderer without changing the card shell. */
    card.dataset.adMediaHydrated = '1';
    card.dataset.mediaState = 'static-background';
    card.classList.remove('is-media-loading', 'is-media-ready');
  };

  const ensureSellerIdentity = (card) => {
    if (!card || card.querySelector('.doke-ad-card__seller')) return;
    const body = card.querySelector('.doke-ad-card__body');
    const title = body?.querySelector(':scope > .doke-ad-card__title');
    const avatar = body?.querySelector('.doke-ad-card__location .doke-ad-card__avatar');
    const provider = String(card.dataset.adProvider || '').trim();
    if (!body || !title || !avatar) return;

    const titleText = String(title.textContent || '').replace(/\s+/g, ' ').trim();
    const titleRole = card.dataset.adTitleRole || (provider && provider !== titleText ? 'service' : 'provider');
    const rating = body.querySelector(':scope > .doke-ad-card__rating');
    const category = body.querySelector(':scope > .doke-ad-card__category');
    const seller = document.createElement('div');
    seller.className = 'doke-ad-card__seller' + (titleRole === 'provider' ? ' doke-ad-card__seller--primary' : '');
    const copy = document.createElement('span');
    copy.className = 'doke-ad-card__seller-copy';

    const avatarUrl = String(card.dataset.adAvatar || '').trim();
    if (avatarUrl && !avatar.querySelector('img')) {
      avatar.classList.add('has-image');
      avatar.replaceChildren();
      const image = document.createElement('img');
      image.className = 'doke-ad-card__avatar-image';
      image.src = avatarUrl;
      image.alt = '';
      image.loading = 'lazy';
      avatar.appendChild(image);
    }

    seller.appendChild(avatar);
    if (titleRole === 'provider') {
      title.classList.add('doke-ad-card__seller-name');
      copy.appendChild(title);
    } else {
      const name = document.createElement('strong');
      name.className = 'doke-ad-card__seller-name';
      name.textContent = provider || 'Profissional Doke';
      copy.appendChild(name);
    }

    if (rating) {
      const meta = document.createElement('span');
      meta.className = 'doke-ad-card__seller-meta';
      meta.appendChild(rating);
      copy.appendChild(meta);
    }
    seller.appendChild(copy);

    const insertionPoint = titleRole === 'provider' ? category : title;
    if (insertionPoint?.nextSibling) {
      body.insertBefore(seller, insertionPoint.nextSibling);
    } else {
      body.appendChild(seller);
    }
  };


  const handleAdCardClick = (event) => {
    const card = event.target.closest('.doke-ad-card');
    if (!card) return;

    const favorite = event.target.closest('.doke-ad-card__favorite');
    if (favorite) {
      event.preventDefault();
      event.stopPropagation();
      toggleFavorite(favorite);
      return;
    }

    const currentInteractive = event.target.closest('a, button, input, select, textarea, [role="button"]');
    const clickedCta = event.target.closest('.doke-ad-card__cta');
    const semanticCardControl = event.target.closest('.doke-ad-card__seller, .doke-ad-card__seller-name, .doke-ad-card__avatar, .doke-ad-card__rating, .doke-ad-card__location, .doke-ad-card__tags span');
    if (currentInteractive && !clickedCta && !semanticCardControl) return;

    const context = buildCardContext(card);

    if (event.target.closest('.doke-ad-card__seller, .doke-ad-card__seller-name, .doke-ad-card__avatar')) {
      event.preventDefault();
      go(withParams(PROFILE_PAGE, {
        provider: context.providerSlug,
        from: 'ad-card'
      }));
      return;
    }

    if (event.target.closest('.doke-ad-card__rating')) {
      event.preventDefault();
      go(withParams(DETAIL_PAGE, {
        anuncio: context.ad
      }, 'avaliacoes'));
      return;
    }

    if (event.target.closest('.doke-ad-card__location, .doke-ad-card__location-text')) {
      event.preventDefault();
      go(withParams(RESULTS_PAGE, {
        location: context.locationText,
        tipo: 'anuncios'
      }));
      return;
    }

    const tag = event.target.closest('.doke-ad-card__tags span, .doke-ad-card__tags a, .doke-ad-card__tag');
    if (tag) {
      event.preventDefault();
      const cleanTag = String(tag.textContent || '').replace('#', '').trim();
      go(withParams(RESULTS_PAGE, {
        q: cleanTag ? `#${cleanTag}` : context.firstTag,
        tag: cleanTag,
        tipo: 'anuncios'
      }));
      return;
    }

    if (clickedCta) {
      return;
    }

    event.preventDefault();
    go(withParams(DETAIL_PAGE, {
      anuncio: context.ad
    }));
  };

  const handleAdCardKeydown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target.closest('.doke-ad-card__seller, .doke-ad-card__seller-name, .doke-ad-card__avatar, .doke-ad-card__rating, .doke-ad-card__location, .doke-ad-card__tags span');
    if (!target) return;
    event.preventDefault();
    target.click?.();
    handleAdCardClick({ target, preventDefault(){}, stopPropagation(){} });
  };

  const hydrateAdCards = () => {
    document.querySelectorAll('.doke-ad-card').forEach((card) => {
      if (card.dataset.adInteractionsHydrated === '1') return;
      card.dataset.adInteractionsHydrated = '1';

      ensureSellerIdentity(card);
      const context = buildCardContext(card);
      card.dataset.adSlug = context.ad;
      if (context.provider) card.dataset.adProvider = context.provider;
      if (context.category) card.dataset.adCategory = context.category;
      if (context.locationText) card.dataset.adLocation = context.locationText;

      const seller = card.querySelector('.doke-ad-card__seller');
      const avatar = card.querySelector('.doke-ad-card__avatar');
      const rating = card.querySelector('.doke-ad-card__rating');
      const location = card.querySelector('.doke-ad-card__location');
      const favorite = card.querySelector('.doke-ad-card__favorite');

      [
        [seller, `Abrir perfil de ${context.provider || 'anunciante'}`],
        [avatar, `Abrir perfil de ${context.provider || 'anunciante'}`],
        [rating, 'Ver avaliações do anúncio'],
        [location, 'Buscar anúncios nesta localização']
      ].forEach(([node, label]) => {
        if (!node) return;
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', label);
      });

      card.querySelectorAll('.doke-ad-card__tags span').forEach((tag) => {
        const cleanTag = String(tag.textContent || '').trim();
        tag.setAttribute('role', 'button');
        tag.setAttribute('tabindex', '0');
        tag.setAttribute('aria-label', `Buscar por ${cleanTag}`);
      });

      if (favorite) {
        favorite.setAttribute('aria-pressed', favorite.classList.contains('is-active') ? 'true' : 'false');
      }

      hydrateAdCardMedia(card);

      const cta = card.querySelector('.doke-ad-card__cta');
      if (cta && cta.tagName === 'A') {
        cta.href = withParams(DETAIL_PAGE, { anuncio: context.ad });
      }
    });
  };

  document.addEventListener('click', handleAdCardClick, true);
  document.addEventListener('keydown', handleAdCardKeydown, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAdCards, { once: true });
  } else {
    hydrateAdCards();
  }

  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => Array.from(mutation.addedNodes || []).some((node) => node.nodeType === 1 && (node.matches?.('.doke-ad-card') || node.querySelector?.('.doke-ad-card'))))) {
      hydrateAdCards();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
