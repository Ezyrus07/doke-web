const { test, expect } = require('@playwright/test');

test('client orders derive summary from cards and hide professional operations', async ({ page }) => {
  await page.addInitScript(() => {
    const user = { id: 'client_test', role: 'client', name: 'Cliente Teste' };
    const orders = [
      {
        id: 'order_client_1',
        clientId: user.id,
        professionalId: 'professional_1',
        providerName: 'Studio Aquarela',
        serviceTitle: 'Pintura comercial',
        status: 'pending',
        createdAt: '2026-06-28T10:00:00.000Z'
      },
      {
        id: 'order_client_2',
        clientId: user.id,
        professionalId: 'professional_1',
        providerName: 'Studio Aquarela',
        serviceTitle: 'Textura e acabamento',
        status: 'pending',
        createdAt: '2026-06-27T10:00:00.000Z'
      }
    ];
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({ user }));
    localStorage.setItem('doke.orders.local.v1', JSON.stringify(orders));
    localStorage.setItem('doke.orders', JSON.stringify(orders));
  });

  await page.goto('/pedidos.html');
  await expect.poll(() => page.evaluate(() => document.body.dataset.ordersAudience)).toBe('client');
  await expect.poll(() => page.locator('.orders-list .order-card:not([hidden])').count()).toBe(2);

  const summary = await page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('[data-orders-command-value]')].map((node) => [
      node.dataset.ordersCommandValue,
      {
        value: Number(node.textContent),
        label: node.parentElement.querySelector('.orders-command-summary__label')?.textContent
      }
    ])
  ));

  expect(summary.action).toEqual({ value: 2, label: 'Pedidos ativos' });
  expect(summary.today).toEqual({ value: 2, label: 'Aguardando resposta' });
  expect(summary.risk.label).toBe('Próximos compromissos');
  expect(summary.budget.label).toBe('Concluídos');
  expect(await page.locator('[data-orders-hydration-ready="planner"]').isVisible()).toBe(false);
  expect(await page.locator('[data-orders-hydration-ready="insights"]').isVisible()).toBe(false);
  expect(await page.evaluate(() => (
    [...document.querySelectorAll('[data-orders-agenda-toggle]')].every((node) => (
      node.hidden && getComputedStyle(node).display === 'none'
    ))
  ))).toBe(true);
});
