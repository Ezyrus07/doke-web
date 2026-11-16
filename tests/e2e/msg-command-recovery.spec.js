'use strict';
let runner;
try { runner = require('@playwright/test'); }
catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND' || !error.message.includes("'@playwright/test'")) throw error;
  runner = require('playwright/test'); // The bundled Codex runtime exposes the same official runner here.
}
const { test, expect } = runner;
const fs = require('node:fs');
const path = require('node:path');
const CLIENT = '11111111-1111-4111-8111-111111111111';
const PEER = '22222222-2222-4222-8222-222222222222';
const CONVERSATION = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1366, height: 768 }]) {
  test(`message recovery ${viewport.width}px: one intent, canonical retries and accessible feedback`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const external = []; const consoleErrors = []; const requests = []; const ledger = new Map();
    const checks = [];
    const conversations = [CONVERSATION, OTHER].map((id, index) => ({ id, clientId: CLIENT, professionalId: PEER,
      participants: [CLIENT, PEER], name: index ? 'Outra conversa sintética' : 'Profissional sintético',
      peerName: index ? 'Outra conversa sintética' : 'Profissional sintético', group: 'contacts', status: 'conversation',
      messages: [{ id: 'initial-' + id, senderId: PEER, author: 'Profissional sintético', body: 'Conversa de teste local.', text: 'Conversa de teste local.', time: '10:00' }] }));
    let mode = 'success'; let release = null;
    page.on('pageerror', error => consoleErrors.push(error.message));
    await page.addLocatorHandler(page.locator('[data-browser-notification-prompt]'), async prompt => {
      await prompt.locator('[data-browser-notification-dismiss]').click();
    });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(testInfo.project.use.baseURL).origin) {
        external.push({ method: route.request().method(), url: url.origin + url.pathname });
        return route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/javascript', body: '' });
      }
      if (url.pathname === '/assets/js/services/api-repository-provider.js') {
        const source = fs.readFileSync(path.join(__dirname, '../../assets/js/services/api-repository-provider.js'), 'utf8');
        // Configure only the synthetic browser context, never product flags or hosted endpoints.
        return route.fulfill({ contentType: 'application/javascript', body: source + '\nDoke.repositoryBoundary.configureProvider({provider:"api",apiBaseUrl:location.origin+"/__msg-recovery",enableNetworkRequests:true});' });
      }
      if (!url.pathname.startsWith('/__msg-recovery/')) return route.continue();
      const request = route.request();
      if (request.method() === 'GET') {
        const conversation = conversations.find(item => url.pathname.endsWith('/' + item.id));
        return route.fulfill({ json: conversation ? { conversation } : url.pathname.includes('/conversations') ? conversations : [] });
      }
      const body = request.postDataJSON(); const key = request.headers()['x-idempotency-key'];
      if (body.action !== 'sendMessage') return route.fulfill({ json: { ok: true, acknowledgement: { commandId: key, action: body.action, status: 'accepted' } } });
      const previous = ledger.get(key);
      requests.push({ key, body, mode });
      if (mode === 'conflict') return route.fulfill({ status: 409, json: { error: 'DOKE_IDEMPOTENCY_CONFLICT' } });
      if (!previous) {
        const message = { id: 'persisted-' + ledger.size, body: body.body, text: body.text, senderId: CLIENT, author: 'Você', time: 'agora', mine: true };
        ledger.set(key, { body: JSON.stringify(body), message });
        conversations.find(item => item.id === body.conversationId).messages.push(message);
      } else expect(JSON.stringify(body)).toBe(previous.body);
      if (mode === 'hold' || mode === 'cancel') {
        await new Promise(resolve => { release = resolve; });
        return route.abort('connectionfailed');
      }
      if (mode === 'offline') return route.abort('connectionfailed');
      return route.fulfill({ json: { message: ledger.get(key).message,
        acknowledgement: { commandId: key, action: 'sendMessage', status: previous ? 'replayed' : 'accepted' } } });
    });
    await page.addInitScript(({ client }) => {
      localStorage.setItem('doke.auth.session.v1', JSON.stringify({ provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
        user: { id: client, name: 'Cliente sintético', email: 'recovery@example.test', role: 'client', type: 'client', accountStatus: 'active' } }));
      const originalFetch = window.fetch.bind(window);
      window.fetch = async function (url, options) {
        const response = await originalFetch(url, options);
        if (String(url).includes('/__msg-recovery/') && options?.body) {
          const body = JSON.parse(options.body);
          if (body.body === 'Timeout sintético' && options.headers['x-doke-command-attempt'] === '1') throw new DOMException('Synthetic timeout after commit', 'TimeoutError');
        }
        return response;
      };
    }, { client: CLIENT });
    await page.goto('/mensagens.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-messages-page]')).toHaveAttribute('data-messages-ready', 'true', { timeout: 30_000 });
    const open = async id => {
      if (viewport.width <= 1180 && await page.locator('[data-messages-back]').isVisible()) await page.locator('[data-messages-back]').click();
      await page.locator(`.message-item[data-message-id="${id}"]`).click();
    };
    await open(CONVERSATION);
    const composer = page.locator('[data-messages-composer-input]');
    const send = async text => { await composer.fill(text); await page.locator('[data-messages-composer] button[type="submit"]').click(); };
    const bubble = text => page.locator('[data-message-bubble]').filter({ has: page.locator('p', { hasText: text }) });
    const checkOne = async (text, state) => {
      await expect(bubble(text)).toHaveCount(1);
      await expect(bubble(text).locator('[data-message-delivery]')).toHaveAttribute('data-message-delivery', state);
      const status = bubble(text).locator('.message-delivery__status');
      await expect(status).toBeVisible();
      const colors = await status.evaluate(node => {
        return { actual: getComputedStyle(node).color,
          expected: getComputedStyle(node.closest('[data-message-bubble]')).color };
      });
      expect(colors.actual).toBe(colors.expected);
    };
    const screenshot = name => page.screenshot({ path: testInfo.outputPath(`${name}-${viewport.width}.png`), fullPage: true });
    mode = 'hold';
    await send('Resposta perdida sintética'); await checkOne('Resposta perdida sintética', 'pending');
    await expect.poll(() => Boolean(release)).toBe(true);
    await composer.fill('Rascunho preservado');
    await screenshot('pending');
    await open(OTHER); await open(CONVERSATION); await checkOne('Resposta perdida sintética', 'pending');
    // Refresh may read the committed row before the ACK; it must not create a second bubble.
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('doke:order-status-changed')));
    await checkOne('Resposta perdida sintética', 'pending');
    mode = 'success'; release(); release = null;
    await checkOne('Resposta perdida sintética', 'confirmed'); await expect(composer).toHaveValue('Rascunho preservado');
    expect(requests.filter(r => r.body.body === 'Resposta perdida sintética')).toHaveLength(2);
    checks.push('lost response + read-before-ACK + same key/payload + draft preservation');
    await send('Timeout sintético'); await checkOne('Timeout sintético', 'confirmed');
    expect(requests.filter(r => r.body.body === 'Timeout sintético')).toHaveLength(2);
    checks.push('native timeout after one materialization');
    mode = 'offline'; await page.evaluate(() => dispatchEvent(new Event('offline')));
    await send('Recuperação manual sintética');
    await checkOne('Recuperação manual sintética', 'recoverable');
    await expect(bubble('Recuperação manual sintética')).toContainText('pode ter sido entregue');
    await expect(bubble('Recuperação manual sintética').locator('[data-message-delivery-cancel]')).toBeInViewport();
    await screenshot('recoverable');
    await open(OTHER); await open(CONVERSATION); await checkOne('Recuperação manual sintética', 'recoverable');
    mode = 'success';
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await bubble('Recuperação manual sintética').locator('[data-message-delivery-retry]').evaluate(button => { button.click(); button.click(); });
    await checkOne('Recuperação manual sintética', 'confirmed');
    expect(requests.filter(r => r.body.body === 'Recuperação manual sintética')).toHaveLength(4);
    checks.push('three-attempt exhaustion + return + concurrent explicit retry');
    mode = 'conflict'; await send('Conflito sintético'); await checkOne('Conflito sintético', 'conflict');
    await expect(bubble('Conflito sintético').locator('[data-message-delivery-retry]')).toHaveCount(0);
    expect(requests.filter(r => r.body.body === 'Conflito sintético')).toHaveLength(1); checks.push('definitive conflict');
    mode = 'cancel'; await send('Cancelamento sintético'); await checkOne('Cancelamento sintético', 'pending');
    await expect.poll(() => Boolean(release)).toBe(true);
    await bubble('Cancelamento sintético').locator('[data-message-delivery-cancel]').click();
    mode = 'success'; release(); release = null;
    await checkOne('Cancelamento sintético', 'cancelled');
    await expect.poll(() => page.evaluate(() => Doke.messageCommandExecutor.getInFlightCount())).toBe(0);
    expect(requests.filter(r => r.body.body === 'Cancelamento sintético')).toHaveLength(1); checks.push('voluntary cancel stops automatic retry');
    await composer.fill('Concorrência sintética');
    await page.locator('[data-messages-composer]').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await checkOne('Concorrência sintética', 'confirmed');
    expect(requests.filter(r => r.body.body === 'Concorrência sintética')).toHaveLength(1);
    checks.push('double submit has one intent');
    await send('Reconexão <img src=x onerror=alert(1)>'); await checkOne('Reconexão <img src=x onerror=alert(1)>', 'confirmed');
    await expect(bubble('Reconexão <img src=x onerror=alert(1)>').locator('img')).toHaveCount(0);
    await expect(page.locator('[data-messages-delivery-live]')).toHaveAttribute('role', 'status');
    await expect(composer).toBeEnabled();
    expect(await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
    checks.push('safe text + live status + responsive overflow');
    for (const item of ledger.values()) expect(conversations[0].messages.filter(message => message.id === item.message.id)).toHaveLength(1);
    expect(new Set(requests.filter(r => r.body.body === 'Recuperação manual sintética').map(r => r.key)).size).toBe(1);
    expect(consoleErrors).toEqual([]);
    expect(external.filter(r => !['GET', 'HEAD'].includes(r.method))).toEqual([]);
    await screenshot('final');
    await testInfo.attach('transport-evidence', { body: Buffer.from(JSON.stringify({ viewport, checks, requests, materializations: ledger.size, externalIntercepted: external, consoleErrors }, null, 2)), contentType: 'application/json' });
  });
}
