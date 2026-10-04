const { test, expect } = require('@playwright/test');

const service = {
  id: 'service_journey', title: 'Pintura residencial', status: 'active',
  category: 'Pintura', professionalId: 'professional_journey', providerId: 'professional_journey',
  providerName: 'Profissional Teste', priceLabel: 'Sob orçamento', location: 'Salvador BA',
  moderationStatus: 'published', syncStatus: 'fixture-memory'
};

async function boot(page) {
  // Isolate local fixtures from remote authentication and data services.
  await page.route('**/assets/js/core/supabase-config.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('enabled: true', 'enabled: false') });
  });
  await page.addInitScript(() => {
    const professional = sessionStorage.getItem('journey-test-role') === 'professional';
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({
      provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
      user: { id: professional ? 'professional_journey' : 'client_journey',
        name: professional ? 'Profissional Teste' : 'Cliente Teste',
        role: professional ? 'professional' : 'client', accountStatus: 'active' }
    }));
    localStorage.setItem('doke.defaultServiceLocation', JSON.stringify({ titulo: 'Casa', rua: 'Rua Teste', numero: '10', bairro: 'Centro', cidade: 'Salvador', uf: 'BA' }));
  });
  await page.route('**/assets/js/repositories/services-repository.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `\nDoke.repositories.services.save(${JSON.stringify(service)});` });
  });
  await page.goto('/detalhe-anuncio.html?id=service_journey');
  await page.locator('a[href*="orcamento.html"]:visible').first().click();
  // The page hydration deadline is 8 seconds, longer than Playwright's default assertion timeout.
  await expect(page.locator('[data-details-input]')).toBeVisible({ timeout: 15000 });
  await page.locator('[data-details-input]').fill('Preciso pintar a sala e dois quartos da minha casa.');
  await page.locator('[data-step-next]').click();
  await page.locator('[data-step-next]').click();
  await expect(page.locator('[data-step-submit]')).toBeVisible();
}

// Test-only API transport. It exercises the real frontend adapters; it does not
// assert production authentication, database durability or backend authorization.
async function installJourneyApi(page) {
  const orders = [];
  const conversations = [];
  await page.addInitScript(() => {
    window.DOKE_RUNTIME_CONFIG = { dataProvider: 'api', apiBaseUrl: location.origin + '/__journey_api', flags: { enableNetworkRequests: true } };
  });
  await page.route('**/__journey_api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/__journey_api', '');
    const body = request.postDataJSON() || {};
    let result = [];
    if (path === '/orders' && request.method() === 'POST') {
      expect(request.headers()['x-idempotency-key']).toBeTruthy();
      const order = { ...body, id: 'journey_order', status: 'pending' };
      orders.push(order);
      conversations.push({ id: 'journey_conversation', orderId: order.id, order,
        clientId: order.clientId, professionalId: order.professionalId,
        participants: [order.clientId, order.professionalId], name: order.providerName,
        group: 'orders', status: 'pending', messages: [], createdAt: order.createdAt, updatedAt: order.updatedAt });
      result = { order };
    } else if (path === '/orders') result = orders;
    else if (path === '/orders/journey_order/accept') {
      expect(request.headers()['x-idempotency-key']).toBeTruthy();
      Object.assign(orders[0], { status: 'accepted', statusLabel: 'Pedido aceito' });
      Object.assign(conversations[0], { status: 'accepted', order: orders[0] });
      result = { order: orders[0] };
    } else if (path === '/orders/journey_order') result = orders[0];
    else if (path === '/conversations') result = conversations;
    else if (path === '/conversations/journey_conversation') result = conversations[0];
    else if (path === '/conversations/journey_conversation/messages') {
      const message = { ...body, id: 'journey_message', createdAt: new Date().toISOString() };
      conversations[0].messages.push(message);
      result = { data: { message }, acknowledgement: { commandId: body.commandId, action: 'sendMessage', status: 'accepted' } };
    } else if (path === '/conversations/journey_conversation/read') {
      result = { data: { conversation: conversations[0] }, acknowledgement: { commandId: body.commandId, action: 'markRead', status: 'accepted' } };
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
  });
  return { orders, conversations };
}

test('missing provider cannot claim that an order was sent', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.Doke.services.orders = null;
    window.DokeDialog.alert = message => { window.submissionError = message; };
  });
  await page.locator('[data-step-submit]').click();
  await expect.poll(() => page.evaluate(() => window.submissionError)).toContain('serviço de pedidos');
  await expect(page.locator('[data-budget-success]')).not.toBeVisible();
  await expect(page.locator('[data-step-submit]')).toBeEnabled();
});

test('lost response retries the identical command', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.commands = [];
    window.DokeDialog.alert = () => {};
    window.Doke.services.orders = { create: async payload => {
      window.commands.push(structuredClone(payload));
      if (window.commands.length === 1) throw new Error('Response lost');
      return { ...payload, id: 'order_confirmed' };
    } };
  });
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-step-submit]')).toBeEnabled();
  await expect(page.locator('[data-budget-success]')).not.toBeVisible();
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
  const commands = await page.evaluate(() => window.commands);
  expect(commands).toHaveLength(2);
  expect(commands[0].idempotencyKey).toBeTruthy();
  expect(commands[1]).toEqual(commands[0]);
});

test('local orders preserve the professional selected in the listing', async ({ page }) => {
  await boot(page);
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
  const order = await page.evaluate(() => JSON.parse(sessionStorage.getItem('doke.quoteSubmission')));
  expect(order.professionalId).toBe(service.professionalId);
  expect(order.providerId).toBe(service.providerId);
});

test('an unconfirmed create response does not show success', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.Doke.services.orders = { create: async () => ({}) };
    window.DokeDialog.alert = message => { window.submissionError = message; };
  });
  await page.locator('[data-step-submit]').click();
  await expect.poll(() => page.evaluate(() => window.submissionError)).toContain('não foi confirmado');
  await expect(page.locator('[data-budget-success]')).not.toBeVisible();
});

test('API boundary receives command metadata without leaking it into order fields', async ({ page }) => {
  await boot(page);
  const result = await page.evaluate(async () => {
    let command;
    window.Doke.repositoryBoundary = {
      getDataProviderStatus: () => ({ activeProvider: 'api', apiReady: true }),
      create: async (domain, payload) => { command = { domain, payload }; return { order: { ...payload, id: 'api_order' } }; }
    };
    await window.Doke.services.orders.create({ serviceId: 'service_journey', professionalId: 'professional_journey', idempotencyKey: 'quote-test-123' });
    return command;
  });
  expect(result.domain).toBe('orders');
  expect(result.payload.__requestMeta.idempotencyKey).toBe('quote-test-123');
  expect(result.payload.idempotencyKey).toBeUndefined();
});

test('attachment retry uses the confirmed order instead of creating another', async ({ page }) => {
  await boot(page);
  await page.locator('input[name="anexos"]').setInputFiles({ name: 'reference.txt', mimeType: 'image/png', buffer: Buffer.from('fixture') });
  await page.evaluate(() => {
    window.createCalls = 0;
    window.uploadCalls = 0;
    window.DokeDialog.alert = () => {};
    window.Doke.services.orders = {
      create: async payload => { window.createCalls++; return { ...payload, id: 'attachment_order' }; },
      updateAttachments: async (id, attachments) => ({ id, attachments })
    };
    window.Doke.repositories.attachments = { uploadOrderFiles: async () => {
      if (++window.uploadCalls === 1) throw new Error('Upload interrupted');
      return [{ id: 'reference' }];
    } };
  });
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-step-submit]')).toBeEnabled();
  await page.locator('[data-step-submit]').click();
  await expect(page.locator('[data-budget-success]')).toBeVisible();
  expect(await page.evaluate(() => window.createCalls)).toBe(1);
});

for (const viewport of [{ width: 1366, height: 768 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
  test(`frontend journey with API fixture: request, accept, reply and follow-up (${viewport.width})`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const api = await installJourneyApi(page);
    await boot(page);
    await page.locator('[data-step-submit]').click();
    await expect(page.locator('[data-budget-success]')).toBeVisible();
    const order = await page.evaluate(() => JSON.parse(sessionStorage.getItem('doke.quoteSubmission')));
    expect(order.clientId).toBe('client_journey');
    expect(order.professionalId).toBe('professional_journey');
    await page.locator('[data-budget-success-order-link]').click();
    await expect(page.locator(`.order-card[data-id="${order.id}"]`)).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('client-order.png'), fullPage: true });
    // Switch fixture identities; shared state lives in the test API, not the browser.
    await page.evaluate(() => sessionStorage.setItem('journey-test-role', 'professional'));
    await page.reload();
    await page.locator(`[data-order-accept="${order.id}"]`).click();
    await expect(page).toHaveURL(/mensagens\.html/);
    const composer = page.locator('[data-messages-composer-input]');
    await expect(composer).toBeEnabled();
    await composer.fill('Olá! Posso avaliar a pintura amanhã pela manhã.');
    await page.locator('[data-messages-composer] button[type="submit"]').click();
    await expect(page.locator('.message-bubble').getByText('Olá! Posso avaliar a pintura amanhã pela manhã.', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.message-bubble').getByText('Olá! Posso avaliar a pintura amanhã pela manhã.', { exact: true })).toBeVisible();
    await page.evaluate(() => sessionStorage.setItem('journey-test-role', 'client'));
    await page.reload();
    await expect(page.locator('.message-bubble').getByText('Olá! Posso avaliar a pintura amanhã pela manhã.', { exact: true })).toBeVisible();
    const receivedBubble = page.locator('.message-bubble').filter({ hasText: 'Olá! Posso avaliar a pintura amanhã pela manhã.' });
    await expect(receivedBubble).not.toHaveClass(/message-bubble--me/);
    await expect(receivedBubble).toContainText('Profissional Teste');
    await page.locator('.message-bubble').getByText('Olá! Posso avaliar a pintura amanhã pela manhã.', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath('client-response.png'), fullPage: true });
    expect(api.orders).toHaveLength(1);
    expect(api.conversations[0].messages).toHaveLength(1);
  });
}
