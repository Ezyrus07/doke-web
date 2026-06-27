/* Doke Wallet Service
   Responsibility: wallet business rules for local/mock receivables and balances. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';

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
    if (!Number.isFinite(amount)) return 0;
    return Math.round(amount * 100) / 100;
  }

  function getRepository() {
    return Doke.repositories && Doke.repositories.wallet;
  }

  function getNotificationsService() {
    return Doke.services && Doke.services.notifications;
  }

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function isProviderLikeId(value) {
    var id = normalizeText(value);
    if (!id) return false;
    if (id === DEMO_PROFESSIONAL_ID) return false;
    return /^(pro|provider|profissional|renato)[_-]/i.test(id) || id.indexOf('user_') !== 0;
  }

  function normalizeProfessionalId(value) {
    var id = normalizeText(value);
    if (!id) return DEMO_PROFESSIONAL_ID;
    return isProviderLikeId(id) ? DEMO_PROFESSIONAL_ID : id;
  }

  function createEmptyWallet() {
    return {
      currency: 'BRL',
      availableBalance: 0,
      pendingBalance: 0,
      monthlyIncome: 0,
      withdrawals: 0,
      fees: 0,
      localTransactions: [],
      transactions: [],
      updatedAt: new Date().toISOString()
    };
  }

  function getWallet(options) {
    options = options || {};
    var repository = getRepository();
    var localTransactions = repository && typeof repository.listTransactions === 'function'
      ? repository.listTransactions({ currentUser: options.currentUser !== false })
      : [];
    var localSummary = repository && typeof repository.getSummary === 'function'
      ? repository.getSummary({ currentUser: options.currentUser !== false })
      : { available: 0, pending: 0, income: 0, withdrawals: 0, fees: 0 };

    var wallet = createEmptyWallet();
    wallet.availableBalance = roundCurrency(localSummary.available || 0);
    wallet.pendingBalance = roundCurrency(localSummary.pending || 0);
    wallet.monthlyIncome = roundCurrency(localSummary.income || 0);
    wallet.withdrawals = roundCurrency(localSummary.withdrawals || 0);
    wallet.fees = roundCurrency(localSummary.fees || 0);
    wallet.localTransactions = localTransactions;
    wallet.transactions = localTransactions;
    return Promise.resolve(wallet);
  }

  function listTransactions(options) {
    return getWallet(options || {}).then(function (wallet) {
      return Array.isArray(wallet.transactions) ? wallet.transactions : [];
    });
  }

  function createWalletNotification(transaction, payload) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    payload = payload || {};
    return notifications.create({
      type: 'wallet_receivable_available',
      category: 'wallet',
      userId: transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID,
      actorId: transaction.clientId || '',
      actorName: payload.clientName || 'Cliente Doke',
      orderId: transaction.orderId || '',
      conversationId: transaction.conversationId || '',
      messageId: transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      eventKey: ['wallet_receivable_available', transaction.orderId || '', transaction.messageId || '', transaction.professionalId || transaction.userId || ''].filter(Boolean).join(':'),
      title: 'Saldo disponível',
      body: 'O pagamento do pedido "' + (transaction.title || 'Pedido') + '" foi liberado na sua carteira.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || ''),
      actionLabel: 'Abrir carteira',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createNotification]', error);
      return null;
    });
  }

  function registerReceivableFromOrder(payload) {
    payload = payload || {};
    var repository = getRepository();
    if (!repository || typeof repository.registerReceivable !== 'function') return Promise.resolve(null);

    var conversation = payload.conversation || {};
    var order = payload.order || conversation.order || {};
    var charge = payload.charge || {};
    var professionalId = normalizeProfessionalId(order.professionalId || order.providerId || conversation.professionalId || conversation.providerId || '');
    var messageId = normalizeText(payload.messageId || charge.id || charge.messageId || '');
    var orderId = normalizeText(payload.orderId || order.id || conversation.orderId || '');
    var amount = parseAmount(payload.amount || charge.amount || order.proposalAmount || order.budget || order.detailBudget || order.amount || 0);
    var title = normalizeText(order.serviceTitle || order.title || payload.title || 'Pedido concluído');
    var conversationId = normalizeText(payload.conversationId || conversation.id || charge.conversationId || '');
    var clientId = normalizeText(order.clientId || conversation.clientId || payload.clientId || '');
    var eventKey = ['wallet_receivable', orderId, messageId, professionalId].filter(Boolean).join(':');

    return repository.registerReceivable({
      eventKey: eventKey,
      orderId: orderId,
      conversationId: conversationId,
      messageId: messageId,
      serviceId: order.serviceId || conversation.serviceId || '',
      professionalId: professionalId,
      clientId: clientId,
      grossAmount: amount,
      feeAmount: 0,
      netAmount: amount,
      title: title,
      description: 'Pedido concluído e avaliado',
      reference: order.code || order.number || (orderId ? 'PED-' + orderId.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(-6) : ''),
      method: 'Recebimento pela Doke',
      note: 'Valor liberado após conclusão e avaliação do atendimento.',
      targetUrl: conversationId ? 'mensagens.html?conversation=' + encodeURIComponent(conversationId) + (orderId ? '&order=' + encodeURIComponent(orderId) : '') : 'pedidos.html?order=' + encodeURIComponent(orderId),
      actionLabel: 'Ver pedido'
    }).then(function (result) {
      if (!result || !result.created) return result;
      return createWalletNotification(result.transaction, {
        clientName: order.clientName || conversation.clientName || payload.clientName || 'Cliente Doke'
      }).then(function () { return result; });
    });
  }

  services.wallet = Object.freeze({
    provider: getRepository() ? 'local-mock' : 'empty-local-mock',
    getWallet: getWallet,
    listTransactions: listTransactions,
    registerReceivableFromOrder: registerReceivableFromOrder
  });
})();
