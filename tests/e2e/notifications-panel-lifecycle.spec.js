const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort();
  });
  await page.addInitScript(() => {
    localStorage.setItem('doke.dataProvider', 'mock');
    localStorage.setItem('doke.auth.session.v1', JSON.stringify({
      provider: 'mock', sessionStatus: 'active', accountStatus: 'active',
      user: { id: 'notifications_keyboard_qa', name: 'Cliente QA', role: 'client', type: 'client', accountStatus: 'active' },
    }));
  });
});

for (const width of [390, 820, 1366]) {
  test(`notifications filters restore keyboard focus ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 820 ? 1180 : 768 });
    await page.goto('/notificacoes.html');
    const opener = page.locator('[data-shell-filter]:visible, [data-notifications-filters-toggle]:visible').first();
    await expect.poll(() => page.evaluate(() => Boolean(window.DokeNotificationsPanels))).toBe(true);
    for (let iteration = 0; iteration < 2; iteration += 1) {
      await opener.click();
      const panel = page.locator('[data-notifications-filters-panel]');
      await expect(panel).toBeVisible();
      await panel.locator('button').first().focus();
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(opener).toBeFocused();
    }
  });
}

test('internal navigation releases document listeners before revisiting notifications', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'The listener-retention assertion uses Chromium DevTools.');
  const cdp = await page.context().newCDPSession(page);
  const scripts = new Map();
  cdp.on('Debugger.scriptParsed', (script) => scripts.set(script.scriptId, script.url));
  await cdp.send('Debugger.enable');
  const listenerCount = async () => {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    return listeners.filter((listener) => (scripts.get(listener.scriptId) || '').includes('pages/notificacoes.js')).length;
  };
  await page.goto('/notificacoes.html');
  await expect.poll(() => page.evaluate(() => Boolean(window.DokeNotificationsPanels))).toBe(true);
  const initialCount = await listenerCount();
  expect(initialCount).toBeGreaterThan(0);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    await page.evaluate(() => window.DokeNavigate('/ajuda.html'));
    await expect(page.locator('body')).toHaveAttribute('data-page', 'ajuda');
    await expect.poll(listenerCount).toBe(0);
    expect(await page.evaluate(() => window.DokeNotificationsPanels)).toBeUndefined();
    await page.evaluate(() => window.DokeNavigate('/notificacoes.html'));
    await expect(page.locator('body')).toHaveAttribute('data-page', 'notificacoes');
    await expect.poll(() => page.evaluate(() => Boolean(window.DokeNotificationsPanels))).toBe(true);
    await expect.poll(listenerCount).toBe(initialCount);
  }
  await cdp.detach();
});
