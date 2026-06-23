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

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    if (root.DokeAuth && root.DokeAuth.service && typeof root.DokeAuth.service.getCurrentUser === 'function') return root.DokeAuth.service.getCurrentUser();
    return null;
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

    var createdAt = nowIso();
    var order = repository.normalize(Object.assign({}, payload, {
      id: payload.id || createOrderId(),
      clientId: user.id,
      clientName: user.name || 'Cliente Doke',
      clientInitials: user.initials || user.avatarInitials || getInitials(user.name || 'Cliente Doke'),
      status: 'pending',
      statusLabel: 'Aguardando resposta',
      nextAction: 'Acompanhar pedido',
      title: payload.title || buildTitle(payload),
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
    return assertRepository().list(filters || {});
  }

  function listLocal(filters) {
    return assertRepository().listLocal(filters || {});
  }

  function listForCurrentUser(filters) {
    return list(Object.assign({}, filters || {}, { currentUser: true }));
  }

  function getById(orderId) {
    return assertRepository().getById(orderId);
  }

  function updateStatus(orderId, status) {
    var repository = assertRepository();
    return repository.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      return repository.save(Object.assign({}, order, {
        status: status || order.status,
        updatedAt: nowIso()
      }));
    });
  }

  services.orders = Object.freeze({
    provider: 'local-mock',
    create: create,
    list: list,
    listLocal: listLocal,
    listForCurrentUser: listForCurrentUser,
    getById: getById,
    updateStatus: updateStatus
  });
})();
