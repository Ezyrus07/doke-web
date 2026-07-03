/* Doke Orders Service
   Responsibility: business rules for creating and reading marketplace orders. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  function getRepository() {
    return Doke.repositories && Doke.repositories.orders;
  }

  function assertRepository() {
    var repository = getRepository();
    if (!repository) throw new Error('Orders Repository não foi carregado.');
    return repository;
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function getRepositoryBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary === 'object'
      ? Doke.repositoryBoundary
      : null;
  }

  function getOrdersProviderStatus() {
    var boundary = getRepositoryBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var activeProvider = status && status.activeProvider || 'mock';
    var apiReady = status ? status.apiReady === true : false;

    return Object.freeze({
      domain: 'orders',
      activeProvider: activeProvider,
      requestedProvider: status && status.requestedProvider || activeProvider,
      apiReady: apiReady,
      ordersApiActive: activeProvider === 'api' && apiReady,
      fallbackProvider: 'local-mock'
    });
  }

  function shouldUseOrdersApi() {
    var status = getOrdersProviderStatus();
    return status.ordersApiActive === true;
  }

  function normalizeOrderFromProvider(order) {
    if (!order) return order;
    var repository = getRepository();
    if (repository && typeof repository.normalize === 'function') return repository.normalize(order);
    return clone(order);
  }

  function normalizeOrdersFromProvider(payload) {
    var items = Array.isArray(payload)
      ? payload
      : payload && Array.isArray(payload.items)
        ? payload.items
        : [];
    return items.map(normalizeOrderFromProvider);
  }

  function ordersBoundaryList(filters) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.list !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.list('orders', scopeApiFilters(filters || {})).then(normalizeOrdersFromProvider);
  }

  function ordersBoundaryGetById(orderId) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.getById !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.getById('orders', orderId).then(normalizeOrderFromProvider);
  }

  function ordersBoundaryCreate(payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.create !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.create('orders', payload || {}).then(function (response) {
      return normalizeOrderFromProvider(response && response.order || response);
    });
  }

  function ordersBoundaryAction(actionName, payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Orders API boundary indisponível.'));
    return boundary.action('orders', actionName, payload || {}).then(function (response) {
      return normalizeOrderFromProvider(response && response.order || response);
    });
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    if (root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function') return root.DokeAuth.service.getCurrentUser();
    return null;
  }

  function getSecurity() {
    return Doke.permissions && typeof Doke.permissions === 'object' ? Doke.permissions : null;
  }

  function auditSecurity(action, result, metadata) {
    var security = getSecurity();
    if (security && typeof security.auditSecurityEvent === 'function') {
      security.auditSecurityEvent(Object.assign({
        type: 'orders_security',
        action: action,
        result: result,
        resource: 'order'
      }, metadata || {}));
    }
  }

  function assertOrderAccess(order, action, actor) {
    var security = getSecurity();
    if (security && typeof security.assertResourceAccess === 'function') {
      return security.assertResourceAccess('order', order, action || 'read_order', actor || getCurrentUser() || {});
    }
    return true;
  }

  function assertOrderTransitionAccess(actor, order, nextStatus) {
    var security = getSecurity();
    if (security && typeof security.assertOrderTransition === 'function') {
      return security.assertOrderTransition(actor || getCurrentUser() || {}, order || {}, nextStatus || 'pending');
    }
    return canActorTransition(actor, order, nextStatus);
  }

  function scopeApiFilters(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Object.assign({}, filters, { currentUser: true, actorId: actor.id || '', actorRole: actor.role || 'guest' });
    }
    return Object.assign({}, filters, { actorId: actor.id || '', actorRole: actor.role || 'guest' });
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getInitials(value) {
    return String(value || 'Doke')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'DK';
  }

  function createOrderId() {
    return 'order_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  var STATUS_META = {
    pending: {
      label: 'Aguardando resposta',
      nextAction: 'Acompanhar pedido',
      flow: 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.'
    },
    accepted: {
      label: 'Pedido aceito',
      nextAction: 'Abrir conversa',
      flow: 'Pedido aceito pelo profissional. A conversa foi liberada para alinhar proposta e próximos passos.'
    },
    conversation: {
      label: 'Pedido aceito',
      nextAction: 'Abrir conversa',
      flow: 'Pedido aceito pelo profissional. A conversa foi liberada para alinhar proposta e próximos passos.'
    },
    quoted: {
      label: 'Proposta enviada',
      nextAction: 'Aprovar proposta',
      flow: 'O profissional enviou uma proposta. Revise os valores e confirme para liberar o atendimento.'
    },
    in_progress: {
      label: 'Em andamento',
      nextAction: 'Acompanhar atendimento',
      flow: 'A proposta foi aprovada e o atendimento está em andamento.'
    },
    completed: {
      label: 'Concluído',
      nextAction: 'Avaliar atendimento',
      flow: 'Pedido concluído. O cliente pode avaliar o atendimento.'
    },
    cancelled: {
      label: 'Pedido recusado',
      nextAction: 'Pedido encerrado',
      flow: 'Pedido recusado pelo profissional. A justificativa fica registrada no histórico do pedido.'
    }
  };

  function getStatusMeta(status) {
    return STATUS_META[status] || STATUS_META.pending;
  }

  function getApiActionForStatus(status) {
    var normalizedStatus = normalizeText(status || '');
    var actions = {
      accepted: 'accept',
      conversation: 'accept',
      quoted: 'quote',
      in_progress: 'start',
      completed: 'complete',
      cancelled: 'decline'
    };
    return actions[normalizedStatus] || 'updateStatus';
  }

  function getApiCreatePayload(payload, user) {
    payload = payload || {};
    var createdAt = nowIso();
    return Object.assign({}, payload, {
      clientId: user.id,
      clientName: user.name || 'Cliente Doke',
      clientInitials: user.initials || user.avatarInitials || getInitials(user.name || 'Cliente Doke'),
      status: payload.status || 'pending',
      statusLabel: payload.statusLabel || 'Aguardando resposta',
      nextAction: payload.nextAction || 'Acompanhar pedido',
      title: payload.title || buildTitle(payload),
      source: payload.source || 'budget',
      createdAt: payload.createdAt || createdAt,
      updatedAt: payload.updatedAt || createdAt
    });
  }

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';

  function routeProfessionalForMock(payload) {
    payload = payload || {};
    var originalProfessionalId = normalizeText(payload.professionalId || payload.providerId || '');
    if (!originalProfessionalId) return payload;

    // Static mock environment rule:
    // service cards may use provider IDs (pro_001, pro-renato, etc.), while the login
    // account used for professional testing is user_profissional_demo. Route operational
    // ownership to that mock account and preserve the provider identity as display data.
    if (originalProfessionalId !== DEMO_PROFESSIONAL_ID) {
      return Object.assign({}, payload, {
        displayProfessionalId: originalProfessionalId,
        sourceProfessionalId: originalProfessionalId,
        professionalId: DEMO_PROFESSIONAL_ID,
        providerId: DEMO_PROFESSIONAL_ID
      });
    }

    return payload;
  }

  function buildTitle(payload) {
    var service = normalizeText(payload.serviceTitle || payload.service || payload.title || 'Serviço solicitado');
    var address = normalizeText(payload.locationTitle || payload.location || '');
    return address ? service + ' · ' + address : service;
  }

  function validateCreatePayload(payload, user) {
    if (!user || !user.id) throw new Error('Entre na sua conta para solicitar orçamento.');
    if (user.role && user.role !== 'client') {
      throw new Error('Use uma conta de cliente para solicitar orçamento.');
    }
    if (!normalizeText(payload.serviceId)) throw new Error('Serviço inválido. Abra o anúncio novamente.');
    if (!normalizeText(payload.professionalId || payload.providerId)) throw new Error('Profissional inválido. Abra o anúncio novamente.');
    if (String(payload.professionalId || payload.providerId) === String(user.id)) {
      throw new Error('Você não pode solicitar orçamento para o próprio serviço.');
    }
  }

  function create(payload) {
    payload = payload || {};
    var repository = assertRepository();
    var user = getCurrentUser();
    validateCreatePayload(payload, user);

    if (shouldUseOrdersApi()) {
      return ordersBoundaryCreate(getApiCreatePayload(payload, user)).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-created', {
          detail: {
            order: saved,
            user: user,
            provider: 'api'
          }
        }));
        return saved;
      });
    }

    var createdAt = nowIso();
    var routedPayload = routeProfessionalForMock(payload);
    var order = repository.normalize(Object.assign({}, routedPayload, {
      id: routedPayload.id || createOrderId(),
      clientId: user.id,
      clientName: user.name || 'Cliente Doke',
      clientInitials: user.initials || user.avatarInitials || getInitials(user.name || 'Cliente Doke'),
      status: 'pending',
      statusLabel: 'Aguardando resposta',
      nextAction: 'Acompanhar pedido',
      title: routedPayload.title || buildTitle(routedPayload),
      source: 'budget',
      createdAt: createdAt,
      creatédAt: createdAt,
      updatedAt: createdAt
    }));

    return repository.save(order).then(function (saved) {
      var messagesService = services.messages;
      var conversationTask = messagesService && typeof messagesService.createConversationForOrder === 'function'
        ? messagesService.createConversationForOrder(saved).catch(function (error) {
            console.warn('[DokeOrders:createConversationForOrder]', error);
            return null;
          })
        : Promise.resolve(null);

      return conversationTask.then(function (conversation) {
        var notificationsService = services.notifications;
        var notificationTask = notificationsService && typeof notificationsService.createOrderCreated === 'function'
          ? notificationsService.createOrderCreated(saved, {
              actor: user,
              conversation: conversation,
              conversationId: conversation && conversation.id
            }).catch(function (error) {
              console.warn('[DokeOrders:createOrderNotification]', error);
              return null;
            })
          : Promise.resolve(null);

        return notificationTask.then(function (notification) {
          document.dispatchEvent(new CustomEvent('doke:order-created', {
            detail: {
              order: saved,
              user: user,
              conversation: conversation,
              notification: notification
            }
          }));
          return saved;
        });
      });
    });
  }

  function list(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (shouldUseOrdersApi()) return ordersBoundaryList(filters);
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Promise.resolve([]);
    }
    return assertRepository().list(filters).then(function (orders) {
      if (filters.currentUser === false) return orders;
      if (!security || typeof security.canAccessOrder !== 'function') return orders;
      return (orders || []).filter(function (order) { return security.canAccessOrder(actor, order, 'read_order'); });
    });
  }

  function listLocal(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_local_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return [];
    }
    return assertRepository().listLocal(filters || {});
  }

  function listForCurrentUser(filters) {
    return list(Object.assign({}, filters || {}, { currentUser: true }));
  }

  function getById(orderId) {
    var actor = getCurrentUser() || {};
    if (shouldUseOrdersApi()) {
      return ordersBoundaryGetById(orderId).then(function (order) {
        if (order) assertOrderAccess(order, 'read_order', actor);
        return order;
      });
    }
    return assertRepository().getById(orderId).then(function (order) {
      if (order) assertOrderAccess(order, 'read_order', actor);
      return order;
    });
  }

  function updateLinkedConversation(order, status, options) {
    var messagesService = services.messages;
    if (!messagesService || typeof messagesService.updateConversationOrder !== 'function') return Promise.resolve(null);
    return messagesService.updateConversationOrder(order, {
      status: status,
      reason: options && options.reason
    }).catch(function (error) {
      console.warn('[DokeOrders:updateConversationOrder]', error);
      return null;
    });
  }

  function isDemoProfessionalActor(actor) {
    return Boolean(actor && actor.role === 'professional' && String(actor.id) === 'user_profissional_demo');
  }

  function canProfessionalActOnOrder(actor, order) {
    if (!actor || actor.role !== 'professional') return true;
    if (String(order.professionalId || order.providerId) === String(actor.id)) return true;
    // Static mock compatibility: older orders may still keep the service-card provider ID.
    // The demo professional account owns all local/mock service orders in Sprint flow tests.
    return isDemoProfessionalActor(actor) && Boolean(order && order.id && (order.clientId || order.serviceId));
  }

  function isOrderClient(actor, order) {
    return Boolean(actor && actor.id && String(order.clientId) === String(actor.id));
  }

  function canActorTransition(actor, order, nextStatus) {
    if (!actor || !actor.id) return false;
    if (actor.role === 'professional') {
      if (!canProfessionalActOnOrder(actor, order)) return false;
      return ['accepted', 'conversation', 'quoted', 'in_progress', 'completed', 'cancelled'].indexOf(nextStatus) !== -1;
    }
    if (actor.role === 'client') {
      if (!isOrderClient(actor, order)) return false;
      return ['in_progress', 'completed', 'cancelled'].indexOf(nextStatus) !== -1;
    }
    return false;
  }

  function notifyStatus(order, status, options) {
    var notificationsService = services.notifications;
    if (!notificationsService || typeof notificationsService.createOrderStatusChanged !== 'function') return Promise.resolve(null);
    return notificationsService.createOrderStatusChanged(order, status, options || {}).catch(function (error) {
      console.warn('[DokeOrders:createStatusNotification]', error);
      return null;
    });
  }

  function saveStatus(orderId, nextStatus, statusLabel, options) {
    options = options || {};
    var actor = getCurrentUser() || {};

    if (shouldUseOrdersApi()) {
      var normalizedStatus = nextStatus || 'pending';
      var meta = getStatusMeta(normalizedStatus);
      var apiPayload = Object.assign({}, options, {
        id: orderId,
        orderId: orderId,
        status: normalizedStatus,
        statusLabel: statusLabel || options.statusLabel || meta.label,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      });

      if (!['admin', 'support'].includes(String(actor.role || '').toLowerCase())) {
        var roleAllowedStatuses = actor.role === 'professional'
          ? ['accepted', 'conversation', 'quoted', 'in_progress', 'completed', 'cancelled']
          : actor.role === 'client'
            ? ['in_progress', 'completed', 'cancelled']
            : [];
        if (roleAllowedStatuses.indexOf(normalizedStatus) === -1) {
          auditSecurity('api_transition_denied', 'denied', { actor: actor, resourceId: orderId, reason: 'role_status_mismatch' });
          throw new Error('Você não tem permissão para alterar este pedido.');
        }
      }

      return ordersBoundaryAction(getApiActionForStatus(normalizedStatus), apiPayload).then(function (saved) {
        document.dispatchEvent(new CustomEvent('doke:order-status-changed', {
          detail: {
            order: saved,
            status: normalizedStatus,
            provider: 'api'
          }
        }));
        return saved;
      });
    }

    var repository = assertRepository();
    return repository.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      var normalizedStatus = nextStatus || order.status || 'pending';
      if (!assertOrderTransitionAccess(actor, order, normalizedStatus)) {
        throw new Error('Você não tem permissão para alterar este pedido.');
      }

      var meta = getStatusMeta(normalizedStatus);
      var updatedAt = nowIso();
      var updated = Object.assign({}, order, {
        status: normalizedStatus,
        statusLabel: statusLabel || options.statusLabel || meta.label || order.statusLabel,
        refusalReason: normalizeText(options.reason || order.refusalReason || ''),
        budget: options.budget || order.budget,
        detailBudget: options.budget || order.detailBudget || order.budget,
        payment: options.payment || order.payment,
        proposalAmount: options.amount || order.proposalAmount || '',
        proposalInstallments: options.installments || order.proposalInstallments || '',
        acceptedAt: normalizedStatus === 'accepted' || normalizedStatus === 'conversation' ? order.acceptedAt || updatedAt : order.acceptedAt || '',
        quotedAt: normalizedStatus === 'quoted' ? order.quotedAt || updatedAt : order.quotedAt || '',
        startedAt: normalizedStatus === 'in_progress' ? order.startedAt || updatedAt : order.startedAt || '',
        completedAt: normalizedStatus === 'completed' ? order.completedAt || updatedAt : order.completedAt || '',
        declinedAt: normalizedStatus === 'cancelled' ? order.declinedAt || updatedAt : order.declinedAt || '',
        detailFlow: options.detailFlow || meta.flow || order.detailFlow,
        nextAction: options.nextAction || meta.nextAction || order.nextAction,
        updatedAt: updatedAt
      });

      return repository.save(updated).then(function (saved) {
        return updateLinkedConversation(saved, nextStatus, options).then(function (conversation) {
          return notifyStatus(saved, nextStatus, Object.assign({}, options, {
            actor: actor,
            conversationId: conversation && conversation.id
          })).then(function (notification) {
            document.dispatchEvent(new CustomEvent('doke:order-status-changed', {
              detail: {
                order: saved,
                status: nextStatus,
                conversation: conversation,
                notification: notification
              }
            }));
            return saved;
          });
        });
      });
    });
  }

  function accept(orderId) {
    return saveStatus(orderId, 'accepted', 'Pedido aceito', {});
  }

  function decline(orderId, reason) {
    var normalizedReason = normalizeText(reason);
    if (!normalizedReason) return Promise.reject(new Error('Informe uma justificativa para recusar o pedido.'));
    return saveStatus(orderId, 'cancelled', 'Pedido recusado', { reason: normalizedReason });
  }

  function quote(orderId, payload) {
    payload = payload || {};
    return saveStatus(orderId, 'quoted', 'Proposta enviada', {
      amount: normalizeText(payload.amount || payload.budget || ''),
      budget: normalizeText(payload.amount || payload.budget || ''),
      payment: payload.installments || 'Pagamento seguro pela Doke',
      installments: payload.installments || '',
      detailFlow: 'O profissional enviou uma proposta. Revise os valores e confirme para liberar o atendimento.',
      nextAction: 'Aprovar proposta'
    });
  }

  function start(orderId, options) {
    options = options || {};
    return saveStatus(orderId, 'in_progress', 'Em andamento', Object.assign({}, options, {
      detailFlow: options.detailFlow || 'A proposta foi aprovada e o atendimento está em andamento.',
      nextAction: options.nextAction || 'Acompanhar atendimento'
    }));
  }

  function complete(orderId, options) {
    options = options || {};
    return saveStatus(orderId, 'completed', 'Concluído', Object.assign({}, options, {
      detailFlow: options.detailFlow || 'Pedido concluído. O cliente pode avaliar o atendimento.',
      nextAction: options.nextAction || 'Avaliar atendimento'
    }));
  }

  function updateStatus(orderId, status, options) {
    return saveStatus(orderId, status || 'pending', null, options || {});
  }

  services.orders = Object.freeze({
    provider: 'local-mock',
    getOrdersProviderStatus: getOrdersProviderStatus,
    create: create,
    list: list,
    listLocal: listLocal,
    listForCurrentUser: listForCurrentUser,
    getById: getById,
    accept: accept,
    decline: decline,
    quote: quote,
    start: start,
    complete: complete,
    updateStatus: updateStatus
  });
})();
