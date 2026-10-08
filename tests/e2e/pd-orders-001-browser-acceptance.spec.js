const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'tablet-608', width: 608, height: 926, isMobile: false, hasTouch: true },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

function fixtureFor(role) {
  const user = role === 'professional'
    ? { id: 'professional_pd_orders', role: 'professional', name: 'Profissional Teste' }
    : { id: 'client_pd_orders', role: 'client', name: 'Cliente Teste' };

  const counterpart = role === 'professional'
    ? { professionalId: user.id, clientId: 'client_counterpart', clientName: 'Cliente Exemplo' }
    : { clientId: user.id, professionalId: 'professional_counterpart', providerName: 'Profissional Exemplo' };

  return {
    user,
    orders: [
      {
        id: `pd_orders_${role}_pending`,
        ...counterpart,
        serviceId: 'service_pd_orders',
        serviceTitle: 'Pintura residencial',
        status: 'pending',
        createdAt: '2026-10-01T12:00:00.000Z',
      },
      {
        id: `pd_orders_${role}_completed`,
        ...counterpart,
        serviceId: 'service_pd_orders_done',
        serviceTitle: 'Reparo residencial',
        status: 'completed',
        createdAt: '2026-09-20T12:00:00.000Z',
        completedAt: '2026-09-22T12:00:00.000Z',
      },
    ],
  };
}

async function bootOrders(page, role) {
  const fixture = fixtureFor(role);
  await page.addInitScript(({ user, orders }) => {
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({ user }));
    localStorage.setItem('doke.orders.local.v1', JSON.stringify(orders));
    localStorage.setItem('doke.orders', JSON.stringify(orders));
  }, fixture);

  await page.goto('/pedidos.html');
  await expect.poll(() => page.evaluate(() => document.body.dataset.ordersAudience || '')).toBe(role);
  await expect.poll(() => page.locator('.orders-list .order-card:not([hidden])').count()).toBeGreaterThan(0);
  await expect(page.locator('[data-orders-hydration-ready="summary"]')).toBeVisible();

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function readState(page) {
  return page.evaluate(() => {
    const summary = document.querySelector('[data-orders-hydration-ready="summary"]');
    const list = document.querySelector('[data-pd-orders-primary-region="orders"]');
    const planner = document.querySelector('[data-pd-orders-secondary-region="planner"]');
    const insights = document.querySelector('[data-pd-orders-secondary-region="insights"]');
    const isBefore = (a, b) => Boolean(
      a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    const visible = (node) => Boolean(node)
      && !node.hidden
      && getComputedStyle(node).display !== 'none'
      && getComputedStyle(node).visibility !== 'hidden';

    const summaryCards = [...document.querySelectorAll(
      '[data-orders-hydration-ready="summary"] .orders-command-summary__card'
    )].map((card) => ({
      className: card.className,
      label: card.querySelector('.orders-command-summary__label')?.textContent?.trim() || '',
      order: Number.parseInt(getComputedStyle(card).order || '0', 10) || 0,
    }));

    return {
      contract: document.body.dataset.pdOrdersContract || '',
      audience: document.body.dataset.ordersAudience || '',
      semanticOrder: {
        summaryBeforeList: isBefore(summary, list),
        listBeforePlanner: isBefore(list, planner),
        plannerBeforeInsights: isBefore(planner, insights),
      },
      plannerVisible: visible(planner),
      insightsVisible: visible(insights),
      agendaVisible: [...document.querySelectorAll('[data-orders-agenda-toggle]')].some(visible),
      orderCount: document.querySelectorAll('.orders-list .order-card:not([hidden])').length,
      nextActionCount: document.querySelectorAll(
        '.orders-list .order-card:not([hidden]) .order-card__next-action'
      ).length,
      summaryCards,
      overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      bodyText: document.body.innerText,
    };
  });
}

for (const viewport of viewports) {
  for (const role of ['client', 'professional']) {
    test.describe(`PD-ORDERS-001 ${role} ${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      test('keeps order decisions ahead of planning depth with correct role authority', async ({ page }) => {
        test.setTimeout(60_000);
        await bootOrders(page, role);
        const state = await readState(page);

        expect(state.contract).toBe('decision-v1');
        expect(state.audience).toBe(role);
        expect(state.semanticOrder).toEqual({
          summaryBeforeList: true,
          listBeforePlanner: true,
          plannerBeforeInsights: true,
        });
        expect(state.orderCount).toBeGreaterThan(0);
        expect(state.nextActionCount).toBeGreaterThan(0);
        expect(state.overflow).toBeLessThanOrEqual(1);

        if (role === 'client') {
          expect(state.plannerVisible).toBe(false);
          expect(state.insightsVisible).toBe(false);
          expect(state.agendaVisible).toBe(false);
          expect(state.summaryCards.map((card) => card.label)).toEqual([
            'Pedidos ativos',
            'Aguardando resposta',
            'Próximos compromissos',
            'Concluídos',
          ]);
        } else {
          expect(state.plannerVisible).toBe(true);
          expect(state.insightsVisible).toBe(true);
          expect(state.agendaVisible).toBe(true);
          expect(state.summaryCards.map((card) => card.label)).toEqual([
            'Aguardando você',
            'Compromissos hoje',
            'Em risco',
            'Orçamentos abertos',
          ]);
          const byClass = Object.fromEntries(state.summaryCards.map((card) => [card.className, card.order]));
          expect(Object.entries(byClass).find(([key]) => key.includes('--attention'))?.[1]).toBe(1);
          expect(Object.entries(byClass).find(([key]) => key.includes('--risk'))?.[1]).toBe(2);
          expect(Object.entries(byClass).find(([key]) => key.includes('--today'))?.[1]).toBe(3);
          expect(Object.entries(byClass).find(([key]) => key.includes('--budget'))?.[1]).toBe(4);
        }
      });
    });
  }
}

test.describe('PD-ORDERS-001 evidence integrity', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('does not fabricate optional financial or schedule evidence', async ({ page }) => {
    const user = { id: 'client_pd_orders_sparse', role: 'client', name: 'Cliente Teste' };
    const orders = [{
      id: 'pd_orders_sparse',
      clientId: user.id,
      professionalId: 'professional_sparse',
      providerName: 'Profissional Exemplo',
      serviceId: 'service_sparse',
      serviceTitle: 'Serviço residencial',
      status: 'pending',
      createdAt: '2026-10-01T12:00:00.000Z',
    }];

    await page.addInitScript(({ user, orders }) => {
      localStorage.setItem('doke.auth.session.v1', JSON.stringify({ user }));
      localStorage.setItem('doke.orders.local.v1', JSON.stringify(orders));
      localStorage.setItem('doke.orders', JSON.stringify(orders));
    }, { user, orders });

    await page.goto('/pedidos.html');
    await expect.poll(() => page.evaluate(() => document.body.dataset.ordersAudience || '')).toBe('client');
    await expect.poll(() => page.locator('.orders-list .order-card:not([hidden])').count()).toBe(1);

    const cardText = await page.locator('.orders-list .order-card:not([hidden])').first().innerText();
    expect(cardText).not.toMatch(/R\$\s*(?:undefined|NaN|null)/i);
    expect(cardText).not.toMatch(/Invalid Date|undefined|null/i);
    expect(await page.locator('[data-orders-hydration-ready="planner"]').isVisible()).toBe(false);
    expect(await page.locator('[data-orders-hydration-ready="insights"]').isVisible()).toBe(false);

    const overflow = await page.evaluate(() => (
      Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth
    ));
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
