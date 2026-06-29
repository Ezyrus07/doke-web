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

  function statusClass(status) {
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
    var statusLabel = escapeHtml(order.statusLabel || 'Aguardando resposta');
    var professionalView = isProfessionalView(order);
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
    var detailFlow = escapeHtml(order.detailFlow || getDetailFlow(order, professionalView));
    var attachments = serializeAttachments(order.attachments || []);
    var createdLabel = escapeHtml(formatCreatedAt(order.createdAt || order.creatédAt));
    var progressDate = escapeHtml(getProgressDate(order.createdAt || order.creatédAt));
    var dotClass = 'order-card__status-dot--' + statusClass(order.status);

    var article = document.createElement('article');
    article.className = 'order-card doke-selectable-card doke-card doke-order-card';
    article.dataset.id = order.id;
    article.dataset.localOrder = 'true';
    article.dataset.domainCard = 'order';
    article.dataset.status = order.status || 'pending';
    article.dataset.detailStatus = order.statusLabel || 'Aguardando resposta';
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
      </div>
      <div class="order-card__actions">
        ${professionalView && (order.status || 'pending') === 'pending' ? `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-accept="${id}">Aceitar pedido</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-decline="${id}">Recusar</button>
        ` : `
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="details">Ver detalhes</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="chat">${escapeHtml(getPrimaryActionLabel(order, professionalView))}</button>
        `}
      </div>
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
})();
