/* UX-JOURNEY-001: isolated, no-hosted-writes browser acceptance. One Edge instance. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const { chromium } = require(require.resolve('@playwright/test', { paths: [path.resolve(__dirname, '..'), path.resolve(__dirname, '..', '..', 'marketplace-search-p31-integration')] }));
const { setup } = require('./fixtures/marketplace-demo.cjs');
const host = '127.0.0.1';
const port = 5637;
const origin = `http://${host}:${port}`;
const viewports = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1366, height: 768 }
];
const results = [];
const fixtures = [
  { id: 'route-check-a', clientId: 'demo_client', professionalId: 'demo_professional', serviceTitle: 'Serviço A', status: 'pending', createdAt: '2026-10-19T14:00:00.000Z' },
  { id: 'route-check-b', clientId: 'demo_client', professionalId: 'demo_professional', serviceTitle: 'Serviço B', status: 'pending', createdAt: '2026-10-19T15:00:00.000Z' },
  { id: 'route-check-c', clientId: 'demo_client', professionalId: 'demo_professional', serviceTitle: 'Serviço C', status: 'accepted', createdAt: '2026-10-19T16:00:00.000Z' }
];

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const waitForServer = async (server) => {
  for (let tries = 0; tries < 35; tries++) {
    if (server.exitCode !== null) throw new Error('Local server exited before ready');
    try {
      const response = await fetch(origin + '/index.html', { signal: AbortSignal.timeout(900) });
      if (response.ok) return;
    } catch {}
    await pause(220);
  }
  throw new Error('Local server did not start on loopback');
};
const check = async (page, name, assertion) => {
  try {
    await assertion();
    results.push({ name, status: 'PASS' });
    process.stdout.write('PASS ' + name + '\n');
  } catch (error) {
    results.push({ name, status: 'FAIL', error: String(error?.message || error).slice(0, 1000) });
    process.stdout.write('FAIL ' + name + ': ' + String(error?.message || error).slice(0, 240) + '\n');
  }
};

const main = async () => {
  let server;
  let browser;
  try {
    server = cp.spawn(process.execPath, ['scripts/serve-static-site.js', `--host=${host}`, `--port=${port}`], {
      cwd: root,
      env: { ...process.env, DOKE_PLAYWRIGHT_LIVE_SEARCH: '0', DOKE_E2E_DISABLE_REMOTE_SERVICES: '1' },
      stdio: 'ignore',
      windowsHide: true
    });
    await waitForServer(server);
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
      timeout: 20000,
      args: ['--disable-background-networking', '--disable-extensions']
    });

    for (const viewport of viewports) {
      if (process.env.UX_JOURNEY_SMOKE_ONLY === '1' && viewport.width !== 390) continue;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const page = await context.newPage();
      page.setDefaultTimeout(14000);
      try {
        if (process.env.UX_JOURNEY_SMOKE_ONLY === '1') {
          await page.addInitScript(() => {
            const events = window.__routeFocusTrace = [];
            const log = (type, payload = {}) => events.push({
              type, at: Math.round(performance.now()), page: document.body?.dataset.page,
              ...payload
            });
            const orig = HTMLElement.prototype.focus;
            HTMLElement.prototype.focus = function (...args) {
              log('focus-call', { tag: this.tagName, id: this.id || '', dataId: this.dataset.id || '' });
              return orig.apply(this, args);
            };
            document.addEventListener('focusin', e => log('focusin', {
              tag: e.target.tagName, id: e.target.id || '', dataId: e.target.dataset.id || ''
            }), true);
            for (const name of ['doke:navigation-lifecycle-route', 'doke:route-transition-state',
              'doke:route-ready', 'doke:orders-list-hydrated', 'doke:page-hydration-ready']) {
              document.addEventListener(name, e => log(name, {
                state: e.detail?.state, to: e.detail?.to, path: e.detail?.path
              }), true);
            }
          });
        }
        await setup(page);
        await page.addInitScript((orders) => {
          if (location.hostname !== '127.0.0.1') return;
          if (!localStorage.getItem('ux.journey.fixture.ready')) {
            localStorage.setItem('doke.orders.local.v1', JSON.stringify(orders));
            localStorage.setItem('doke.orders', JSON.stringify(orders));
            localStorage.setItem('ux.journey.fixture.ready', '1');
          }
        }, fixtures);
        const prefix = String(viewport.width) + 'x' + String(viewport.height);
        await check(page, prefix + ' exact target on direct entry', async () => {
          await page.goto(origin + '/pedidos.html?order=route-check-b', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => {
            const list = document.querySelector('.orders-list');
            return document.body.dataset.ordersAudience === 'client' && !!list?.querySelectorAll('.order-card[data-id]').length && !list.hidden;
          }, { timeout: 13500 });
          await page.waitForFunction(() => document.querySelector('.order-card.is-route-highlighted')?.dataset.id === 'route-check-b');
          const details = await page.evaluate(() => ({
            highlighted: [...document.querySelectorAll('.order-card.is-route-highlighted')].map(x => x.dataset.id),
            targetFocus: document.activeElement?.dataset.id || null,
            current: document.querySelector('.order-card.is-route-highlighted')?.getAttribute('aria-current'),
            overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
            routeNotice: !!document.querySelector('[data-orders-route-feedback]')
          }));
          assert.deepEqual(details.highlighted, ['route-check-b']);
          assert.equal(details.current, 'location');
          assert.equal(details.targetFocus, 'route-check-b');
          assert.ok(details.overflow <= 1, 'horizontal overflow ' + details.overflow);
          assert.equal(details.routeNotice, false);
        });
        await check(page, prefix + ' reload retains exact order', async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => document.querySelector('.order-card.is-route-highlighted')?.dataset.id === 'route-check-b');
          assert.equal(await page.evaluate(() => document.activeElement?.dataset.id), 'route-check-b');
        });
        await check(page, prefix + ' invalid ID never falls back to other order', async () => {
          await page.goto(origin + '/pedidos.html?order=another-account-private-id', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !!document.querySelector('[data-orders-route-feedback]'));
          const state = await page.evaluate(() => ({
            highlighted: document.querySelectorAll('.order-card.is-route-highlighted').length,
            notice: document.querySelector('[data-orders-route-feedback]')?.textContent || '',
            ids: [...document.querySelectorAll('.order-card[data-id]')].map(e => e.dataset.id)
          }));
          assert.equal(state.highlighted, 0);
          assert.match(state.notice, /não está disponível nesta conta/);
          assert.ok(!state.notice.includes('another-account-private-id'), 'private ID leaked in notice');
          assert.equal(state.ids.length, 3);
        });
        await check(page, prefix + ' no target avoids false selection', async () => {
          await page.goto(origin + '/pedidos.html', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !!document.querySelector('.orders-list .order-card[data-id]'));
          assert.equal(await page.locator('.order-card.is-route-highlighted').count(), 0);
          assert.equal(await page.locator('[data-orders-route-feedback]').count(), 0);
        });
        await check(page, prefix + ' internal DokeNavigate honors order', async () => {
          await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => typeof window.DokeNavigate === 'function');
          await page.evaluate(() => window.DokeNavigate('pedidos.html?order=route-check-c'));
          await page.waitForFunction(() =>
            document.body?.dataset.page === 'pedidos' &&
            document.querySelector('.order-card.is-route-highlighted')?.dataset.id === 'route-check-c',
            null, { timeout: 14000 }
          );
          try {
            await page.waitForFunction(() => document.activeElement?.dataset.id === 'route-check-c', null, { timeout: 4000 });
          } catch (error) {
            const focus = await page.evaluate(() => ({
              activeTag: document.activeElement?.tagName || '',
              activeId: document.activeElement?.id || '',
              activeClasses: document.activeElement?.className || '',
              cardVisible: !!document.querySelector('.order-card.is-route-highlighted')?.offsetParent,
              cardHidden: document.querySelector('.order-card.is-route-highlighted')?.hidden,
              listHidden: document.querySelector('.orders-list')?.hidden,
              page: document.body?.dataset.page,
              routeState: document.body?.dataset.dokeRouteState,
              activeFilter: document.querySelector('.orders-page')?.dataset.activeFilter,
              cards: document.querySelectorAll('.orders-list .order-card[data-id]').length
            }));
            process.stdout.write('FOCUS_TRACE ' + JSON.stringify(await page.evaluate(() => window.__routeFocusTrace?.slice(-30))) + '\n');
            throw new Error('Focus did not settle after navigation: ' + JSON.stringify(focus));
          }
        });
        await check(page, prefix + ' other client cannot see target', async () => {
          await page.evaluate(() => localStorage.setItem('demo.actor', JSON.stringify({
            id: 'demo_outsider', name: 'Outra conta sintética', role: 'client', type: 'client', accountStatus: 'active'
          })));
          await page.goto(origin + '/pedidos.html?order=route-check-b', { waitUntil: 'domcontentloaded' });
          await page.waitForFunction(() => !!document.querySelector('[data-orders-route-feedback]'), null, { timeout: 14000 });
          const result = await page.evaluate(() => ({
            selected: document.querySelectorAll('.order-card.is-route-highlighted').length,
            notice: document.querySelector('[data-orders-route-feedback]')?.textContent || '',
            visibleOrders: [...document.querySelectorAll('.order-card[data-id]')].filter(el => !el.hidden).length
          }));
          assert.equal(result.selected, 0);
          assert.match(result.notice, /não está disponível nesta conta/);
          assert.equal(result.visibleOrders, 0, 'orders of another account must not be visible');
        });      } finally {
        await context.close();
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server && server.exitCode === null) server.kill();
  }
  const summary = { total: results.length, passed: results.filter(x => x.status === 'PASS').length, failed: results.filter(x => x.status === 'FAIL').length };
  process.stdout.write('RESULTS ' + JSON.stringify(summary) + '\n');
  process.stdout.write('RESULT_DETAILS ' + JSON.stringify(results) + '\n');
  if (summary.failed) process.exitCode = 1;
};
main().catch(error => { process.stderr.write('RUNNER_ERROR ' + error.stack + '\n'); process.exitCode = 2; });
