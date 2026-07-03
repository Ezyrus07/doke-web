/* Doke pedidos — data contract.
   Responsibility: extract and normalize order data from the current pedidos.html DOM.
   This layer does not render UI and does not decide visual hierarchy. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});

  const STATUS_CONFIG = Object.freeze({
    pending: {
      label: 'Aguardando resposta',
      summary: 'Aguardando você',
      badge: 'Ação pendente',
      icon: 'chat'
    },
    accepted: {
      label: 'Pedido aceito',
      summary: 'Em negociação',
      badge: 'Conversa liberada',
      icon: 'alert'
    },
    conversation: {
      label: 'Pedido aceito',
      summary: 'Em negociação',
      badge: 'Conversa liberada',
      icon: 'alert'
    },
    quoted: {
      label: 'Proposta enviada',
      summary: 'Aguardando cliente',
      badge: 'Proposta enviada',
      icon: 'document'
    },
    in_progress: {
      label: 'Em andamento',
      summary: 'Atendimento ativo',
      badge: 'Em andamento',
      icon: 'calendar'
    },
    responded: {
      label: 'Respondido',
      summary: 'Acompanhar',
      badge: 'Acompanhar',
      icon: 'calendar'
    },
    completed: {
      label: 'Concluído',
      summary: 'Pós-serviço',
      badge: 'Pós-serviço',
      icon: 'check'
    },
    cancelled: {
      label: 'Cancelado',
      summary: 'Arquivado',
      badge: 'Arquivado',
      icon: 'document'
    }
  });

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const parseCurrencyRange = (value) => {
    const matches = clean(value).match(/[\d.]+(?:,\d{2})?/g) || [];
    const numbers = matches
      .map((part) => Number(part.replace(/\./g, '').replace(',', '.')))
      .filter(Number.isFinite);

    if (!numbers.length) return { min: 0, max: 0, average: 0 };

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return { min, max, average: Math.round((min + max) / 2) };
  };

  const parseAttachments = (value) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((attachment) => ({
        name: clean(attachment?.name) || 'anexo',
        type: clean(attachment?.type),
        size: Number(attachment?.size) || 0,
        url: clean(attachment?.url),
        previewable: Boolean(attachment?.previewable || attachment?.url),
        tooLarge: Boolean(attachment?.tooLarge),
        error: Boolean(attachment?.error)
      })).filter((attachment) => attachment.name || attachment.url);
    } catch {
      return [];
    }
  };

  const readProgress = (card) => {
    const steps = qsa('.order-card__progress-step', card);
    const done = steps.filter((step) => step.classList.contains('is-done')).length;
    const currentIndex = steps.findIndex((step) => step.classList.contains('is-current'));

    return {
      total: steps.length,
      done,
      currentIndex: currentIndex >= 0 ? currentIndex + 1 : Math.min(done + 1, steps.length),
      currentLabel: clean(qs('.order-card__progress-step.is-current .order-card__progress-label', card)?.textContent)
    };
  };

  const readOrderCard = (card) => {
    const detailBudget = card.dataset.detailBudget || '';
    const status = card.dataset.status || 'pending';
    const title = clean(qs('.order-card__body h2', card)?.textContent) || card.dataset.id || 'Pedido';

    return {
      id: card.dataset.id || title.toLowerCase().replace(/\W+/g, '-'),
      status,
      statusLabel: clean(card.dataset.detailStatus) || STATUS_CONFIG[status]?.label || status,
      title,
      subtitle: clean(qs('.order-card__subtitle', card)?.textContent),
      company: clean(qs('.order-card__subtitle strong', card)?.textContent),
      viewerRole: clean(card.dataset.viewerRole),
      peerRole: clean(card.dataset.peerRole),
      peerRoleLabel: clean(card.dataset.peerRoleLabel),
      clientName: clean(card.dataset.clientName),
      professionalName: clean(card.dataset.professionalName),
      address: clean(card.dataset.detailAddress) || clean(qs('.order-card__location', card)?.textContent),
      scope: clean(card.dataset.detailScope),
      timeline: clean(card.dataset.detailTimeline),
      materials: clean(card.dataset.detailMatérials || card.dataset.detailMaterials),
      budget: clean(detailBudget),
      budgetRange: parseCurrencyRange(detailBudget),
      payment: clean(card.dataset.detailPayment),
      flow: clean(card.dataset.detailFlow),
      walletTransactionId: clean(card.dataset.walletTransactionId),
      receiptUrl: clean(card.dataset.receiptUrl || card.dataset.walletReceiptUrl),
      dispute: {
        id: clean(card.dataset.disputeId),
        state: clean(card.dataset.disputeState),
        status: clean(card.dataset.disputeStatus),
        reason: clean(card.dataset.disputeReason),
        reasonCode: clean(card.dataset.disputeReasonCode),
        reasonLabel: clean(card.dataset.disputeReasonLabel),
        reportText: clean(card.dataset.disputeReportText),
        openedBy: clean(card.dataset.disputeOpenedBy),
        resolution: clean(card.dataset.disputeResolution),
        responseText: clean(card.dataset.disputeResponseText),
        responseAt: clean(card.dataset.disputeResponseAt),
        respondedBy: clean(card.dataset.disputeRespondedBy)
      },
      attachments: parseAttachments(card.dataset.attachments),
      updatedLabel: clean(qs('.order-card__time', card)?.textContent),
      deadlineLabel: clean(qs('.order-card__footer', card)?.textContent),
      progress: readProgress(card),
      card
    };
  };

  const readOrders = (root = document) => qsa('.orders-list .order-card[data-status]', root).map(readOrderCard);

  const readTodayEvents = (root = document) => {
    const direct = qsa('[data-orders-event]', root).filter((event) => !event.hidden);
    const fallback = qsa('.orders-planner__event:not([hidden])', root);
    return direct.length ? direct : fallback;
  };

  ns.data = Object.freeze({
    STATUS_CONFIG,
    qs,
    qsa,
    clean,
    parseCurrencyRange,
    readOrderCard,
    readOrders,
    readTodayEvents
  });
})();
