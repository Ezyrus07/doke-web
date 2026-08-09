/* Doke Wallet Service
   Responsibility: wallet business rules for local/mock receivables and balances. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';
  var DOKE_FEE_RATE = 0.05;
  var disputeTasks = Object.create(null);
  var REPOSITORY_CACHE_TTL_MS = 45000;
  var repositoryLoadCache = { key: '', loadedAt: 0, promise: null };

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

  function getRepositoryCacheKey(options) {
    options = options || {};
    var user = getCurrentUser() || {};
    return [
      normalizeText(user.id || ''),
      options.currentUser === false ? 'all' : 'current',
      normalizeText(options.ownerId || options.professionalId || options.userId || '')
    ].join(':');
  }

  function invalidateRepositoryCache() {
    repositoryLoadCache.key = '';
    repositoryLoadCache.loadedAt = 0;
    repositoryLoadCache.promise = null;
  }

  function ensureRepositoryLoaded(options) {
    options = options || {};
    var repository = getRepository();
    if (!repository || typeof repository.load !== 'function') return Promise.resolve(repository);

    var cacheKey = getRepositoryCacheKey(options);
    var now = Date.now();
    var cacheIsFresh = repositoryLoadCache.key === cacheKey
      && repositoryLoadCache.loadedAt > 0
      && (now - repositoryLoadCache.loadedAt) < REPOSITORY_CACHE_TTL_MS;

    if (options.fresh !== true && cacheIsFresh) return Promise.resolve(repository);
    if (options.fresh !== true && repositoryLoadCache.promise && repositoryLoadCache.key === cacheKey) {
      return repositoryLoadCache.promise;
    }

    repositoryLoadCache.key = cacheKey;
    repositoryLoadCache.promise = Promise.resolve(repository.load(options)).then(function () {
      repositoryLoadCache.loadedAt = Date.now();
      repositoryLoadCache.promise = null;
      return repository;
    }).catch(function (error) {
      invalidateRepositoryCache();
      throw error;
    });

    return repositoryLoadCache.promise;
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
    var repository = getRepository();
    var repositoryStatus = repository && typeof repository.getProviderStatus === 'function'
      ? repository.getProviderStatus()
      : null;
    var apiReady = status ? status.apiReady === true : false;
    var apiActive = Boolean(status && status.activeProvider === 'api' && apiReady);
    var activeProvider = apiActive
      ? 'api'
      : repositoryStatus && repositoryStatus.provider || 'mock';

    return Object.freeze({
      domain: 'wallet',
      activeProvider: activeProvider,
      requestedProvider: status && status.requestedProvider || activeProvider,
      apiReady: apiReady,
      walletApiActive: apiActive,
      fallbackActive: Boolean(repositoryStatus && repositoryStatus.fallbackActive),
      localFinancialSimulation: Boolean(repositoryStatus && repositoryStatus.localFinancialSimulation),
      fallbackProvider: repository ? 'local-mock' : 'empty-local-mock'
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

    return ensureRepositoryLoaded(options).then(function (repository) {
      if (!repository || typeof repository.getBankAccount !== 'function') return null;
      return repository.getBankAccount({
        currentUser: options.currentUser !== false,
        ownerId: options.ownerId || options.professionalId || options.userId || ''
      });
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
    return repository.saveBankAccount(accountPayload).then(function (result) { invalidateRepositoryCache(); return result; });
  }

  function getWallet(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletSummary', options).then(normalizeWalletFromProvider);
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
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
      var account = repository && typeof repository.getBankAccount === 'function'
        ? repository.getBankAccount(userScope)
        : null;
      return Promise.resolve(account).then(function (resolvedAccount) {
        wallet.bankAccount = resolvedAccount || null;
        return wallet;
      });
    });
  }

  function listTransactions(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletTransactions', options).then(normalizeTransactionsFromProvider);
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var transactions = repository && typeof repository.listTransactions === 'function'
        ? repository.listTransactions(options)
        : [];
      return Array.isArray(transactions) ? transactions : [];
    });
  }

  function listAuditEvents(options) {
    options = scopeWalletOptions(options || {});
    var actor = getCurrentUser() || {};
    if (options.currentUser === false) assertAdminAction('view_audit_events', { resource: 'auditEvents' }, actor);
    if (shouldUseWalletApi()) {
      return walletBoundaryList('auditEvents', options, ['auditEvents', 'events']);
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var events = repository && typeof repository.listAuditEvents === 'function'
        ? repository.listAuditEvents(options)
        : [];
      return Array.isArray(events) ? events : [];
    });
  }

  function getMonthlyDashboard(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletMonthlyDashboard', scopeWalletOptions(options)).then(function (payload) {
        return payload && (payload.dashboard || payload.monthlyDashboard || payload) || null;
      });
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var dashboard = repository && typeof repository.getMonthlyDashboard === 'function'
        ? repository.getMonthlyDashboard(options)
        : null;
      return dashboard || {
        period: 'current-month', periodLabel: 'Mês atual', grossIncome: 0, netIncome: 0,
        withdrawals: 0, fees: 0, availableBalance: 0, heldBalance: 0,
        processingWithdrawals: 0, paidOrders: 0, withdrawalsCount: 0, ticketAverage: 0,
        largestMovement: { amount: 0, title: 'Sem movimentações' },
        chartSeries: { labels: ['—'], grossIncome: [0], netIncome: [0], withdrawals: [0], fees: [0], paidOrders: [0] }
      };
    });
  }

  function getMonthlyHistory(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletMonthlyHistory', scopeWalletOptions(options), ['history', 'items', 'months']);
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var history = repository && typeof repository.getMonthlyHistory === 'function'
        ? repository.getMonthlyHistory(options)
        : [];
      return Array.isArray(history) ? history : [];
    });
  }

  function getReceivablesSchedule(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('walletReceivablesSchedule', scopeWalletOptions(options)).then(function (payload) {
        return payload && (payload.receivablesSchedule || payload.schedule || payload) || null;
      });
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var schedule = repository && typeof repository.getReceivablesSchedule === 'function'
        ? repository.getReceivablesSchedule(options)
        : null;
      return schedule || { next: null, items: [], scheduledNet: 0, releasedNet: 0, totalNet: 0, pendingCount: 0, releasedCount: 0, count: 0 };
    });
  }

  function localFinancialNotificationEnvelope(eventType, transaction, recipientId) {
    transaction = transaction || {};
    var normalizedType = normalizeText(eventType).toLowerCase();
    var normalizedRecipient = normalizeText(recipientId || transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID);
    var entityId = normalizeText(transaction.id || transaction.paymentId || transaction.orderId || transaction.messageId || '');
    var eventId = [normalizedType, entityId, normalizedRecipient].filter(Boolean).join(':');
    return {
      eventId: eventId,
      eventType: normalizedType,
      eventCategory: 'PAYMENTS',
      sourceDomain: 'PAYMENTS',
      sourceAuthority: 'CANONICAL_LOCAL',
      dedupeKey: eventId,
      eventKey: eventId
    };
  }

  function createWalletNotification(transaction, payload) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    payload = payload || {};
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_receivable_available',
      category: 'wallet',
      userId: userId,
      actorId: transaction.clientId || '',
      actorName: payload.clientName || 'Cliente Doke',
      orderId: transaction.orderId || '',
      conversationId: transaction.conversationId || '',
      messageId: transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      title: 'Saldo disponível',
      body: 'O valor líquido de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' do pedido "' + (transaction.title || 'Pedido') + '" foi liberado na sua carteira.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_receivable_available', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createNotification]', error);
      return null;
    });
  }

  function createWithdrawNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_requested',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      title: 'Saque solicitado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi solicitado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_requested', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawNotification]', error);
      return null;
    });
  }


  function createWithdrawCompletedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_completed',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Carteira Doke',
      title: 'Saque concluído',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi enviado para a conta cadastrada.',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_completed', transaction, userId))).catch(function (error) {
      console.warn('[DokeWallet:createWithdrawCompletedNotification]', error);
      return null;
    });
  }


  function createWithdrawDeclinedNotification(transaction) {
    var notifications = getNotificationsService();
    if (!notifications || typeof notifications.create !== 'function' || !transaction) return Promise.resolve(null);
    var userId = transaction.professionalId || transaction.userId || DEMO_PROFESSIONAL_ID;
    return notifications.create(Object.assign({
      type: 'wallet_withdraw_declined',
      category: 'wallet',
      userId: userId,
      actorId: userId,
      actorName: 'Suporte Doke',
      title: 'Saque recusado',
      body: 'Seu saque de ' + formatCurrency(transaction.netAmount || transaction.amount || 0) + ' foi recusado no mock de suporte. ' + (transaction.adminReason || 'Revise os dados bancários e solicite novamente.'),
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      actionLabel: 'Ver comprovante',
      read: false
    }, localFinancialNotificationEnvelope('wallet_withdraw_declined', transaction, userId))).catch(function (error) {
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
      paymentId: normalizeText(payload.paymentId || order.paymentId || charge.paymentId || ''),
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

  function releaseHeldReceivableFromCompletion(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    var order = payload.order || {};
    if (!actor.id || actor.role !== 'client') {
      return Promise.reject(new Error('Use a conta do cliente para liberar o pagamento.'));
    }
    if (String(order.clientId || payload.clientId || '') !== String(actor.id)) {
      return Promise.reject(new Error('Somente o cliente vinculado pode liberar este recebível.'));
    }

    var releasePayload = {
      id: payload.transactionId || payload.walletTransactionId || '',
      transactionId: payload.transactionId || payload.walletTransactionId || '',
      walletTransactionId: payload.transactionId || payload.walletTransactionId || '',
      paymentId: payload.paymentId || order.paymentId || '',
      orderId: payload.orderId || order.id || '',
      messageId: payload.messageId || payload.chargeMessageId || order.chargeMessageId || '',
      releasedAt: payload.releasedAt || new Date().toISOString(),
      actorId: actor.id,
      actorRole: actor.role
    };

    if (shouldUseWalletApi()) return walletBoundaryAction('receivables', 'release', releasePayload);
    var repository = getRepository();
    if (!repository || typeof repository.releaseHeldReceivable !== 'function') {
      return Promise.reject(new Error('Comando de liberação do recebível indisponível.'));
    }
    return repository.releaseHeldReceivable(releasePayload).then(function (result) {
      if (!result || !result.transaction) return result;
      return createWalletNotification(result.transaction, {
        clientName: order.clientName || payload.clientName || 'Cliente Doke'
      }).then(function (notification) {
        return Object.assign({}, result, { notification: notification });
      });
    });
  }

  function getOrdersRepository() {
    return Doke.repositories && Doke.repositories.orders;
  }

  function getPaymentsRepository() {
    return Doke.repositories && Doke.repositories.payments;
  }

  function getMessagesRepository() {
    return Doke.repositories && Doke.repositories.messages;
  }

  function getOrderForDispute(orderId) {
    var repository = getOrdersRepository();
    if (!repository || typeof repository.getById !== 'function') return Promise.reject(new Error('Pedido indisponível para contestação.'));
    return repository.getById(orderId).then(function (order) {
      if (!order) throw new Error('Pedido não encontrado.');
      return order;
    });
  }

  function getPaymentForDispute(orderId) {
    var repository = getPaymentsRepository();
    if (!repository || typeof repository.getByOrderId !== 'function') return Promise.reject(new Error('Pagamento indisponível para contestação.'));
    return repository.getByOrderId(orderId).then(function (payment) {
      if (!payment) throw new Error('Pagamento em garantia não encontrado.');
      return payment;
    });
  }

  function getWalletTransactionForDispute(payload, order, payment) {
    var repository = getRepository();
    if (!repository || typeof repository.readWallet !== 'function') throw new Error('Recebível indisponível para contestação.');
    var wallet = repository.readWallet() || {};
    var transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
    var requestedId = normalizeText(payload.transactionId || payload.walletTransactionId || order.walletTransactionId || payment.walletTransactionId || '');
    var transaction = transactions.find(function (item) {
      if (!item || item.type !== 'receivable') return false;
      if (requestedId && String(item.id || '') !== String(requestedId)) return false;
      if (item.orderId && String(item.orderId) !== String(order.id || '')) return false;
      if (item.paymentId && String(item.paymentId) !== String(payment.id || '')) return false;
      var matchesOrder = Boolean(item.orderId && String(item.orderId) === String(order.id || ''));
      var matchesPayment = Boolean(item.paymentId && String(item.paymentId) === String(payment.id || ''));
      return matchesOrder || matchesPayment;
    }) || null;
    if (!transaction) throw new Error('Recebível em garantia não encontrado.');
    return transaction;
  }

  function isActiveDisputeStatus(value) {
    return ['contestacao_aberta', 'em_analise', 'contestacao', 'analise', 'open', 'disputed'].indexOf(normalizeText(value).toLowerCase()) !== -1;
  }

  function isProfessionalForOrder(actor, order) {
    if (!actor || actor.role !== 'professional' || !order) return false;
    if (String(order.professionalId || order.providerId || '') === String(actor.id || '')) return true;
    return String(actor.id || '') === DEMO_PROFESSIONAL_ID && Boolean(order.id);
  }

  function findDisputeForOrder(orderId, options) {
    options = options || {};
    var repository = getRepository();
    if (!repository || typeof repository.listDisputes !== 'function') return null;
    var disputes = repository.listDisputes({ orderId: orderId, currentUser: false }) || [];
    if (options.activeOnly) {
      return disputes.find(function (dispute) { return isActiveDisputeStatus(dispute && dispute.status); }) || null;
    }
    return disputes[0] || null;
  }

  function savePaymentDisputeProjection(payment, metadata) {
    var repository = getPaymentsRepository();
    if (!repository || typeof repository.save !== 'function') return Promise.reject(new Error('Pagamento indisponível para sincronização da contestação.'));
    return repository.save(Object.assign({}, payment, metadata || {})).then(function (result) { return result.payment; });
  }

  function saveOrderDisputeProjection(order, dispute, phase, resolution, actor) {
    var repository = getOrdersRepository();
    if (!repository || typeof repository.save !== 'function') return Promise.reject(new Error('Pedido indisponível para sincronização da contestação.'));
    var now = new Date().toISOString();
    var metadata = {
      disputeId: dispute.id || order.disputeId || '',
      disputeStatus: dispute.status || order.disputeStatus || '',
      disputeReason: dispute.reason || order.disputeReason || '',
      disputeReasonCode: dispute.reasonCode || order.disputeReasonCode || '',
      disputeResolution: dispute.resolution || resolution || order.disputeResolution || '',
      completionBlockedByDispute: phase !== 'resolved',
      updatedAt: now
    };

    if (phase === 'opened') {
      Object.assign(metadata, {
        disputeOpenedAt: dispute.createdAt || now,
        disputeOpenedBy: dispute.clientId || actor.id || '',
        detailFlow: 'O cliente abriu uma contestação. O pagamento permanece em garantia até a análise.',
        nextAction: 'Acompanhar contestação'
      });
    } else if (phase === 'response') {
      Object.assign(metadata, {
        disputeResponseText: dispute.responseText || '',
        disputeResponseAt: dispute.responseAt || now,
        disputeRespondedBy: dispute.respondedBy || actor.id || '',
        detailFlow: 'O profissional respondeu à contestação. O pagamento continua congelado durante a análise.',
        nextAction: 'Aguardar análise'
      });
    } else if (resolution === 'cliente') {
      Object.assign(metadata, {
        status: 'cancelled',
        statusLabel: 'Reembolsado',
        paymentStatus: 'refunded',
        escrowStatus: 'refunded',
        completionStatus: 'cancelled',
        completionBlockedByDispute: false,
        cancellationType: 'dispute_refund',
        refundedAt: dispute.resolvedAt || now,
        refundedBy: actor.id || '',
        detailFlow: 'Contestação encerrada com reembolso ao cliente.',
        nextAction: 'Pedido encerrado',
        declinedAt: order.declinedAt || dispute.resolvedAt || now
      });
    } else if (resolution === 'profissional') {
      Object.assign(metadata, {
        status: 'completed',
        statusLabel: 'Concluído',
        paymentStatus: 'released',
        escrowStatus: 'released',
        completionStatus: 'confirmed',
        completionBlockedByDispute: false,
        completionConfirmedAt: order.completionConfirmedAt || dispute.resolvedAt || now,
        completionConfirmedBy: actor.id || '',
        paymentReleasedAt: order.paymentReleasedAt || dispute.resolvedAt || now,
        paymentReleasedBy: actor.id || '',
        detailFlow: 'Contestação encerrada com liberação do pagamento ao profissional.',
        nextAction: 'Avaliar atendimento',
        completedAt: order.completedAt || dispute.resolvedAt || now
      });
    }

    return repository.save(Object.assign({}, order, metadata));
  }

  function syncConversationDisputeProjection(order, dispute, phase, resolution) {
    var repository = getMessagesRepository();
    if (!repository || typeof repository.readLocal !== 'function' || typeof repository.save !== 'function') return Promise.resolve(null);
    var conversations = repository.readLocal() || [];
    var conversation = conversations.find(function (item) {
      return String(item.orderId || item.order && item.order.id || '') === String(order.id || '');
    }) || null;
    if (!conversation) return Promise.resolve(null);

    conversation.status = order.status || conversation.status || 'in_progress';
    conversation.statusLabel = order.statusLabel || conversation.statusLabel || '';
    conversation.disputeStatus = dispute.status || '';
    conversation.order = Object.assign({}, conversation.order || {}, order);
    var messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    var charge = messages.find(function (message) {
      return message && message.type === 'charge' && (String(message.id || '') === String(order.chargeMessageId || '') || String(message.paymentId || '') === String(order.paymentId || ''));
    });
    if (charge) {
      charge.disputeId = dispute.id || '';
      charge.disputeStatus = dispute.status || '';
      charge.updatedAt = dispute.updatedAt || dispute.resolvedAt || new Date().toISOString();
      if (phase === 'opened' || phase === 'response') charge.chargeStatus = 'disputed';
      if (resolution === 'cliente') {
        charge.chargeStatus = 'refunded';
        charge.paymentStatus = 'refunded';
        charge.escrowStatus = 'refunded';
        charge.refunded = true;
        charge.refundedAt = dispute.resolvedAt || charge.updatedAt;
      } else if (resolution === 'profissional') {
        charge.chargeStatus = 'completed';
        charge.paymentStatus = 'released';
        charge.escrowStatus = 'released';
        charge.completed = true;
        charge.releasedAt = dispute.resolvedAt || charge.updatedAt;
      }
    }

    if (phase === 'opened') {
      conversation.lastSeen = 'Em contestação';
      conversation.lastMessage = 'O cliente abriu uma contestação e o pagamento ficou congelado.';
    } else if (phase === 'response') {
      conversation.lastSeen = 'Em análise';
      conversation.lastMessage = 'O profissional respondeu à contestação.';
    } else if (resolution === 'cliente') {
      conversation.lastSeen = 'Cliente reembolsado';
      conversation.lastMessage = 'Contestação encerrada com reembolso ao cliente.';
    } else if (resolution === 'profissional') {
      conversation.lastSeen = 'Repasse liberado';
      conversation.lastMessage = 'Contestação encerrada com repasse ao profissional.';
    }
    return repository.save(conversation);
  }

  function notifyDisputeLifecycle(phase, order, payment, dispute, actor, resolution) {
    var notifications = getNotificationsService();
    if (!notifications) return Promise.resolve([]);
    var method = phase === 'opened'
      ? 'createDisputeOpened'
      : phase === 'response'
        ? 'createDisputeResponded'
        : 'createDisputeResolved';
    if (typeof notifications[method] !== 'function') return Promise.resolve([]);
    return notifications[method](order, payment, dispute, { actor: actor, resolution: resolution, sourceAuthority: 'CANONICAL_LOCAL' });
  }

  function runDisputeTask(key, executor) {
    if (disputeTasks[key]) return disputeTasks[key];
    var task = Promise.resolve().then(executor);
    disputeTasks[key] = task.then(function (result) {
      delete disputeTasks[key];
      return result;
    }, function (error) {
      delete disputeTasks[key];
      throw error;
    });
    return disputeTasks[key];
  }


  function listDisputes(options) {
    options = scopeWalletOptions(options || {});
    if (shouldUseWalletApi()) {
      return walletBoundaryList('disputes', scopeWalletOptions(options), ['disputes', 'items']);
    }

    return ensureRepositoryLoaded(options).then(function (repository) {
      var disputes = repository && typeof repository.listDisputes === 'function'
        ? repository.listDisputes(options)
        : [];
      return Array.isArray(disputes) ? disputes : [];
    });
  }

  function openDispute(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    var orderId = normalizeText(payload.orderId || '');
    var reason = normalizeText(payload.reason || '');
    if (!orderId) return Promise.reject(new Error('Pedido não identificado para contestação.'));
    if (!reason) return Promise.reject(new Error('Descreva o motivo da contestação.'));
    if (!actor.id || actor.role !== 'client') {
      auditSecurity('open_dispute_denied', 'denied', { actor: actor, resourceId: payload.orderId || payload.transactionId || '', reason: 'client_or_support_required' });
      return Promise.reject(new Error('Use uma conta de cliente para abrir contestação.'));
    }
    if (shouldUseWalletApi()) return walletBoundaryCreate('disputes', Object.assign({}, payload, { actorId: actor.id || '', actorRole: actor.role || 'guest' }));

    var repository = getRepository();
    if (!repository || typeof repository.openDispute !== 'function') return Promise.reject(new Error('Disputa indisponível.'));
    return runDisputeTask('open:' + orderId, function () {
      return Promise.all([getOrderForDispute(orderId), getPaymentForDispute(orderId)]).then(function (values) {
        var order = values[0];
        var payment = values[1];
        if (String(order.clientId || '') !== String(actor.id)) throw new Error('Somente o cliente vinculado pode abrir esta contestação.');
        if (normalizeText(order.status).toLowerCase() !== 'in_progress') throw new Error('A contestação só pode ser aberta durante a execução do pedido.');
        if (normalizeText(order.paymentStatus).toLowerCase() !== 'held' || normalizeText(payment.status).toLowerCase() !== 'held') {
          throw new Error('A contestação exige um pagamento mantido em garantia.');
        }
        if (normalizeText(order.paymentId || '') !== normalizeText(payment.id || '')) throw new Error('O pagamento não corresponde ao pedido.');
        if (normalizeText(order.completionStatus).toLowerCase() === 'confirmed' || normalizeText(order.paymentStatus).toLowerCase() === 'released') {
          throw new Error('Pedidos concluídos não aceitam contestação comum.');
        }
        var existing = findDisputeForOrder(orderId, { activeOnly: true });
        var transaction = getWalletTransactionForDispute(payload, order, payment);
        if (normalizeText(transaction.status).toLowerCase() !== 'held') throw new Error('O recebível não está congelado para contestação.');
        return repository.openDispute(Object.assign({}, payload, {
          orderId: orderId,
          transactionId: transaction.id || '',
          paymentId: payment.id || '',
          messageId: payload.messageId || order.chargeMessageId || payment.messageId || '',
          conversationId: payload.conversationId || payment.conversationId || '',
          professionalId: order.professionalId || order.providerId || payment.professionalId || '',
          clientId: actor.id,
          openedBy: 'client',
          deferSideEffects: true
        })).then(function (walletResult) {
          var dispute = walletResult.dispute || existing;
          return Promise.all([
            saveOrderDisputeProjection(order, dispute, 'opened', '', actor),
            savePaymentDisputeProjection(payment, {
              status: 'held',
              escrowStatus: 'held',
              disputeId: dispute.id || '',
              disputeStatus: dispute.status || 'contestacao_aberta',
              releaseStatus: 'blocked_by_dispute',
              updatedAt: dispute.updatedAt || dispute.createdAt || new Date().toISOString()
            })
          ]).then(function (projections) {
            return syncConversationDisputeProjection(projections[0], dispute, 'opened', '').then(function (conversation) {
              return notifyDisputeLifecycle('opened', projections[0], projections[1], dispute, actor, '').then(function (notifications) {
                var result = Object.assign({}, walletResult, {
                  order: projections[0],
                  payment: projections[1],
                  conversation: conversation,
                  notifications: notifications
                });
                document.dispatchEvent(new CustomEvent('doke:order-dispute-synced', { detail: clone(result) }));
                return result;
              });
            });
          });
        });
      });
    });
  }


  function respondDispute(payload) {
    payload = payload || {};
    var actor = getCurrentUser() || {};
    if (!actor.id || (actor.role !== 'professional' && !canAccessAdmin(actor))) {
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
    var dispute = findDisputeForOrder(payload.orderId || '', { activeOnly: true });
    if (!dispute && payload.disputeId) {
      dispute = (repository.listDisputes({ currentUser: false }) || []).find(function (item) { return String(item.id || '') === String(payload.disputeId); }) || null;
    }
    if (!dispute) return Promise.reject(new Error('Contestação ativa não encontrada.'));
    var orderId = normalizeText(dispute.orderId || payload.orderId || '');
    return runDisputeTask('response:' + (dispute.id || orderId), function () {
      return Promise.all([getOrderForDispute(orderId), getPaymentForDispute(orderId)]).then(function (values) {
        var order = values[0];
        var payment = values[1];
        if (!canAccessAdmin(actor) && !isProfessionalForOrder(actor, order)) throw new Error('Somente o profissional vinculado pode responder esta contestação.');
        if (!isActiveDisputeStatus(dispute.status)) throw new Error('A contestação não está ativa para resposta.');
        return repository.respondDispute(Object.assign({}, payload, {
          disputeId: dispute.id,
          orderId: orderId,
          respondedBy: actor.id,
          deferSideEffects: true
        })).then(function (walletResult) {
          var updatedDispute = walletResult.dispute;
          return Promise.all([
            saveOrderDisputeProjection(order, updatedDispute, 'response', '', actor),
            savePaymentDisputeProjection(payment, {
              status: 'held',
              escrowStatus: 'held',
              disputeId: updatedDispute.id || '',
              disputeStatus: updatedDispute.status || 'em_analise',
              releaseStatus: 'blocked_by_dispute',
              updatedAt: updatedDispute.updatedAt || new Date().toISOString()
            })
          ]).then(function (projections) {
            return syncConversationDisputeProjection(projections[0], updatedDispute, 'response', '').then(function (conversation) {
              return notifyDisputeLifecycle('response', projections[0], projections[1], updatedDispute, actor, '').then(function (notifications) {
                var result = Object.assign({}, walletResult, { order: projections[0], payment: projections[1], conversation: conversation, notifications: notifications });
                document.dispatchEvent(new CustomEvent('doke:order-dispute-synced', { detail: clone(result) }));
                return result;
              });
            });
          });
        });
      });
    });
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
    var disputeId = normalizeText(payload.disputeId || payload.id || '');
    var disputes = repository.listDisputes({ currentUser: false }) || [];
    var dispute = disputes.find(function (item) {
      if (disputeId && String(item.id || '') === String(disputeId)) return true;
      if (payload.orderId && String(item.orderId || '') === String(payload.orderId)) return true;
      return false;
    }) || null;
    if (!dispute) return Promise.reject(new Error('Contestação não encontrada.'));
    var orderId = normalizeText(dispute.orderId || payload.orderId || '');
    var normalizedResolution = normalizeText(payload.resolution || payload.action || '').toLowerCase();
    var clientResolutions = ['cliente', 'client', 'client_refund', 'refund', 'refunded', 'reembolsado'];
    var professionalResolutions = ['profissional', 'professional', 'release', 'released', 'liberado', 'resolvida_profissional'];
    if (clientResolutions.indexOf(normalizedResolution) === -1 && professionalResolutions.indexOf(normalizedResolution) === -1) {
      return Promise.reject(new Error('Informe explicitamente se a contestação será resolvida para o cliente ou para o profissional.'));
    }
    var clientResolution = clientResolutions.indexOf(normalizedResolution) !== -1;
    var resolution = clientResolution ? 'cliente' : 'profissional';
    return runDisputeTask('resolve:' + (dispute.id || orderId), function () {
      return Promise.all([getOrderForDispute(orderId), getPaymentForDispute(orderId)]).then(function (values) {
        var order = values[0];
        var payment = values[1];
        if (String(order.paymentId || '') !== String(payment.id || '')) throw new Error('O pagamento não corresponde ao pedido contestado.');
        if (dispute.orderId && String(dispute.orderId) !== String(order.id || '')) throw new Error('A contestação pertence a outro pedido.');
        if (dispute.paymentId && String(dispute.paymentId) !== String(payment.id || '')) throw new Error('A contestação pertence a outro pagamento.');
        if (isActiveDisputeStatus(dispute.status)) {
          var transaction = getWalletTransactionForDispute({ transactionId: dispute.transactionId || '' }, order, payment);
          var transactionStatus = normalizeText(transaction.status || '').toLowerCase();
          if (transactionStatus !== 'held' && transactionStatus !== 'pending') {
            throw new Error('O recebível contestado não está mais congelado para resolução.');
          }
        }
        return repository.resolveDispute(Object.assign({}, payload, {
          disputeId: dispute.id,
          orderId: orderId,
          resolution: resolution,
          refundAmount: clientResolution ? payment.chargedAmount || payment.amount || payment.grossAmount || 0 : 0,
          deferSideEffects: true
        })).then(function (walletResult) {
          var updatedDispute = walletResult.dispute;
          var resolvedAt = updatedDispute.resolvedAt || new Date().toISOString();
          var paymentMetadata = clientResolution ? {
            status: 'refunded',
            escrowStatus: 'refunded',
            releaseStatus: 'refunded',
            disputeId: updatedDispute.id || '',
            disputeStatus: updatedDispute.status || 'reembolsado',
            refundAmount: payment.chargedAmount || payment.amount || payment.grossAmount || 0,
            refundedAt: payment.refundedAt || resolvedAt,
            refundedBy: actor.id || '',
            updatedAt: resolvedAt
          } : {
            status: 'released',
            escrowStatus: 'released',
            releaseStatus: 'released',
            disputeId: updatedDispute.id || '',
            disputeStatus: updatedDispute.status || 'resolvida_profissional',
            releasedAt: payment.releasedAt || resolvedAt,
            releasedBy: actor.id || '',
            updatedAt: resolvedAt
          };
          return savePaymentDisputeProjection(payment, paymentMetadata).then(function (savedPayment) {
            return saveOrderDisputeProjection(order, updatedDispute, 'resolved', resolution, actor).then(function (savedOrder) {
              return syncConversationDisputeProjection(savedOrder, updatedDispute, 'resolved', resolution).then(function (conversation) {
                return notifyDisputeLifecycle('resolved', savedOrder, savedPayment, updatedDispute, actor, resolution).then(function (notifications) {
                  var result = Object.assign({}, walletResult, { order: savedOrder, payment: savedPayment, conversation: conversation, notifications: notifications, resolution: resolution });
                  document.dispatchEvent(new CustomEvent('doke:order-dispute-synced', { detail: clone(result) }));
                  return result;
                });
              });
            });
          });
        });
      });
    });
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
      invalidateRepositoryCache();
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
    invalidateRepositoryCache();
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
      invalidateRepositoryCache();
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
    registerReceivableFromOrder: registerReceivableFromOrder,
    releaseHeldReceivableFromCompletion: releaseHeldReceivableFromCompletion
  });
})();
