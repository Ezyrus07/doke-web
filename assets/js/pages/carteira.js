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
    const statementPeriodSelect = document.querySelector('[data-wallet-statement-period]');
    const statementSearchInput = document.querySelector('[data-wallet-statement-search]');
    const statementExportButton = document.querySelector('[data-wallet-export-statement]');
    const headerSearchInput = document.querySelector('#wallet-search-input');

    let currentBankAccount = null;
    let currentWallet = null;
    let walletRefreshTimer = null;
    let statementSearchTimer = null;
    let activeTransactionDetailId = '';
    let activeStatementFilter = filterButtons.find((button) => button.classList.contains('is-active'))?.dataset.walletFilter || 'all';
    let activeStatementPeriod = statementPeriodSelect?.value || 'all';
    let activeStatementQuery = '';
    let activeAnalyticsPeriod = 'current-month';

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

    const monthlyMetricFields = {
      periodLabel: document.querySelector('[data-wallet-monthly-metric="period-label"]'),
      grossIncome: document.querySelector('[data-wallet-monthly-metric="gross-income"]'),
      netIncome: document.querySelector('[data-wallet-monthly-metric="net-income"]'),
      fees: document.querySelector('[data-wallet-monthly-metric="fees"]'),
      ticketAverage: document.querySelector('[data-wallet-monthly-metric="ticket-average"]'),
      paidOrders: document.querySelector('[data-wallet-monthly-metric="paid-orders"]'),
      withdrawalsCount: document.querySelector('[data-wallet-monthly-metric="withdrawals-count"]'),
      availableBalance: document.querySelector('[data-wallet-monthly-metric="available-balance"]'),
      heldBalance: document.querySelector('[data-wallet-monthly-metric="held-balance"]'),
      processingWithdrawals: document.querySelector('[data-wallet-monthly-metric="processing-withdrawals"]'),
      distributionTotal: document.querySelector('[data-wallet-monthly-metric="distribution-total"]'),
      largestMovement: document.querySelector('[data-wallet-monthly-metric="largest-movement"]'),
      largestMovementLabel: document.querySelector('[data-wallet-monthly-metric="largest-movement-label"]')
    };

    const analyticsPeriodButtons = Array.from(document.querySelectorAll('[data-wallet-analytics-period]'));
    const chartNodes = {
      flowSvg: document.querySelector('[data-wallet-chart-svg="financial-flow"]'),
      flowLabels: document.querySelector('[data-wallet-chart-labels="financial-flow"]'),
      flowLevels: document.querySelector('[data-wallet-chart-levels="financial-flow"]'),
      distributionSvg: document.querySelector('[data-wallet-chart-svg="balance-distribution"]'),
      activitySvg: document.querySelector('[data-wallet-chart-svg="activity-bars"]'),
      progressAvailable: document.querySelector('[data-wallet-progress="available"]'),
      progressHeld: document.querySelector('[data-wallet-progress="held"]'),
      progressProcessing: document.querySelector('[data-wallet-progress="processing"]')
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

    const normalizeSearchValue = (value) => String(value || '')
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const getFilterLabel = (filter) => {
      const labels = {
        all: 'Todos',
        income: 'Entradas',
        withdraw: 'Saques',
        held: 'Em garantia',
        available: 'Liberados',
        processing: 'Em processamento',
        completed: 'Concluídos'
      };
      return labels[filter] || labels.all;
    };

    const getPeriodLabel = (period) => {
      const labels = {
        all: 'Todo período',
        today: 'Hoje',
        '7-days': '7 dias',
        '30-days': '30 dias',
        'current-month': 'Mês atual'
      };
      return labels[period] || labels.all;
    };

    const getStatementFilters = () => ({
      currentUser: true,
      category: activeStatementFilter || 'all',
      period: activeStatementPeriod || 'all',
      query: activeStatementQuery || ''
    });

    const hasActiveStatementRefinement = () => {
      return (activeStatementFilter && activeStatementFilter !== 'all')
        || (activeStatementPeriod && activeStatementPeriod !== 'all')
        || Boolean(activeStatementQuery);
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
      const grossAmount = Number(transaction.grossAmount || transaction.netAmount || transaction.amount || 0);
      const feeAmount = Number(transaction.feeAmount || 0);
      const receiptGross = formatCurrency(grossAmount);
      const receiptFee = formatCurrency(feeAmount);
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

    const createSvgElement = (tagName, attrs = {}) => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
      Object.entries(attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) element.setAttribute(name, String(value));
      });
      return element;
    };

    const clearNode = (node) => {
      if (!node) return;
      while (node.firstChild) node.removeChild(node.firstChild);
    };

    const formatCompactCurrency = (value) => {
      const amount = Number(value || 0);
      if (Math.abs(amount) >= 1000) return 'R$ ' + Math.round(amount / 1000) + 'k';
      return 'R$ ' + Math.round(amount);
    };

    const getChartSeries = (dashboard) => {
      const series = dashboard?.chartSeries || {};
      const labels = Array.isArray(series.labels) && series.labels.length ? series.labels : ['—'];
      const normalizeSeries = (values) => labels.map((_, index) => Number(Array.isArray(values) ? values[index] || 0 : 0));
      return {
        labels,
        netIncome: normalizeSeries(series.netIncome),
        withdrawals: normalizeSeries(series.withdrawals),
        fees: normalizeSeries(series.fees),
        paidOrders: normalizeSeries(series.paidOrders)
      };
    };

    const pointsToPath = (points) => points.map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return command + point.x.toFixed(1) + ' ' + point.y.toFixed(1);
    }).join(' ');

    const renderFinancialFlowChart = (dashboard) => {
      const svg = chartNodes.flowSvg;
      if (!svg) return;
      clearNode(svg);
      clearNode(chartNodes.flowLabels);
      clearNode(chartNodes.flowLevels);

      const chart = getChartSeries(dashboard);
      const width = 700;
      const height = 240;
      const padding = { top: 18, right: 18, bottom: 18, left: 10 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;
      const allValues = chart.netIncome.concat(chart.withdrawals, chart.fees).map(Math.abs);
      const maxValue = Math.max(1, ...allValues);
      const safeStep = chart.labels.length > 1 ? plotWidth / (chart.labels.length - 1) : plotWidth;
      const makePoints = (values) => values.map((value, index) => ({
        x: padding.left + (chart.labels.length > 1 ? safeStep * index : plotWidth / 2),
        y: padding.top + plotHeight - (Math.abs(value) / maxValue) * plotHeight
      }));

      [0, 0.5, 1].forEach((ratio) => {
        const y = padding.top + plotHeight - (plotHeight * ratio);
        svg.appendChild(createSvgElement('line', {
          class: 'wallet-line-chart__grid-line',
          x1: padding.left,
          x2: width - padding.right,
          y1: y,
          y2: y
        }));
      });

      const incomePoints = makePoints(chart.netIncome);
      const withdrawPoints = makePoints(chart.withdrawals);
      const feePoints = makePoints(chart.fees);
      if (incomePoints.length) {
        const areaPath = pointsToPath(incomePoints)
          + ' L ' + incomePoints[incomePoints.length - 1].x.toFixed(1) + ' ' + (height - padding.bottom).toFixed(1)
          + ' L ' + incomePoints[0].x.toFixed(1) + ' ' + (height - padding.bottom).toFixed(1) + ' Z';
        svg.appendChild(createSvgElement('path', { class: 'wallet-line-chart__area', d: areaPath }));
      }

      [
        ['wallet-line-chart__line wallet-line-chart__line--income', incomePoints],
        ['wallet-line-chart__line wallet-line-chart__line--withdraw', withdrawPoints],
        ['wallet-line-chart__line wallet-line-chart__line--fee', feePoints]
      ].forEach(([className, points]) => {
        svg.appendChild(createSvgElement('path', { class: className, d: pointsToPath(points) }));
      });

      [
        ['wallet-line-chart__points wallet-line-chart__points--income', incomePoints],
        ['wallet-line-chart__points wallet-line-chart__points--withdraw', withdrawPoints],
        ['wallet-line-chart__points wallet-line-chart__points--fee', feePoints]
      ].forEach(([className, points]) => {
        const group = createSvgElement('g', { class: className });
        points.forEach((point, index) => {
          const circle = createSvgElement('circle', { cx: point.x.toFixed(1), cy: point.y.toFixed(1), r: 4 });
          circle.appendChild(createSvgElement('title'));
          circle.firstChild.textContent = chart.labels[index];
          group.appendChild(circle);
        });
        svg.appendChild(group);
      });

      [maxValue, maxValue / 2, 0].forEach((level) => {
        const label = document.createElement('span');
        label.textContent = formatCompactCurrency(level);
        chartNodes.flowLevels?.appendChild(label);
      });

      chart.labels.forEach((labelText) => {
        const label = document.createElement('span');
        label.textContent = labelText;
        chartNodes.flowLabels?.appendChild(label);
      });
    };

    const renderDistributionChart = (dashboard) => {
      const svg = chartNodes.distributionSvg;
      if (!svg) return;
      clearNode(svg);
      const available = Math.max(0, Number(dashboard?.availableBalance || 0));
      const held = Math.max(0, Number(dashboard?.heldBalance || 0));
      const processing = Math.max(0, Number(dashboard?.processingWithdrawals || 0));
      const total = Math.max(available + held + processing, 0);
      const center = 110;
      const radius = 76;
      const circumference = 2 * Math.PI * radius;
      let offset = 0;
      const segments = [
        ['wallet-donut-chart__segment wallet-donut-chart__segment--available', available],
        ['wallet-donut-chart__segment wallet-donut-chart__segment--held', held],
        ['wallet-donut-chart__segment wallet-donut-chart__segment--processing', processing]
      ];

      svg.appendChild(createSvgElement('circle', {
        class: 'wallet-donut-chart__track', cx: center, cy: center, r: radius
      }));

      segments.forEach(([className, value]) => {
        const ratio = total > 0 ? value / total : 0;
        const dash = Math.max(0, ratio * circumference);
        const circle = createSvgElement('circle', {
          class: className,
          cx: center,
          cy: center,
          r: radius,
          'stroke-dasharray': dash.toFixed(2) + ' ' + Math.max(0, circumference - dash).toFixed(2),
          'stroke-dashoffset': (-offset).toFixed(2),
          transform: 'rotate(-90 110 110)'
        });
        circle.appendChild(createSvgElement('title'));
        circle.firstChild.textContent = formatCurrency(value);
        svg.appendChild(circle);
        offset += dash;
      });

      setText(monthlyMetricFields.distributionTotal, formatCurrency(total));

      const setMeter = (node, value) => {
        if (!node) return;
        const percent = total > 0 ? Math.round((value / total) * 100) : 0;
        node.value = percent;
        node.textContent = percent + '%';
      };
      setMeter(chartNodes.progressAvailable, available);
      setMeter(chartNodes.progressHeld, held);
      setMeter(chartNodes.progressProcessing, processing);
    };

    const renderActivityChart = (dashboard) => {
      const svg = chartNodes.activitySvg;
      if (!svg) return;
      clearNode(svg);
      const values = [
        { label: 'Pedidos', value: Number(dashboard?.paidOrders || 0), className: 'wallet-bar-chart__bar wallet-bar-chart__bar--orders' },
        { label: 'Saques', value: Number(dashboard?.withdrawalsCount || 0), className: 'wallet-bar-chart__bar wallet-bar-chart__bar--withdrawals' },
        { label: 'Mov.', value: Number(dashboard?.largestMovement?.amount || 0), className: 'wallet-bar-chart__bar wallet-bar-chart__bar--movement', compact: true }
      ];
      const width = 420;
      const height = 220;
      const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)));
      values.forEach((item, index) => {
        const barWidth = 72;
        const gap = 54;
        const x = 52 + index * (barWidth + gap);
        const barHeight = Math.max(6, Math.round((Math.abs(item.value) / maxValue) * 132));
        const y = 156 - barHeight;
        svg.appendChild(createSvgElement('rect', {
          class: item.className,
          x,
          y,
          width: barWidth,
          height: barHeight,
          rx: 14
        }));
        const valueText = createSvgElement('text', { class: 'wallet-bar-chart__value', x: x + barWidth / 2, y: y - 12, 'text-anchor': 'middle' });
        valueText.textContent = item.compact ? formatCompactCurrency(item.value) : String(item.value || 0);
        svg.appendChild(valueText);
        const labelText = createSvgElement('text', { class: 'wallet-bar-chart__label', x: x + barWidth / 2, y: 192, 'text-anchor': 'middle' });
        labelText.textContent = item.label;
        svg.appendChild(labelText);
      });
    };

    const renderAnalyticsCharts = (dashboard) => {
      renderFinancialFlowChart(dashboard || {});
      renderDistributionChart(dashboard || {});
      renderActivityChart(dashboard || {});
    };

    const syncAnalyticsPeriodButtons = () => {
      analyticsPeriodButtons.forEach((button) => {
        const isActive = button.dataset.walletAnalyticsPeriod === activeAnalyticsPeriod;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    };

    const refreshAnalyticsDashboard = () => {
      const service = getWalletService();
      if (!service || typeof service.getMonthlyDashboard !== 'function') return Promise.resolve(null);
      return service.getMonthlyDashboard({ currentUser: true, period: activeAnalyticsPeriod }).then((dashboard) => {
        syncMonthlyDashboard(dashboard || {});
        return dashboard;
      }).catch(() => null);
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

    const syncMonthlyDashboard = (dashboard) => {
      const nextDashboard = dashboard || {};
      const largestMovement = nextDashboard.largestMovement || {};
      setText(monthlyMetricFields.periodLabel, nextDashboard.periodLabel || getPeriodLabel(activeAnalyticsPeriod));
      setText(monthlyMetricFields.grossIncome, formatCurrency(nextDashboard.grossIncome || 0));
      setText(monthlyMetricFields.netIncome, formatCurrency(nextDashboard.netIncome || 0));
      setText(monthlyMetricFields.fees, formatCurrency(nextDashboard.fees || 0));
      setText(monthlyMetricFields.ticketAverage, formatCurrency(nextDashboard.ticketAverage || 0));
      setText(monthlyMetricFields.paidOrders, String(nextDashboard.paidOrders || 0));
      setText(monthlyMetricFields.withdrawalsCount, String(nextDashboard.withdrawalsCount || 0));
      setText(monthlyMetricFields.availableBalance, formatCurrency(nextDashboard.availableBalance || 0));
      setText(monthlyMetricFields.heldBalance, formatCurrency(nextDashboard.heldBalance || 0));
      setText(monthlyMetricFields.processingWithdrawals, formatCurrency(nextDashboard.processingWithdrawals || 0));
      setText(monthlyMetricFields.largestMovement, formatCurrency(largestMovement.amount || 0));
      setText(monthlyMetricFields.largestMovementLabel, largestMovement.title || 'Sem movimentações');
      renderAnalyticsCharts(nextDashboard);
      syncAnalyticsPeriodButtons();
    };

    const syncWalletSummary = (wallet) => {
      if (!wallet) return;
      currentWallet = wallet;
      const dashboard = wallet.monthlyDashboard || {};
      const available = Number(wallet.availableBalance || 0);
      setText(walletFields.available, formatCurrency(available));
      setText(withdrawAvailableNode, formatCurrency(available));
      setText(walletFields.held, formatCurrency(wallet.pendingBalance || 0));
      setText(walletFields.monthlyIncome, formatCurrency(wallet.monthlyIncome || dashboard.netIncome || 0));
      setText(walletFields.heldBalance, formatCurrency(wallet.pendingBalance || 0));
      setText(walletFields.withdrawals, formatCurrency(wallet.withdrawals || dashboard.withdrawals || 0));
      setText(walletFields.fees, formatCurrency(wallet.fees || dashboard.fees || 0));
      syncMonthlyDashboard(dashboard);
      refreshAnalyticsDashboard();
      if (walletFields.balanceCopy) walletFields.balanceCopy.textContent = wallet.localTransactions?.length ? 'Saldo atualizado pelos pedidos concluídos' : 'Sem saldo liberado no momento';
      if (walletFields.heldCopy) walletFields.heldCopy.textContent = wallet.pendingBalance > 0 ? 'Liberado após confirmação' : 'Sem valores pendentes';
    };

    const renderWalletTransactions = (wallet) => {
      if (!transactionList || !wallet) return Promise.resolve([]);
      const service = getWalletService();
      const filters = getStatementFilters();
      const fallbackTransactions = Array.isArray(wallet.localTransactions) ? wallet.localTransactions : [];
      const request = service?.listTransactions
        ? service.listTransactions(filters)
        : Promise.resolve(fallbackTransactions);

      return request.then((statementTransactions) => {
        const flowTransactions = Array.isArray(statementTransactions) ? statementTransactions : fallbackTransactions;
        transactionList.querySelectorAll('[data-wallet-type]').forEach((item) => item.remove());
        flowTransactions.slice().reverse().forEach((transaction) => {
          transactionList.prepend(createWalletTransactionElement(transaction));
        });
        transactions = Array.from(transactionList.querySelectorAll('[data-wallet-type]'));
        bindTransactionItems();
        updateTransactionEmptyState();
        openTransactionFromUrl();
        return flowTransactions;
      });
    };

    const loadWalletState = () => {
      const service = getWalletService();
      if (!service?.getWallet) return Promise.resolve(null);
      return service.getWallet({ currentUser: true })
        .then((wallet) => {
          syncWalletSummary(wallet);
          syncBankAccount(wallet.bankAccount || null);
          return renderWalletTransactions(wallet).then(() => wallet);
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
      const title = transactionEmptyState.querySelector('strong');
      const copy = transactionEmptyState.querySelector('p');
      const hasRefinement = hasActiveStatementRefinement();
      transactionEmptyState.hidden = visibleTransactions.length > 0;
      if (title) title.textContent = hasRefinement ? 'Nenhuma movimentação encontrada para este filtro' : 'Nenhuma movimentação encontrada';
      if (copy) {
        copy.textContent = hasRefinement
          ? `Ajuste o filtro ${getFilterLabel(activeStatementFilter).toLowerCase()}, o período ${getPeriodLabel(activeStatementPeriod).toLowerCase()} ou a busca para ver outros resultados.`
          : 'Entradas, saques, taxas e valores em garantia aparecerão aqui.';
      }
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

    const refreshStatementTransactions = () => {
      if (!currentWallet) return Promise.resolve([]);
      return renderWalletTransactions(currentWallet);
    };

    const syncStatementSearchInputs = (value, source) => {
      const nextValue = value || '';
      if (statementSearchInput && source !== statementSearchInput) statementSearchInput.value = nextValue;
      if (headerSearchInput && source !== headerSearchInput) headerSearchInput.value = nextValue;
    };

    const setTransactionFilter = (filter, options = {}) => {
      const validFilters = ['all', 'income', 'withdraw', 'held', 'available', 'processing', 'completed'];
      const nextFilter = validFilters.includes(filter) ? filter : 'all';
      activeStatementFilter = nextFilter;

      filterButtons.forEach((button) => {
        const isActiveButton = button.dataset.walletFilter === nextFilter;
        button.classList.toggle('is-active', isActiveButton);
        button.setAttribute('aria-pressed', String(isActiveButton));
      });

      updateTransactionEmptyState();
      if (!options.skipRender) refreshStatementTransactions();
    };

    const setStatementPeriod = (period, options = {}) => {
      activeStatementPeriod = period || 'all';
      if (statementPeriodSelect && statementPeriodSelect.value !== activeStatementPeriod) {
        statementPeriodSelect.value = activeStatementPeriod;
      }
      updateTransactionEmptyState();
      if (!options.skipRender) refreshStatementTransactions();
    };

    const setStatementQuery = (query, source, options = {}) => {
      activeStatementQuery = normalizeSearchValue(query || '');
      syncStatementSearchInputs(query || '', source);
      updateTransactionEmptyState();
      if (!options.skipRender) refreshStatementTransactions();
    };

    const scheduleStatementQueryUpdate = (value, source) => {
      window.clearTimeout(statementSearchTimer);
      statementSearchTimer = window.setTimeout(() => {
        setStatementQuery(value, source);
      }, 120);
    };

    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        setTransactionFilter(button.dataset.walletFilter);
      });
    });

    statementPeriodSelect?.addEventListener('change', () => {
      setStatementPeriod(statementPeriodSelect.value);
    });

    statementSearchInput?.addEventListener('input', () => {
      scheduleStatementQueryUpdate(statementSearchInput.value, statementSearchInput);
    });

    headerSearchInput?.addEventListener('input', () => {
      scheduleStatementQueryUpdate(headerSearchInput.value, headerSearchInput);
    });

    const escapeCsvField = (value) => {
      const text = String(value ?? '');
      return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const formatExportDate = (value) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getExportTypeLabel = (transaction) => {
      const type = getTransactionType(transaction);
      if (type === 'withdraw') return 'Saque';
      if (type === 'held') return 'Em garantia';
      if (type === 'fee') return 'Taxa';
      return 'Entrada';
    };

    const getExportStatusLabel = (transaction) => {
      return getTransactionStatusLabel(getTransactionType(transaction), transaction);
    };

    const buildStatementCsv = (statementTransactions) => {
      const rows = [];
      const exportedTransactions = Array.isArray(statementTransactions) ? statementTransactions : [];
      const totals = exportedTransactions.reduce((summary, transaction) => {
        const type = getTransactionType(transaction);
        const amount = Number(transaction.netAmount || transaction.amount || 0);
        const feeAmount = Number(transaction.feeAmount || 0);
        if (type === 'withdraw') summary.withdrawals += Math.abs(amount);
        else if (type === 'fee') summary.fees += Math.abs(amount);
        else {
          summary.income += Math.abs(amount);
          summary.fees += Math.abs(feeAmount);
        }
        summary.finalBalance += type === 'withdraw' || type === 'fee' ? -Math.abs(amount) : Math.abs(amount);
        return summary;
      }, { income: 0, withdrawals: 0, fees: 0, finalBalance: 0 });

      rows.push(['Extrato Doke']);
      rows.push(['Filtro', getFilterLabel(activeStatementFilter)]);
      rows.push(['Período', getPeriodLabel(activeStatementPeriod)]);
      rows.push(['Busca', activeStatementQuery || 'Sem busca']);
      rows.push(['Gerado em', formatExportDate(new Date().toISOString())]);
      rows.push(['Saldo inicial mockado', formatCurrency(0)]);
      rows.push(['Entradas', formatCurrency(totals.income)]);
      rows.push(['Saques', formatCurrency(totals.withdrawals)]);
      rows.push(['Taxas', formatCurrency(totals.fees)]);
      rows.push(['Saldo final do filtro', formatCurrency(totals.finalBalance)]);
      rows.push([]);
      rows.push(['Data', 'Tipo', 'Status', 'Serviço/descrição', 'Referência', 'Método/Destino', 'Valor bruto', 'Taxa Doke', 'Valor líquido']);

      exportedTransactions.forEach((transaction) => {
        rows.push([
          formatExportDate(transaction.completedAt || transaction.availableAt || transaction.updatedAt || transaction.createdAt),
          getExportTypeLabel(transaction),
          getExportStatusLabel(transaction),
          transaction.title || transaction.description || 'Movimentação',
          transaction.reference || transaction.orderId || transaction.id || '',
          transaction.destination || transaction.method || '',
          formatCurrency(Number(transaction.grossAmount || transaction.netAmount || transaction.amount || 0)),
          formatCurrency(Number(transaction.feeAmount || 0)),
          formatCurrency(Number(transaction.netAmount || transaction.amount || 0))
        ]);
      });

      return rows.map((row) => row.map(escapeCsvField).join(';')).join('\n');
    };

    const downloadStatementCsv = (csv) => {
      const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().slice(0, 10);
      const link = document.createElement('a');
      link.href = url;
      link.download = `doke-extrato-${today}.csv`;
      link.rel = 'noopener';
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    };

    const exportStatement = () => {
      const service = getWalletService();
      const request = service?.listTransactions
        ? service.listTransactions(getStatementFilters())
        : Promise.resolve(Array.isArray(currentWallet?.localTransactions) ? currentWallet.localTransactions : []);

      statementExportButton?.setAttribute('aria-busy', 'true');
      statementExportButton?.setAttribute('disabled', '');

      request
        .then((statementTransactions) => {
          downloadStatementCsv(buildStatementCsv(statementTransactions));
          showWalletToast('Extrato exportado em CSV.');
        })
        .catch((error) => {
          console.warn('[DokeWallet:export]', error);
          showWalletToast('Não foi possível exportar o extrato.', 'error');
        })
        .finally(() => {
          statementExportButton?.removeAttribute('aria-busy');
          statementExportButton?.removeAttribute('disabled');
        });
    };

    statementExportButton?.addEventListener('click', exportStatement);

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

    analyticsPeriodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextPeriod = button.dataset.walletAnalyticsPeriod || 'current-month';
        if (nextPeriod === activeAnalyticsPeriod) return;
        activeAnalyticsPeriod = nextPeriod;
        syncAnalyticsPeriodButtons();
        refreshAnalyticsDashboard();
      });
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
