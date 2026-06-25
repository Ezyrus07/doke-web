/* Pedidos Chat Panel v4
   Separate chat panel for pedidos.html. No redirect to mensagens.html. */
(function () {
  const ns = (window.DokeOrders = window.DokeOrders || {});
  let activeTrigger = null;
  let activeCard = null;
  let activeConversationId = '';
  const TRANSITION_MS = 180;

  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const escapeHtml = (value) => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getCurrentUser = () => {
    try {
      return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || null;
    } catch (error) {
      return null;
    }
  };

  const getInitials = (value) => clean(value || 'Doke')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'DK';

  const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>';
  const ICON_BACK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
  const ICON_CLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.4 11.6-8.9 8.9a5 5 0 0 1-7.1-7.1l9.4-9.4a3.4 3.4 0 0 1 4.8 4.8l-9.2 9.2a1.9 1.9 0 0 1-2.7-2.7l8.2-8.2"></path></svg>';
  const ICON_MIC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z"></path><path d="M5 11a7 7 0 0 0 14 0"></path><path d="M12 18v3"></path></svg>';
  const ICON_SMILE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"></circle><path d="M8.5 10h.01"></path><path d="M15.5 10h.01"></path><path d="M8.5 14.2c1.7 1.7 5.3 1.7 7 0"></path></svg>';
  const ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14"></path><path d="m21 3-7 18-4-7-7-4 18-7Z"></path></svg>';
  const ICON_SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"></path><path d="M19 15l.9 2.6L22 18l-2.1.4L19 21l-.9-2.6L16 18l2.1-.4L19 15Z"></path></svg>';

  const createLayer = () => {
    let layer = document.querySelector('[data-orders-chat-layer]');
    if (layer) return layer;

    layer = document.createElement('aside');
    layer.className = 'orders-chat-layer';
    layer.dataset.ordersChatLayer = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');

    layer.innerHTML = `
      <button class="orders-chat-layer__backdrop" type="button" data-orders-chat-close aria-label="Fechar chat"></button>
      <section class="orders-chat-panel" role="dialog" aria-modal="true" aria-labelledby="orders-chat-title" tabindex="-1">
        <header class="orders-chat-panel__header">
          <div class="orders-chat-panel__top">
            <button class="orders-chat-panel__back" type="button" data-orders-chat-back aria-label="Voltar para os detalhes">${ICON_BACK}</button>
            <div class="orders-chat-panel__profile">
              <span class="orders-chat-panel__avatar doke-avatar" data-chat-avatar aria-hidden="true">DK</span>
              <span class="orders-chat-panel__identity">
                <strong class="orders-chat-panel__title" id="orders-chat-title" data-chat-title>Conversa do pedido</strong>
                <span class="orders-chat-panel__subtitle" data-chat-subtitle></span>
              </span>
            </div>
            <div class="orders-chat-panel__actions">
              <a class="orders-chat-panel__messages-link" href="mensagens.html" data-chat-messages-link>Abrir conversa</a>
              <button class="orders-chat-panel__close" type="button" data-orders-chat-close aria-label="Fechar chat">${ICON_CLOSE}</button>
            </div>
          </div>
        </header>

        <div class="orders-chat-panel__body" data-chat-messages></div>

        <div class="orders-chat-ai-suggestion" data-chat-ai-suggestion>
          <span class="orders-chat-ai-suggestion__icon" aria-hidden="true">${ICON_SPARK}</span>
          <div>
            <strong>Sugestão IA</strong>
            <p data-chat-ai-text></p>
          </div>
          <button type="button" data-chat-use-ai>Usar resposta</button>
        </div>

        <form class="orders-chat-panel__composer" data-chat-form>
          <div class="orders-chat-panel__tools">
            <button class="orders-chat-panel__tool" type="button" aria-label="Anexar arquivo">${ICON_CLIP}</button>
            <button class="orders-chat-panel__tool" type="button" aria-label="Enviar áudio">${ICON_MIC}</button>
          </div>
          <label class="orders-chat-panel__input-wrap">
            <span class="sr-only">Mensagem do pedido</span>
            <textarea rows="1" placeholder="Digite sua mensagem..." aria-label="Mensagem do pedido"></textarea>
            <button class="orders-chat-panel__emoji" type="button" aria-label="Adicionar emoji">${ICON_SMILE}</button>
          </label>
          <button class="orders-chat-panel__send" type="submit" aria-label="Enviar mensagem">${ICON_SEND}</button>
        </form>
      </section>
    `;

    document.body.appendChild(layer);

    layer.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-orders-chat-close]');
      if (closeButton) {
        event.preventDefault();
        close();
        return;
      }

      const backButton = event.target.closest('[data-orders-chat-back]');
      if (backButton) {
        event.preventDefault();
        const card = activeCard;
        close({ handoff: true, preserveCard: true, skipFocusReturn: true }).then(() => {
          if (card && ns.details?.open) {
            window.setTimeout(() => {
              const detailButton = card.querySelector('[data-order-open="details"]');
              ns.details.open(detailButton || card);
            }, 24);
          }
        });
      }
    });

    return layer;
  };

  const setText = (root, selector, value, fallback = '') => {
    const el = root.querySelector(selector);
    if (el) el.textContent = clean(value) || fallback;
  };

  const readOrder = (card) => {
    if (!card || !ns.data || !ns.intelligence) return null;
    return ns.intelligence.classifyOrder(ns.data.readOrderCard(card));
  };

  const getMessagesHref = (order) => order?.id
    ? `mensagens.html?order=${encodeURIComponent(order.id)}`
    : 'mensagens.html';

  const navigateToConversation = (order) => {
    const href = getMessagesHref(order);
    if (window.DokeNavigate) {
      window.DokeNavigate(href);
      return true;
    }
    window.location.href = href;
    return true;
  };

  const getConversationForOrder = (order) => {
    const service = window.Doke?.services?.messages;
    if (!service?.listLocalConversations || !order?.id) return null;
    const conversations = service.listLocalConversations({ orderId: order.id, currentUser: false }) || [];
    return conversations[0] || null;
  };

  const isMineMessage = (message) => {
    const user = getCurrentUser();
    if (user?.id && message?.senderId) return String(message.senderId) === String(user.id);
    return message?.mine === true;
  };

  const getPanelMessages = (order, conversation) => (conversation?.messages?.length ? conversation.messages : []);

  const renderOrderContext = (order) => `
    <section class="orders-chat-order-card" aria-label="Pedido vinculado à conversa">
      <div class="orders-chat-order-card__head">
        <span>Pedido vinculado</span>
        <strong>${escapeHtml(order?.statusLabel || 'Aguardando resposta')}</strong>
      </div>
      <h3>${escapeHtml(order?.title || 'Pedido de serviço')}</h3>
      <dl>
        <div><dt>${escapeHtml(order?.viewerRole === 'professional' ? 'Cliente' : 'Profissional')}</dt><dd>${escapeHtml(order?.company || 'Doke')}</dd></div>
        <div><dt>Orçamento</dt><dd>${escapeHtml(order?.budget || 'A definir')}</dd></div>
        <div><dt>Local</dt><dd>${escapeHtml(order?.address || 'A combinar')}</dd></div>
      </dl>
    </section>
  `;

  const renderMessages = (layer, order, conversation) => {
    const target = layer.querySelector('[data-chat-messages]');
    if (!target) return;

    const peerName = order?.company || 'Profissional';
    const peerInitials = getInitials(peerName);
    const messages = getPanelMessages(order, conversation);

    if (!messages.length) {
      target.innerHTML = renderOrderContext(order) + `
        <section class="orders-chat-empty" aria-label="Conversa sem mensagens">
          <strong>Sem mensagens ainda</strong>
          <p>A conversa fica vazia até alguém enviar uma mensagem real.</p>
        </section>
      `;
      return;
    }

    target.innerHTML = renderOrderContext(order) + messages.map((message) => {
      const mine = isMineMessage(message);
      const author = mine ? 'Você' : message?.author || peerName;
      const text = message?.text || message?.body || '';
      return `
        <article class="orders-chat-row${mine ? ' orders-chat-row--me' : ''}">
          ${mine ? '' : `<span class="orders-chat-row__avatar doke-avatar" aria-hidden="true">${escapeHtml(peerInitials)}</span>`}
          <div class="orders-chat-message${mine ? ' orders-chat-message--me' : ''}">
            <strong>${escapeHtml(author)}</strong>
            <p>${escapeHtml(text)}</p>
          </div>
        </article>
      `;
    }).join('');
  };


  const buildAiReply = (order) => {
    if (!order) return 'Olá! Pode me atualizar sobre este pedido?';

    if (order.status === 'completed') {
      return `Olá, ${order.company || 'tudo bem'}! O serviço foi concluído. Você poderia confirmar se está tudo certo e deixar uma avaliação quando puder?`;
    }

    if (order.risk.level === 'high') {
      return `Olá, ${order.company || 'tudo bem'}! Podemos confirmar prazo e próxima etapa do pedido "${order.title}" para evitar atraso?`;
    }

    return `Olá, ${order.company || 'tudo bem'}! Pode me atualizar sobre a próxima etapa do pedido "${order.title}"?`;
  };

  const openFromCard = (cardOrTrigger) => {
    const card = cardOrTrigger?.closest ? cardOrTrigger.closest('.order-card') : cardOrTrigger;
    const order = readOrder(card);
    if (!order) return false;
    return navigateToConversation(order);
  };

  const close = (options = {}) => {
    const layer = document.querySelector('[data-orders-chat-layer]');
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
    layer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('orders-chat-open');

    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (!layer.classList.contains('is-open')) layer.hidden = true;
        layer.classList.remove('is-handover');

        if (!skipFocusReturn && activeTrigger && typeof activeTrigger.focus === 'function') {
          activeTrigger.focus({ preventScroll: true });
        }

        if (!preserveCard) {
          activeTrigger = null;
          activeCard = null;
          activeConversationId = '';
        }

        resolve();
      }, handoff ? TRANSITION_MS : 220);
    });
  };

  const bind = () => {
    if (!document.body?.classList.contains('orders-page-shell')) return;

    document.addEventListener('click', (event) => {
      const closeButton = event.target.closest('[data-orders-chat-close]');
      if (closeButton) {
        event.preventDefault();
        close();
        return;
      }

      const backButton = event.target.closest('[data-orders-chat-back]');
      if (backButton) {
        event.preventDefault();
        const card = activeCard;
        close({ handoff: true, preserveCard: true, skipFocusReturn: true }).then(() => {
          if (card && ns.details?.open) {
            window.setTimeout(() => {
              const detailButton = card.querySelector('[data-order-open="details"]');
              ns.details.open(detailButton || card);
            }, 24);
          }
        });
        return;
      }

      const useAiButton = event.target.closest('[data-chat-use-ai]');
      if (useAiButton) {
        event.preventDefault();
        const layer = document.querySelector('[data-orders-chat-layer]');
        const input = layer?.querySelector('[data-chat-form] textarea, [data-chat-form] input');
        const suggestion = layer?.querySelector('[data-chat-ai-text]');
        if (input && suggestion) {
          input.value = clean(suggestion.textContent);
          input.focus({ preventScroll: true });
        }
        return;
      }

      const chatButton = event.target.closest('[data-order-open="chat"]');
      if (!chatButton || !chatButton.closest('.order-card')) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      openFromCard(chatButton);
    }, true);

    document.addEventListener('submit', (event) => {
      const form = event.target.closest('[data-chat-form]');
      if (!form) return;
      event.preventDefault();

      const input = form.querySelector('textarea, input');
      const value = clean(input?.value);
      if (!value) return;

      const messagesService = window.Doke?.services?.messages;
      if (!activeConversationId || !messagesService?.sendMessage) return;

      messagesService.sendMessage(activeConversationId, {
        body: value,
        text: value,
        type: 'text',
        author: 'Você',
        mine: true
      }).then(() => {
        const stack = document.querySelector('[data-chat-messages]');
        if (stack) {
          const row = document.createElement('article');
          row.className = 'orders-chat-row orders-chat-row--me';
          row.innerHTML = '<div class="orders-chat-message orders-chat-message--me"><strong>Você</strong><p></p></div>';
          row.querySelector('p').textContent = value;
          stack.appendChild(row);
          row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        input.value = '';
      }).catch((error) => console.warn('[DokeOrdersChat:sendMessage]', error));
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    }, true);
  };

  ns.chat = Object.freeze({
    openFromCard,
    close
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
