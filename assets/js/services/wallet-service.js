/* Doke Wallet Service
   Responsibility: wallet business rules for local/mock receivables and balances. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';
  var DOKE_FEE_RATE = 0.05;

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

  function calculateDokeFee(grossAmount) {
    return roundCurrency(Math.max(0, parseAmount(grossAmount)) * DOKE_FEE_RATE);
  }

  function formatCurrency(value) {
    return roundCurrency(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
      bankAccount: null,
      localTransactions: [],
      transactions: [],
      updatedAt: new Date().toISOString()
    };
  }

  function getBankAccount(options) {
    options = options || {};
    var repository = getRepository();
    if (!repository || typeof repository.getBankAccount !== 'function') return Promise.resolve(null);
    return repository.getBankAccount({
      currentUser: options.currentUser !== false,
      ownerId: options.ownerId || options.professionalId || options.userId || ''
    });
  }

  function saveBankAccount(payload) {
    payload = payload || {};
    var repository = getRepository();
    var user = getCurrentUser() || {};
    if (!repository || typeof repository.saveBankAccount !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.saveBankAccount({
      ownerId: normalizeProfessionalId(payload.ownerId || payload.professionalId || payload.userId || user.id || ''),
      bankName: normalizeText(payload.bankName || ''),
      holderName: normalizeText(payload.holderName || ''),
      accountType: normalizeText(payload.accountType || 'Conta corrente'),
      agency: normalizeText(payload.agency || ''),
      accountNumber: normalizeText(payload.accountNumber || ''),
      pixKey: normalizeText(payload.pixKey || ''),
      status: 'verified',
      nextPayout: 'Repasse automático após liberação'
    });
  }

  function getWallet(options) {
    options = options || {};
    var repository = getRepository();
    var userScope = { currentUser: options.currentUser !== false };
    var localTransactions = repository && typeof repository.listTransactions === 'function'
      ? repository.listTransactions(userScope)
      : [];
    var localSummary = repository && typeof repository.getSummary === 'function'
      ? repository.getSummary(userScope)
      : { available: 0, pending: 0, income: 0, withdrawals: 0, fees: 0 };
    var monthlyDashboard = repository && typeof repository.getMonthlyDashboard === 'function'
      ? repository.getMonthlyDashboard(userScope)
      : {
        netIncome: localSummary.income || 0,
        withdrawals: localSummary.withdrawals || 0,
        fees: localSummary.fees || 0,
        availableBalance: localSummary.available || 0,
        heldBalance: localSummary.pending || 0,
        processingWithdrawals: 0,
        paidOrders: 0,
        withdrawalsCount: 0,
        ticketAverage: 0,
        largestMovement: { amount: 0, title: 'Sem movimentações' },
        chartSeries: { labels: ['—'], grossIncome: [0], netIncome: [0], withdrawals: [0], fees: [0], paidOrders: [0] }
      };

    var wallet = createEmptyWallet();
    wallet.availableBalance = roundCurrency(localSummary.available || 0);
    wallet.pendingBalance = roundCurrency(localSummary.pending || 0);
    wallet.monthlyIncome = roundCurrency(monthlyDashboard.netIncome || 0);
    wallet.withdrawals = roundCurrency(monthlyDashboard.withdrawals || 0);
    wallet.fees = roundCurrency(monthlyDashboard.fees || 0);
    wallet.monthlyDashboard = monthlyDashboard;
    wallet.localTransactions = localTransactions;
    wallet.transactions = localTransactions;
    return getBankAccount({ currentUser: options.currentUser !== false }).then(function (account) {
      wallet.bankAccount = account || null;
      return wallet;
    });
  }

  function listTransactions(options) {
    options = options || {};
    var repository = getRepository();
    var transactions = repository && typeof repository.listTransactions === 'function'
      ? repository.listTransactions(options)
      : [];
    return Promise.resolve(Array.isArray(transactions) ? transactions : []);
  }

  function getMonthlyDashboard(options) {
    options = options || {};
    var repository = getRepository();
    var dashboard = repository && typeof repository.getMonthlyDashboard === 'function'
      ? repository.getMonthlyDashboard(options)
      : null;
    return Promise.resolve(dashboard || {
      period: 'current-month',
      periodLabel: 'Mês atual',
      grossIncome: 0,
      netIncome: 0,
      withdrawals: 0,
      fees: 0,
      availableBalance: 0,
      heldBalance: 0,
      processingWithdrawals: 0,
      paidOrders: 0,
      withdrawalsCount: 0,
      ticketAverage: 0,
      largestMovement: { amount: 0, title: 'Sem movimentações' },
      chartSeries: { labels: ['—'], grossIncome: [0], netIncome: [0], withdrawals: [0], fees: [0], paidOrders: [0] }
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
      body: 'O valor líquido de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' do pedido "' + (transaction.title || 'Pedido') + '" foi liberado na sua carteira.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || ''),
      actionLabel: 'Abrir carteira',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createNotification]', error);
      return null;
    });
  }

  function createWithdrawNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create({
      type: 'wallet_withdraw_requested',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      eventKey: ['wallet_withdraw_requested', transaction.id || '', userId].filter(Boolean).join(':'),
      title: 'Saque solicitado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi solicitado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || ''),
      actionLabel: 'Abrir carteira',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawNotification]', error);
      return null;
    });
  }


  function createWithdrawCompletedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create({
      type: 'wallet_withdraw_completed',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      eventKey: ['wallet_withdraw_completed', transaction.id || '', userId].filter(Boolean).join(':'),
      title: 'Saque concluído',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi enviado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || ''),
      actionLabel: 'Abrir carteira',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawCompletedNotification]', error);
      return null;
    });
  }

  function buildReceivablePayload(payload, status) {
    payload = payload || {};
    var conversation = payload.conversation || {};
    var order = payload.order || conversation.order || {};
    var charge = payload.charge || {};
    var professionalId = normalizeProfessionalId(order.professionalId || order.providerId || conversation.professionalId || conversation.providerId || '');
    var messageId = normalizeText(payload.messageId || charge.id || charge.messageId || '');
    var orderId = normalizeText(payload.orderId || order.id || conversation.orderId || '');
    var grossAmount = roundCurrency(parseAmount(payload.amount || charge.amount || order.proposalAmount || order.budget || order.detailBudget || order.amount || 0));
    var feeAmount = calculateDokeFee(grossAmount);
    var netAmount = roundCurrency(Math.max(0, grossAmount - feeAmount));
    var title = normalizeText(order.serviceTitle || order.title || payload.title || 'Pedido concluído');
    var conversationId = normalizeText(payload.conversationId || conversation.id || charge.conversationId || '');
    var clientId = normalizeText(order.clientId || conversation.clientId || payload.clientId || '');
    var eventKey = ['wallet_receivable', orderId, messageId, professionalId].filter(Boolean).join(':');
    var available = status === 'available';

    return {
      eventKey: eventKey,
      orderId: orderId,
      conversationId: conversationId,
      messageId: messageId,
      serviceId: order.serviceId || conversation.serviceId || '',
      professionalId: professionalId,
      clientId: clientId,
      status: status,
      grossAmount: grossAmount,
      feeRate: DOKE_FEE_RATE,
      feeAmount: feeAmount,
      netAmount: netAmount,
      title: title,
      description: available ? 'Pedido concluído e saldo liberado' : 'Pagamento confirmado em garantia',
      reference: order.code || order.number || (orderId ? 'PED-' + orderId.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(-6) : ''),
      method: 'Recebimento pela Doke',
      note: available
        ? 'Valor líquido liberado após taxa Doke mockada de 5%.'
        : 'Valor bruto em garantia; o líquido será liberado após conclusão do serviço e taxa Doke mockada de 5%.',
      targetUrl: conversationId ? 'mensagens.html?conversation=' + encodeURIComponent(conversationId) + (orderId ? '&order=' + encodeURIComponent(orderId) : '') : 'pedidos.html?order=' + encodeURIComponent(orderId),
      actionLabel: 'Ver pedido',
      context: { order: order, conversation: conversation, charge: charge, payload: payload }
    };
  }

  function registerHeldReceivableFromPayment(payload) {
    var repository = getRepository();
    if (!repository || typeof repository.registerReceivable !== 'function') return Promise.resolve(null);
    var receivable = buildReceivablePayload(payload || {}, 'held');
    delete receivable.context;
    return repository.registerReceivable(receivable);
  }

  function registerReceivableFromOrder(payload) {
    var repository = getRepository();
    if (!repository || typeof repository.registerReceivable !== 'function') return Promise.resolve(null);
    var receivable = buildReceivablePayload(payload || {}, 'available');
    var context = receivable.context || {};
    delete receivable.context;

    return repository.registerReceivable(receivable).then(function (result) {
      if (!result || (!result.created && !result.updated)) return result;
      var order = context.order || {};
      var conversation = context.conversation || {};
      var originalPayload = context.payload || {};
      return createWalletNotification(result.transaction, {
        clientName: order.clientName || conversation.clientName || originalPayload.clientName || 'Cliente Doke'
      }).then(function () { return result; });
    });
  }

  function requestWithdraw(payload) {
    payload = payload || {};
    var repository = getRepository();
    if (!repository || typeof repository.requestWithdraw !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.requestWithdraw({
      amount: payload.amount,
      ownerId: payload.ownerId || payload.professionalId || payload.userId || '',
      bankAccountId: payload.bankAccountId || ''
    }).then(function (result) {
      if (!result || !result.transaction) return result;
      return createWithdrawNotification(result.transaction).then(function () { return result; });
    });
  }


  function completeWithdraw(payload) {
    payload = payload || {};
    var repository = getRepository();
    if (!repository || typeof repository.completeWithdraw !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.completeWithdraw({
      transactionId: payload.transactionId || payload.id || '',
      ownerId: payload.ownerId || payload.professionalId || payload.userId || ''
    }).then(function (result) {
      if (!result || !result.transaction || !result.updated) return result;
      return createWithdrawCompletedNotification(result.transaction).then(function () { return result; });
    });
  }

  services.wallet = Object.freeze({
    provider: getRepository() ? 'local-mock' : 'empty-local-mock',
    getWallet: getWallet,
    listTransactions: listTransactions,
    getMonthlyDashboard: getMonthlyDashboard,
    getBankAccount: getBankAccount,
    saveBankAccount: saveBankAccount,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    registerHeldReceivableFromPayment: registerHeldReceivableFromPayment,
    registerReceivableFromOrder: registerReceivableFromOrder
  });
})();
