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
    const transactions = Array.from(document.querySelectorAll('[data-wallet-type]'));
    const withdrawModal = document.querySelector('[data-wallet-withdraw-modal]');
    const withdrawOpenButton = document.querySelector('[data-wallet-open-withdraw]');
    const withdrawCloseButtons = Array.from(document.querySelectorAll('[data-wallet-close-withdraw]'));
    const statsModal = null;
    const statsOpenButtons = [];
    const statsCloseButtons = [];
    const withdrawForm = document.querySelector('[data-wallet-withdraw-form]');
    const accountModal = document.querySelector('[data-wallet-account-modal]');
    const accountManageButton = document.querySelector('[data-wallet-account-action="manage"]');
    const accountCloseButtons = Array.from(document.querySelectorAll('[data-wallet-close-account]'));
    const accountForm = document.querySelector('[data-wallet-account-form]');
    const accountInputs = accountForm ? Array.from(accountForm.querySelectorAll('[data-wallet-account-input]')) : [];
    const accountFields = Array.from(document.querySelectorAll('[data-wallet-account-field]'));
    const dialogDropdowns = Array.from(document.querySelectorAll('[data-wallet-dialog-select]'));
    const transactionList = document.querySelector('[data-wallet-transaction-list]');
    const transactionEmptyState = document.querySelector('[data-wallet-empty-state="transactions"]');
    const bankEmptyState = document.querySelector('[data-wallet-empty-state="bank-account"]');
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
        <button type="button" aria-label="Fechar aviso">×</button>
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
      const bankPanel = document.querySelector('[data-wallet-account-panel]');
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
      const destination = getAccountField('withdrawDestination')?.textContent || 'PIX • Nubank';

      createWithdrawTransaction(amount, destination);
      showWalletToast('Saque solicitado com sucesso.');
      closeWithdrawModal();
    });

    const bankThemes = {
      'Nubank': { mark: 'nu', theme: 'nubank' },
      'Banco Inter': { mark: 'inter', theme: 'inter' },
      'Itaú': { mark: 'itaú', theme: 'generic' },
      'Bradesco': { mark: 'bra', theme: 'generic' },
      'Caixa': { mark: 'cx', theme: 'generic' },
      'Banco do Brasil': { mark: 'bb', theme: 'generic' }
    };

    const getAccountInput = (name) => {
      return accountInputs.find((input) => input.dataset.walletAccountInput === name);
    };

    const getAccountField = (name) => {
      return accountFields.find((field) => field.dataset.walletAccountField === name);
    };

    const setBankTheme = (theme) => {
      const bankMark = getAccountField('bankMark');
      const previewMark = accountModal?.querySelector('[data-wallet-account-preview-mark]');

      [bankMark, previewMark].forEach((mark) => {
        if (!mark) return;
        mark.classList.remove('wallet-bank-card__mark--nubank', 'wallet-bank-card__mark--inter', 'wallet-bank-card__mark--generic');
        mark.dataset.bankTheme = theme;
        if (mark.classList.contains('wallet-bank-card__mark')) {
          mark.classList.add(`wallet-bank-card__mark--${theme}`);
        }
      });
    };

    const getAccountStateFromForm = () => {
      const bankName = getAccountInput('bankName')?.value || 'Nubank';
      const accountLastDigits = (getAccountInput('accountLastDigits')?.value || '9821').replace(/\D/g, '').slice(-4) || '9821';
      const accountType = getAccountInput('accountType')?.value || 'Conta corrente';
      const pixStatus = getAccountInput('pixStatus')?.value || 'CPF verificado';
      const nextPayout = getAccountInput('nextPayout')?.value || '12 abr · 08:00';
      const bankTheme = bankThemes[bankName] || { mark: bankName.slice(0, 2).toLowerCase(), theme: 'generic' };

      return {
        bankName,
        accountLastDigits,
        accountType,
        pixStatus,
        nextPayout,
        bankMark: bankTheme.mark,
        bankTheme: bankTheme.theme,
        accountLabel: `Conta principal · final ${accountLastDigits}`,
        payoutCopy: 'PIX automático toda terça-feira às 08:00',
        withdrawDestination: `PIX • ${bankName}`
      };
    };

    const syncAccountPreview = () => {
      if (!accountModal) return;

      const state = getAccountStateFromForm();
      const previewMark = accountModal.querySelector('[data-wallet-account-preview-mark]');
      const previewMiniMark = accountModal.querySelector('[data-wallet-account-preview-mark-mini]');
      const previewBank = accountModal.querySelector('[data-wallet-account-preview-bank]');
      const previewCopy = accountModal.querySelector('[data-wallet-account-preview-copy]');

      [previewMark, previewMiniMark].forEach((mark) => {
        if (!mark) return;
        mark.textContent = state.bankMark;
        mark.dataset.bankTheme = state.bankTheme;
      });
      if (previewBank) previewBank.textContent = state.bankName;
      if (previewCopy) previewCopy.textContent = state.accountLabel;
    };

    const applyAccountState = () => {
      const state = getAccountStateFromForm();

      Object.entries(state).forEach(([key, value]) => {
        const field = getAccountField(key);
        if (field) field.textContent = value;
      });

      setBankTheme(state.bankTheme);
    };

    const openAccountModal = () => {
      if (!accountModal) return;
      syncAccountPreview();
      accountModal.hidden = false;
      accountModal.classList.add('is-active');
      accountModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-wallet-modal-open');
      const firstField = accountModal.querySelector('select, input, textarea, button');
      firstField?.focus({ preventScroll: true });
    };

    const closeAccountModal = () => {
      if (!accountModal) return;
      accountModal.hidden = true;
      accountModal.classList.remove('is-active');
      accountModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-wallet-modal-open');
      accountManageButton?.focus({ preventScroll: true });
    };

    accountManageButton?.addEventListener('click', openAccountModal);
    document.querySelectorAll('[data-wallet-account-action="manage-empty"]').forEach((button) => {
      button.addEventListener('click', openAccountModal);
    });
    accountCloseButtons.forEach((button) => {
      button.addEventListener('click', closeAccountModal);
    });

    accountInputs.forEach((input) => {
      input.addEventListener('input', syncAccountPreview);
      input.addEventListener('change', syncAccountPreview);
    });

    accountForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      applyAccountState();
      setBankAccountEmptyState(false);
      showWalletToast('Conta de recebimento atualizada.');
      closeAccountModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;

      if (withdrawModal && !withdrawModal.hidden) {
        closeWithdrawModal();
        return;
      }

      if (accountModal && !accountModal.hidden) {
        closeAccountModal();
        return;
      }

    });

    const closeDialogDropdowns = (exceptDropdown = null) => {
      dialogDropdowns.forEach((dropdown) => {
        if (dropdown === exceptDropdown) return;

        dropdown.classList.remove('is-open');
        const button = dropdown.querySelector('[data-wallet-dialog-select-button]');
        const menu = dropdown.querySelector('[data-wallet-dialog-select-menu]');
        button?.setAttribute('aria-expanded', 'false');
        if (menu) menu.hidden = true;
      });
    };

    const setDialogDropdownValue = (dropdown, option) => {
      if (!dropdown || !option) return;

      const inputName = dropdown.dataset.walletDialogSelectName;
      const input = getAccountInput(inputName);
      const label = dropdown.querySelector('[data-wallet-dialog-select-label]');
      const mark = dropdown.querySelector('[data-wallet-account-preview-mark-mini]');
      const value = option.dataset.value || option.textContent.trim();
      const theme = option.dataset.theme || 'generic';
      const markText = option.dataset.mark || value.slice(0, 2).toLowerCase();

      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (label) label.textContent = value;

      if (mark) {
        mark.textContent = markText;
        mark.dataset.bankTheme = theme;
      }

      dropdown.querySelectorAll('[data-wallet-dialog-option]').forEach((item) => {
        item.setAttribute('aria-selected', String(item === option));
      });

      syncAccountPreview();
      closeDialogDropdowns();
    };

    dialogDropdowns.forEach((dropdown) => {
      const button = dropdown.querySelector('[data-wallet-dialog-select-button]');
      const menu = dropdown.querySelector('[data-wallet-dialog-select-menu]');
      const options = Array.from(dropdown.querySelectorAll('[data-wallet-dialog-option]'));

      button?.addEventListener('click', () => {
        const willOpen = !dropdown.classList.contains('is-open');
        closeDialogDropdowns(dropdown);
        dropdown.classList.toggle('is-open', willOpen);
        button.setAttribute('aria-expanded', String(willOpen));
        if (menu) menu.hidden = !willOpen;
      });

      options.forEach((option) => {
        option.addEventListener('click', () => {
          setDialogDropdownValue(dropdown, option);
        });
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-wallet-dialog-select]')) {
        closeDialogDropdowns();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDialogDropdowns();
        closeStatsModal();
      }
    });

    syncAccountPreview();
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
    setBankAccountEmptyState(false);
  });
})();
