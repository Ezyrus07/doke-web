/* Doke Review Service
   Responsibility: canonical post-completion review orchestration and reputation projection. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var reviewTasks = Object.create(null);

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeStatus(value) {
    return normalizeText(value).toLowerCase().replace(/[\s-]+/g, '_');
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    if (root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function') {
      return root.DokeAuth.service.getCurrentUser();
    }
    return null;
  }

  function getReviewsRepository() {
    return Doke.repositories && Doke.repositories.reviews;
  }

  function getMessagesRepository() {
    return Doke.repositories && Doke.repositories.messages;
  }

  function getOrdersService() {
    return services.orders;
  }

  function getNotificationsService() {
    return services.notifications;
  }

  function normalizeRole(user) {
    var role = normalizeStatus(user && (user.role || user.type) || '');
    if (role === 'professional' || role === 'pro' || role === 'worker') return 'professional';
    if (role === 'support' || role === 'admin') return role;
    return 'client';
  }

  function isClientForOrder(actor, order) {
    return Boolean(actor && actor.id && order && normalizeRole(actor) === 'client' && String(actor.id) === String(order.clientId || ''));
  }

  function hasActiveDispute(order) {
    var status = normalizeStatus(order && (order.disputeStatus || order.contestationStatus || '') || '');
    if (!status) return false;
    return ['resolved', 'resolvida', 'released', 'refunded', 'reembolsado'].indexOf(status) === -1;
  }

  function getProfessionalId(order, conversation) {
    return normalizeText(
      order && (order.professionalId || order.providerId || order.displayProfessionalId || order.sourceProfessionalId)
      || conversation && conversation.professionalId
      || ''
    );
  }

  function isActualCharge(conversation, message) {
    if (!message || normalizeStatus(message.type) !== 'charge') return false;
    var kind = normalizeStatus(message.financialKind || message.kind || '');
    if (kind === 'proposal') return false;
    if (kind === 'charge' || message.chargeCreatedAt || message.chargeStatus) return true;
    var chargeMessageId = normalizeText(conversation && conversation.order && conversation.order.chargeMessageId || '');
    return Boolean(chargeMessageId) && String(message.id || message.messageId || '') === chargeMessageId;
  }

  function resolveCharge(conversation, requestedMessageId) {
    var messages = Array.isArray(conversation && conversation.messages) ? conversation.messages : [];
    var messageId = normalizeText(requestedMessageId || conversation && conversation.order && conversation.order.chargeMessageId || '');
    if (messageId) {
      var exact = messages.find(function (message) {
        return String(message.id || message.messageId || '') === messageId && isActualCharge(conversation, message);
      });
      if (exact) return exact;
    }
    return messages.slice().reverse().find(function (message) { return isActualCharge(conversation, message); }) || null;
  }

  function findConversation(order, payload) {
    var repository = getMessagesRepository();
    if (!repository) return Promise.reject(new Error('Conversa da avaliação indisponível.'));
    var conversationId = normalizeText(payload && payload.conversationId || '');
    if (conversationId && typeof repository.getById === 'function') {
      return repository.getById(conversationId).then(function (conversation) {
        if (conversation && String(conversation.orderId || conversation.order && conversation.order.id || '') === String(order.id || '')) return conversation;
        throw new Error('A conversa informada não pertence ao pedido avaliado.');
      });
    }
    if (typeof repository.list !== 'function') return Promise.reject(new Error('Conversa da avaliação indisponível.'));
    return repository.list({ currentUser: true, orderId: order.id }).then(function (items) {
      var conversation = (Array.isArray(items) ? items : []).find(function (item) {
        return String(item.orderId || item.order && item.order.id || '') === String(order.id || '');
      });
      if (!conversation) throw new Error('Conversa vinculada ao pedido não encontrada.');
      return conversation;
    });
  }

  function getEligibility(orderId, payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    var orders = getOrdersService();
    var reviews = getReviewsRepository();
    if (!orders || typeof orders.getById !== 'function') return Promise.reject(new Error('Serviço de pedidos indisponível para avaliação.'));
    if (!reviews || typeof reviews.getByOrderId !== 'function') return Promise.reject(new Error('Repositório de avaliações indisponível.'));

    return orders.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido da avaliação não encontrado.');
      if (!isClientForOrder(actor, order)) throw new Error('Somente o cliente vinculado pode avaliar este pedido.');
      var preliminaryReason = '';
      if (normalizeStatus(order.status) !== 'completed') preliminaryReason = 'A avaliação só fica disponível após a conclusão do pedido.';
      else if (normalizeStatus(order.paymentStatus || '') !== 'released') preliminaryReason = 'A avaliação exige pagamento liberado ao profissional.';
      else if (hasActiveDispute(order)) preliminaryReason = 'Pedidos em contestação não podem ser avaliados.';

      return findConversation(order, payload).then(function (conversation) {
        var charge = resolveCharge(conversation, payload.messageId || order.chargeMessageId || '');
        if (!charge && !preliminaryReason) throw new Error('Cobrança vinculada à avaliação não encontrada.');
        var existingReview = reviews.getByOrderId(order.id);
        var reason = preliminaryReason;
        if (!reason && normalizeStatus(order.paymentStatus || charge && charge.paymentStatus) !== 'released') reason = 'A avaliação exige pagamento liberado ao profissional.';
        else if (!reason && order.reviewId && !existingReview) reason = 'O pedido indica avaliação registrada, mas o registro não foi encontrado.';
        else if (!reason && (existingReview || order.reviewId || charge && charge.reviewId || charge && charge.reviewed === true)) reason = 'Este pedido já foi avaliado.';

        return {
          actor: actor,
          order: order,
          conversation: conversation,
          charge: charge,
          existingReview: existingReview,
          eligible: !reason,
          reason: reason
        };
      });
    });
  }

  function validateReviewPayload(payload) {
    payload = payload || {};
    var rating = Number(payload.rating || 0);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error('Selecione uma nota válida entre 1 e 5.');
    var tags = Array.isArray(payload.tags) ? payload.tags.map(normalizeText).filter(Boolean).slice(0, 12) : [];
    var criteria = Array.isArray(payload.criteria) ? payload.criteria.map(function (criterion) {
      return {
        key: normalizeText(criterion && criterion.key || ''),
        rating: Math.max(1, Math.min(5, Number(criterion && criterion.rating || 0)))
      };
    }).filter(function (criterion) { return criterion.key && Number.isFinite(criterion.rating); }).slice(0, 12) : [];
    return {
      rating: Math.round(rating * 10) / 10,
      tags: tags,
      criteria: criteria,
      comment: normalizeText(payload.comment || '').slice(0, 2000)
    };
  }

  function buildReview(context, payload) {
    var order = context.order || {};
    var conversation = context.conversation || {};
    var actor = context.actor || {};
    var professionalId = getProfessionalId(order, conversation);
    var reviewedAt = normalizeText(payload.reviewedAt || '') || nowIso();
    var eventKey = ['order_review', order.id || '', actor.id || '', professionalId].filter(Boolean).join(':');
    var professionalName = normalizeText(order.professionalName || order.providerName || conversation.peerName || conversation.name || 'Profissional Doke');
    var comment = payload.comment || (payload.tags.length ? payload.tags.join(', ') : 'Atendimento concluído pelo Doke.');

    return {
      eventKey: eventKey,
      orderId: order.id,
      conversationId: conversation.id,
      messageId: context.charge.id || context.charge.messageId || '',
      serviceId: order.serviceId || conversation.serviceId || '',
      serviceTitle: order.serviceTitle || order.title || 'Atendimento concluído',
      professionalId: professionalId,
      providerId: professionalId,
      displayProfessionalId: order.displayProfessionalId || order.sourceProfessionalId || order.providerProfileId || professionalId,
      sourceProfessionalId: order.sourceProfessionalId || order.displayProfessionalId || order.providerProfileId || professionalId,
      profileIds: [professionalId, order.displayProfessionalId, order.sourceProfessionalId, order.providerProfileId].filter(Boolean),
      professionalName: professionalName,
      providerName: professionalName,
      clientId: actor.id,
      clientName: actor.name || order.clientName || 'Cliente Doke',
      avatarText: actor.initials || actor.avatarInitials || order.clientInitials || 'CL',
      rating: payload.rating,
      tags: payload.tags,
      criteria: payload.criteria,
      comment: comment,
      text: comment,
      verified: true,
      source: 'completed-order',
      reviewedAt: reviewedAt,
      createdAt: reviewedAt,
      updatedAt: reviewedAt
    };
  }

  function recordConversationReview(context, review) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.getById !== 'function' || typeof repository.save !== 'function') {
      return Promise.reject(new Error('Conversa indisponível para registrar avaliação.'));
    }
    return repository.getById(context.conversation.id).then(function (conversation) {
      if (!conversation) throw new Error('Conversa da avaliação não encontrada.');
      var charge = resolveCharge(conversation, review.messageId);
      if (!charge) throw new Error('Cobrança da avaliação não encontrada.');
      if (charge.reviewId && String(charge.reviewId) !== String(review.id)) {
        throw new Error('A cobrança já possui outra avaliação registrada.');
      }
      charge.paid = true;
      charge.completed = true;
      charge.reviewed = true;
      charge.reviewId = review.id;
      charge.review = clone(review);
      charge.text = charge.text || 'Atendimento concluído e avaliado.';
      conversation.status = 'completed';
      conversation.statusLabel = 'Avaliação recebida';
      conversation.lastSeen = 'Atendimento avaliado';
      conversation.lastMessage = 'Atendimento avaliado pelo cliente.';
      conversation.order = Object.assign({}, conversation.order || {}, {
        status: 'completed',
        statusLabel: 'Concluído',
        paymentStatus: 'released',
        reviewedAt: review.reviewedAt,
        reviewedBy: review.clientId,
        reviewId: review.id,
        reviewRating: review.rating,
        reviewTags: review.tags,
        nextAction: 'Avaliação enviada'
      });
      conversation.updatedAt = review.reviewedAt;
      return repository.save(conversation).then(function (saved) {
        return { conversation: saved, charge: resolveCharge(saved, review.messageId) };
      });
    });
  }

  function finishReviewEffects(context, review, created) {
    var orders = getOrdersService();
    var notifications = getNotificationsService();
    var reviews = getReviewsRepository();
    return orders.recordReview(context.order.id, {
      reviewConfirmed: true,
      reviewId: review.id,
      reviewedAt: review.reviewedAt,
      rating: review.rating,
      tags: review.tags
    }).then(function (order) {
      return recordConversationReview(context, review).then(function (conversationResult) {
        var notificationTask = notifications && typeof notifications.createOrderReviewed === 'function'
          ? notifications.createOrderReviewed(order, review, {
              actor: context.actor,
              conversationId: conversationResult.conversation.id,
              messageId: review.messageId,
              targetUrl: 'mensagens.html?order=' + encodeURIComponent(order.id || '') + '&review=1'
            })
          : Promise.resolve(null);
        return notificationTask.then(function (notification) {
          var reputation = reviews.getProfessionalReputation({ professionalId: review.professionalId });
          var result = {
            review: review,
            order: order,
            conversation: conversationResult.conversation,
            charge: conversationResult.charge,
            notification: notification,
            reputation: reputation,
            created: created,
            idempotent: !created
          };
          document.dispatchEvent(new CustomEvent('doke:professional-reputation-updated', {
            detail: { professionalId: review.professionalId, reputation: clone(reputation), review: clone(review) }
          }));
          document.dispatchEvent(new CustomEvent('doke:order-reviewed', { detail: clone(result) }));
          return result;
        });
      });
    });
  }

  function submitOrderReview(orderId, payload) {
    var normalizedOrderId = normalizeText(orderId || '');
    payload = payload || {};
    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para avaliação.'));
    if (reviewTasks[normalizedOrderId]) return reviewTasks[normalizedOrderId];

    var task = getEligibility(normalizedOrderId, payload).then(function (context) {
      var validated = validateReviewPayload(payload);
      if (context.existingReview) {
        return finishReviewEffects(context, context.existingReview, false);
      }
      if (!context.eligible) throw new Error(context.reason || 'A avaliação não está disponível.');
      var repository = getReviewsRepository();
      var reviewPayload = buildReview(context, Object.assign({}, validated, { reviewedAt: payload.reviewedAt }));
      return repository.createOnce(reviewPayload).then(function (result) {
        return finishReviewEffects(context, result.review, result.created === true);
      });
    });

    reviewTasks[normalizedOrderId] = task.then(function (result) {
      delete reviewTasks[normalizedOrderId];
      return result;
    }, function (error) {
      delete reviewTasks[normalizedOrderId];
      throw error;
    });
    return reviewTasks[normalizedOrderId];
  }

  services.reviews = Object.freeze({
    provider: 'local-mock',
    getEligibility: getEligibility,
    submitOrderReview: submitOrderReview
  });
})();
