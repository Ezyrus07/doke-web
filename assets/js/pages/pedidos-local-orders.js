/* Doke pedidos local orders
   Responsibility: render locally-created order cards before pedidos page controllers read DOM. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createDomId(value) {
    return String(value || 'order')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'order';
  }

  function formatCreatedAt(value) {
    if (!value) return 'Solicitado agora';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Solicitado agora';
    return 'Solicitado em ' + new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  function getProgressDate(value) {
    var date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }).format(date);
  }

  function getCurrentUser() {
    try {
      if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
        var sessionUser = Doke.session.getCurrentUser();
        if (sessionUser) return sessionUser;
      }
    } catch (error) {
      // keep fallback below
    }

    try {
      var raw = window.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getInitials(value) {
    return String(value || 'Doke')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join('') || 'DK';
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function isProfessionalView(order) {
    var user = getCurrentUser();
    if (!user || !user.id) return false;
    if (String(user.id) === String(order.professionalId || order.providerId)) return true;
    return isDemoProfessional(user) && Boolean(order && order.id && (order.clientId || order.serviceId));
  }

  function normalizeStatusToken(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function getWalletDisputeForOrder(order) {
    var wallet = Doke.repositories && Doke.repositories.wallet;
    if (!wallet || typeof wallet.listDisputes !== 'function' || !order || !order.id) return null;
    var disputes = wallet.listDisputes({ orderId: order.id, currentUser: false }) || [];
    return disputes[0] || null;
  }

  function getWalletTransactionForOrder(order) {
    var wallet = Doke.repositories && Doke.repositories.wallet;
    if (!wallet || typeof wallet.readWallet !== 'function' || !order || !order.id) return null;
    var orderId = String(order.id || '');
    var messageId = String(order.messageId || order.conversationId || '');
    var data = wallet.readWallet() || {};
    var transactions = Array.isArray(data.transactions) ? data.transactions : [];
    return transactions.find(function (transaction) {
      if (!transaction) return false;
      var type = String(transaction.type || '').toLowerCase();
      if (type === 'withdraw') return false;
      if (orderId && String(transaction.orderId || '') === orderId) return true;
      if (messageId && String(transaction.messageId || transaction.conversationId || '') === messageId) return true;
      return false;
    }) || null;
  }

  function getReceiptUrl(transaction) {
    if (!transaction || !transaction.id) return '';
    return 'carteira.html?transaction=' + encodeURIComponent(transaction.id) + '&receipt=1';
  }

  function canReportProblem(order, professionalView, disputePresentation, transaction) {
    if (professionalView || disputePresentation || !transaction) return false;
    var status = normalizeStatusToken(order && order.status || '');
    var allowed = ['accepted', 'conversation', 'responded', 'quoted', 'in_progress', 'completed'];
    return allowed.indexOf(status) !== -1;
  }

  function getOrderDisputePresentation(dispute, order) {
    var explicit = normalizeStatusToken(order && order.disputeStatus || '');
    var status = normalizeStatusToken(dispute && dispute.status || explicit);
    if (!status) return null;

    if (status === 'reembolsado' || status === 'resolvida_cliente') {
      return {
        state: 'reembolsado',
        label: 'Reembolsado ao cliente',
        title: 'Contestação encerrada',
        text: 'Contestação encerrada. Cliente reembolsado.'
      };
    }

    if (status === 'resolvida_profissional') {
      return {
        state: 'resolvida',
        label: 'Repasse liberado',
        title: 'Contestação encerrada',
        text: 'Contestação encerrada. Repasse liberado ao profissional.'
      };
    }

    if (status === 'em_analise') {
      return {
        state: 'analise',
        label: 'Em análise',
        title: 'Pedido em análise',
        text: 'Mantenha a conversa centralizada enquanto o suporte financeiro conclui a análise.'
      };
    }

    return {
      state: 'contestacao',
      label: 'Em contestação',
      title: 'Pedido em contestação',
      text: 'O cliente abriu uma análise sobre este serviço. Acompanhe pelo pedido ou pela conversa.'
    };
  }


  function isActiveDisputePresentation(presentation) {
    return Boolean(presentation && (presentation.state === 'contestacao' || presentation.state === 'analise'));
  }

  function getDisputeStatusClass(presentation, fallbackStatus) {
    if (!presentation) return statusClass(fallbackStatus);
    if (presentation.state === 'contestacao' || presentation.state === 'analise') return 'disputed';
    if (presentation.state === 'resolvida' || presentation.state === 'reembolsado') return 'completed';
    return statusClass(fallbackStatus);
  }

  function getDisputeReasonLabel(dispute, order) {
    var code = normalizeStatusToken(dispute && dispute.reasonCode || order && order.disputeReasonCode || '');
    if (code === 'service_not_completed') return 'Serviço não foi concluído';
    if (code === 'different_result') return 'Resultado diferente do combinado';
    if (code === 'no_response') return 'Profissional não respondeu';
    if (code === 'other') return 'Outro motivo';
    var reason = String(dispute && dispute.reason || order && order.disputeReason || '').trim();
    if (!reason) return 'Motivo não informado';
    return reason.split('.')[0] || reason;
  }

  function getDisputeReportText(dispute, order) {
    var reason = String(dispute && dispute.reason || order && order.disputeReason || '').trim();
    if (!reason) return 'O relato do cliente ainda não foi detalhado.';
    var label = getDisputeReasonLabel(dispute, order);
    var normalizedReason = reason.toLowerCase();
    var normalizedLabel = label.toLowerCase();
    if (normalizedReason.indexOf(normalizedLabel + '.') === 0) {
      return reason.slice(label.length + 1).trim() || reason;
    }
    return reason;
  }

  function statusClass(status) {
    if (status === 'disputed') return 'disputed';
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'conversation' || status === 'accepted' || status === 'in_progress') return 'conversation';
    if (status === 'responded' || status === 'quoted') return 'responded';
    return 'pending';
  }

  function serializeAttachments(attachments) {
    if (!Array.isArray(attachments) || !attachments.length) return '';
    try {
      return JSON.stringify(attachments.map(function (attachment) {
        if (typeof attachment === 'string') {
          return { name: attachment, type: '', size: 0, url: '', previewable: false };
        }

        return {
          name: attachment && attachment.name || 'anexo',
          type: attachment && attachment.type || '',
          size: Number(attachment && attachment.size) || 0,
          url: attachment && attachment.url || '',
          previewable: Boolean(attachment && (attachment.previewable || attachment.url)),
          tooLarge: Boolean(attachment && attachment.tooLarge),
          error: Boolean(attachment && attachment.error)
        };
      }));
    } catch (error) {
      return '';
    }
  }

  function getPrimaryActionLabel(order, professionalView) {
    var status = order.status || 'pending';
    if (status === 'pending' && professionalView) return 'Aceitar pedido';
    if (status === 'accepted' || status === 'conversation' || status === 'responded') return professionalView ? 'Enviar proposta' : 'Abrir conversa';
    if (status === 'quoted') return professionalView ? 'Acompanhar proposta' : 'Ver proposta';
    if (status === 'in_progress') return 'Abrir conversa';
    if (status === 'completed') return professionalView ? 'Ver resumo' : 'Avaliar';
    if (status === 'cancelled') return 'Ver detalhes';
    return professionalView ? 'Responder cliente' : 'Abrir conversa';
  }

  function getDetailFlow(order, professionalView) {
    var status = order.status || 'pending';
    if (status === 'accepted' || status === 'conversation' || status === 'responded') return 'Pedido aceito. A conversa está liberada para alinhar proposta e próximos passos.';
    if (status === 'quoted') return 'Proposta enviada pelo profissional. O cliente precisa aprovar para liberar o atendimento.';
    if (status === 'in_progress') return 'Proposta aprovada. O atendimento está em andamento.';
    if (status === 'completed') return 'Pedido concluído. O fluxo fica disponível para avaliação e histórico.';
    if (status === 'cancelled') return 'Pedido recusado pelo profissional. A justificativa fica registrada no histórico do pedido.';
    return professionalView ? 'Pedido recebido pelo fluxo de orçamento. Responda o cliente para avançar a negociação.' : 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.';
  }

  function createOrderCard(order) {
    var id = escapeHtml(order.id);
    var status = escapeHtml(order.status || 'pending');
    var professionalView = isProfessionalView(order);
    var dispute = getWalletDisputeForOrder(order);
    var disputePresentation = getOrderDisputePresentation(dispute, order);
    var walletTransaction = getWalletTransactionForOrder(order);
    var disputeReasonLabel = disputePresentation ? getDisputeReasonLabel(dispute, order) : '';
    var disputeReportText = disputePresentation ? getDisputeReportText(dispute, order) : '';
    var disputeResponseText = disputePresentation ? String(dispute && (dispute.responseText || dispute.professionalResponse) || order.disputeResponseText || '').trim() : '';
    var disputeResponseAt = disputePresentation ? String(dispute && (dispute.responseAt || dispute.professionalResponseAt) || order.disputeResponseAt || '').trim() : '';
    var disputeRespondedBy = disputePresentation ? String(dispute && (dispute.respondedBy || dispute.professionalResponseBy) || order.disputeRespondedBy || '').trim() : '';
    var reportProblemAllowed = canReportProblem(order, professionalView, disputePresentation, walletTransaction);
    var actionsMenuId = 'order-actions-menu-' + createDomId(id);
    var statusLabel = escapeHtml(disputePresentation ? disputePresentation.label : order.statusLabel || 'Aguardando resposta');
    var peerNameRaw = professionalView
      ? order.clientName || 'Cliente Doke'
      : order.providerName || order.provider || 'Profissional Doke';
    var peerRole = professionalView ? 'client' : 'professional';
    var peerRoleLabel = professionalView ? 'Cliente' : 'Profissional';
    var provider = escapeHtml(peerNameRaw);
    var initials = escapeHtml(professionalView ? order.clientInitials || getInitials(peerNameRaw) : order.providerInitials || getInitials(peerNameRaw));
    var title = escapeHtml(order.serviceTitle || order.service || order.title || 'Serviço solicitado');
    var location = escapeHtml(order.location || order.locationTitle || 'Endereço a confirmar');
    var scope = escapeHtml(order.scope || order.details || order.description || 'Escopo enviado pelo orçamento');
    var timeline = escapeHtml(order.urgency || order.desiredDate || 'Aguardando retorno do profissional');
    var materials = escapeHtml(order.materials || 'Materiais a alinhar com o profissional');
    var budget = escapeHtml(order.budget || order.detailBudget || 'A definir após resposta do profissional');
    var payment = escapeHtml(order.payment || 'Pagamento a combinar');
    var requestType = escapeHtml(order.requestType || 'Orçamento para execução');
    var detailFlow = escapeHtml(disputePresentation ? disputePresentation.text : order.detailFlow || getDetailFlow(order, professionalView));
    var attachments = serializeAttachments(order.attachments || []);
    var createdLabel = escapeHtml(formatCreatedAt(order.createdAt || order.creatédAt));
    var progressDate = escapeHtml(getProgressDate(order.createdAt || order.creatédAt));
    var dotClass = 'order-card__status-dot--' + getDisputeStatusClass(disputePresentation, order.status);

    var article = document.createElement('article');
    article.className = 'order-card doke-selectable-card doke-card doke-order-card';
    article.dataset.id = order.id;
    article.dataset.localOrder = 'true';
    article.dataset.domainCard = 'order';
    article.dataset.status = order.status || 'pending';
    article.dataset.detailStatus = disputePresentation ? disputePresentation.label : order.statusLabel || 'Aguardando resposta';
    if (disputePresentation) {
      article.dataset.disputeState = disputePresentation.state;
      article.dataset.disputeStatus = dispute && dispute.status || order.disputeStatus || '';
      article.dataset.disputeReason = dispute && dispute.reason || order.disputeReason || '';
      article.dataset.disputeReasonCode = dispute && dispute.reasonCode || order.disputeReasonCode || '';
      article.dataset.disputeReasonLabel = disputeReasonLabel;
      article.dataset.disputeReportText = disputeReportText;
      article.dataset.disputeOpenedBy = dispute && dispute.openedBy || order.disputeOpenedBy || 'client';
      article.dataset.disputeResolution = dispute && dispute.resolution || order.disputeResolution || '';
      article.dataset.disputeId = dispute && dispute.id || order.disputeId || '';
      article.dataset.disputeResponseText = disputeResponseText;
      article.dataset.disputeResponseAt = disputeResponseAt;
      article.dataset.disputeRespondedBy = disputeRespondedBy;
      if (isActiveDisputePresentation(disputePresentation)) article.classList.add('order-card--disputed');
      else article.classList.add('order-card--dispute-closed');
    }
    if (walletTransaction && walletTransaction.id) {
      article.dataset.walletTransactionId = walletTransaction.id;
      article.dataset.receiptUrl = getReceiptUrl(walletTransaction);
      article.dataset.walletReceiptUrl = getReceiptUrl(walletTransaction);
    }
    article.dataset.detailAddress = order.location || order.locationTitle || 'Endereço a confirmar';
    article.dataset.detailScope = order.scope || order.details || order.description || 'Escopo enviado pelo orçamento';
    article.dataset.detailTimeline = order.urgency || order.desiredDate || 'Aguardando retorno do profissional';
    article.dataset.detailMatérials = order.materials || 'Materiais a alinhar com o profissional';
    article.dataset.detailBudget = order.budget || order.detailBudget || 'A definir após resposta do profissional';
    article.dataset.detailPayment = order.payment || 'Pagamento a combinar';
    article.dataset.detailFlow = order.detailFlow || getDetailFlow(order, professionalView);
    article.dataset.viewerRole = professionalView ? 'professional' : 'client';
    article.dataset.peerRole = peerRole;
    article.dataset.peerRoleLabel = peerRoleLabel;
    article.dataset.clientName = order.clientName || 'Cliente Doke';
    article.dataset.professionalName = order.providerName || order.provider || 'Profissional Doke';
    article.dataset.attachments = attachments;
    article.tabIndex = 0;
    article.innerHTML = `
      <button class="order-card__select doke-selection-check" type="button" aria-label="Selecionar pedido" aria-pressed="false"><span></span></button>
      <div class="order-card__top">
        <div class="order-card__statusline">
          <span class="order-card__status-dot ${dotClass}"></span>
          <span class="order-card__status-text">${statusLabel}</span>
        </div>
        <span class="order-card__time">${createdLabel}</span>
      </div>
      <div class="order-card__body">
        <h2>${title}</h2>
        <p class="order-card__subtitle">${professionalView ? 'Solicitação de' : 'Aguardando resposta de'} <strong>${provider}</strong></p>
        <div class="order-card__identity">
          <span class="order-card__avatar doke-avatar">${initials}</span>
          <span class="order-card__location">${location}</span>
        </div>
        ${disputePresentation ? `
        <div class="order-card__dispute-note" data-order-dispute-state="${escapeHtml(disputePresentation.state)}">
          <strong>${escapeHtml(disputePresentation.title)}</strong>
          <span>${escapeHtml(disputePresentation.text)}</span>
        </div>` : ``}
      </div>
      <div class="order-card__actions${reportProblemAllowed ? ' order-card__actions--preferred' : ''}">
        ${disputePresentation ? `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="chat">Abrir conversa</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="details">Ver detalhes</button>
        ` : professionalView && (order.status || 'pending') === 'pending' ? `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-accept="${id}">Aceitar pedido</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-decline="${id}">Recusar</button>
        ` : `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="details">Ver detalhes</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="chat">${escapeHtml(getPrimaryActionLabel(order, professionalView))}</button>
        `}
      </div>
      ${walletTransaction && walletTransaction.id ? `
      <div class="order-card__support-actions" aria-label="Ações secundárias do pedido">
        ${reportProblemAllowed && !disputePresentation ? `<button class="order-card__support-action order-card__support-action--warning" type="button" data-order-report-issue="${id}" data-order-transaction="${escapeHtml(walletTransaction.id || '')}">
          <span class="order-card__support-icon" aria-hidden="true">!</span>
          <span>Relatar problema</span>
        </button>` : ``}
        <a class="order-card__support-action" href="${escapeHtml(getReceiptUrl(walletTransaction))}" data-order-receipt>
          <span class="order-card__support-icon" aria-hidden="true">✓</span>
          <span>Ver comprovante</span>
        </a>
        <button class="order-card__support-more doke-more-button" type="button" aria-label="Mais opções do pedido"><span aria-hidden="true">•••</span></button>
      </div>` : ``}
`;

    article.dataset.detailScope = scope;
    article.dataset.detailTimeline = timeline;
    article.dataset.detailMatérials = materials;
    article.dataset.detailBudget = budget;
    article.dataset.detailPayment = payment;
    article.dataset.detailFlow = detailFlow;
    article.dataset.attachments = attachments;

    return article;
  }

  function render(options) {
    options = options || {};
    if (document.body?.dataset.page !== 'pedidos') return;
    var list = document.querySelector('.orders-list');
    if (!list) return;
    var repository = Doke.repositories && Doke.repositories.orders;
    if (!repository || typeof repository.listLocal !== 'function') return;

    var user = getCurrentUser();
    var orders = repository.listLocal({ currentUser: true });
    var signature = [
      user && user.id || 'guest',
      user && user.role || 'guest',
      orders.map(function (order) {
        return [
          order && order.id,
          order && order.status,
          order && order.updatedAt,
          order && order.disputeStatus,
          order && order.disputeResponseText,
          (() => { var d = getWalletDisputeForOrder(order); return d && (d.status + ':' + d.updatedAt + ':' + (d.responseAt || '')); })(),
          (() => { var t = getWalletTransactionForOrder(order); return t && (t.id + ':' + t.status + ':' + (t.releaseStatus || '') + ':' + (t.updatedAt || '')); })(),
          isProfessionalView(order) ? 'professional' : 'client'
        ].filter(Boolean).join(':');
      }).filter(Boolean).join('|')
    ].join('::');

    if (!options.force && list.dataset.localOrdersRendered === 'true' && list.dataset.localOrdersSignature === signature) return;

    Array.from(list.querySelectorAll('.order-card[data-local-order="true"]')).forEach(function (card) {
      card.remove();
    });

    orders.slice().reverse().forEach(function (order) {
      if (!order || !order.id) return;
      list.insertBefore(createOrderCard(order), list.firstElementChild);
    });

    list.dataset.localOrdersRendered = 'true';
    list.dataset.localOrdersSignature = signature;
    document.dispatchEvent(new CustomEvent('doke:orders-list-hydrated', {
      detail: {
        localCount: orders.length,
        totalCount: list.querySelectorAll('.order-card[data-id]').length,
        user: user
      }
    }));
  }


  function showIssueFeedback(orderId, result) {
    var targetUrl = 'mensagens.html?order=' + encodeURIComponent(orderId || '');
    if (Doke.operationalEventToast && typeof Doke.operationalEventToast.notify === 'function') {
      Doke.operationalEventToast.notify({
        category: 'orders',
        type: 'order_dispute_opened',
        title: 'Relato enviado',
        body: 'O pedido entrou em contestação e o repasse ficará pausado até a análise.',
        targetUrl: targetUrl,
        actionLabel: 'Abrir conversa',
        orderId: orderId || '',
        conversationId: result && result.dispute && result.dispute.conversationId || '',
        eventKey: ['issue_report_feedback', orderId || '', Date.now().toString(36)].join(':')
      });
      return;
    }
    window.alert('Relato enviado. O pedido entrou em contestação.');
  }

  function requestIssueReport(orderId, trigger) {
    var card = trigger && trigger.closest ? trigger.closest('.order-card') : null;
    var orderTitle = card && card.querySelector ? card.querySelector('.order-card__body h2')?.textContent : '';
    if (window.DokeIssueReportDialog && typeof window.DokeIssueReportDialog.request === 'function') {
      return window.DokeIssueReportDialog.request({
        trigger: trigger,
        orderTitle: orderTitle,
        title: 'Relatar problema',
        text: 'Conte o que aconteceu. O repasse ficará pausado enquanto o pedido é analisado.',
        submitLabel: 'Enviar relato'
      });
    }
    window.alert('Não foi possível abrir o relato. Recarregue a página e tente novamente.');
    return Promise.resolve(null);
  }

  function submitIssueReport(orderId, transactionId, report, trigger) {
    var wallet = Doke.services && Doke.services.wallet || Doke.repositories && Doke.repositories.wallet;
    if (!wallet || typeof wallet.openDispute !== 'function') return Promise.reject(new Error('Contestação indisponível.'));
    var user = getCurrentUser() || {};
    return wallet.openDispute({
      orderId: orderId,
      transactionId: transactionId || '',
      reason: report.reason,
      reasonCode: report.reasonCode,
      openedBy: 'client',
      clientId: user.id || ''
    });
  }

  function requestDeclineReason(orderId, trigger) {
    var card = trigger && trigger.closest ? trigger.closest('.order-card') : null;
    var orderTitle = card && card.querySelector ? card.querySelector('.order-card__body h2')?.textContent : '';
    if (window.DokeDeclineReasonDialog && typeof window.DokeDeclineReasonDialog.request === 'function') {
      return window.DokeDeclineReasonDialog.request({
        trigger: trigger,
        orderTitle: orderTitle,
        title: 'Recusar pedido',
        text: 'Explique ao cliente por que este pedido não poderá ser atendido.'
      });
    }
    window.alert('Não foi possível abrir o modal de justificativa. Recarregue a página e tente novamente.');
    return Promise.resolve(null);
  }

  function closeOrderActionMenus(exceptMenu) {
    Array.from(document.querySelectorAll('[data-order-actions-menu]')).forEach(function (menu) {
      if (exceptMenu && menu === exceptMenu) return;
      var button = menu.querySelector('[data-order-actions-toggle]');
      var popover = menu.querySelector('[data-order-actions-popover]');
      if (button) button.setAttribute('aria-expanded', 'false');
      if (popover) popover.hidden = true;
    });
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target && event.target.closest && event.target.closest('[data-order-actions-toggle]');
    if (toggle) {
      var menu = toggle.closest('[data-order-actions-menu]');
      var popover = menu && menu.querySelector('[data-order-actions-popover]');
      if (!menu || !popover) return;

      event.preventDefault();
      event.stopPropagation();

      var willOpen = popover.hidden;
      closeOrderActionMenus(menu);
      popover.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      return;
    }

    if (!event.target.closest || !event.target.closest('[data-order-actions-menu]')) {
      closeOrderActionMenus();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeOrderActionMenus();
  });

  document.addEventListener('click', function (event) {
    var reportButton = event.target && event.target.closest && event.target.closest('[data-order-report-issue]');
    if (!reportButton) return;

    var orderId = reportButton.dataset.orderReportIssue || '';
    var transactionId = reportButton.dataset.orderTransaction || reportButton.closest('.order-card')?.dataset.walletTransactionId || '';
    if (!orderId) return;

    event.preventDefault();
    event.stopPropagation();
    closeOrderActionMenus();

    requestIssueReport(orderId, reportButton).then(function (report) {
      if (!report) return;
      reportButton.disabled = true;
      reportButton.textContent = 'Enviando...';
      submitIssueReport(orderId, transactionId, report, reportButton).then(function (result) {
        showIssueFeedback(orderId, result);
        scheduleRender({ force: true });
      }).catch(function (error) {
        window.alert(error && error.message ? error.message : 'Não foi possível enviar o relato.');
      }).finally(function () {
        reportButton.disabled = false;
        reportButton.textContent = 'Relatar problema';
      });
    });
  });

  document.addEventListener('click', function (event) {
    var acceptButton = event.target && event.target.closest && event.target.closest('[data-order-accept]');
    var declineButton = event.target && event.target.closest && event.target.closest('[data-order-decline]');
    if (!acceptButton && !declineButton) return;

    var orderId = acceptButton ? acceptButton.dataset.orderAccept : declineButton.dataset.orderDecline;
    if (!orderId || !Doke.services || !Doke.services.orders) return;

    event.preventDefault();

    if (acceptButton) {
      acceptButton.disabled = true;
      acceptButton.textContent = 'Aceitando...';
      Doke.services.orders.accept(orderId).then(function () {
        scheduleRender({ force: true });
        window.location.href = 'mensagens.html?order=' + encodeURIComponent(orderId);
      }).catch(function (error) {
        acceptButton.disabled = false;
        acceptButton.textContent = 'Aceitar pedido';
        window.alert(error && error.message ? error.message : 'Não foi possível aceitar o pedido.');
      });
      return;
    }

    requestDeclineReason(orderId, declineButton).then(function (reason) {
      if (!reason || !reason.trim()) return;

      declineButton.disabled = true;
      declineButton.textContent = 'Recusando...';
      Doke.services.orders.decline(orderId, reason.trim()).then(function () {
        scheduleRender({ force: true });
        window.location.reload();
      }).catch(function (error) {
        declineButton.disabled = false;
        declineButton.textContent = 'Recusar';
        window.alert(error && error.message ? error.message : 'Não foi possível recusar o pedido.');
      });
    });
  });


  function scheduleRender(options) {
    window.requestAnimationFrame(function () { render(options); });
  }

  window.DokeHydrateLocalOrders = function DokeHydrateLocalOrders(options) {
    render(Object.assign({ force: true }, options || {}));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); }, { once: true });
  } else {
    render();
  }

  document.addEventListener('doke:route-ready', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:stable-route-ready', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:auth-session-change', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:auth-surface-ready', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-created', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-status-changed', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-receivable-created', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-receivable-updated', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-opened', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-resolved', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-responded', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-dispute-synced', function () { scheduleRender({ force: true }); });
})();
