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
  var verificationReview = document.querySelector('[data-admin-verification-review]');
  var verificationReviewBody = document.querySelector('[data-admin-verification-review-body]');
  var verificationReviewTitle = document.querySelector('[data-admin-verification-review-title]');
  var verificationReviewDescription = document.querySelector('[data-admin-verification-review-description]');
  var verificationReviewApprove = document.querySelector('[data-admin-verification-review-approve]');
  var verificationReviewReject = document.querySelector('[data-admin-verification-review-reject]');
  var activeVerificationReviewId = '';
  var verificationObjectUrls = [];
  var pendingVerificationId = '';
  var searchQuery = '';
  var toastTimer = null;
  var loadPromise = null;
  var accessSkeleton = document.querySelector('[data-admin-access-skeleton]');
  var accessError = document.querySelector('[data-admin-access-error]');
  var accessErrorMessage = document.querySelector('[data-admin-access-error-message]');
  var accessRun = 0;
  var eventsBound = false;

  function experience() {
    return Doke.adminExperience || null;
  }

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function adminAccessService() {
    return Doke.services && Doke.services.adminAccess || null;
  }

  function refreshNodes() {
    root = document.querySelector('[data-admin-root]');
    locked = document.querySelector('[data-admin-locked]');
    dashboard = document.querySelector('[data-admin-dashboard]');
    searchInput = document.querySelector('[data-admin-search]');
    toast = document.querySelector('[data-admin-toast]');
    withdrawModal = document.querySelector('[data-admin-withdraw-modal]');
    withdrawReasonInput = document.querySelector('[data-admin-withdraw-reason]');
    withdrawModalTitle = document.querySelector('[data-admin-withdraw-modal-title]');
    withdrawModalCopy = document.querySelector('[data-admin-withdraw-modal-copy]');
    withdrawModalSubmit = document.querySelector('[data-admin-withdraw-submit]');
    verificationDialog = document.querySelector('[data-admin-verification-dialog]');
    verificationReasonInput = document.querySelector('[data-admin-verification-reason]');
    verificationRejectConfirm = document.querySelector('[data-admin-verification-reject-confirm]');
    verificationReview = document.querySelector('[data-admin-verification-review]');
    verificationReviewBody = document.querySelector('[data-admin-verification-review-body]');
    verificationReviewTitle = document.querySelector('[data-admin-verification-review-title]');
    verificationReviewDescription = document.querySelector('[data-admin-verification-review-description]');
    verificationReviewApprove = document.querySelector('[data-admin-verification-review-approve]');
    verificationReviewReject = document.querySelector('[data-admin-verification-review-reject]');
    accessSkeleton = document.querySelector('[data-admin-access-skeleton]');
    accessError = document.querySelector('[data-admin-access-error]');
    accessErrorMessage = document.querySelector('[data-admin-access-error-message]');
  }

  function setAccessSurface(state, detail) {
    var next = String(state || 'guard-pending');
    var busy = ['guard-pending', 'loading', 'redirecting'].indexOf(next) >= 0;
    if (root) {
      root.dataset.viewState = next;
      root.setAttribute('aria-busy', busy ? 'true' : 'false');
      root.dataset.adminAccess = next === 'ready' ? 'allowed' : next === 'blocked' ? 'blocked' : 'pending';
    }
    if (accessSkeleton) accessSkeleton.hidden = !busy;
    if (dashboard) dashboard.hidden = next !== 'ready';
    if (locked) locked.hidden = next !== 'blocked';
    if (accessError) accessError.hidden = next !== 'error';
    if (accessErrorMessage && detail && detail.message) accessErrorMessage.textContent = detail.message;
    if (document.body) document.body.dataset.adminLifecycleState = next;
    if (next === 'error' && accessError) {
      window.requestAnimationFrame(function () { accessError.focus(); });
    }
  }

  function markPageBegin(source) {
    var api = lifecycle();
    if (api && api.page) api.page.begin({ page: 'admin', source: source || 'admin-controller' });
  }

  function markPageReady(detail) {
    var api = lifecycle();
    if (api && api.page) api.page.ready(Object.assign({ page: 'admin', source: 'admin-controller', hasItems: true }, detail || {}));
  }

  function markPageFailed(error) {
    var api = lifecycle();
    if (api && api.page) api.page.fail(error, { page: 'admin', source: 'admin-controller' });
  }

  function navigateTo(url, options) {
    var api = lifecycle();
    var go = api && api.navigation && api.navigation.go || Doke.navigation && Doke.navigation.go;
    if (typeof go !== 'function') return Promise.reject(new Error('A navegação canônica não está disponível.'));
    return Promise.resolve(go(url, Object.assign({ source: 'admin-controller' }, options || {})));
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
    var access = adminAccessService();
    return access && typeof access.getCurrentUser === 'function' ? access.getCurrentUser() : null;
  }

  function canUseAdmin(user) {
    var access = adminAccessService();
    return Boolean(access && typeof access.canUseAdmin === 'function' && access.canUseAdmin(user || getCurrentUser()));
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
          canStart ? '<button class="doke-btn doke-btn--primary" type="button" data-admin-verification-action="start" data-verification-id="' + escapeHtml(item.id) + '">Iniciar análise</button>' : '',
          canDecide && !canStart ? '<a class="doke-btn doke-btn--primary" href="admin-verificacao.html?id=' + encodeURIComponent(item.id) + '">Abrir análise</a>' : '',
          !canDecide ? '<a class="doke-btn doke-btn--ghost" href="admin-verificacao.html?id=' + encodeURIComponent(item.id) + '">Ver detalhes</a>' : '',
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

  function releaseVerificationObjectUrls() {
    verificationObjectUrls.forEach(function (url) { try { URL.revokeObjectURL(url); } catch (_) {} });
    verificationObjectUrls = [];
  }

  function formatTaxId(value, type) {
    var digits = String(value || '').replace(/\D/g, '');
    if (type === 'business' && digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return digits || 'Não informado';
  }

  function formatPostalCode(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits.length === 8 ? digits.replace(/^(\d{5})(\d{3})$/, '$1-$2') : digits || 'Não informado';
  }

  function reviewField(label, value) {
    return '<div class="admin-verification-review__field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || 'Não informado') + '</strong></div>';
  }

  function evidencePreview(file, label) {
    if (!file) {
      return '<article class="admin-verification-evidence is-unavailable"><div><strong>' + escapeHtml(label) + '</strong><span>Arquivo não enviado.</span></div></article>';
    }
    var name = clean(file.fileName || 'Arquivo');
    var type = clean(file.type || '');
    var size = Number(file.size || 0);
    var meta = [name, size ? (size / 1024 / 1024).toFixed(2).replace('.', ',') + ' MB' : '', type].filter(Boolean).join(' · ');
    if (!(typeof Blob !== 'undefined' && file.blob instanceof Blob)) {
      return '<article class="admin-verification-evidence is-unavailable"><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(meta || 'Metadados preservados') + '</span><p>O arquivo pertence a um envio anterior à persistência documental e não está disponível para pré-visualização.</p></div></article>';
    }
    var url = URL.createObjectURL(file.blob);
    verificationObjectUrls.push(url);
    var preview = type === 'application/pdf'
      ? '<iframe class="admin-verification-evidence__pdf" src="' + escapeHtml(url) + '" title="' + escapeHtml(label) + '"></iframe>'
      : '<img class="admin-verification-evidence__image" src="' + escapeHtml(url) + '" alt="' + escapeHtml(label) + '">';
    return '<article class="admin-verification-evidence"><div class="admin-verification-evidence__header"><div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(meta) + '</span></div><a class="doke-btn doke-btn--ghost" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Abrir arquivo</a></div>' + preview + '</article>';
  }

  function renderVerificationReview(verification) {
    var payload = verification && verification.payload || {};
    var business = payload.verificationType === 'business';
    var address = [payload.street, payload.number, payload.complement, payload.district, payload.city, payload.state].filter(Boolean).join(', ');
    var hasFullEvidence = ['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress'].some(function (key) {
      return payload[key] && typeof Blob !== 'undefined' && payload[key].blob instanceof Blob;
    });
    if (verificationReviewTitle) verificationReviewTitle.textContent = business ? 'Verificação de pessoa jurídica' : 'Verificação de pessoa física';
    if (verificationReviewDescription) verificationReviewDescription.textContent = 'Enviada em ' + formatDate(verification.submittedAt || verification.updatedAt) + ' · ' + statusLabel(verification.status);
    if (!verificationReviewBody) return;
    verificationReviewBody.innerHTML = [
      '<section class="admin-verification-review__section"><div class="admin-verification-review__section-heading"><span>Identificação</span><h3>Dados do titular</h3></div><div class="admin-verification-review__fields">',
        reviewField(business ? 'Razão social' : 'Nome legal', payload.legalName),
        reviewField(business ? 'CNPJ' : 'CPF', formatTaxId(payload.taxId || payload.taxIdLast4, payload.verificationType)),
        business ? reviewField('Responsável legal', payload.representativeName) : reviewField('Data de nascimento', payload.birthDate),
        reviewField('Tipo de documento', payload.documentType),
      '</div></section>',
      '<section class="admin-verification-review__section"><div class="admin-verification-review__section-heading"><span>Endereço</span><h3>Residência ou sede</h3></div><div class="admin-verification-review__fields">',
        reviewField('CEP', formatPostalCode(payload.postalCode)),
        reviewField('Endereço completo', address),
      '</div></section>',
      '<section class="admin-verification-review__section"><div class="admin-verification-review__section-heading"><span>Documentos</span><h3>Evidências enviadas</h3></div>',
        hasFullEvidence ? '' : '<div class="admin-verification-review__notice">Este registro não possui todos os binários porque foi enviado antes da implantação do armazenamento documental. Não aprove sem revisar os arquivos originais.</div>',
        '<div class="admin-verification-review__evidence-grid">',
          evidencePreview(payload.documentFront, 'Frente do documento'),
          evidencePreview(payload.documentBack, 'Verso do documento'),
          evidencePreview(payload.selfieDocument, 'Selfie de verificação'),
          evidencePreview(payload.proofOfAddress, 'Comprovante de endereço'),
          business ? evidencePreview(payload.businessDocument, 'Documento empresarial') : '',
        '</div>',
      '</section>',
      '<section class="admin-verification-review__section"><div class="admin-verification-review__section-heading"><span>Declarações</span><h3>Consentimentos</h3></div><div class="admin-verification-review__checks">',
        '<span class="' + (payload.truthConfirmed ? 'is-confirmed' : 'is-missing') + '">' + (payload.truthConfirmed ? '✓' : '!') + ' Autenticidade dos dados confirmada</span>',
        '<span class="' + (payload.consentAccepted ? 'is-confirmed' : 'is-missing') + '">' + (payload.consentAccepted ? '✓' : '!') + ' Processamento dos dados autorizado</span>',
      '</div></section>'
    ].join('');
    var canDecide = verification.status === 'under_review';
    if (verificationReviewApprove) verificationReviewApprove.hidden = !canDecide || !hasFullEvidence;
    if (verificationReviewReject) verificationReviewReject.hidden = !canDecide;
  }

  function closeVerificationReview() {
    activeVerificationReviewId = '';
    releaseVerificationObjectUrls();
    if (!verificationReview) return;
    if (typeof verificationReview.close === 'function' && verificationReview.open) verificationReview.close();
    else verificationReview.removeAttribute('open');
  }

  function openVerificationReview(verificationId) {
    var id = clean(verificationId);
    var service = verificationService();
    if (!id || !service || typeof service.getReviewDetail !== 'function' || !verificationReview) return Promise.reject(new Error('Detalhes da verificação indisponíveis.'));
    activeVerificationReviewId = id;
    releaseVerificationObjectUrls();
    if (verificationReviewBody) verificationReviewBody.innerHTML = '<div class="admin-verification-review__loading">Carregando dados e documentos...</div>';
    if (verificationReviewApprove) verificationReviewApprove.hidden = true;
    if (verificationReviewReject) verificationReviewReject.hidden = true;
    if (typeof verificationReview.showModal === 'function') verificationReview.showModal();
    else verificationReview.setAttribute('open', '');
    return service.getReviewDetail(id).then(function (verification) {
      if (activeVerificationReviewId !== id) return;
      renderVerificationReview(verification);
    }).catch(function (error) {
      if (verificationReviewBody) verificationReviewBody.innerHTML = '<div class="admin-verification-review__notice">' + escapeHtml(error && error.message || 'Não foi possível carregar a análise.') + '</div>';
      throw error;
    });
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
        if (action === 'approve' || action === 'reject') closeVerificationReview();
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
    var failures = [];
    var state = {
      verifications: [],
      disputes: [],
      transactions: [],
      auditEvents: []
    };

    function trackFailure(scope, error) {
      failures.push({ scope: scope, error: error });
      return [];
    }

    var verificationsTask = listVerifications().then(function (items) {
      state.verifications = items;
      setStat('verifications', items.filter(function (item) {
        return ['submitted', 'under_review'].indexOf(item.status) >= 0;
      }).length);
      renderVerifications(items);
      return items;
    }).catch(function (error) {
      renderVerifications([]);
      return trackFailure('verificações', error);
    });

    var disputesTask = listDisputes().then(function (items) {
      state.disputes = items;
      return items;
    }).catch(function (error) {
      return trackFailure('contestações', error);
    });

    var transactionsTask = listTransactions().then(function (items) {
      state.transactions = items;
      renderPayments(items);
      renderWithdraws(items);
      return items;
    }).catch(function (error) {
      renderPayments([]);
      renderWithdraws([]);
      return trackFailure('pagamentos', error);
    });

    var auditTask = listAuditEvents().then(function (items) {
      state.auditEvents = items;
      return items;
    }).catch(function (error) {
      return trackFailure('auditoria', error);
    });

    var disputesRenderTask = Promise.all([disputesTask, transactionsTask]).then(function (result) {
      updateStats(result[0], result[1]);
      renderDisputes(result[0], result[1], orders);
    });

    var auditRenderTask = Promise.all([disputesTask, transactionsTask, auditTask]).then(function (result) {
      renderAudit(result[0], result[1], result[2]);
    });

    loadPromise = Promise.all([
      verificationsTask,
      transactionsTask,
      disputesRenderTask,
      auditRenderTask
    ]).then(function () {
      if (failures.length === 4) {
        var fatal = failures[0] && failures[0].error || new Error('Não foi possível carregar o admin.');
        if (runtime) runtime.fail(fatal);
        throw fatal;
      }
      if (runtime) runtime.finishLoad();
      if (failures.length) {
        showToast('Parte do painel não pôde ser atualizada: ' + failures.map(function (item) { return item.scope; }).join(', ') + '.');
      }
      return state;
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
    var runId = ++accessRun;
    var access = adminAccessService();
    setAccessSurface('guard-pending');
    markPageBegin('admin-access-guard');

    if (!access || typeof access.guardPage !== 'function') {
      var unavailable = new Error('O serviço de acesso administrativo não está disponível.');
      setAccessSurface('error', { message: unavailable.message });
      markPageFailed(unavailable);
      return Promise.resolve(null);
    }

    return access.guardPage({
      name: 'admin-dashboard-access',
      source: 'admin.html',
      deniedRedirect: 'pedidos.html',
      loginRedirect: 'auth/login.html'
    }).then(function (result) {
      if (runId !== accessRun) return null;
      if (!result || result.allowed !== true) {
        setAccessSurface(result && result.redirecting ? 'redirecting' : 'blocked');
        return null;
      }

      setAccessSurface('loading');
      return loadAdminData().then(function (state) {
        if (runId !== accessRun) return state;
        setAccessSurface('ready');
        markPageReady();
        return state;
      });
    }).catch(function (error) {
      if (runId !== accessRun) return null;
      setAccessSurface('error', {
        message: error && error.message ? error.message : 'Não foi possível validar o acesso administrativo.'
      });
      markPageFailed(error);
      return null;
    });
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var accessRetry = event.target.closest('[data-admin-access-retry]');
      if (accessRetry) {
        event.preventDefault();
        updateAccess();
        return;
      }

      var reviewLink = event.target.closest('a[href^="admin-verificacao.html"]');
      if (reviewLink) {
        event.preventDefault();
        navigateTo(reviewLink.getAttribute('href'), {
          source: 'admin-verification-open',
          forceDocument: true
        }).catch(function (error) {
          showToast(error && error.message ? error.message : 'Não foi possível abrir a análise.');
        });
        return;
      }

      var verificationOpen = event.target.closest('[data-admin-verification-open]');
      if (verificationOpen) {
        event.preventDefault();
        openVerificationReview(verificationOpen.dataset.verificationId).catch(function (error) { showToast(error && error.message || 'Não foi possível abrir a análise.'); });
        return;
      }

      var verificationReviewClose = event.target.closest('[data-admin-verification-review-close]');
      if (verificationReviewClose) {
        event.preventDefault();
        closeVerificationReview();
        return;
      }

      var verificationReviewApproveButton = event.target.closest('[data-admin-verification-review-approve]');
      if (verificationReviewApproveButton) {
        event.preventDefault();
        resolveVerification('approve', activeVerificationReviewId);
        return;
      }

      var verificationReviewRejectButton = event.target.closest('[data-admin-verification-review-reject]');
      if (verificationReviewRejectButton) {
        event.preventDefault();
        var reviewId = activeVerificationReviewId;
        closeVerificationReview();
        openVerificationRejectDialog(reviewId);
        return;
      }

      var verificationButton = event.target.closest('[data-admin-verification-action]');
      if (verificationButton) {
        event.preventDefault();
        var verificationAction = clean(verificationButton.dataset.adminVerificationAction);
        var verificationId = clean(verificationButton.dataset.verificationId);
        if (verificationAction === 'start') {
          var service = verificationService();
          var runtime = experience();
          var operation = function () {
            return service.startReview(verificationId).then(function () {
              if (runtime) runtime.invalidateRelated();
              return navigateTo('admin-verificacao.html?id=' + encodeURIComponent(verificationId), {
                source: 'admin-verification-start',
                forceDocument: true
              });
            });
          };
          var promise = runtime ? runtime.runMutation('verification:' + verificationId, operation) : operation();
          promise.catch(function (error) { showToast(error && error.message || 'Não foi possível iniciar a análise.'); });
        } else if (verificationAction === 'reject') openVerificationRejectDialog(verificationId);
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

    document.addEventListener('input', function (event) {
      var input = event.target.closest('[data-admin-search]');
      if (!input) return;
      searchInput = input;
      searchQuery = input.value || '';
      if (canUseAdmin()) loadAdminData().catch(function () {});
    });

    document.addEventListener('doke:auth-session-change', function () {
      updateAccess().catch(function () {});
    });
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
    refreshNodes();
    if (!root) return;
    if (!eventsBound) {
      bind();
      eventsBound = true;
    }
    updateAccess().catch(function () {});
  }

  window.DokeInitAdmin = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
