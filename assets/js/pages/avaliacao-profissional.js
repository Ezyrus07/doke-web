(function () {
  'use strict';

  const REVIEW_CONTROLLER_VERSION = '20260712-canonical-review-v1';

  function initProfessionalReview() {
    const root = document.querySelector('[data-pro-review-page]');
    if (!root) return;
    if (root.dataset.reviewControllerInitialized === REVIEW_CONTROLLER_VERSION) return;
    root.dataset.reviewControllerInitialized = REVIEW_CONTROLLER_VERSION;
    const hydration = window.DokePageHydration?.create({
      page: 'avaliacao-profissional',
      root,
      loadingSelectors: ['[data-state-loading]'],
      errorSelectors: ['[data-state-error]'],
      skeletonSelectors: ['[data-review-hydration-skeleton]'],
      readySelectors: ['[data-review-hydration-ready]'],
      skeletonMode: 'route-and-document',
      readyPolicy: 'after-skeleton',
      waitFor: ['dom', 'auth', 'review-context'],
      minDuration: 0,
      maxDuration: 8000,
      hasItems: () => Boolean(currentConversation)
    }) || null;
    hydration?.start();
    hydration?.mark('dom');

  const starGroup = root.querySelector('[data-star-group]');
  const ratingLabel = root.querySelector('[data-rating-label]');
  const tagButtons = Array.from(root.querySelectorAll('[data-review-tag]'));
  const aspectsToggle = root.querySelector('[data-review-aspects-toggle]');
  const aspectsPanel = root.querySelector('[data-review-aspects-panel]');
  const aspectRows = Array.from(root.querySelectorAll('[data-review-aspect]'));
  const submitButton = root.querySelector('[data-review-submit]');
  const modal = document.querySelector('[data-review-modal]');
  const generalComment = root.querySelector('.pro-review-field--full textarea');
  const returnLinks = Array.from(document.querySelectorAll('a[href="mensagens.html"], .pro-review-topbar-back'));
  const profileLinks = Array.from(document.querySelectorAll('[data-review-profile-link], .pro-review-success__actions a[href^="perfil.html"]'));
  const profileTitle = root.querySelector('#pro-review-title');
  const profileAvatar = root.querySelector('.pro-review-profile-card__avatar');
  const topbarContext = document.querySelector('[data-header-context] span');
  const providerName = root.querySelector('[data-review-provider-name]');
  const serviceTitleNode = root.querySelector('[data-review-service-title]');
  const orderCodeNode = root.querySelector('[data-review-order-code]');

  const params = new URLSearchParams(window.location.search || '');
  const reviewContext = {
    orderId: params.get('order') || params.get('orderId') || '',
    conversationId: params.get('conversation') || params.get('conversationId') || '',
    messageId: params.get('message') || params.get('messageId') || ''
  };

  let selectedRating = 5;
  let currentConversation = null;

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }


  function getInitials(value) {
    return normalizeText(value)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'DK';
  }


  function getReviewService() {
    return window.Doke?.services?.reviews || null;
  }

  function slugify(value) {
    return normalizeText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function buildConversationUrl(extra) {
    const next = new URLSearchParams();
    if (reviewContext.orderId) next.set('order', reviewContext.orderId);
    if (reviewContext.conversationId) next.set('conversation', reviewContext.conversationId);
    Object.entries(extra || {}).forEach(([key, value]) => {
      if (value != null && value !== '') next.set(key, value);
    });
    const query = next.toString();
    return query ? `mensagens.html?${query}` : 'mensagens.html';
  }

  function getProfileProfessionalId(conversation) {
    const order = conversation?.order || {};
    const professionalName = order.professionalName || order.providerName || conversation?.peerName || conversation?.name || '';
    return order.displayProfessionalId
      || order.sourceProfessionalId
      || order.providerProfileId
      || order.professionalProfileId
      || order.providerId
      || order.professionalId
      || conversation?.professionalId
      || (professionalName ? `provider-${slugify(professionalName)}` : '');
  }

  function buildProfileUrl(conversation) {
    const order = conversation?.order || {};
    const next = new URLSearchParams();
    const professionalId = getProfileProfessionalId(conversation);
    if (professionalId) next.set('professionalId', professionalId);
    if (order.serviceId || conversation?.serviceId) next.set('serviceId', order.serviceId || conversation.serviceId);
    next.set('review', '1');
    const query = next.toString();
    return query ? `perfil.html?${query}` : 'perfil.html';
  }


  function setContextText(conversation) {
    const order = conversation?.order || {};
    const professionalName = order.professionalName || conversation?.peerName || conversation?.name || 'Profissional Doke';
    const serviceTitle = order.serviceTitle || order.title || 'Atendimento concluído';
    const initials = order.professionalInitials || conversation?.peerInitials || getInitials(professionalName);
    const orderCode = order.code || order.number || '#DK-2048';
    if (profileTitle) profileTitle.textContent = professionalName;
    if (providerName) providerName.textContent = professionalName;
    if (serviceTitleNode) serviceTitleNode.textContent = serviceTitle;
    if (profileAvatar) profileAvatar.textContent = initials;
    if (topbarContext) topbarContext.textContent = serviceTitle;
    if (orderCodeNode) orderCodeNode.textContent = orderCode;

    returnLinks.forEach((link) => {
      link.setAttribute('href', buildConversationUrl({ review: '1' }));
    });

    profileLinks.forEach((link) => {
      link.setAttribute('href', buildProfileUrl(conversation));
    });
  }

  function setReviewAvailability(eligibility) {
    if (!submitButton) return;
    const existingReview = eligibility?.existingReview || null;
    const unavailableReason = eligibility?.reason || '';
    if (existingReview) {
      submitButton.disabled = true;
      submitButton.textContent = 'Avaliação já enviada';
      submitButton.setAttribute('aria-disabled', 'true');
      submitButton.title = 'Este pedido já foi avaliado.';
      updateRating(Number(existingReview.rating || 5));
      if (generalComment && existingReview.comment) generalComment.value = existingReview.comment;
      return;
    }
    if (eligibility && eligibility.eligible === false) {
      submitButton.disabled = true;
      submitButton.textContent = 'Avaliação indisponível';
      submitButton.setAttribute('aria-disabled', 'true');
      submitButton.title = unavailableReason || 'A avaliação ainda não está disponível.';
      return;
    }
    submitButton.disabled = false;
    submitButton.removeAttribute('aria-disabled');
    submitButton.removeAttribute('title');
  }

  function loadReviewContext() {
    const service = getReviewService();
    if (!service?.getEligibility || !reviewContext.orderId) {
      currentConversation = null;
      setContextText(null);
      setReviewAvailability({ eligible: false, reason: 'Pedido inválido para avaliação.' });
      return Promise.resolve(null);
    }

    return service.getEligibility(reviewContext.orderId, {
      conversationId: reviewContext.conversationId,
      messageId: reviewContext.messageId
    }).then((eligibility) => {
      currentConversation = eligibility?.conversation || null;
      setContextText(currentConversation);
      setReviewAvailability(eligibility);
      return eligibility;
    }).catch((error) => {
      currentConversation = null;
      setContextText(null);
      setReviewAvailability({ eligible: false, reason: error?.message || 'Avaliação indisponível.' });
      return null;
    });
  }

  function updateRating(value) {
    selectedRating = value;
    if (!starGroup) return;

    Array.from(starGroup.querySelectorAll('[data-rating]')).forEach((button) => {
      const buttonRating = Number(button.dataset.rating);
      const active = buttonRating <= value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(buttonRating === value));
    });

    const label = value >= 5 ? 'excelente' : value >= 4 ? 'muito bom' : value >= 3 ? 'regular' : 'precisa melhorar';
    if (ratingLabel) ratingLabel.textContent = `${value},0 ${label}`;
  }

  function getSelectedTags() {
    return tagButtons
      .filter((button) => button.classList.contains('is-selected'))
      .map((button) => normalizeText(button.textContent))
      .filter(Boolean);
  }

  function getAspectReviews() {
    return aspectRows
      .map((row) => ({
        key: row.dataset.reviewAspect || '',
        rating: Number(row.dataset.rating || 0)
      }))
      .filter((aspect) => aspect.key && aspect.rating > 0);
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pro-review-modal-open');
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pro-review-modal-open');
  }


  function persistReview() {
    const service = getReviewService();
    if (!service?.submitOrderReview || !reviewContext.orderId) {
      return Promise.reject(new Error('Serviço de avaliação indisponível.'));
    }

    const review = {
      rating: selectedRating,
      tags: getSelectedTags(),
      criteria: getAspectReviews(),
      comment: normalizeText(generalComment?.value || ''),
      conversationId: reviewContext.conversationId,
      messageId: reviewContext.messageId
    };

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');

    return service.submitOrderReview(reviewContext.orderId, review)
      .then((result) => {
        currentConversation = result?.conversation || currentConversation;
        setContextText(currentConversation);
        setReviewAvailability({ existingReview: result?.review, eligible: false, reason: 'Este pedido já foi avaliado.' });
        openModal();
        return result;
      })
      .catch((error) => {
        console.warn('[DokeReview:persist]', error);
        submitButton.title = error?.message || 'Não foi possível enviar a avaliação.';
        return null;
      })
      .finally(() => {
        submitButton.removeAttribute('aria-busy');
        if (!submitButton.hasAttribute('aria-disabled')) submitButton.disabled = false;
      });
  }

  if (starGroup) {
    starGroup.addEventListener('click', (event) => {
      const button = event.target.closest('[data-rating]');
      if (!button) return;
      updateRating(Number(button.dataset.rating) || 5);
    });
  }

  tagButtons.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('is-selected');
    });
  });

  if (aspectsToggle && aspectsPanel) {
    aspectsToggle.addEventListener('click', () => {
      const willOpen = aspectsPanel.hidden;
      aspectsPanel.hidden = !willOpen;
      aspectsToggle.setAttribute('aria-expanded', String(willOpen));
    });
  }

  aspectRows.forEach((row) => {
    const buttons = Array.from(row.querySelectorAll('[data-aspect-rating]'));
    buttons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const value = Number(button.dataset.aspectRating || 0);
        row.dataset.rating = String(value);
        buttons.forEach((candidate) => {
          const candidateValue = Number(candidate.dataset.aspectRating || 0);
          candidate.classList.toggle('is-active', candidateValue <= value);
          candidate.setAttribute('aria-pressed', String(candidateValue === value));
        });
      });
    });
  });

  if (submitButton) {
    submitButton.addEventListener('click', persistReview);
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      const closeTrigger = event.target.closest('[data-review-close]');
      const actionLink = event.target.closest('.pro-review-success__actions a[href]');

      if (closeTrigger || actionLink) {
        closeModal();
      }
    });
  }

  window.addEventListener('pagehide', closeModal);
  window.addEventListener('beforeunload', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  updateRating(selectedRating);
  const accountAccess = window.Doke?.services?.accountAccess;
  if (!accountAccess?.guardPage) {
    hydration?.error(new Error('Serviço de autenticação indisponível.'), { source: 'review-account-access' });
    return;
  }

  accountAccess.guardPage({
    name: 'review-account-access',
    source: 'avaliacao-profissional.html'
  }).then((access) => {
    if (!access?.allowed) return null;
    hydration?.mark('auth');
    return loadReviewContext();
  }).then((eligibility) => {
    if (!eligibility?.conversation) throw new Error(eligibility?.reason || 'Avaliação indisponível para este pedido.');
    hydration?.mark('review-context');
  }).catch((error) => {
    hydration?.error(error, { source: 'review-hydration' });
  });
  }

  window.DokeInitReview = initProfessionalReview;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfessionalReview, { once: true });
  } else {
    initProfessionalReview();
  }
})();
