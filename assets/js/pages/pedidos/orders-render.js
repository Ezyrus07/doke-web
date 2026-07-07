/* Doke pedidos — render bridge.
   Responsibility: reflect the order intelligence/state in the existing DOM. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  const data = ns.data;

  const ICONS = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v10H8.2L4 20V6.5Z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="3"></rect><path d="M8 3.5v4"></path><path d="M16 3.5v4"></path><path d="M4 10h16"></path></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 16H3L12 3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
    document: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20H7V3.5Z"></path><path d="M14 3.5V8h4"></path><path d="M9.5 12h5"></path><path d="M9.5 15.5h5"></path></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"></path><path d="M19 15l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-.4L19 15Z"></path></svg>'
  };

  const setMetric = (name, value) => {
    const target = data.qs(`[data-orders-command-value="${name}"]`);
    if (target) target.textContent = String(value);
  };

  const getAudience = (orders) => {
    const sessionRole = window.Doke?.session?.getCurrentUser?.()?.role
      || document.documentElement.dataset.authRole;
    if (sessionRole === 'professional') return 'professional';
    if (sessionRole === 'client') return 'client';
    return orders.some((order) => order.viewerRole === 'professional') ? 'professional' : 'client';
  };

  const setMetricCopy = (name, label, hint) => {
    const value = data.qs(`[data-orders-command-value="${name}"]`);
    const content = value?.closest('.orders-command-summary__content');
    const labelTarget = data.qs('.orders-command-summary__label', content);
    const hintTarget = data.qs('.orders-command-summary__hint', content);
    if (labelTarget) labelTarget.textContent = label;
    if (hintTarget) hintTarget.textContent = hint;
  };

  const applyAudienceComposition = (audience) => {
    const clientView = audience === 'client';
    document.body.dataset.ordersAudience = audience;
    data.qs('.orders-page')?.classList.toggle('orders-page--client', clientView);

    data.qsa('[data-orders-agenda-toggle]').forEach((node) => {
      node.hidden = clientView;
      node.style.display = clientView ? 'none' : '';
      node.setAttribute('aria-hidden', String(clientView));
    });
    data.qsa('[data-orders-hydration-ready="planner"], [data-orders-hydration-ready="insights"]').forEach((node) => {
      if (clientView) node.hidden = true;
    });
    data.qsa('[data-orders-hydration-skeleton="planner"], [data-orders-hydration-skeleton="insights"]').forEach((node) => {
      if (clientView) node.hidden = true;
    });

    if (clientView) {
      setMetricCopy('action', 'Pedidos ativos', 'Solicitações em andamento');
      setMetricCopy('today', 'Aguardando resposta', 'Pedidos enviados aos profissionais');
      setMetricCopy('risk', 'Próximos compromissos', 'Visitas e serviços marcados');
      setMetricCopy('budget', 'Concluídos', 'Serviços finalizados');
      return;
    }

    setMetricCopy('action', 'Aguardando você', 'Pedidos precisam da sua ação');
    setMetricCopy('today', 'Compromissos hoje', 'Próximos eventos da agenda');
    setMetricCopy('risk', 'Em risco', 'Prazos exigem atenção');
    setMetricCopy('budget', 'Orçamentos abertos', 'Pedidos ativos em negociação');
  };


  const getAiInsight = (order) => {
    if (order.status === 'completed') {
      return 'IA: pós-serviço';
    }

    if (order.risk.level === 'high') {
      return 'IA: risco detectado';
    }

    if (order.requiresAction) {
      return 'IA: responder hoje';
    }

    return 'IA: acompanhar';
  };

  const ensureCardAiInsight = (order) => {
    const card = order.card;
    if (!card || card.closest('.orders-list') || data.qs('.order-card__ai-insight', card)) return;

    const actions = data.qs('.order-card__actions', card);
    const body = data.qs('.order-card__body', card);
    const target = actions || body;
    if (!target) return;

    const insight = document.createElement('button');
    insight.className = 'order-card__ai-insight doke-btn doke-btn--soft';
    insight.type = 'button';
    insight.dataset.dokeAiOpen = 'true';
    insight.innerHTML = `
      <span class="order-card__ai-insight-icon" aria-hidden="true">${ICONS.spark}</span>
      <span class="order-card__ai-insight-text"></span>
    `;

    target.parentNode.insertBefore(insight, target);
  };

  const ensureNextAction = (order) => {
    const card = order.card;
    if (!card || data.qs('.order-card__next-action', card)) return;

    const top = data.qs('.order-card__top', card);
    if (top && !data.qs('.order-card__smart-badge', top)) {
      const badge = document.createElement('span');
      badge.className = 'order-card__smart-badge doke-badge';
      top.appendChild(badge);
    }

    const body = data.qs('.order-card__body', card);
    const actions = data.qs('.order-card__actions', card);
    if (!body) return;

    const block = document.createElement('section');
    block.className = 'order-card__next-action';
    block.setAttribute('aria-label', 'Próxima ação recomendada');
    block.innerHTML = `
      <span class="order-card__next-action-icon" aria-hidden="true"></span>
      <span class="order-card__next-action-copy">
        <span class="order-card__next-action-label">Próxima ação</span>
        <strong class="order-card__next-action-title"></strong>
        <span class="order-card__next-action-note"></span>
      </span>
      <button class="order-card__next-action-button doke-icon-btn doke-icon-btn--soft" type="button" data-order-open="details" aria-label="Ver próxima ação">›</button>
    `;

    if (actions) card.insertBefore(block, actions);
    else body.insertAdjacentElement('afterend', block);
  };

  const decorateOrder = (order) => {
    const card = order.card;
    if (!card) return;

    ensureNextAction(order);
    ensureCardAiInsight(order);

    card.dataset.commandEnhanced = 'true';
    card.dataset.smartStatus = order.status;
    card.dataset.smartRisk = order.risk.level;
    card.dataset.smartPriority = String(order.priorityScore);
    card.dataset.requiresAction = String(order.requiresAction);

    const badge = data.qs('.order-card__smart-badge', card);
    if (badge) badge.textContent = order.smartBadge;

    const icon = data.qs('.order-card__next-action-icon', card);
    const title = data.qs('.order-card__next-action-title', card);
    const note = data.qs('.order-card__next-action-note', card);
    const button = data.qs('.order-card__next-action-button', card);
    const aiInsight = data.qs('.order-card__ai-insight-text', card);

    if (icon) icon.innerHTML = ICONS[order.statusConfig.icon] || ICONS.document;
    if (aiInsight) aiInsight.textContent = getAiInsight(order);
    if (title) title.textContent = order.nextAction.title;
    if (note) note.textContent = order.nextAction.note;
    if (button) button.setAttribute('aria-label', order.nextAction.cta);
  };

  const updateFilterCounts = (summary) => {
    const counts = summary.byStatus || {};
    data.qsa('[data-orders-filter-count]').forEach((target) => {
      const key = target.dataset.ordersFilterCount;
      target.textContent = String(counts[key] || 0);
    });
  };

  const updateSummary = (orders) => {
    const todayCount = data.readTodayEvents().length;
    const summary = ns.intelligence.summarize(orders, todayCount);
    const audience = getAudience(orders);

    applyAudienceComposition(audience);
    if (audience === 'client') {
      setMetric('action', orders.filter((order) => order.active).length);
      setMetric('today', orders.filter((order) => order.awaitingProfessional).length);
      setMetric('risk', summary.today);
      setMetric('budget', orders.filter((order) => order.status === 'completed').length);
    } else {
      setMetric('action', summary.action);
      setMetric('today', summary.today);
      setMetric('risk', summary.risk);
      setMetric('budget', summary.budget);
    }
    updateFilterCounts(summary);

    return summary;
  };

  const updateInsights = (orders) => {
    const insights = ns.intelligence.getInsights(orders);

    Object.entries(insights).forEach(([key, insight]) => {
      const title = data.qs(`[data-orders-insight-title="${key}"]`);
      const text = data.qs(`[data-orders-insight-text="${key}"]`);
      if (title) title.textContent = insight.title;
      if (text) text.textContent = insight.text;
    });
  };

  const updateActiveFilter = (filter, visibleCount) => {
    data.qsa('[data-filter]').forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const chip = data.qs('[data-orders-active-chip]');
    const clear = data.qs('[data-orders-clear-filter]');
    if (!chip) return;

    const labels = {
      all: 'Todos',
      pending: 'Aguardando',
      conversation: 'Pedido aceito',
      responded: 'Propostas',
      completed: 'Concluídos',
      cancelled: 'Cancelados',
      action: 'Aguardando você',
      risk: 'Em risco',
      open: 'Orçamentos'
    };

    chip.textContent = `${labels[filter] || 'Filtro'} ${visibleCount}`;
    chip.hidden = filter === 'all';
    if (clear) clear.hidden = filter === 'all';
  };

  const ensureEmptyState = () => {
    // pedidos.html already owns the canonical empty state.
    // This bridge must not inject a second card inside the order list because
    // localStorage orders are hydrated after the command center snapshot.
    return data.qs('[data-orders-empty-state]');
  };

  const render = (snapshot) => {
    const all = snapshot.classifiedOrders;
    const visible = snapshot.visibleOrders;
    const visibleIds = new Set(visible.map((order) => order.id));

    all.forEach((order) => {
      decorateOrder(order);
      if (order.card) {
        order.card.hidden = !visibleIds.has(order.id);
        order.card.setAttribute('aria-hidden', String(!visibleIds.has(order.id)));
      }
    });

    const empty = ensureEmptyState();
    if (empty) {
      const isHydrating = window.DokePageHydration?.create
        && document.body?.dataset.pageHydration === 'hydrating';
      const hasVisibleDomCard = data.qsa('.orders-list .order-card')
        .some((card) => !card.hidden && card.getAttribute('aria-hidden') !== 'true');
      const shouldHideEmpty = isHydrating || hasVisibleDomCard || visible.length > 0;
      empty.hidden = shouldHideEmpty;
      empty.setAttribute('aria-hidden', shouldHideEmpty ? 'true' : 'false');
    }

    updateSummary(all);
    updateInsights(all);
    updateActiveFilter(snapshot.filter, visible.length);
    document.documentElement.dataset.ordersCommandCenter = 'v2';
  };

  ns.render = Object.freeze({
    decorateOrder,
    updateSummary,
    updateInsights,
    render
  });
})();
