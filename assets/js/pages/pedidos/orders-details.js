
/* Pedidos Detail Drawer v2 */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});

  const ICONS = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>',
    action: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"></path><path d="M19 15l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-.4L19 15Z"></path></svg>'
  };

  let activeTrigger = null;
  let activeCard = null;
  const TRANSITION_MS = 180;

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const createLayer = () => {
    let layer = document.querySelector('[data-orders-detail-layer]');
    if (layer) return layer;

    layer = document.createElement('aside');
    layer.className = 'orders-detail-layer';
    layer.dataset.ordersDetailLayer = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');

    layer.innerHTML = `
      <button class="orders-detail-backdrop" type="button" data-orders-detail-close aria-label="Fechar detalhes do pedido"></button>
      <section class="orders-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="orders-detail-title" tabindex="-1">
        <header class="orders-detail-drawer__header">
          <div class="orders-detail-drawer__header-top">
            <span class="orders-detail-drawer__eyebrow">Detalhes do pedido</span>
            <button class="orders-detail-drawer__close" type="button" data-orders-detail-close aria-label="Fechar">${ICONS.close}</button>
          </div>
          <div>
            <h2 class="orders-detail-drawer__title" id="orders-detail-title" data-detail-title></h2>
            <p class="orders-detail-drawer__subtitle" data-detail-subtitle></p>
          </div>
          <div class="orders-detail-statusbar" data-detail-statusbar></div>
        </header>

        <div class="orders-detail-drawer__body">
          <section class="orders-detail-section">
            <span class="orders-detail-section__eyebrow">Próxima ação</span>
            <div class="orders-detail-action" data-detail-action>
              <span class="orders-detail-action__icon" data-detail-action-icon aria-hidden="true">${ICONS.action}</span>
              <div>
                <strong class="orders-detail-action__title" data-detail-action-title></strong>
                <p class="orders-detail-action__text" data-detail-action-note></p>
              </div>
            </div>
          </section>

          <section class="orders-detail-section orders-detail-ai" aria-label="Análise IA do pedido">
            <span class="orders-detail-section__eyebrow">Análise IA</span>
            <div class="orders-detail-ai__box">
              <span class="orders-detail-ai__icon" aria-hidden="true">${ICONS.spark}</span>
              <div>
                <strong class="orders-detail-ai__title" data-detail-ai-title></strong>
                <p class="orders-detail-ai__text" data-detail-ai-text></p>
              </div>
            </div>
          </section>

          <section class="orders-detail-section">
            <span class="orders-detail-section__eyebrow">Visão geral</span>
            <dl class="orders-detail-list">
              <div class="orders-detail-row"><dt data-detail-peer-label>Profissional</dt><dd data-detail-company></dd></div>
              <div class="orders-detail-row"><dt>Local</dt><dd data-detail-address></dd></div>
              <div class="orders-detail-row"><dt>Escopo</dt><dd data-detail-scope></dd></div>
              <div class="orders-detail-row"><dt>Orçamento</dt><dd data-detail-budget></dd></div>
              <div class="orders-detail-row"><dt>Pagamento</dt><dd data-detail-payment></dd></div>
              <div class="orders-detail-row"><dt>Prazo</dt><dd data-detail-deadline></dd></div>
              <div class="orders-detail-row"><dt>Materiais</dt><dd data-detail-materials></dd></div>
            </dl>
          </section>

          <section class="orders-detail-section">
            <span class="orders-detail-section__eyebrow">Contexto do pedido</span>
            <p class="orders-detail-flow" data-detail-flow></p>
          </section>

          <section class="orders-detail-section" data-detail-attachments-section hidden>
            <span class="orders-detail-section__eyebrow">Anexos enviados</span>
            <div class="orders-detail-attachments" data-detail-attachments></div>
          </section>

          <section class="orders-detail-section">
            <span class="orders-detail-section__eyebrow">Etapas do pedido</span>
            <div class="orders-detail-timeline" data-detail-timeline></div>
          </section>

        </div>

        <footer class="orders-detail-actions">
          <button class="orders-detail-actions__button orders-detail-actions__button--primary doke-btn doke-btn--primary" type="button" data-detail-chat>
            ${ICONS.chat}<span>Abrir conversa</span>
          </button>
          <button class="orders-detail-actions__button orders-detail-actions__button--secondary doke-btn doke-btn--ghost" type="button" data-orders-detail-close>Fechar</button>
        </footer>
      </section>
    `;

    document.body.appendChild(layer);
    return layer;
  };

  const setText = (root, selector, value, fallback = '—') => {
    const el = root.querySelector(selector);
    if (el) el.textContent = clean(value) || fallback;
  };

  const getOrder = (trigger) => {
    const data = ns.data;
    const intelligence = ns.intelligence;
    const card = trigger.closest('.order-card');
    if (!card || !data || !intelligence) return null;
    activeCard = card;
    return intelligence.classifyOrder(data.readOrderCard(card));
  };

  const renderStatusbar = (layer, order) => {
    const target = layer.querySelector('[data-detail-statusbar]');
    if (!target) return;
    const tone = order.status === 'completed' ? 'success' : (order.risk.level === 'high' ? 'risk' : 'info');
    target.innerHTML = `
      <span class="orders-detail-pill">${order.statusConfig.label}</span>
      <span class="orders-detail-pill" data-tone="${tone}">${order.smartBadge}</span>
      <span class="orders-detail-pill" data-tone="${tone}">Risco ${order.risk.label}</span>
    `;
  };

  const renderAttachments = (layer, order) => {
    const section = layer.querySelector('[data-detail-attachments-section]');
    const target = layer.querySelector('[data-detail-attachments]');
    if (!section || !target) return;

    const attachments = Array.isArray(order.attachments) ? order.attachments : [];
    section.hidden = attachments.length === 0;
    if (!attachments.length) {
      target.innerHTML = '';
      return;
    }

    target.innerHTML = attachments.map((attachment) => {
      const name = escapeHtml(attachment.name || 'Imagem anexada');
      const url = clean(attachment.url || '');
      const status = attachment.tooLarge
        ? '<span class="orders-detail-attachment__status">Arquivo grande demais para prévia local</span>'
        : attachment.error
          ? '<span class="orders-detail-attachment__status">Prévia indisponível</span>'
          : '';

      if (url && /^data:image\//.test(url)) {
        return `
          <figure class="orders-detail-attachment orders-detail-attachment--image">
            <img src="${url}" alt="${name}">
            <figcaption>${name}</figcaption>
          </figure>
        `;
      }

      return `
        <article class="orders-detail-attachment orders-detail-attachment--file">
          <span class="orders-detail-attachment__icon" aria-hidden="true">📎</span>
          <span><strong>${name}</strong>${status}</span>
        </article>
      `;
    }).join('');
  };

  const renderTimeline = (layer, order) => {
    const target = layer.querySelector('[data-detail-timeline]');
    if (!target) return;
    const steps = Array.from(order.card.querySelectorAll('.order-card__progress-step')).map((step) => ({
      label: clean(step.querySelector('.order-card__progress-label')?.textContent) || 'Etapa',
      date: clean(step.querySelector('.order-card__progress-date')?.textContent),
      done: step.classList.contains('is-done'),
      current: step.classList.contains('is-current')
    }));
    target.innerHTML = steps.map((step) => `
      <article class="orders-detail-timeline__item ${step.done ? 'is-done' : ''} ${step.current ? 'is-current' : ''}">
        <span class="orders-detail-timeline__bullet">${step.done ? ICONS.check : ''}</span>
        <div>
          <div class="orders-detail-timeline__title">${step.label}</div>
          <div class="orders-detail-timeline__date">${step.date || (step.current ? 'Etapa atual' : 'Próxima etapa')}</div>
        </div>
      </article>
    `).join('');
  };


  const getAiAnalysis = (order) => {
    if (order.status === 'completed') {
      return {
        title: 'Pós-serviço recomendado',
        text: 'Este pedido já foi concluído. A melhor ação agora é solicitar avaliação, registrar garantia e manter relacionamento para futuras oportunidades.'
      };
    }

    if (order.risk.level === 'high') {
      return {
        title: 'Risco operacional detectado',
        text: 'O pedido tem sinais de prazo sensível. Recomenda-se confirmar escopo, prazo e responsável pela próxima etapa ainda hoje.'
      };
    }

    if (order.requiresAction) {
      return {
        title: 'Ação necessária para avançar',
        text: 'A IA recomenda enviar uma resposta objetiva para remover bloqueio e manter o pedido em movimento.'
      };
    }

    return {
      title: 'Fluxo dentro do esperado',
      text: 'Não há risco crítico detectado. Acompanhe a próxima atualização e mantenha o histórico do pedido organizado.'
    };
  };

  const render = (layer, order) => {
    setText(layer, '[data-detail-title]', order.title);
    const peerLabel = order.peerRoleLabel || (order.viewerRole === 'professional' ? 'Cliente' : 'Profissional');
    const subtitle = order.address ? `${order.company} • ${order.address}` : order.company;
    setText(layer, '[data-detail-subtitle]', subtitle);
    setText(layer, '[data-detail-action-title]', order.nextAction.title);
    setText(layer, '[data-detail-action-note]', order.nextAction.note);
    setText(layer, '[data-detail-peer-label]', peerLabel);
    setText(layer, '[data-detail-company]', order.company);
    setText(layer, '[data-detail-address]', order.address);
    setText(layer, '[data-detail-scope]', order.scope);
    setText(layer, '[data-detail-budget]', order.budget);
    setText(layer, '[data-detail-payment]', order.payment);
    setText(layer, '[data-detail-deadline]', order.timeline || order.deadlineLabel);
    setText(layer, '[data-detail-materials]', order.materials);
    setText(layer, '[data-detail-flow]', order.flow);

    const aiAnalysis = getAiAnalysis(order);
    setText(layer, '[data-detail-ai-title]', aiAnalysis.title);
    setText(layer, '[data-detail-ai-text]', aiAnalysis.text);

    const action = layer.querySelector('[data-detail-action]');
    const icon = layer.querySelector('[data-detail-action-icon]');
    if (action) {
      action.dataset.risk = order.risk.level;
      action.dataset.status = order.status;
    }
    if (icon) icon.innerHTML = order.status === 'completed' ? ICONS.check : ICONS.action;

    renderStatusbar(layer, order);
    renderAttachments(layer, order);
    renderTimeline(layer, order);
  };

  const open = (trigger) => {
    const order = getOrder(trigger);
    if (!order) return;
    const layer = createLayer();
    const drawer = layer.querySelector('.orders-detail-drawer');
    activeTrigger = trigger;
    render(layer, order);
    layer.hidden = false;
    layer.setAttribute('aria-hidden','false');
    document.body.classList.add('orders-detail-open');
    requestAnimationFrame(() => {
      layer.classList.add('is-open');
      drawer?.focus({ preventScroll: true });
    });
  };

  const close = (options = {}) => {
    const layer = document.querySelector('[data-orders-detail-layer]');
    if (!layer) return Promise.resolve();

    const {
      handoff = false,
      preserveCard = false,
      skipFocusReturn = false
    } = options;

    if (handoff) {
      layer.classList.add('is-handover');
    }

    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden','true');
    document.body.classList.remove('orders-detail-open');

    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (!layer.classList.contains('is-open')) {
          layer.hidden = true;
        }
        layer.classList.remove('is-handover');

        if (!preserveCard) {
          activeCard = null;
        }

        if (!skipFocusReturn && activeTrigger && typeof activeTrigger.focus === 'function') {
          activeTrigger.focus({ preventScroll: true });
        }

        if (!preserveCard) {
          activeTrigger = null;
        }

        resolve();
      }, handoff ? TRANSITION_MS : 220);
    });
  };

  const openChatPanel = () => {
    if (!activeCard || !ns.chat?.openFromCard) return;
    const card = activeCard;
    close({ handoff: true, preserveCard: true, skipFocusReturn: true }).then(() => {
      window.setTimeout(() => ns.chat.openFromCard(card), 24);
    });
  };

  const bind = () => {
    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-orders-detail-close]');
      if (closeButton) {
        event.preventDefault();
        close();
        return;
      }

      const chatButton = event.target.closest('[data-detail-chat]');
      if (chatButton) {
        event.preventDefault();
        openChatPanel();
        return;
      }

      const detailButton = event.target.closest('[data-order-open="details"]');
      if (!detailButton || !detailButton.closest('.order-card')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      open(detailButton);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    }, true);
  };

  ns.details = Object.freeze({ open, close });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
