(() => {
  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
      return;
    }
    callback();
  };

  ready(() => {
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
    const transactionDetailPanel = document.querySelector('[data-wallet-transaction-detail-panel]');
    const transactionDetailBackButton = document.querySelector('[data-wallet-transaction-detail-back]');
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
      relatedAction: document.querySelector('[data-wallet-transaction-related-action]')
    };
    const transactionFilterControls = document.querySelector('.wallet-tabs');

    let currentBankAccount = null;

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

    const createWalletTransactionElement = (transaction) => {
      const type = getTransactionType(transaction);
      const amount = Number(transaction.netAmount || transaction.amount || 0);
      const signedAmount = type === 'income' ? `+${formatCurrency(amount)}` : type === 'withdraw' || type === 'fee' ? `-${formatCurrency(Math.abs(amount))}` : formatCurrency(amount);
      const description = `${transaction.title || 'Pedido concluído'} · ${formatTransactionDate(transaction.createdAt)}`;
      const status = type === 'held' ? 'Em garantia' : type === 'withdraw' ? 'Saque em processamento' : type === 'fee' ? 'Taxa aplicada' : 'Liberado para saque';
      const element = document.createElement('article');
      element.className = 'wallet-transaction';
      element.dataset.walletType = type;
      element.dataset.walletStatus = transaction.status || 'available';
      element.dataset.walletSource = transaction.source || 'order-flow';
      element.dataset.walletTransactionId = transaction.id || '';
      element.dataset.transactionTitle = transaction.title || 'Pedido concluído';
      element.dataset.transactionDescription = description;
      element.dataset.transactionStatus = status;
      element.dataset.transactionAmount = signedAmount;
      element.dataset.transactionKind = type === 'income' ? 'Entrada' : type === 'held' ? 'Saldo em garantia' : type === 'fee' ? 'Taxa' : 'Saque';
      element.dataset.transactionMethod = transaction.method || 'Recebimento pela Doke';
      element.dataset.transactionReference = transaction.reference || transaction.orderId || '';
      element.dataset.transactionNote = transaction.note || 'Valor liberado após conclusão e avaliação do atendimento.';
      element.dataset.transactionRelatedAction = transaction.actionLabel || 'Ver pedido';
      element.dataset.walletTargetUrl = transaction.targetUrl || '';
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `Ver detalhes de ${element.dataset.transactionTitle}`);
      element.innerHTML = `
        <span aria-hidden="true" class="wallet-transaction__icon wallet-transaction__icon--${escapeHtml(type)}">${getTransactionIcon(type)}</span>
        <div class="wallet-transaction__content">
          <strong>${escapeHtml(transaction.title || 'Pedido concluído')}</strong>
          <p>${escapeHtml(description)}</p>
          <small class="wallet-transaction__status">${escapeHtml(status)}</small>
        </div>
        <b class="wallet-transaction__amount">${escapeHtml(signedAmount)}</b>
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
      setText(walletFields.available, formatCurrency(wallet.availableBalance || 0));
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
        <button class="wallet-toast__close doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar aviso">×</button>
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

    const createWithdrawTransaction = (amount, destination) => {
      if (!transactionList) return;

      const transaction = document.createElement('article');
      transaction.className = 'wallet-transaction';
      transaction.dataset.walletType = 'withdraw';
      transaction.dataset.walletStatus = 'processing';
      transaction.dataset.walletTransactionAction = '';
      transaction.dataset.transactionTitle = 'Saque solicitado';
      transaction.dataset.transactionDescription = `${destination} · agora`;
      transaction.dataset.transactionStatus = 'Saque em processamento';
      transaction.dataset.transactionAmount = `-${amount}`;
      transaction.dataset.transactionKind = 'Saque';
      transaction.dataset.transactionMethod = destination;
      transaction.dataset.transactionReference = `SAQ-${Date.now().toString().slice(-6)}`;
      transaction.dataset.transactionNote = 'Transferência solicitada para a conta de recebimento cadastrada.';
      transaction.dataset.transactionRelatedAction = 'Acompanhar saque';
      transaction.setAttribute('tabindex', '0');
      transaction.setAttribute('role', 'button');
      transaction.setAttribute('aria-label', 'Ver detalhes do saque solicitado');
      transaction.innerHTML = `
        <span class="wallet-transaction__icon wallet-transaction__icon--withdraw">↗</span>
        <div class="wallet-transaction__content">
          <strong>Saque solicitado</strong>
          <p>${destination} · agora</p>
          <small class="wallet-transaction__status">Saque em processamento</small>
        </div>
        <b>-${amount}</b>
      `;

      transactionList.prepend(transaction);
      transactions.unshift(transaction);
      bindTransactionItem(transaction);
      updateTransactionEmptyState();
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

    const bindTransactionItem = () => {};

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

    statsOpenButtons.forEach((button) => {
      button.addEventListener('click', openStatsModal);
    });

    statsCloseButtons.forEach((button) => {
      button.addEventListener('click', closeStatsModal);
    });

    withdrawForm?.addEventListener('submit', (event) => {
      event.preventDefault();

      const rawAmount = withdrawAmountInput?.value || '1.200,00';
      const amount = /^\s*R\$/.test(rawAmount) ? rawAmount : `R$ ${rawAmount}`;
      const destination = getAccountField('withdrawDestination')?.textContent || 'Conta não cadastrada';

      createWithdrawTransaction(amount, destination);
      showWalletToast('Saque solicitado com sucesso.');
      closeWithdrawModal();
    });


    const fillBankForm = (account) => {
      const source = account || {};
      bankInputs.forEach((input) => {
        const key = input.dataset.walletBankInput;
        input.value = source[key] || '';
      });
      if (bankError) bankError.hidden = true;
    };

    const openBankModal = () => {
      if (!bankModal) return;
      const isEditing = Boolean(currentBankAccount && (currentBankAccount.bankName || currentBankAccount.accountNumber || currentBankAccount.pixKey));
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

    const initialActiveButton = viewButtons.find((button) => button.classList.contains('is-view-active'));
    setView(initialActiveButton?.dataset.walletViewToggle || 'overview');
    setTransactionFilter(filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.walletFilter || 'all');
    updateTransactionEmptyState();
    setBankAccountEmptyState(true);
    loadWalletState();
  });
})();
