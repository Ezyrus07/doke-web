(function () {
  'use strict';

  const root = document.querySelector('[data-pro-review-page]');
  if (!root) return;

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
  let currentCharge = null;

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

  function getCurrentUser() {
    try {
      const sessionUser = window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.();
      if (sessionUser) return sessionUser;
    } catch (error) {
      // fallback below
    }

    try {
      const raw = window.localStorage.getItem('doke.auth.session.v1');
      const session = raw ? JSON.parse(raw) : null;
      return session?.user || null;
    } catch (error) {
      return null;
    }
  }

  function getMessagesRepository() {
    return window.Doke?.repositories?.messages || null;
  }

  function getNotificationsService() {
    return window.Doke?.services?.notifications || null;
  }

  function getWalletService() {
    return window.Doke?.services?.wallet || null;
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

  function resolveCharge(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    if (reviewContext.messageId) {
      const byId = messages.find((message) => String(message.id || '') === String(reviewContext.messageId));
      if (byId && byId.type === 'charge') return byId;
    }
    return messages.slice().reverse().find((message) => message && message.type === 'charge') || null;
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
  }

  function loadReviewContext() {
    const repository = getMessagesRepository();
    if (!repository?.getById || !reviewContext.conversationId) {
      setContextText(null);
      return Promise.resolve(null);
    }

    return repository.getById(reviewContext.conversationId)
      .then((conversation) => {
        currentConversation = conversation || null;
        currentCharge = resolveCharge(currentConversation);
        setContextText(currentConversation);
        return currentConversation;
      })
      .catch(() => {
        setContextText(null);
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

  function createReviewNotification(conversation, review) {
    const service = getNotificationsService();
    if (!service?.create || !conversation) return Promise.resolve(null);

    const user = getCurrentUser() || {};
    const order = conversation.order || {};
    const professionalId = order.professionalId || order.providerId || conversation.professionalId || 'user_profissional_demo';
    const orderTitle = order.serviceTitle || order.title || 'Pedido';
    const score = `${review.rating},0`;

    return service.create({
      type: 'order_reviewed',
      category: 'orders',
      userId: professionalId,
      actorId: user.id || order.clientId || '',
      actorName: user.name || order.clientName || 'Cliente Doke',
      orderId: order.id || conversation.orderId || reviewContext.orderId,
      conversationId: conversation.id || reviewContext.conversationId,
      messageId: reviewContext.messageId,
      serviceId: order.serviceId || conversation.serviceId || '',
      eventKey: ['order_reviewed', order.id || reviewContext.orderId || '', reviewContext.messageId || '', professionalId].filter(Boolean).join(':'),
      title: 'Avaliação recebida',
      body: `${user.name || order.clientName || 'Cliente Doke'} avaliou o atendimento "${orderTitle}" com nota ${score}.`,
      targetUrl: buildConversationUrl({ review: '1' }),
      actionLabel: 'Abrir conversa',
      read: false
    }).catch((error) => {
      console.warn('[DokeReview:createNotification]', error);
      return null;
    });
  }

  function registerWalletReceivable(conversation, review) {
    const service = getWalletService();
    if (!service?.registerReceivableFromOrder || !conversation) return Promise.resolve(null);

    return service.registerReceivableFromOrder({
      conversation,
      order: conversation.order || {},
      charge: currentCharge,
      review,
      orderId: reviewContext.orderId,
      conversationId: reviewContext.conversationId,
      messageId: reviewContext.messageId
    }).catch((error) => {
      console.warn('[DokeReview:walletReceivable]', error);
      return null;
    });
  }

  function persistReview() {
    const repository = getMessagesRepository();
    if (!repository?.getById || !repository?.save || !reviewContext.conversationId) {
      openModal();
      return Promise.resolve(null);
    }

    const review = {
      rating: selectedRating,
      tags: getSelectedTags(),
      criteria: getAspectReviews(),
      comment: normalizeText(generalComment?.value || ''),
      reviewedAt: new Date().toISOString()
    };

    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');

    return repository.getById(reviewContext.conversationId)
      .then((conversation) => {
        if (!conversation) throw new Error('Conversa da avaliação não encontrada.');
        const charge = resolveCharge(conversation);
        if (!charge) throw new Error('Cobrança da avaliação não encontrada.');

        charge.paid = true;
        charge.completed = true;
        charge.reviewed = true;
        charge.review = review;
        charge.text = charge.text || 'Atendimento concluído e avaliado.';
        conversation.status = 'completed';
        conversation.statusLabel = 'Avaliação recebida';
        conversation.lastSeen = 'Atendimento avaliado';
        conversation.lastMessage = 'Atendimento avaliado pelo cliente.';
        conversation.order = Object.assign({}, conversation.order || {}, {
          status: 'completed',
          statusLabel: 'Concluído',
          reviewedAt: review.reviewedAt,
          reviewRating: review.rating,
          reviewTags: review.tags
        });
        currentConversation = conversation;
        currentCharge = charge;
        return repository.save(conversation);
      })
      .then((conversation) => {
        const activeConversation = conversation || currentConversation;
        return Promise.all([
          createReviewNotification(activeConversation, review),
          registerWalletReceivable(activeConversation, review)
        ]).then(([, walletResult]) => ({ conversation: activeConversation, walletResult }));
      })
      .then(({ conversation, walletResult }) => {
        if (walletResult?.transaction && currentCharge) {
          currentCharge.walletTransactionId = walletResult.transaction.id;
        }
        document.dispatchEvent(new CustomEvent('doke:order-reviewed', {
          detail: {
            conversation: conversation || currentConversation,
            charge: currentCharge,
            review,
            walletTransaction: walletResult?.transaction || null
          }
        }));
        openModal();
        return conversation;
      })
      .catch((error) => {
        console.warn('[DokeReview:persist]', error);
        openModal();
        return null;
      })
      .finally(() => {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
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
  loadReviewContext();
})();
