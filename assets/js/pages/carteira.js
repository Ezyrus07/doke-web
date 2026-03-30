(() => {
  const initWallet = () => {
    const root = document.querySelector('[data-wallet-page]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    const statsToggle = root.querySelector('[data-wallet-stats-toggle]');
    const mainView = root.querySelector('[data-wallet-main-view]');
    const statsView = root.querySelector('[data-wallet-stats-view]');
    const withdrawPanel = root.querySelector('[data-wallet-withdraw-panel]');
    const loadingPanel = root.querySelector('[data-wallet-loading-panel]');
    const overlay = root.querySelector('[data-wallet-overlay]');
    const successPanel = root.querySelector('[data-wallet-success-panel]');
    const withdrawButtons = Array.from(root.querySelectorAll('[data-wallet-withdraw-toggle]'));
    const withdrawClose = root.querySelector('[data-wallet-withdraw-close]');
    const withdrawInput = root.querySelector('[data-wallet-withdraw-input]');
    const withdrawConfirm = root.querySelector('[data-wallet-withdraw-confirm]');
    const successClose = root.querySelector('[data-wallet-success-close]');
    const successHistory = root.querySelector('[data-wallet-success-history]');
    const walletCardToggle = root.querySelector('.wallet-card-visual');
    const donut = root.querySelector('[data-wallet-donut]');
    const donutValue = root.querySelector('[data-wallet-donut-value]');
    const donutLabel = root.querySelector('[data-wallet-donut-label]');
    const segmentTriggers = Array.from(root.querySelectorAll('.wallet-distribution__slice[data-wallet-segment]'));
    const segmentCards = Array.from(root.querySelectorAll('[data-wallet-segment-card]'));

    const detailValue = root.querySelector('[data-wallet-detail-value]');
    const detailLabel = root.querySelector('[data-wallet-detail-label]');
    const detailCopy = root.querySelector('[data-wallet-detail-copy]');
    const detailMeta = root.querySelector('[data-wallet-detail-meta]');

    const segmentMap = {
      available: {
        value: 'R$ 1.480,00',
        label: 'Saldo disponível',
        className: 'is-available',
        copy: 'Liberado hoje para saque.',
        meta: ['52% da carteira', 'Maior fatia atual']
      },
      guarantee: {
        value: 'R$ 620,00',
        label: 'Em garantia',
        className: 'is-guarantee',
        copy: 'Valores aguardando conclusão do serviço.',
        meta: ['4 serviços', 'Libera em até 2 dias']
      },
      billing: {
        value: 'R$ 810,00',
        label: 'Em cobrança',
        className: 'is-billing',
        copy: 'Cobrado, mas ainda não pago pelos clientes.',
        meta: ['3 clientes', 'Maior ticket em aberto']
      },
      paid: {
        value: '18',
        label: 'Serviços pagos',
        className: 'is-paid',
        copy: 'Quantidade concluída e paga neste mês.',
        meta: ['Este mês', '18% acima do último ciclo']
      }
    };

    const resetDonutState = () => {
      if (!donut) return;
      donut.classList.remove('is-available', 'is-guarantee', 'is-billing', 'is-paid');
    };

    const setDefaultButtons = () => {
      if (statsToggle) statsToggle.textContent = 'Estatísticas';
      withdrawButtons.forEach((button) => {
        button.textContent = button.closest('.wallet-hero__detail') ? 'Sacar saldo' : 'Sacar';
      });
    };

    const openMain = () => {
      root.dataset.walletMode = 'main';
      root.classList.remove('is-stats-mode', 'is-withdraw-mode');
      if (mainView) mainView.hidden = false;
      if (statsView) statsView.hidden = true;
      if (withdrawPanel) withdrawPanel.hidden = true;
      if (loadingPanel) loadingPanel.hidden = true;
      if (overlay) overlay.hidden = true;
      if (successPanel) successPanel.hidden = true;
      setDefaultButtons();
    };

    const setStatsMode = (enabled) => {
      if (!enabled) {
        openMain();
        return;
      }
      root.dataset.walletMode = 'stats';
      root.classList.add('is-stats-mode');
      root.classList.remove('is-withdraw-mode');
      if (mainView) mainView.hidden = true;
      if (statsView) statsView.hidden = false;
      if (withdrawPanel) withdrawPanel.hidden = true;
      if (loadingPanel) loadingPanel.hidden = true;
      if (overlay) overlay.hidden = true;
      if (successPanel) successPanel.hidden = true;
      if (statsToggle) statsToggle.textContent = 'Voltar';
      withdrawButtons.forEach((button) => {
        button.textContent = button.closest('.wallet-hero__detail') ? 'Sacar saldo' : 'Sacar';
      });
    };

    const toggleWithdraw = (sourceButton = null) => {
      if (!withdrawPanel) return;
      const isOpen = root.dataset.walletMode === 'withdraw';
      if (isOpen) {
        openMain();
        return;
      }
      root.dataset.walletMode = 'withdraw';
      root.classList.add('is-withdraw-mode');
      root.classList.remove('is-stats-mode');
      if (mainView) mainView.hidden = true;
      if (statsView) statsView.hidden = true;
      withdrawPanel.hidden = false;
      if (loadingPanel) loadingPanel.hidden = true;
      if (overlay) overlay.hidden = true;
      if (successPanel) successPanel.hidden = true;
      setDefaultButtons();
      withdrawButtons.forEach((button) => {
        button.textContent = 'Voltar';
      });
      window.setTimeout(() => withdrawInput?.focus(), 30);
    };

    const openWithdrawLoading = () => {
      root.dataset.walletMode = 'withdraw-loading';
      root.classList.remove('is-stats-mode', 'is-withdraw-mode');
      if (mainView) mainView.hidden = true;
      if (statsView) statsView.hidden = true;
      if (withdrawPanel) withdrawPanel.hidden = true;
      if (loadingPanel) loadingPanel.hidden = false;
      if (overlay) overlay.hidden = false;
      if (successPanel) successPanel.hidden = true;
      setDefaultButtons();
    };

    const openWithdrawSuccess = () => {
      root.dataset.walletMode = 'withdraw-success';
      root.classList.remove('is-stats-mode', 'is-withdraw-mode');
      if (mainView) mainView.hidden = true;
      if (statsView) statsView.hidden = true;
      if (withdrawPanel) withdrawPanel.hidden = true;
      if (loadingPanel) loadingPanel.hidden = true;
      if (overlay) overlay.hidden = true;
      if (successPanel) successPanel.hidden = false;
      setDefaultButtons();
    };

    statsToggle?.addEventListener('click', () => {
      setStatsMode(root.dataset.walletMode !== 'stats');
    });

    withdrawButtons.forEach((button) => {
      button.addEventListener('click', () => toggleWithdraw(button));
    });

    withdrawClose?.addEventListener('click', () => {
      openMain();
    });

    withdrawConfirm?.addEventListener('click', () => {
      openWithdrawLoading();
      window.setTimeout(() => {
        openWithdrawSuccess();
      }, 1200);
    });

    successClose?.addEventListener('click', () => {
      openMain();
    });

    successHistory?.addEventListener('click', () => {
      openMain();
      root.querySelector('.wallet-history-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    walletCardToggle?.addEventListener('click', () => {
      const isSelected = walletCardToggle.classList.toggle('is-selected');
      walletCardToggle.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    let currentSegmentKey = 'available';

    const activateSegment = (itemOrKey, persist = false) => {
      const key = typeof itemOrKey === 'string' ? itemOrKey : itemOrKey.dataset.walletSegment;
      const next = segmentMap[key];
      if (!next || !donut) return;
      if (persist) currentSegmentKey = key;
      segmentCards.forEach((node) => {
        node.classList.toggle('is-active', node.dataset.walletSegmentCard === key);
      });
      resetDonutState();
      donut.classList.add(next.className);
      if (donutValue) donutValue.textContent = next.value;
      if (donutLabel) donutLabel.textContent = next.label;
      if (detailValue) detailValue.textContent = next.value;
      if (detailLabel) detailLabel.textContent = next.label;
      if (detailCopy) detailCopy.textContent = next.copy;
      if (detailMeta) {
        detailMeta.innerHTML = next.meta.map((itemText) => `<span>${itemText}</span>`).join('');
      }
    };

    segmentTriggers.forEach((item) => {
      const activate = () => {
        activateSegment(item);
      };
      item.addEventListener('mouseenter', activate);
      item.addEventListener('focus', activate);
      item.addEventListener('mouseleave', () => {
        activateSegment(currentSegmentKey);
      });
      item.addEventListener('click', () => {
        activateSegment(item, true);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateSegment(item, true);
        }
      });
    });

    segmentCards.forEach((card) => {
      card.addEventListener('click', () => {
        const key = card.dataset.walletSegmentCard;
        if (!key) return;
        activateSegment(key, true);
      });
    });

    const defaultSegment = root.querySelector('.wallet-distribution__slice[data-wallet-segment="available"]');
    if (defaultSegment) {
      currentSegmentKey = defaultSegment.dataset.walletSegment;
      activateSegment(defaultSegment.dataset.walletSegment, true);
    }
    openMain();
  };

  window.DokeInitWallet = initWallet;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWallet, { once: true });
  } else {
    initWallet();
  }
})();
