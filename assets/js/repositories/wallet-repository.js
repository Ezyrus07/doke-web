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

  function createBankAccountId() {
    return 'wallet_bank_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function safeRead() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) return { transactions: parsed, bankAccounts: [], updatedAt: nowIso() };
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
      return { transactions: [], bankAccounts: [], updatedAt: nowIso() };
    } catch (error) {
      return { transactions: [], bankAccounts: [], updatedAt: nowIso() };
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
    var latestUpdate = transactions.concat(bankAccounts).reduce(function (latest, item) {
      var value = item.updatedAt || item.createdAt || '';
      return value > latest ? value : latest;
    }, wallet.updatedAt || nowIso());

    return {
      version: 1,
      currency: normalizeText(wallet.currency || 'BRL'),
      transactions: transactions.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }),
      bankAccounts: bankAccounts,
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

  repositories.wallet = Object.freeze({
    storageKey: STORAGE_KEY,
    normalizeTransaction: normalizeTransaction,
    normalizeBankAccount: normalizeBankAccount,
    readWallet: readWallet,
    writeWallet: writeWallet,
    listTransactions: listTransactions,
    getSummary: getSummary,
    getBankAccount: getBankAccount,
    saveBankAccount: saveBankAccount,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    registerReceivable: registerReceivable
  });
})();
