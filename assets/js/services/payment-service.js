/* Doke Payment Service
   Responsibility: canonical confirmation of a real charge and escrow hold orchestration. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var paymentTasks = Object.create(null);

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function parseAmount(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    var normalized = normalizeText(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    var parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function roundCurrency(value) {
    var amount = Number(value || 0);
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    return null;
  }

  function getPaymentsRepository() {
    return Doke.repositories && Doke.repositories.payments;
  }

  function getMessagesRepository() {
    return Doke.repositories && Doke.repositories.messages;
  }

  function getOrdersService() {
    return services.orders;
  }

  function getWalletService() {
    return services.wallet;
  }

  function getNotificationsService() {
    return services.notifications;
  }

  function getBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary === 'object' ? Doke.repositoryBoundary : null;
  }

  function getPaymentsProviderStatus() {
    var boundary = getBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var activeProvider = status && status.activeProvider || 'mock';
    return Object.freeze({
      domain: 'payments',
      activeProvider: activeProvider,
      apiReady: Boolean(status && status.apiReady === true),
      paymentsApiActive: activeProvider === 'api' && Boolean(status && status.apiReady === true),
      fallbackProvider: getPaymentsRepository() ? 'local-mock' : 'unavailable'
    });
  }

  function shouldUsePaymentsApi() {
    return getPaymentsProviderStatus().paymentsApiActive === true;
  }

  function isActualChargeMessage(message, order) {
    if (!message || normalizeText(message.type).toLowerCase() !== 'charge') return false;
    var kind = normalizeText(message.financialKind || message.kind).toLowerCase();
    if (kind === 'proposal') return false;
    if (kind === 'charge' || message.chargeCreatedAt || message.chargeStatus) return true;
    return Boolean(order && order.chargeMessageId)
      && String(message.id || message.messageId || '') === String(order.chargeMessageId || '');
  }

  function findCharge(conversation, order, requestedMessageId) {
    var messages = Array.isArray(conversation && conversation.messages) ? conversation.messages : [];
    var messageId = normalizeText(requestedMessageId || order && order.chargeMessageId || '');
    if (messageId) {
      var exact = messages.find(function (message) {
        return String(message.id || message.messageId || '') === String(messageId) && isActualChargeMessage(message, order);
      });
      if (exact) return exact;
    }
    return messages.slice().reverse().find(function (message) { return isActualChargeMessage(message, order); }) || null;
  }

  function findConversation(order, payload) {
    var repository = getMessagesRepository();
    if (!repository) return Promise.reject(new Error('Conversa de pagamento indisponível.'));
    var conversationId = normalizeText(payload.conversationId || '');
    if (conversationId && typeof repository.getById === 'function') {
      return repository.getById(conversationId).then(function (conversation) {
        if (conversation) return conversation;
        throw new Error('Conversa de pagamento não encontrada.');
      });
    }
    if (typeof repository.list !== 'function') return Promise.reject(new Error('Conversa de pagamento indisponível.'));
    return repository.list({ currentUser: true, orderId: order.id }).then(function (items) {
      var conversation = (Array.isArray(items) ? items : []).find(function (item) {
        return String(item.orderId || item.order && item.order.id || '') === String(order.id || '');
      });
      if (!conversation) throw new Error('Conversa vinculada ao pedido não encontrada.');
      return conversation;
    });
  }

  function buildPaymentIdentity(repository, order, conversation, charge, actor) {
    var eventKey = ['payment_hold', order.id || '', charge.id || charge.messageId || '', actor.id || ''].filter(Boolean).join(':');
    return {
      eventKey: eventKey,
      id: repository && typeof repository.createPaymentId === 'function'
        ? repository.createPaymentId(eventKey)
        : 'payment_' + Date.now().toString(36)
    };
  }

  function validatePaymentAmounts(order, charge, payload) {
    var grossAmount = roundCurrency(parseAmount(payload.grossAmount || charge.amount || order.chargeAmount || order.proposalAmount || order.budget || 0));
    var chargedAmount = roundCurrency(parseAmount(payload.amount || payload.chargedAmount || grossAmount));
    var discountAmount = roundCurrency(parseAmount(payload.discountAmount || Math.max(0, grossAmount - chargedAmount)));
    var expectedGrossAmount = roundCurrency(parseAmount(order.chargeAmount || charge.amount || order.proposalAmount || order.budget || 0));

    if (!grossAmount || !expectedGrossAmount || Math.abs(grossAmount - expectedGrossAmount) > 0.009) {
      throw new Error('O valor bruto do pagamento não corresponde à cobrança aprovada.');
    }
    if (!chargedAmount || chargedAmount <= 0 || discountAmount < 0) {
      throw new Error('O valor cobrado do cliente é inválido.');
    }
    if (Math.abs(chargedAmount + discountAmount - grossAmount) > 0.009) {
      throw new Error('O desconto informado não fecha com o valor da cobrança.');
    }

    return {
      grossAmount: grossAmount,
      chargedAmount: chargedAmount,
      discountAmount: discountAmount
    };
  }

  function assertPaymentIntentMatches(existing, payment) {
    if (!existing) return true;
    var sameGross = Math.abs(roundCurrency(existing.grossAmount || 0) - roundCurrency(payment.grossAmount || 0)) <= 0.009;
    var sameCharged = Math.abs(roundCurrency(existing.chargedAmount || existing.amount || 0) - roundCurrency(payment.chargedAmount || payment.amount || 0)) <= 0.009;
    var sameDiscount = Math.abs(roundCurrency(existing.discountAmount || 0) - roundCurrency(payment.discountAmount || 0)) <= 0.009;
    var existingMethod = normalizeText(existing.method || '').toLowerCase();
    var requestedMethod = normalizeText(payment.method || '').toLowerCase();
    if (!sameGross || !sameCharged || !sameDiscount || (existingMethod && requestedMethod && existingMethod !== requestedMethod)) {
      throw new Error('Este pagamento já foi iniciado com outra composição de valor ou forma de pagamento.');
    }
    return true;
  }

  function saveProcessingPayment(repository, payment) {
    return repository.getByEventKey(payment.eventKey).then(function (existing) {
      assertPaymentIntentMatches(existing, payment);
      if (existing && ['held', 'released'].indexOf(normalizeText(existing.status).toLowerCase()) !== -1) {
        return { payment: existing, idempotent: true };
      }
      return repository.save(Object.assign({}, existing || {}, payment, {
        status: 'processing',
        escrowStatus: 'processing',
        attemptCount: Number(existing && existing.attemptCount || 0) + 1,
        lastError: '',
        updatedAt: nowIso()
      })).then(function (result) {
        return { payment: result.payment, idempotent: false };
      });
    });
  }

  function registerWalletHold(context) {
    var wallet = getWalletService();
    if (!wallet || typeof wallet.registerHeldReceivableFromPayment !== 'function') {
      return Promise.reject(new Error('Carteira indisponível para manter o pagamento em garantia.'));
    }
    return wallet.registerHeldReceivableFromPayment({
      order: context.order,
      conversation: context.conversation,
      charge: context.charge,
      amount: context.amounts.grossAmount,
      orderId: context.order.id,
      conversationId: context.conversation.id,
      messageId: context.charge.id || context.charge.messageId || '',
      paymentId: context.payment.id,
      clientId: context.actor.id
    }).then(function (result) {
      if (!result || !result.transaction) throw new Error('Não foi possível registrar o valor em garantia.');
      if (normalizeText(result.transaction.status).toLowerCase() !== 'held') {
        throw new Error('O recebível não foi registrado em garantia.');
      }
      return result;
    });
  }

  function recordOrderHold(context, walletResult) {
    var orders = getOrdersService();
    if (!orders || typeof orders.recordPaymentHold !== 'function') {
      return Promise.reject(new Error('Comando canônico de pagamento do pedido indisponível.'));
    }
    return orders.recordPaymentHold(context.order.id, {
      paymentId: context.payment.id,
      chargeMessageId: context.charge.id || context.charge.messageId || '',
      amount: context.amounts.grossAmount,
      chargedAmount: context.amounts.chargedAmount,
      discountAmount: context.amounts.discountAmount,
      method: context.method,
      walletTransactionId: walletResult.transaction.id || '',
      confirmedAt: context.confirmedAt
    });
  }

  function recordChargeHold(context) {
    var repository = getMessagesRepository();
    return repository.getById(context.conversation.id).then(function (latestConversation) {
      if (!latestConversation) throw new Error('A conversa deixou de estar disponível durante o pagamento.');
      var latestCharge = findCharge(latestConversation, context.order, context.charge.id || context.charge.messageId || '');
      if (!latestCharge) throw new Error('A cobrança deixou de estar disponível durante o pagamento.');
      var existingPaymentId = normalizeText(latestCharge.paymentId || '');
      if (latestCharge.paid === true && existingPaymentId && existingPaymentId !== context.payment.id) {
        throw new Error('A cobrança já foi paga por outra transação.');
      }

      Object.assign(latestCharge, {
        paid: true,
        paymentStatus: 'held',
        chargeStatus: 'paid',
        escrowStatus: 'held',
        paymentId: context.payment.id,
        paymentMethod: context.method,
        paidAmount: context.amounts.chargedAmount,
        grossAmount: context.amounts.grossAmount,
        discountAmount: context.amounts.discountAmount,
        paidAt: latestCharge.paidAt || context.confirmedAt,
        updatedAt: context.confirmedAt
      });

      return repository.save(latestConversation).then(function (savedConversation) {
        return { conversation: savedConversation, charge: findCharge(savedConversation, context.order, latestCharge.id || '') || latestCharge };
      });
    });
  }

  function finalizePayment(repository, context, walletResult, orderResult, chargeResult) {
    return repository.save(Object.assign({}, context.payment, {
      status: 'held',
      escrowStatus: 'held',
      walletTransactionId: walletResult.transaction.id || '',
      amount: context.amounts.chargedAmount,
      chargedAmount: context.amounts.chargedAmount,
      grossAmount: context.amounts.grossAmount,
      discountAmount: context.amounts.discountAmount,
      method: context.method,
      confirmedAt: context.confirmedAt,
      heldAt: context.confirmedAt,
      lastError: '',
      updatedAt: context.confirmedAt
    })).then(function (savedPaymentResult) {
      var payment = savedPaymentResult.payment;
      var notifications = getNotificationsService();
      var notificationTask = notifications && typeof notifications.createPaymentHeld === 'function'
        ? notifications.createPaymentHeld(payment, {
            actor: context.actor,
            order: orderResult,
            conversation: chargeResult.conversation,
            charge: chargeResult.charge
          }).catch(function (error) {
            console.warn('[DokePayments:createPaymentHeldNotification]', error);
            return null;
          })
        : Promise.resolve(null);

      return notificationTask.then(function (notification) {
        var result = {
          payment: payment,
          order: orderResult,
          conversation: chargeResult.conversation,
          charge: chargeResult.charge,
          walletTransaction: walletResult.transaction,
          notification: notification,
          idempotent: savedPaymentResult.created === false && savedPaymentResult.updated === false
        };
        document.dispatchEvent(new CustomEvent('doke:payment-confirmed', { detail: clone(result) }));
        return result;
      });
    });
  }

  function markRecoverableFailure(repository, payment, error) {
    if (!repository || !payment) return Promise.resolve(null);
    return repository.save(Object.assign({}, payment, {
      status: 'processing',
      escrowStatus: 'processing',
      lastError: error && error.message ? error.message : String(error || ''),
      recoverable: true,
      updatedAt: nowIso()
    })).catch(function () { return null; });
  }

  function confirmLocalPayment(orderId, payload) {
    payload = payload || {};
    var repository = getPaymentsRepository();
    var orders = getOrdersService();
    var actor = getCurrentUser() || {};
    if (!repository || typeof repository.save !== 'function') return Promise.reject(new Error('Repositório de pagamentos indisponível.'));
    if (!orders || typeof orders.getById !== 'function') return Promise.reject(new Error('Serviço de pedidos indisponível.'));
    if (!actor.id || actor.role !== 'client') return Promise.reject(new Error('Use a conta do cliente para confirmar o pagamento.'));

    return orders.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      if (String(order.clientId || '') !== String(actor.id)) throw new Error('Somente o cliente vinculado pode pagar esta cobrança.');
      if (normalizeText(order.status).toLowerCase() !== 'in_progress') {
        throw new Error('O pagamento só pode ser confirmado durante a execução do pedido.');
      }
      if (!order.proposalApprovedAt) throw new Error('A proposta precisa estar aprovada antes do pagamento.');
      if (!normalizeText(order.chargeMessageId || '')) throw new Error('O pedido ainda não possui uma cobrança válida.');

      return findConversation(order, payload).then(function (conversation) {
        var charge = findCharge(conversation, order, payload.messageId || payload.chargeMessageId || '');
        if (!charge) throw new Error('Cobrança válida não encontrada.');
        if (String(charge.id || charge.messageId || '') !== String(order.chargeMessageId || '')) {
          throw new Error('A cobrança informada não é a cobrança canônica do pedido.');
        }

        var amounts = validatePaymentAmounts(order, charge, payload);
        var identity = buildPaymentIdentity(repository, order, conversation, charge, actor);
        var confirmedAt = nowIso();
        var payment = repository.normalize({
          id: identity.id,
          eventKey: identity.eventKey,
          orderId: order.id,
          conversationId: conversation.id,
          messageId: charge.id || charge.messageId || '',
          chargeMessageId: charge.id || charge.messageId || '',
          clientId: actor.id,
          professionalId: order.professionalId || order.providerId || conversation.professionalId || '',
          status: 'processing',
          escrowStatus: 'processing',
          amount: amounts.chargedAmount,
          chargedAmount: amounts.chargedAmount,
          grossAmount: amounts.grossAmount,
          discountAmount: amounts.discountAmount,
          method: normalizeText(payload.method || payload.paymentMethod || 'Pix') || 'Pix',
          createdAt: confirmedAt,
          updatedAt: confirmedAt
        });

        return saveProcessingPayment(repository, payment).then(function (processing) {
          var context = {
            actor: actor,
            order: order,
            conversation: conversation,
            charge: charge,
            amounts: amounts,
            payment: processing.payment,
            method: payment.method,
            confirmedAt: confirmedAt
          };

          if (processing.idempotent && normalizeText(processing.payment.status).toLowerCase() === 'held') {
            return Promise.all([
              orders.getById(order.id),
              getMessagesRepository().getById(conversation.id)
            ]).then(function (values) {
              return {
                payment: processing.payment,
                order: values[0] || order,
                conversation: values[1] || conversation,
                charge: findCharge(values[1] || conversation, values[0] || order, charge.id || '') || charge,
                walletTransaction: null,
                notification: null,
                idempotent: true
              };
            });
          }

          return registerWalletHold(context)
            .then(function (walletResult) {
              return recordOrderHold(context, walletResult).then(function (orderResult) {
                return recordChargeHold(context).then(function (chargeResult) {
                  return finalizePayment(repository, context, walletResult, orderResult, chargeResult);
                });
              });
            })
            .catch(function (error) {
              return markRecoverableFailure(repository, context.payment, error).then(function () { throw error; });
            });
        });
      });
    });
  }

  function confirmChargePayment(orderId, payload) {
    var normalizedOrderId = normalizeText(orderId);
    payload = payload || {};
    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para pagamento.'));

    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'confirm', Object.assign({}, payload, {
        id: payload.paymentId || payload.messageId || payload.chargeMessageId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    if (paymentTasks[normalizedOrderId]) return paymentTasks[normalizedOrderId];
    var task = confirmLocalPayment(normalizedOrderId, payload);
    paymentTasks[normalizedOrderId] = task.then(function (result) {
      delete paymentTasks[normalizedOrderId];
      return result;
    }, function (error) {
      delete paymentTasks[normalizedOrderId];
      throw error;
    });
    return paymentTasks[normalizedOrderId];
  }

  function getByOrderId(orderId) {
    var repository = getPaymentsRepository();
    if (!repository || typeof repository.getByOrderId !== 'function') return Promise.resolve(null);
    return repository.getByOrderId(orderId);
  }

  services.payments = Object.freeze({
    provider: getPaymentsProviderStatus().activeProvider,
    getPaymentsProviderStatus: getPaymentsProviderStatus,
    shouldUsePaymentsApi: shouldUsePaymentsApi,
    confirmChargePayment: confirmChargePayment,
    getByOrderId: getByOrderId
  });
})();
