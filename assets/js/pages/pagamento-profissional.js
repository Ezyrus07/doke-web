(function () {
  'use strict';

  const root = document.querySelector('[data-payment-page]');
  if (!root) return;

  let baseTotal = 280;
  const POINTS_DISCOUNT = 23;

  const methodButtons = Array.from(root.querySelectorAll('[data-payment-method]'));
  const cardFields = root.querySelector('[data-card-fields]');
  const cardEmpty = root.querySelector('[data-card-empty]');
  const addCardButton = root.querySelector('[data-add-card]');
  const methodTitle = root.querySelector('[data-payment-method-title]');
  const methodCopy = root.querySelector('[data-payment-method-copy]');
  const summaryMethod = root.querySelector('[data-summary-method]');
  const summaryTotal = root.querySelector('[data-summary-total]');
  const pointsInput = root.querySelector('[data-points-input]');
  const pointsRow = root.querySelector('[data-summary-points-row]');
  const pointsDiscount = root.querySelector('[data-summary-points-discount]');
  const submitButton = root.querySelector('[data-payment-submit]');
  const confirmInput = root.querySelector('[data-payment-confirm-input]');
  const errorMessage = root.querySelector('[data-payment-error]');
  const modal = document.querySelector('[data-payment-modal]');
  const modalError = modal ? modal.querySelector('[data-payment-modal-error]') : null;
  const panels = modal ? Array.from(modal.querySelectorAll('[data-modal-panel]')) : [];
  const pixPaidButton = modal ? modal.querySelector('[data-pix-paid]') : null;
  const copyPixButton = modal ? modal.querySelector('[data-copy-pix]') : null;
  const showReceiptButton = modal ? modal.querySelector('[data-show-receipt]') : null;
  const receipt = modal ? modal.querySelector('[data-payment-receipt]') : null;
  const pixCode = modal ? modal.querySelector('[data-pix-code]') : null;
  const modalTotal = modal ? modal.querySelector('[data-modal-total]') : null;
  const receiptTotal = modal ? modal.querySelector('[data-receipt-total]') : null;

  let selectedMethod = 'Pix';
  let cardFormOpen = false;
  let processingTimer = null;

  const pageParams = new URLSearchParams(window.location.search || '');
  const paymentContext = {
    orderId: pageParams.get('order') || pageParams.get('orderId') || '',
    conversationId: pageParams.get('conversation') || pageParams.get('conversationId') || '',
    messageId: pageParams.get('message') || pageParams.get('messageId') || ''
  };
  let currentOrder = null;
  let currentConversation = null;
  let currentCharge = null;
  let paymentRegistered = false;
  let completionRegistered = false;

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function getOrderCode(order) {
    const raw = normalizeText(order && order.id || paymentContext.orderId || 'DK-2048');
    if (!raw) return '#DK-2048';
    if (raw.charAt(0) === '#') return raw;
    return raw.indexOf('order_') === 0 ? `#${raw.replace(/^order_/, 'DK-')}` : `#${raw}`;
  }

  function currencyToNumber(value) {
    const normalized = normalizeText(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 280;
  }

  function getOrderRepository() {
    return window.Doke?.repositories?.orders || null;
  }

  function getMessagesRepository() {
    return window.Doke?.repositories?.messages || null;
  }

  function getOrdersService() {
    return window.Doke?.services?.orders || null;
  }

  function getWalletService() {
    return window.Doke?.services?.wallet || null;
  }

  function setTextAll(selector, value) {
    const text = normalizeText(value);
    if (!text) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = text;
    });
  }

  function setHrefAll(selector, value) {
    if (!value) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute('href', value);
    });
  }

  function resolveCharge(conversation) {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    if (paymentContext.messageId) {
      const byId = messages.find((message) => String(message.id || '') === String(paymentContext.messageId));
      if (byId && byId.type === 'charge') return byId;
    }
    return messages.slice().reverse().find((message) => message && message.type === 'charge') || null;
  }

  function buildConversationUrl(extraParams) {
    const params = new URLSearchParams();
    if (paymentContext.orderId) params.set('order', paymentContext.orderId);
    if (paymentContext.conversationId) params.set('conversation', paymentContext.conversationId);
    Object.entries(extraParams || {}).forEach(([key, value]) => {
      if (value != null && value !== '') params.set(key, value);
    });
    const query = params.toString();
    return query ? `mensagens.html?${query}` : 'mensagens.html';
  }

  function buildOrderUrl() {
    return paymentContext.orderId ? `pedidos.html?order=${encodeURIComponent(paymentContext.orderId)}` : 'pedidos.html';
  }

  function applyPaymentContext() {
    const order = currentOrder || {};
    const conversation = currentConversation || {};
    const charge = currentCharge || {};
    const providerName = order.providerName || order.professionalName || conversation.peerName || conversation.name || 'Profissional Doke';
    const serviceTitle = order.serviceTitle || order.title || conversation.order?.title || 'Pedido de serviço';
    const amount = charge.amount || order.proposalAmount || order.budget || 'R$ 280,00';
    const installments = charge.installments || order.proposalInstallments || order.payment || 'À vista';
    const orderCode = getOrderCode(order);

    baseTotal = currencyToNumber(amount);
    setTextAll('[data-payment-provider-name]', providerName);
    setTextAll('[data-payment-service-title]', serviceTitle);
    setTextAll('[data-payment-order-code]', orderCode);
    setTextAll('[data-payment-amount]', amount);
    setTextAll('[data-payment-installments]', installments);
    setTextAll('[data-payment-status-text]', charge.paid ? 'Pagamento confirmado' : 'Aguardando pagamento');
    setTextAll('[data-payment-date]', charge.time || 'Hoje');
    setTextAll('[data-modal-total], [data-receipt-total], [data-summary-total], [data-summary-subtotal]', amount);
    setTextAll('[data-payment-modal-description]', `Estamos registrando o pagamento no pedido ${orderCode}.`);
    setTextAll('[data-payment-success-copy]', `Seu pagamento de ${amount} para ${providerName} foi registrado. O pedido agora está em andamento.`);
    setTextAll('[data-finish-provider-name]', providerName);
    setTextAll('[data-finish-service-title]', serviceTitle);
    setTextAll('[data-finish-amount]', amount);
    setTextAll('[data-finish-order-code]', orderCode);
    setHrefAll('[data-payment-order-link]', buildOrderUrl());
    setHrefAll('[data-payment-conversation-link]', buildConversationUrl());
    setHrefAll('[data-payment-issue-link]', buildConversationUrl({ issue: '1' }));
    setHrefAll('[data-payment-success-conversation-link]', buildConversationUrl({ payment: 'success' }));
    updateTotals();
  }

  function loadPaymentContext() {
    const orderRepository = getOrderRepository();
    const messagesRepository = getMessagesRepository();
    const orderTask = paymentContext.orderId && orderRepository?.getById
      ? orderRepository.getById(paymentContext.orderId)
      : Promise.resolve(null);
    const conversationTask = paymentContext.conversationId && messagesRepository?.getById
      ? messagesRepository.getById(paymentContext.conversationId)
      : Promise.resolve(null);

    return Promise.all([orderTask, conversationTask]).then(([order, conversation]) => {
      currentOrder = order || null;
      currentConversation = conversation || null;
      currentCharge = resolveCharge(conversation);
      if (!paymentContext.orderId && currentConversation?.orderId) paymentContext.orderId = currentConversation.orderId;
      if (!currentOrder && currentConversation?.order) currentOrder = currentConversation.order;
      applyPaymentContext();
    }).catch(() => {
      applyPaymentContext();
    });
  }

  function persistChargeState(flags) {
    const messagesRepository = getMessagesRepository();
    if (!paymentContext.conversationId) return Promise.resolve(null);
    if (!messagesRepository?.getById || !messagesRepository?.save) {
      return Promise.reject(new Error('Conversa de pagamento indisponível.'));
    }
    return messagesRepository.getById(paymentContext.conversationId).then((conversation) => {
      if (!conversation) throw new Error('Conversa de pagamento não encontrada.');
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const charge = paymentContext.messageId
        ? messages.find((message) => String(message.id || '') === String(paymentContext.messageId))
        : messages.slice().reverse().find((message) => message && message.type === 'charge');
      if (!charge && paymentContext.messageId) throw new Error('Cobrança do pagamento não encontrada.');
      if (!charge) return conversation;
      Object.assign(charge, flags || {});
      if (flags?.paid) charge.text = charge.text || 'Pagamento confirmado. Atendimento liberado.';
      currentConversation = conversation;
      currentCharge = charge;
      return messagesRepository.save(conversation);
    });
  }

  function registerWalletHold() {
    const walletService = getWalletService();
    if (!walletService?.registerHeldReceivableFromPayment) return Promise.resolve(null);
    return walletService.registerHeldReceivableFromPayment({
      order: currentOrder || currentConversation?.order || {},
      conversation: currentConversation,
      charge: currentCharge,
      orderId: paymentContext.orderId || currentOrder?.id || currentConversation?.orderId || '',
      conversationId: paymentContext.conversationId || currentConversation?.id || '',
      messageId: paymentContext.messageId || currentCharge?.id || ''
    }).catch((error) => {
      console.warn('[DokePayment:walletHold]', error);
      return null;
    });
  }

  function registerPayment() {
    if (paymentRegistered) return Promise.resolve(currentOrder);
    paymentRegistered = true;
    const ordersService = getOrdersService();
    const orderId = paymentContext.orderId || currentOrder?.id || currentConversation?.orderId;
    if (!orderId || !ordersService?.start) {
      paymentRegistered = false;
      return Promise.reject(new Error('Pedido de pagamento não encontrado.'));
    }
    const startTask = ordersService.start(orderId, {
      conversationId: paymentContext.conversationId || currentConversation?.id || '',
      paymentMessageId: paymentContext.messageId || currentCharge?.id || ''
    });

    return startTask.then((order) => {
      currentOrder = order || currentOrder;
      return persistChargeState({ paid: true });
    }).then(() => registerWalletHold())
      .then(() => {
      document.dispatchEvent(new CustomEvent('doke:payment-confirmed', {
        detail: {
          order: currentOrder,
          conversation: currentConversation,
          charge: currentCharge
        }
      }));
      applyPaymentContext();
      return currentOrder;
    }).catch((error) => {
      paymentRegistered = false;
      throw error;
    });
  }

  function registerCompletion() {
    if (completionRegistered) return Promise.resolve(currentOrder);
    completionRegistered = true;
    const ordersService = getOrdersService();
    const orderId = paymentContext.orderId || currentOrder?.id || currentConversation?.orderId;
    const completeTask = orderId && ordersService?.complete
      ? ordersService.complete(orderId)
      : Promise.resolve(currentOrder);

    return completeTask.then((order) => {
      currentOrder = order || currentOrder;
      return persistChargeState({ paid: true, completed: true });
    }).then(() => {
      document.dispatchEvent(new CustomEvent('doke:order-completed', {
        detail: {
          order: currentOrder,
          conversation: currentConversation,
          charge: currentCharge
        }
      }));
      return currentOrder;
    }).catch((error) => {
      completionRegistered = false;
      throw error;
    });
  }

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getCurrentTotal() {
    const usesPoints = Boolean(pointsInput && pointsInput.checked);
    return Math.max(baseTotal - (usesPoints ? POINTS_DISCOUNT : 0), 0);
  }

  function updateTotals() {
    const usesPoints = Boolean(pointsInput && pointsInput.checked);
    const total = getCurrentTotal();
    const formattedTotal = formatCurrency(total);

    if (pointsRow) pointsRow.hidden = !usesPoints;
    if (pointsDiscount) pointsDiscount.textContent = `-${formatCurrency(POINTS_DISCOUNT)}`;
    if (summaryTotal) summaryTotal.textContent = formattedTotal;
    if (modalTotal) modalTotal.textContent = formattedTotal;
    if (receiptTotal) receiptTotal.textContent = formattedTotal;

  }

  function setSelectedMethod(method) {
    selectedMethod = method;

    methodButtons.forEach((button) => {
      const isSelected = button.dataset.paymentMethod === method;
      const input = button.querySelector('input[type="radio"]');
      button.classList.toggle('is-selected', isSelected);
      if (input) input.checked = isSelected;
    });

    if (summaryMethod) summaryMethod.textContent = method;
    const methodDetails = {
      Pix: {
        title: 'Pagamento rápido e protegido',
        copy: 'O QR Code e o código Pix serão gerados após a confirmação.'
      },
      'Cartão de crédito': {
        title: 'Pagamento protegido no cartão',
        copy: 'Adicione um cartão para concluir o pagamento com crédito.'
      },
      'Cartão de débito': {
        title: 'Débito em uma única cobrança',
        copy: 'Adicione um cartão para concluir o pagamento à vista.'
      },
      'Saldo Doke': {
        title: 'Use o saldo da sua carteira',
        copy: 'O valor será debitado do seu saldo Doke após a confirmação.'
      }
    };
    const detail = methodDetails[method] || methodDetails.Pix;
    if (methodTitle) methodTitle.textContent = detail.title;
    if (methodCopy) methodCopy.textContent = detail.copy;
    updateCardPaymentState();
  }

  function isCardMethod(method) {
    return method === 'Cartão de crédito' || method === 'Cartão de débito';
  }

  function updateCardPaymentState() {
    const needsCard = isCardMethod(selectedMethod);

    if (cardEmpty) cardEmpty.hidden = !needsCard || cardFormOpen;
    if (cardFields) cardFields.hidden = !needsCard || !cardFormOpen;
  }

  function showPanel(name) {
    if (modal) modal.dataset.paymentPanel = name;
    panels.forEach((panel) => {
      const isActive = panel.dataset.modalPanel === name;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
      panel.style.display = isActive ? '' : 'none';
    });
  }

  function showModalError(message) {
    if (!modalError) {
      showError(message);
      return;
    }
    modalError.textContent = message;
    modalError.hidden = false;
  }

  function clearModalError() {
    if (modalError) modalError.hidden = true;
  }

  function confirmPaymentFlow(delay) {
    if (!modal) return;
    showPanel('processing');
    clearModalError();
    window.clearTimeout(processingTimer);
    processingTimer = window.setTimeout(() => {
      registerPayment()
        .then(() => showPanel('success'))
        .catch((error) => {
          paymentRegistered = false;
          showPanel('processing');
          showModalError(error?.message || 'Não foi possível registrar o pagamento no pedido.');
        });
    }, Number.isFinite(delay) ? delay : 500);
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('payment-modal-open');
    clearModalError();
    window.clearTimeout(processingTimer);

    if (selectedMethod === 'Pix') {
      showPanel('pix');
      return;
    }

    showPanel('processing');
    processingTimer = window.setTimeout(() => {
      confirmPaymentFlow(120);
    }, 850);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('payment-modal-open');
    window.clearTimeout(processingTimer);
  }

  function showError(message) {
    if (!errorMessage) return;
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function clearError() {
    if (errorMessage) errorMessage.hidden = true;
  }

  function updateSubmitState() {
    if (!submitButton) return;
    const canSubmit = Boolean(confirmInput && confirmInput.checked);
    submitButton.disabled = !canSubmit;
    submitButton.setAttribute('aria-disabled', String(!canSubmit));
  }

  methodButtons.forEach((button) => {
    const input = button.querySelector('input[type="radio"]');
    if (!input) return;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      setSelectedMethod(button.dataset.paymentMethod || input.value || 'Pix');
      clearError();
    });
  });


  if (addCardButton) {
    addCardButton.addEventListener('click', () => {
      cardFormOpen = true;
      updateCardPaymentState();
      clearError();

      const firstInput = cardFields ? cardFields.querySelector('input') : null;
      if (firstInput) firstInput.focus();
    });
  }

  if (pointsInput) {
    pointsInput.addEventListener('change', () => {
      updateTotals();
      clearError();
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener('change', () => {
      updateSubmitState();
      clearError();
    });
  }

  if (submitButton) {
    submitButton.addEventListener('click', () => {
      if (isCardMethod(selectedMethod) && !cardFormOpen) {
        showError('Adicione um cartão para continuar com essa forma de pagamento.');
        if (addCardButton) addCardButton.focus();
        return;
      }

      if (confirmInput && !confirmInput.checked) {
        showError('Confirme que revisou a cobrança antes de continuar.');
        confirmInput.focus();
        return;
      }

      clearError();
      clearModalError();
      openModal();
    });
  }

  if (pixPaidButton) {
    pixPaidButton.addEventListener('click', () => {
      confirmPaymentFlow(650);
    });
  }

  if (copyPixButton) {
    copyPixButton.addEventListener('click', async () => {
      clearModalError();
      const code = pixCode ? pixCode.textContent.trim() : '';
      try {
        if (navigator.clipboard && code) {
          await navigator.clipboard.writeText(code);
        }
        copyPixButton.textContent = 'Código copiado';
      } catch (error) {
        copyPixButton.textContent = 'Código disponível acima';
      }

      window.setTimeout(() => {
        copyPixButton.textContent = 'Copiar código Pix';
      }, 1400);
    });
  }

  if (showReceiptButton && receipt) {
    showReceiptButton.addEventListener('click', () => {
      receipt.hidden = false;
      showReceiptButton.textContent = 'Comprovante aberto';
    });
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      const closeTrigger = event.target.closest('[data-payment-close]');
      if (closeTrigger) closeModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  setSelectedMethod(selectedMethod);
  updateTotals();
  updateSubmitState();
  loadPaymentContext();

  const finishOrderModal = document.querySelector('[data-finish-order-modal]');
  const finishOrderOpenButtons = Array.from(document.querySelectorAll('[data-finish-order-open]'));
  const finishOrderConfirm = document.querySelector('[data-finish-order-confirm]');
  const finishOrderSubmit = document.querySelector('[data-finish-order-submit]');
  const finishOrderError = document.querySelector('[data-finish-order-error]');
  const finishOrderPanels = Array.from(document.querySelectorAll('[data-finish-order-panel]'));

  function setFinishOrderPanel(panelName) {
    finishOrderPanels.forEach((panel) => {
      const active = panel.dataset.finishOrderPanel === panelName;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }

  function openFinishOrderModal() {
    if (!finishOrderModal) return;
    setFinishOrderPanel('confirm');
    if (finishOrderError) finishOrderError.hidden = true;
    finishOrderModal.hidden = false;
    finishOrderModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('payment-finish-modal-open');
  }

  function closeFinishOrderModal() {
    if (!finishOrderModal) return;
    finishOrderModal.hidden = true;
    finishOrderModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('payment-finish-modal-open');
  }

  finishOrderOpenButtons.forEach((button) => {
    button.addEventListener('click', openFinishOrderModal);
  });

  if (finishOrderConfirm) {
    finishOrderConfirm.addEventListener('change', () => {
      if (finishOrderError) finishOrderError.hidden = true;
    });
  }

  if (finishOrderSubmit) {
    finishOrderSubmit.addEventListener('click', () => {
      if (finishOrderConfirm && !finishOrderConfirm.checked) {
        if (finishOrderError) finishOrderError.hidden = false;
        finishOrderConfirm.focus();
        return;
      }
      if (finishOrderError) finishOrderError.hidden = true;
      registerCompletion()
        .then(() => setFinishOrderPanel('success'))
        .catch((error) => {
          if (finishOrderError) {
            finishOrderError.textContent = error?.message || 'Não foi possível finalizar o pedido.';
            finishOrderError.hidden = false;
          }
        });
    });
  }

  if (finishOrderModal) {
    finishOrderModal.addEventListener('click', (event) => {
      if (event.target.closest('[data-finish-order-close]')) closeFinishOrderModal();
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && finishOrderModal && !finishOrderModal.hidden) {
      closeFinishOrderModal();
    }
  });

})();
