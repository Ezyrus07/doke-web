const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outputRoot = process.env.DOKE_TRANSACTION_WALKTHROUGH_OUTPUT || path.join(process.cwd(), 'reports/generated/transaction-walkthrough');
const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const professionalId = 'visual-professional';
const transaction = {
  id: 'transaction_visual_001',
  type: 'receivable',
  kind: 'service_payment',
  status: 'available',
  professionalId,
  userId: professionalId,
  amount: 95,
  netAmount: 95,
  grossAmount: 100,
  feeAmount: 5,
  title: 'Pagamento liberado',
  description: 'Pagamento liberado — Pintura residencial completa',
  orderId: 'order_visual_001',
  conversationId: 'conversation_visual_001',
  createdAt: '2026-07-22T18:30:00.000Z',
  availableAt: '2026-07-22T18:30:00.000Z',
};

function seedWallet(payload) {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('doke.dataProvider', 'mock');
  localStorage.setItem('doke.auth.session.v1', JSON.stringify({
    provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
    user: { id: payload.professionalId, role: 'professional', type: 'professional', name: 'Marina Profissional', email: 'visual-professional@example.test', accountStatus: 'active' },
  }));
  localStorage.setItem('doke.wallet.local.v1', JSON.stringify({
    version: 1,
    currency: 'BRL',
    transactions: [payload.transaction],
    bankAccounts: [],
    disputes: [],
    auditEvents: [],
    updatedAt: payload.transaction.createdAt,
  }));
}

for (const viewport of viewports) {
  test.describe(`wallet semantic walkthrough ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch, deviceScaleFactor: 1 });

    test('carteira materializa R$ 95,00 liberados', async ({ page }) => {
      await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      await page.route('https://fonts.gstatic.com/**', route => route.abort());
      await page.addInitScript(seedWallet, { professionalId, transaction });
      await page.goto('/carteira.html');
      await page.waitForLoadState('networkidle').catch(() => {});
      await expect(page.locator('[data-wallet-balance-available]')).toContainText('R$ 95,00');
      await expect(page.locator('body')).toContainText('Pagamento liberado');

      const health = await page.evaluate(() => ({
        page: document.body?.dataset.page || '',
        available: document.querySelector('[data-wallet-balance-available]')?.textContent?.trim() || '',
        horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) > document.documentElement.clientWidth + 1,
      }));
      expect(health).toMatchObject({ page: 'carteira', available: 'R$ 95,00', horizontalOverflow: false });

      const dir = path.join(outputRoot, viewport.name);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, '07-carteira-liberada.json'), JSON.stringify(health, null, 2));
      await page.screenshot({ path: path.join(dir, '07-carteira-liberada.png'), fullPage: true, animations: 'disabled' });
    });
  });
}
