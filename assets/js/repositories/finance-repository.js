/* Doke Finance Repository
   Canonical Supabase-first adapter for payments, escrow ledger and wallet state.
   The legacy wallet-repository remains the local development fallback/cache. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var localWallet = repositories.wallet;
  var localPayments = repositories.payments;

  if (!localWallet || !localPayments) return;

  var WALLET_PROVIDER_ATTRIBUTE = 'data-doke-wallet-provider';
  var PAYMENTS_PROVIDER_ATTRIBUTE = 'data-doke-payments-provider';
  var FINANCE_PROVIDER_ATTRIBUTE = 'data-doke-finance-provider';
  var PAYMENTS_TABLE = 'payments';
  var TRANSACTIONS_TABLE = 'transactions';
  var WALLETS_TABLE = 'wallets';
  var BANK_ACCOUNTS_TABLE = 'wallet_bank_accounts';
  var DISPUTES_TABLE = 'payment_disputes';
  var AUDIT_TABLE = 'admin_audit_events';
  var FINANCIAL_OPERATIONS_FUNCTION = 'financial-operations';
  var FINANCE_SANDBOX_FUNCTION = 'staging-finance-sandbox';
  var FINANCE_SANDBOX_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';

  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastRemoteError = null;
  var walletLoadPromise = null;
  var paymentsLoadPromise = null;

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

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function toCents(value) {
    var amount = Number(value || 0);
    if (!Number.isFinite(amount)) amount = 0;
    return Math.max(0, Math.round(amount * 100));
  }

  function fromCents(value) {
    var cents = Number(value || 0);
    if (!Number.isFinite(cents)) cents = 0;
    return Math.round(cents) / 100;
  }

  function getSessionUser() {
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

  function hasAuthenticatedUuidSession() {
    var user = getSessionUser() || {};
    return isUuid(user.id);
  }

  function authenticatedAuthorityError(operation, cause) {
    var error = financialServerAuthorityError(operation);
    if (cause) {
      error.cause = cause;
      error.remoteCode = normalizeText(cause.code || cause.name || '');
    }
    return error;
  }

  function isSupportOrAdmin(user) {
    var role = normalizeText(user && user.role).toLowerCase();
    return role === 'support' || role === 'admin';
  }

  function setProviderState(provider) {
    try {
      document.documentElement.setAttribute(WALLET_PROVIDER_ATTRIBUTE, provider);
      document.documentElement.setAttribute(PAYMENTS_PROVIDER_ATTRIBUTE, provider);
      document.documentElement.setAttribute(FINANCE_PROVIDER_ATTRIBUTE, provider);
    } catch (error) {
      // Non-browser tests may not expose documentElement.
    }
  }

  function warnRemote(error, context) {
    lastRemoteError = error || new Error('Falha desconhecida no domínio financeiro remoto.');
    setProviderState('local-fallback');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke finance repository] Supabase indisponível em ' + context + '. Usando simulação local.', error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.walletEnabled === false || config.paymentsEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState('local');
      return null;
    }
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function getCurrentSupabaseUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') return Promise.resolve(null);
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function sanitizeMetadata(value) {
    var metadata = clone(value || {});
    [
      'remoteId', 'syncError', 'syncStatus', 'syncedAt', 'dataUrl', 'downloadUrl',
      'cardNumber', 'cardCvv', 'securityCode'
    ].forEach(function (key) { delete metadata[key]; });
    return metadata;
  }

  function remoteTransactionType(value) {
    var type = normalizeText(value).toLowerCase();
    if (type === 'payout') return 'withdraw';
    if (type === 'refund') return 'refund';
    if (type === 'platform_fee') return 'fee';
    return 'receivable';
  }

  function localTransactionStatus(value) {
    var status = normalizeText(value).toLowerCase();
    if (status === 'succeeded') return 'completed';
    return status || 'pending';
  }

  function mapRemoteTransaction(row) {
    row = row || {};
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    return localWallet.normalizeTransaction(Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      type: remoteTransactionType(row.type),
      status: localTransactionStatus(row.status),
      professionalId: metadata.professionalId || row.professional_id || row.wallet_user_id,
      userId: metadata.userId || row.wallet_user_id,
      clientId: metadata.clientId || row.client_id || '',
      orderId: metadata.orderId || row.order_id || '',
      conversationId: metadata.conversationId || row.conversation_id || '',
      messageId: metadata.messageId || row.message_id || '',
      serviceId: metadata.serviceId || row.service_id || '',
      paymentId: metadata.paymentId || row.payment_id || '',
      eventKey: row.event_key || metadata.eventKey || '',
      grossAmount: fromCents(row.gross_amount_cents || row.amount_cents),
      feeAmount: fromCents(row.fee_amount_cents),
      netAmount: fromCents(row.net_amount_cents || row.amount_cents),
      amount: fromCents(row.net_amount_cents || row.amount_cents),
      currency: row.currency || metadata.currency || 'BRL',
      releaseStatus: row.release_status || metadata.releaseStatus || '',
      createdAt: row.created_at || metadata.createdAt,
      availableAt: row.available_at || metadata.availableAt,
      completedAt: row.completed_at || metadata.completedAt,
      updatedAt: row.updated_at || metadata.updatedAt,
      syncStatus: 'synced',
      syncedAt: nowIso()
    }));
  }

  function mapRemoteBankAccount(row) {
    if (!row) return null;
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    return localWallet.normalizeBankAccount(Object.assign({}, metadata, {
      id: metadata.id || 'wallet_bank_' + String(row.user_id || '').slice(0, 12),
      remoteId: row.user_id,
      ownerId: row.user_id,
      userId: row.user_id,
      holderName: row.account_holder,
      bankName: row.bank_name,
      bankCode: row.bank_code,
      agency: row.branch,
      accountNumber: row.account_number,
      accountType: row.account_type,
      pixKey: row.pix_key,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: 'synced'
    }));
  }

  function mapRemoteDispute(row) {
    row = row || {};
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    var statusMap = {
      open: 'contestacao_aberta',
      responded: 'em_analise',
      under_review: 'em_analise',
      released: 'resolvida_profissional',
      refunded: 'reembolsado',
      cancelled: 'reembolsado'
    };
    return Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      transactionId: metadata.transactionId || row.transaction_id || '',
      paymentId: metadata.paymentId || row.payment_id || '',
      orderId: metadata.orderId || row.order_id || '',
      conversationId: metadata.conversationId || row.conversation_id || '',
      messageId: metadata.messageId || row.message_id || '',
      professionalId: row.professional_id || metadata.professionalId || '',
      clientId: row.client_id || metadata.clientId || '',
      reason: row.reason || metadata.reason || '',
      reasonCode: row.description || metadata.reasonCode || '',
      openedBy: row.opened_by || metadata.openedBy || '',
      status: statusMap[row.status] || row.status || 'contestacao_aberta',
      responseText: row.professional_response || metadata.responseText || '',
      responseAt: row.response_at || metadata.responseAt || '',
      respondedBy: metadata.respondedBy || row.professional_id || '',
      resolution: row.resolution === 'refund_client' ? 'cliente' : row.resolution === 'release_professional' ? 'profissional' : metadata.resolution || '',
      createdAt: row.created_at || metadata.createdAt,
      updatedAt: row.updated_at || metadata.updatedAt,
      resolvedAt: row.resolved_at || metadata.resolvedAt || '',
      syncStatus: 'synced'
    });
  }

  function mapRemoteAuditEvent(row) {
    row = row || {};
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    return Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      type: metadata.type || 'admin_event',
      action: row.action || metadata.action || '',
      actorId: row.actor_id || metadata.actorId || '',
      actorRole: row.actor_role || metadata.actorRole || '',
      actorName: metadata.actorName || 'Suporte Doke',
      transactionId: metadata.transactionId || '',
      disputeId: metadata.disputeId || '',
      orderId: metadata.orderId || '',
      title: metadata.title || 'Evento financeiro',
      body: metadata.body || metadata.note || '',
      reason: metadata.reason || '',
      targetUrl: metadata.targetUrl || '',
      receiptUrl: metadata.receiptUrl || '',
      createdAt: row.created_at || metadata.createdAt,
      updatedAt: metadata.updatedAt || row.created_at,
      syncStatus: 'synced'
    });
  }

  function mapRemotePayment(row) {
    row = row || {};
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    return localPayments.normalize(Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      eventKey: row.event_key || metadata.eventKey,
      orderId: metadata.orderId || row.order_id,
      conversationId: metadata.conversationId || row.conversation_id || '',
      messageId: metadata.messageId || row.message_id || '',
      chargeMessageId: metadata.chargeMessageId || row.message_id || '',
      clientId: row.client_id,
      professionalId: row.professional_id,
      grossAmount: fromCents(row.gross_amount_cents),
      chargedAmount: fromCents(row.charged_amount_cents),
      discountAmount: fromCents(row.discount_amount_cents),
      feeAmount: fromCents(row.platform_fee_cents),
      netAmount: fromCents(row.net_amount_cents),
      amount: fromCents(row.charged_amount_cents),
      currency: row.currency || 'BRL',
      method: row.method || metadata.method || '',
      status: row.status,
      escrowStatus: row.escrow_status,
      heldAt: row.held_at || metadata.heldAt,
      releasedAt: row.released_at || metadata.releasedAt,
      refundedAt: row.refunded_at || metadata.refundedAt,
      createdAt: row.created_at || metadata.createdAt,
      updatedAt: row.updated_at || metadata.updatedAt,
      syncStatus: 'synced',
      syncedAt: nowIso()
    }));
  }

  function upsertBy(items, item, keyBuilder) {
    var next = Array.isArray(items) ? items.slice() : [];
    var key = keyBuilder(item);
    var index = next.findIndex(function (candidate) { return keyBuilder(candidate) === key; });
    if (index >= 0) next.splice(index, 1, item);
    else next.unshift(item);
    return next;
  }

  function saveRemoteWalletProjection(payload) {
    var wallet = localWallet.readWallet();
    var userId = normalizeText(payload.userId || '');
    var remoteTransactions = Array.isArray(payload.transactions) ? payload.transactions : [];
    var remoteAccounts = Array.isArray(payload.bankAccounts) ? payload.bankAccounts : [];
    var remoteDisputes = Array.isArray(payload.disputes) ? payload.disputes : [];
    var remoteAudit = Array.isArray(payload.auditEvents) ? payload.auditEvents : [];

    wallet.transactions = (wallet.transactions || []).filter(function (item) {
      return String(item.professionalId || item.userId || '') !== userId;
    }).concat(remoteTransactions);
    wallet.bankAccounts = (wallet.bankAccounts || []).filter(function (item) {
      return String(item.ownerId || item.userId || '') !== userId;
    }).concat(remoteAccounts);
    wallet.disputes = (wallet.disputes || []).filter(function (item) {
      return String(item.professionalId || '') !== userId && String(item.clientId || '') !== userId;
    }).concat(remoteDisputes);
    if (remoteAudit.length) wallet.auditEvents = remoteAudit;
    wallet.updatedAt = nowIso();
    return localWallet.writeWallet(wallet);
  }

  function upsertLocalTransaction(transaction) {
    var wallet = localWallet.readWallet();
    wallet.transactions = upsertBy(wallet.transactions, transaction, function (item) {
      return normalizeText(item && (item.eventKey || item.id));
    });
    wallet.updatedAt = nowIso();
    localWallet.writeWallet(wallet);
    return transaction;
  }

  function upsertLocalAccount(account) {
    if (!account) return null;
    var wallet = localWallet.readWallet();
    wallet.bankAccounts = upsertBy(wallet.bankAccounts, account, function (item) {
      return normalizeText(item && (item.ownerId || item.userId || item.id));
    });
    wallet.updatedAt = nowIso();
    localWallet.writeWallet(wallet);
    return account;
  }

  function upsertLocalDispute(dispute) {
    if (!dispute) return null;
    var wallet = localWallet.readWallet();
    wallet.disputes = upsertBy(wallet.disputes, dispute, function (item) {
      return normalizeText(item && (item.id || item.eventKey));
    });
    wallet.updatedAt = nowIso();
    localWallet.writeWallet(wallet);
    return dispute;
  }

  function queryRemoteWallet(user, options) {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));
    options = options || {};
    var localUser = getSessionUser() || {};
    var support = isSupportOrAdmin(localUser);
    var requestedUserId = normalizeText(options.ownerId || options.professionalId || options.userId || user.id);
    var targetUserId = support && isUuid(requestedUserId) ? requestedUserId : user.id;

    var transactionQuery = client.from(TRANSACTIONS_TABLE).select('*').order('created_at', { ascending: false });
    var disputeQuery = client.from(DISPUTES_TABLE).select('*').order('created_at', { ascending: false });
    if (!support || options.currentUser !== false) {
      transactionQuery = transactionQuery.eq('wallet_user_id', targetUserId);
      disputeQuery = disputeQuery.or('professional_id.eq.' + targetUserId + ',client_id.eq.' + targetUserId);
    }

    var auditPromise = support
      ? client.from(AUDIT_TABLE).select('*').order('created_at', { ascending: false }).limit(80)
      : Promise.resolve({ data: [], error: null });

    return Promise.all([
      client.from(WALLETS_TABLE).select('*').eq('user_id', targetUserId).maybeSingle(),
      transactionQuery,
      client.from(BANK_ACCOUNTS_TABLE).select('*').eq('user_id', targetUserId).maybeSingle(),
      disputeQuery,
      auditPromise
    ]).then(function (results) {
      results.forEach(function (result) { if (result && result.error) throw result.error; });
      var projection = {
        userId: targetUserId,
        walletSummary: results[0].data || null,
        transactions: (results[1].data || []).map(mapRemoteTransaction),
        bankAccounts: results[2].data ? [mapRemoteBankAccount(results[2].data)] : [],
        disputes: (results[3].data || []).map(mapRemoteDispute),
        auditEvents: (results[4].data || []).map(mapRemoteAuditEvent)
      };
      saveRemoteWalletProjection(projection);
      setProviderState('supabase');
      return projection;
    });
  }

  function loadWallet(options) {
    options = options || {};
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(localWallet.readWallet());
    if (walletLoadPromise && !options.fresh) return walletLoadPromise;
    walletLoadPromise = getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return localWallet.readWallet();
      return queryRemoteWallet(user, options).then(function () { return localWallet.readWallet(); });
    }).catch(function (error) {
      warnRemote(error, 'leitura da carteira');
      return localWallet.readWallet();
    }).then(function (wallet) {
      walletLoadPromise = null;
      return wallet;
    }, function (error) {
      walletLoadPromise = null;
      throw error;
    });
    return walletLoadPromise;
  }

  function loadPayments(options) {
    options = options || {};
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(localPayments.readLocal());
    if (paymentsLoadPromise && !options.fresh) return paymentsLoadPromise;
    paymentsLoadPromise = getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return localPayments.readLocal();
      return client.from(PAYMENTS_TABLE).select('*').order('created_at', { ascending: false }).then(function (result) {
        if (result.error) throw result.error;
        var remote = (result.data || []).map(mapRemotePayment);
        var local = localPayments.readLocal().filter(function (item) {
          return item.syncStatus === 'local-simulation' && !isUuid(item.clientId) && !isUuid(item.professionalId);
        });
        localPayments.writeLocal(remote.concat(local));
        setProviderState('supabase');
        return localPayments.readLocal();
      });
    }).catch(function (error) {
      warnRemote(error, 'leitura dos pagamentos');
      return localPayments.readLocal();
    }).then(function (items) {
      paymentsLoadPromise = null;
      return items;
    }, function (error) {
      paymentsLoadPromise = null;
      throw error;
    });
    return paymentsLoadPromise;
  }

  function fallbackWalletAction(method, payload, error) {
    if (hasAuthenticatedUuidSession()) return Promise.reject(authenticatedAuthorityError(method, error));
    warnRemote(error, method);
    if (!localWallet || typeof localWallet[method] !== 'function') return Promise.reject(error);
    return Promise.resolve(localWallet[method](payload)).then(function (result) {
      if (result && result.transaction) {
        result.transaction.syncStatus = 'local-simulation';
        result.transaction.financialAuthority = 'local';
        upsertLocalTransaction(result.transaction);
      }
      if (result && result.dispute) {
        result.dispute.syncStatus = 'local-simulation';
        upsertLocalDispute(result.dispute);
      }
      return result;
    });
  }

  function callRpc(name, params) {
    var client = getSupabaseClient();
    var api = root.DokeSupabase;
    if (!client || !api || typeof api.invokeSelfService !== 'function') {
      return Promise.reject(new Error('Autoridade self-service financeira indisponível.'));
    }
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login com uma conta Supabase para usar a carteira compartilhada.');
      return api.invokeSelfService(name, params || {}).then(function (data) {
        setProviderState('supabase');
        return data;
      });
    });
  }

  function isFinanceSandboxEnabled() {
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var url = normalizeText(config.url || '');
    return Boolean(
      config.enabled !== false
      && config.financeSandboxEnabled === true
      && url.indexOf(FINANCE_SANDBOX_PROJECT_REF + '.supabase.co') !== -1
      && getSupabaseClient()
    );
  }

  function callFinanceSandbox(action, payload) {
    var client = getSupabaseClient();
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var functionName = normalizeText(config.financeSandboxFunction || FINANCE_SANDBOX_FUNCTION) || FINANCE_SANDBOX_FUNCTION;
    if (!isFinanceSandboxEnabled() || !client || !client.functions || typeof client.functions.invoke !== 'function') {
      return Promise.reject(financialServerAuthorityError('usar sandbox financeiro fora do staging'));
    }
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login para usar o sandbox financeiro do staging.');
      return client.functions.invoke(functionName, {
        body: { action: normalizeText(action).toLowerCase(), payload: payload || {} }
      }).then(function (result) {
        if (result.error) throw result.error;
        if (result.data && result.data.error) {
          var error = new Error(result.data.error);
          error.code = result.data.error;
          throw error;
        }
        setProviderState('supabase-sandbox');
        return result.data || {};
      });
    });
  }

  function refreshSandboxState(orderId, conversationId) {
    var orders = Doke.repositories && Doke.repositories.orders;
    var messages = Doke.repositories && Doke.repositories.messages;
    if (orders && typeof orders.clearCache === 'function') orders.clearCache();
    if (messages && typeof messages.clearCache === 'function') messages.clearCache();
    var tasks = [loadPayments({ fresh: true }), loadWallet({ fresh: true })];
    tasks.push(orders && typeof orders.getById === 'function' ? orders.getById(orderId) : Promise.resolve(null));
    tasks.push(messages && typeof messages.getById === 'function' && conversationId ? messages.getById(conversationId) : Promise.resolve(null));
    return Promise.all(tasks).then(function (values) {
      var payment = (values[0] || []).find(function (item) { return String(item.orderId || '') === String(orderId || ''); }) || null;
      var wallet = values[1] || localWallet.readWallet();
      var order = values[2] || null;
      var conversation = values[3] || null;
      var chargeMessageId = normalizeText(order && (order.chargeMessageId || order.paymentMessageId) || payment && payment.chargeMessageId || '');
      var charge = conversation && Array.isArray(conversation.messages)
        ? conversation.messages.find(function (item) { return String(item.id || item.messageId || '') === chargeMessageId; }) || null
        : null;
      var walletTransaction = payment && (wallet.transactions || []).find(function (item) {
        return String(item.id || '') === String(payment.walletTransactionId || '')
          || String(item.paymentId || '') === String(payment.id || '');
      }) || null;
      return {
        payment: payment,
        order: order,
        conversation: conversation,
        charge: charge,
        wallet: wallet,
        walletTransaction: walletTransaction
      };
    });
  }

  function runSandboxOperation(action, payload) {
    payload = payload || {};
    var orderId = normalizeText(payload.orderId || '');
    var conversationId = normalizeText(payload.conversationId || '');
    return callFinanceSandbox(action, payload).then(function (remote) {
      if (remote && remote.payment) {
        var payment = mapRemotePayment(remote.payment);
        localPayments.writeLocal(upsertBy(localPayments.readLocal(), payment, function (item) {
          return normalizeText(item && (item.eventKey || item.id));
        }));
      }
      if (remote && remote.transaction) upsertLocalTransaction(mapRemoteTransaction(remote.transaction));
      return refreshSandboxState(orderId, conversationId).then(function (state) {
        return Object.assign({
          remote: clone(remote),
          sandbox: true,
          authority: 'staging_sandbox',
          idempotent: remote && remote.updated === false
        }, state);
      });
    });
  }

  function confirmSandboxPayment(payload) {
    return runSandboxOperation('hold_payment', payload);
  }

  function requestSandboxCompletion(payload) {
    return runSandboxOperation('request_completion', payload);
  }

  function releaseSandboxPayment(payload) {
    return runSandboxOperation('release_payment', payload);
  }

  function callFinancialOperations(action, payload) {
    var client = getSupabaseClient();
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      return Promise.reject(new Error('Autoridade operacional financeira indisponível.'));
    }
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login para executar esta operação financeira.');
      return client.functions.invoke(FINANCIAL_OPERATIONS_FUNCTION, {
        body: Object.assign({ action: action }, payload || {})
      }).then(function (result) {
        if (result.error) throw result.error;
        if (result.data && result.data.error) {
          var error = new Error(result.data.error);
          error.code = result.data.error;
          throw error;
        }
        setProviderState('supabase');
        return result.data || {};
      });
    });
  }

  function financialServerAuthorityError(operation) {
    var error = new Error('A operação financeira "' + operation + '" exige autoridade do servidor financeiro. Nenhuma simulação local foi executada.');
    error.code = 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED';
    error.operation = normalizeText(operation);
    return error;
  }

  function shouldFailClosed(error) {
    return Boolean(error && error.code === 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED');
  }

  function saveBankAccount(payload) {
    payload = payload || {};
    return callRpc('save_wallet_bank_account', {
      p_account_holder: normalizeText(payload.holderName || payload.accountHolder || ''),
      p_document: normalizeText(payload.document || ''),
      p_bank_name: normalizeText(payload.bankName || ''),
      p_bank_code: normalizeText(payload.bankCode || ''),
      p_branch: normalizeText(payload.agency || payload.branch || ''),
      p_account_number: normalizeText(payload.accountNumber || ''),
      p_account_type: normalizeText(payload.accountType || 'checking'),
      p_pix_key: normalizeText(payload.pixKey || ''),
      p_metadata: sanitizeMetadata(payload)
    }).then(function (row) {
      var account = upsertLocalAccount(mapRemoteBankAccount(row));
      document.dispatchEvent(new CustomEvent('doke:wallet-bank-account-saved', { detail: { account: clone(account) } }));
      return { account: clone(account), wallet: localWallet.readWallet() };
    }).catch(function (error) {
      if (hasAuthenticatedUuidSession()) throw authenticatedAuthorityError('salvar conta bancária', error);
      warnRemote(error, 'salvar conta bancária');
      return localWallet.saveBankAccount(payload).then(function (result) {
        if (result && result.account) result.account.syncStatus = 'local-simulation';
        return result;
      });
    });
  }

  function registerReceivable(payload) {
    if (!getSupabaseClient()) {
      if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('materializar recebível'));
      return Promise.resolve(localWallet.registerReceivable(payload || {}));
    }
    return Promise.reject(financialServerAuthorityError('materializar recebível'));
  }

  function releaseHeldReceivable(payload) {
    if (!getSupabaseClient()) {
      if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('liberar recebível'));
      return Promise.resolve(localWallet.releaseHeldReceivable(payload || {}));
    }
    return Promise.reject(financialServerAuthorityError('liberar recebível'));
  }

  function requestWithdraw(payload) {
    payload = payload || {};
    var transactionId = 'wallet_tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    var eventKey = 'wallet_withdraw:' + normalizeText(payload.ownerId || payload.professionalId || payload.userId || '') + ':' + Date.now().toString(36);
    return callRpc('request_wallet_withdrawal', {
      p_external_id: transactionId,
      p_event_key: eventKey,
      p_amount_cents: toCents(payload.amount),
      p_metadata: sanitizeMetadata(payload)
    }).then(function (data) {
      var transaction = upsertLocalTransaction(mapRemoteTransaction(data && data.transaction));
      var account = upsertLocalAccount(mapRemoteBankAccount(data && data.account));
      document.dispatchEvent(new CustomEvent('doke:wallet-withdraw-requested', { detail: { transaction: clone(transaction), account: clone(account) } }));
      return { transaction: clone(transaction), account: clone(account), created: Boolean(data && data.created), wallet: localWallet.readWallet() };
    }).catch(function (error) { return fallbackWalletAction('requestWithdraw', payload, error); });
  }

  function resolveWithdraw(payload) {
    payload = payload || {};
    var action = normalizeText(payload.action || payload.status || 'approve').toLowerCase();
    return callFinancialOperations('resolve_withdrawal', {
      transactionId: normalizeText(payload.transactionId || payload.id),
      resolution: action,
      reason: normalizeText(payload.reason || payload.adminReason || '')
    }).then(function (data) {
      var transaction = upsertLocalTransaction(mapRemoteTransaction(data && data.transaction));
      document.dispatchEvent(new CustomEvent('doke:wallet-withdraw-resolved', { detail: { transaction: clone(transaction), action: data && data.action } }));
      return { transaction: clone(transaction), action: data && data.action, updated: Boolean(data && data.updated), wallet: localWallet.readWallet() };
    }).catch(function (error) { return fallbackWalletAction('resolveWithdraw', payload, error); });
  }

  function completeWithdraw(payload) {
    return resolveWithdraw(Object.assign({}, payload || {}, { action: 'approve' }));
  }

  function openDispute(payload) {
    payload = payload || {};
    var disputeId = normalizeText(payload.id || payload.disputeId) || 'wallet_dispute_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    var eventKey = normalizeText(payload.eventKey) || 'wallet_dispute:' + normalizeText(payload.orderId) + ':' + normalizeText(payload.paymentId);
    return callRpc('open_wallet_dispute', {
      p_external_id: disputeId,
      p_event_key: eventKey,
      p_order_external_id: normalizeText(payload.orderId),
      p_payment_external_id: normalizeText(payload.paymentId),
      p_transaction_external_id: normalizeText(payload.transactionId || payload.walletTransactionId),
      p_reason: normalizeText(payload.reason || payload.note),
      p_reason_code: normalizeText(payload.reasonCode || payload.category),
      p_metadata: sanitizeMetadata(payload)
    }).then(function (data) {
      var dispute = upsertLocalDispute(mapRemoteDispute(data && data.dispute));
      var transaction = upsertLocalTransaction(mapRemoteTransaction(data && data.transaction));
      return { dispute: clone(dispute), transaction: clone(transaction), created: Boolean(data && data.created), wallet: localWallet.readWallet() };
    }).catch(function (error) { return fallbackWalletAction('openDispute', payload, error); });
  }

  function respondDispute(payload) {
    payload = payload || {};
    return callRpc('respond_wallet_dispute', {
      p_dispute_external_id: normalizeText(payload.disputeId || payload.id),
      p_response: normalizeText(payload.responseText || payload.replyText || payload.message)
    }).then(function (data) {
      var dispute = upsertLocalDispute(mapRemoteDispute(data && data.dispute));
      return { dispute: clone(dispute), updated: Boolean(data && data.updated), wallet: localWallet.readWallet() };
    }).catch(function (error) { return fallbackWalletAction('respondDispute', payload, error); });
  }

  function resolveDispute(payload) {
    payload = payload || {};
    return callFinancialOperations('resolve_dispute', {
      disputeId: normalizeText(payload.disputeId || payload.id),
      resolution: normalizeText(payload.resolution || payload.action),
      reason: normalizeText(payload.reason || payload.adminReason || '')
    }).then(function (data) {
      var dispute = upsertLocalDispute(mapRemoteDispute(data && data.dispute));
      var transaction = upsertLocalTransaction(mapRemoteTransaction(data && data.transaction));
      if (data && data.payment) {
        var payment = mapRemotePayment(data.payment);
        localPayments.writeLocal(upsertBy(localPayments.readLocal(), payment, function (item) { return normalizeText(item && (item.eventKey || item.id)); }));
      }
      return { dispute: clone(dispute), transaction: clone(transaction), resolution: data && data.resolution, updated: Boolean(data && data.updated), wallet: localWallet.readWallet() };
    }).catch(function (error) { return fallbackWalletAction('resolveDispute', payload, error); });
  }

  function saveRemotePayment(payment) {
    var normalized = localPayments.normalize(payment || {});
    var status = normalizeText(normalized.status).toLowerCase();
    if (status === 'released' || status === 'refunded') {
      return loadPayments({ fresh: true }).then(function (items) {
        var remote = (items || []).find(function (item) {
          return String(item.eventKey || '') === String(normalized.eventKey || '') || String(item.id || '') === String(normalized.id || '');
        }) || null;
        if (!remote || normalizeText(remote.status).toLowerCase() !== status) {
          throw new Error('A transição financeira terminal ainda não foi confirmada pelo ledger remoto.');
        }
        return remote;
      });
    }
    if (getSupabaseClient()) return Promise.reject(financialServerAuthorityError('materializar pagamento'));
    return Promise.resolve(localPayments.normalize(Object.assign({}, normalized, {
      syncStatus: 'local-simulation',
      financialAuthority: 'local'
    })));
  }

  function savePayment(payment) {
    if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('gravar pagamento no navegador'));
    var normalized = localPayments.normalize(payment || {});
    var previous = localPayments.readLocal().find(function (item) {
      return String(item.id || '') === String(normalized.id || '') || Boolean(normalized.eventKey && item.eventKey && String(item.eventKey) === String(normalized.eventKey));
    }) || null;
    return saveRemotePayment(normalized).then(function (remotePayment) {
      var items = upsertBy(localPayments.readLocal(), remotePayment, function (item) { return normalizeText(item && (item.eventKey || item.id)); });
      localPayments.writeLocal(items);
      document.dispatchEvent(new CustomEvent(previous ? 'doke:payment-updated' : 'doke:payment-created', { detail: { payment: clone(remotePayment), previous: clone(previous) } }));
      return { payment: clone(remotePayment), created: !previous, updated: Boolean(previous) };
    }).catch(function (error) {
      if (shouldFailClosed(error) || hasAuthenticatedUuidSession()) throw authenticatedAuthorityError('gravar pagamento no navegador', error);
      warnRemote(error, 'gravação do pagamento');
      return localPayments.save(Object.assign({}, normalized, { syncStatus: 'local-simulation', financialAuthority: 'local' }));
    });
  }

  function paymentList(filters) {
    filters = filters || {};
    return loadPayments(filters).then(function () { return localPayments.list(filters); });
  }

  function paymentGet(method, value) {
    return loadPayments({ fresh: true }).then(function () { return localPayments[method](value); });
  }

  var walletFacade = Object.freeze(Object.assign({}, localWallet, {
    provider: 'supabase-first',
    load: loadWallet,
    refresh: function (options) { return loadWallet(Object.assign({}, options || {}, { fresh: true })); },
    saveBankAccount: saveBankAccount,
    registerReceivable: registerReceivable,
    releaseHeldReceivable: releaseHeldReceivable,
    requestWithdraw: requestWithdraw,
    completeWithdraw: completeWithdraw,
    resolveWithdraw: resolveWithdraw,
    openDispute: openDispute,
    respondDispute: respondDispute,
    resolveDispute: resolveDispute,
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : hasAuthenticatedUuidSession() ? 'unavailable' : 'local',
        fallbackActive: !hasAuthenticatedUuidSession() && Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '',
        authenticatedUuidSession: hasAuthenticatedUuidSession(),
        remoteMutationRequired: hasAuthenticatedUuidSession(),
        localMutationAllowed: !hasAuthenticatedUuidSession(),
        localFinancialSimulation: !hasAuthenticatedUuidSession() && (!getSupabaseClient() || Boolean(lastRemoteError))
      });
    }
  }));

  var paymentsFacade = Object.freeze(Object.assign({}, localPayments, {
    provider: 'supabase-first',
    load: loadPayments,
    list: paymentList,
    getById: function (id) { return paymentGet('getById', id); },
    getByEventKey: function (eventKey) { return paymentGet('getByEventKey', eventKey); },
    getByOrderId: function (orderId) { return paymentGet('getByOrderId', orderId); },
    save: savePayment,
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : hasAuthenticatedUuidSession() ? 'unavailable' : 'local',
        fallbackActive: !hasAuthenticatedUuidSession() && Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '',
        authenticatedUuidSession: hasAuthenticatedUuidSession(),
        remoteMutationRequired: hasAuthenticatedUuidSession(),
        localMutationAllowed: !hasAuthenticatedUuidSession(),
        localFinancialSimulation: !hasAuthenticatedUuidSession() && (!getSupabaseClient() || Boolean(lastRemoteError))
      });
    }
  }));

  repositories.wallet = walletFacade;
  repositories.payments = paymentsFacade;
  Doke.financeRepository = Object.freeze({
    loadWallet: loadWallet,
    loadPayments: loadPayments,
    isSandboxEnabled: isFinanceSandboxEnabled,
    confirmSandboxPayment: confirmSandboxPayment,
    requestSandboxCompletion: requestSandboxCompletion,
    releaseSandboxPayment: releaseSandboxPayment,
    getProviderStatus: function () {
      var status = walletFacade.getProviderStatus();
      return Object.freeze(Object.assign({}, status, {
        provider: isFinanceSandboxEnabled() ? 'supabase-sandbox' : status.provider,
        sandboxActive: isFinanceSandboxEnabled(),
        sandboxFinancialSimulation: isFinanceSandboxEnabled()
      }));
    }
  });

  getSupabaseClient();
})();
