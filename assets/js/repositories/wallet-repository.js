/* Doke Wallet Repository
   Responsibility: local/mock persistence boundary for wallet receivables and transactions.
   Backend migration rule: services/pages must call this repository instead of localStorage directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.wallet.local.v1';
  var DEMO_PROFESSIONAL_ID = 'user_profissional_demo';
  var DOKE_FEE_RATE = 0.05;

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createTransactionId() {
    return 'wallet_tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createBankAccountId() {
    return 'wallet_bank_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createDisputeId() {
    return 'wallet_dispute_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createAuditEventId() {
    return 'wallet_audit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function safeRead() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return { transactions: parsed, bankAccounts: [], disputes: [], auditEvents: [], updatedAt: nowIso() };
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
      return { transactions: [], bankAccounts: [], disputes: [], auditEvents: [], updatedAt: nowIso() };
    } catch (error) {
      return { transactions: [], bankAccounts: [], disputes: [], auditEvents: [], updatedAt: nowIso() };
    }
  }

  function safeWrite(wallet) {
    var normalized = normalizeWallet(wallet);
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      // localStorage may be unavailable in restricted contexts.
    }
    return clone(normalized);
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

  function isReceivableType(type) {
    var normalized = normalizeText(type || 'receivable');
    return normalized !== 'withdraw' && normalized !== 'fee' && normalized !== 'refund';
  }

  function calculateDokeFee(grossAmount) {
    return roundCurrency(Math.max(0, parseAmount(grossAmount)) * DOKE_FEE_RATE);
  }

  function getReceivableFee(raw, type, grossAmount) {
    if (!isReceivableType(type)) return roundCurrency(parseAmount(raw && raw.feeAmount));
    var parsedFee = roundCurrency(parseAmount(raw && raw.feeAmount));
    if (parsedFee > 0) return parsedFee;
    return calculateDokeFee(grossAmount);
  }


  function normalizeSearchValue(value) {
    return normalizeText(value)
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function getTransactionCategory(transaction) {
    if (!transaction) return 'income';
    if (transaction.type === 'withdraw') return 'withdraw';
    if (transaction.type === 'refund' || transaction.status === 'refunded' || transaction.releaseStatus === 'reembolsado') return 'refund';
    if (transaction.status === 'held' || transaction.status === 'pending') return 'held';
    if (transaction.type === 'fee') return 'fee';
    return 'income';
  }

  function matchesCategory(transaction, category) {
    var nextCategory = normalizeText(category || 'all');
    if (!nextCategory || nextCategory === 'all') return true;
    var transactionCategory = getTransactionCategory(transaction);
    var status = normalizeText(transaction.status || 'available');

    if (nextCategory === 'income') return transactionCategory === 'income' || transactionCategory === 'held';
    if (nextCategory === 'withdraw') return transactionCategory === 'withdraw';
    if (nextCategory === 'held') return transactionCategory === 'held';
    if (nextCategory === 'available') return transactionCategory === 'income' && status === 'available';
    if (nextCategory === 'processing') return status === 'processing';
    if (nextCategory === 'completed') return status === 'completed';
    return true;
  }


  function isEffectiveWithdraw(transaction) {
    var status = normalizeText(transaction && transaction.status);
    return transaction && transaction.type === 'withdraw'
      && status !== 'declined'
      && status !== 'rejected'
      && status !== 'cancelled'
      && status !== 'canceled'
      && status !== 'failed';
  }

  function getTransactionDate(transaction) {
    var value = transaction && (transaction.completedAt || transaction.availableAt || transaction.updatedAt || transaction.createdAt);
    var date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
  }

  function isSameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function matchesPeriod(transaction, period) {
    var nextPeriod = normalizeText(period || 'all');
    if (!nextPeriod || nextPeriod === 'all') return true;
    var date = getTransactionDate(transaction);
    if (!date) return false;
    var now = new Date();

    if (nextPeriod === 'today') return isSameLocalDay(date, now);
    if (nextPeriod === '7-days' || nextPeriod === '7d') return date.getTime() >= now.getTime() - (7 * 24 * 60 * 60 * 1000);
    if (nextPeriod === '30-days' || nextPeriod === '30d') return date.getTime() >= now.getTime() - (30 * 24 * 60 * 60 * 1000);
    if (nextPeriod === 'current-month' || nextPeriod === 'month') {
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }

    if (nextPeriod.indexOf('month:') === 0) return matchesMonthKey(transaction, nextPeriod.slice(6));

    return true;
  }

  function matchesSearch(transaction, query) {
    var normalizedQuery = normalizeSearchValue(query || '');
    if (!normalizedQuery) return true;
    var category = getTransactionCategory(transaction);
    var status = normalizeText(transaction.status || '');
    var haystack = [
      transaction.title,
      transaction.description,
      transaction.reference,
      transaction.orderId,
      transaction.messageId,
      transaction.conversationId,
      transaction.serviceId,
      transaction.method,
      transaction.destination,
      transaction.note,
      transaction.type,
      category,
      status,
      category === 'income' ? 'entrada recebimento liberado' : '',
      category === 'held' ? 'garantia pendente pagamento' : '',
      category === 'withdraw' ? 'saque retirada banco conta pix transferencia' : '',
      category === 'refund' ? 'reembolso devolucao cliente disputa' : '',
      status === 'processing' ? 'processamento processando' : '',
      status === 'completed' ? 'concluido concluida comprovante' : '',
      status === 'available' ? 'liberado disponivel' : ''
    ].map(normalizeSearchValue).filter(Boolean).join(' ');
    return haystack.indexOf(normalizedQuery) >= 0;
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

  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var user = Doke.session.getCurrentUser();
      if (user) return user;
    }

    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function normalizeTransaction(raw) {
    raw = raw || {};
    var type = normalizeText(raw.type || 'receivable');
    var status = normalizeText(raw.status || 'available');
    var grossAmount = roundCurrency(parseAmount(raw.grossAmount != null ? raw.grossAmount : raw.amount));
    var feeAmount = getReceivableFee(raw, type, grossAmount);
    var netAmount = isReceivableType(type)
      ? roundCurrency(Math.max(0, grossAmount - feeAmount))
      : roundCurrency(raw.netAmount != null ? parseAmount(raw.netAmount) : grossAmount - feeAmount);
    var professionalId = normalizeProfessionalId(raw.professionalId || raw.providerId || raw.userId || '');
    var orderId = normalizeText(raw.orderId || '');
    var messageId = normalizeText(raw.messageId || raw.chargeId || '');
    var eventKey = normalizeText(raw.eventKey || ['wallet_receivable', orderId, messageId, professionalId].filter(Boolean).join(':'));
    var createdAt = raw.createdAt || nowIso();

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createTransactionId(),
      type: type,
      source: normalizeText(raw.source || 'order-flow'),
      status: status,
      userId: professionalId,
      professionalId: professionalId,
      clientId: normalizeText(raw.clientId || ''),
      orderId: orderId,
      conversationId: normalizeText(raw.conversationId || ''),
      messageId: messageId,
      serviceId: normalizeText(raw.serviceId || ''),
      eventKey: eventKey,
      grossAmount: grossAmount,
      feeRate: isReceivableType(type) ? DOKE_FEE_RATE : roundCurrency(parseAmount(raw.feeRate)),
      feeAmount: feeAmount,
      netAmount: netAmount,
      amount: netAmount,
      title: normalizeText(raw.title || 'Pedido concluído'),
      description: normalizeText(raw.description || 'Pedido concluído e avaliado'),
      reference: normalizeText(raw.reference || (orderId ? 'PED-' + orderId.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(-6) : 'PED-DOKE')),
      method: normalizeText(raw.method || 'Recebimento pela Doke'),
      note: normalizeText(raw.note || 'Valor liberado após conclusão e avaliação do atendimento.'),
      targetUrl: normalizeText(raw.targetUrl || (raw.conversationId ? 'mensagens.html?conversation=' + encodeURIComponent(raw.conversationId) : 'pedidos.html')),
      actionLabel: normalizeText(raw.actionLabel || 'Ver pedido'),
      createdAt: createdAt,
      availableAt: raw.availableAt || createdAt,
      updatedAt: raw.updatedAt || createdAt
    });
  }


  function normalizeDisputeStatus(value) {
    var status = normalizeRepasseCode(value || '');
    if (!status) return 'contestacao_aberta';
    if (status === 'open' || status === 'aberta' || status === 'contestacao' || status === 'contestacao_aberta' || status === 'contestado') return 'contestacao_aberta';
    if (status === 'analysis' || status === 'review' || status === 'em_analise' || status === 'analise') return 'em_analise';
    if (status === 'professional' || status === 'resolvida_profissional' || status === 'favor_profissional') return 'resolvida_profissional';
    if (status === 'client' || status === 'resolvida_cliente' || status === 'favor_cliente') return 'resolvida_cliente';
    if (status === 'refund' || status === 'refunded' || status === 'reembolsado') return 'reembolsado';
    return status;
  }

  function normalizeDispute(raw) {
    raw = raw || {};
    var createdAt = raw.createdAt || nowIso();
    var status = normalizeDisputeStatus(raw.status || raw.disputeStatus || 'contestacao_aberta');
    var transactionId = normalizeText(raw.transactionId || raw.walletTransactionId || '');
    var orderId = normalizeText(raw.orderId || '');
    return {
      id: normalizeText(raw.id || raw.disputeId) || createDisputeId(),
      transactionId: transactionId,
      orderId: orderId,
      messageId: normalizeText(raw.messageId || ''),
      conversationId: normalizeText(raw.conversationId || ''),
      professionalId: normalizeProfessionalId(raw.professionalId || raw.providerId || raw.userId || ''),
      clientId: normalizeText(raw.clientId || ''),
      reason: normalizeText(raw.reason || raw.note || 'Cliente contestou o pedido.'),
      reasonCode: normalizeText(raw.reasonCode || raw.category || ''),
      openedBy: normalizeText(raw.openedBy || 'cliente'),
      status: status,
      resolution: normalizeText(raw.resolution || ''),
      responseText: normalizeText(raw.responseText || raw.professionalResponse || raw.replyText || ''),
      responseAt: raw.responseAt || raw.professionalResponseAt || '',
      respondedBy: normalizeText(raw.respondedBy || raw.professionalResponseBy || ''),
      createdAt: createdAt,
      updatedAt: raw.updatedAt || createdAt,
      resolvedAt: raw.resolvedAt || ''
    };
  }


  function normalizeAuditEvent(raw) {
    raw = raw || {};
    var createdAt = raw.createdAt || nowIso();
    return {
      id: normalizeText(raw.id) || createAuditEventId(),
      type: normalizeText(raw.type || 'admin_event'),
      action: normalizeText(raw.action || ''),
      actorId: normalizeText(raw.actorId || ''),
      actorRole: normalizeText(raw.actorRole || ''),
      actorName: normalizeText(raw.actorName || 'Suporte Doke'),
      transactionId: normalizeText(raw.transactionId || ''),
      disputeId: normalizeText(raw.disputeId || ''),
      orderId: normalizeText(raw.orderId || ''),
      title: normalizeText(raw.title || 'Evento administrativo'),
      body: normalizeText(raw.body || raw.note || ''),
      reason: normalizeText(raw.reason || ''),
      targetUrl: normalizeText(raw.targetUrl || ''),
      receiptUrl: normalizeText(raw.receiptUrl || ''),
      createdAt: createdAt,
      updatedAt: raw.updatedAt || createdAt
    };
  }

  function appendAuditEvent(wallet, event) {
    var normalized = normalizeAuditEvent(event);
    wallet.auditEvents = [normalized].concat(Array.isArray(wallet.auditEvents) ? wallet.auditEvents.map(normalizeAuditEvent) : []).slice(0, 80);
    return normalized;
  }

  function normalizeBankAccount(raw) {
    raw = raw || {};
    var user = getCurrentUser() || {};
    var ownerId = normalizeProfessionalId(raw.ownerId || raw.professionalId || raw.userId || user.id || '');
    var createdAt = raw.createdAt || nowIso();
    return {
      id: normalizeText(raw.id) || createBankAccountId(),
      ownerId: ownerId,
      userId: ownerId,
      bankName: normalizeText(raw.bankName || raw.bank || ''),
      holderName: normalizeText(raw.holderName || raw.holder || raw.accountHolder || ''),
      accountType: normalizeText(raw.accountType || 'Conta corrente'),
      agency: normalizeText(raw.agency || ''),
      accountNumber: normalizeText(raw.accountNumber || raw.number || ''),
      pixKey: normalizeText(raw.pixKey || ''),
      status: normalizeText(raw.status || 'verified'),
      nextPayout: normalizeText(raw.nextPayout || 'Repasse automático após liberação'),
      createdAt: createdAt,
      updatedAt: raw.updatedAt || createdAt
    };
  }

  function normalizeWallet(wallet) {
    wallet = wallet || {};
    var transactions = Array.isArray(wallet.transactions) ? wallet.transactions.map(normalizeTransaction) : [];
    var rawAccounts = Array.isArray(wallet.bankAccounts)
      ? wallet.bankAccounts
      : wallet.bankAccount
        ? [wallet.bankAccount]
        : [];
    var bankAccounts = rawAccounts.map(normalizeBankAccount).filter(function (account) {
      return account.bankName || account.accountNumber || account.pixKey;
    });
    var disputes = Array.isArray(wallet.disputes) ? wallet.disputes.map(normalizeDispute) : [];
    var auditEvents = Array.isArray(wallet.auditEvents) ? wallet.auditEvents.map(normalizeAuditEvent) : [];
    var latestUpdate = transactions.concat(bankAccounts, disputes, auditEvents).reduce(function (latest, item) {
      var value = item.updatedAt || item.createdAt || '';
      return value > latest ? value : latest;
    }, wallet.updatedAt || nowIso());

    return {
      version: 1,
      currency: normalizeText(wallet.currency || 'BRL'),
      transactions: transactions.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }),
      bankAccounts: bankAccounts,
      disputes: disputes.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }),
      auditEvents: auditEvents.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }),
      updatedAt: latestUpdate
    };
  }

  function readWallet() {
    return clone(normalizeWallet(safeRead()));
  }

  function writeWallet(wallet) {
    return safeWrite(wallet);
  }

  function listTransactions(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getCurrentUser();
    var wallet = readWallet();
    var category = filters.category || filters.group || filters.statementFilter || 'all';
    var period = filters.period || filters.dateRange || 'all';
    var query = filters.query || filters.search || '';

    return clone(wallet.transactions.filter(function (transaction) {
      if (filters.currentUser !== false && user && user.id && String(transaction.professionalId || transaction.userId) !== String(user.id)) return false;
      if (filters.professionalId && String(transaction.professionalId || transaction.userId) !== String(filters.professionalId)) return false;
      if (filters.orderId && String(transaction.orderId) !== String(filters.orderId)) return false;
      if (filters.messageId && String(transaction.messageId) !== String(filters.messageId)) return false;
      if (filters.status && transaction.status !== filters.status) return false;
      if (filters.type && transaction.type !== filters.type) return false;
      if (!matchesCategory(transaction, category)) return false;
      if (!matchesPeriod(transaction, period)) return false;
      if (!matchesSearch(transaction, query)) return false;
      return true;
    }));
  }

  function getSummary(filters) {
    var transactions = listTransactions(filters || {});
    return transactions.reduce(function (summary, transaction) {
      var amount = Number(transaction.netAmount || transaction.amount || 0);
      var feeAmount = Number(transaction.feeAmount || 0);
      if (transaction.type === 'refund' || transaction.status === 'refunded' || transaction.releaseStatus === 'reembolsado') {
        summary.refunds += Math.abs(amount);
      } else if (transaction.status === 'pending' || transaction.status === 'held') {
        summary.pending += amount;
        if (transaction.type !== 'withdraw' && transaction.type !== 'fee') summary.fees += Math.abs(feeAmount);
      } else if (isEffectiveWithdraw(transaction)) {
        summary.withdrawals += Math.abs(amount);
        summary.available -= Math.abs(amount);
      } else if (transaction.type === 'withdraw') {
        // Withdrawals refused by support are kept for audit/receipt, but must not affect balance.
      } else if (transaction.type === 'fee') {
        summary.fees += Math.abs(amount);
        summary.available -= Math.abs(amount);
      } else {
        summary.available += amount;
        summary.income += amount;
        summary.fees += Math.abs(feeAmount);
      }
      summary.total += amount;
      return summary;
    }, { available: 0, pending: 0, income: 0, withdrawals: 0, fees: 0, refunds: 0, total: 0 });
  }

  function getTransactionIdentityFilters(filters) {
    filters = filters || {};
    return {
      currentUser: filters.currentUser,
      professionalId: filters.professionalId,
      orderId: filters.orderId,
      messageId: filters.messageId,
      status: filters.status,
      type: filters.type
    };
  }

  function getUniquePaymentKey(transaction) {
    return normalizeText(transaction.orderId || transaction.messageId || transaction.eventKey || transaction.id || '');
  }

  function getDashboardPeriod(period) {
    var normalized = normalizeText(period || 'current-month');
    var now = new Date();
    var end = new Date(now.getTime());
    var start;
    var bucketCount;
    var label;

    if (normalized === '7-days' || normalized === '7d') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      bucketCount = 7;
      label = 'Últimos 7 dias';
      normalized = '7-days';
    } else if (normalized === '30-days' || normalized === '30d') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      bucketCount = 6;
      label = 'Últimos 30 dias';
      normalized = '30-days';
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      bucketCount = Math.min(6, Math.max(1, Math.ceil((now.getDate()) / 5)));
      label = 'Mês atual';
      normalized = 'current-month';
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      period: normalized,
      periodLabel: label,
      start: start,
      end: end,
      bucketCount: bucketCount
    };
  }

  function getMonthKey(date) {
    if (!date || Number.isNaN(date.getTime())) return '';
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function getMonthLabel(monthKey) {
    var parts = normalizeText(monthKey).split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) return 'Período';
    return new Date(year, month, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function getPreviousMonthKey(monthKey) {
    var parts = normalizeText(monthKey).split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) return '';
    return getMonthKey(new Date(year, month - 1, 1, 12));
  }

  function addDays(date, days) {
    var base = date && !Number.isNaN(date.getTime()) ? date : new Date();
    var next = new Date(base.getTime());
    next.setDate(next.getDate() + Number(days || 0));
    return next;
  }

  function getReceivableBaseDate(transaction) {
    var value = transaction && (transaction.completedAt || transaction.updatedAt || transaction.availableAt || transaction.createdAt);
    var date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : new Date();
  }

  function getReceivablePayoutDate(transaction) {
    transaction = transaction || {};
    var explicit = transaction.expectedPayoutAt || transaction.payoutAt || transaction.releaseAt || transaction.scheduledAt || '';
    var explicitDate = explicit ? new Date(explicit) : null;
    if (explicitDate && !Number.isNaN(explicitDate.getTime())) return explicitDate;

    var status = normalizeText(transaction.status || 'available');
    var base = getReceivableBaseDate(transaction);
    if (status === 'available' || status === 'completed') return base;
    return addDays(base, 2);
  }

  function hasAnyDate(transaction, keys) {
    transaction = transaction || {};
    return keys.some(function (key) {
      var value = transaction[key];
      var date = value ? new Date(value) : null;
      return Boolean(date && !Number.isNaN(date.getTime()));
    });
  }

  function normalizeRepasseCode(value) {
    return normalizeSearchValue(value || '').replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  }

  function isPastPayoutDate(payoutDate) {
    if (!payoutDate || Number.isNaN(payoutDate.getTime())) return false;
    var today = new Date();
    var startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return payoutDate.getTime() < startOfToday.getTime();
  }


  function isDisputeOpen(dispute) {
    var status = normalizeDisputeStatus(dispute && dispute.status);
    return status === 'contestacao_aberta' || status === 'em_analise';
  }

  function findDisputeForTransaction(transaction, wallet) {
    transaction = transaction || {};
    wallet = wallet || readWallet();
    var transactionId = normalizeText(transaction.id || transaction.transactionId || '');
    var orderId = normalizeText(transaction.orderId || '');
    var messageId = normalizeText(transaction.messageId || '');
    return (wallet.disputes || []).find(function (dispute) {
      if (transactionId && String(dispute.transactionId || '') === String(transactionId)) return true;
      if (orderId && String(dispute.orderId || '') === String(orderId)) return true;
      if (messageId && String(dispute.messageId || '') === String(messageId)) return true;
      return false;
    }) || null;
  }

  function findTransactionIndex(wallet, payload) {
    payload = payload || {};
    var transactionId = normalizeText(payload.transactionId || payload.id || payload.walletTransactionId || '');
    var orderId = normalizeText(payload.orderId || '');
    var messageId = normalizeText(payload.messageId || '');
    return (wallet.transactions || []).findIndex(function (transaction) {
      if (transactionId && String(transaction.id || '') === String(transactionId)) return true;
      if (orderId && String(transaction.orderId || '') === String(orderId)) return true;
      if (messageId && String(transaction.messageId || '') === String(messageId)) return true;
      return false;
    });
  }

  function getRepasseState(transaction, payoutDate, dispute) {
    transaction = transaction || {};
    var disputeStatus = normalizeDisputeStatus(dispute && dispute.status);
    if (disputeStatus === 'contestacao_aberta') return 'contestacao';
    if (disputeStatus === 'em_analise') return 'em_analise';
    if (disputeStatus === 'resolvida_profissional') return 'liberado';
    if (disputeStatus === 'resolvida_cliente' || disputeStatus === 'reembolsado') return 'reembolsado';
    var status = normalizeRepasseCode(transaction.status || 'available');
    var releaseStatus = normalizeRepasseCode(transaction.releaseStatus || transaction.repasseStatus || transaction.disputeStatus || '');
    if (releaseStatus) status = releaseStatus;

    if (status === 'contestacao' || status === 'contestacao_aberta' || status === 'contestado' || status === 'dispute' || status === 'disputed' || status === 'contest') return 'contestacao';
    if (status === 'em_analise' || status === 'analise' || status === 'under_review' || status === 'analysis' || status === 'reviewing') return 'em_analise';
    if (status === 'atrasado' || status === 'delayed' || status === 'late') return 'atrasado';
    if (status === 'blocked' || status === 'bloqueado' || status === 'paused' || status === 'pausado') return 'bloqueado';
    if (status === 'refund' || status === 'refunded' || status === 'reembolso' || status === 'reembolsado') return 'reembolsado';
    if (status === 'withdrawn' || status === 'sacado') return 'sacado';
    if (status === 'available' || status === 'completed' || status === 'released' || status === 'liberado') return 'liberado';
    if (status === 'pending' || status === 'aguardando_conclusao') return 'aguardando_conclusao';
    if (status === 'review' || status === 'aguardando_avaliacao') return 'aguardando_avaliacao';

    if (hasAnyDate(transaction, ['evaluatedAt', 'reviewedAt', 'ratedAt'])) return 'liberado';
    if (hasAnyDate(transaction, ['completedAt', 'finishedAt', 'serviceCompletedAt'])) return 'aguardando_avaliacao';
    if (isPastPayoutDate(payoutDate)) return 'atrasado';
    return 'em_garantia';
  }

  function getRepasseStateInfo(transaction, payoutDate, dispute) {
    var state = getRepasseState(transaction, payoutDate, dispute);
    var map = {
      em_garantia: {
        code: 'em_garantia',
        label: 'Em garantia',
        reason: 'Protegido até validação do serviço',
        detail: 'Este valor ainda não está disponível porque o pedido precisa avançar para conclusão e validação.'
      },
      aguardando_conclusao: {
        code: 'aguardando_conclusao',
        label: 'Aguardando conclusão',
        reason: 'Libera após conclusão do serviço',
        detail: 'Este valor libera quando o serviço for marcado como concluído no pedido.'
      },
      aguardando_avaliacao: {
        code: 'aguardando_avaliacao',
        label: 'Aguardando cliente',
        reason: 'Libera após avaliação do cliente',
        detail: 'Este valor ainda não está disponível porque o cliente precisa confirmar ou avaliar o serviço.'
      },
      liberado: {
        code: 'liberado',
        label: 'Liberado para saque',
        reason: 'Disponível para saque',
        detail: 'O valor líquido já está disponível na carteira.'
      },
      sacado: {
        code: 'sacado',
        label: 'Sacado',
        reason: 'Saque solicitado ou concluído',
        detail: 'O valor já foi direcionado para o fluxo de saque.'
      },
      reembolsado: {
        code: 'reembolsado',
        label: 'Reembolsado',
        reason: 'Valor devolvido ao cliente',
        detail: 'A disputa foi resolvida para o cliente. O valor não será liberado para saque.'
      },
      bloqueado: {
        code: 'bloqueado',
        label: 'Bloqueado',
        reason: 'Repasse pausado para análise',
        detail: 'Este repasse está pausado para análise. Nenhuma ação é necessária no momento.'
      },
      em_analise: {
        code: 'em_analise',
        label: 'Em análise',
        reason: 'Repasse em análise',
        detail: 'Estamos verificando este pedido antes da liberação. Nenhuma ação é necessária no momento.'
      },
      atrasado: {
        code: 'atrasado',
        label: 'Atrasado',
        reason: 'Repasse atrasado',
        detail: 'Este repasse passou da data prevista e será revisado pelo suporte financeiro.'
      },
      contestacao: {
        code: 'contestacao',
        label: 'Contestação',
        reason: 'Pedido contestado',
        detail: 'O cliente contestou este pedido. A liberação fica pausada até a resolução.'
      }
    };
    var info = map[state] || map.em_garantia;
    return Object.assign({}, info, {
      payoutDate: payoutDate ? payoutDate.toISOString() : '',
      isReleased: state === 'liberado' || state === 'sacado',
      isBlocked: state === 'bloqueado' || state === 'em_analise' || state === 'atrasado' || state === 'contestacao',
      isRefunded: state === 'reembolsado',
      needsAttention: state === 'atrasado' || state === 'contestacao'
    });
  }

  function getRepasseTimeline(transaction, stateInfo) {
    transaction = transaction || {};
    stateInfo = stateInfo || getRepasseStateInfo(transaction);
    var state = stateInfo.code;
    var paidDone = true;
    var serviceDone = state === 'aguardando_avaliacao' || state === 'liberado' || state === 'sacado' || state === 'em_analise' || state === 'atrasado' || state === 'contestacao' || state === 'reembolsado';
    var reviewDone = state === 'liberado' || state === 'sacado';
    var releasedDone = state === 'liberado' || state === 'sacado';
    var withdrawnDone = state === 'sacado';

    if (state === 'reembolsado') {
      return [
        { key: 'payment', label: 'Pagamento recebido', detail: 'Valor registrado na carteira.', state: 'done' },
        { key: 'service', label: 'Pedido analisado', detail: 'A contestação foi revisada.', state: 'done' },
        { key: 'refund', label: 'Reembolso aprovado', detail: 'O valor foi devolvido ao cliente.', state: 'blocked' },
        { key: 'released', label: 'Valor liberado', detail: 'Etapa encerrada sem liberação ao profissional.', state: 'pending' },
        { key: 'withdraw', label: 'Saque solicitado', detail: 'Não aplicável para valor reembolsado.', state: 'pending' }
      ];
    }

    if (state === 'bloqueado' || state === 'em_analise' || state === 'atrasado' || state === 'contestacao') {
      var exceptionLabel = stateInfo.label || 'Repasse em análise';
      var exceptionDetail = stateInfo.detail || 'A liberação está pausada até a resolução do pedido.';
      var exceptionState = state === 'contestacao' || state === 'atrasado' ? 'blocked' : 'current';
      return [
        { key: 'payment', label: 'Pagamento recebido', detail: 'Valor registrado na carteira.', state: 'done' },
        { key: 'service', label: 'Serviço concluído', detail: serviceDone ? 'Atendimento confirmado no pedido.' : 'Confirmação do atendimento no pedido.', state: serviceDone ? 'done' : 'pending' },
        { key: 'exception', label: exceptionLabel, detail: exceptionDetail, state: exceptionState },
        { key: 'released', label: 'Valor liberado', detail: 'Etapa pendente após a resolução.', state: 'pending' },
        { key: 'withdraw', label: 'Saque solicitado', detail: 'Disponível depois da liberação.', state: 'pending' }
      ];
    }

    return [
      { key: 'payment', label: 'Pagamento recebido', detail: 'Valor registrado na carteira.', state: paidDone ? 'done' : 'pending' },
      { key: 'service', label: 'Serviço concluído', detail: 'Confirmação do atendimento no pedido.', state: serviceDone ? 'done' : (state === 'aguardando_conclusao' || state === 'em_garantia' ? 'current' : 'pending') },
      { key: 'review', label: 'Avaliação recebida', detail: 'Validação final do cliente.', state: reviewDone ? 'done' : (state === 'aguardando_avaliacao' ? 'current' : 'pending') },
      { key: 'released', label: 'Valor liberado', detail: 'Saldo disponível para saque.', state: releasedDone ? 'done' : 'pending' },
      { key: 'withdraw', label: 'Saque solicitado', detail: 'Envio para a conta de recebimento.', state: withdrawnDone ? 'done' : 'pending' }
    ];
  }

  function getReceivableScheduleStatus(transaction, payoutDate, dispute) {
    var stateInfo = getRepasseStateInfo(transaction, payoutDate, dispute);
    return {
      code: stateInfo.code,
      label: stateInfo.label,
      reason: stateInfo.reason,
      detail: stateInfo.detail,
      timeline: getRepasseTimeline(transaction, stateInfo)
    };
  }

  function formatPayoutDateLabel(date) {
    if (!date || Number.isNaN(date.getTime())) return 'Data indefinida';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function formatPayoutFullDateLabel(date) {
    if (!date || Number.isNaN(date.getTime())) return 'Data indefinida';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  function createReceivableScheduleItem(transaction, wallet) {
    var payoutDate = getReceivablePayoutDate(transaction);
    var dispute = findDisputeForTransaction(transaction, wallet);
    var statusInfo = getReceivableScheduleStatus(transaction, payoutDate, dispute);
    var grossAmount = roundCurrency(parseAmount(transaction.grossAmount != null ? transaction.grossAmount : transaction.amount));
    var feeAmount = roundCurrency(parseAmount(transaction.feeAmount));
    var netAmount = roundCurrency(parseAmount(transaction.netAmount != null ? transaction.netAmount : transaction.amount));
    return {
      id: normalizeText(transaction.id || ''),
      transactionId: normalizeText(transaction.id || ''),
      orderId: normalizeText(transaction.orderId || ''),
      title: normalizeText(transaction.title || 'Pedido de serviço'),
      description: normalizeText(transaction.description || 'Recebível vinculado a pedido.'),
      reference: normalizeText(transaction.reference || transaction.orderId || transaction.id || ''),
      status: statusInfo.code,
      statusLabel: statusInfo.label,
      statusReason: statusInfo.reason,
      statusDetail: statusInfo.detail,
      releaseState: statusInfo.code,
      releaseLabel: statusInfo.label,
      releaseReason: statusInfo.reason,
      releaseTimeline: clone(statusInfo.timeline || []),
      dispute: dispute ? clone(dispute) : null,
      disputeStatus: dispute ? dispute.status : normalizeText(transaction.disputeStatus || ''),
      disputeReason: dispute ? dispute.reason : normalizeText(transaction.disputeReason || ''),
      disputeActionLabel: dispute && isDisputeOpen(dispute) ? 'Abrir conversa' : '',
      grossAmount: grossAmount,
      feeAmount: feeAmount,
      netAmount: netAmount,
      payoutAt: payoutDate.toISOString(),
      payoutDateLabel: formatPayoutDateLabel(payoutDate),
      payoutFullDateLabel: formatPayoutFullDateLabel(payoutDate),
      sourceStatus: normalizeText(transaction.status || 'available'),
      targetUrl: normalizeText(transaction.targetUrl || 'pedidos.html'),
      transaction: clone(transaction)
    };
  }

  function getReceivablesSchedule(filters) {
    filters = filters || {};
    var identityFilters = getTransactionIdentityFilters(filters || {});
    var limit = Math.max(1, Math.min(16, Number(filters.limit || 8) || 8));
    var wallet = readWallet();
    var transactions = listTransactions(Object.assign({}, identityFilters, {
      category: 'all',
      period: 'all',
      query: ''
    })).filter(function (transaction) {
      var type = normalizeText(transaction.type || 'receivable');
      var status = normalizeText(transaction.status || '');
      return isReceivableType(type) && status !== 'refunded' && status !== 'reembolsado';
    });

    var items = transactions.map(function (transaction) { return createReceivableScheduleItem(transaction, wallet); }).filter(function (item) {
      return item.status !== 'reembolsado';
    }).sort(function (a, b) {
      var aReleased = a.status === 'liberado' || a.status === 'sacado' ? 1 : 0;
      var bReleased = b.status === 'liberado' || b.status === 'sacado' ? 1 : 0;
      if (aReleased !== bReleased) return aReleased - bReleased;
      var aTime = new Date(a.payoutAt || 0).getTime();
      var bTime = new Date(b.payoutAt || 0).getTime();
      return aReleased ? bTime - aTime : aTime - bTime;
    });

    var futureItems = items.filter(function (item) { return item.status !== 'liberado' && item.status !== 'sacado'; });
    var releasedItems = items.filter(function (item) { return item.status === 'liberado' || item.status === 'sacado'; });
    var next = futureItems[0] || releasedItems[0] || null;
    var scheduledNet = futureItems.reduce(function (total, item) { return total + Number(item.netAmount || 0); }, 0);
    var releasedNet = releasedItems.reduce(function (total, item) { return total + Number(item.netAmount || 0); }, 0);

    return {
      next: next ? clone(next) : null,
      items: clone(items.slice(0, limit)),
      scheduledNet: roundCurrency(scheduledNet),
      releasedNet: roundCurrency(releasedNet),
      totalNet: roundCurrency(scheduledNet + releasedNet),
      pendingCount: futureItems.length,
      releasedCount: releasedItems.length,
      count: items.length
    };
  }

  function getMetricComparison(current, previous) {
    var currentValue = roundCurrency(current || 0);
    var previousValue = roundCurrency(previous || 0);
    var difference = roundCurrency(currentValue - previousValue);
    var percent = previousValue !== 0 ? Math.round((difference / Math.abs(previousValue)) * 100) : (currentValue > 0 ? 100 : 0);
    var trend = Math.abs(difference) < 0.01 ? 'stable' : (difference > 0 ? 'up' : 'down');
    if (!previousValue && !currentValue) trend = 'neutral';
    return {
      current: currentValue,
      previous: previousValue,
      difference: difference,
      percent: percent,
      trend: trend
    };
  }

  function buildMonthlyComparison(summary, previous) {
    summary = summary || createEmptyMonthSummary('');
    previous = previous || null;
    var emptyPrevious = previous || createEmptyMonthSummary(getPreviousMonthKey(summary.monthKey || ''));
    var metrics = {
      grossIncome: getMetricComparison(summary.grossIncome, emptyPrevious.grossIncome),
      netIncome: getMetricComparison(summary.netIncome, emptyPrevious.netIncome),
      fees: getMetricComparison(summary.fees, emptyPrevious.fees),
      withdrawals: getMetricComparison(summary.withdrawals, emptyPrevious.withdrawals),
      paidOrders: getMetricComparison(summary.paidOrders, emptyPrevious.paidOrders),
      ticketAverage: getMetricComparison(summary.ticketAverage, emptyPrevious.ticketAverage),
      netFlow: getMetricComparison(summary.netFlow, emptyPrevious.netFlow)
    };
    var netTrend = metrics.netIncome.trend;
    var hasPrevious = Boolean(previous && previous.transactionsCount);
    var badges = [];

    if (!hasPrevious && summary.transactionsCount > 0) badges.push('Novo mês ativo');
    if (hasPrevious && netTrend === 'up') badges.push('Crescimento');
    if (hasPrevious && netTrend === 'down') badges.push('Queda');
    if (metrics.withdrawals.current === 0) badges.push('Sem saques');
    if (summary.fees > 0 && summary.grossIncome > 0) badges.push('Taxa ' + Math.round((summary.fees / summary.grossIncome) * 100) + '%');

    return {
      previousMonthKey: emptyPrevious.monthKey || getPreviousMonthKey(summary.monthKey || ''),
      previousPeriodLabel: emptyPrevious.periodLabel || getMonthLabel(getPreviousMonthKey(summary.monthKey || '')),
      hasPrevious: hasPrevious,
      trend: netTrend,
      metrics: metrics,
      badges: badges.slice(0, 3)
    };
  }

  function getMonthlyInsight(summary, comparison) {
    summary = summary || createEmptyMonthSummary('');
    comparison = comparison || buildMonthlyComparison(summary, null);
    var net = roundCurrency(summary.netIncome || 0);
    var paidOrders = Number(summary.paidOrders || 0);
    var feeRate = summary.grossIncome > 0 ? Math.round((summary.fees / summary.grossIncome) * 100) : 0;
    var base = 'Você recebeu R$ ' + net.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' líquido em ' + (paidOrders === 1 ? '1 pedido pago' : paidOrders + ' pedidos pagos') + '.';
    var fee = summary.fees > 0 ? ' A taxa Doke ficou em ' + feeRate + '% do bruto.' : '';
    var withdrawals = summary.withdrawals > 0 ? ' Saques no período somaram R$ ' + roundCurrency(summary.withdrawals).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '.' : ' Nenhum saque foi feito no período.';

    if (!summary.transactionsCount) return 'Ainda não há movimentações nesse mês para comparar.';
    if (!comparison.hasPrevious) return base + fee + ' Ainda não há mês anterior com movimentações para comparação.';
    if (comparison.metrics.netIncome.trend === 'up') return base + ' O líquido subiu ' + Math.abs(comparison.metrics.netIncome.percent) + '% vs ' + comparison.previousPeriodLabel + '.' + fee + withdrawals;
    if (comparison.metrics.netIncome.trend === 'down') return base + ' O líquido caiu ' + Math.abs(comparison.metrics.netIncome.percent) + '% vs ' + comparison.previousPeriodLabel + '.' + fee + withdrawals;
    return base + ' O líquido ficou estável em relação a ' + comparison.previousPeriodLabel + '.' + fee + withdrawals;
  }

  function matchesMonthKey(transaction, monthKey) {
    var date = getTransactionDate(transaction);
    if (!date) return false;
    return getMonthKey(date) === normalizeText(monthKey);
  }

  function formatShortDate(date) {
    return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function createDashboardBuckets(periodInfo) {
    var startTime = periodInfo.start.getTime();
    var endTime = periodInfo.end.getTime();
    var bucketCount = Math.max(1, periodInfo.bucketCount || 1);
    var bucketSize = Math.max(1, (endTime - startTime + 1) / bucketCount);
    var buckets = [];

    for (var index = 0; index < bucketCount; index += 1) {
      var bucketStart = new Date(startTime + (bucketSize * index));
      var bucketEnd = new Date(index === bucketCount - 1 ? endTime : startTime + (bucketSize * (index + 1)) - 1);
      var isSingleDay = isSameLocalDay(bucketStart, bucketEnd);
      buckets.push({
        start: bucketStart,
        end: bucketEnd,
        label: isSingleDay ? formatShortDate(bucketStart) : formatShortDate(bucketStart) + '–' + formatShortDate(bucketEnd),
        grossIncome: 0,
        netIncome: 0,
        withdrawals: 0,
        fees: 0,
        paidOrders: 0,
        paymentKeys: {}
      });
    }

    return buckets;
  }

  function findDashboardBucketIndex(buckets, date) {
    if (!date) return -1;
    var time = date.getTime();
    for (var index = 0; index < buckets.length; index += 1) {
      if (time >= buckets[index].start.getTime() && time <= buckets[index].end.getTime()) return index;
    }
    return -1;
  }

  function getMonthlyDashboard(filters) {
    filters = filters || {};
    var periodInfo = getDashboardPeriod(filters.period || filters.dateRange || 'current-month');
    var identityFilters = getTransactionIdentityFilters(filters || {});
    var balanceSummary = getSummary(identityFilters);
    var periodTransactions = listTransactions(Object.assign({}, identityFilters, {
      category: 'all',
      period: periodInfo.period,
      query: ''
    }));
    var allTransactions = listTransactions(Object.assign({}, identityFilters, {
      category: 'all',
      period: 'all',
      query: ''
    }));
    var buckets = createDashboardBuckets(periodInfo);
    var paidOrders = {};
    var receivableCount = 0;

    var dashboard = periodTransactions.reduce(function (summary, transaction) {
      var type = normalizeText(transaction.type || 'receivable');
      var status = normalizeText(transaction.status || 'available');
      var releaseStatus = normalizeText(transaction.releaseStatus || transaction.repasseStatus || transaction.disputeStatus || '');
      var isRefund = type === 'refund' || status === 'refunded' || releaseStatus === 'reembolsado';
      var grossAmount = roundCurrency(parseAmount(transaction.grossAmount != null ? transaction.grossAmount : transaction.amount));
      var netAmount = roundCurrency(parseAmount(transaction.netAmount != null ? transaction.netAmount : transaction.amount));
      var feeAmount = roundCurrency(parseAmount(transaction.feeAmount));
      var movementAmount = Math.abs(type === 'withdraw' ? netAmount : grossAmount || netAmount);
      var bucketIndex = findDashboardBucketIndex(buckets, getTransactionDate(transaction));
      var bucket = bucketIndex >= 0 ? buckets[bucketIndex] : null;

      if (isRefund) {
        summary.refunds += Math.abs(netAmount || grossAmount);
      } else if (isEffectiveWithdraw(transaction)) {
        summary.withdrawals += Math.abs(netAmount);
        summary.withdrawalsCount += 1;
        if (bucket) bucket.withdrawals += Math.abs(netAmount);
      } else if (type === 'withdraw') {
        // Refused withdrawals remain in history without reducing income metrics.
      } else if (type === 'fee') {
        summary.fees += Math.abs(netAmount);
        if (bucket) bucket.fees += Math.abs(netAmount);
      } else {
        receivableCount += 1;
        summary.grossIncome += grossAmount;
        summary.netIncome += netAmount;
        summary.fees += Math.abs(feeAmount);
        if (status === 'held' || status === 'pending') summary.heldIncome += netAmount;
        else summary.availableIncome += netAmount;

        if (bucket) {
          bucket.grossIncome += grossAmount;
          bucket.netIncome += netAmount;
          bucket.fees += Math.abs(feeAmount);
        }

        var paymentKey = getUniquePaymentKey(transaction);
        if (paymentKey) {
          paidOrders[paymentKey] = true;
          if (bucket) bucket.paymentKeys[paymentKey] = true;
        }
      }

      if (movementAmount > summary.largestMovement.amount) {
        summary.largestMovement = {
          amount: roundCurrency(movementAmount),
          title: normalizeText(transaction.title || (type === 'withdraw' ? 'Saque' : 'Recebimento')),
          reference: normalizeText(transaction.reference || transaction.orderId || transaction.id || ''),
          type: type,
          status: status
        };
      }

      return summary;
    }, {
      period: periodInfo.period,
      periodLabel: periodInfo.periodLabel,
      grossIncome: 0,
      netIncome: 0,
      availableIncome: 0,
      heldIncome: 0,
      withdrawals: 0,
      fees: 0,
      refunds: 0,
      availableBalance: roundCurrency(balanceSummary.available || 0),
      heldBalance: roundCurrency(balanceSummary.pending || 0),
      processingWithdrawals: 0,
      paidOrders: 0,
      withdrawalsCount: 0,
      ticketAverage: 0,
      largestMovement: { amount: 0, title: 'Sem movimentações', reference: '', type: '', status: '' },
      chartSeries: { labels: [], grossIncome: [], netIncome: [], withdrawals: [], fees: [], paidOrders: [] }
    });

    dashboard.processingWithdrawals = roundCurrency(allTransactions.reduce(function (total, transaction) {
      return isEffectiveWithdraw(transaction) && transaction.status === 'processing'
        ? total + Math.abs(Number(transaction.netAmount || transaction.amount || 0))
        : total;
    }, 0));
    dashboard.grossIncome = roundCurrency(dashboard.grossIncome);
    dashboard.netIncome = roundCurrency(dashboard.netIncome);
    dashboard.availableIncome = roundCurrency(dashboard.availableIncome);
    dashboard.heldIncome = roundCurrency(dashboard.heldIncome);
    dashboard.withdrawals = roundCurrency(dashboard.withdrawals);
    dashboard.fees = roundCurrency(dashboard.fees);
    dashboard.refunds = roundCurrency(dashboard.refunds);
    dashboard.paidOrders = Object.keys(paidOrders).length || receivableCount;
    dashboard.ticketAverage = dashboard.paidOrders ? roundCurrency(dashboard.grossIncome / dashboard.paidOrders) : 0;
    dashboard.largestMovement.amount = roundCurrency(dashboard.largestMovement.amount || 0);
    dashboard.chartSeries = {
      labels: buckets.map(function (bucket) { return bucket.label; }),
      grossIncome: buckets.map(function (bucket) { return roundCurrency(bucket.grossIncome); }),
      netIncome: buckets.map(function (bucket) { return roundCurrency(bucket.netIncome); }),
      withdrawals: buckets.map(function (bucket) { return roundCurrency(bucket.withdrawals); }),
      fees: buckets.map(function (bucket) { return roundCurrency(bucket.fees); }),
      paidOrders: buckets.map(function (bucket) { return Object.keys(bucket.paymentKeys).length; })
    };

    return dashboard;
  }

  function createEmptyMonthSummary(monthKey) {
    return {
      monthKey: monthKey,
      period: 'month:' + monthKey,
      periodLabel: getMonthLabel(monthKey),
      grossIncome: 0,
      netIncome: 0,
      fees: 0,
      withdrawals: 0,
      refunds: 0,
      refundCount: 0,
      paidOrders: 0,
      withdrawalsCount: 0,
      transactionsCount: 0,
      netFlow: 0,
      paymentKeys: {},
      largestMovement: { amount: 0, title: 'Sem movimentações', reference: '', type: '', status: '' }
    };
  }

  function getMonthlyHistory(filters) {
    filters = filters || {};
    var identityFilters = getTransactionIdentityFilters(filters || {});
    var limit = Math.max(1, Math.min(24, Number(filters.limit || 6) || 6));
    var transactions = listTransactions(Object.assign({}, identityFilters, {
      category: 'all',
      period: 'all',
      query: ''
    }));
    var byMonth = {};

    transactions.forEach(function (transaction) {
      var date = getTransactionDate(transaction);
      var monthKey = getMonthKey(date);
      if (!monthKey) return;
      var summary = byMonth[monthKey] || (byMonth[monthKey] = createEmptyMonthSummary(monthKey));
      var type = normalizeText(transaction.type || 'receivable');
      var status = normalizeText(transaction.status || 'available');
      var releaseStatus = normalizeText(transaction.releaseStatus || transaction.repasseStatus || transaction.disputeStatus || '');
      var isRefund = type === 'refund' || status === 'refunded' || releaseStatus === 'reembolsado';
      var grossAmount = roundCurrency(parseAmount(transaction.grossAmount != null ? transaction.grossAmount : transaction.amount));
      var netAmount = roundCurrency(parseAmount(transaction.netAmount != null ? transaction.netAmount : transaction.amount));
      var feeAmount = roundCurrency(parseAmount(transaction.feeAmount));
      var movementAmount = Math.abs(type === 'withdraw' ? netAmount : grossAmount || netAmount);

      summary.transactionsCount += 1;
      if (isRefund) {
        summary.refunds += Math.abs(netAmount || grossAmount);
        summary.refundCount += 1;
      } else if (isEffectiveWithdraw(transaction)) {
        summary.withdrawals += Math.abs(netAmount);
        summary.withdrawalsCount += 1;
      } else if (type === 'withdraw') {
        // Refused withdrawals remain in history without reducing income metrics.
      } else if (type === 'fee') {
        summary.fees += Math.abs(netAmount);
      } else {
        summary.grossIncome += grossAmount;
        summary.netIncome += netAmount;
        summary.fees += Math.abs(feeAmount);
        var paymentKey = getUniquePaymentKey(transaction);
        if (paymentKey) summary.paymentKeys[paymentKey] = true;
      }

      if (movementAmount > summary.largestMovement.amount) {
        summary.largestMovement = {
          amount: roundCurrency(movementAmount),
          title: normalizeText(transaction.title || (type === 'withdraw' ? 'Saque' : 'Recebimento')),
          reference: normalizeText(transaction.reference || transaction.orderId || transaction.id || ''),
          type: type,
          status: status
        };
      }
    });

    var monthKeys = Object.keys(byMonth).sort().reverse();
    var allSummaries = monthKeys.map(function (monthKey) {
      var summary = byMonth[monthKey];
      summary.grossIncome = roundCurrency(summary.grossIncome);
      summary.netIncome = roundCurrency(summary.netIncome);
      summary.fees = roundCurrency(summary.fees);
      summary.withdrawals = roundCurrency(summary.withdrawals);
      summary.refunds = roundCurrency(summary.refunds);
      summary.paidOrders = Object.keys(summary.paymentKeys).length || Math.max(0, summary.transactionsCount - summary.withdrawalsCount - summary.refundCount);
      summary.netFlow = roundCurrency(summary.netIncome - summary.withdrawals - summary.refunds);
      delete summary.refundCount;
      summary.ticketAverage = summary.paidOrders ? roundCurrency(summary.grossIncome / summary.paidOrders) : 0;
      delete summary.paymentKeys;
      return summary;
    });
    var summaryByMonth = allSummaries.reduce(function (map, summary) {
      if (summary && summary.monthKey) map[summary.monthKey] = summary;
      return map;
    }, {});

    allSummaries.forEach(function (summary, index) {
      var previous = summaryByMonth[getPreviousMonthKey(summary.monthKey)] || allSummaries[index + 1] || null;
      summary.comparison = buildMonthlyComparison(summary, previous);
      summary.insight = getMonthlyInsight(summary, summary.comparison);
    });

    return allSummaries.slice(0, limit);
  }

  function getStatusRank(status) {
    if (status === 'available') return 3;
    if (status === 'held' || status === 'pending') return 2;
    return 1;
  }

  function registerReceivable(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var normalized = normalizeTransaction(Object.assign({}, payload, {
      type: 'receivable',
      status: payload.status || 'available'
    }));
    var existingIndex = wallet.transactions.findIndex(function (transaction) {
      return transaction.eventKey && String(transaction.eventKey) === String(normalized.eventKey);
    });

    if (existingIndex >= 0) {
      var existing = wallet.transactions[existingIndex];
      var shouldUpgrade = getStatusRank(normalized.status) > getStatusRank(existing.status);
      if (!shouldUpgrade) {
        return Promise.resolve({ transaction: clone(existing), created: false, updated: false, wallet: clone(wallet) });
      }

      var upgraded = normalizeTransaction(Object.assign({}, existing, normalized, {
        id: existing.id || normalized.id,
        createdAt: existing.createdAt || normalized.createdAt,
        updatedAt: nowIso()
      }));
      wallet.transactions.splice(existingIndex, 1, upgraded);
      wallet.updatedAt = upgraded.updatedAt;
      var updatedWallet = writeWallet(wallet);
      document.dispatchEvent(new CustomEvent('doke:wallet-receivable-updated', {
        detail: { transaction: clone(upgraded), previous: clone(existing), wallet: clone(updatedWallet) }
      }));
      return Promise.resolve({ transaction: clone(upgraded), previous: clone(existing), created: false, updated: true, wallet: clone(updatedWallet) });
    }

    wallet.transactions.unshift(normalized);
    wallet.updatedAt = normalized.createdAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-receivable-created', {
      detail: { transaction: clone(normalized), wallet: clone(saved) }
    }));
    return Promise.resolve({ transaction: clone(normalized), created: true, updated: false, wallet: clone(saved) });
  }

  function getBankAccount(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getCurrentUser();
    var wallet = readWallet();
    var ownerId = normalizeProfessionalId(filters.ownerId || filters.professionalId || filters.userId || (user && user.id) || '');
    var account = wallet.bankAccounts.find(function (item) {
      if (!ownerId) return true;
      return String(item.ownerId || item.userId) === String(ownerId);
    });
    return Promise.resolve(clone(account || null));
  }

  function saveBankAccount(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var normalized = normalizeBankAccount(Object.assign({}, payload, {
      updatedAt: nowIso()
    }));
    var index = wallet.bankAccounts.findIndex(function (account) {
      return String(account.ownerId || account.userId) === String(normalized.ownerId || normalized.userId);
    });

    if (index >= 0) {
      normalized.id = wallet.bankAccounts[index].id || normalized.id;
      normalized.createdAt = wallet.bankAccounts[index].createdAt || normalized.createdAt;
      wallet.bankAccounts.splice(index, 1, normalized);
    } else {
      wallet.bankAccounts.unshift(normalized);
    }

    wallet.updatedAt = normalized.updatedAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-bank-account-saved', {
      detail: { account: clone(normalized), wallet: clone(saved) }
    }));
    return Promise.resolve({ account: clone(normalized), wallet: clone(saved) });
  }


  function getBankDestination(account) {
    if (!account) return 'Conta não cadastrada';
    var bank = normalizeText(account.bankName || 'Banco cadastrado');
    var digits = normalizeText(account.accountNumber).replace(/\D/g, '');
    var tail = digits.slice(-4);
    return bank + (tail ? ' · final ' + tail : '');
  }

  function createWithdrawReference() {
    return 'SAQ-' + Date.now().toString().slice(-6);
  }


  function listDisputes(filters) {
    filters = filters || {};
    var user = filters.currentUser === false ? null : getCurrentUser();
    var wallet = readWallet();
    return clone((wallet.disputes || []).filter(function (dispute) {
      if (filters.currentUser !== false && user && user.id && String(dispute.professionalId || '') !== String(user.id)) return false;
      if (filters.professionalId && String(dispute.professionalId || '') !== String(filters.professionalId)) return false;
      if (filters.transactionId && String(dispute.transactionId || '') !== String(filters.transactionId)) return false;
      if (filters.orderId && String(dispute.orderId || '') !== String(filters.orderId)) return false;
      if (filters.status && String(dispute.status || '') !== String(filters.status)) return false;
      return true;
    }));
  }

  function getOrdersRepository() {
    return Doke.repositories && Doke.repositories.orders;
  }

  function getNotificationsRepository() {
    return Doke.repositories && Doke.repositories.notifications;
  }

  function getDisputeOrderLabel(status, resolution) {
    var normalized = normalizeDisputeStatus(status || '');
    if (normalized === 'em_analise') return 'Em análise';
    if (normalized === 'resolvida_profissional') return 'Repasse liberado';
    if (normalized === 'resolvida_cliente' || normalized === 'reembolsado') return 'Reembolsado ao cliente';
    if (resolution === 'cliente') return 'Reembolsado ao cliente';
    if (resolution === 'profissional') return 'Repasse liberado';
    return 'Em contestação';
  }

  function getDisputeOrderFlow(status, transaction, dispute) {
    var normalized = normalizeDisputeStatus(status || '');
    var title = normalizeText(transaction && transaction.title) || 'este pedido';
    if (normalized === 'em_analise') return 'Pedido em análise financeira. Mantenha os combinados na conversa até a resolução.';
    if (normalized === 'resolvida_profissional') return 'Contestação encerrada. Repasse liberado ao profissional.';
    if (normalized === 'resolvida_cliente' || normalized === 'reembolsado') return 'Contestação encerrada. Cliente reembolsado.';
    return 'Pedido em contestação. O repasse de ' + title + ' fica pausado até a análise ser concluída.';
  }

  function syncOrderDisputeState(transaction, dispute, phase) {
    var orders = getOrdersRepository();
    if (!orders || typeof orders.readLocal !== 'function' || typeof orders.writeLocal !== 'function') return null;
    var orderId = normalizeText(dispute && dispute.orderId || transaction && transaction.orderId || '');
    if (!orderId) return null;
    var local = orders.readLocal();
    var changed = null;
    var next = (Array.isArray(local) ? local : []).map(function (order) {
      if (String(order.id || '') !== String(orderId)) return order;
      var status = normalizeDisputeStatus(dispute && dispute.status || transaction && transaction.disputeStatus || 'contestacao_aberta');
      var resolution = normalizeText(dispute && dispute.resolution || '');
      changed = Object.assign({}, order, {
        disputeId: dispute && dispute.id || transaction && transaction.disputeId || '',
        disputeStatus: status,
        disputeReason: dispute && dispute.reason || transaction && transaction.note || '',
        disputeResolution: resolution,
        disputeResponseText: dispute && (dispute.responseText || dispute.professionalResponse) || order.disputeResponseText || '',
        disputeResponseAt: dispute && (dispute.responseAt || dispute.professionalResponseAt) || order.disputeResponseAt || '',
        disputeRespondedBy: dispute && (dispute.respondedBy || dispute.professionalResponseBy) || order.disputeRespondedBy || '',
        statusLabel: getDisputeOrderLabel(status, resolution),
        detailFlow: getDisputeOrderFlow(status, transaction, dispute),
        updatedAt: dispute && (dispute.updatedAt || dispute.resolvedAt) || transaction && transaction.updatedAt || nowIso()
      });
      return changed;
    });
    if (!changed) return null;
    orders.writeLocal(next);
    document.dispatchEvent(new CustomEvent('doke:order-dispute-synced', {
      detail: { order: clone(changed), dispute: clone(dispute), transaction: clone(transaction), phase: phase || '' }
    }));
    return clone(changed);
  }


  function createDisputeResponseNotification(transaction, dispute) {
    var notifications = getNotificationsRepository();
    if (!notifications || typeof notifications.create !== 'function' || !transaction || !dispute) return Promise.resolve(null);
    var clientId = normalizeText(dispute.clientId || transaction.clientId || '');
    if (!clientId) return Promise.resolve(null);
    return notifications.create({
      type: 'order_dispute_response',
      category: 'orders',
      userId: clientId,
      actorId: normalizeProfessionalId(dispute.professionalId || transaction.professionalId || transaction.userId || ''),
      actorName: 'Doke Financeiro',
      orderId: dispute.orderId || transaction.orderId || '',
      conversationId: dispute.conversationId || transaction.conversationId || '',
      messageId: dispute.messageId || transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      eventKey: ['order_dispute_response', dispute.id || '', clientId, dispute.responseAt || Date.now().toString(36)].filter(Boolean).join(':'),
      title: 'Resposta enviada pelo profissional',
      body: 'O profissional respondeu à contestação. Acompanhe a conversa até a análise ser concluída.',
      targetUrl: dispute.conversationId || transaction.conversationId
        ? 'mensagens.html?conversation=' + encodeURIComponent(dispute.conversationId || transaction.conversationId || '')
        : 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || ''),
      actionLabel: 'Abrir conversa',
      read: false
    }).catch(function (error) {
      console.warn('[DokeWallet:disputeResponseNotification]', error);
      return null;
    });
  }

  function createDisputeNotification(transaction, dispute, phase) {
    var notifications = getNotificationsRepository();
    if (!notifications || typeof notifications.create !== 'function' || !transaction || !dispute) return Promise.resolve(null);
    var status = normalizeDisputeStatus(dispute.status || '');
    var userId = normalizeProfessionalId(dispute.professionalId || transaction.professionalId || transaction.userId || '');
    var title = 'Pedido em contestação';
    var body = 'Um pedido entrou em contestação. O repasse ficará pausado até a análise.';
    var actionLabel = 'Ver pedido';
    var targetUrl = 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || '');

    if (phase === 'resolved') {
      title = 'Contestação encerrada';
      if (status === 'resolvida_cliente' || status === 'reembolsado' || dispute.resolution === 'cliente') {
        body = 'Contestação encerrada. Cliente reembolsado.';
      } else {
        body = 'Contestação encerrada. Repasse liberado ao profissional.';
        targetUrl = 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1';
        actionLabel = 'Ver comprovante';
      }
    } else if (status === 'em_analise') {
      title = 'Pedido em análise';
      body = 'Um pedido está em análise financeira. Mantenha a conversa centralizada até a resolução.';
    }

    var notificationsToCreate = [{
      type: phase === 'resolved' ? 'order_dispute_resolved' : 'order_dispute_opened',
      category: 'orders',
      userId: userId || DEMO_PROFESSIONAL_ID,
      actorId: dispute.clientId || transaction.clientId || '',
      actorName: 'Doke Financeiro',
      orderId: dispute.orderId || transaction.orderId || '',
      conversationId: dispute.conversationId || transaction.conversationId || '',
      messageId: dispute.messageId || transaction.messageId || '',
      serviceId: transaction.serviceId || '',
      eventKey: [phase === 'resolved' ? 'order_dispute_resolved' : 'order_dispute_opened', dispute.id || '', userId || DEMO_PROFESSIONAL_ID].filter(Boolean).join(':'),
      title: title,
      body: body,
      targetUrl: targetUrl,
      actionLabel: actionLabel,
      read: false
    }];

    var clientId = normalizeText(dispute.clientId || transaction.clientId || '');
    if (clientId) {
      var clientTitle = phase === 'resolved' ? 'Contestação encerrada' : 'Relato enviado';
      var clientBody = phase === 'resolved'
        ? (status === 'resolvida_cliente' || status === 'reembolsado' || dispute.resolution === 'cliente'
          ? 'Contestação encerrada. Cliente reembolsado.'
          : 'Contestação encerrada. Repasse liberado ao profissional.')
        : 'Seu relato foi enviado. O pedido entrou em análise e a conversa ficará centralizada até a resolução.';
      notificationsToCreate.push({
        type: phase === 'resolved' ? 'order_dispute_resolved' : 'order_dispute_reported',
        category: 'orders',
        userId: clientId,
        actorId: userId || DEMO_PROFESSIONAL_ID,
        actorName: 'Doke Financeiro',
        orderId: dispute.orderId || transaction.orderId || '',
        conversationId: dispute.conversationId || transaction.conversationId || '',
        messageId: dispute.messageId || transaction.messageId || '',
        serviceId: transaction.serviceId || '',
        eventKey: [phase === 'resolved' ? 'order_dispute_client_resolved' : 'order_dispute_client_reported', dispute.id || '', clientId].filter(Boolean).join(':'),
        title: clientTitle,
        body: clientBody,
        targetUrl: dispute.conversationId || transaction.conversationId
          ? 'mensagens.html?conversation=' + encodeURIComponent(dispute.conversationId || transaction.conversationId || '')
          : 'pedidos.html?order=' + encodeURIComponent(dispute.orderId || transaction.orderId || ''),
        actionLabel: 'Abrir conversa',
        read: false
      });
    }

    return Promise.all(notificationsToCreate.map(function (notification) {
      return notifications.create(notification);
    })).catch(function (error) {
      console.warn('[DokeWallet:disputeNotification]', error);
      return null;
    });
  }

  function openDispute(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var transactionIndex = findTransactionIndex(wallet, payload);
    if (transactionIndex < 0) return Promise.reject(new Error('Recebível não encontrado.'));
    var transaction = wallet.transactions[transactionIndex];
    var existingIndex = (wallet.disputes || []).findIndex(function (dispute) {
      return (String(dispute.transactionId || '') === String(transaction.id || '') || (transaction.orderId && String(dispute.orderId || '') === String(transaction.orderId)))
        && isDisputeOpen(dispute);
    });
    if (existingIndex >= 0) {
      return Promise.resolve({ dispute: clone(wallet.disputes[existingIndex]), transaction: clone(transaction), created: false, wallet: clone(wallet) });
    }
    var createdAt = nowIso();
    var dispute = normalizeDispute({
      transactionId: transaction.id || '',
      orderId: transaction.orderId || payload.orderId || '',
      messageId: transaction.messageId || payload.messageId || '',
      conversationId: transaction.conversationId || payload.conversationId || '',
      professionalId: transaction.professionalId || transaction.userId || payload.professionalId || '',
      clientId: transaction.clientId || payload.clientId || '',
      reason: payload.reason || 'Cliente contestou o pedido.',
      reasonCode: payload.reasonCode || payload.category || '',
      openedBy: payload.openedBy || 'cliente',
      status: payload.status || 'contestacao_aberta',
      createdAt: createdAt,
      updatedAt: createdAt
    });
    var updated = normalizeTransaction(Object.assign({}, transaction, {
      releaseStatus: 'contestacao',
      disputeStatus: dispute.status,
      disputeId: dispute.id,
      note: dispute.reason || 'Pedido contestado. Repasse pausado até resolução.',
      updatedAt: createdAt
    }));
    wallet.transactions[transactionIndex] = updated;
    wallet.disputes.unshift(dispute);
    wallet.updatedAt = createdAt;
    var saved = writeWallet(wallet);
    syncOrderDisputeState(updated, dispute, 'opened');
    createDisputeNotification(updated, dispute, 'opened');
    document.dispatchEvent(new CustomEvent('doke:wallet-dispute-opened', {
      detail: { dispute: clone(dispute), transaction: clone(updated), wallet: clone(saved) }
    }));
    return Promise.resolve({ dispute: clone(dispute), transaction: clone(updated), created: true, wallet: clone(saved) });
  }


  function respondDispute(payload) {
    payload = payload || {};
    var responseText = normalizeText(payload.responseText || payload.replyText || payload.message || '');
    if (!responseText) return Promise.reject(new Error('Escreva uma resposta para a contestação.'));
    var wallet = readWallet();
    var disputeId = normalizeText(payload.disputeId || payload.id || '');
    var disputeIndex = (wallet.disputes || []).findIndex(function (dispute) {
      if (disputeId && String(dispute.id || '') === String(disputeId)) return true;
      if (payload.transactionId && String(dispute.transactionId || '') === String(payload.transactionId)) return true;
      if (payload.orderId && String(dispute.orderId || '') === String(payload.orderId)) return true;
      return false;
    });
    if (disputeIndex < 0) return Promise.reject(new Error('Contestação não encontrada.'));
    var dispute = wallet.disputes[disputeIndex];
    var transactionIndex = findTransactionIndex(wallet, { transactionId: dispute.transactionId, orderId: dispute.orderId, messageId: dispute.messageId });
    if (transactionIndex < 0) return Promise.reject(new Error('Recebível vinculado não encontrado.'));
    var transaction = wallet.transactions[transactionIndex];
    var respondedAt = nowIso();
    var user = getCurrentUser() || {};
    var updatedDispute = normalizeDispute(Object.assign({}, dispute, {
      status: normalizeDisputeStatus(dispute.status || 'contestacao_aberta') === 'contestacao_aberta' ? 'em_analise' : dispute.status,
      responseText: responseText,
      responseAt: respondedAt,
      respondedBy: payload.respondedBy || user.id || dispute.professionalId || transaction.professionalId || '',
      updatedAt: respondedAt
    }));
    var updatedTransaction = normalizeTransaction(Object.assign({}, transaction, {
      releaseStatus: 'contestacao',
      disputeStatus: updatedDispute.status,
      disputeId: updatedDispute.id,
      note: 'Resposta do profissional registrada. Repasse pausado até conclusão da análise.',
      updatedAt: respondedAt
    }));
    wallet.disputes[disputeIndex] = updatedDispute;
    wallet.transactions[transactionIndex] = updatedTransaction;
    wallet.updatedAt = respondedAt;
    var saved = writeWallet(wallet);
    syncOrderDisputeState(updatedTransaction, updatedDispute, 'response');
    createDisputeResponseNotification(updatedTransaction, updatedDispute);
    document.dispatchEvent(new CustomEvent('doke:wallet-dispute-responded', {
      detail: { dispute: clone(updatedDispute), transaction: clone(updatedTransaction), wallet: clone(saved) }
    }));
    return Promise.resolve({ dispute: clone(updatedDispute), transaction: clone(updatedTransaction), updated: true, wallet: clone(saved) });
  }

  function resolveDispute(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var disputeId = normalizeText(payload.disputeId || payload.id || '');
    var disputeIndex = (wallet.disputes || []).findIndex(function (dispute) {
      if (disputeId && String(dispute.id || '') === String(disputeId)) return true;
      if (payload.transactionId && String(dispute.transactionId || '') === String(payload.transactionId)) return true;
      if (payload.orderId && String(dispute.orderId || '') === String(payload.orderId)) return true;
      return false;
    });
    if (disputeIndex < 0) return Promise.reject(new Error('Disputa não encontrada.'));
    var dispute = wallet.disputes[disputeIndex];
    var transactionIndex = findTransactionIndex(wallet, { transactionId: dispute.transactionId, orderId: dispute.orderId, messageId: dispute.messageId });
    if (transactionIndex < 0) return Promise.reject(new Error('Recebível vinculado não encontrado.'));
    var transaction = wallet.transactions[transactionIndex];
    var resolution = normalizeRepasseCode(payload.resolution || payload.status || '');
    var resolvedForClient = resolution === 'cliente' || resolution === 'client' || resolution === 'resolvida_cliente' || resolution === 'refund' || resolution === 'reembolsado';
    var nextStatus = resolvedForClient ? 'reembolsado' : 'resolvida_profissional';
    var resolvedAt = nowIso();
    var updatedDispute = normalizeDispute(Object.assign({}, dispute, {
      status: nextStatus,
      resolution: resolvedForClient ? 'cliente' : 'profissional',
      resolvedAt: resolvedAt,
      updatedAt: resolvedAt
    }));
    var updatedTransaction;
    if (resolvedForClient) {
      var refundAmount = Math.abs(parseAmount(transaction.netAmount != null ? transaction.netAmount : transaction.amount));
      updatedTransaction = normalizeTransaction(Object.assign({}, transaction, {
        type: 'refund',
        status: 'refunded',
        releaseStatus: 'reembolsado',
        disputeStatus: 'reembolsado',
        disputeId: updatedDispute.id,
        title: 'Reembolso ao cliente',
        description: 'Contestação encerrada com reembolso ao cliente',
        note: 'Contestação encerrada. Cliente reembolsado.',
        grossAmount: transaction.grossAmount || refundAmount,
        feeAmount: transaction.feeAmount || 0,
        netAmount: -refundAmount,
        amount: -refundAmount,
        actionLabel: 'Ver comprovante',
        targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
        updatedAt: resolvedAt,
        completedAt: resolvedAt
      }));
    } else {
      updatedTransaction = normalizeTransaction(Object.assign({}, transaction, {
        status: 'available',
        releaseStatus: 'liberado',
        disputeStatus: 'resolvida_profissional',
        disputeId: updatedDispute.id,
        description: 'Contestação encerrada com repasse liberado',
        note: 'Contestação encerrada. Repasse liberado ao profissional.',
        actionLabel: 'Ver comprovante',
        targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
        availableAt: resolvedAt,
        updatedAt: resolvedAt
      }));
    }
    wallet.disputes[disputeIndex] = updatedDispute;
    wallet.transactions[transactionIndex] = updatedTransaction;
    appendAuditEvent(wallet, {
      type: 'admin_dispute_resolution',
      action: resolvedForClient ? 'refund_client' : 'release_professional',
      actorId: normalizeText(payload.actorId || (getCurrentUser() || {}).id || ''),
      actorRole: normalizeText(payload.actorRole || (getCurrentUser() || {}).role || 'support'),
      actorName: normalizeText(payload.actorName || (getCurrentUser() || {}).name || 'Suporte Doke'),
      transactionId: updatedTransaction.id,
      disputeId: updatedDispute.id,
      orderId: updatedTransaction.orderId || updatedDispute.orderId,
      title: resolvedForClient ? 'Contestação reembolsada pelo suporte' : 'Repasse liberado pelo suporte',
      body: updatedTransaction.note,
      reason: normalizeText(payload.reason || ''),
      targetUrl: updatedTransaction.targetUrl,
      receiptUrl: 'carteira.html?transaction=' + encodeURIComponent(updatedTransaction.id || '') + '&receipt=1',
      createdAt: resolvedAt,
      updatedAt: resolvedAt
    });
    wallet.updatedAt = resolvedAt;
    var saved = writeWallet(wallet);
    syncOrderDisputeState(updatedTransaction, updatedDispute, 'resolved');
    createDisputeNotification(updatedTransaction, updatedDispute, 'resolved');
    document.dispatchEvent(new CustomEvent('doke:wallet-dispute-resolved', {
      detail: { dispute: clone(updatedDispute), transaction: clone(updatedTransaction), wallet: clone(saved) }
    }));
    return Promise.resolve({ dispute: clone(updatedDispute), transaction: clone(updatedTransaction), updated: true, wallet: clone(saved) });
  }


  function listAuditEvents(filters) {
    filters = filters || {};
    var wallet = readWallet();
    var user = filters.currentUser === false ? null : getCurrentUser();
    var query = normalizeSearchValue(filters.query || filters.search || '');
    return clone((wallet.auditEvents || []).filter(function (event) {
      if (filters.currentUser !== false && user && user.id && event.actorId && String(event.actorId) !== String(user.id)) return false;
      if (filters.transactionId && String(event.transactionId || '') !== String(filters.transactionId)) return false;
      if (filters.disputeId && String(event.disputeId || '') !== String(filters.disputeId)) return false;
      if (filters.orderId && String(event.orderId || '') !== String(filters.orderId)) return false;
      if (!query) return true;
      var haystack = [event.title, event.body, event.reason, event.action, event.transactionId, event.disputeId, event.orderId, event.actorName].map(normalizeSearchValue).join(' ');
      return haystack.indexOf(query) >= 0;
    }));
  }

  function requestWithdraw(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var user = getCurrentUser() || {};
    var ownerId = normalizeProfessionalId(payload.ownerId || payload.professionalId || payload.userId || user.id || '');
    var amount = roundCurrency(parseAmount(payload.amount));

    if (!amount || amount <= 0) {
      return Promise.reject(new Error('Informe um valor válido para saque.'));
    }

    var account = wallet.bankAccounts.find(function (item) {
      return String(item.ownerId || item.userId) === String(ownerId);
    });

    if (!account) {
      return Promise.reject(new Error('Cadastre uma conta bancária antes de sacar.'));
    }

    var summary = getSummary({ currentUser: false, professionalId: ownerId });
    var available = roundCurrency(summary.available || 0);
    if (amount > available) {
      return Promise.reject(new Error('Valor acima do saldo disponível.'));
    }

    var createdAt = nowIso();
    var destination = getBankDestination(account);
    var normalized = normalizeTransaction({
      id: createTransactionId(),
      type: 'withdraw',
      source: 'wallet-withdraw',
      status: 'processing',
      userId: ownerId,
      professionalId: ownerId,
      eventKey: ['wallet_withdraw', ownerId, Date.now().toString(36)].join(':'),
      grossAmount: amount,
      feeAmount: 0,
      netAmount: amount,
      amount: amount,
      title: 'Saque solicitado',
      description: destination + ' · agora',
      reference: createWithdrawReference(),
      method: destination,
      note: 'Transferência solicitada para a conta de recebimento cadastrada.',
      actionLabel: 'Acompanhar saque',
      targetUrl: 'carteira.html',
      createdAt: createdAt,
      availableAt: createdAt,
      updatedAt: createdAt
    });

    wallet.transactions.unshift(normalized);
    wallet.updatedAt = normalized.updatedAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-withdraw-requested', {
      detail: { transaction: clone(normalized), account: clone(account), wallet: clone(saved) }
    }));
    return Promise.resolve({ transaction: clone(normalized), account: clone(account), created: true, wallet: clone(saved) });
  }


  function completeWithdraw(payload) {
    payload = payload || {};
    var transactionId = normalizeText(payload.transactionId || payload.id || '');
    var wallet = readWallet();
    var user = getCurrentUser() || {};
    var ownerId = normalizeProfessionalId(payload.ownerId || payload.professionalId || payload.userId || user.id || '');

    if (!transactionId) {
      return Promise.reject(new Error('Saque não identificado.'));
    }

    var transactionIndex = wallet.transactions.findIndex(function (transaction) {
      return String(transaction.id || '') === String(transactionId)
        && transaction.type === 'withdraw'
        && String(transaction.professionalId || transaction.userId || '') === String(ownerId);
    });

    if (transactionIndex < 0) {
      return Promise.reject(new Error('Saque não encontrado.'));
    }

    var transaction = wallet.transactions[transactionIndex];
    if (transaction.status === 'completed') {
      return Promise.resolve({ transaction: clone(transaction), updated: false, wallet: clone(wallet) });
    }

    if (transaction.status !== 'processing') {
      return Promise.reject(new Error('Este saque não está em processamento.'));
    }

    var completedAt = nowIso();
    var updated = normalizeTransaction(Object.assign({}, transaction, {
      status: 'completed',
      title: 'Saque concluído',
      description: transaction.method ? transaction.method + ' · concluído' : 'Saque concluído',
      note: 'Transferência concluída para a conta de recebimento cadastrada.',
      actionLabel: 'Ver comprovante',
      completedAt: completedAt,
      updatedAt: completedAt
    }));

    wallet.transactions[transactionIndex] = updated;
    wallet.updatedAt = completedAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-withdraw-completed', {
      detail: { transaction: clone(updated), wallet: clone(saved) }
    }));
    return Promise.resolve({ transaction: clone(updated), updated: true, wallet: clone(saved) });
  }

  function resolveWithdraw(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var transactionId = normalizeText(payload.transactionId || payload.id || '');
    var action = normalizeRepasseCode(payload.action || payload.status || payload.resolution || 'approve');
    var isReject = action === 'reject' || action === 'recusar' || action === 'decline' || action === 'declined' || action === 'rejected';
    var isApprove = action === 'approve' || action === 'aprovar' || action === 'complete' || action === 'completed' || action === 'concluir';
    var transactionIndex = wallet.transactions.findIndex(function (transaction) {
      return String(transaction.id || '') === String(transactionId) && transaction.type === 'withdraw';
    });

    if (!transactionId) return Promise.reject(new Error('Saque não identificado.'));
    if (transactionIndex < 0) return Promise.reject(new Error('Saque não encontrado.'));
    if (!isReject && !isApprove) return Promise.reject(new Error('Ação de saque inválida.'));

    var transaction = wallet.transactions[transactionIndex];
    if (transaction.status !== 'processing') {
      return Promise.resolve({ transaction: clone(transaction), updated: false, wallet: clone(wallet) });
    }

    var resolvedAt = nowIso();
    var user = getCurrentUser() || {};
    var reason = normalizeText(payload.reason || payload.adminReason || '');
    var updated = normalizeTransaction(Object.assign({}, transaction, {
      status: isReject ? 'declined' : 'completed',
      title: isReject ? 'Saque recusado' : 'Saque concluído',
      description: isReject ? 'Saque recusado pelo suporte mock' : (transaction.method ? transaction.method + ' · concluído' : 'Saque concluído'),
      note: isReject ? (reason || 'Saque recusado pelo suporte mock. Revise os dados bancários e solicite novamente.') : 'Transferência concluída para a conta de recebimento cadastrada.',
      adminReason: reason,
      resolvedBy: normalizeText(payload.actorId || user.id || ''),
      actionLabel: 'Ver comprovante',
      targetUrl: 'carteira.html?transaction=' + encodeURIComponent(transaction.id || '') + '&receipt=1',
      completedAt: isReject ? transaction.completedAt || '' : resolvedAt,
      declinedAt: isReject ? resolvedAt : transaction.declinedAt || '',
      updatedAt: resolvedAt
    }));

    wallet.transactions[transactionIndex] = updated;
    appendAuditEvent(wallet, {
      type: 'admin_withdraw_resolution',
      action: isReject ? 'decline_withdraw' : 'approve_withdraw',
      actorId: normalizeText(payload.actorId || user.id || ''),
      actorRole: normalizeText(payload.actorRole || user.role || 'support'),
      actorName: normalizeText(payload.actorName || user.name || 'Suporte Doke'),
      transactionId: updated.id,
      title: isReject ? 'Saque recusado pelo suporte' : 'Saque aprovado pelo suporte',
      body: updated.note,
      reason: reason,
      targetUrl: updated.targetUrl,
      receiptUrl: 'carteira.html?transaction=' + encodeURIComponent(updated.id || '') + '&receipt=1',
      createdAt: resolvedAt,
      updatedAt: resolvedAt
    });
    wallet.updatedAt = resolvedAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-withdraw-resolved', {
      detail: { transaction: clone(updated), action: isReject ? 'declined' : 'completed', wallet: clone(saved) }
    }));
    return Promise.resolve({ transaction: clone(updated), action: isReject ? 'declined' : 'completed', updated: true, wallet: clone(saved) });
  }


  repositories.wallet = Object.freeze({
    storageKey: STORAGE_KEY,
    normalizeTransaction: normalizeTransaction,
    normalizeBankAccount: normalizeBankAccount,
    readWallet: readWallet,
    writeWallet: writeWallet,
    listTransactions: listTransactions,
    getSummary: getSummary,
    getMonthlyDashboard: getMonthlyDashboard,
    getMonthlyHistory: getMonthlyHistory,
    getReceivablesSchedule: getReceivablesSchedule,
    getBankAccount: getBankAccount,
    saveBankAccount: saveBankAccount,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    resolveWithdraw: resolveWithdraw,
    listAuditEvents: listAuditEvents,
    listDisputes: listDisputes,
    openDispute: openDispute,
    respondDispute: respondDispute,
    resolveDispute: resolveDispute,
    registerReceivable: registerReceivable
  });
})();
/* Doke Payments Repository
   Responsibility: local/mock persistence boundary for canonical payment records. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.payments.local.v1';
  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return value; }
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function nowIso() {
    return new Date().toISOString();
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

  function normalizeStatus(value) {
    var status = normalizeText(value).toLowerCase();
    var aliases = {
      pending: 'processing',
      confirmed: 'held',
      paid: 'held',
      escrowed: 'held',
      available: 'released'
    };
    return aliases[status] || status || 'processing';
  }

  function getStatusRank(status) {
    var ranks = { failed: 0, processing: 1, held: 2, released: 3, refunded: 3 };
    return ranks[normalizeStatus(status)] == null ? 0 : ranks[normalizeStatus(status)];
  }

  function hashText(value) {
    var text = normalizeText(value);
    var hash = 5381;
    for (var index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
    }
    return (hash >>> 0).toString(36);
  }

  function createPaymentId(eventKey) {
    return 'payment_' + hashText(eventKey || ('payment:' + Date.now().toString(36)));
  }

  function safeRead() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function safeWrite(items) {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : [])); }
    catch (error) { /* localStorage may be unavailable in constrained browser modes. */ }
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

  function canAccess(payment, actor) {
    actor = actor || getCurrentUser() || {};
    if (!actor.id) return false;
    if (['admin', 'support'].indexOf(normalizeText(actor.role).toLowerCase()) !== -1) return true;
    return String(payment.clientId || '') === String(actor.id)
      || String(payment.professionalId || '') === String(actor.id);
  }

  function normalizePayment(raw) {
    raw = raw || {};
    var eventKey = normalizeText(raw.eventKey || [
      'payment_hold',
      raw.orderId || '',
      raw.messageId || raw.chargeMessageId || '',
      raw.clientId || ''
    ].filter(Boolean).join(':'));
    var createdAt = raw.createdAt || nowIso();
    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || createPaymentId(eventKey),
      eventKey: eventKey,
      orderId: normalizeText(raw.orderId || ''),
      conversationId: normalizeText(raw.conversationId || ''),
      messageId: normalizeText(raw.messageId || raw.chargeMessageId || ''),
      chargeMessageId: normalizeText(raw.chargeMessageId || raw.messageId || ''),
      clientId: normalizeText(raw.clientId || ''),
      professionalId: normalizeText(raw.professionalId || raw.providerId || ''),
      amount: roundCurrency(parseAmount(raw.amount || raw.chargedAmount || raw.grossAmount || 0)),
      chargedAmount: roundCurrency(parseAmount(raw.chargedAmount || raw.amount || 0)),
      grossAmount: roundCurrency(parseAmount(raw.grossAmount || raw.amount || 0)),
      discountAmount: roundCurrency(parseAmount(raw.discountAmount || 0)),
      currency: normalizeText(raw.currency || 'BRL') || 'BRL',
      method: normalizeText(raw.method || raw.paymentMethod || ''),
      status: normalizeStatus(raw.status),
      escrowStatus: normalizeText(raw.escrowStatus || raw.status || 'processing').toLowerCase(),
      walletTransactionId: normalizeText(raw.walletTransactionId || ''),
      createdAt: createdAt,
      updatedAt: raw.updatedAt || createdAt
    });
  }

  function readLocal() {
    return clone(safeRead().map(normalizePayment));
  }

  function writeLocal(items) {
    var normalized = (Array.isArray(items) ? items : []).map(normalizePayment);
    safeWrite(normalized);
    return clone(normalized);
  }

  function list(filters) {
    filters = filters || {};
    var actor = filters.currentUser === false ? null : getCurrentUser();
    var items = readLocal().filter(function (payment) {
      if (actor && !canAccess(payment, actor)) return false;
      if (!actor && filters.currentUser !== false) return false;
      if (filters.orderId && String(payment.orderId) !== String(filters.orderId)) return false;
      if (filters.messageId && String(payment.messageId) !== String(filters.messageId)) return false;
      if (filters.status && normalizeStatus(payment.status) !== normalizeStatus(filters.status)) return false;
      return true;
    });
    return Promise.resolve(clone(items));
  }

  function findLocal(predicate) {
    return readLocal().find(predicate) || null;
  }

  function getById(id) {
    var payment = findLocal(function (item) { return String(item.id) === String(id || ''); });
    if (payment && !canAccess(payment)) return Promise.reject(new Error('Você não tem permissão para acessar este pagamento.'));
    return Promise.resolve(clone(payment));
  }

  function getByEventKey(eventKey) {
    var payment = findLocal(function (item) { return String(item.eventKey) === String(eventKey || ''); });
    if (payment && !canAccess(payment)) return Promise.reject(new Error('Você não tem permissão para acessar este pagamento.'));
    return Promise.resolve(clone(payment));
  }

  function getByOrderId(orderId) {
    var matches = readLocal().filter(function (item) { return String(item.orderId) === String(orderId || ''); });
    matches.sort(function (left, right) {
      return String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''));
    });
    var payment = matches[0] || null;
    if (payment && !canAccess(payment)) return Promise.reject(new Error('Você não tem permissão para acessar este pagamento.'));
    return Promise.resolve(clone(payment));
  }

  function save(payment) {
    var normalized = normalizePayment(payment);
    var actor = getCurrentUser() || {};
    if (!canAccess(normalized, actor)) return Promise.reject(new Error('Você não tem permissão para alterar este pagamento.'));

    var items = readLocal();
    var index = items.findIndex(function (item) {
      return String(item.id) === String(normalized.id)
        || Boolean(normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey));
    });
    var previous = index >= 0 ? items[index] : null;

    if (previous && getStatusRank(normalized.status) < getStatusRank(previous.status)) {
      return Promise.resolve({ payment: clone(previous), created: false, updated: false });
    }

    var saved = normalizePayment(Object.assign({}, previous || {}, normalized, {
      id: previous && previous.id || normalized.id,
      createdAt: previous && previous.createdAt || normalized.createdAt,
      updatedAt: nowIso()
    }));

    if (index >= 0) items.splice(index, 1, saved);
    else items.unshift(saved);
    writeLocal(items);

    document.dispatchEvent(new CustomEvent(previous ? 'doke:payment-updated' : 'doke:payment-created', {
      detail: { payment: clone(saved), previous: clone(previous) }
    }));
    return Promise.resolve({ payment: clone(saved), created: !previous, updated: Boolean(previous) });
  }

  repositories.payments = Object.freeze({
    storageKey: STORAGE_KEY,
    normalize: normalizePayment,
    createPaymentId: createPaymentId,
    readLocal: readLocal,
    writeLocal: writeLocal,
    list: list,
    getById: getById,
    getByEventKey: getByEventKey,
    getByOrderId: getByOrderId,
    save: save
  });
})();
