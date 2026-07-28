const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const paymentFixture = {
  session: {
    provider: 'mock',
    sessionStatus: 'active',
    accountStatus: 'active',
    user: {
      id: 'payment-client',
      role: 'client',
      name: 'Cliente Payment',
      email: 'payment@example.test',
      accountStatus: 'active',
    },
  },
  order: {
    id: 'order_payment_valid',
    clientId: 'payment-client',
    professionalId: 'payment-professional',
    providerId: 'payment-professional',
    providerName: 'Profissional Payment',
    serviceTitle: 'Pintura validada',
    status: 'quoted',
    budget: 'R$ 280,00',
    proposalAmount: 'R$ 280,00',
    chargeMessageId: 'charge_payment_valid',
    createdAt: '2026-07-14T10:00:00.000Z',
  },
  conversation: {
    id: 'conversation_payment_valid',
    orderId: 'order_payment_valid',
    clientId: 'payment-client',
    professionalId: 'payment-professional',
    participants: ['payment-client', 'payment-professional'],
    order: {
      id: 'order_payment_valid',
      clientId: 'payment-client',
      professionalId: 'payment-professional',
      providerName: 'Profissional Payment',
      serviceTitle: 'Pintura validada',
      status: 'quoted',
      budget: 'R$ 280,00',
      proposalAmount: 'R$ 280,00',
      chargeMessageId: 'charge_payment_valid',
    },
    messages: [{
      id: 'charge_payment_valid',
      type: 'charge',
      financialKind: 'charge',
      amount: 'R$ 280,00',
      installments: 'À vista',
      senderId: 'payment-professional',
      chargeStatus: 'pending',
      chargeCreatedAt: '2026-07-14T10:05:00.000Z',
      createdAt: '2026-07-14T10:05:00.000Z',
    }],
    createdAt: '2026-07-14T10:00:00.000Z',
    updatedAt: '2026-07-14T10:05:00.000Z',
  },
};

const validPaymentUrl = '/pagamento-profissional.html?order=order_payment_valid&conversation=conversation_payment_valid&message=charge_payment_valid';
const invalidPaymentUrl = '/pagamento-profissional.html?order=order_missing&conversation=conversation_missing&message=charge_missing';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
});

const installFixture = (page) => page.addInitScript((fixture) => {
  localStorage.setItem('doke.auth.session.v1', JSON.stringify(fixture.session));
  localStorage.setItem('doke.orders.local.v1', JSON.stringify([fixture.order]));
  localStorage.setItem('doke.orders', JSON.stringify([fixture.order]));
  localStorage.setItem('doke.conversations.local.v1', JSON.stringify([fixture.conversation]));
  localStorage.setItem('doke.messages.local.v1', JSON.stringify([fixture.conversation]));
}, paymentFixture);

const waitForPaymentState = async (page, expected) => {
  await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration || 'missing')).toBe(expected);
};

const readPaymentState = (page) => page.evaluate(() => {
  const visible = (node) => {
    if (!node || node.hidden) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const box = (node) => {
    const rect = node?.getBoundingClientRect();
    return rect ? { width: rect.width, height: rect.height } : { width: 0, height: 0 };
  };
  const empty = document.querySelector('[data-state-empty]');
  const region = empty?.closest('[data-state-region]');
  const surfaces = {
    loading: visible(document.querySelector('[data-payment-hydration-skeleton]'))
      || visible(document.querySelector('[data-state-loading]')),
    empty: visible(empty),
    error: visible(document.querySelector('[data-state-error]')),
    ready: [...document.querySelectorAll('[data-payment-hydration-ready]')].some(visible),
  };
  const cta = empty?.querySelector('a[href]');

  return {
    hydration: document.body.dataset.pageHydration || '',
    surfaces,
    visibleSurfaceCount: Object.values(surfaces).filter(Boolean).length,
    emptyBox: box(empty),
    regionBox: box(region),
    regionHidden: Boolean(region?.hidden),
    regionAriaHidden: region?.getAttribute('aria-hidden'),
    ctaHref: cta?.getAttribute('href') || '',
    checkoutVisible: visible(document.querySelector('[data-payment-checkout]')),
    latest: window.Doke?.paymentController?.getLatest?.() || null,
  };
});

const expectEmptyOnly = async (page, reason) => {
  await waitForPaymentState(page, 'empty');
  const state = await readPaymentState(page);
  expect(state.visibleSurfaceCount).toBe(1);
  expect(state.surfaces).toEqual({ loading: false, empty: true, error: false, ready: false });
  expect(state.emptyBox.width).toBeGreaterThan(0);
  expect(state.emptyBox.height).toBeGreaterThan(0);
  expect(state.regionBox.width).toBeGreaterThan(0);
  expect(state.regionBox.height).toBeGreaterThan(0);
  expect(state.regionHidden).toBe(false);
  expect(state.regionAriaHidden).toBe('false');
  expect(state.ctaHref).toMatch(/mensagens\.html/);
  expect(state.checkoutVisible).toBe(false);
  expect(state.latest?.status).toBe('empty-context');
  expect(state.latest?.emptyReason).toBe(reason);
};

const expectReadyOnly = async (page) => {
  await waitForPaymentState(page, 'ready');
  const state = await readPaymentState(page);
  expect(state.visibleSurfaceCount).toBe(1);
  expect(state.surfaces).toEqual({ loading: false, empty: false, error: false, ready: true });
  expect(state.checkoutVisible).toBe(true);
  expect(state.latest?.status).toBe('ready');
  expect(state.latest?.orderId).toBe('order_payment_valid');
  expect(state.latest?.messageId).toBe('charge_payment_valid');
};

const navigateFromIndex = async (page, target) => {
  await page.goto('/index.html');
  await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

  const expected = new URL(target, page.url());
  const navigation = page.waitForURL((url) => (
    url.pathname === expected.pathname && url.search === expected.search
  ));

  await page.evaluate((href) => {
    window.setTimeout(() => window.DokeNavigate(href), 0);
  }, target);
  await navigation;
};

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test.beforeEach(async ({ page }) => {
      await installFixture(page);
    });

    test('payment without context remains empty across entry modes and exposes a working CTA', async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.goto('/pagamento-profissional.html');
      await expectEmptyOnly(page, 'route_context_missing');
      await testInfo.attach(`payment-empty-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      await page.reload();
      await expectEmptyOnly(page, 'route_context_missing');

      await navigateFromIndex(page, '/pagamento-profissional.html');
      await expectEmptyOnly(page, 'route_context_missing');

      await page.locator('[data-state-empty] a[href*="mensagens.html"]').click();
      await expect(page).toHaveURL(/\/mensagens\.html(?:$|[?#])/);
    });

    test('valid charge remains ready across entry modes', async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.goto(validPaymentUrl);
      await expectReadyOnly(page);
      await testInfo.attach(`payment-ready-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      await page.reload();
      await expectReadyOnly(page);

      await navigateFromIndex(page, validPaymentUrl);
      await expectReadyOnly(page);
    });

    test('unknown charge remains fail-closed across entry modes', async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.goto(invalidPaymentUrl);
      await expectEmptyOnly(page, 'charge_not_found');
      await page.reload();
      await expectEmptyOnly(page, 'charge_not_found');

      await navigateFromIndex(page, invalidPaymentUrl);
      await expectEmptyOnly(page, 'charge_not_found');
      await testInfo.attach(`payment-invalid-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  });
}
