'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const realScripts = new Set(['account-storage.js', 'notification-action.js', 'notification-toast.js']);
const action = (key) => ({ actionId: key, action: 'quick-reply', commandType: 'MESSAGE_REPLY', entityId: 'synthetic-conversation', expectedState: 'message-created', expiresAt: '2099-01-01', idempotencyKey: key, permissionRequirement: 'conversation:reply', confirmationPolicy: 'INLINE_REPLY' });
(async () => {
  const server = http.createServer((_req, res) => { res.statusCode = 404; res.end(); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch(process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.DOKE_PLAYWRIGHT_EXECUTABLE_PATH } : {});
    async function context(viewport) {
      const ctx = await browser.newContext({ viewport });
      await ctx.addInitScript(() => {
        window.__receiptLoads = []; window.__receiptSends = 0;
        window.Doke = { session: { getCurrentUser: () => ({ id: 'synthetic-browser-account' }) }, services: { messages: {
          getServerCommandBoundaryStatus: () => ({ required: true, ready: true }),
          sendMessage: async () => { window.__receiptSends++; return { id: 'synthetic-message' }; }
        } } };
      });
      await ctx.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.fulfill({ status: 200, body: '', contentType: 'text/javascript' });
        const filename = path.basename(url.pathname);
        if (url.pathname.endsWith('.html')) {
          // Full page source and original attributes: the browser, not a harness scheduler, orders scripts.
          return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(root, filename), 'utf8') });
        }
        if (realScripts.has(filename)) {
          if (filename === 'notification-action.js') assert.equal(url.searchParams.get('v'), '20261008-notification-receipts-v2', 'updated action cache identity');
          const body = fs.readFileSync(path.join(root, 'assets/js/core', filename), 'utf8');
          return route.fulfill({ contentType: 'text/javascript', body: body + '\nwindow.__receiptLoads.push(' + JSON.stringify(filename) + ');' });
        }
        if (filename === 'in-app-notifications.js') return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(root, 'assets/js/features', filename), 'utf8') + '\nwindow.__receiptConsumer = !!(Doke.notificationAction && Doke.notificationToast && window.DokeInAppNotifications);' });
        return route.fulfill({ status: 200, body: '', contentType: url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
      });
      return ctx;
    }
    for (const viewport of [{ width: 1366, height: 768 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      const ctx = await context(viewport);
      for (const name of ['notificacoes.html', 'mensagens.html', 'comunidade-interna.html']) {
        const page = await ctx.newPage(); await page.goto(origin + '/' + name);
        const result = await page.evaluate(async a => ({ result: await Doke.notificationAction.execute(a, { body: 'synthetic' }), loads: window.__receiptLoads, consumer: window.__receiptConsumer }), action(name));
        assert.deepEqual(result.loads, ['account-storage.js', 'notification-action.js', 'notification-toast.js'], name + ' actual parser/defer order');
        assert.equal(result.result.state, 'SUCCEEDED'); assert.equal(result.consumer, true);
        assert.equal(new Set(result.loads).size, result.loads.length, 'one initialization per authority');
        console.log('PASS page script execution ' + name + ' ' + viewport.width + 'x' + viewport.height);
        await page.close();
      }
      await ctx.close();
    }
    const ctx = await context({ width: 1366, height: 768 });
    const tabs = await Promise.all([ctx.newPage(), ctx.newPage()]);
    await Promise.all(tabs.map(p => p.goto(origin + '/notificacoes.html')));
    await Promise.all(tabs.map((p, i) => p.evaluate(async actions => {
      for (const a of actions) { const r = await Doke.notificationAction.execute(a, { body: 'synthetic' }); if (!r.ok) throw new Error(r.state); }
    }, Array.from({ length: 30 }, (_, j) => action('tab:' + i + ':' + j)))));
    await tabs[0].reload();
    const replayed = await tabs[0].evaluate(async actions => {
      const states = []; for (const a of actions) states.push((await Doke.notificationAction.execute(a)).replayed);
      return { states, sends: window.__receiptSends };
    }, Array.from({ length: 60 }, (_, j) => action('tab:' + Math.floor(j / 30) + ':' + (j % 30))));
    assert.equal(replayed.states.every(Boolean), true); assert.equal(replayed.sends, 0);
    console.log('PASS two same-origin tabs: 60 distinct receipts survive reload without resend');
    const uncertain = action('synthetic:uncertain');
    const lost = await tabs[1].evaluate(async a => {
      const persist = Storage.prototype.setItem; let writes = 0;
      Storage.prototype.setItem = function (key, value) {
        if (key.includes(':notification_action:') && ++writes > 1) throw new Error('synthetic disk failure');
        return persist.call(this, key, value);
      };
      try { return await Doke.notificationAction.execute(a, { body: 'synthetic' }); }
      finally { Storage.prototype.setItem = persist; }
    }, uncertain);
    assert.equal(lost.state, 'UNKNOWN_OUTCOME');
    await tabs[1].reload();
    const afterReload = await tabs[1].evaluate(async a => ({ state: Doke.notificationAction.getState(a), result: await Doke.notificationAction.execute(a, { body: 'must not resend' }), sends: window.__receiptSends }), uncertain);
    assert.equal(afterReload.state, 'UNKNOWN_OUTCOME'); assert.equal(afterReload.result.retryBlocked, true); assert.equal(afterReload.sends, 0);
    console.log('PASS real localStorage: both completion writes fail; reload keeps retry blocked');
    await ctx.close();
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
