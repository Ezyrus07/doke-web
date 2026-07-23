const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const outputRoot = process.env.DOKE_TRANSACTION_WALKTHROUGH_OUTPUT || path.join(process.cwd(), 'reports/generated/transaction-walkthrough');

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const professionalId = 'user_visual_professional';
const clientSession = {
  provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
  user: { id: 'visual-client', role: 'client', type: 'client', name: 'Gabriel Cliente', email: 'visual-client@example.test', accountStatus: 'active' },
};
const professionalSession = {
  provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
  user: { id: professionalId, role: 'professional', type: 'professional', name: 'Marina Profissional', email: 'visual-professional@example.test', accountStatus: 'active' },
};

const order = {
  id: 'order_visual_001', clientId: 'visual-client', professionalId: 'visual-professional', providerId: 'visual-professional',
  clientName: 'Gabriel Cliente', providerName: 'Marina Profissional', professionalName: 'Marina Profissional',
  serviceTitle: 'Pintura residencial completa', status: 'quoted', budget: 'R$ 280,00', proposalAmount: 'R$ 280,00',
  chargeMessageId: 'charge_visual_001', createdAt: '2026-07-22T18:00:00.000Z', updatedAt: '2026-07-22T18:15:00.000Z',
};
const conversation = {
  id: 'conversation_visual_001', orderId: order.id, clientId: 'visual-client', professionalId: 'visual-professional',
  participants: ['visual-client', 'visual-professional'], order,
  messages: [
    { id: 'message_visual_001', type: 'text', senderId: 'visual-client', text: 'Olá, gostaria de confirmar os detalhes do serviço.', body: 'Olá, gostaria de confirmar os detalhes do serviço.', createdAt: '2026-07-22T18:02:00.000Z' },
    { id: 'charge_visual_001', type: 'charge', financialKind: 'charge', senderId: 'visual-professional', amount: 'R$ 280,00', installments: 'À vista', chargeStatus: 'pending', chargeCreatedAt: '2026-07-22T18:10:00.000Z', createdAt: '2026-07-22T18:10:00.000Z' },
  ],
  createdAt: '2026-07-22T18:00:00.000Z', updatedAt: '2026-07-22T18:10:00.000Z',
};
const notifications = [
  { id: 'notification_visual_001', userId: 'visual-client', type: 'payment', title: 'Pagamento aguardando confirmação', message: 'A cobrança de R$ 280,00 está pronta para pagamento.', read: false, createdAt: '2026-07-22T18:11:00.000Z', orderId: order.id, conversationId: conversation.id },
  { id: 'notification_visual_002', userId: 'visual-professional', type: 'order', title: 'Proposta enviada', message: 'Sua proposta foi enviada ao cliente.', read: false, createdAt: '2026-07-22T18:10:00.000Z', orderId: order.id },
];
const wallet = {
  version: 1,
  currency: 'BRL',
  transactions: [{
    id: 'transaction_visual_001', type: 'receivable', kind: 'service_payment', status: 'available',
    professionalId, userId: professionalId, amount: 95, netAmount: 95, grossAmount: 100, feeAmount: 5,
    title: 'Pagamento liberado', description: 'Pagamento liberado — Pintura residencial completa',
    orderId: order.id, conversationId: conversation.id,
    createdAt: '2026-07-22T18:30:00.000Z', availableAt: '2026-07-22T18:30:00.000Z',
  }],
  bankAccounts: [], disputes: [], auditEvents: [], updatedAt: '2026-07-22T18:30:00.000Z',
};

function seedFixture(payload) {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('doke.dataProvider', 'mock');
  localStorage.setItem('doke.auth.session.v1', JSON.stringify(payload.session));
  localStorage.setItem('doke.orders.local.v1', JSON.stringify([payload.order]));
  localStorage.setItem('doke.orders', JSON.stringify([payload.order]));
  localStorage.setItem('doke.conversations.local.v1', JSON.stringify([payload.conversation]));
  localStorage.setItem('doke.messages.local.v1', JSON.stringify([payload.conversation]));
  localStorage.setItem('doke.notifications.local.v1', JSON.stringify(payload.notifications));
  localStorage.setItem('doke.notifications', JSON.stringify(payload.notifications));
  localStorage.setItem('doke.wallet.local.v1', JSON.stringify(payload.wallet));
}

async function prepare(page, session) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.abort());
  await page.addInitScript(seedFixture, { session, order, conversation, notifications, wallet });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelector('.profile-actions .profile-action-icon[aria-label="Mais ações do perfil cliente"]')?.remove();
    }, { once: true });
  });
}

async function stabilize(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.addStyleTag({ content: `
    [hidden] { display: none; }
    *, *::before, *::after { animation-duration: .001s; transition-duration: .001s; scroll-behavior: auto; caret-color: transparent; }
  `});
  await page.waitForTimeout(900);
}

async function capture(page, viewportName, key) {
  const dir = path.join(outputRoot, viewportName);
  fs.mkdirSync(dir, { recursive: true });
  const health = await page.evaluate(() => ({
    page: document.body?.dataset.page || '',
    hydration: document.body?.dataset.pageHydration || '',
    width: document.documentElement.clientWidth,
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) > document.documentElement.clientWidth + 1,
    url: location.pathname + location.search,
  }));
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(health, null, 2));
  await page.screenshot({ path: path.join(dir, `${key}.png`), fullPage: true, animations: 'disabled' });
  expect(health.horizontalOverflow, `${key} não pode ter overflow horizontal`).toBe(false);
  return health;
}

for (const viewport of viewports) {
  test.describe(`transaction walkthrough ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch, deviceScaleFactor: 1 });

    const clientCases = [
      { key: '01-pedidos', path: '/pedidos.html', expectedPage: 'pedidos' },
      { key: '02-mensagens', path: '/mensagens.html', expectedPage: 'mensagens' },
      { key: '05-notificacoes', path: '/notificacoes.html', expectedPage: 'notificacoes' },
      { key: '06-meu-perfil', path: '/meu-perfil.html', expectedPage: 'perfil' },
    ];

    for (const item of clientCases) {
      test(`${item.key} renderiza sem overflow`, async ({ page }) => {
        await prepare(page, clientSession);
        await page.goto(item.path);
        await stabilize(page);
        expect(await capture(page, viewport.name, item.key)).toMatchObject({ page: item.expectedPage });
      });
    }

    test('03-pagamento-pronto renderiza cobrança válida', async ({ page }) => {
      await prepare(page, clientSession);
      const paymentUrl = `/pagamento-profissional.html?order=${order.id}&conversation=${conversation.id}&message=charge_visual_001`;
      await page.goto(paymentUrl);
      await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration || '')).toBe('ready');
      await stabilize(page);
      expect(await capture(page, viewport.name, '03-pagamento-pronto')).toMatchObject({ page: 'pagamento-profissional', hydration: 'ready' });
    });

    test('04-pagamento-vazio renderiza contexto ausente', async ({ page }) => {
      await prepare(page, clientSession);
      await page.goto('/pagamento-profissional.html');
      await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration || '')).toBe('empty');
      await stabilize(page);
      expect(await capture(page, viewport.name, '04-pagamento-vazio')).toMatchObject({ page: 'pagamento-profissional', hydration: 'empty' });
    });

    test('07-carteira-liberada renderiza saldo profissional', async ({ page }) => {
      await prepare(page, professionalSession);
      await page.route('https://cdn.jsdelivr.net/npm/@supabase/**', route => route.abort());
      await page.goto('/carteira.html');
      await stabilize(page);
      await expect(page.locator('[data-wallet-balance-available]')).toContainText('R$ 95,00');
      await expect(page.locator('body')).toContainText('Pagamento liberado');
      expect(await capture(page, viewport.name, '07-carteira-liberada')).toMatchObject({ page: 'carteira' });
    });
  });
}
