/* Doke Admin Mock Panel
   Responsibility: admin/support controller for mock financial dispute operations. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ADMIN_ROLES = ['admin', 'support'];
  var ACTIVE_DISPUTE_STATUSES = ['contestacao_aberta', 'em_analise'];
  var root = document.querySelector('[data-admin-root]');
  var locked = document.querySelector('[data-admin-locked]');
  var dashboard = document.querySelector('[data-admin-dashboard]');
  var searchInput = document.querySelector('[data-admin-search]');
  var toast = document.querySelector('[data-admin-toast]');
  var withdrawModal = document.querySelector('[data-admin-withdraw-modal]');
  var withdrawReasonInput = document.querySelector('[data-admin-withdraw-reason]');
  var withdrawModalTitle = document.querySelector('[data-admin-withdraw-modal-title]');
  var withdrawModalCopy = document.querySelector('[data-admin-withdraw-modal-copy]');
  var withdrawModalSubmit = document.querySelector('[data-admin-withdraw-submit]');
  var verificationDialog = document.querySelector('[data-admin-verification-dialog]');
  var verificationReasonInput = document.querySelector('[data-admin-verification-reason]');
  var verificationRejectConfirm = document.querySelector('[data-admin-verification-reject-confirm]');
  var pendingVerificationId = '';
  var searchQuery = '';
  var toastTimer = null;
  var loadPromise = null;

  function experience() {
    return Doke.adminExperience || null;
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeSearch(value) {
    return clean(value)
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatCurrency(value) {
    var amount = Number(value || 0);
    if (!Number.isFinite(amount)) amount = 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Agora';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function getCurrentUser() {
    try {
      var sessionUser = Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : null;
      if (sessionUser) return sessionUser;
    } catch (error) {
      // localStorage fallback below.
    }

    try {
      var raw = window.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function canUseAdmin(user) {
    var current = user || getCurrentUser() || {};
    var role = clean(current.role || current.type).toLowerCase();
    if (ADMIN_ROLES.indexOf(role) >= 0) return true;
    if (current.isMockSupport === true || current.mockSupport === true) return true;
    return Boolean(role && Doke.permissions && typeof Doke.permissions.has === 'function' && Doke.permissions.has('*', role));
  }

  function walletService() {
    return Doke.services && Doke.services.wallet || Doke.repositories && Doke.repositories.wallet || null;
  }

  function verificationService() {
    return Doke.services && Doke.services.professionalIdentityVerification || null;
  }

  function ordersRepository() {
    return Doke.repositories && Doke.repositories.orders || null;
  }

  function notificationsRepository() {
    return Doke.repositories && Doke.repositories.notifications || null;
  }

  function listOrders() {
    var repository = ordersRepository();
    if (!repository) return [];
    if (typeof repository.listLocal === 'function') return repository.listLocal({ currentUser: false }) || [];
    if (typeof repository.readLocal === 'function') return repository.readLocal() || [];
    return [];
  }

  function listNotifications() {
    var repository = notificationsRepository();
    if (!repository || typeof repository.readLocal !== 'function') return [];
    return repository.readLocal() || [];
  }

  function listAuditEvents() {
    var wallet = walletService();
    if (!wallet || typeof wallet.listAuditEvents !== 'function') return Promise.resolve([]);
    return Promise.resolve(wallet.listAuditEvents({ currentUser: false })).then(function (items) {
      return Array.isArray(items) ? items : [];
    });
  }

  function listTransactions() {
    var wallet = walletService();
    if (!wallet || typeof wallet.listTransactions !== 'function') return Promise.resolve([]);
    return Promise.resolve(wallet.listTransactions({ currentUser: false })).then(function (items) {
      return Array.isArray(items) ? items : [];
    });
  }

  function listDisputes() {
    var wallet = walletService();
    if (!wallet || typeof wallet.listDisputes !== 'function') return Promise.resolve([]);
    return Promise.resolve(wallet.listDisputes({ currentUser: false })).then(function (items) {
      return Array.isArray(items) ? items : [];
    });
  }

  function isActiveDispute(dispute) {
    return ACTIVE_DISPUTE_STATUSES.indexOf(clean(dispute && dispute.status)) >= 0;
  }

  function isBlockedTransaction(transaction) {
    var status = clean(transaction && transaction.status);
    var releaseStatus = clean(transaction && (transaction.releaseStatus || transaction.repasseStatus || transaction.disputeStatus));
    return status === 'held' || releaseStatus === 'contestacao' || releaseStatus === 'em_analise' || releaseStatus === 'contestado';
  }

  function isSearchMatch(values) {
    var query = normalizeSearch(searchQuery);
    if (!query) return true;
    var haystack = values.map(normalizeSearch).join(' ');
    return haystack.indexOf(query) >= 0;
  }

  function transactionByDispute(dispute, transactions) {
    return (transactions || []).find(function (transaction) {
      if (dispute.transactionId && String(transaction.id || '') === String(dispute.transactionId)) return true;
      if (dispute.orderId && String(transaction.orderId || '') === String(dispute.orderId)) return true;
      if (dispute.messageId && String(transaction.messageId || '') === String(dispute.messageId)) return true;
      return false;
    }) || null;
  }

  function orderByDispute(dispute, orders) {
    return (orders || []).find(function (order) {
      return String(order.id || '') === String(dispute.orderId || '');
    }) || null;
  }

  function statusLabel(value, resolution) {
    var status = clean(value);
    if (status === 'em_analise') return 'Em análise';
    if (status === 'contestacao_aberta') return 'Em contestação';
    if (status === 'resolvida_profissional' || resolution === 'profissional') return 'Repasse liberado';
    if (status === 'resolvida_cliente' || status === 'reembolsado' || resolution === 'cliente') return 'Cliente reembolsado';
    if (status === 'held') return 'Em garantia';
    if (status === 'available') return 'Disponível';
    if (status === 'refunded') return 'Reembolsado';
    if (status === 'processing') return 'Processando';
    if (status === 'completed') return 'Concluído';
    if (status === 'submitted') return 'Enviada';
    if (status === 'under_review') return 'Em análise';
    if (status === 'verified') return 'Verificada';
    if (status === 'declined' || status === 'rejected') return 'Recusado';
    return clean(value) || 'Pendente';
  }

  function statusClass(value, resolution) {
    var status = clean(value);
    if (status === 'resolvida_profissional' || resolution === 'profissional' || status === 'available' || status === 'completed' || status === 'verified') return 'admin-status admin-status--success';
    if (status === 'resolvida_cliente' || status === 'reembolsado' || resolution === 'cliente' || status === 'refunded' || status === 'declined' || status === 'rejected') return 'admin-status admin-status--danger';
    if (status === 'contestacao_aberta' || status === 'em_analise' || status === 'held' || status === 'processing' || status === 'submitted' || status === 'under_review') return 'admin-status admin-status--warning';
    return 'admin-status';
  }

  function receiptUrl(transaction) {
    var id = clean(transaction && transaction.id);
    return id ? 'carteira.html?transaction=' + encodeURIComponent(id) + '&receipt=1' : '';
  }

  function setStat(name, value) {
    var node = document.querySelector('[data-admin-stat="' + name + '"]');
    if (node) node.textContent = String(value || 0);
  }

  function empty(label) {
    return '<p class="admin-empty">' + escapeHtml(label) + '</p>';
  }

  function renderDispute(dispute, transaction, order) {
    var title = clean(order && order.title) || clean(transaction && transaction.title) || 'Pedido em análise';
    var peer = clean(order && (order.clientName || order.customerName)) || clean(dispute.clientName) || 'Cliente Doke';
    var pro = clean(order && (order.professionalName || order.companyName)) || clean(dispute.professionalName) || 'Profissional Doke';
    var amount = transaction ? formatCurrency(transaction.grossAmount || transaction.netAmount || transaction.amount) : '—';
    var conversationUrl = dispute.conversationId ? 'mensagens.html?conversation=' + encodeURIComponent(dispute.conversationId) : 'mensagens.html';
    var orderUrl = dispute.orderId ? 'pedidos.html?order=' + encodeURIComponent(dispute.orderId) : 'pedidos.html';
    var canResolve = isActiveDispute(dispute);
    var receipt = receiptUrl(transaction);

    return [
      '<article class="admin-list-item" data-admin-dispute-card data-dispute-id="' + escapeHtml(dispute.id) + '">',
        '<div class="admin-list-item__top">',
          '<div><h3 class="admin-list-item__title">' + escapeHtml(title) + '</h3><p class="admin-list-item__copy">' + escapeHtml(clean(dispute.reason) || 'Contestação financeira') + '</p></div>',
          '<span class="' + statusClass(dispute.status, dispute.resolution) + '">' + escapeHtml(statusLabel(dispute.status, dispute.resolution)) + '</span>',
        '</div>',
        '<div class="admin-list-item__meta"><span>Cliente: <strong>' + escapeHtml(peer) + '</strong></span><span>Profissional: <strong>' + escapeHtml(pro) + '</strong></span></div>',
        '<div class="admin-list-item__row"><span>Valor: <strong>' + escapeHtml(amount) + '</strong></span><span>Atualizado: <strong>' + escapeHtml(formatDate(dispute.updatedAt || dispute.createdAt)) + '</strong></span></div>',
        '<p class="admin-list-item__copy">Resposta do profissional: ' + escapeHtml(clean(dispute.responseText || dispute.professionalResponse) || 'Ainda não enviada') + '</p>',
        '<div class="admin-list-item__actions">',
          '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(orderUrl) + '">Ver pedido</a>',
          '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(conversationUrl) + '">Abrir conversa</a>',
          receipt ? '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(receipt) + '">Ver comprovante</a>' : '',
          canResolve ? '<span class="admin-support-label">Ação mock de suporte</span>' : '',
          canResolve ? '<button class="doke-btn doke-btn--primary" type="button" data-admin-dispute-resolve="profissional" data-dispute-id="' + escapeHtml(dispute.id) + '">Liberar repasse</button>' : '',
          canResolve ? '<button class="doke-btn doke-btn--danger" type="button" data-admin-dispute-resolve="cliente" data-dispute-id="' + escapeHtml(dispute.id) + '">Reembolsar cliente</button>' : '',
        '</div>',
      '</article>'
    ].join('');
  }

  function renderDisputes(disputes, transactions, orders) {
    var list = document.querySelector('[data-admin-disputes]');
    if (!list) return;
    var filtered = disputes.filter(function (dispute) {
      var transaction = transactionByDispute(dispute, transactions);
      var order = orderByDispute(dispute, orders);
      return isSearchMatch([
        dispute.id,
        dispute.status,
        dispute.reason,
        dispute.report,
        dispute.responseText,
        transaction && transaction.title,
        order && order.title,
        order && order.clientName,
        order && order.professionalName
      ]);
    });
    list.innerHTML = filtered.length
      ? filtered.map(function (dispute) { return renderDispute(dispute, transactionByDispute(dispute, transactions), orderByDispute(dispute, orders)); }).join('')
      : empty('Nenhuma contestação encontrada para este filtro.');
  }

  function listVerifications() {
    var service = verificationService();
    if (!service || typeof service.listForReview !== 'function') return Promise.resolve([]);
    return Promise.resolve(service.listForReview()).then(function (items) { return Array.isArray(items) ? items : []; });
  }

  function verificationTypeLabel(value) {
    return String(value || '') === 'business' ? 'Pessoa jurídica' : 'Pessoa física';
  }

  function fileCount(payload) {
    payload = payload || {};
    return ['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress', 'businessDocument'].filter(function (key) { return Boolean(payload[key]); }).length;
  }

  function renderVerification(item) {
    var payload = item && item.payload || {};
    var status = clean(item && item.status);
    var canStart = status === 'submitted';
    var canDecide = status === 'submitted' || status === 'under_review';
    return [
      '<article class="admin-list-item admin-list-item--verification" data-admin-verification-card data-verification-id="' + escapeHtml(item.id) + '">',
        '<div class="admin-list-item__top">',
          '<div><h3 class="admin-list-item__title">' + escapeHtml(verificationTypeLabel(payload.verificationType)) + '</h3><p class="admin-list-item__copy">Usuário: ' + escapeHtml(item.userId) + '</p></div>',
          '<span class="' + statusClass(status) + '">' + escapeHtml(statusLabel(status)) + '</span>',
        '</div>',
        '<div class="admin-verification-details">',
          '<span>Documento final <strong>' + escapeHtml(payload.taxIdLast4 ? '•••• ' + payload.taxIdLast4 : 'não informado') + '</strong></span>',
          '<span>Localidade <strong>' + escapeHtml([payload.city, payload.state].filter(Boolean).join(', ') || 'não informada') + '</strong></span>',
          '<span>Arquivos <strong>' + escapeHtml(fileCount(payload)) + '</strong></span>',
          '<span>Enviada <strong>' + escapeHtml(formatDate(item.submittedAt || item.updatedAt)) + '</strong></span>',
        '</div>',
        item.rejectionReason ? '<p class="admin-list-item__copy">Motivo: ' + escapeHtml(item.rejectionReason) + '</p>' : '',
        '<div class="admin-list-item__actions">',
          canStart ? '<button class="doke-btn doke-btn--ghost" type="button" data-admin-verification-action="start" data-verification-id="' + escapeHtml(item.id) + '">Iniciar análise</button>' : '',
          canDecide ? '<button class="doke-btn doke-btn--primary" type="button" data-admin-verification-action="approve" data-verification-id="' + escapeHtml(item.id) + '">Aprovar e ativar</button>' : '',
          canDecide ? '<button class="doke-btn doke-btn--danger" type="button" data-admin-verification-action="reject" data-verification-id="' + escapeHtml(item.id) + '">Rejeitar</button>' : '',
        '</div>',
      '</article>'
    ].join('');
  }

  function renderVerifications(items) {
    var list = document.querySelector('[data-admin-verifications]');
    if (!list) return;
    var filtered = items.filter(function (item) {
      var payload = item && item.payload || {};
      return isSearchMatch([item.id, item.userId, item.status, payload.verificationType, payload.city, payload.state, payload.taxIdLast4]);
    });
    list.innerHTML = filtered.length ? filtered.map(renderVerification).join('') : empty('Nenhuma verificação profissional encontrada.');
  }

  function openVerificationRejectDialog(verificationId) {
    pendingVerificationId = clean(verificationId);
    if (!verificationDialog || !pendingVerificationId) return;
    if (verificationReasonInput) verificationReasonInput.value = '';
    if (typeof verificationDialog.showModal === 'function') verificationDialog.showModal();
    else verificationDialog.setAttribute('open', '');
    if (verificationReasonInput) verificationReasonInput.focus({ preventScroll: true });
  }

  function closeVerificationRejectDialog() {
    pendingVerificationId = '';
    if (!verificationDialog) return;
    if (typeof verificationDialog.close === 'function' && verificationDialog.open) verificationDialog.close();
    else verificationDialog.removeAttribute('open');
  }

  function runVerificationAction(action, verificationId, reason) {
    var service = verificationService();
    if (!service) return Promise.reject(new Error('Autoridade de verificação indisponível.'));
    if (action === 'start') return service.startReview(verificationId);
    if (action === 'approve') return service.approve(verificationId);
    if (action === 'reject') return service.reject(verificationId, reason);
    return Promise.reject(new Error('Ação de verificação inválida.'));
  }

  function resolveVerification(action, verificationId, reason) {
    if (!canUseAdmin()) return;
    var id = clean(verificationId);
    if (!id) return;
    var mutationKey = 'verification:' + id;
    var runtime = experience();
    if (runtime && runtime.isSubmitting(mutationKey)) return;
    var card = document.querySelector('[data-admin-verification-card][data-verification-id="' + CSS.escape(id) + '"]');
    var buttons = card ? Array.prototype.slice.call(card.querySelectorAll('button')) : [];
    buttons.forEach(function (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); });
    if (verificationRejectConfirm) { verificationRejectConfirm.disabled = true; verificationRejectConfirm.setAttribute('aria-busy', 'true'); }
    showToast(action === 'approve' ? 'Ativando perfil profissional...' : action === 'reject' ? 'Registrando rejeição...' : 'Iniciando análise...');
    var operation = function () {
      return Promise.resolve(runVerificationAction(action, id, reason)).then(function () {
        closeVerificationRejectDialog();
        if (runtime) runtime.invalidateRelated();
        showToast(action === 'approve' ? 'Verificação aprovada e perfil profissional ativado.' : action === 'reject' ? 'Verificação rejeitada com motivo registrado.' : 'Análise iniciada.');
        return loadAdminData(true);
      });
    };
    var promise = runtime ? runtime.runMutation(mutationKey, operation) : operation();
    promise.catch(function (error) { showToast(error && error.message ? error.message : 'Não foi possível atualizar a verificação.'); }).finally(function () {
      buttons.forEach(function (button) { button.disabled = false; button.removeAttribute('aria-busy'); });
      if (verificationRejectConfirm) { verificationRejectConfirm.disabled = false; verificationRejectConfirm.removeAttribute('aria-busy'); }
    });
  }

  function paymentTypeLabel(transaction) {
    if (transaction.type === 'withdraw') return 'Saque';
    if (transaction.type === 'refund' || transaction.status === 'refunded') return 'Reembolso';
    if (transaction.status === 'held') return 'Pagamento em garantia';
    return 'Recebível';
  }

  function renderPayments(transactions) {
    var tbody = document.querySelector('[data-admin-payments]');
    if (!tbody) return;
    var items = transactions.filter(function (transaction) {
      return transaction.type !== 'fee' && isSearchMatch([
        transaction.id,
        transaction.title,
        transaction.description,
        transaction.status,
        transaction.releaseStatus,
        transaction.orderId,
        transaction.conversationId,
        transaction.reference
      ]);
    }).slice(0, 12);

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="5">Nenhuma movimentação encontrada.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (transaction) {
      var receipt = receiptUrl(transaction);
      return [
        '<tr>',
          '<td><strong>' + escapeHtml(transaction.title || paymentTypeLabel(transaction)) + '</strong><br><span>' + escapeHtml(paymentTypeLabel(transaction)) + '</span></td>',
          '<td>' + escapeHtml(formatCurrency(transaction.netAmount != null ? transaction.netAmount : transaction.amount)) + '</td>',
          '<td><span class="' + statusClass(transaction.status || transaction.releaseStatus, transaction.releaseStatus) + '">' + escapeHtml(statusLabel(transaction.status || transaction.releaseStatus, transaction.releaseStatus)) + '</span></td>',
          '<td>Pedido: ' + escapeHtml(transaction.orderId || '—') + '<br>Ref.: ' + escapeHtml(transaction.reference || transaction.id || '—') + '</td>',
          '<td>' + (receipt ? '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(receipt) + '">Comprovante</a>' : '—') + '</td>',
        '</tr>'
      ].join('');
    }).join('');
  }

  function renderWithdraws(transactions) {
    var list = document.querySelector('[data-admin-withdraws]');
    if (!list) return;
    var withdraws = transactions.filter(function (transaction) {
      return transaction.type === 'withdraw' && isSearchMatch([
        transaction.title,
        transaction.destination,
        transaction.reference,
        transaction.status,
        transaction.note,
        transaction.adminReason
      ]);
    }).slice(0, 10);
    list.innerHTML = withdraws.length
      ? withdraws.map(function (transaction) {
        var status = clean(transaction.status || 'processing');
        var pending = status === 'processing';
        var amount = formatCurrency(transaction.amount || transaction.netAmount);
        var statusText = statusLabel(status);
        var supportActions = pending ? [
          '<span class="admin-support-label">Ação mock de suporte</span>',
          '<button class="doke-btn doke-btn--primary" type="button" data-admin-withdraw-resolve="approve" data-transaction-id="' + escapeHtml(transaction.id) + '">Aprovar saque</button>',
          '<button class="doke-btn doke-btn--danger" type="button" data-admin-withdraw-resolve="decline" data-transaction-id="' + escapeHtml(transaction.id) + '">Recusar saque</button>'
        ].join('') : '';
        return [
          '<article class="admin-list-item" data-admin-withdraw-card data-transaction-id="' + escapeHtml(transaction.id) + '">',
            '<div class="admin-list-item__top"><div><h3 class="admin-list-item__title">' + escapeHtml(transaction.title || 'Saque solicitado') + '</h3><p class="admin-list-item__copy">' + escapeHtml(transaction.destination || transaction.method || 'Conta cadastrada') + '</p></div><span class="' + statusClass(status) + '">' + escapeHtml(statusText) + '</span></div>',
            '<div class="admin-list-item__row"><span>Valor: <strong>' + escapeHtml(amount) + '</strong></span><span>Solicitado: <strong>' + escapeHtml(formatDate(transaction.createdAt)) + '</strong></span></div>',
            '<p class="admin-list-item__copy">' + escapeHtml(transaction.note || (pending ? 'Aguardando decisão administrativa.' : 'Decisão administrativa registrada.')) + '</p>',
            transaction.adminReason ? '<p class="admin-list-item__copy">Motivo: ' + escapeHtml(transaction.adminReason) + '</p>' : '',
            '<div class="admin-list-item__actions"><a class="doke-btn doke-btn--ghost" href="' + escapeHtml(receiptUrl(transaction)) + '">Ver comprovante</a>' + supportActions + '</div>',
          '</article>'
        ].join('');
      }).join('')
      : empty('Nenhum saque encontrado para este filtro.');
  }


  function renderAudit(disputes, transactions, auditEvents) {
    var list = document.querySelector('[data-admin-audit]');
    if (!list) return;
    var notifications = listNotifications();
    var events = [];
    (auditEvents || []).slice(0, 12).forEach(function (event) {
      events.push({
        title: event.title || 'Decisão administrativa',
        body: [event.body, event.reason ? 'Motivo: ' + event.reason : '', event.actorName ? 'Responsável: ' + event.actorName : ''].filter(Boolean).join(' · '),
        date: event.updatedAt || event.createdAt,
        receiptUrl: event.receiptUrl,
        targetUrl: event.targetUrl
      });
    });
    disputes.slice(0, 6).forEach(function (dispute) {
      events.push({ title: 'Contestação ' + statusLabel(dispute.status, dispute.resolution), body: dispute.reason || dispute.id, date: dispute.updatedAt || dispute.createdAt });
    });
    transactions.slice(0, 6).forEach(function (transaction) {
      events.push({ title: paymentTypeLabel(transaction), body: transaction.note || transaction.description || transaction.reference, date: transaction.updatedAt || transaction.createdAt, receiptUrl: receiptUrl(transaction) });
    });
    notifications.slice(0, 6).forEach(function (notification) {
      events.push({ title: notification.title || 'Notificação', body: notification.body || notification.type, date: notification.createdAt, targetUrl: notification.targetUrl });
    });
    events.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    events = events.filter(function (event) { return isSearchMatch([event.title, event.body]); }).slice(0, 10);

    list.innerHTML = events.length
      ? events.map(function (event) {
        var actions = [
          event.targetUrl ? '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(event.targetUrl) + '">Abrir vínculo</a>' : '',
          event.receiptUrl ? '<a class="doke-btn doke-btn--ghost" href="' + escapeHtml(event.receiptUrl) + '">Comprovante</a>' : ''
        ].filter(Boolean).join('');
        return '<article class="admin-list-item"><div class="admin-list-item__top"><div><h3 class="admin-list-item__title">' + escapeHtml(event.title) + '</h3><p class="admin-list-item__copy">' + escapeHtml(event.body) + '</p></div><span class="admin-status">' + escapeHtml(formatDate(event.date)) + '</span></div>' + (actions ? '<div class="admin-list-item__actions">' + actions + '</div>' : '') + '</article>';
      }).join('')
      : empty('Nenhum evento recente encontrado.');
  }


  function updateStats(disputes, transactions) {
    var activeDisputes = disputes.filter(isActiveDispute).length;
    var held = transactions.filter(function (transaction) { return transaction.status === 'held'; }).length;
    var blocked = transactions.filter(isBlockedTransaction).length;
    var withdraws = transactions.filter(function (transaction) { return transaction.type === 'withdraw' && transaction.status === 'processing'; }).length;
    setStat('disputes', activeDisputes);
    setStat('held', held);
    setStat('blocked', blocked);
    setStat('withdraws', withdraws);
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = clean(message);
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 2600);
  }


  function getAdminActorPayload() {
    var user = getCurrentUser() || {};
    return {
      actorId: clean(user.id || ''),
      actorRole: clean(user.role || user.type || 'support'),
      actorName: clean(user.name || user.displayName || user.firstName || 'Suporte Doke')
    };
  }

  function closeWithdrawModal() {
    if (!withdrawModal) return;
    withdrawModal.hidden = true;
    withdrawModal.classList.remove('is-active');
    withdrawModal.setAttribute('aria-hidden', 'true');
    withdrawModal.dataset.transactionId = '';
    withdrawModal.dataset.adminWithdrawAction = '';
    if (withdrawReasonInput) withdrawReasonInput.value = '';
  }

  function openWithdrawModal(button) {
    if (!button || !withdrawModal) return;
    var action = clean(button.dataset.adminWithdrawResolve || 'approve');
    var transactionId = clean(button.dataset.transactionId || '');
    if (!transactionId) return;
    withdrawModal.dataset.transactionId = transactionId;
    withdrawModal.dataset.adminWithdrawAction = action;
    var isDecline = action === 'decline';
    if (withdrawModalTitle) withdrawModalTitle.textContent = isDecline ? 'Recusar saque' : 'Aprovar saque';
    if (withdrawModalCopy) withdrawModalCopy.textContent = isDecline
      ? 'Informe um motivo curto para registrar a recusa no histórico administrativo mock.'
      : 'Confirme a aprovação mock para concluir o saque, atualizar carteira, notificação, comprovante e auditoria.';
    if (withdrawReasonInput) {
      withdrawReasonInput.required = isDecline;
      withdrawReasonInput.placeholder = isDecline ? 'Ex.: Dados bancários inconsistentes.' : 'Observação opcional para auditoria.';
    }
    if (withdrawModalSubmit) withdrawModalSubmit.textContent = isDecline ? 'Recusar saque' : 'Aprovar saque';
    withdrawModal.hidden = false;
    withdrawModal.classList.add('is-active');
    withdrawModal.setAttribute('aria-hidden', 'false');
    if (withdrawReasonInput) withdrawReasonInput.focus({ preventScroll: true });
  }

  function resolveWithdrawFromModal() {
    if (!withdrawModal || !canUseAdmin()) return;
    var wallet = walletService();
    if (!wallet || typeof wallet.resolveWithdraw !== 'function') {
      showToast('Resolução de saque indisponível. Esta ação administrativa ainda não possui autoridade ativa.');
      return;
    }
    var transactionId = clean(withdrawModal.dataset.transactionId || '');
    var action = clean(withdrawModal.dataset.adminWithdrawAction || 'approve');
    var reason = clean(withdrawReasonInput && withdrawReasonInput.value);
    if (!transactionId) return;
    if (action === 'decline' && !reason) {
      showToast('Informe o motivo da recusa.');
      if (withdrawReasonInput) withdrawReasonInput.focus({ preventScroll: true });
      return;
    }
    var mutationKey = 'withdraw:' + transactionId;
    var runtime = experience();
    if (runtime && runtime.isSubmitting(mutationKey)) return;
    if (withdrawModalSubmit) {
      withdrawModalSubmit.disabled = true;
      withdrawModalSubmit.setAttribute('aria-busy', 'true');
    }
    showToast(action === 'decline' ? 'Recusando saque...' : 'Aprovando saque...');
    var operation = function () {
      return Promise.resolve(wallet.resolveWithdraw(Object.assign({ transactionId: transactionId, action: action, reason: reason }, getAdminActorPayload()))).then(function (result) {
        if (!result || (!result.id && !result.transactionId && !result.action)) {
          throw new Error('A autoridade financeira não confirmou a decisão do saque.');
        }
        if (runtime) runtime.invalidateRelated();
        closeWithdrawModal();
        showToast(result.action === 'declined' ? 'Saque recusado e auditado.' : 'Saque aprovado e concluído.');
        return loadAdminData(true);
      });
    };
    var promise = runtime ? runtime.runMutation(mutationKey, operation) : operation();
    promise.catch(function (error) {
      showToast(error && error.message ? error.message : 'Não foi possível resolver o saque.');
    }).finally(function () {
      if (withdrawModalSubmit) {
        withdrawModalSubmit.disabled = false;
        withdrawModalSubmit.removeAttribute('aria-busy');
      }
    });
  }

  function loadAdminData(force) {
    if (loadPromise && !force) return loadPromise;
    var runtime = experience();
    if (runtime) runtime.startLoad();
    var orders = listOrders();
    loadPromise = Promise.all([listVerifications(), listDisputes(), listTransactions(), listAuditEvents()]).then(function (result) {
      var verifications = result[0];
      var disputes = result[1];
      var transactions = result[2];
      var auditEvents = result[3];
      setStat('verifications', verifications.filter(function (item) { return ['submitted', 'under_review'].indexOf(item.status) >= 0; }).length);
      renderVerifications(verifications);
      updateStats(disputes, transactions);
      renderDisputes(disputes, transactions, orders);
      renderPayments(transactions);
      renderWithdraws(transactions);
      renderAudit(disputes, transactions, auditEvents);
      if (runtime) runtime.finishLoad();
      return { verifications: verifications, disputes: disputes, transactions: transactions, auditEvents: auditEvents };
    }).catch(function (error) {
      if (runtime) runtime.fail(error);
      showToast(error && error.message ? error.message : 'Não foi possível carregar o admin.');
      throw error;
    }).finally(function () {
      loadPromise = null;
    });
    return loadPromise;
  }

  function resolveDispute(button) {
    if (!button || !canUseAdmin()) return;
    var wallet = walletService();
    if (!wallet || typeof wallet.resolveDispute !== 'function') {
      showToast('Resolução indisponível. Esta ação administrativa ainda não possui autoridade ativa.');
      return;
    }
    var disputeId = clean(button.dataset.disputeId);
    var resolution = clean(button.dataset.adminDisputeResolve);
    if (!disputeId || !resolution) return;
    var mutationKey = 'dispute:' + disputeId;
    var runtime = experience();
    if (runtime && runtime.isSubmitting(mutationKey)) return;

    var card = button.closest('[data-admin-dispute-card]');
    var buttons = card ? Array.prototype.slice.call(card.querySelectorAll('button')) : [button];
    buttons.forEach(function (item) { item.disabled = true; item.setAttribute('aria-busy', 'true'); });
    showToast(resolution === 'cliente' ? 'Reembolsando cliente...' : 'Liberando repasse...');

    var operation = function () {
      return Promise.resolve(wallet.resolveDispute(Object.assign({ disputeId: disputeId, resolution: resolution }, getAdminActorPayload()))).then(function (result) {
        if (!result || (!result.id && !result.disputeId && !result.status && !result.resolution)) {
          throw new Error('A autoridade financeira não confirmou a resolução da contestação.');
        }
        if (runtime) runtime.invalidateRelated();
        showToast(resolution === 'cliente' ? 'Contestação encerrada. Cliente reembolsado.' : 'Contestação encerrada. Repasse liberado.');
        return loadAdminData(true);
      });
    };
    var promise = runtime ? runtime.runMutation(mutationKey, operation) : operation();
    promise.catch(function (error) {
      showToast(error && error.message ? error.message : 'Não foi possível concluir a análise.');
    }).finally(function () {
      buttons.forEach(function (item) { item.disabled = false; item.removeAttribute('aria-busy'); });
    });
  }

  function updateAccess() {
    var allowed = canUseAdmin();
    if (locked) locked.hidden = allowed;
    if (dashboard) dashboard.hidden = !allowed;
    if (root) root.dataset.adminAccess = allowed ? 'allowed' : 'blocked';
    if (!allowed) {
      var runtime = experience();
      if (runtime) runtime.setState('ready', { access: 'blocked' });
      return;
    }
    loadAdminData().catch(function () { /* state and toast handled by loadAdminData */ });
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var verificationButton = event.target.closest('[data-admin-verification-action]');
      if (verificationButton) {
        event.preventDefault();
        var verificationAction = clean(verificationButton.dataset.adminVerificationAction);
        var verificationId = clean(verificationButton.dataset.verificationId);
        if (verificationAction === 'reject') openVerificationRejectDialog(verificationId);
        else resolveVerification(verificationAction, verificationId);
        return;
      }

      var verificationDialogClose = event.target.closest('[data-admin-verification-dialog-close]');
      if (verificationDialogClose) {
        event.preventDefault();
        closeVerificationRejectDialog();
        return;
      }

      var verificationReject = event.target.closest('[data-admin-verification-reject-confirm]');
      if (verificationReject) {
        event.preventDefault();
        var reason = clean(verificationReasonInput && verificationReasonInput.value);
        if (reason.length < 10) {
          showToast('Informe um motivo com pelo menos 10 caracteres.');
          if (verificationReasonInput) verificationReasonInput.focus({ preventScroll: true });
          return;
        }
        resolveVerification('reject', pendingVerificationId, reason);
        return;
      }

      var resolveButton = event.target.closest('[data-admin-dispute-resolve]');
      if (resolveButton) {
        event.preventDefault();
        resolveDispute(resolveButton);
        return;
      }

      var withdrawButton = event.target.closest('[data-admin-withdraw-resolve]');
      if (withdrawButton) {
        event.preventDefault();
        openWithdrawModal(withdrawButton);
        return;
      }

      var withdrawClose = event.target.closest('[data-admin-withdraw-close]');
      if (withdrawClose) {
        event.preventDefault();
        closeWithdrawModal();
        return;
      }

      var withdrawSubmit = event.target.closest('[data-admin-withdraw-submit]');
      if (withdrawSubmit) {
        event.preventDefault();
        resolveWithdrawFromModal();
        return;
      }

      var scrollButton = event.target.closest('[data-admin-scroll-to]');
      if (scrollButton) {
        event.preventDefault();
        var target = document.getElementById(scrollButton.dataset.adminScrollTo || '');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = searchInput.value || '';
        loadAdminData();
      });
    }

    document.addEventListener('doke:auth-session-change', updateAccess);
    document.addEventListener('doke:wallet-dispute-resolved', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:wallet-dispute-opened', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:wallet-dispute-responded', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:wallet-withdraw-requested', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:wallet-withdraw-completed', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:wallet-withdraw-resolved', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:professional-verification-submitted', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:professional-verification-approved', function () { loadAdminData(true).catch(function () {}); });
    document.addEventListener('doke:professional-verification-rejected', function () { loadAdminData(true).catch(function () {}); });
  }

  function init() {
    if (!root) return;
    bind();
    updateAccess();
  }

  window.DokeInitAdmin = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
