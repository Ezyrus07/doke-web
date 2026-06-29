(() => {
  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  };

  const initWalletPage = () => {
    const pageRoot = document.querySelector('.wallet-page');
    if (!pageRoot) return false;

    if (pageRoot.dataset.walletPageInitialized === 'true') {
      if (typeof window.DokeRefreshWalletState === 'function') window.DokeRefreshWalletState();
      return true;
    }

    pageRoot.dataset.walletPageInitialized = 'true';
    const viewButtons = Array.from(document.querySelectorAll('[data-wallet-view-toggle]'));
    const viewPanels = Array.from(document.querySelectorAll('[data-wallet-view-panel]'));
    const filterButtons = Array.from(document.querySelectorAll('[data-wallet-filter]'));
    let transactions = Array.from(document.querySelectorAll('[data-wallet-type]'));
    const withdrawModal = document.querySelector('[data-wallet-withdraw-modal]');
    const withdrawOpenButton = document.querySelector('[data-wallet-open-withdraw]');
    const withdrawCloseButtons = Array.from(document.querySelectorAll('[data-wallet-close-withdraw]'));
    const statsModal = null;
    const statsOpenButtons = [];
    const statsCloseButtons = [];
    const withdrawForm = document.querySelector('[data-wallet-withdraw-form]');
    const accountFields = Array.from(document.querySelectorAll('[data-wallet-account-field]'));
    const transactionList = document.querySelector('[data-wallet-transaction-list]');
    const transactionEmptyState = document.querySelector('[data-wallet-empty-state="transactions"]');
    const bankEmptyState = document.querySelector('[data-wallet-empty-state="bank-account"]');
    const bankPanel = document.querySelector('[data-wallet-account-panel]');
    const bankAccountCard = document.querySelector('[data-wallet-bank-account-card]');
    const bankAccountDetails = document.querySelector('[data-wallet-bank-details]');
    const bankAccountButtons = Array.from(document.querySelectorAll('[data-wallet-open-bank-account]'));
    const bankModal = document.querySelector('[data-wallet-bank-modal]');
    const bankCloseButtons = Array.from(document.querySelectorAll('[data-wallet-close-bank-account]'));
    const bankForm = document.querySelector('[data-wallet-bank-form]');
    const bankInputs = Array.from(document.querySelectorAll('[data-wallet-bank-input]'));
    const bankError = document.querySelector('[data-wallet-bank-error]');
    const bankModalTitle = document.querySelector('[data-wallet-bank-modal-title]');
    const bankModalCopy = document.querySelector('[data-wallet-bank-modal-copy]');
    const bankSubmitLabel = document.querySelector('[data-wallet-bank-submit-label]');
    const toastRegion = document.querySelector('[data-wallet-toast-region]');
    const withdrawAmountInput = document.querySelector('[data-wallet-withdraw-amount]');
    const withdrawAvailableNode = document.querySelector('[data-wallet-withdraw-available]');
    const withdrawError = document.querySelector('[data-wallet-withdraw-error]');
    const transactionDetailPanel = document.querySelector('[data-wallet-transaction-detail-panel]');
    const transactionDetailCloseButtons = Array.from(document.querySelectorAll('[data-wallet-transaction-detail-close]'));
    const transactionDetailFields = {
      title: document.querySelector('[data-wallet-transaction-title]'),
      description: document.querySelector('[data-wallet-transaction-description]'),
      amount: document.querySelector('[data-wallet-transaction-amount]'),
      status: document.querySelector('[data-wallet-transaction-status]'),
      statusDetail: document.querySelector('[data-wallet-transaction-status-detail]'),
      kind: document.querySelector('[data-wallet-transaction-kind]'),
      kindDetail: document.querySelector('[data-wallet-transaction-kind-detail]'),
      method: document.querySelector('[data-wallet-transaction-method]'),
      reference: document.querySelector('[data-wallet-transaction-reference]'),
      note: document.querySelector('[data-wallet-transaction-note]'),
      date: document.querySelector('[data-wallet-transaction-date]'),
      gross: document.querySelector('[data-wallet-transaction-gross]'),
      fee: document.querySelector('[data-wallet-transaction-fee]'),
      destination: document.querySelector('[data-wallet-transaction-destination]'),
      relatedAction: document.querySelector('[data-wallet-transaction-related-action]'),
      receiptAction: document.querySelector('[data-wallet-transaction-receipt-action]'),
      trackAction: document.querySelector('[data-wallet-transaction-track-action]')
    };
    const withdrawTrackModal = document.querySelector('[data-wallet-withdraw-track-modal]');
    const withdrawTrackCloseButtons = Array.from(document.querySelectorAll('[data-wallet-withdraw-track-close]'));
    const withdrawTrackReturnButtons = Array.from(document.querySelectorAll('[data-wallet-withdraw-track-return]'));
    const withdrawTrackFields = {
      title: document.querySelector('[data-wallet-withdraw-track-title]'),
      description: document.querySelector('[data-wallet-withdraw-track-description]'),
      amount: document.querySelector('[data-wallet-withdraw-track-amount]'),
      status: document.querySelector('[data-wallet-withdraw-track-status]'),
      destination: document.querySelector('[data-wallet-withdraw-track-destination]'),
      note: document.querySelector('[data-wallet-withdraw-track-note]'),
      timeline: document.querySelector('[data-wallet-withdraw-timeline]'),
      completeAction: document.querySelector('[data-wallet-withdraw-track-complete]')
    };
    const transactionReceiptModal = document.querySelector('[data-wallet-transaction-receipt-modal]');
    const transactionReceiptCloseButtons = Array.from(document.querySelectorAll('[data-wallet-transaction-receipt-close]'));
    const transactionReceiptReturnButtons = Array.from(document.querySelectorAll('[data-wallet-transaction-receipt-return]'));
    const transactionReceiptFields = {
      title: document.querySelector('[data-wallet-receipt-title]'),
      description: document.querySelector('[data-wallet-receipt-description]'),
      kind: document.querySelector('[data-wallet-receipt-kind]'),
      amount: document.querySelector('[data-wallet-receipt-amount]'),
      status: document.querySelector('[data-wallet-receipt-status]'),
      code: document.querySelector('[data-wallet-receipt-code]'),
      reference: document.querySelector('[data-wallet-receipt-reference]'),
      gross: document.querySelector('[data-wallet-receipt-gross]'),
      fee: document.querySelector('[data-wallet-receipt-fee]'),
      net: document.querySelector('[data-wallet-receipt-net]'),
      method: document.querySelector('[data-wallet-receipt-method]'),
      date: document.querySelector('[data-wallet-receipt-date]'),
      destination: document.querySelector('[data-wallet-receipt-destination]'),
      note: document.querySelector('[data-wallet-receipt-note]')
    };
    const transactionFilterControls = document.querySelector('.wallet-tabs');

    let currentBankAccount = null;
    let currentWallet = null;
    let walletRefreshTimer = null;
    let activeTransactionDetailId = '';

    const walletFields = {
      available: document.querySelector('[data-wallet-balance-available]'),
      held: document.querySelector('[data-wallet-balance-held]'),
      balanceCopy: document.querySelector('[data-wallet-balance-copy]'),
      heldCopy: document.querySelector('[data-wallet-held-copy]'),
      monthlyIncome: document.querySelector('[data-wallet-kpi="monthly-income"]'),
      heldBalance: document.querySelector('[data-wallet-kpi="held-balance"]'),
      withdrawals: document.querySelector('[data-wallet-kpi="withdrawals"]'),
      fees: document.querySelector('[data-wallet-kpi="fees"]')
    };

    const getWalletService = () => window.Doke?.services?.wallet || null;

    const getAccountField = (name) => {
      return accountFields.find((field) => field.dataset.walletAccountField === name);
    };

    const escapeHtml = (value) => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const formatCurrency = (value) => {
      const amount = Number(value || 0);
      return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const parseCurrencyInput = (value) => {
      const normalized = String(value || '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
      const amount = Number(normalized);
      return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
    };

    const getBankInput = (name) => {
      return bankInputs.find((input) => input.dataset.walletBankInput === name);
    };

    const maskAccountNumber = (value) => {
      const text = String(value || '').replace(/\s+/g, '');
      if (!text) return '';
      const digits = text.replace(/\D/g, '');
      const tail = digits.slice(-4) || text.slice(-4);
      return `final ${tail}`;
    };

    const getBankInitials = (value) => {
      return String(value || 'BK')
        .replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'BK';
    };

    const getBankDestination = (account) => {
      if (!account) return 'Conta não cadastrada';
      const bank = account.bankName || 'Banco cadastrado';
      const accountTail = maskAccountNumber(account.accountNumber);
      return [bank, accountTail].filter(Boolean).join(' · ');
    };

    const formatTransactionDate = (value) => {
      if (!value) return 'agora';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'agora';
      const now = new Date();
      const sameDay = date.toDateString() === now.toDateString();
      if (sameDay) return `hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const getTransactionType = (transaction) => {
      if (transaction.type === 'withdraw') return 'withdraw';
      if (transaction.status === 'held' || transaction.status === 'pending') return 'held';
      if (transaction.type === 'fee') return 'fee';
      return 'income';
    };

    const getTransactionIcon = (type) => {
      if (type === 'withdraw') return '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="m7 14 5 5 5-5"></path></svg>';
      if (type === 'held') return '<svg viewBox="0 0 24 24"><path d="M7 4h10"></path><path d="M7 20h10"></path><path d="M8 4c0 4 8 4 8 8s-8 4-8 8"></path><path d="M16 4c0 4-8 4-8 8s8 4 8 8"></path></svg>';
      if (type === 'fee') return '%';
      return '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>';
    };

    const getWithdrawStatusLabel = (transaction) => {
      if ((transaction?.status || '') === 'completed') return 'Saque concluído';
      return 'Saque em processamento';
    };

    const getTransactionStatusLabel = (type, transaction) => {
      if (type === 'held') return 'Em garantia';
      if (type === 'withdraw') return getWithdrawStatusLabel(transaction);
      if (type === 'fee') return 'Taxa aplicada';
      return 'Liberado para saque';
    };

    const getTransactionTitle = (transaction, type) => {
      if (type === 'withdraw' && (transaction?.status || '') === 'completed') return 'Saque concluído';
      return transaction.title || 'Pedido concluído';
    };

    const getReceiptTitle = (type, transaction) => {
      if (type === 'withdraw') return transaction?.status === 'completed' ? 'Comprovante de saque' : 'Comprovante de solicitação';
      if (type === 'held') return 'Comprovante de pagamento';
      if (type === 'fee') return 'Comprovante de taxa';
      return 'Comprovante de recebimento';
    };

    const getReceiptDescription = (type, transaction) => {
      if (type === 'withdraw') {
        return transaction?.status === 'completed'
          ? 'Registro mockado do saque enviado para a conta cadastrada.'
          : 'Registro mockado da solicitação de saque em processamento.';
      }
      if (type === 'held') return 'Registro mockado do pagamento confirmado e mantido em garantia.';
      if (type === 'fee') return 'Registro mockado da taxa aplicada à movimentação.';
      return 'Registro mockado do valor liberado na carteira.';
    };

    const getReceiptCode = (transaction) => {
      const base = transaction?.reference || transaction?.id || 'DOKE';
      return String(base).toUpperCase().replace(/[^A-Z0-9-]+/g, '').slice(0, 24) || 'DOKE-RECIBO';
    };

    const createWalletTransactionElement = (transaction) => {
      const type = getTransactionType(transaction);
      const amount = Number(transaction.netAmount || transaction.amount || 0);
      const title = getTransactionTitle(transaction, type);
      const signedAmount = type === 'income' ? `+${formatCurrency(amount)}` : type === 'withdraw' || type === 'fee' ? `-${formatCurrency(Math.abs(amount))}` : formatCurrency(amount);
      const description = `${title} · ${formatTransactionDate(transaction.createdAt)}`;
      const status = getTransactionStatusLabel(type, transaction);
      const receiptAmount = formatCurrency(Math.abs(amount));
      const receiptGross = formatCurrency(Number(transaction.grossAmount || transaction.netAmount || transaction.amount || 0));
      const receiptFee = formatCurrency(Number(transaction.feeAmount || 0));
      const receiptDate = formatTransactionDate(transaction.completedAt || transaction.availableAt || transaction.updatedAt || transaction.createdAt);
      const canCompleteWithdraw = type === 'withdraw' && (transaction.status || '') === 'processing';
      const element = document.createElement('article');
      element.className = 'wallet-transaction';
      element.dataset.walletType = type;
      element.dataset.walletStatus = transaction.status || 'available';
      element.dataset.walletSource = transaction.source || 'order-flow';
      element.dataset.transactionRawStatus = transaction.status || 'available';
      element.dataset.transactionType = type;
      element.dataset.walletTransactionId = transaction.id || '';
      element.dataset.transactionTitle = title;
      element.dataset.transactionDescription = description;
      element.dataset.transactionStatus = status;
      element.dataset.transactionAmount = signedAmount;
      element.dataset.transactionGross = receiptGross;
      element.dataset.transactionFee = receiptFee;
      element.dataset.transactionDate = receiptDate;
      element.dataset.transactionReceiptTitle = getReceiptTitle(type, transaction);
      element.dataset.transactionReceiptDescription = getReceiptDescription(type, transaction);
      element.dataset.transactionReceiptCode = getReceiptCode(transaction);
      element.dataset.transactionReceiptAmount = receiptAmount;
      element.dataset.transactionReceiptNet = receiptAmount;
      element.dataset.transactionKind = type === 'income' ? 'Entrada' : type === 'held' ? 'Saldo em garantia' : type === 'fee' ? 'Taxa' : 'Saque';
      element.dataset.transactionKindDetail = type === 'withdraw' ? 'Saque para conta bancária' : type === 'held' ? 'Recebível em garantia' : type === 'fee' ? 'Taxa de serviço' : 'Recebível liberado';
      element.dataset.transactionMethod = transaction.method || (type === 'withdraw' ? 'Transferência bancária mockada' : 'Recebimento pela Doke');
      element.dataset.transactionReference = transaction.reference || transaction.orderId || transaction.id || '';
      element.dataset.transactionDestination = type === 'withdraw' ? (transaction.destination || transaction.method || getBankDestination(currentBankAccount)) : (transaction.orderId ? 'Pedido ' + transaction.orderId : 'Carteira Doke');
      element.dataset.transactionNote = transaction.note || (type === 'withdraw' ? 'Transferência vinculada à conta de recebimento cadastrada.' : 'Valor vinculado a pedido, pagamento e avaliação do atendimento.');
      element.dataset.transactionRelatedAction = transaction.actionLabel || (canCompleteWithdraw ? 'Concluir saque' : type === 'withdraw' ? 'Ver carteira' : 'Ver pedido');
      element.dataset.walletTargetUrl = transaction.targetUrl || (type === 'withdraw' ? 'carteira.html' : 'pedidos.html');
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `Ver detalhes de ${element.dataset.transactionTitle}`);
      element.innerHTML = `
        <span aria-hidden="true" class="wallet-transaction__icon wallet-transaction__icon--${escapeHtml(type)}">${getTransactionIcon(type)}</span>
        <div class="wallet-transaction__content">
          <strong>${escapeHtml(title)}</strong>
          <p>${escapeHtml(description)}</p>
          <small class="wallet-transaction__status">${escapeHtml(status)}</small>
        </div>
        <div class="wallet-transaction__meta">
          <b class="wallet-transaction__amount">${escapeHtml(signedAmount)}</b>
          ${canCompleteWithdraw ? '<button class="wallet-transaction__complete doke-btn doke-btn--ghost" type="button" data-wallet-complete-withdraw>Concluir saque</button>' : ''}
        </div>
      `;
      return element;
    };

    const setText = (node, value) => {
      if (node) node.textContent = value;
    };

    const setAccountText = (name, value) => {
      setText(getAccountField(name), value);
    };

    const syncBankAccount = (account) => {
      currentBankAccount = account || null;
      const hasAccount = Boolean(account && (account.bankName || account.accountNumber || account.pixKey));
      setBankAccountEmptyState(!hasAccount);

      if (bankAccountCard) bankAccountCard.hidden = !hasAccount;
      if (bankAccountDetails) bankAccountDetails.hidden = !hasAccount;

      bankAccountButtons.forEach((button) => {
        const isHeaderButton = button.closest('.wallet-panel__header');
        if (isHeaderButton) button.hidden = !hasAccount;
        button.textContent = hasAccount
          ? (isHeaderButton ? 'Editar conta' : 'Editar conta bancária')
          : 'Adicionar conta bancária';
      });

      if (!hasAccount) {
        setAccountText('withdrawDestination', 'Conta não cadastrada');
        setAccountText('nextPayout', 'Após saldo');
        setAccountText('bankNextPayout', 'Após liberação');
        const status = document.querySelector('[data-wallet-account-status]');
        if (status) status.textContent = 'Sem conta cadastrada';
        return;
      }

      const destination = getBankDestination(account);
      const initials = getBankInitials(account.bankName);
      const initialsNode = bankAccountCard?.querySelector('[data-wallet-bank-initials]');
      if (initialsNode) initialsNode.textContent = initials;

      setAccountText('bankName', account.bankName || 'Banco cadastrado');
      setAccountText('bankSummary', `${account.accountType || 'Conta corrente'} · ${maskAccountNumber(account.accountNumber)}`);
      setAccountText('pixKey', account.pixKey ? `PIX ${account.pixKey}` : 'PIX verificado');
      setAccountText('accountType', account.accountType || 'Conta corrente');
      setAccountText('holderName', account.holderName || 'Titular verificado');
      setAccountText('bankNextPayout', account.nextPayout || 'Repasse automático após liberação');
      setAccountText('withdrawDestination', destination);
      setAccountText('nextPayout', 'Repasse automático');
      const status = document.querySelector('[data-wallet-account-status]');
      if (status) status.textContent = 'Conta cadastrada · Regular';
    };

    const syncWalletSummary = (wallet) => {
      if (!wallet) return;
      currentWallet = wallet;
      const available = Number(wallet.availableBalance || 0);
      setText(walletFields.available, formatCurrency(available));
      setText(withdrawAvailableNode, formatCurrency(available));
      setText(walletFields.held, formatCurrency(wallet.pendingBalance || 0));
      setText(walletFields.monthlyIncome, formatCurrency(wallet.monthlyIncome || 0));
      setText(walletFields.heldBalance, formatCurrency(wallet.pendingBalance || 0));
      setText(walletFields.withdrawals, formatCurrency(wallet.withdrawals || 0));
      setText(walletFields.fees, formatCurrency(wallet.fees || 0));
      if (walletFields.balanceCopy) walletFields.balanceCopy.textContent = wallet.localTransactions?.length ? 'Saldo atualizado pelos pedidos concluídos' : 'Sem saldo liberado no momento';
      if (walletFields.heldCopy) walletFields.heldCopy.textContent = wallet.pendingBalance > 0 ? 'Liberado após confirmação' : 'Sem valores pendentes';
    };

    const renderWalletTransactions = (wallet) => {
      if (!transactionList || !wallet) return;
      transactionList.querySelectorAll('[data-wallet-type]').forEach((item) => item.remove());
      const flowTransactions = Array.isArray(wallet.localTransactions) ? wallet.localTransactions : [];
      flowTransactions.slice().reverse().forEach((transaction) => {
        transactionList.prepend(createWalletTransactionElement(transaction));
      });
      transactions = Array.from(transactionList.querySelectorAll('[data-wallet-type]'));
      bindTransactionItems();
      const activeFilter = filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.walletFilter || 'all';
      setTransactionFilter(activeFilter);
      openTransactionFromUrl();
    };

    const loadWalletState = () => {
      const service = getWalletService();
      if (!service?.getWallet) return Promise.resolve(null);
      return service.getWallet({ currentUser: true })
        .then((wallet) => {
          syncWalletSummary(wallet);
          syncBankAccount(wallet.bankAccount || null);
          renderWalletTransactions(wallet);
          return wallet;
        })
        .catch((error) => {
          console.warn('[DokeWallet:load]', error);
          showWalletToast('Não foi possível atualizar a carteira.', 'error');
          return null;
        });
    };

    const scheduleWalletStateRefresh = (delay = 0) => {
      window.clearTimeout(walletRefreshTimer);
      walletRefreshTimer = window.setTimeout(() => {
        loadWalletState();
      }, delay);
    };


    const normalizeView = (view) => {
      return viewPanels.some((panel) => panel.dataset.walletViewPanel === view) ? view : 'overview';
    };

    const setView = (view) => {
      const nextView = normalizeView(view);

      viewPanels.forEach((panel) => {
        const isActivePanel = panel.dataset.walletViewPanel === nextView;
        panel.hidden = !isActivePanel;
        panel.setAttribute('aria-hidden', String(!isActivePanel));
      });

      viewButtons.forEach((button) => {
        const isActiveButton = button.dataset.walletViewToggle === nextView;
        button.classList.toggle('is-view-active', isActiveButton);
        button.setAttribute('aria-pressed', String(isActiveButton));
      });

      document.body.dataset.walletView = nextView;

      document.querySelectorAll('[data-wallet-mobile-view]').forEach((button) => {
        button.classList.toggle('is-view-active', button.dataset.walletMobileView === nextView);
      });
    };

    viewButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setView(button.dataset.walletViewToggle);
      });
    });

    const showWalletToast = (message, variant = 'success') => {
      if (!toastRegion || !message) return;

      const toast = document.createElement('div');
      toast.className = `wallet-toast wallet-toast--${variant}`;
      toast.setAttribute('role', 'status');
      toast.innerHTML = `
        <strong>${message}</strong>
        <button class="wallet-toast__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar aviso">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>
        </button>
      `;

      toast.querySelector('button')?.addEventListener('click', () => {
        toast.remove();
      });

      toastRegion.append(toast);

      window.setTimeout(() => {
        toast.classList.add('is-leaving');
        window.setTimeout(() => toast.remove(), 220);
      }, 3200);
    };

    const updateTransactionEmptyState = () => {
      if (!transactionList || !transactionEmptyState) return;

      const visibleTransactions = Array.from(transactionList.querySelectorAll('[data-wallet-type]')).filter((transaction) => !transaction.hidden);
      transactionEmptyState.hidden = visibleTransactions.length > 0;
    };


    const setBankAccountEmptyState = (isEmpty) => {
      if (!bankPanel || !bankEmptyState) return;

      bankPanel.classList.toggle('is-wallet-bank-empty', Boolean(isEmpty));
      bankEmptyState.hidden = !isEmpty;
    };

    const showTransactionList = () => {
      if (transactionList) transactionList.hidden = false;
      if (transactionFilterControls) transactionFilterControls.hidden = false;
      updateTransactionEmptyState();
    };

    const setTransactionDetailText = (field, value) => {
      const node = transactionDetailFields[field];
      if (!node) return;
      node.textContent = value || '—';
    };

    const findTransactionElementById = (transactionId) => {
      if (!transactionId || !transactionList) return null;
      const escapedId = window.CSS?.escape ? CSS.escape(transactionId) : String(transactionId).replace(/"/g, '\"');
      return transactionList.querySelector(`[data-wallet-transaction-id="${escapedId}"]`);
    };

    const returnToTransactionDetail = (transactionId) => {
      const target = findTransactionElementById(transactionId || activeTransactionDetailId);
      if (target) openTransactionDetail(target);
    };

    const setTransactionReceiptText = (field, value) => {
      const node = transactionReceiptFields[field];
      if (!node) return;
      node.textContent = value || '—';
    };

    const setWithdrawTrackText = (field, value) => {
      const node = withdrawTrackFields[field];
      if (!node) return;
      node.textContent = value || '—';
    };

    const getWithdrawTimelineSteps = (transactionElement) => {
      const isCompleted = (transactionElement?.dataset.transactionRawStatus || '') === 'completed';
      return [
        { label: 'Solicitação recebida', detail: 'O pedido de saque foi registrado na carteira.', state: 'done' },
        { label: 'Conta validada', detail: transactionElement?.dataset.transactionDestination || 'Conta de recebimento validada.', state: 'done' },
        { label: 'Transferência em processamento', detail: 'O repasse está sendo preparado para envio ao banco.', state: isCompleted ? 'done' : 'current' },
        { label: 'Saque concluído', detail: 'Valor enviado para a conta cadastrada.', state: isCompleted ? 'done' : 'pending' }
      ];
    };

    const renderWithdrawTimeline = (transactionElement) => {
      if (!withdrawTrackFields.timeline) return;
      withdrawTrackFields.timeline.innerHTML = getWithdrawTimelineSteps(transactionElement).map((step) => `
        <li class="wallet-withdraw-timeline__item" data-state="${escapeHtml(step.state)}">
          <span class="wallet-withdraw-timeline__marker" aria-hidden="true"></span>
          <div>
            <strong>${escapeHtml(step.label)}</strong>
            <p>${escapeHtml(step.detail)}</p>
          </div>
        </li>
      `).join('');
    };

    const closeWithdrawTrack = () => {
      if (!withdrawTrackModal) return;
      withdrawTrackModal.hidden = true;
      withdrawTrackModal.classList.remove('is-active');
      withdrawTrackModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
    };

    const openWithdrawTrack = (transactionElement) => {
      if (!withdrawTrackModal || !transactionElement || transactionElement.dataset.transactionType !== 'withdraw') return;
      const isCompleted = (transactionElement.dataset.transactionRawStatus || '') === 'completed';
      const transactionId = transactionElement.dataset.walletTransactionId || '';
      activeTransactionDetailId = transactionId || activeTransactionDetailId;
      withdrawTrackModal.dataset.walletTrackTransactionId = transactionId;

      setWithdrawTrackText('title', isCompleted ? 'Saque concluído' : 'Saque em processamento');
      setWithdrawTrackText('description', isCompleted
        ? 'O repasse foi marcado como concluído no mock local.'
        : 'Acompanhe as etapas do repasse até a conclusão.');
      setWithdrawTrackText('amount', transactionElement.dataset.transactionReceiptAmount || transactionElement.dataset.transactionAmount || 'R$ 0,00');
      setWithdrawTrackText('status', transactionElement.dataset.transactionStatus || 'Saque em processamento');
      setWithdrawTrackText('destination', transactionElement.dataset.transactionDestination || 'Conta de recebimento');
      setWithdrawTrackText('note', isCompleted
        ? 'Comprovante disponível no detalhe da movimentação.'
        : 'No mock local, use Concluir saque para simular o envio final ao banco.');
      renderWithdrawTimeline(transactionElement);

      if (withdrawTrackFields.completeAction) {
        withdrawTrackFields.completeAction.hidden = isCompleted;
        withdrawTrackFields.completeAction.dataset.walletTrackTransactionId = transactionId;
        withdrawTrackFields.completeAction.setAttribute('aria-busy', 'false');
        withdrawTrackFields.completeAction.disabled = false;
      }

      if (transactionDetailPanel && !transactionDetailPanel.hidden) {
        transactionDetailPanel.hidden = true;
        transactionDetailPanel.classList.remove('is-active');
        transactionDetailPanel.setAttribute('aria-hidden', 'true');
      }

      withdrawTrackModal.hidden = false;
      withdrawTrackModal.classList.add('is-active');
      withdrawTrackModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      withdrawTrackModal.querySelector('[data-wallet-withdraw-track-close]')?.focus?.({ preventScroll: true });
    };

    const closeTransactionReceipt = () => {
      if (!transactionReceiptModal) return;
      transactionReceiptModal.hidden = true;
      transactionReceiptModal.classList.remove('is-active');
      transactionReceiptModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
    };

    const openTransactionReceipt = (transactionElement) => {
      if (!transactionReceiptModal || !transactionElement) return;
      const transactionId = transactionElement.dataset.walletTransactionId || '';
      activeTransactionDetailId = transactionId || activeTransactionDetailId;
      transactionReceiptModal.dataset.walletReceiptTransactionId = transactionId;
      setTransactionReceiptText('title', transactionElement.dataset.transactionReceiptTitle || 'Comprovante da movimentação');
      setTransactionReceiptText('description', transactionElement.dataset.transactionReceiptDescription || 'Registro mockado da movimentação financeira.');
      setTransactionReceiptText('kind', transactionElement.dataset.transactionKind || 'Comprovante');
      setTransactionReceiptText('amount', transactionElement.dataset.transactionReceiptAmount || transactionElement.dataset.transactionAmount || 'R$ 0,00');
      setTransactionReceiptText('status', transactionElement.dataset.transactionStatus || 'Status');
      setTransactionReceiptText('code', transactionElement.dataset.transactionReceiptCode || transactionElement.dataset.walletTransactionId || 'DOKE-RECIBO');
      setTransactionReceiptText('reference', transactionElement.dataset.transactionReference || 'Movimentação');
      setTransactionReceiptText('gross', transactionElement.dataset.transactionGross || 'R$ 0,00');
      setTransactionReceiptText('fee', transactionElement.dataset.transactionFee || 'R$ 0,00');
      setTransactionReceiptText('net', transactionElement.dataset.transactionReceiptNet || transactionElement.dataset.transactionReceiptAmount || 'R$ 0,00');
      setTransactionReceiptText('method', transactionElement.dataset.transactionMethod || 'Carteira Doke');
      setTransactionReceiptText('date', transactionElement.dataset.transactionDate || 'Agora');
      setTransactionReceiptText('destination', transactionElement.dataset.transactionDestination || 'Carteira Doke');
      setTransactionReceiptText('note', 'Comprovante mockado para conferência. A versão final poderá ser emitida pelo backend financeiro.');

      if (transactionDetailPanel && !transactionDetailPanel.hidden) {
        transactionDetailPanel.hidden = true;
        transactionDetailPanel.classList.remove('is-active');
        transactionDetailPanel.setAttribute('aria-hidden', 'true');
      }

      transactionReceiptModal.hidden = false;
      transactionReceiptModal.classList.add('is-active');
      transactionReceiptModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      transactionReceiptModal.querySelector('[data-wallet-transaction-receipt-close]')?.focus?.({ preventScroll: true });
    };

    const closeTransactionDetail = () => {
      if (!transactionDetailPanel) return;
      transactionDetailPanel.hidden = true;
      transactionDetailPanel.classList.remove('is-active');
      transactionDetailPanel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
    };

    const openTransactionDetail = (transactionElement) => {
      if (!transactionDetailPanel || !transactionElement) return;
      activeTransactionDetailId = transactionElement.dataset.walletTransactionId || activeTransactionDetailId;
      setTransactionDetailText('title', transactionElement.dataset.transactionTitle || 'Detalhe da movimentação');
      setTransactionDetailText('description', transactionElement.dataset.transactionDescription || 'Resumo financeiro da carteira.');
      setTransactionDetailText('amount', transactionElement.dataset.transactionAmount || 'R$ 0,00');
      setTransactionDetailText('status', transactionElement.dataset.transactionStatus || 'Status');
      setTransactionDetailText('statusDetail', transactionElement.dataset.transactionStatus || 'Status atual');
      setTransactionDetailText('kind', transactionElement.dataset.transactionKind || 'Movimentação');
      setTransactionDetailText('kindDetail', transactionElement.dataset.transactionKindDetail || transactionElement.dataset.transactionKind || 'Movimentação');
      setTransactionDetailText('method', transactionElement.dataset.transactionMethod || 'Carteira Doke');
      setTransactionDetailText('reference', transactionElement.dataset.transactionReference || '—');
      setTransactionDetailText('note', transactionElement.dataset.transactionNote || 'Detalhe da movimentação.');
      setTransactionDetailText('date', transactionElement.dataset.transactionDate || 'Agora');
      setTransactionDetailText('gross', transactionElement.dataset.transactionGross || transactionElement.dataset.transactionAmount || 'R$ 0,00');
      setTransactionDetailText('fee', transactionElement.dataset.transactionFee || 'R$ 0,00');
      setTransactionDetailText('destination', transactionElement.dataset.transactionDestination || 'Carteira Doke');

      if (transactionDetailFields.relatedAction) {
        const isWithdrawTransaction = transactionElement.dataset.transactionType === 'withdraw';
        const actionLabel = transactionElement.dataset.transactionRelatedAction || 'Abrir referência';
        const targetUrl = transactionElement.dataset.walletTargetUrl || 'carteira.html';
        const duplicatesReceipt = actionLabel.trim().toLowerCase() === 'ver comprovante';
        const shouldHideRelatedAction = isWithdrawTransaction || duplicatesReceipt || !targetUrl;
        transactionDetailFields.relatedAction.textContent = actionLabel;
        transactionDetailFields.relatedAction.setAttribute('href', targetUrl);
        transactionDetailFields.relatedAction.hidden = shouldHideRelatedAction;
        transactionDetailFields.relatedAction.style.display = shouldHideRelatedAction ? 'none' : '';
      }

      if (transactionDetailFields.receiptAction) {
        transactionDetailFields.receiptAction.dataset.walletReceiptTransactionId = transactionElement.dataset.walletTransactionId || '';
        transactionDetailFields.receiptAction.hidden = false;
        transactionDetailFields.receiptAction.style.display = '';
      }

      if (transactionDetailFields.trackAction) {
        const isWithdraw = transactionElement.dataset.transactionType === 'withdraw';
        transactionDetailFields.trackAction.hidden = !isWithdraw;
        transactionDetailFields.trackAction.style.display = isWithdraw ? '' : 'none';
        transactionDetailFields.trackAction.dataset.walletTrackTransactionId = isWithdraw ? (transactionElement.dataset.walletTransactionId || '') : '';
      }

      transactionDetailPanel.hidden = false;
      transactionDetailPanel.classList.add('is-active');
      transactionDetailPanel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      transactionDetailPanel.querySelector('[data-wallet-transaction-detail-close]')?.focus?.({ preventScroll: true });
    };

    const openTransactionFromUrl = () => {
      const params = new URLSearchParams(window.location.search || '');
      const transactionId = params.get('transaction');
      if (!transactionId) return;
      const escapedId = window.CSS?.escape ? CSS.escape(transactionId) : transactionId.replace(/"/g, '\\"');
      const target = transactionList?.querySelector(`[data-wallet-transaction-id="${escapedId}"]`);
      if (target) window.setTimeout(() => openTransactionDetail(target), 40);
    };

    const completeWithdrawTransaction = (transactionElement, actionButton) => {
      const transactionId = transactionElement?.dataset.walletTransactionId || '';
      const service = getWalletService();

      if (!transactionId || !service?.completeWithdraw) {
        showWalletToast('Não foi possível concluir o saque agora.', 'error');
        return;
      }

      if (actionButton) {
        actionButton.disabled = true;
        actionButton.setAttribute('aria-busy', 'true');
      }

      service.completeWithdraw({ transactionId })
        .then(() => loadWalletState())
        .then(() => {
          showWalletToast('Saque concluído.');
        })
        .catch((error) => {
          showWalletToast(error?.message || 'Não foi possível concluir o saque.', 'error');
        })
        .finally(() => {
          if (actionButton) {
            actionButton.disabled = false;
            actionButton.setAttribute('aria-busy', 'false');
          }
        });
    };

    const bindTransactionItem = (transaction) => {
      if (!transaction || transaction.dataset.walletDetailBound === 'true') return;
      transaction.dataset.walletDetailBound = 'true';
      transaction.addEventListener('click', () => openTransactionDetail(transaction));
      transaction.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openTransactionDetail(transaction);
      });
      const completeButton = transaction.querySelector('[data-wallet-complete-withdraw]');
      completeButton?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        completeWithdrawTransaction(transaction, completeButton);
      });
    };

    const bindTransactionItems = () => {
      transactions.forEach(bindTransactionItem);
    };

    const setTransactionFilter = (filter) => {
      const nextFilter = filter || 'all';

      filterButtons.forEach((button) => {
        const isActiveButton = button.dataset.walletFilter === nextFilter;
        button.classList.toggle('is-active', isActiveButton);
        button.setAttribute('aria-pressed', String(isActiveButton));
      });

      transactions.forEach((transaction) => {
        const type = transaction.dataset.walletType;
        const isVisible = nextFilter === 'all' || type === nextFilter;
        transaction.hidden = !isVisible;
      });

      updateTransactionEmptyState();
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setTransactionFilter(button.dataset.walletFilter);
      });
    });

    const openWithdrawModal = () => {
      if (!withdrawModal) return;
      if (!currentBankAccount) {
        showWalletToast('Cadastre uma conta bancária antes de sacar.', 'error');
        openBankModal();
        return;
      }
      const available = Number(currentWallet?.availableBalance || 0);
      if (available <= 0) {
        showWalletToast('Você ainda não tem saldo disponível para saque.', 'error');
        return;
      }
      if (withdrawAmountInput) withdrawAmountInput.value = '';
      if (withdrawError) withdrawError.hidden = true;
      setText(withdrawAvailableNode, formatCurrency(available));
      withdrawModal.hidden = false;
      withdrawModal.classList.add('is-active');
      withdrawModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      const firstField = withdrawModal.querySelector('input, select, textarea, button');
      firstField?.focus({ preventScroll: true });
    };

    const closeWithdrawModal = () => {
      if (!withdrawModal) return;
      withdrawModal.hidden = true;
      withdrawModal.classList.remove('is-active');
      withdrawModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
      withdrawOpenButton?.focus({ preventScroll: true });
    };

    const openStatsModal = () => {
      setView('statistics');
      document.getElementById('wallet-statistics-title')?.focus?.({ preventScroll: true });
    };

    const closeStatsModal = () => {};

    withdrawOpenButton?.addEventListener('click', openWithdrawModal);
    withdrawCloseButtons.forEach((button) => {
      button.addEventListener('click', closeWithdrawModal);
    });

    transactionDetailCloseButtons.forEach((button) => {
      button.addEventListener('click', closeTransactionDetail);
    });

    transactionReceiptCloseButtons.forEach((button) => {
      button.addEventListener('click', closeTransactionReceipt);
    });

    withdrawTrackCloseButtons.forEach((button) => {
      button.addEventListener('click', closeWithdrawTrack);
    });

    withdrawTrackReturnButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const transactionId = withdrawTrackModal?.dataset.walletTrackTransactionId || activeTransactionDetailId;
        closeWithdrawTrack();
        returnToTransactionDetail(transactionId);
      });
    });

    transactionReceiptReturnButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const transactionId = transactionReceiptModal?.dataset.walletReceiptTransactionId || activeTransactionDetailId;
        closeTransactionReceipt();
        returnToTransactionDetail(transactionId);
      });
    });

    transactionDetailFields.receiptAction?.addEventListener('click', () => {
      const transactionId = transactionDetailFields.receiptAction?.dataset.walletReceiptTransactionId || '';
      const escapedId = window.CSS?.escape ? CSS.escape(transactionId) : transactionId.replace(/"/g, '\"');
      const target = transactionList?.querySelector(`[data-wallet-transaction-id="${escapedId}"]`);
      openTransactionReceipt(target);
    });

    transactionDetailFields.trackAction?.addEventListener('click', () => {
      const transactionId = transactionDetailFields.trackAction?.dataset.walletTrackTransactionId || '';
      const escapedId = window.CSS?.escape ? CSS.escape(transactionId) : transactionId.replace(/"/g, '\"');
      const target = transactionList?.querySelector(`[data-wallet-transaction-id="${escapedId}"]`);
      openWithdrawTrack(target);
    });

    withdrawTrackFields.completeAction?.addEventListener('click', () => {
      const transactionId = withdrawTrackFields.completeAction?.dataset.walletTrackTransactionId || '';
      const escapedId = window.CSS?.escape ? CSS.escape(transactionId) : transactionId.replace(/"/g, '\"');
      const target = transactionList?.querySelector(`[data-wallet-transaction-id="${escapedId}"]`);
      completeWithdrawTransaction(target, withdrawTrackFields.completeAction);
      closeWithdrawTrack();
    });

    statsOpenButtons.forEach((button) => {
      button.addEventListener('click', openStatsModal);
    });

    statsCloseButtons.forEach((button) => {
      button.addEventListener('click', closeStatsModal);
    });

    withdrawForm?.addEventListener('submit', (event) => {
      event.preventDefault();

      const amount = parseCurrencyInput(withdrawAmountInput?.value || '');
      const available = Number(currentWallet?.availableBalance || 0);
      const service = getWalletService();
      const submit = withdrawForm.querySelector('button[type="submit"]');

      if (!currentBankAccount) {
        if (withdrawError) {
          withdrawError.textContent = 'Cadastre uma conta bancária antes de sacar.';
          withdrawError.hidden = false;
        }
        showWalletToast('Cadastre uma conta bancária antes de sacar.', 'error');
        return;
      }

      if (!amount || amount <= 0) {
        if (withdrawError) {
          withdrawError.textContent = 'Informe um valor válido para sacar.';
          withdrawError.hidden = false;
        }
        return;
      }

      if (amount > available) {
        if (withdrawError) {
          withdrawError.textContent = 'O valor do saque não pode passar do saldo disponível.';
          withdrawError.hidden = false;
        }
        showWalletToast('Valor acima do saldo disponível.', 'error');
        return;
      }

      if (!service?.requestWithdraw) {
        showWalletToast('Não foi possível solicitar o saque agora.', 'error');
        return;
      }

      if (submit) {
        submit.disabled = true;
        submit.dataset.actionState = 'loading';
        submit.setAttribute('aria-busy', 'true');
      }

      service.requestWithdraw({ amount, bankAccountId: currentBankAccount.id })
        .then(() => loadWalletState())
        .then(() => {
          showWalletToast('Saque solicitado com sucesso.');
          closeWithdrawModal();
        })
        .catch((error) => {
          const message = error?.message || 'Não foi possível solicitar o saque.';
          if (withdrawError) {
            withdrawError.textContent = message;
            withdrawError.hidden = false;
          }
          showWalletToast(message, 'error');
        })
        .finally(() => {
          if (submit) {
            submit.disabled = false;
            submit.dataset.actionState = 'idle';
            submit.setAttribute('aria-busy', 'false');
          }
        });
    });


    const ensureDokeLiteSelectScript = () => {
      if (window.DokeLiteSelect?.enhanceAll) return Promise.resolve(window.DokeLiteSelect);

      const existingScript = document.querySelector('script[src*="doke-lite-select.js"]');
      if (existingScript?.dataset.walletSelectRequested === 'true') {
        return new Promise((resolve) => {
          window.setTimeout(() => resolve(window.DokeLiteSelect || null), 80);
        });
      }

      return new Promise((resolve) => {
        const script = existingScript || document.createElement('script');
        script.dataset.walletSelectRequested = 'true';
        script.addEventListener('load', () => resolve(window.DokeLiteSelect || null), { once: true });
        script.addEventListener('error', () => resolve(null), { once: true });

        if (!existingScript) {
          script.src = 'assets/js/components/doke-lite-select.js?v=20260628-wallet-bank-select-ready-v1';
          script.defer = true;
          document.body.appendChild(script);
          return;
        }

        window.setTimeout(() => resolve(window.DokeLiteSelect || null), 80);
      });
    };

    const enhanceBankSelects = () => {
      if (!bankModal) return Promise.resolve(false);
      const selectNodes = Array.from(bankModal.querySelectorAll('select[data-doke-select]'));
      if (!selectNodes.length) return Promise.resolve(true);

      const applyEnhancement = () => {
        if (!window.DokeLiteSelect?.enhanceAll) return false;
        window.DokeLiteSelect.enhanceAll(bankModal);
        return selectNodes.every((select) => select.dataset.dokeLiteSelectReady === 'true');
      };

      if (applyEnhancement()) return Promise.resolve(true);

      return ensureDokeLiteSelectScript().then(() => {
        const ready = applyEnhancement();
        if (!ready) window.setTimeout(applyEnhancement, 80);
        return ready;
      });
    };

    const fillBankForm = (account) => {
      const source = account || {};
      bankInputs.forEach((input) => {
        const key = input.dataset.walletBankInput;
        input.value = source[key] || '';
        if (input.tagName === 'SELECT') {
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      if (bankError) bankError.hidden = true;
    };

    const openBankModal = () => {
      if (!bankModal) return;
      const isEditing = Boolean(currentBankAccount && (currentBankAccount.bankName || currentBankAccount.accountNumber || currentBankAccount.pixKey));
      enhanceBankSelects();
      window.setTimeout(enhanceBankSelects, 80);
      window.setTimeout(enhanceBankSelects, 220);
      fillBankForm(currentBankAccount);
      if (bankModalTitle) bankModalTitle.textContent = isEditing ? 'Editar conta bancária' : 'Adicionar conta bancária';
      if (bankModalCopy) bankModalCopy.textContent = isEditing
        ? 'Atualize os dados da conta usada para receber seus repasses e saques.'
        : 'Cadastre a conta que vai receber seus repasses e saques liberados.';
      if (bankSubmitLabel) bankSubmitLabel.textContent = isEditing ? 'Salvar alterações' : 'Salvar conta';
      bankModal.hidden = false;
      bankModal.classList.add('is-active');
      bankModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      const firstField = bankModal.querySelector('[data-wallet-bank-input]') || bankModal.querySelector('input, select, textarea, button');
      firstField?.focus({ preventScroll: true });
    };

    const closeBankModal = () => {
      if (!bankModal) return;
      bankModal.hidden = true;
      bankModal.classList.remove('is-active');
      bankModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
      bankAccountButtons.find((button) => !button.hidden)?.focus?.({ preventScroll: true });
    };

    const getBankFormPayload = () => bankInputs.reduce((payload, input) => {
      payload[input.dataset.walletBankInput] = String(input.value || '').trim();
      return payload;
    }, {});

    const isValidBankPayload = (payload) => {
      return Boolean(payload.bankName && payload.holderName && payload.accountType && payload.agency && payload.accountNumber && payload.pixKey);
    };

    bankAccountButtons.forEach((button) => {
      button.addEventListener('click', openBankModal);
    });

    bankCloseButtons.forEach((button) => {
      button.addEventListener('click', closeBankModal);
    });

    bankForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const payload = getBankFormPayload();
      if (!isValidBankPayload(payload)) {
        if (bankError) bankError.hidden = false;
        showWalletToast('Preencha os dados da conta.', 'error');
        return;
      }

      const service = getWalletService();
      if (!service?.saveBankAccount) {
        showWalletToast('Não foi possível salvar a conta agora.', 'error');
        return;
      }

      const submit = bankForm.querySelector('button[type="submit"]');
      if (submit) {
        submit.disabled = true;
        submit.setAttribute('aria-busy', 'true');
      }

      service.saveBankAccount(payload)
        .then((result) => {
          syncBankAccount(result?.account || payload);
          showWalletToast('Conta bancária cadastrada.');
          closeBankModal();
        })
        .catch((error) => {
          console.warn('[DokeWallet:bank-account]', error);
          showWalletToast('Não foi possível salvar a conta.', 'error');
        })
        .finally(() => {
          if (submit) {
            submit.disabled = false;
            submit.removeAttribute('aria-busy');
          }
        });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      if (withdrawModal && !withdrawModal.hidden) {
        closeWithdrawModal();
        return;
      }

      if (bankModal && !bankModal.hidden) {
        closeBankModal();
        return;
      }

      if (transactionReceiptModal && !transactionReceiptModal.hidden) {
        closeTransactionReceipt();
        return;
      }
      if (withdrawTrackModal && !withdrawTrackModal.hidden) {
        closeWithdrawTrack();
        return;
      }

      if (transactionDetailPanel && !transactionDetailPanel.hidden) {
        closeTransactionDetail();
      }
    });

    bindTransactionItems();

    const syncWalletMobileHeaderActions = () => {
      const actionGroups = Array.from(document.querySelectorAll('.doke-mobile-page-header__actions, .doke-mobile-shell__actions[data-shell-context-actions]'));
      if (!actionGroups.length) return;

      actionGroups.forEach((group) => {
        if (group.dataset.walletMobileActionsReady === 'true') return;

        const isShellActions = group.classList.contains('doke-mobile-shell__actions');
        const actionClass = isShellActions
          ? 'doke-mobile-shell__quick-action wallet-mobile-action'
          : 'doke-mobile-page-header__action wallet-mobile-action doke-btn';

        group.dataset.walletMobileActionsReady = 'true';
        group.classList.add('wallet-mobile-actions');
        group.setAttribute('aria-label', 'Ações rápidas da carteira');

        group.innerHTML = `
          <button class="${actionClass}" type="button" data-wallet-mobile-withdraw aria-label="Sacar saldo">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16"></path><path d="m6 10 6-6 6 6"></path></svg>
          </button>
          <button class="${actionClass}" type="button" data-wallet-mobile-view="overview" aria-label="Ver extrato">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M7 17.5h8"></path></svg>
          </button>
          <button class="${actionClass}" type="button" data-wallet-mobile-view="statistics" aria-label="Ver estatísticas">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19V9"></path><path d="M12 19V5"></path><path d="M19 19v-7"></path></svg>
          </button>
        `;

        const withdrawButton = group.querySelector('[data-wallet-mobile-withdraw]');
        const mobileViewButtons = Array.from(group.querySelectorAll('[data-wallet-mobile-view]'));

        withdrawButton?.addEventListener('click', openWithdrawModal);

        mobileViewButtons.forEach((button) => {
          button.addEventListener('click', () => {
            setView(button.dataset.walletMobileView);
          });
        });
      });
    };

    const syncWalletMobileHeaderState = () => {
      const activeView = document.body.dataset.walletView || 'overview';
      document.querySelectorAll('[data-wallet-mobile-view]').forEach((button) => {
        button.classList.toggle('is-view-active', button.dataset.walletMobileView === activeView);
      });
    };

    const ensureWalletMobileHeader = () => {
      syncWalletMobileHeaderActions();
      syncWalletMobileHeaderState();
    };

    ensureWalletMobileHeader();
    window.setTimeout(ensureWalletMobileHeader, 80);
    window.setTimeout(ensureWalletMobileHeader, 300);

    const mobileHeader = document.querySelector('.doke-mobile-page-header');
    if (mobileHeader) {
      const mobileHeaderObserver = new MutationObserver(() => {
        ensureWalletMobileHeader();
      });
      mobileHeaderObserver.observe(mobileHeader, { childList: true, subtree: true });
    }

    window.addEventListener('pageshow', () => {
      scheduleWalletStateRefresh(0);
    });

    window.addEventListener('focus', () => {
      scheduleWalletStateRefresh(80);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) scheduleWalletStateRefresh(80);
    });

    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === 'doke.wallet.local.v1') {
        scheduleWalletStateRefresh(0);
      }
    });

    window.DokeRefreshWalletState = () => scheduleWalletStateRefresh(0);

    const initialActiveButton = viewButtons.find((button) => button.classList.contains('is-view-active'));
    setView(initialActiveButton?.dataset.walletViewToggle || 'overview');
    setTransactionFilter(filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.walletFilter || 'all');
    updateTransactionEmptyState();
    setBankAccountEmptyState(true);
    scheduleWalletStateRefresh(0);
    return true;
  };

  window.DokeInitWalletPage = initWalletPage;

  ready(() => {
    initWalletPage();
  });

  document.addEventListener('doke:stable-route-ready', (event) => {
    const path = event?.detail?.path || '';
    if (path.endsWith('/carteira.html') || document.body?.dataset.page === 'carteira') {
      initWalletPage();
    }
  });
})();
