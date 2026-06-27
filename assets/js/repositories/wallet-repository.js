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

  function safeRead() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return { transactions: parsed, updatedAt: nowIso() };
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
      return { transactions: [], updatedAt: nowIso() };
    } catch (error) {
      return { transactions: [], updatedAt: nowIso() };
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
    var feeAmount = roundCurrency(parseAmount(raw.feeAmount));
    var netAmount = roundCurrency(raw.netAmount != null ? parseAmount(raw.netAmount) : grossAmount - feeAmount);
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

  function normalizeWallet(wallet) {
    wallet = wallet || {};
    var transactions = Array.isArray(wallet.transactions) ? wallet.transactions.map(normalizeTransaction) : [];
    var latestUpdate = transactions.reduce(function (latest, transaction) {
      var value = transaction.updatedAt || transaction.createdAt || '';
      return value > latest ? value : latest;
    }, wallet.updatedAt || nowIso());

    return {
      version: 1,
      currency: normalizeText(wallet.currency || 'BRL'),
      transactions: transactions.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }),
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
    return clone(wallet.transactions.filter(function (transaction) {
      if (filters.currentUser !== false && user && user.id && String(transaction.professionalId || transaction.userId) !== String(user.id)) return false;
      if (filters.professionalId && String(transaction.professionalId || transaction.userId) !== String(filters.professionalId)) return false;
      if (filters.orderId && String(transaction.orderId) !== String(filters.orderId)) return false;
      if (filters.messageId && String(transaction.messageId) !== String(filters.messageId)) return false;
      if (filters.status && transaction.status !== filters.status) return false;
      if (filters.type && transaction.type !== filters.type) return false;
      return true;
    }));
  }

  function getSummary(filters) {
    var transactions = listTransactions(filters || {});
    return transactions.reduce(function (summary, transaction) {
      var amount = Number(transaction.netAmount || transaction.amount || 0);
      if (transaction.status === 'pending' || transaction.status === 'held') {
        summary.pending += amount;
      } else if (transaction.type === 'withdraw') {
        summary.withdrawals += Math.abs(amount);
        summary.available -= Math.abs(amount);
      } else if (transaction.type === 'fee') {
        summary.fees += Math.abs(amount);
        summary.available -= Math.abs(amount);
      } else {
        summary.available += amount;
        summary.income += amount;
      }
      summary.total += amount;
      return summary;
    }, { available: 0, pending: 0, income: 0, withdrawals: 0, fees: 0, total: 0 });
  }

  function registerReceivable(payload) {
    payload = payload || {};
    var wallet = readWallet();
    var normalized = normalizeTransaction(Object.assign({}, payload, {
      type: 'receivable',
      status: payload.status || 'available'
    }));
    var existing = wallet.transactions.find(function (transaction) {
      return transaction.eventKey && String(transaction.eventKey) === String(normalized.eventKey);
    });

    if (existing) {
      return Promise.resolve({ transaction: clone(existing), created: false, wallet: clone(wallet) });
    }

    wallet.transactions.unshift(normalized);
    wallet.updatedAt = normalized.createdAt;
    var saved = writeWallet(wallet);
    document.dispatchEvent(new CustomEvent('doke:wallet-receivable-created', {
      detail: { transaction: clone(normalized), wallet: clone(saved) }
    }));
    return Promise.resolve({ transaction: clone(normalized), created: true, wallet: clone(saved) });
  }

  repositories.wallet = Object.freeze({
    storageKey: STORAGE_KEY,
    normalizeTransaction: normalizeTransaction,
    readWallet: readWallet,
    writeWallet: writeWallet,
    listTransactions: listTransactions,
    getSummary: getSummary,
    registerReceivable: registerReceivable
  });
})();
