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

  function getRepositoryBoundary() {
    return Doke.repositoryBoundary && typeof Doke.repositoryBoundary === 'object'
      ? Doke.repositoryBoundary
      : null;
  }

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function getWalletProviderStatus() {
    var boundary = getRepositoryBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var activeProvider = status && status.activeProvider || 'mock';
    var apiReady = status ? status.apiReady === true : false;

    return Object.freeze({
      domain: 'wallet',
      activeProvider: activeProvider,
      requestedProvider: status && status.requestedProvider || activeProvider,
      apiReady: apiReady,
      walletApiActive: activeProvider === 'api' && apiReady,
      fallbackProvider: getRepository() ? 'local-mock' : 'empty-local-mock'
    });
  }

  function shouldUseWalletApi() {
    return getWalletProviderStatus().walletApiActive === true;
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

  function getSecurity() {
    return Doke.permissions && typeof Doke.permissions === 'object' ? Doke.permissions : null;
  }

  function auditSecurity(action, result, metadata) {
    var security = getSecurity();
    if (security && typeof security.auditSecurityEvent === 'function') {
      security.auditSecurityEvent(Object.assign({
        type: 'wallet_security',
        action: action,
        result: result,
        resource: 'wallet'
      }, metadata || {}));
    }
  }

  function canAccessAdmin(actor) {
    var security = getSecurity();
    return Boolean(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor || getCurrentUser() || {}));
  }

  function assertWalletOwner(ownerId, action, actor) {
    var security = getSecurity();
    actor = actor || getCurrentUser() || {};
    if (security && typeof security.canAccessWalletOwner === 'function' && !security.canAccessWalletOwner(actor, ownerId, action || 'read_wallet')) {
      auditSecurity(action || 'read_wallet', 'denied', { actor: actor, resourceId: ownerId || '', reason: 'wallet_owner_mismatch' });
      throw security.createPermissionError ? security.createPermissionError('wallet:' + (action || 'read'), { ownerId: ownerId || '' }) : new Error('Você não tem permissão para acessar esta carteira.');
    }
    return true;
  }

  function assertAdminAction(action, payload, actor) {
    var security = getSecurity();
    actor = actor || getCurrentUser() || {};
    if (security && typeof security.assertAdminAction === 'function') return security.assertAdminAction(action, payload || {}, actor);
    if (!canAccessAdmin(actor)) throw new Error('Ação restrita ao suporte Doke.');
    return true;
  }

  function scopeWalletOptions(options) {
    options = options || {};
    var actor = getCurrentUser() || {};
    if (options.currentUser === false && !canAccessAdmin(actor)) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Object.assign({}, options, { currentUser: true, ownerId: actor.id || actor.providerProfileId || '' });
    }
    return Object.assign({}, options, { actorId: actor.id || '', actorRole: actor.role || 'guest' });
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
      receivablesSchedule: { next: null, items: [], scheduledNet: 0, releasedNet: 0, totalNet: 0, pendingCount: 0, releasedCount: 0, count: 0 },
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeArrayPayload(payload, keys) {
    if (Array.isArray(payload)) return payload.map(clone);
    keys = Array.isArray(keys) ? keys : [];
    for (var index = 0; index < keys.length; index += 1) {
      var key = keys[index];
      if (payload && Array.isArray(payload[key])) return payload[key].map(clone);
    }
    if (payload && Array.isArray(payload.items)) return payload.items.map(clone);
    return [];
  }

  function normalizeTransactionFromProvider(transaction) {
    var repository = getRepository();
    if (repository && typeof repository.normalizeTransaction === 'function') return repository.normalizeTransaction(transaction || {});
    return clone(transaction || {});
  }

  function normalizeTransactionsFromProvider(payload) {
    return normalizeArrayPayload(payload, ['transactions', 'walletTransactions']).map(normalizeTransactionFromProvider);
  }

  function normalizeBankAccountFromProvider(payload) {
    var account = payload && (payload.bankAccount || payload.account || payload.item) || payload || null;
    if (Array.isArray(account)) account = account[0] || null;
    if (!account) return null;
    var repository = getRepository();
    if (repository && typeof repository.normalizeBankAccount === 'function') return repository.normalizeBankAccount(account);
    return clone(account);
  }

  function normalizeWalletFromProvider(payload) {
    var source = payload && (payload.wallet || payload.summary) || payload || {};
    var balances = source.balances || source.balance || {};
    var dashboard = source.monthlyDashboard || source.dashboard || {};
    var wallet = createEmptyWallet();
    wallet.availableBalance = roundCurrency(source.availableBalance || source.available || balances.available || balances.availableBalance || 0);
    wallet.pendingBalance = roundCurrency(source.pendingBalance || source.heldBalance || source.pending || balances.pending || balances.held || 0);
    wallet.monthlyIncome = roundCurrency(source.monthlyIncome || dashboard.netIncome || source.netIncome || 0);
    wallet.withdrawals = roundCurrency(source.withdrawals || dashboard.withdrawals || 0);
    wallet.fees = roundCurrency(source.fees || dashboard.fees || 0);
    wallet.monthlyDashboard = dashboard && Object.keys(dashboard).length ? dashboard : null;
    wallet.localTransactions = normalizeTransactionsFromProvider(source.transactions || source.walletTransactions || payload);
    wallet.transactions = wallet.localTransactions;
    wallet.receivablesSchedule = source.receivablesSchedule || source.schedule || source.receivables || wallet.receivablesSchedule;
    wallet.bankAccount = normalizeBankAccountFromProvider(source.bankAccount || source.account || null);
    wallet.updatedAt = source.updatedAt || new Date().toISOString();
    return wallet;
  }

  function walletBoundaryList(resourceName, filters, keys) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.list !== 'function') return Promise.reject(new Error('Wallet API boundary indisponível.'));
    return boundary.list(resourceName, filters || {}).then(function (payload) {
      return keys ? normalizeArrayPayload(payload, keys) : payload;
    });
  }

  function walletBoundaryCreate(resourceName, payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.create !== 'function') return Promise.reject(new Error('Wallet API boundary indisponível.'));
    return boundary.create(resourceName, payload || {});
  }

  function walletBoundaryAction(resourceName, actionName, payload) {
    var boundary = getRepositoryBoundary();
    if (!boundary || typeof boundary.action !== 'function') return Promise.reject(new Error('Wallet API boundary indisponível.'));
    return boundary.action(resourceName, actionName, payload || {});
  }

  function getBankAccount(options) {
    options = options || {};
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletBankAccount', scopeWalletOptions(options)).then(normalizeBankAccountFromProvider);
    }

    var repository = getRepository();
    if (!repository || typeof repository.getBankAccount !== 'function') return Promise.resolve(null);
    return repository.getBankAccount({
      currentUser: options.currentUser !== false,
      ownerId: options.ownerId || options.professionalId || options.userId || ''
    });
  }

  function saveBankAccount(payload) {
    payload = payload || {};
    var user = getCurrentUser() || {};
    var accountPayload = {
      ownerId: normalizeProfessionalId(payload.ownerId || payload.professionalId || payload.userId || user.id || ''),
      bankName: normalizeText(payload.bankName || ''),
      holderName: normalizeText(payload.holderName || ''),
      accountType: normalizeText(payload.accountType || 'Conta corrente'),
      agency: normalizeText(payload.agency || ''),
      accountNumber: normalizeText(payload.accountNumber || ''),
      pixKey: normalizeText(payload.pixKey || ''),
      status: 'verified',
      nextPayout: 'Repasse automático após liberação'
    };

    assertWalletOwner(accountPayload.ownerId, 'save_bank_account', user);

    if (shouldUseWalletApi()) {
      return walletBoundaryAction('walletSummary', 'saveBankAccount', Object.assign({}, accountPayload, { actorId: user.id || '', actorRole: user.role || 'guest' })).then(normalizeBankAccountFromProvider);
    }

    var repository = getRepository();
    if (!repository || typeof repository.saveBankAccount !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.saveBankAccount(accountPayload);
  }

  function getWallet(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletSummary', options).then(normalizeWalletFromProvider);
    }

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
    var receivablesSchedule = repository && typeof repository.getReceivablesSchedule === 'function'
      ? repository.getReceivablesSchedule(userScope)
      : { next: null, items: [], scheduledNet: 0, releasedNet: 0, totalNet: 0, pendingCount: 0, releasedCount: 0, count: 0 };

    var wallet = createEmptyWallet();
    wallet.availableBalance = roundCurrency(localSummary.available || 0);
    wallet.pendingBalance = roundCurrency(localSummary.pending || 0);
    wallet.monthlyIncome = roundCurrency(monthlyDashboard.netIncome || 0);
    wallet.withdrawals = roundCurrency(monthlyDashboard.withdrawals || 0);
    wallet.fees = roundCurrency(monthlyDashboard.fees || 0);
    wallet.monthlyDashboard = monthlyDashboard;
    wallet.localTransactions = localTransactions;
    wallet.transactions = localTransactions;
    wallet.receivablesSchedule = receivablesSchedule;
    return getBankAccount({ currentUser: options.currentUser !== false }).then(function (account) {
      wallet.bankAccount = account || null;
      return wallet;
    });
  }

  function listTransactions(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletTransactions', options).then(normalizeTransactionsFromProvider);
    }

    var repository = getRepository();
    var transactions = repository && typeof repository.listTransactions === 'function'
      ? repository.listTransactions(options)
      : [];
    return Promise.resolve(Array.isArray(transactions) ? transactions : []);
  }



  function listAuditEvents(options) {
    options = scopeWalletOptions(options || {});
    var actor = getCurrentUser() || {};
    if (options.currentUser === false) assertAdminAction('view_audit_events', { resource: 'auditEvents' }, actor);
    if (shouldUseWalletApi()) {
      return walletBoundaryList('auditEvents', options, ['auditEvents', 'events']);
    }

    var repository = getRepository();
    var events = repository && typeof repository.listAuditEvents === 'function'
      ? repository.listAuditEvents(options)
      : [];
    return Promise.resolve(Array.isArray(events) ? events : []);
  }
  function getMonthlyDashboard(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletMonthlyDashboard', scopeWalletOptions(options)).then(function (payload) {
        return payload && (payload.dashboard || payload.monthlyDashboard || payload) || null;
      });
    }

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

  function getMonthlyHistory(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletMonthlyHistory', scopeWalletOptions(options), ['history', 'items', 'months']);
    }

    var repository = getRepository();
    var history = repository && typeof repository.getMonthlyHistory === 'function'
      ? repository.getMonthlyHistory(options)
      : [];
    return Promise.resolve(Array.isArray(history) ? history : []);
  }

  function getReceivablesSchedule(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletReceivablesSchedule', scopeWalletOptions(options)).then(function (payload) {
        return payload && (payload.receivablesSchedule || payload.schedule || payload) || null;
      });
    }

    var repository = getRepository();
    var schedule = repository && typeof repository.getReceivablesSchedule === 'function'
      ? repository.getReceivablesSchedule(options)
      : null;
    return Promise.resolve(schedule || { next: null, items: [], scheduledNet: 0, releasedNet: 0, totalNet: 0, pendingCount: 0, releasedCount: 0, count: 0 });
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
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
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
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
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
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawCompletedNotification]', error);
      return null;
    });
  }


  function createWithdrawDeclinedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create({
      type: 'wallet_withdraw_declined',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Suporte Doke',
      eventKey: ['wallet_withdraw_declined', transaction.id || '', userId].filter(Boolean).join(':'),
      title: 'Saque recusado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi recusado no mock de suporte. ' + (transaction.adminReason || 'Revise os dados bancários e solicite novamente.'),
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawDeclinedNotification]', error);
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
    var receivable = buildReceivablePayload(payload || {}, 'held');
    delete receivable.context;

    if (shouldUseWalletApi()) {
      return walletBoundaryCreate('receivables', receivable);
    }

    var repository = getRepository();
    if (!repository || typeof repository.registerReceivable !== 'function') return Promise.resolve(null);
    return repository.registerReceivable(receivable);
  }

  function registerReceivableFromOrder(payload) {
    var receivable = buildReceivablePayload(payload || {}, 'available');
    var context = receivable.context || {};
    delete receivable.context;

    if (shouldUseWalletApi()) {
      return walletBoundaryCreate('receivables', receivable);
    }

    var repository = getRepository();
    if (!repository || typeof repository.registerReceivable !== 'function') return Promise.resolve(null);
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


  function listDisputes(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('disputes', scopeWalletOptions(options), ['disputes', 'items']);
    }

    var repository = getRepository();
    var disputes = repository && typeof repository.listDisputes === 'function'
      ? repository.listDisputes(options)
      : [];
    return Promise.resolve(Array.isArray(disputes) ? disputes : []);
  }

  function openDispute(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    if (actor.role && actor.role !== 'client' && !canAccessAdmin(actor)) {
      auditSecurity('open_dispute_denied', 'denied', { actor: actor, resourceId: payload.orderId || payload.transactionId || '', reason: 'client_or_support_required' });
      return Promise.reject(new Error('Use uma conta de cliente para abrir contestação.'));
    }
    if (shouldUseWalletApi()) return walletBoundaryCreate('disputes', Object.assign({}, payload, { actorId: actor.id || '', actorRole: actor.role || 'guest' }));

    var repository = getRepository();
    if (!repository || typeof repository.openDispute !== 'function') return Promise.reject(new Error('Disputa indisponível.'));
    return repository.openDispute(payload);
  }


  function respondDispute(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    if (actor.role && actor.role !== 'professional' && !canAccessAdmin(actor)) {
      auditSecurity('respond_dispute_denied', 'denied', { actor: actor, resourceId: payload.disputeId || payload.transactionId || '', reason: 'professional_or_support_required' });
      return Promise.reject(new Error('Use uma conta profissional para responder esta contestação.'));
    }
    if (shouldUseWalletApi()) {
      return walletBoundaryAction('disputes', 'respond', Object.assign({}, payload, {
        id: payload.disputeId || payload.id || '',
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    var repository = getRepository();
    if (!repository || typeof repository.respondDispute !== 'function') return Promise.reject(new Error('Disputa indisponível.'));
    return repository.respondDispute(payload);
  }

  function resolveDispute(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    assertAdminAction('resolve_dispute', Object.assign({ resource: 'disputes' }, payload), actor);
    if (shouldUseWalletApi()) {
      var resolution = normalizeText(payload.resolution || payload.action || '');
      var actionName = resolution === 'client_refund' || resolution === 'refund' || resolution === 'refunded' ? 'refund' : 'release';
      return walletBoundaryAction('disputes', actionName, Object.assign({}, payload, {
        id: payload.disputeId || payload.id || '',
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    var repository = getRepository();
    if (!repository || typeof repository.resolveDispute !== 'function') return Promise.reject(new Error('Disputa indisponível.'));
    return repository.resolveDispute(payload);
  }

  function requestWithdraw(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    var withdrawPayload = {
      amount: payload.amount,
      ownerId: normalizeProfessionalId(payload.ownerId || payload.professionalId || payload.userId || actor.id || ''),
      bankAccountId: payload.bankAccountId || '',
      actorId: actor.id || '',
      actorRole: actor.role || 'guest'
    };
    assertWalletOwner(withdrawPayload.ownerId, 'request_withdraw', actor);

    if (shouldUseWalletApi()) return walletBoundaryCreate('withdrawals', withdrawPayload);

    var repository = getRepository();
    if (!repository || typeof repository.requestWithdraw !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.requestWithdraw(withdrawPayload).then(function (result) {
      if (!result || !result.transaction) return result;
      return createWithdrawNotification(result.transaction).then(function () { return result; });
    });
  }


  function completeWithdraw(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    assertAdminAction('resolve_withdrawal', Object.assign({ resource: 'withdrawals' }, payload), actor);
    var withdrawPayload = {
      id: payload.transactionId || payload.id || '',
      transactionId: payload.transactionId || payload.id || '',
      ownerId: payload.ownerId || payload.professionalId || payload.userId || '',
      actorId: actor.id || '',
      actorRole: actor.role || 'guest'
    };

    if (shouldUseWalletApi()) return walletBoundaryAction('withdrawals', 'approve', withdrawPayload);

    var repository = getRepository();
    if (!repository || typeof repository.completeWithdraw !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.completeWithdraw({
      transactionId: withdrawPayload.transactionId,
      ownerId: withdrawPayload.ownerId
    }).then(function (result) {
      if (!result || !result.transaction || !result.updated) return result;
      return createWithdrawCompletedNotification(result.transaction).then(function () { return result; });
    });
  }


  function resolveWithdraw(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    assertAdminAction('resolve_withdrawal', Object.assign({ resource: 'withdrawals' }, payload), actor);
    if (shouldUseWalletApi()) {
      var actionName = normalizeText(payload.action || payload.status) === 'declined' ? 'decline' : 'approve';
      return walletBoundaryAction('withdrawals', actionName, Object.assign({}, payload, {
        id: payload.transactionId || payload.id || '',
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    var repository = getRepository();
    if (!repository || typeof repository.resolveWithdraw !== 'function') return Promise.reject(new Error('Carteira indisponível.'));
    return repository.resolveWithdraw(payload).then(function (result) {
      if (!result || !result.transaction || !result.updated) return result;
      var notifier = result.action === 'declined' ? createWithdrawDeclinedNotification : createWithdrawCompletedNotification;
      return notifier(result.transaction).then(function () { return result; });
    });
  }

  services.wallet = Object.freeze({
    provider: getWalletProviderStatus().activeProvider,
    getWalletProviderStatus: getWalletProviderStatus,
    shouldUseWalletApi: shouldUseWalletApi,
    getWallet: getWallet,
    listTransactions: listTransactions,
    listAuditEvents: listAuditEvents,
    getMonthlyDashboard: getMonthlyDashboard,
    getMonthlyHistory: getMonthlyHistory,
    getReceivablesSchedule: getReceivablesSchedule,
    getBankAccount: getBankAccount,
    saveBankAccount: saveBankAccount,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    resolveWithdraw: resolveWithdraw,
    listDisputes: listDisputes,
    openDispute: openDispute,
    respondDispute: respondDispute,
    resolveDispute: resolveDispute,
    registerHeldReceivableFromPayment: registerHeldReceivableFromPayment,
    registerReceivableFromOrder: registerReceivableFromOrder
  });
})();
