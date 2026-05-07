/* Pedidos AI Assistant v1
   AI-like assistant for pedidos.html.
   This is deterministic now; it prepares the UX/API surface for real AI later. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});

  const ICONS = {
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"></path><path d="M19 15l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-.4L19 15Z"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 16H3L12 3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>'
  };

  let lastDraft = '';

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const getOrders = () => {
    if (!ns.data || !ns.intelligence) return [];
    return ns.data.readOrders().map((order) => ns.intelligence.classifyOrder(order));
  };

  const getBestOrder = (orders) => {
    return [...orders].sort((a, b) => b.priorityScore - a.priorityScore)[0] || null;
  };

  const buildDraft = (order) => {
    if (!order) {
      return 'Olá! No momento não encontrei um pedido prioritário para responder.';
    }

    const company = order.company || 'tudo bem';
    const service = order.title || 'pedido';

    if (order.status === 'completed') {
      return `Olá, ${company}! O serviço "${service}" foi concluído. Você pode me confirmar se está tudo certo e deixar uma avaliação quando puder?`;
    }

    if (order.risk.level === 'high') {
      return `Olá, ${company}! Estou acompanhando o pedido "${service}" e queria alinhar a próxima etapa para evitar atraso. Você consegue me confirmar prazo e próximos passos?`;
    }

    return `Olá, ${company}! Estou acompanhando o pedido "${service}". Pode me atualizar sobre a próxima etapa para darmos continuidade?`;
  };

  const createLayer = () => {
    let layer = document.querySelector('[data-doke-ai-layer]');
    if (layer) return layer;

    const launcher = document.createElement('button');
    launcher.className = 'doke-ai-launcher';
    launcher.type = 'button';
    launcher.dataset.dokeAiOpen = 'true';
    launcher.innerHTML = `${ICONS.spark}<span>Doke IA</span><span class="doke-ai-launcher__dot" aria-hidden="true"></span>`;
    document.body.appendChild(launcher);

    layer = document.createElement('aside');
    layer.className = 'doke-ai-layer';
    layer.dataset.dokeAiLayer = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');

    layer.innerHTML = `
      <button class="doke-ai-layer__backdrop" type="button" data-doke-ai-close aria-label="Fechar Doke IA"></button>
      <section class="doke-ai-panel" role="dialog" aria-modal="true" aria-labelledby="doke-ai-title" tabindex="-1">
        <header class="doke-ai-panel__header">
          <div class="doke-ai-panel__top">
            <span class="doke-ai-panel__eyebrow">Assistente operacional</span>
            <button class="doke-ai-panel__close" type="button" data-doke-ai-close aria-label="Fechar Doke IA">${ICONS.close}</button>
          </div>
          <div>
            <h2 class="doke-ai-panel__title" id="doke-ai-title">Doke IA para pedidos</h2>
            <p class="doke-ai-panel__subtitle">Sugestões geradas a partir dos status, riscos e próximas ações desta página.</p>
          </div>
        </header>

        <div class="doke-ai-panel__body">
          <article class="doke-ai-card doke-ai-card--priority" data-ai-priority-card>
            <span class="doke-ai-card__icon">${ICONS.spark}</span>
            <div>
              <span class="doke-ai-card__label">Prioridade agora</span>
              <strong class="doke-ai-card__title" data-ai-priority-title></strong>
              <p class="doke-ai-card__text" data-ai-priority-text></p>
              <button class="doke-ai-card__action" type="button" data-ai-open-priority>Ver pedido</button>
            </div>
          </article>

          <article class="doke-ai-card doke-ai-card--risk" data-ai-risk-card>
            <span class="doke-ai-card__icon">${ICONS.alert}</span>
            <div>
              <span class="doke-ai-card__label">Leitura de risco</span>
              <strong class="doke-ai-card__title" data-ai-risk-title></strong>
              <p class="doke-ai-card__text" data-ai-risk-text></p>
            </div>
          </article>

          <section class="doke-ai-suggestions" aria-label="Sugestões inteligentes">
            <article class="doke-ai-suggestion">
              <span class="doke-ai-suggestion__icon">${ICONS.chat}</span>
              <div>
                <strong>Mensagem sugerida</strong>
                <span data-ai-message-summary></span>
              </div>
            </article>
            <article class="doke-ai-suggestion">
              <span class="doke-ai-suggestion__icon">${ICONS.check}</span>
              <div>
                <strong>Critério de avanço</strong>
                <span data-ai-advance-text></span>
              </div>
            </article>
          </section>
        </div>

        <footer class="doke-ai-compose">
          <textarea class="doke-ai-compose__textarea" data-ai-draft readonly></textarea>
          <button class="doke-ai-compose__copy" type="button" data-ai-copy>Copiar sugestão</button>
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

  const render = (layer) => {
    const orders = getOrders();
    const best = getBestOrder(orders);
    const riskOrder = orders.find((order) => order.atRisk) || best;
    const actionCount = orders.filter((order) => order.requiresAction).length;
    const riskCount = orders.filter((order) => order.atRisk).length;
    const completedCount = orders.filter((order) => order.status === 'completed').length;

    setText(layer, '[data-ai-priority-title]', best ? best.title : 'Nenhuma prioridade detectada');
    setText(
      layer,
      '[data-ai-priority-text]',
      best
        ? `${best.nextAction.title}. ${best.nextAction.note}`
        : 'Quando houver pedidos ativos, a IA operacional destacará o item mais importante.'
    );

    setText(
      layer,
      '[data-ai-risk-title]',
      riskCount > 0 ? `${riskCount} pedido(s) em atenção` : 'Sem risco crítico agora'
    );

    setText(
      layer,
      '[data-ai-risk-text]',
      riskOrder
        ? `${riskOrder.title}: ${riskOrder.risk.reason}`
        : 'Nenhum pedido ativo possui sinais de risco no momento.'
    );

    setText(
      layer,
      '[data-ai-message-summary]',
      best
        ? `Responder ${best.company || 'profissional'} sobre "${best.title}".`
        : 'Não há mensagem prioritária agora.'
    );

    setText(
      layer,
      '[data-ai-advance-text]',
      `${actionCount} exigem ação, ${riskCount} em risco e ${completedCount} concluído(s) para pós-serviço.`
    );

    lastDraft = buildDraft(best);
    const textarea = layer.querySelector('[data-ai-draft]');
    if (textarea) textarea.value = lastDraft;

    const openButton = layer.querySelector('[data-ai-open-priority]');
    if (openButton) {
      openButton.hidden = !best?.card;
      openButton.dataset.orderId = best?.id || '';
    }
  };

  const open = () => {
    const layer = createLayer();
    const panel = layer.querySelector('.doke-ai-panel');
    render(layer);

    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
      layer.classList.add('is-open');
      panel?.focus({ preventScroll: true });
    });
  };

  const close = () => {
    const layer = document.querySelector('[data-doke-ai-layer]');
    if (!layer) return;

    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');

    window.setTimeout(() => {
      if (!layer.classList.contains('is-open')) layer.hidden = true;
    }, 220);
  };

  const openPriorityOrder = () => {
    const orders = getOrders();
    const best = getBestOrder(orders);
    if (!best?.card) return;

    close();
    best.card.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      const detailsButton = best.card.querySelector('[data-order-open="details"]');
      if (detailsButton) detailsButton.click();
    }, 320);
  };

  const copyDraft = async () => {
    const layer = document.querySelector('[data-doke-ai-layer]');
    const button = layer?.querySelector('[data-ai-copy]');

    try {
      await navigator.clipboard.writeText(lastDraft);
      if (button) {
        button.textContent = 'Copiado';
        window.setTimeout(() => {
          button.textContent = 'Copiar sugestão';
        }, 1400);
      }
    } catch {
      const textarea = layer?.querySelector('[data-ai-draft]');
      textarea?.select();
      document.execCommand('copy');
    }
  };

  const bind = () => {
    if (!document.body?.classList.contains('orders-page-shell')) return;

    createLayer();

    document.addEventListener('click', (event) => {
      if (event.target.closest('[data-doke-ai-open]')) {
        event.preventDefault();
        open();
        return;
      }

      if (event.target.closest('[data-doke-ai-close]')) {
        event.preventDefault();
        close();
        return;
      }

      if (event.target.closest('[data-ai-open-priority]')) {
        event.preventDefault();
        openPriorityOrder();
        return;
      }

      if (event.target.closest('[data-ai-copy]')) {
        event.preventDefault();
        copyDraft();
      }
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    }, true);
  };

  ns.aiAssistant = Object.freeze({
    open,
    close,
    render
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
