const { test, expect } = require('@playwright/test');

const waitForRouter = async (page) => {
  await page.goto('/index.html');
  await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
};

test.describe('stable shell transition contract', () => {
  test('fast static route commits directly and preserves stable shell nodes', async ({ page }) => {
    await waitForRouter(page);
    await page.evaluate(() => {
      window.__loadCount = 1;
      window.addEventListener('load', () => { window.__loadCount += 1; });
      window.__headerBeforeRoute = document.querySelector('[data-app-header]');
      window.__transitionStates = [];
      document.addEventListener('doke:route-transition-state', (event) => {
        window.__transitionStates.push(event.detail.state);
      });
    });

    await page.evaluate(() => window.DokeNavigate('/ajuda.html'));

    const result = await page.evaluate(() => ({
      page: document.body.dataset.page,
      loadCount: window.__loadCount,
      sameHeader: window.__headerBeforeRoute === document.querySelector('[data-app-header]'),
      states: window.__transitionStates,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));

    expect(result.page).toBe('ajuda');
    expect(result.loadCount).toBe(1);
    expect(result.sameHeader).toBe(true);
    expect(result.states).toContain('direct-commit');
    expect(result.states).not.toContain('skeleton-commit');
    expect(result.overflow).toBeLessThanOrEqual(1);
  });

  test('slow data route keeps the previous page, then uses its destination skeleton', async ({ page }) => {
    await page.addInitScript(() => { window.__DOKE_DISABLE_ROUTE_WARMUP__ = true; });
    await page.route('**/assets/js/pages/pedidos.js*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.continue();
    });
    await waitForRouter(page);
    await page.evaluate(() => {
      window.__transitionStates = [];
      window.__skeletonSeenAtCommit = false;
      document.addEventListener('doke:route-transition-state', (event) => {
        window.__transitionStates.push(event.detail.state);
        if (event.detail.state === 'skeleton-commit') {
          window.__skeletonSeenAtCommit = [...document.querySelectorAll('[data-orders-hydration-skeleton]')]
            .some((node) => !node.hidden);
        }
      });
      window.__pendingNavigation = window.DokeNavigate('/pedidos.html');
    });

    await page.waitForTimeout(80);
    expect(await page.evaluate(() => document.body.dataset.page)).toBe('home');

    await expect.poll(() => page.evaluate(() => document.body.dataset.page)).toBe('pedidos');
    const skeletonWasCommitted = await page.evaluate(() => (
      window.__transitionStates.includes('skeleton-commit')
      && window.__skeletonSeenAtCommit
    ));
    expect(skeletonWasCommitted).toBe(true);

    await page.evaluate(() => window.__pendingNavigation);
    const settled = await page.evaluate(() => ({
      state: document.body.dataset.pageHydration,
      skeletonVisible: [...document.querySelectorAll('[data-orders-hydration-skeleton]')].some((node) => !node.hidden),
      states: window.__transitionStates
    }));
    expect(['ready', 'empty']).toContain(settled.state);
    expect(settled.skeletonVisible).toBe(false);
    expect(settled.states.some((state) => state === 'ready' || state === 'empty')).toBe(true);
  });

  test('essential script error exits loading and exposes retry', async ({ page }) => {
    await page.addInitScript(() => { window.__DOKE_DISABLE_ROUTE_WARMUP__ = true; });
    await page.route('**/assets/js/pages/notificacoes.js*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.abort();
    });
    await waitForRouter(page);
    await page.evaluate(() => window.DokeNavigate('/notificacoes.html'));
    await expect.poll(() => page.evaluate(() => document.body.dataset.page)).toBe('notificacoes');
    await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration)).toBe('error');

    expect(await page.locator('[data-state-error]').isVisible()).toBe(true);
    expect(await page.locator('[data-page-hydration-retry]').isVisible()).toBe(true);
  });

  test('sequential navigation is not dropped and notifications hydrates without runtime errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await waitForRouter(page);
    await page.evaluate(() => { window.__loadCount = 1; });

    const result = await page.evaluate(async () => {
      const first = await window.DokeNavigate('/resultados.html');
      const second = await window.DokeNavigate('/detalhe-anuncio.html');
      const detailPage = document.body.dataset.page;
      const third = await window.DokeNavigate('/notificacoes.html');
      return {
        first,
        second,
        third,
        detailPage,
        finalPage: document.body.dataset.page,
        hydration: document.body.dataset.pageHydration,
        loadCount: window.__loadCount
      };
    });

    expect(result.first).not.toBe(false);
    expect(result.second).not.toBe(false);
    expect(result.third).not.toBe(false);
    expect(result.detailPage).toBe('detalhe-anuncio');
    expect(result.finalPage).toBe('notificacoes');
    expect(['ready', 'empty']).toContain(result.hydration);
    expect(result.loadCount).toBe(1);
    expect(pageErrors).toEqual([]);
  });

  test('hydration watchdog ends in error instead of leaving an infinite skeleton', async ({ page }) => {
    await waitForRouter(page);
    await page.evaluate(() => {
      const original = window.DokePageHydration;
      window.DokePageHydration = Object.freeze({
        ...original,
        create(options) {
          return original.create({
            ...options,
            waitFor: [...(options.waitFor || ['dom']), 'test-timeout'],
            maxDuration: 120
          });
        }
      });
    });

    await page.evaluate(() => window.DokeNavigate('/mensagens.html'));
    await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration)).toBe('error');
    expect(await page.locator('[data-page-hydration-retry]').isVisible()).toBe(true);
    expect(await page.locator('[data-messages-hydration-skeleton]').isVisible()).toBe(false);
  });

  test('valid page-data cache renders immediately and revalidates in background', async ({ page }) => {
    await waitForRouter(page);
    await page.evaluate(() => {
      window.__cacheHits = 0;
      window.__revalidations = 0;
      document.addEventListener('doke:page-data-cache-hit', () => { window.__cacheHits += 1; });
      document.addEventListener('doke:page-data-revalidated', () => { window.__revalidations += 1; });
    });

    await page.evaluate(() => window.DokeNavigate('/detalhe-anuncio.html'));
    await page.evaluate(() => window.DokeNavigate('/index.html'));
    await page.evaluate(() => window.DokeNavigate('/detalhe-anuncio.html'));

    const cache = await page.evaluate(() => ({
      hits: window.__cacheHits,
      revalidations: window.__revalidations,
      page: document.body.dataset.page
    }));
    expect(cache.page).toBe('detalhe-anuncio');
    expect(cache.hits).toBeGreaterThan(0);
    expect(cache.revalidations).toBeGreaterThan(0);
  });
});
