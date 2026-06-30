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

  function isReceivableType(type) {
    return normalizeText(type || 'receivable') !== 'withdraw' && normalizeText(type || 'receivable') !== 'fee';
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
      if (transaction.status === 'pending' || transaction.status === 'held') {
        summary.pending += amount;
        if (transaction.type !== 'withdraw' && transaction.type !== 'fee') summary.fees += Math.abs(feeAmount);
      } else if (transaction.type === 'withdraw') {
        summary.withdrawals += Math.abs(amount);
        summary.available -= Math.abs(amount);
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
    }, { available: 0, pending: 0, income: 0, withdrawals: 0, fees: 0, total: 0 });
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
      var grossAmount = roundCurrency(parseAmount(transaction.grossAmount != null ? transaction.grossAmount : transaction.amount));
      var netAmount = roundCurrency(parseAmount(transaction.netAmount != null ? transaction.netAmount : transaction.amount));
      var feeAmount = roundCurrency(parseAmount(transaction.feeAmount));
      var movementAmount = Math.abs(type === 'withdraw' ? netAmount : grossAmount || netAmount);
      var bucketIndex = findDashboardBucketIndex(buckets, getTransactionDate(transaction));
      var bucket = bucketIndex >= 0 ? buckets[bucketIndex] : null;

      if (type === 'withdraw') {
        summary.withdrawals += Math.abs(netAmount);
        summary.withdrawalsCount += 1;
        if (bucket) bucket.withdrawals += Math.abs(netAmount);
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
      return transaction.type === 'withdraw' && transaction.status === 'processing'
        ? total + Math.abs(Number(transaction.netAmount || transaction.amount || 0))
        : total;
    }, 0));
    dashboard.grossIncome = roundCurrency(dashboard.grossIncome);
    dashboard.netIncome = roundCurrency(dashboard.netIncome);
    dashboard.availableIncome = roundCurrency(dashboard.availableIncome);
    dashboard.heldIncome = roundCurrency(dashboard.heldIncome);
    dashboard.withdrawals = roundCurrency(dashboard.withdrawals);
    dashboard.fees = roundCurrency(dashboard.fees);
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
    getMonthlyDashboard: getMonthlyDashboard,
    getBankAccount: getBankAccount,
    saveBankAccount: saveBankAccount,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    registerReceivable: registerReceivable
  });
})();
