/* Doke pedidos — deterministic intelligence.
   Responsibility: classify orders, calculate risks, priorities, metrics and next actions.
   No DOM mutation here. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  const data = ns.data;

  const textOf = (order) => [
    order.status,
    order.statusLabel,
    order.title,
    order.subtitle,
    order.timeline,
    order.deadlineLabel,
    order.flow,
    order.updatedLabel
  ].join(' ').toLowerCase();

  const hasAny = (text, terms) => terms.some((term) => text.includes(term));

  const getRisk = (order) => {
    if (['completed', 'cancelled'].includes(order.status)) {
      return { level: 'low', label: 'Baixo', reason: 'Pedido não exige ação operacional imediata.' };
    }

    const text = textOf(order);

    if (hasAny(text, ['hoje', 'amanhã', '22/04', 'prazo próximo', 'prevista até amanhã'])) {
      return { level: 'high', label: 'Alto', reason: 'Prazo ou próxima etapa está muito próximo.' };
    }

    if (hasAny(text, ['há 2 dias', 'pendente', 'aguardando', 'sem resposta'])) {
      return { level: 'medium', label: 'Médio', reason: 'Pedido parado ou aguardando retorno.' };
    }

    return { level: 'low', label: 'Baixo', reason: 'Pedido dentro do fluxo esperado.' };
  };

  const getNextAction = (order) => {
    const risk = getRisk(order);

    if (order.status === 'cancelled') {
      return {
        type: 'review',
        title: 'Revisar motivo do cancelamento',
        note: 'Use o histórico para melhorar próximos atendimentos.',
        cta: 'Ver histórico'
      };
    }

    if (order.status === 'completed') {
      return {
        type: 'aftercare',
        title: 'Solicitar avaliação do serviço',
        note: 'Feche o ciclo com avaliação, garantia ou oportunidade de recompra.',
        cta: 'Pedir avaliação'
      };
    }

    if (order.status === 'conversation' || risk.level === 'high') {
      return {
        type: 'priority',
        title: 'Enviar proposta revisada',
        note: 'Próxima etapa sensível. Priorize este pedido para não perder ritmo.',
        cta: 'Ver próxima ação'
      };
    }

    if (order.status === 'responded') {
      return {
        type: 'follow-up',
        title: 'Acompanhar confirmação',
        note: 'Cliente/profissional já respondeu. Confirme próximos passos.',
        cta: 'Acompanhar'
      };
    }

    return {
      type: 'reply',
      title: 'Responder ou confirmar proposta',
      note: 'O pedido precisa de retorno para avançar.',
      cta: 'Responder'
    };
  };

  const getPriorityScore = (order) => {
    const risk = getRisk(order);
    const action = getNextAction(order);
    let score = 0;

    if (risk.level === 'high') score += 80;
    if (risk.level === 'medium') score += 45;
    if (['pending', 'conversation', 'responded'].includes(order.status)) score += 20;
    if (action.type === 'priority') score += 15;
    if (order.budgetRange.average > 0) score += Math.min(15, Math.round(order.budgetRange.average / 1000));

    return score;
  };

  const classifyOrder = (order) => {
    const risk = getRisk(order);
    const nextAction = getNextAction(order);
    const priorityScore = getPriorityScore(order);
    const statusConfig = data.STATUS_CONFIG[order.status] || data.STATUS_CONFIG.pending;

    return {
      ...order,
      risk,
      nextAction,
      priorityScore,
      statusConfig,
      requiresAction: ['pending', 'conversation', 'responded'].includes(order.status),
      openBudget: !['completed', 'cancelled'].includes(order.status),
      atRisk: risk.level === 'high',
      smartStatus: statusConfig.summary,
      smartBadge: statusConfig.badge
    };
  };

  const summarize = (orders, todayEventsCount = 0) => {
    const classified = orders.map(classifyOrder);
    return {
      total: classified.length,
      action: classified.filter((order) => order.requiresAction).length,
      today: todayEventsCount,
      risk: classified.filter((order) => order.atRisk).length,
      budget: classified.filter((order) => order.openBudget).length,
      byStatus: classified.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, { all: classified.length })
    };
  };

  const getInsights = (orders) => {
    const classified = orders.map(classifyOrder).sort((a, b) => b.priorityScore - a.priorityScore);
    const actionOrder = classified.find((order) => order.requiresAction);
    const riskOrder = classified.find((order) => order.atRisk);
    const completedOrder = classified.find((order) => order.status === 'completed');

    return {
      action: actionOrder
        ? { title: 'Responder cliente', text: `${actionOrder.title} precisa de uma ação para avançar.` }
        : { title: 'Sem ação pendente', text: 'Nenhum pedido ativo exige resposta imediata agora.' },
      risk: riskOrder
        ? { title: 'Prazo em atenção', text: `${riskOrder.title} tem próxima etapa sensível.` }
        : { title: 'Sem risco crítico', text: 'Nenhum pedido ativo foi classificado como risco alto agora.' },
      done: completedOrder
        ? { title: 'Pós-serviço', text: 'Solicite avaliação ou garantia para fechar o ciclo com qualidade.' }
        : { title: 'Pós-serviço', text: 'Pedidos concluídos aparecerão aqui com ações de fechamento.' }
    };
  };

  ns.intelligence = Object.freeze({
    getRisk,
    getNextAction,
    getPriorityScore,
    classifyOrder,
    summarize,
    getInsights
  });
})();
