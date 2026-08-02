/* Doke pedidos local orders
   Responsibility: render locally-created order cards before pedidos page controllers read DOM. */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var accessGranted = false;

  var CARD_ICONS = {
    receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v15H7z"></path><path d="M9.5 9.5h5"></path><path d="M9.5 13h5"></path></svg>'
  };

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
      if (window.DokeAuth && window.DokeAuth.service && typeof window.DokeAuth.service.getCurrentUser === 'function') {
        return window.DokeAuth.service.getCurrentUser() || null;
      }
    } catch (error) {
      return null;
    }
    return null;
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
    if (!user || !user.id || user.role !== 'professional') return false;
    if (String(user.id) === String(order.professionalId || order.providerId)) return true;
    return isDemoProfessional(user) && Boolean(order && order.id && (order.clientId || order.serviceId));
  }

  function normalizeStatusToken(value) {
    var normalized = String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    var stateMachine = Doke.services && Doke.services.orders && Doke.services.orders.stateMachine;
    if (stateMachine && typeof stateMachine.normalizeStatus === 'function') return stateMachine.normalizeStatus(normalized);
    if (normalized === 'conversation') return 'accepted';
    if (normalized === 'responded') return 'quoted';
    return normalized;
  }

  function canTransitionOrder(order, nextStatus) {
    var user = getCurrentUser();
    var stateMachine = Doke.services && Doke.services.orders && Doke.services.orders.stateMachine;
    if (!order || !user || !user.id) return false;
    if (stateMachine && typeof stateMachine.canTransition === 'function') {
      return stateMachine.canTransition(order, nextStatus, user);
    }

    var currentStatus = normalizeStatusToken(order.status || 'pending');
    var targetStatus = normalizeStatusToken(nextStatus);
    if (user.role === 'professional' && isProfessionalView(order)) {
      return currentStatus === 'pending' && (targetStatus === 'accepted' || targetStatus === 'cancelled');
    }
    if (user.role === 'client' && String(order.clientId || '') === String(user.id)) {
      return currentStatus === 'quoted' && (targetStatus === 'in_progress' || targetStatus === 'cancelled');
    }
    return false;
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
    var paymentStatus = normalizeStatusToken(order && order.paymentStatus || '');
    var completionStatus = normalizeStatusToken(order && order.completionStatus || '');
    var transactionStatus = normalizeStatusToken(transaction.status || transaction.releaseStatus || '');
    return status === 'in_progress'
      && paymentStatus === 'held'
      && completionStatus !== 'confirmed'
      && transaction.type === 'receivable'
      && (transactionStatus === 'held' || transactionStatus === 'pending');
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
    if (status === 'conversation' || status === 'accepted' || status === 'scheduled' || status === 'in_progress') return 'conversation';
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

  function getServiceImage(order) {
    var snapshot = order && order.serviceSnapshot && typeof order.serviceSnapshot === 'object' ? order.serviceSnapshot : {};
    var images = Array.isArray(order && order.serviceImages) ? order.serviceImages : [];
    return String(order && order.serviceImage || images[0] || snapshot.image || '').trim();
  }

  function getServiceCategory(order) {
    var snapshot = order && order.serviceSnapshot && typeof order.serviceSnapshot === 'object' ? order.serviceSnapshot : {};
    return String(order && order.serviceCategory || snapshot.category || '').trim();
  }

  function getServiceSchedule(order) {
    var snapshot = order && order.serviceSnapshot && typeof order.serviceSnapshot === 'object' ? order.serviceSnapshot : {};
    var schedule = Array.isArray(order && order.serviceAvailabilitySchedule)
      ? order.serviceAvailabilitySchedule
      : Array.isArray(snapshot.availabilitySchedule) ? snapshot.availabilitySchedule : [];
    return schedule.filter(function (slot) {
      return slot && slot.start && slot.end;
    }).slice(0, 2);
  }

  function formatServiceSchedule(order) {
    var schedule = getServiceSchedule(order);
    if (!schedule.length) return 'Agenda a combinar';
    return schedule.map(function (slot) {
      return String(slot.label || slot.day || 'Dia') + ' ' + String(slot.start) + '–' + String(slot.end);
    }).join(' • ');
  }


  function formatIntentDate(value) {
    var normalized = String(value || '').trim();
    if (!normalized) return '';
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    var date = match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
      : new Date(normalized);
    if (Number.isNaN(date.getTime())) return normalized;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  function formatCanonicalSchedule(value) {
    var date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return null;
    var timeZone = '';
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
    catch (error) { timeZone = ''; }
    var options = { dateStyle: 'medium', timeStyle: 'short' };
    if (timeZone) options.timeZone = timeZone;
    return {
      label: new Intl.DateTimeFormat('pt-BR', options).format(date),
      timeZone: timeZone
    };
  }

  function getSchedulePresentation(order) {
    order = order || {};
    var sharedPresenter = Doke.patterns && Doke.patterns.orderSchedulePresentation;
    if (sharedPresenter && typeof sharedPresenter.getPresentation === 'function') {
      return sharedPresenter.getPresentation(order);
    }
    var authority = String(order.scheduleAuthority || 'none');
    if (authority === 'canonical_confirmed' && order.hasCanonicalSchedule === true) {
      var canonical = formatCanonicalSchedule(order.scheduledAt);
      if (canonical) {
        return {
          authority: 'canonical_confirmed',
          label: 'Agendado: ' + canonical.label,
          detail: 'Agendamento confirmado para ' + canonical.label + (canonical.timeZone ? ' (' + canonical.timeZone + ')' : '')
        };
      }
      authority = 'incomplete_projection';
    }
    if (authority === 'incomplete_projection') {
      return {
        authority: 'incomplete_projection',
        label: 'Agenda indisponível: atualize o pedido',
        detail: 'A projeção de agenda está incompleta. Nenhum horário deve ser tratado como confirmado.'
      };
    }
    if (authority === 'client_intent') {
      var intent = formatIntentDate(order.desiredDate || order.date || order.daté || '');
      return {
        authority: 'client_intent',
        label: 'Data desejada: ' + (intent || 'a combinar'),
        detail: 'Data desejada pelo cliente. O horário ainda não foi confirmado.'
      };
    }
    return {
      authority: 'none',
      label: 'Disponibilidade do anúncio: ' + formatServiceSchedule(order),
      detail: 'Nenhum agendamento foi confirmado para este pedido.'
    };
  }

  function getAttachmentsCount(order) {
    return Array.isArray(order && order.attachments) ? order.attachments.length : 0;
  }

  function getPrimaryActionLabel(order, professionalView) {
    var status = order.status || 'pending';
    var paymentStatus = normalizeStatusToken(order.paymentStatus || '');
    var completionStatus = normalizeStatusToken(order.completionStatus || '');
    if (status === 'pending' && professionalView) return 'Aceitar pedido';
    if (status === 'in_progress' && paymentStatus === 'held' && professionalView && completionStatus !== 'requested') return 'Solicitar conclusão';
    if (status === 'in_progress' && paymentStatus === 'held' && !professionalView && completionStatus === 'requested') return 'Confirmar conclusão';
    if (status === 'cancelled') return 'Detalhes';
    return 'Conversa';
  }

  function getCardBadgeLabel(order) {
    var status = normalizeStatusToken(order && order.status || 'pending');
    if (order && order.smartBadge) return order.smartBadge;
    if (order && order.scheduleAuthority === 'incomplete_projection') return 'Agenda indisponível';
    if (order && order.scheduleAuthority === 'canonical_confirmed' && order.hasCanonicalSchedule === true) return 'Agendado';
    if (status === 'completed') return 'Pós-serviço';
    if (status === 'accepted' || status === 'conversation') return 'Conversa';
    if (status === 'quoted') return 'Proposta';
    if (status === 'responded') return 'Acompanhar';
    if (status === 'in_progress' && normalizeStatusToken(order.completionStatus || '') === 'requested') return 'Confirmar conclusão';
    if (status === 'in_progress' && normalizeStatusToken(order.paymentStatus || '') === 'held') return 'Pagamento protegido';
    if (status === 'in_progress') return 'Em andamento';
    if (status === 'cancelled') return 'Arquivado';
    return 'Ação pendente';
  }

  function formatCardTitle(value) {
    var title = String(value || '').replace(/\s+/g, ' ').trim();
    var words = title.split(' ').filter(Boolean);
    var titleCaseLike = words.length > 2 && words.every(function (word, index) {
      if (/^(de|da|do|das|dos|e)$/i.test(word)) return true;
      return index === 0 || /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç-]+$/.test(word);
    });

    if (!titleCaseLike || /\b[A-Z]{2,}\b/.test(title)) return title;
    return title.charAt(0).toUpperCase() + title.slice(1).toLocaleLowerCase('pt-BR');
  }

  function formatCardLocation(value) {
    var location = String(value || '').replace(/\s+/g, ' ').trim();
    if (!location) return 'Endereço a confirmar';

    var parts = location.split(/[•·]/).map(function (part) { return part.trim(); }).filter(Boolean);
    var state = parts.length ? parts[parts.length - 1] : '';
    var city = parts.length > 1 ? parts[parts.length - 2] : '';

    if (parts.length >= 3 && /^[A-Z]{2}$/.test(state) && city) {
      return parts[0] + ' • ' + city + ' - ' + state;
    }

    return location.replace(/\s*[•·]\s*([A-Z]{2})$/, ' - $1');
  }

  function getDetailFlow(order, professionalView) {
    var status = order.status || 'pending';
    if (order.scheduleAuthority === 'incomplete_projection') return 'A projeção de agenda está incompleta. Atualize o pedido antes de considerar qualquer horário confirmado.';
    if (order.scheduleAuthority === 'canonical_confirmed' && order.hasCanonicalSchedule === true) return 'O horário foi confirmado pela autoridade canônica de agenda.';
    if (status === 'accepted' || status === 'conversation' || status === 'responded') return 'Pedido aceito. A conversa está liberada para alinhar proposta e próximos passos.';
    if (status === 'quoted') return 'Proposta enviada pelo profissional. O cliente precisa aprovar para liberar o atendimento.';
    if (status === 'in_progress') {
      var paymentStatus = normalizeStatusToken(order.paymentStatus || '');
      var completionStatus = normalizeStatusToken(order.completionStatus || '');
      if (completionStatus === 'requested') return professionalView
        ? 'Conclusão solicitada. O pagamento permanece em garantia até a confirmação do cliente.'
        : 'O profissional informou a conclusão. Confirme a entrega ou relate um problema pelo chat.';
      if (paymentStatus === 'held') return professionalView
        ? 'Pagamento em garantia. Finalize o serviço antes de solicitar a confirmação do cliente.'
        : 'Pagamento em garantia. Aguarde o profissional informar a conclusão do serviço.';
      return 'Proposta aprovada. O atendimento está em andamento.';
    }
    if (status === 'completed') return order.reviewId || order.reviewedAt
      ? 'Pedido concluído e avaliado. A avaliação permanece registrada no histórico.'
      : 'Pedido concluído. O pagamento foi liberado e o fluxo fica disponível para avaliação e histórico.';
    if (status === 'cancelled') {
      if (order.cancellationType === 'client_cancelled_before_payment') return 'Pedido cancelado pelo cliente antes do pagamento. Nenhum valor foi movimentado.';
      if (order.cancellationType === 'professional_cancelled_before_payment') return 'Pedido cancelado pelo profissional antes do pagamento. Nenhum valor foi movimentado.';
      if (order.cancellationType === 'proposal_rejected') return 'Proposta recusada pelo cliente. A justificativa fica registrada no histórico do pedido.';
      if (order.cancellationType === 'dispute_refund') return 'Pedido encerrado após resolução da contestação com reembolso ao cliente.';
      return 'Pedido recusado pelo profissional. A justificativa fica registrada no histórico do pedido.';
    }
    return professionalView ? 'Pedido recebido pelo fluxo de orçamento. Responda o cliente para avançar a negociação.' : 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.';
  }

  function createOrderCard(order) {
    var id = escapeHtml(order.id);
    var status = escapeHtml(order.status || 'pending');
    var professionalView = isProfessionalView(order);
    var normalizedOrderStatus = normalizeStatusToken(order.status);
    var canAcceptOrder = canTransitionOrder(order, 'accepted');
    var canDeclineOrder = professionalView && normalizedOrderStatus === 'pending' && canTransitionOrder(order, 'cancelled');
    var canApproveProposal = !professionalView && canTransitionOrder(order, 'in_progress');
    var canRejectProposal = !professionalView && normalizedOrderStatus === 'quoted' && canTransitionOrder(order, 'cancelled');
    var ordersService = Doke.services && Doke.services.orders;
    var canCancelBeforePayment = Boolean(
      ordersService
      && typeof ordersService.canCancelBeforePayment === 'function'
      && ordersService.canCancelBeforePayment(order, getCurrentUser())
      && !canDeclineOrder
      && !canRejectProposal
    );
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
    var title = escapeHtml(formatCardTitle(order.serviceTitle || order.service || order.title || 'Serviço solicitado'));
    var serviceImage = getServiceImage(order);
    var serviceCategory = escapeHtml(getServiceCategory(order) || 'Serviço');
    var schedulePresentation = getSchedulePresentation(order);
    var serviceSchedule = escapeHtml(schedulePresentation.label);
    var attachmentsCount = getAttachmentsCount(order);
    var serviceHref = order.serviceId ? 'detalhe-anuncio.html?id=' + encodeURIComponent(order.serviceId) : '';
    var location = escapeHtml(formatCardLocation(order.location || order.locationTitle || 'Endereço a confirmar'));
    var cardBadge = escapeHtml(getCardBadgeLabel(order));
    var scope = escapeHtml(order.scope || order.details || order.description || 'Escopo enviado pelo orçamento');
    var timeline = escapeHtml(schedulePresentation.detail || order.urgency || order.desiredDate || 'Aguardando retorno do profissional');
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
    article.dataset.serviceId = order.serviceId || '';
    article.dataset.serviceImage = serviceImage;
    article.dataset.serviceCategory = getServiceCategory(order);
    article.dataset.serviceSchedule = JSON.stringify(getServiceSchedule(order));
    article.dataset.scheduleAuthority = schedulePresentation.authority;
    article.dataset.scheduleReservationId = order.scheduleReservationId || '';
    article.dataset.scheduledAt = order.scheduledAt || '';
    article.dataset.hasCanonicalSchedule = order.hasCanonicalSchedule === true ? 'true' : 'false';
    article.dataset.schedulePresentationTitle = schedulePresentation.title || '';
    article.dataset.schedulePresentationValue = schedulePresentation.value || schedulePresentation.label || '';
    article.dataset.schedulePresentationDetail = schedulePresentation.detail || '';
    article.dataset.desiredDate = order.desiredDate || order.date || order.daté || '';
    article.dataset.shift = order.shift || '';
    article.dataset.professionalId = order.professionalId || order.providerId || '';
    article.dataset.professionalProfileId = order.professionalProfileId || '';
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
        <span class="order-card__smart-badge doke-badge">${cardBadge}</span>
      </div>
      <div class="order-card__body">
        <div class="order-card__service">
          ${serviceImage ? `<a class="order-card__service-media" href="${escapeHtml(serviceHref || '#')}" ${serviceHref ? '' : 'aria-disabled="true"'}><img src="${escapeHtml(serviceImage)}" alt="Imagem de ${title}"></a>` : `<span class="order-card__service-media order-card__service-media--empty" aria-hidden="true">${initials}</span>`}
          <div class="order-card__service-copy">
            <span class="order-card__category">${serviceCategory}</span>
            <h2>${title}</h2>
            <div class="order-card__facts" aria-label="Resumo do pedido">
              <span data-order-schedule-authority="${escapeHtml(schedulePresentation.authority)}">${serviceSchedule}</span>
              ${attachmentsCount ? `<span>${attachmentsCount} ${attachmentsCount === 1 ? 'anexo' : 'anexos'}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="order-card__identity">
          <span class="order-card__avatar doke-avatar">${initials}</span>
          <span class="order-card__identity-copy">
            <p class="order-card__subtitle"><strong>${provider}</strong></p>
            <span class="order-card__location">${location}</span>
          </span>
        </div>
        ${disputePresentation ? `
        <div class="order-card__dispute-note" data-order-dispute-state="${escapeHtml(disputePresentation.state)}">
          <strong>${escapeHtml(disputePresentation.title)}</strong>
          <span>${escapeHtml(disputePresentation.text)}</span>
        </div>` : ``}
      </div>
      <div class="order-card__actions${reportProblemAllowed ? ' order-card__actions--preferred' : ''}">
        ${disputePresentation ? `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="details"><span>Ver detalhes</span></button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="chat"><span>Conversa</span></button>
        ` : canAcceptOrder || canDeclineOrder ? `
        ${canAcceptOrder ? `<button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-accept="${id}"><span>Aceitar pedido</span></button>` : ``}
        ${canDeclineOrder ? `<button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-decline="${id}"><span>Recusar</span></button>` : ``}
        ` : canApproveProposal || canRejectProposal ? `
        ${canApproveProposal ? `<button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-approve-proposal="${id}"><span>Aprovar proposta</span></button>` : ``}
        ${canRejectProposal ? `<button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-reject-proposal="${id}"><span>Recusar proposta</span></button>` : ``}
        ` : `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="details"><span>Ver detalhes</span></button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="chat"><span>${escapeHtml(getPrimaryActionLabel(order, professionalView))}</span></button>
        `}
      </div>
      ${(walletTransaction && walletTransaction.id) || canCancelBeforePayment ? `
      <div class="order-card__support-actions" aria-label="Ações secundárias do pedido">
        ${canCancelBeforePayment ? `<button class="order-card__support-action order-card__support-action--warning" type="button" data-order-cancel-before-payment="${id}">
          <span class="order-card__support-icon" aria-hidden="true">×</span>
          <span>Cancelar pedido</span>
        </button>` : ``}
        ${reportProblemAllowed && !disputePresentation ? `<button class="order-card__support-action order-card__support-action--warning" type="button" data-order-report-issue="${id}" data-order-transaction="${escapeHtml(walletTransaction.id || '')}">
          <span class="order-card__support-icon" aria-hidden="true">!</span>
          <span>Relatar problema</span>
        </button>` : ``}
        ${walletTransaction && walletTransaction.id ? `<a class="order-card__support-action" href="${escapeHtml(getReceiptUrl(walletTransaction))}" data-order-receipt>
          <span class="order-card__support-icon" aria-hidden="true">${CARD_ICONS.receipt}</span>
          <span>Comprovante</span>
        </a>
        <button class="order-card__support-more doke-more-button" type="button" aria-label="Mais opções do pedido"><span aria-hidden="true">•••</span></button>` : ``}
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

  function renderOrders(list, orders, user, options) {
    options = options || {};
    orders = Array.isArray(orders) ? orders : [];
    var signature = [
      user && user.id || 'guest',
      user && user.role || 'guest',
      orders.map(function (order) {
        return [
          order && order.id,
          order && order.status,
          order && order.updatedAt,
          order && order.scheduleReservationId,
          order && order.scheduledAt,
          order && order.scheduleAuthority,
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

  function render(options) {
    options = options || {};
    if (document.body?.dataset.page !== 'pedidos') return Promise.resolve([]);
    var list = document.querySelector('.orders-list');
    if (!list) return Promise.resolve([]);
    var user = getCurrentUser();
    if (!accessGranted || !user || !user.id) return Promise.resolve([]);
    var experience = window.DokeOrders && window.DokeOrders.experience;

    if (experience && typeof experience.load === 'function') {
      return experience.load({ force: options.force === true }).then(function (result) {
        var orders = Array.isArray(result && result.data) ? result.data : [];
        renderOrders(list, orders, user, options);
        return orders;
      }).catch(function (error) {
        document.dispatchEvent(new CustomEvent('doke:orders-list-error', {
          detail: { error: error && error.message ? error.message : String(error) }
        }));
        renderOrders(list, [], user, { force: true });
        return [];
      });
    }

    var repository = Doke.repositories && Doke.repositories.orders;
    if (!repository || typeof repository.listLocal !== 'function') {
      renderOrders(list, [], user, { force: true });
      return Promise.resolve([]);
    }
    var orders = repository.listLocal({ currentUser: true });
    renderOrders(list, orders, user, options);
    return Promise.resolve(orders);
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
    window.DokeDialog.alert('Relato enviado. O pedido entrou em contestação.');
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
    window.DokeDialog.alert('Não foi possível abrir o relato. Recarregue a página e tente novamente.');
    return Promise.resolve(null);
  }

  function submitIssueReport(orderId, transactionId, report, trigger) {
    var wallet = Doke.services && Doke.services.wallet;
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

  function requestDeclineReason(orderId, trigger, options) {
    options = options || {};
    var card = trigger && trigger.closest ? trigger.closest('.order-card') : null;
    var orderTitle = card && card.querySelector ? card.querySelector('.order-card__body h2')?.textContent : '';
    if (window.DokeDeclineReasonDialog && typeof window.DokeDeclineReasonDialog.request === 'function') {
      return window.DokeDeclineReasonDialog.request({
        trigger: trigger,
        orderTitle: orderTitle,
        title: options.title || 'Recusar pedido',
        text: options.text || 'Explique ao cliente por que este pedido não poderá ser atendido.'
      });
    }
    window.DokeDialog.alert('Não foi possível abrir o modal de justificativa. Recarregue a página e tente novamente.');
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
    var cancelButton = event.target && event.target.closest && event.target.closest('[data-order-cancel-before-payment]');
    if (!cancelButton) return;

    var orderId = cancelButton.dataset.orderCancelBeforePayment || '';
    var ordersService = Doke.services && Doke.services.orders;
    if (!orderId || !ordersService || typeof ordersService.cancelBeforePayment !== 'function') return;

    event.preventDefault();
    event.stopPropagation();
    closeOrderActionMenus();

    getOrderForTransition(orderId).then(function (order) {
      if (!order || typeof ordersService.canCancelBeforePayment !== 'function' || !ordersService.canCancelBeforePayment(order, getCurrentUser())) {
        scheduleRender({ force: true });
        window.DokeDialog.alert('Este pedido já não pode ser cancelado por este fluxo.');
        return null;
      }
      return requestDeclineReason(orderId, cancelButton, {
        title: 'Cancelar pedido',
        text: 'Explique por que o pedido será encerrado antes da confirmação do pagamento.'
      });
    }).then(function (reason) {
      if (!reason || !reason.trim()) return null;
      cancelButton.disabled = true;
      cancelButton.setAttribute('aria-busy', 'true');
      return ordersService.cancelBeforePayment(orderId, reason.trim(), { cancellationSource: 'orders-list' }).then(function () {
        scheduleRender({ force: true });
      });
    }).catch(function (error) {
      window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível cancelar o pedido.');
    }).finally(function () {
      cancelButton.disabled = false;
      cancelButton.removeAttribute('aria-busy');
    });
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
        window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível enviar o relato.');
      }).finally(function () {
        reportButton.disabled = false;
        reportButton.textContent = 'Relatar problema';
      });
    });
  });

  function getOrderForTransition(orderId) {
    var service = Doke.services && Doke.services.orders;
    if (service && typeof service.getById === 'function') return service.getById(orderId);
    var repository = Doke.repositories && Doke.repositories.orders;
    if (repository && typeof repository.listLocal === 'function') {
      var order = repository.listLocal({ currentUser: true }).find(function (item) {
        return String(item && item.id || '') === String(orderId || '');
      }) || null;
      return Promise.resolve(order);
    }
    return Promise.resolve(null);
  }

  document.addEventListener('click', function (event) {
    var approveButton = event.target && event.target.closest && event.target.closest('[data-order-approve-proposal]');
    var rejectButton = event.target && event.target.closest && event.target.closest('[data-order-reject-proposal]');
    if (!approveButton && !rejectButton) return;

    var orderId = approveButton ? approveButton.dataset.orderApproveProposal : rejectButton.dataset.orderRejectProposal;
    var ordersService = Doke.services && Doke.services.orders;
    if (!orderId || !ordersService) return;

    event.preventDefault();
    event.stopPropagation();

    getOrderForTransition(orderId).then(function (order) {
      var targetStatus = approveButton ? 'in_progress' : 'cancelled';
      if (!order || !canTransitionOrder(order, targetStatus)) {
        scheduleRender({ force: true });
        window.DokeDialog.alert('Esta proposta já não pode ser alterada.');
        return;
      }

      if (approveButton) {
        if (typeof ordersService.approveProposal !== 'function') throw new Error('Aprovação de proposta indisponível.');
        var approveLabel = approveButton.querySelector('span') || approveButton;
        approveButton.disabled = true;
        approveButton.setAttribute('aria-disabled', 'true');
        approveLabel.textContent = 'Aprovando...';
        return ordersService.approveProposal(orderId, { approvalSource: 'orders-list' }).then(function () {
          scheduleRender({ force: true });
        }).catch(function (error) {
          approveButton.disabled = false;
          approveButton.removeAttribute('aria-disabled');
          approveLabel.textContent = 'Aprovar proposta';
          window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível aprovar a proposta.');
        });
      }

      if (typeof ordersService.rejectProposal !== 'function') throw new Error('Recusa de proposta indisponível.');
      return requestDeclineReason(orderId, rejectButton, {
        title: 'Recusar proposta',
        text: 'Explique ao profissional por que a proposta não será aprovada.'
      }).then(function (reason) {
        if (!reason || !reason.trim()) return;
        return getOrderForTransition(orderId).then(function (currentOrder) {
          if (!currentOrder || !canTransitionOrder(currentOrder, 'cancelled')) {
            scheduleRender({ force: true });
            window.DokeDialog.alert('Esta proposta já não pode ser recusada.');
            return;
          }
          var rejectLabel = rejectButton.querySelector('span') || rejectButton;
          rejectButton.disabled = true;
          rejectButton.setAttribute('aria-disabled', 'true');
          rejectLabel.textContent = 'Recusando...';
          return ordersService.rejectProposal(orderId, reason.trim(), { rejectionSource: 'orders-list' }).then(function () {
            scheduleRender({ force: true });
          }).catch(function (error) {
            rejectButton.disabled = false;
            rejectButton.removeAttribute('aria-disabled');
            rejectLabel.textContent = 'Recusar proposta';
            window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível recusar a proposta.');
          });
        });
      });
    }).catch(function (error) {
      scheduleRender({ force: true });
      window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível validar a proposta.');
    });
  });

  document.addEventListener('click', function (event) {
    var acceptButton = event.target && event.target.closest && event.target.closest('[data-order-accept]');
    var declineButton = event.target && event.target.closest && event.target.closest('[data-order-decline]');
    if (!acceptButton && !declineButton) return;

    var orderId = acceptButton ? acceptButton.dataset.orderAccept : declineButton.dataset.orderDecline;
    if (!orderId || !Doke.services || !Doke.services.orders) return;

    event.preventDefault();
    event.stopPropagation();

    getOrderForTransition(orderId).then(function (order) {
      var nextStatus = acceptButton ? 'accepted' : 'cancelled';
      if (!order || !canTransitionOrder(order, nextStatus)) {
        scheduleRender({ force: true });
        window.DokeDialog.alert('Esta ação não é permitida no estado atual do pedido.');
        return;
      }

      if (acceptButton) {
        var acceptLabel = acceptButton.querySelector('span') || acceptButton;
        acceptButton.disabled = true;
        acceptButton.setAttribute('aria-disabled', 'true');
        acceptLabel.textContent = 'Aceitando...';
        var acceptExperience = window.DokeOrders && window.DokeOrders.experience;
        var acceptTask = acceptExperience && typeof acceptExperience.mutateStatus === 'function'
          ? acceptExperience.mutateStatus({ orderId: orderId, action: 'accept', card: acceptButton.closest('.order-card') })
          : Doke.services.orders.accept(orderId);

        acceptTask.then(function () {
          scheduleRender({ force: true });
          var target = 'mensagens.html?order=' + encodeURIComponent(orderId);
          var navigate = Doke.navigation && Doke.navigation.go || window.DokeNavigate;
          if (typeof navigate === 'function') navigate(target, { source: 'orders-open-conversation' });
          else window.location.assign(target);
        }).catch(function (error) {
          acceptButton.disabled = false;
          acceptButton.removeAttribute('aria-disabled');
          acceptLabel.textContent = 'Aceitar pedido';
          window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível aceitar o pedido.');
        });
        return;
      }

      requestDeclineReason(orderId, declineButton).then(function (reason) {
        if (!reason || !reason.trim()) return;
        return getOrderForTransition(orderId).then(function (currentOrder) {
          if (!currentOrder || !canTransitionOrder(currentOrder, 'cancelled')) {
            scheduleRender({ force: true });
            window.DokeDialog.alert('Este pedido já não pode ser recusado.');
            return;
          }

          var declineLabel = declineButton.querySelector('span') || declineButton;
          declineButton.disabled = true;
          declineButton.setAttribute('aria-disabled', 'true');
          declineLabel.textContent = 'Recusando...';
          var declineExperience = window.DokeOrders && window.DokeOrders.experience;
          var declineTask = declineExperience && typeof declineExperience.mutateStatus === 'function'
            ? declineExperience.mutateStatus({ orderId: orderId, action: 'decline', args: [reason.trim()], card: declineButton.closest('.order-card') })
            : Doke.services.orders.decline(orderId, reason.trim());

          return declineTask.then(function () {
            scheduleRender({ force: true });
          }).catch(function (error) {
            declineButton.disabled = false;
            declineButton.removeAttribute('aria-disabled');
            declineLabel.textContent = 'Recusar';
            window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível recusar o pedido.');
          });
        });
      });
    }).catch(function (error) {
      scheduleRender({ force: true });
      window.DokeDialog.alert(error && error.message ? error.message : 'Não foi possível validar o estado do pedido.');
    });
  });


  function scheduleRender(options) {
    window.requestAnimationFrame(function () { render(options); });
  }

  window.DokeHydrateLocalOrders = function DokeHydrateLocalOrders(options) {
    options = options || {};
    if (options.accessGranted === true) accessGranted = true;
    return render(Object.assign({ force: true }, options));
  };
  window.DokeLockLocalOrders = function DokeLockLocalOrders() {
    accessGranted = false;
  };

  document.addEventListener('doke:route-ready', function () {
    if (accessGranted) scheduleRender({ force: true });
  });
  document.addEventListener('doke:stable-route-ready', function () {
    if (accessGranted) scheduleRender({ force: true });
  });
  document.addEventListener('doke:auth-session-change', function () {
    accessGranted = false;
  });
  document.addEventListener('doke:route-leaving', function (event) {
    if (event.detail && event.detail.from === '/pedidos.html') accessGranted = false;
  });
  document.addEventListener('doke:order-created', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-status-changed', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:orders-experience-updated', function () { scheduleRender(); });
  document.addEventListener('doke:wallet-receivable-created', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-receivable-updated', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-opened', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-resolved', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:wallet-dispute-responded', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-dispute-synced', function () { scheduleRender({ force: true }); });
})();
