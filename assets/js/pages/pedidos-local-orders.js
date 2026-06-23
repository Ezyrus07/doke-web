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
      return Doke.session && typeof Doke.session.getCurrentUser === 'function'
        ? Doke.session.getCurrentUser()
        : null;
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

  function isProfessionalView(order) {
    var user = getCurrentUser();
    return Boolean(user && user.id && String(user.id) === String(order.professionalId || order.providerId));
  }

  function statusClass(status) {
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'conversation') return 'conversation';
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
    var detailFlow = escapeHtml(order.detailFlow || 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.');
    var attachments = serializeAttachments(order.attachments || []);
    var createdLabel = escapeHtml(formatCreatedAt(order.createdAt || order.creatédAt));
    var progressDate = escapeHtml(getProgressDate(order.createdAt || order.creatédAt));
    var dotClass = 'order-card__status-dot--' + statusClass(order.status);

    var article = document.createElement('article');
    article.className = 'order-card doke-card doke-order-card';
    article.dataset.id = order.id;
    article.dataset.status = order.status || 'pending';
    article.dataset.detailStatus = order.statusLabel || 'Aguardando resposta';
    article.dataset.detailAddress = order.location || order.locationTitle || 'Endereço a confirmar';
    article.dataset.detailScope = order.scope || order.details || order.description || 'Escopo enviado pelo orçamento';
    article.dataset.detailTimeline = order.urgency || order.desiredDate || 'Aguardando retorno do profissional';
    article.dataset.detailMatérials = order.materials || 'Materiais a alinhar com o profissional';
    article.dataset.detailBudget = order.budget || order.detailBudget || 'A definir após resposta do profissional';
    article.dataset.detailPayment = order.payment || 'Pagamento a combinar';
    article.dataset.detailFlow = order.detailFlow || (professionalView ? 'Pedido recebido pelo fluxo de orçamento. Responda o cliente para avançar a negociação.' : 'Pedido criado pelo fluxo de orçamento. Aguarde o retorno do profissional.');
    article.dataset.viewerRole = professionalView ? 'professional' : 'client';
    article.dataset.peerRole = peerRole;
    article.dataset.peerRoleLabel = peerRoleLabel;
    article.dataset.clientName = order.clientName || 'Cliente Doke';
    article.dataset.professionalName = order.providerName || order.provider || 'Profissional Doke';
    article.dataset.attachments = attachments;
    article.tabIndex = 0;
    article.innerHTML = `
      <button class="order-card__select" type="button" aria-label="Selecionar pedido"><span></span></button>
      <div class="order-card__top">
        <div class="order-card__statusline">
          <span class="order-card__status-dot ${dotClass}"></span>
          <span class="order-card__status-text">${statusLabel}</span>
        </div>
        <span class="order-card__time">${createdLabel}</span>
      </div>
      <ol class="order-card__progress" aria-label="Progresso do pedido">
        <li class="order-card__progress-step is-done">
          <span class="order-card__progress-marker" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m7 12 3 3 7-7"></path></svg></span>
          <span class="order-card__progress-label doke-label">Solicitado</span>
          <span class="order-card__progress-date">${progressDate}</span>
        </li>
        <li class="order-card__progress-step is-current">
          <span class="order-card__progress-marker" aria-hidden="true"></span>
          <span class="order-card__progress-label doke-label">Conf.</span>
          <span class="order-card__progress-date">Pendente</span>
        </li>
        <li class="order-card__progress-step"><span class="order-card__progress-marker" aria-hidden="true"></span><span class="order-card__progress-label doke-label">Andamento</span></li>
        <li class="order-card__progress-step"><span class="order-card__progress-marker" aria-hidden="true"></span><span class="order-card__progress-label doke-label">Revisão</span></li>
        <li class="order-card__progress-step"><span class="order-card__progress-marker" aria-hidden="true"></span><span class="order-card__progress-label doke-label">Concl.</span></li>
      </ol>
      <div class="order-card__progress-summary doke-order-card doke-stat-card doke-card" aria-label="Resumo do progresso">
        <span class="order-card__progress-summary-bar"><span data-progress-value="20"></span></span>
        <span><strong>Etapa 1 de 5</strong> · Solicitação enviada</span>
      </div>
      <div class="order-card__body">
        <h2>${title}</h2>
        <p class="order-card__subtitle">${professionalView ? 'Solicitação de' : 'Aguardando resposta de'} <strong>${provider}</strong></p>
        <div class="order-card__identity">
          <span class="order-card__avatar doke-avatar">${initials}</span>
          <span class="order-card__location">${location}</span>
        </div>
        <div class="order-card__meta-grid doke-grid">
          <div class="order-card__meta"><span class="order-card__meta-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5v5l3.5 2"></path></svg></span><span>${timeline}</span></div>
          <div class="order-card__meta"><span class="order-card__meta-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7.5h11"></path><path d="M6.5 12h11"></path><path d="M6.5 16.5h7"></path></svg></span><span>${requestType}</span></div>
        </div>
      </div>
      <div class="order-card__actions">
        <button class="order-card__button order-card__button--primary doke-btn doke-btn--primary" type="button" data-order-open="details">Ver detalhes</button>
        <button class="order-card__button order-card__button--secondary doke-btn doke-btn--ghost" type="button" data-order-open="chat">${professionalView ? 'Responder cliente' : 'Abrir conversa'}</button>
      </div>
      <button class="order-card__footer" type="button" data-order-open="details">
        <span class="order-card__deadline"><span class="order-card__meta-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v3"></path><path d="M17 4.5v3"></path><rect x="4.5" y="6.5" width="15" height="13" rx="2"></rect><path d="M4.5 10h15"></path></svg></span><span>Aguardando resposta</span></span>
        <span class="order-card__footer-arrow">›</span>
      </button>
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

    var orders = repository.listLocal({ currentUser: true });
    var signature = orders.map(function (order) { return order && order.id; }).filter(Boolean).join('|');
    if (!options.force && list.dataset.localOrdersRendered === 'true' && list.dataset.localOrdersSignature === signature) return;

    orders.slice().reverse().forEach(function (order) {
      var exists = Array.from(list.querySelectorAll('.order-card[data-id]')).some(function (card) {
        return String(card.dataset.id) === String(order && order.id);
      });
      if (!order || !order.id || exists) return;
      list.insertBefore(createOrderCard(order), list.firstElementChild);
    });
    list.dataset.localOrdersRendered = 'true';
    list.dataset.localOrdersSignature = signature;
    document.dispatchEvent(new CustomEvent('doke:orders-list-hydrated', {
      detail: {
        localCount: orders.length,
        totalCount: list.querySelectorAll('.order-card[data-id]').length
      }
    }));
  }

  function scheduleRender(options) {
    window.requestAnimationFrame(function () { render(options); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { render(); }, { once: true });
  } else {
    render();
  }

  document.addEventListener('doke:route-ready', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:stable-route-ready', function () { scheduleRender({ force: true }); });
  document.addEventListener('doke:order-created', function () { scheduleRender({ force: true }); });
})();
