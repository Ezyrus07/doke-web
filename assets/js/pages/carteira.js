(() => {
  const PERIOD_DATA = {
    '7d': {
      total: 38,
      points: [2, 5, 4, 7, 6, 8, 6],
      labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
      funnel: [
        { label: 'Visualizações', value: 1280, percent: 100, tone: '#2f77bf' },
        { label: 'Cliques', value: 412, percent: 32, tone: '#2ba19a' },
        { label: 'Conversas', value: 96, percent: 7.5, tone: '#35b88f' },
        { label: 'Orçamentos', value: 28, percent: 2.2, tone: '#f5b04d' },
      ],
      origin: [
        { label: 'Busca', value: 46, color: '#2f77bf' },
        { label: 'Seguidores', value: 28, color: '#23a596' },
        { label: 'Avaliações', value: 16, color: '#61d79d' },
        { label: 'Portfólio', value: 10, color: '#f6b04b' },
      ],
    },
    '30d': {
      total: 164,
      points: [18, 24, 19, 27, 22, 29, 25],
      labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7'],
      funnel: [
        { label: 'Visualizações', value: 5460, percent: 100, tone: '#2f77bf' },
        { label: 'Cliques', value: 1730, percent: 31.6, tone: '#2ba19a' },
        { label: 'Conversas', value: 402, percent: 7.4, tone: '#35b88f' },
        { label: 'Orçamentos', value: 108, percent: 2, tone: '#f5b04d' },
      ],
      origin: [
        { label: 'Busca', value: 42, color: '#2f77bf' },
        { label: 'Seguidores', value: 24, color: '#23a596' },
        { label: 'Avaliações', value: 18, color: '#61d79d' },
        { label: 'Portfólio', value: 16, color: '#f6b04b' },
      ],
    },
    '90d': {
      total: 492,
      points: [52, 64, 59, 76, 71, 82, 88],
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
      funnel: [
        { label: 'Visualizações', value: 16200, percent: 100, tone: '#2f77bf' },
        { label: 'Cliques', value: 5180, percent: 32, tone: '#2ba19a' },
        { label: 'Conversas', value: 1188, percent: 7.3, tone: '#35b88f' },
        { label: 'Orçamentos', value: 326, percent: 2, tone: '#f5b04d' },
      ],
      origin: [
        { label: 'Busca', value: 39, color: '#2f77bf' },
        { label: 'Seguidores', value: 30, color: '#23a596' },
        { label: 'Avaliações', value: 17, color: '#61d79d' },
        { label: 'Portfólio', value: 14, color: '#f6b04b' },
      ],
    },
  };

  const HISTORY = [
    { type: 'income', title: 'Pedido concluído • Studio Aquarela', detail: 'Pintura residencial concluída • hoje, 09:14', value: '+R$ 820,00' },
    { type: 'withdraw', title: 'Saque automático', detail: 'PIX para Banco Inter • ontem, 08:01', value: '-R$ 1.200,00' },
    { type: 'fee', title: 'Taxa de intermediação', detail: 'Cobrança operacional • ontem, 08:01', value: '-R$ 48,00' },
    { type: 'income', title: 'Pedido concluído • Casa Viva Reformas', detail: 'Execução finalizada • seg, 14:40', value: '+R$ 1.640,00' },
    { type: 'income', title: 'Pedido concluído • Luz Técnica', detail: 'Atendimento elétrico • sáb, 17:08', value: '+R$ 420,00' },
    { type: 'fee', title: 'Reserva operacional', detail: 'Separação automática • sáb, 17:08', value: '-R$ 33,60' },
  ];

  const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value);

  const initWalletPage = () => {
    const root = document.querySelector('[data-wallet-page]');
    if (!root || root.dataset.walletReady === 'true') return;
    root.dataset.walletReady = 'true';

    const chart = root.querySelector('[data-wallet-chart]');
    const leadsTotal = root.querySelector('[data-wallet-leads-total]');
    const dayStrip = root.querySelector('[data-wallet-day-strip]');
    const funnel = root.querySelector('[data-wallet-funnel]');
    const originList = root.querySelector('[data-wallet-origin-list]');
    const originRing = root.querySelector('[data-wallet-origin-ring]');
    const statementPanel = root.querySelector('[data-wallet-statement]');
    const settingsPanel = root.querySelector('[data-wallet-settings]');
    const overviewPanel = root.querySelector('[data-wallet-overview]');
    const historyList = root.querySelector('[data-wallet-history-list]');
    const overlay = document.querySelector('[data-wallet-withdraw-overlay]');
    const withdrawForm = document.querySelector('[data-wallet-withdraw-form]');
    const periodButtons = Array.from(root.querySelectorAll('[data-wallet-period]'));
    const modeButtons = Array.from(root.querySelectorAll('[data-wallet-mode-trigger]'));
    const filterButtons = Array.from(root.querySelectorAll('[data-wallet-filter]'));
    const withdrawOpeners = Array.from(root.querySelectorAll('[data-wallet-open-withdraw]'));
    const withdrawClosers = Array.from(document.querySelectorAll('[data-wallet-withdraw-close]'));

    const renderOverview = (period) => {
      const data = PERIOD_DATA[period];
      if (!data) return;

      leadsTotal.textContent = formatNumber(data.total);
      chart.innerHTML = data.points
        .map((value, index) => {
          const ratio = Math.max(18, Math.round((value / Math.max(...data.points)) * 100));
          return `
            <article class="wallet-chart-point" tabindex="0" aria-label="${data.labels[index]}: ${value} leads">
              <div class="wallet-chart-point__track">
                <i class="wallet-chart-point__dot" style="margin-bottom:${ratio}%;"></i>
              </div>
              <div class="wallet-chart-point__label"><span>${data.labels[index]}</span><strong>${value}</strong></div>
            </article>
          `;
        })
        .join('');

      dayStrip.innerHTML = data.labels
        .map((label, index) => `<span>${label}<strong>${data.points[index]}</strong></span>`)
        .join('');

      funnel.innerHTML = data.funnel
        .map(
          (item) => `
            <article class="wallet-funnel-row">
              <div class="wallet-funnel-row__meta">
                <span>${item.label}</span>
                <strong>${formatNumber(item.value)}</strong>
              </div>
              <div class="wallet-funnel-row__track"><i style="width:${item.percent}%; background:${item.tone};"></i></div>
            </article>
          `
        )
        .join('');

      originList.innerHTML = data.origin
        .map(
          (item) => `
            <article class="wallet-origin-item" style="--dot:${item.color}">
              <div class="wallet-origin-item__meta">
                <i class="wallet-origin-item__dot"></i>
                <strong>${item.label}</strong>
              </div>
              <b>${item.value}%</b>
              <div class="wallet-origin-item__track"><i style="width:${item.value}%; background:${item.color};"></i></div>
            </article>
          `
        )
        .join('');

      const segments = [];
      let cursor = 0;
      data.origin.forEach((item) => {
        segments.push(`${item.color} ${cursor}% ${cursor + item.value}%`);
        cursor += item.value;
      });
      originRing.style.setProperty('--ring', `conic-gradient(${segments.join(', ')})`);
    };

    const renderHistory = (filter = 'all') => {
      const items = filter === 'all' ? HISTORY : HISTORY.filter((item) => item.type === filter);
      historyList.innerHTML = items
        .map((item) => {
          const tone = item.type === 'income' ? 'positive' : item.type === 'withdraw' ? 'negative' : 'warning';
          return `
            <article class="wallet-history-item">
              <div class="wallet-history-item__meta">
                <span>${item.type === 'income' ? 'Entrada' : item.type === 'withdraw' ? 'Saque' : 'Taxa'}</span>
                <strong>${item.title}</strong>
                <p>${item.detail}</p>
              </div>
              <div class="wallet-history-item__value wallet-history-item__value--${tone}">${item.value}</div>
            </article>
          `;
        })
        .join('');
    };

    const setMode = (mode) => {
      root.dataset.walletMode = mode;
      const showOverview = mode === 'overview';
      const showStatement = mode === 'statement';
      const showSettings = mode === 'settings';
      overviewPanel.hidden = !showOverview;
      statementPanel.hidden = !showStatement;
      settingsPanel.hidden = !showSettings;
      modeButtons.forEach((button) => button.classList.toggle('is-active', button.dataset.walletModeTrigger === mode));
      if (showStatement) {
        statementPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (showSettings) {
        settingsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    periodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        periodButtons.forEach((node) => {
          const isActive = node === button;
          node.classList.toggle('is-active', isActive);
          node.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        renderOverview(button.dataset.walletPeriod);
      });
    });

    modeButtons.forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.walletModeTrigger));
    });

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        filterButtons.forEach((node) => node.classList.toggle('is-active', node === button));
        renderHistory(button.dataset.walletFilter);
      });
    });

    withdrawOpeners.forEach((button) => {
      button.addEventListener('click', () => {
        overlay.hidden = false;
        document.body.classList.add('has-modal-open');
      });
    });

    withdrawClosers.forEach((button) => {
      button.addEventListener('click', () => {
        overlay.hidden = true;
        document.body.classList.remove('has-modal-open');
      });
    });

    withdrawForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const primaryButton = withdrawForm.querySelector('.wallet-submit');
      primaryButton.textContent = 'Solicitação enviada';
      window.setTimeout(() => {
        overlay.hidden = true;
        document.body.classList.remove('has-modal-open');
        primaryButton.textContent = 'Confirmar saque';
      }, 1000);
    });

    renderOverview('7d');
    renderHistory('all');
    setMode('overview');
  };

  window.DokeInitWallet = initWalletPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWalletPage, { once: true });
  } else {
    initWalletPage();
  }
})();
