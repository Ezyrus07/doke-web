const { test, expect } = require('@playwright/test');

const WALLET_KEY = 'doke.wallet.local.v1';
const SESSION_KEY = 'doke.auth.session.v1';
const PROFESSIONAL_ID = 'user_wallet_acceptance';

const professionalSession = Object.freeze({
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  remember: false,
  user: Object.freeze({
    id: PROFESSIONAL_ID,
    name: 'Profissional Wallet QA',
    email: 'wallet-qa@example.test',
    role: 'professional',
    type: 'professional',
    initials: 'WQ',
    accountStatus: 'active',
  }),
});

function isoFromNow({ days = 0, hours = 0 } = {}) {
  return new Date(Date.now() + (days * 24 * 60 * 60 * 1000) + (hours * 60 * 60 * 1000)).toISOString();
}

function emptyWalletFixture() {
  return {
    version: 1,
    currency: 'BRL',
    transactions: [],
    bankAccounts: [],
    disputes: [],
    auditEvents: [],
    updatedAt: isoFromNow(),
  };
}

function richWalletFixture() {
  return {
    version: 1,
    currency: 'BRL',
    transactions: [
      {
        id: 'wallet_income_available',
        type: 'receivable',
        source: 'wallet-acceptance',
        status: 'available',
        professionalId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        orderId: 'order_wallet_available',
        grossAmount: 1000,
        feeAmount: 50,
        netAmount: 950,
        amount: 950,
        title: 'Identidade visual concluída',
        reference: 'PED-WALLET-001',
        method: 'Recebimento pela Doke',
        note: 'Valor liberado para saque.',
        createdAt: isoFromNow({ days: -5 }),
        availableAt: isoFromNow({ days: -5 }),
        updatedAt: isoFromNow({ days: -5 }),
      },
      {
        id: 'wallet_income_held',
        type: 'receivable',
        source: 'wallet-acceptance',
        status: 'held',
        professionalId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        orderId: 'order_wallet_held',
        grossAmount: 500,
        feeAmount: 25,
        netAmount: 475,
        amount: 475,
        title: 'Ensaio fotográfico em garantia',
        reference: 'PED-WALLET-002',
        method: 'Recebimento pela Doke',
        note: 'Pagamento confirmado em garantia.',
        expectedPayoutAt: isoFromNow({ days: 2 }),
        createdAt: isoFromNow({ days: -1 }),
        availableAt: isoFromNow({ days: -1 }),
        updatedAt: isoFromNow({ days: -1 }),
      },
      {
        id: 'wallet_withdraw_processing',
        type: 'withdraw',
        source: 'wallet-acceptance',
        status: 'processing',
        professionalId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        grossAmount: 100,
        feeAmount: 0,
        netAmount: 100,
        amount: 100,
        title: 'Saque solicitado',
        reference: 'SAQ-WALLET-001',
        method: 'Banco Teste · final 5678',
        destination: 'Banco Teste · final 5678',
        createdAt: isoFromNow({ hours: -6 }),
        availableAt: isoFromNow({ hours: -6 }),
        updatedAt: isoFromNow({ hours: -6 }),
      },
      {
        id: 'wallet_withdraw_completed',
        type: 'withdraw',
        source: 'wallet-acceptance',
        status: 'completed',
        professionalId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        grossAmount: 150,
        feeAmount: 0,
        netAmount: 150,
        amount: 150,
        title: 'Saque concluído',
        reference: 'SAQ-WALLET-002',
        method: 'Banco Teste · final 5678',
        destination: 'Banco Teste · final 5678',
        createdAt: isoFromNow({ days: -2 }),
        completedAt: isoFromNow({ days: -2 }),
        availableAt: isoFromNow({ days: -2 }),
        updatedAt: isoFromNow({ days: -2 }),
      },
      {
        id: 'wallet_withdraw_declined',
        type: 'withdraw',
        source: 'wallet-acceptance',
        status: 'declined',
        professionalId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        grossAmount: 75,
        feeAmount: 0,
        netAmount: 75,
        amount: 75,
        title: 'Saque recusado',
        reference: 'SAQ-WALLET-003',
        method: 'Banco Teste · final 5678',
        destination: 'Banco Teste · final 5678',
        note: 'Saque recusado para validação do estado visual.',
        createdAt: isoFromNow({ days: -3 }),
        declinedAt: isoFromNow({ days: -3 }),
        updatedAt: isoFromNow({ days: -3 }),
      },
    ],
    bankAccounts: [
      {
        id: 'wallet_bank_acceptance',
        ownerId: PROFESSIONAL_ID,
        userId: PROFESSIONAL_ID,
        bankName: 'Banco Teste',
        holderName: 'Profissional Wallet QA',
        accountType: 'Conta corrente',
        agency: '0001',
        accountNumber: '12345678',
        pixKey: 'wallet-qa@example.test',
        status: 'verified',
        nextPayout: 'Repasse automático após liberação',
        createdAt: isoFromNow({ days: -30 }),
        updatedAt: isoFromNow({ days: -1 }),
      },
    ],
    disputes: [],
    auditEvents: [],
    updatedAt: isoFromNow(),
  };
}

async function isolateRemoteDependencies(page, externalWrites) {
  await page.route('https://*.supabase.co/**', (route) => {
    const method = route.request().method().toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      externalWrites.push({ method, url: route.request().url() });
    }
    return route.abort();
  });
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
}

async function installRuntime(page, wallet) {
  await page.addInitScript(({ session, walletState, walletKey, sessionKey }) => {
    localStorage.setItem('doke.dataProvider', 'mock');
    localStorage.setItem(sessionKey, JSON.stringify(session));
    localStorage.setItem(walletKey, JSON.stringify(walletState));
    localStorage.removeItem('doke.security.audit.v1');
  }, {
    session: professionalSession,
    walletState: wallet,
    walletKey: WALLET_KEY,
    sessionKey: SESSION_KEY,
  });
}

async function bootWallet(page, wallet, externalWrites) {
  await isolateRemoteDependencies(page, externalWrites);
  await installRuntime(page, wallet);
  await page.goto('/carteira.html?dokeDataProvider=mock', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('body')).toHaveAttribute('data-page', 'carteira');
  await expect(page).not.toHaveURL(/\/auth\/login\.html/);
  await expect(page.locator('[data-wallet-hydration-ready]')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-wallet-hydration-skeleton]')).toBeHidden();

  await expect.poll(() => page.evaluate(() => (
    Math.max(document.body?.scrollWidth || 0, document.documentElement.scrollWidth) - window.innerWidth
  ))).toBeLessThanOrEqual(1);
}

async function attachWalletScreenshot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test.describe('UX-VISUAL-016 wallet financial state acceptance', () => {
  test.use({ locale: 'pt-BR' });

  test('empty wallet keeps zero-balance, no-bank and no-receivables states coherent', async ({ page }, testInfo) => {
    const externalWrites = [];
    await bootWallet(page, emptyWalletFixture(), externalWrites);

    await expect(page.locator('[data-wallet-balance-available]')).toContainText('0,00');
    await expect(page.locator('[data-wallet-balance-held]')).toContainText('0,00');
    await expect(page.locator('[data-wallet-next-payout]')).toHaveText('Após saldo');

    await expect(page.locator('[data-wallet-empty-state="transactions"]')).toBeVisible();
    await expect(page.locator('[data-wallet-transaction-list] [data-wallet-type]')).toHaveCount(0);

    await expect(page.locator('[data-wallet-empty-state="bank-account"]')).toBeVisible();
    await expect(page.locator('[data-wallet-bank-account-card]')).toBeHidden();

    await expect(page.locator('[data-wallet-receivables-status]')).toHaveText('Sem repasses');
    await expect(page.locator('[data-wallet-receivables-empty]')).toBeVisible();
    await expect(page.locator('[data-wallet-receivables-list] .wallet-receivable-row')).toHaveCount(0);
    await expect(page.locator('[data-wallet-receivable-next-amount]')).toContainText('0,00');

    await attachWalletScreenshot(page, testInfo, 'wallet-empty-state');
    expect(externalWrites).toEqual([]);
  });

  for (const viewport of [
    { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
    { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  ]) {
    test('rich wallet renders balance hierarchy, ledger, bank and receivables at ' + viewport.name, async ({ browser }, testInfo) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        locale: 'pt-BR',
      });
      const page = await context.newPage();
      const externalWrites = [];

      try {
        await bootWallet(page, richWalletFixture(), externalWrites);

        await expect(page.locator('[data-wallet-balance-available]')).toContainText('700,00');
        await expect(page.locator('[data-wallet-balance-held]')).toContainText('475,00');
        await expect(page.locator('[data-wallet-next-payout]')).toContainText('475,00');

        const ledger = page.locator('[data-wallet-transaction-list] [data-wallet-type]');
        await expect(ledger).toHaveCount(5);
        await expect(page.locator('[data-wallet-type="income"]')).toHaveCount(1);
        await expect(page.locator('[data-wallet-type="held"]')).toHaveCount(1);
        await expect(page.locator('[data-wallet-type="withdraw"]')).toHaveCount(3);
        await expect(page.locator('[data-wallet-type="withdraw"][data-transaction-raw-status="processing"]')).toHaveCount(1);
        await expect(page.locator('[data-wallet-type="withdraw"][data-transaction-raw-status="completed"]')).toHaveCount(1);
        await expect(page.locator('[data-wallet-type="withdraw"][data-transaction-raw-status="declined"]')).toHaveCount(1);

        await expect(page.locator('[data-wallet-empty-state="transactions"]')).toBeHidden();

        await expect(page.locator('[data-wallet-bank-account-card]')).toBeVisible();
        await expect(page.locator('[data-wallet-account-field="bankName"]')).toHaveText('Banco Teste');
        await expect(page.locator('[data-wallet-empty-state="bank-account"]')).toBeHidden();

        await expect(page.locator('[data-wallet-receivables-status]')).toHaveText('2 repasses');
        await expect(page.locator('[data-wallet-receivable-next-amount]')).toContainText('475,00');
        await expect(page.locator('[data-wallet-receivables-list] .wallet-receivable-row')).toHaveCount(2);
        await expect(page.locator('[data-wallet-receivables-empty]')).toBeHidden();

        await attachWalletScreenshot(page, testInfo, 'wallet-rich-' + viewport.name);

        // A non-empty schedule must expose the dedicated next-release surface.
        await expect(page.locator('[data-wallet-receivable-next-card]')).toBeVisible();

        expect(externalWrites).toEqual([]);
      } finally {
        await context.close();
      }
    });
  }

  test('withdraw validation rejects over-balance amount and accepts a valid local-only request', async ({ page }, testInfo) => {
    const externalWrites = [];
    await bootWallet(page, richWalletFixture(), externalWrites);

    await page.locator('[data-wallet-open-withdraw]').click();
    const modal = page.locator('[data-wallet-withdraw-modal]');
    const form = page.locator('[data-wallet-withdraw-form]');
    const amount = page.locator('[data-wallet-withdraw-amount]');
    const error = page.locator('[data-wallet-withdraw-error]');

    await expect(modal).toBeVisible();
    await expect(page.locator('[data-wallet-withdraw-available]')).toContainText('700,00');

    await amount.fill('701,00');
    await form.locator('button[type="submit"]').click();
    await expect(error).toBeVisible();
    await expect(error).toContainText('não pode passar do saldo disponível');

    const afterRejected = await page.evaluate((walletKey) => {
      const wallet = JSON.parse(localStorage.getItem(walletKey) || '{}');
      return Array.isArray(wallet.transactions) ? wallet.transactions.length : -1;
    }, WALLET_KEY);
    expect(afterRejected).toBe(5);

    await amount.fill('250,00');
    await form.locator('button[type="submit"]').click();

    await expect(modal).toBeHidden();
    await expect(page.locator('[data-wallet-balance-available]')).toContainText('450,00');
    await expect(page.locator('[data-wallet-transaction-list] [data-wallet-type]')).toHaveCount(6);

    const localEvidence = await page.evaluate((walletKey) => {
      const wallet = JSON.parse(localStorage.getItem(walletKey) || '{}');
      const transactions = Array.isArray(wallet.transactions) ? wallet.transactions : [];
      const created = transactions.find((item) => (
        item.type === 'withdraw'
        && item.status === 'processing'
        && Number(item.netAmount || item.amount || 0) === 250
      ));
      return {
        transactionCount: transactions.length,
        hasCreatedWithdraw: Boolean(created),
      };
    }, WALLET_KEY);

    expect(localEvidence).toEqual({
      transactionCount: 6,
      hasCreatedWithdraw: true,
    });

    await attachWalletScreenshot(page, testInfo, 'wallet-withdraw-after-local-request');
    expect(externalWrites).toEqual([]);
  });
});
