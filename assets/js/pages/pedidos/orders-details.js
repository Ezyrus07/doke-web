
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
  let activeOrder = null;
  const TRANSITION_MS = 180;

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const getCurrentUser = () => {
    try {
      const sessionUser = window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.();
      if (sessionUser) return sessionUser;
    } catch (error) {
      // fallback below
    }

    try {
      const raw = window.localStorage.getItem('doke.auth.session.v1');
      const session = raw ? JSON.parse(raw) : null;
      return session?.user || null;
    } catch (error) {
      return null;
    }
  };

  const canUseSupportDisputeActions = (user = getCurrentUser()) => {
    const role = clean(user?.role || user?.type).toLowerCase();
    if (role === 'admin' || role === 'support') return true;
    if (user?.isMockSupport === true || user?.mockSupport === true) return true;
    const permissions = window.Doke?.permissions;
    return Boolean(role && permissions?.has?.('*', role));
  };

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
            <button class="orders-detail-drawer__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-orders-detail-close aria-label="Fechar">${ICONS.close}</button>
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
              <div class="orders-detail-row" data-detail-schedule-row hidden><dt>Agenda do serviço</dt><dd data-detail-schedule></dd></div>
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

          <section class="orders-detail-section orders-detail-dispute" data-detail-dispute-section hidden>
            <div class="orders-detail-dispute__header">
              <span class="orders-detail-section__eyebrow">Análise da contestação</span>
              <span class="orders-detail-dispute__status" data-detail-dispute-status></span>
            </div>
            <div class="orders-detail-dispute__body">
              <div class="orders-detail-dispute__item">
                <span>Status</span>
                <strong data-detail-dispute-status-inline></strong>
              </div>
              <div class="orders-detail-dispute__item">
                <span>Motivo</span>
                <strong data-detail-dispute-reason></strong>
              </div>
              <div class="orders-detail-dispute__item orders-detail-dispute__item--wide">
                <span>Relato do cliente</span>
                <p data-detail-dispute-report></p>
              </div>
            </div>
            <div class="orders-detail-dispute__response" data-detail-dispute-response hidden>
              <span>Resposta do profissional</span>
              <p data-detail-dispute-response-text></p>
              <small data-detail-dispute-response-meta></small>
            </div>
            <div class="orders-detail-dispute__analysis" data-detail-dispute-analysis hidden>
              <div>
                <span data-detail-dispute-analysis-kicker>Resultado da análise</span>
                <strong data-detail-dispute-analysis-title>Contestação em análise</strong>
                <p data-detail-dispute-analysis-text>Aguarde a resposta do profissional antes de encerrar a análise.</p>
              </div>
              <div class="orders-detail-dispute__analysis-actions" data-detail-dispute-support-actions aria-label="Ação mock de suporte" hidden>
                <span class="orders-detail-dispute__support-label">Ação mock de suporte</span>
                <button class="orders-detail-dispute__button orders-detail-dispute__button--release doke-btn doke-btn--ghost" type="button" data-detail-dispute-resolve="profissional" aria-label="Ação mock de suporte: liberar repasse ao profissional">Liberar repasse ao profissional</button>
                <button class="orders-detail-dispute__button orders-detail-dispute__button--refund doke-btn doke-btn--ghost" type="button" data-detail-dispute-resolve="cliente" aria-label="Ação mock de suporte: reembolsar cliente">Reembolsar cliente</button>
              </div>
              <p class="orders-detail-dispute__analysis-feedback" data-detail-dispute-analysis-feedback hidden></p>
            </div>
            <form class="orders-detail-dispute__reply" data-detail-dispute-reply-form hidden>
              <label>
                <span>Resposta para a contestação</span>
                <textarea data-detail-dispute-reply-input maxlength="420" rows="4" placeholder="Explique de forma objetiva o que aconteceu e qual será o próximo passo."></textarea>
              </label>
              <div class="orders-detail-dispute__reply-actions">
                <button class="orders-detail-dispute__button orders-detail-dispute__button--primary doke-btn doke-btn--primary" type="submit" data-detail-dispute-reply-submit>Salvar resposta</button>
                <button class="orders-detail-dispute__button orders-detail-dispute__button--secondary doke-btn doke-btn--ghost" type="button" data-detail-dispute-reply-cancel>Cancelar</button>
              </div>
              <p class="orders-detail-dispute__reply-feedback" data-detail-dispute-reply-feedback hidden></p>
            </form>
            <div class="orders-detail-dispute__actions">
              <button class="orders-detail-dispute__button orders-detail-dispute__button--primary doke-btn doke-btn--primary" type="button" data-detail-dispute-reply-open>Enviar resposta</button>
              <button class="orders-detail-dispute__button orders-detail-dispute__button--secondary doke-btn doke-btn--ghost" type="button" data-detail-chat>Abrir conversa</button>
            </div>
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
          <button class="orders-detail-actions__button orders-detail-actions__button--secondary doke-btn doke-btn--ghost" type="button" data-detail-receipt hidden>Ver comprovante</button>
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

  const getOrderReceiptUrl = (order) => {
    const explicit = clean(order?.receiptUrl);
    if (explicit) return explicit;
    const transactionId = clean(order?.walletTransactionId);
    if (!transactionId) return '';
    return 'carteira.html?transaction=' + encodeURIComponent(transactionId) + '&receipt=1';
  };

  const openReceiptForActiveOrder = () => {
    const url = getOrderReceiptUrl(activeOrder);
    if (!url) return;
    if (typeof window.DokeNavigate === 'function') {
      window.DokeNavigate(url);
      return;
    }
    window.location.href = url;
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
    const secondaryBadge = clean(order.smartBadge) && clean(order.smartBadge) !== clean(order.statusConfig.label)
      ? order.smartBadge
      : order.smartStatus || order.nextAction?.cta || 'Conversa ativa';
    target.innerHTML = `
      <span class="orders-detail-pill">${order.statusConfig.label}</span>
      <span class="orders-detail-pill" data-tone="${tone}">${secondaryBadge}</span>
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

  const getFallbackTimeline = (order) => {
    const status = order.status || 'pending';
    const accepted = ['accepted', 'conversation', 'responded', 'quoted', 'in_progress', 'completed'].includes(status);
    const quoted = ['responded', 'quoted', 'in_progress', 'completed'].includes(status);
    const completed = status === 'completed';
    const cancelled = status === 'cancelled';

    if (cancelled) {
      return [
        { label: 'Pedido recebido', date: order.updatedLabel || 'Registrado na Doke', done: true, current: false },
        { label: 'Pedido recusado', date: 'Fluxo encerrado', done: false, current: true },
        { label: 'Conversa bloqueada', date: 'Chat indisponível', done: false, current: false }
      ];
    }

    return [
      { label: 'Pedido recebido', date: order.updatedLabel || 'Registrado na Doke', done: true, current: false },
      { label: 'Aceite do profissional', date: accepted ? 'Pedido aceito' : 'Aguardando resposta', done: accepted, current: !accepted },
      { label: 'Proposta e pagamento', date: quoted ? 'Proposta enviada' : 'Próxima etapa', done: quoted, current: accepted && !quoted },
      { label: 'Atendimento', date: completed ? 'Concluído' : 'Após confirmação', done: completed, current: quoted && !completed }
    ];
  };

  const renderTimeline = (layer, order) => {
    const target = layer.querySelector('[data-detail-timeline]');
    if (!target) return;
    let steps = Array.from(order.card.querySelectorAll('.order-card__progress-step')).map((step) => ({
      label: clean(step.querySelector('.order-card__progress-label')?.textContent) || 'Etapa',
      date: clean(step.querySelector('.order-card__progress-date')?.textContent),
      done: step.classList.contains('is-done'),
      current: step.classList.contains('is-current')
    }));
    if (!steps.length) steps = getFallbackTimeline(order);
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


  const isActiveDispute = (dispute) => {
    const state = clean(dispute?.state);
    const status = clean(dispute?.status);
    return Boolean(state || status) && !['resolvida', 'reembolsado', 'resolvida_profissional', 'resolvida_cliente'].includes(state) && !['resolvida_profissional', 'resolvida_cliente', 'reembolsado'].includes(status);
  };

  const isAnalysisReady = (dispute) => {
    const status = clean(dispute?.status);
    return status === 'em_analise' && Boolean(clean(dispute?.responseText));
  };

  const getResolvedStatusLabel = (dispute) => {
    const status = clean(dispute?.status);
    const resolution = clean(dispute?.resolution);
    if (status === 'reembolsado' || status === 'resolvida_cliente' || resolution === 'cliente') return 'Reembolsado ao cliente';
    if (status === 'resolvida_profissional' || resolution === 'profissional') return 'Repasse liberado';
    if (status === 'em_analise') return 'Em análise';
    return 'Em contestação';
  };

  const isClientResolution = (dispute) => {
    const status = clean(dispute?.status);
    const resolution = clean(dispute?.resolution);
    return status === 'reembolsado' || status === 'resolvida_cliente' || resolution === 'cliente';
  };

  const isResolvedDispute = (dispute) => {
    const status = clean(dispute?.status);
    const state = clean(dispute?.state);
    const resolution = clean(dispute?.resolution);
    return ['resolvida', 'reembolsado', 'resolvida_profissional', 'resolvida_cliente'].includes(state)
      || ['resolvida_profissional', 'resolvida_cliente', 'reembolsado'].includes(status)
      || ['profissional', 'cliente'].includes(resolution);
  };

  const getDisputeDecisionTitle = (dispute, options = {}) => {
    if (isClientResolution(dispute)) return 'Cliente reembolsado';
    if (isResolvedDispute(dispute)) return 'Repasse liberado ao profissional';
    if (isAnalysisReady(dispute)) return options.canResolve ? 'Pronto para decisão mock' : 'Aguardando decisão do suporte';
    return 'Contestação em análise';
  };

  const getDisputeResultCopy = (dispute, options = {}) => {
    if (isClientResolution(dispute)) return 'Contestação encerrada. Cliente reembolsado.';
    if (isResolvedDispute(dispute)) return 'Contestação encerrada. Repasse liberado ao profissional.';
    if (isAnalysisReady(dispute)) {
      return options.canResolve
        ? 'Resposta registrada. Use a ação mock de suporte para simular a decisão financeira.'
        : 'Resposta registrada. A contestação aguarda decisão do suporte.';
    }
    if (clean(dispute?.status) === 'em_analise') return 'Pedido em análise. Aguarde a decisão mock do suporte.';
    return 'Contestação aberta. O repasse permanece pausado até a resposta e a análise mock.';
  };

  const getDisputeVisualState = (dispute) => {
    if (isClientResolution(dispute)) return 'reembolsado';
    if (isResolvedDispute(dispute)) return 'resolvida';
    return clean(dispute?.state) || clean(dispute?.status) || 'contestacao';
  };

  const renderDispute = (layer, order) => {
    const section = layer.querySelector('[data-detail-dispute-section]');
    if (!section) return;
    const dispute = order.dispute || {};
    const hasDispute = Boolean(clean(dispute.state) || clean(dispute.status) || clean(dispute.reason) || clean(dispute.reportText));
    section.hidden = !hasDispute;
    if (!hasDispute) return;

    const responseText = clean(dispute.responseText);
    const responseAt = clean(dispute.responseAt);
    const active = isActiveDispute(dispute);
    const resolved = isResolvedDispute(dispute);
    const status = getResolvedStatusLabel(dispute) || clean(order.statusLabel);
    const readyForDecision = active && isAnalysisReady(dispute);
    const canResolveDispute = readyForDecision && canUseSupportDisputeActions();
    const shouldShowAnalysis = resolved || readyForDecision || responseText || clean(dispute.status) === 'em_analise';
    section.dataset.disputeState = getDisputeVisualState(dispute);
    section.dataset.disputeId = clean(dispute.id);
    section.dataset.orderId = clean(order.id);

    setText(layer, '[data-detail-dispute-status]', status);
    setText(layer, '[data-detail-dispute-status-inline]', status);
    setText(layer, '[data-detail-dispute-reason]', dispute.reasonLabel || 'Motivo não informado');
    setText(layer, '[data-detail-dispute-report]', dispute.reportText || dispute.reason || 'O relato do cliente ainda não foi detalhado.');

    const responseBox = layer.querySelector('[data-detail-dispute-response]');
    const responseCopy = layer.querySelector('[data-detail-dispute-response-text]');
    const responseMeta = layer.querySelector('[data-detail-dispute-response-meta]');
    if (responseBox) responseBox.hidden = !responseText;
    if (responseCopy) responseCopy.textContent = responseText;
    if (responseMeta) responseMeta.textContent = responseAt ? `Enviada em ${responseAt}` : 'Resposta registrada no pedido.';

    const replyForm = layer.querySelector('[data-detail-dispute-reply-form]');
    const replyInput = layer.querySelector('[data-detail-dispute-reply-input]');
    const feedback = layer.querySelector('[data-detail-dispute-reply-feedback]');
    if (replyForm) replyForm.hidden = true;
    if (replyInput) replyInput.value = responseText || '';
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }

    const replyButton = layer.querySelector('[data-detail-dispute-reply-open]');
    if (replyButton) {
      replyButton.hidden = !active || resolved;
      replyButton.textContent = responseText ? 'Atualizar resposta' : 'Enviar resposta';
    }

    const analysis = layer.querySelector('[data-detail-dispute-analysis]');
    const analysisKicker = layer.querySelector('[data-detail-dispute-analysis-kicker]');
    const analysisTitle = layer.querySelector('[data-detail-dispute-analysis-title]');
    const analysisText = layer.querySelector('[data-detail-dispute-analysis-text]');
    const analysisActions = layer.querySelector('[data-detail-dispute-support-actions]');
    const analysisFeedback = layer.querySelector('[data-detail-dispute-analysis-feedback]');
    if (analysis) analysis.hidden = !shouldShowAnalysis;
    if (analysisKicker) analysisKicker.textContent = canResolveDispute ? 'Ação mock de suporte' : 'Resultado da análise';
    if (analysisTitle) analysisTitle.textContent = getDisputeDecisionTitle(dispute, { canResolve: canResolveDispute });
    if (analysisText) analysisText.textContent = getDisputeResultCopy(dispute, { canResolve: canResolveDispute });
    if (analysisActions) analysisActions.hidden = !canResolveDispute;
    if (analysisFeedback) {
      analysisFeedback.hidden = true;
      analysisFeedback.textContent = '';
    }
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
    activeOrder = order;
    setText(layer, '[data-detail-title]', order.title);
    const peerLabel = order.peerRoleLabel || (order.viewerRole === 'professional' ? 'Cliente' : 'Profissional');
    const subtitle = order.address ? `${order.company} • ${order.address}` : order.company;
    setText(layer, '[data-detail-subtitle]', subtitle);
    setText(layer, '[data-detail-action-title]', order.nextAction.title);
    setText(layer, '[data-detail-action-note]', order.nextAction.note);
    setText(layer, '[data-detail-peer-label]', peerLabel);
    setText(layer, '[data-detail-company]', order.company);
    setText(layer, '[data-detail-address]', order.address);
    const scheduleRow = layer.querySelector('[data-detail-schedule-row]');
    const schedule = Array.isArray(order.serviceSchedule) ? order.serviceSchedule : [];
    const scheduleLabel = schedule.map((slot) => `${clean(slot.label || slot.day || 'Dia')} ${clean(slot.start)}–${clean(slot.end)}`).filter(Boolean).join(' • ');
    if (scheduleRow) scheduleRow.hidden = !scheduleLabel;
    setText(layer, '[data-detail-schedule]', scheduleLabel);
    setText(layer, '[data-detail-scope]', order.scope);
    setText(layer, '[data-detail-budget]', order.budget);
    setText(layer, '[data-detail-payment]', order.payment);
    setText(layer, '[data-detail-deadline]', order.timeline || order.deadlineLabel);
    setText(layer, '[data-detail-materials]', order.materials);
    setText(layer, '[data-detail-flow]', order.flow);
    renderDispute(layer, order);

    const receiptButton = layer.querySelector('[data-detail-receipt]');
    if (receiptButton) {
      const receiptUrl = getOrderReceiptUrl(order);
      receiptButton.hidden = !receiptUrl;
      receiptButton.dataset.detailReceiptUrl = receiptUrl;
    }

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
          activeOrder = null;
        }

        resolve();
      }, handoff ? TRANSITION_MS : 220);
    });
  };


  const openDisputeReplyForm = (trigger) => {
    const layer = trigger?.closest?.('[data-orders-detail-layer]') || document.querySelector('[data-orders-detail-layer]');
    if (!layer) return;
    const form = layer.querySelector('[data-detail-dispute-reply-form]');
    const input = layer.querySelector('[data-detail-dispute-reply-input]');
    const feedback = layer.querySelector('[data-detail-dispute-reply-feedback]');
    if (!form) return;
    form.hidden = false;
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
    window.requestAnimationFrame(() => input?.focus?.({ preventScroll: false }));
  };

  const closeDisputeReplyForm = (trigger) => {
    const layer = trigger?.closest?.('[data-orders-detail-layer]') || document.querySelector('[data-orders-detail-layer]');
    const form = layer?.querySelector?.('[data-detail-dispute-reply-form]');
    const feedback = layer?.querySelector?.('[data-detail-dispute-reply-feedback]');
    if (form) form.hidden = true;
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
  };

  const updateDisputeResponseUi = (layer, responseText, responseAt) => {
    const responseBox = layer.querySelector('[data-detail-dispute-response]');
    const responseCopy = layer.querySelector('[data-detail-dispute-response-text]');
    const responseMeta = layer.querySelector('[data-detail-dispute-response-meta]');
    const replyButton = layer.querySelector('[data-detail-dispute-reply-open]');
    if (responseBox) responseBox.hidden = false;
    if (responseCopy) responseCopy.textContent = responseText;
    if (responseMeta) responseMeta.textContent = responseAt ? `Enviada em ${responseAt}` : 'Resposta registrada no pedido.';
    if (replyButton) replyButton.textContent = 'Atualizar resposta';
    setText(layer, '[data-detail-dispute-status]', 'Em análise');
    setText(layer, '[data-detail-dispute-status-inline]', 'Em análise');
    const analysis = layer.querySelector('[data-detail-dispute-analysis]');
    const analysisKicker = layer.querySelector('[data-detail-dispute-analysis-kicker]');
    const analysisTitle = layer.querySelector('[data-detail-dispute-analysis-title]');
    const analysisText = layer.querySelector('[data-detail-dispute-analysis-text]');
    const analysisActions = layer.querySelector('[data-detail-dispute-support-actions]');
    const canResolveDispute = canUseSupportDisputeActions();
    if (analysis) analysis.hidden = false;
    if (analysisKicker) analysisKicker.textContent = canResolveDispute ? 'Ação mock de suporte' : 'Resultado da análise';
    if (analysisTitle) analysisTitle.textContent = canResolveDispute ? 'Pronto para decisão mock' : 'Aguardando decisão do suporte';
    if (analysisText) {
      analysisText.textContent = canResolveDispute
        ? 'Resposta registrada. Use a ação mock de suporte para simular a decisão financeira.'
        : 'Resposta registrada. A contestação aguarda decisão do suporte.';
    }
    if (analysisActions) analysisActions.hidden = !canResolveDispute;
  };

  const submitDisputeReply = (form) => {
    const layer = form.closest('[data-orders-detail-layer]');
    const input = form.querySelector('[data-detail-dispute-reply-input]');
    const submit = form.querySelector('[data-detail-dispute-reply-submit]');
    const feedback = form.querySelector('[data-detail-dispute-reply-feedback]');
    const responseText = clean(input?.value || '');
    if (!responseText) {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Escreva uma resposta antes de salvar.';
      }
      input?.focus?.();
      return;
    }
    const wallet = window.Doke?.services?.wallet || window.Doke?.repositories?.wallet;
    if (!wallet || typeof wallet.respondDispute !== 'function') {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Resposta indisponível. Recarregue a página.';
      }
      return;
    }
    const dispute = activeOrder?.dispute || {};
    const payload = {
      disputeId: dispute.id || layer?.querySelector('[data-detail-dispute-section]')?.dataset.disputeId || '',
      orderId: activeOrder?.id || layer?.querySelector('[data-detail-dispute-section]')?.dataset.orderId || '',
      responseText
    };
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Salvando...';
    }
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }
    wallet.respondDispute(payload).then((result) => {
      const updated = result?.dispute || {};
      const nextResponse = updated.responseText || responseText;
      const responseAt = updated.responseAt || '';
      if (activeOrder) {
        activeOrder.dispute = Object.assign({}, activeOrder.dispute, updated, { responseText: nextResponse, responseAt, status: updated.status || activeOrder.dispute?.status });
        activeOrder.statusLabel = updated.status === 'em_analise' ? 'Em análise' : activeOrder.statusLabel;
      }
      if (activeCard) {
        activeCard.dataset.disputeResponseText = nextResponse;
        activeCard.dataset.disputeResponseAt = responseAt;
        activeCard.dataset.disputeStatus = updated.status || activeCard.dataset.disputeStatus || '';
        activeCard.dataset.detailStatus = updated.status === 'em_analise' ? 'Em análise' : activeCard.dataset.detailStatus || '';
      }
      updateDisputeResponseUi(layer, nextResponse, responseAt);
      form.hidden = true;
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Resposta registrada. O cliente será avisado.';
      }
      window.DokeHydrateLocalOrders?.({ force: true });
    }).catch((error) => {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = error?.message || 'Não foi possível salvar a resposta.';
      }
    }).finally(() => {
      if (submit) {
        submit.disabled = false;
        submit.textContent = 'Salvar resposta';
      }
    });
  };

  const resolveDisputeFromDetails = (trigger) => {
    const layer = trigger?.closest?.('[data-orders-detail-layer]') || document.querySelector('[data-orders-detail-layer]');
    if (!layer) return;
    const resolution = trigger?.dataset?.detailDisputeResolve || '';
    if (!resolution) return;
    const feedback = layer.querySelector('[data-detail-dispute-analysis-feedback]');
    if (!canUseSupportDisputeActions()) {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Apenas o suporte mock pode concluir a análise da contestação.';
      }
      return;
    }
    const wallet = window.Doke?.services?.wallet || window.Doke?.repositories?.wallet;
    if (!wallet || typeof wallet.resolveDispute !== 'function') {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = 'Resolução indisponível. Recarregue a página.';
      }
      return;
    }
    const dispute = activeOrder?.dispute || {};
    const payload = {
      disputeId: dispute.id || layer.querySelector('[data-detail-dispute-section]')?.dataset.disputeId || '',
      orderId: activeOrder?.id || layer.querySelector('[data-detail-dispute-section]')?.dataset.orderId || '',
      resolution
    };
    const buttons = Array.from(layer.querySelectorAll('[data-detail-dispute-resolve]'));
    buttons.forEach((button) => { button.disabled = true; });
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = resolution === 'cliente' ? 'Reembolsando cliente...' : 'Liberando repasse...';
    }
    wallet.resolveDispute(payload).then((result) => {
      const updated = result?.dispute || {};
      const statusLabel = getResolvedStatusLabel(updated);
      if (activeOrder) {
        activeOrder.dispute = Object.assign({}, activeOrder.dispute, updated, {
          state: updated.status === 'reembolsado' || updated.status === 'resolvida_cliente' ? 'reembolsado' : 'resolvida',
          status: updated.status
        });
        activeOrder.statusLabel = statusLabel;
      }
      if (activeCard) {
        activeCard.dataset.disputeStatus = updated.status || activeCard.dataset.disputeStatus || '';
        activeCard.dataset.disputeResolution = updated.resolution || '';
        activeCard.dataset.detailStatus = statusLabel;
      }
      setText(layer, '[data-detail-dispute-status]', statusLabel);
      setText(layer, '[data-detail-dispute-status-inline]', statusLabel);
      const section = layer.querySelector('[data-detail-dispute-section]');
      if (section) section.dataset.disputeState = getDisputeVisualState(updated);
      const analysis = layer.querySelector('[data-detail-dispute-analysis]');
      const analysisKicker = layer.querySelector('[data-detail-dispute-analysis-kicker]');
      const analysisTitle = layer.querySelector('[data-detail-dispute-analysis-title]');
      const analysisText = layer.querySelector('[data-detail-dispute-analysis-text]');
      const analysisActions = layer.querySelector('[data-detail-dispute-support-actions]');
      if (analysis) analysis.hidden = false;
      if (analysisKicker) analysisKicker.textContent = 'Resultado da análise';
      if (analysisTitle) analysisTitle.textContent = getDisputeDecisionTitle(updated, { canResolve: true });
      if (analysisText) analysisText.textContent = getDisputeResultCopy(updated, { canResolve: true });
      if (analysisActions) analysisActions.hidden = true;
      const replyButton = layer.querySelector('[data-detail-dispute-reply-open]');
      if (replyButton) replyButton.hidden = true;
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = getDisputeResultCopy(updated, { canResolve: true });
      }
      window.DokeHydrateLocalOrders?.({ force: true });
    }).catch((error) => {
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = error?.message || 'Não foi possível concluir a análise.';
      }
    }).finally(() => {
      buttons.forEach((button) => { button.disabled = false; });
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

      const receiptButton = event.target.closest('[data-detail-receipt]');
      if (receiptButton) {
        event.preventDefault();
        openReceiptForActiveOrder();
        return;
      }

      const replyOpenButton = event.target.closest('[data-detail-dispute-reply-open]');
      if (replyOpenButton) {
        event.preventDefault();
        openDisputeReplyForm(replyOpenButton);
        return;
      }

      const replyCancelButton = event.target.closest('[data-detail-dispute-reply-cancel]');
      if (replyCancelButton) {
        event.preventDefault();
        closeDisputeReplyForm(replyCancelButton);
        return;
      }

      const resolveButton = event.target.closest('[data-detail-dispute-resolve]');
      if (resolveButton) {
        event.preventDefault();
        resolveDisputeFromDetails(resolveButton);
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

    document.addEventListener('submit', (event) => {
      const replyForm = event.target.closest?.('[data-detail-dispute-reply-form]');
      if (!replyForm) return;
      event.preventDefault();
      submitDisputeReply(replyForm);
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
