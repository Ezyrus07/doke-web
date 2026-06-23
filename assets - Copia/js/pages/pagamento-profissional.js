(function () {
  'use strict';

  const root = document.querySelector('[data-payment-page]');
  if (!root) return;

  const BASE_TOTAL = 280;
  const POINTS_DISCOUNT = 23;

  const methodButtons = Array.from(root.querySelectorAll('[data-payment-method]'));
  const cardFields = root.querySelector('[data-card-fields]');
  const cardEmpty = root.querySelector('[data-card-empty]');
  const addCardButton = root.querySelector('[data-add-card]');
  const summaryMethod = root.querySelector('[data-summary-method]');
  const summaryTotal = root.querySelector('[data-summary-total]');
  const pointsInput = root.querySelector('[data-points-input]');
  const pointsRow = root.querySelector('[data-summary-points-row]');
  const pointsDiscount = root.querySelector('[data-summary-points-discount]');
  const submitButton = root.querySelector('[data-payment-submit]');
  const confirmInput = root.querySelector('[data-payment-confirm-input]');
  const errorMessage = root.querySelector('[data-payment-error]');
  const modal = document.querySelector('[data-payment-modal]');
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

  function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function getCurrentTotal() {
    const usesPoints = Boolean(pointsInput && pointsInput.checked);
    return Math.max(BASE_TOTAL - (usesPoints ? POINTS_DISCOUNT : 0), 0);
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
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-checked', String(isSelected));
    });

    if (summaryMethod) summaryMethod.textContent = method;
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
    panels.forEach((panel) => {
      const isActive = panel.dataset.modalPanel === name;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('payment-modal-open');
    showPanel('processing');

    window.clearTimeout(processingTimer);
    processingTimer = window.setTimeout(() => {
      showPanel(selectedMethod === 'Pix' ? 'pix' : 'success');
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

  methodButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setSelectedMethod(button.dataset.paymentMethod || 'Pix');
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
    confirmInput.addEventListener('change', clearError);
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
      openModal();
    });
  }

  if (pixPaidButton) {
    pixPaidButton.addEventListener('click', () => {
      showPanel('processing');
      window.clearTimeout(processingTimer);
      processingTimer = window.setTimeout(() => showPanel('success'), 650);
    });
  }

  if (copyPixButton) {
    copyPixButton.addEventListener('click', async () => {
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
      setFinishOrderPanel('success');
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
