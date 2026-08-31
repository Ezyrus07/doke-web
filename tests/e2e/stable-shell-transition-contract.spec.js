const { test, expect } = require('@playwright/test');

const authenticatedSession = {
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  user: {
    id: 'stable-shell-client',
    role: 'client',
    name: 'Cliente Stable Shell',
    email: 'stable-shell@example.test',
    accountStatus: 'active',
  },
};

const waitForRouter = async (page) => {
  await page.addInitScript((session) => {
    localStorage.setItem('doke.auth.session.v1', JSON.stringify(session));
  }, authenticatedSession);
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

  test('slow data route preserves the previous page until direct hydration can commit', async ({ page }) => {
    await page.addInitScript(() => { window.__DOKE_DISABLE_ROUTE_WARMUP__ = true; });
    let releaseAsset;
    let markAssetRequested;
    const assetRequested = new Promise((resolve) => { markAssetRequested = resolve; });
    const assetRelease = new Promise((resolve) => { releaseAsset = resolve; });
    await page.route('**/assets/js/pages/pedidos.js*', async (route) => {
      markAssetRequested();
      await assetRelease;
      await route.continue();
    });
    await waitForRouter(page);
    await page.evaluate(() => {
      const isVisible = (node) => {
        if (!node || node.hidden) return false;
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || 1) > 0
          && rect.width > 0
          && rect.height > 0;
      };
      window.__loadCount = 1;
      window.addEventListener('load', () => { window.__loadCount += 1; });
      window.__transitionStates = [];
      window.__hydrationStates = [];
      window.__documentPreloaderReplay = false;
      window.__destinationSkeletonSeen = false;
      window.__directHydrationProbeActive = true;
      document.addEventListener('doke:route-transition-state', (event) => {
        window.__transitionStates.push(event.detail.state);
      });
      document.addEventListener('doke:page-hydration-state', (event) => {
        if (event.detail?.page === 'pedidos') {
          window.__hydrationStates.push(event.detail.state);
        }
      });
      const sample = () => {
        if (!window.__directHydrationProbeActive) return;
        if (document.body?.dataset.page === 'pedidos') {
          const preloader = document.querySelector('[data-orders-document-preloader]');
          const skeletons = [...document.querySelectorAll('[data-orders-hydration-skeleton], [data-orders-hydration-count-skeleton]')];
          if (isVisible(preloader)) window.__documentPreloaderReplay = true;
          if (skeletons.some(isVisible)) window.__destinationSkeletonSeen = true;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      window.__pendingNavigation = window.DokeNavigate('/pedidos.html');
    });

    await assetRequested;
    await page.waitForTimeout(100);
    const blocked = await page.evaluate(() => ({
      page: document.body.dataset.page,
      states: window.__transitionStates,
      loadCount: window.__loadCount
    }));
    expect(blocked.page).toBe('home');
    expect(blocked.states).not.toContain('direct-commit');
    expect(blocked.states).not.toContain('skeleton-commit');
    expect(blocked.loadCount).toBe(1);

    releaseAsset();
    await page.evaluate(() => window.__pendingNavigation);
    await expect.poll(() => page.evaluate(() => document.body.dataset.page)).toBe('pedidos');
    await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration)).toMatch(/^(ready|empty)$/);
    await page.waitForTimeout(50);
    await page.evaluate(() => { window.__directHydrationProbeActive = false; });

    const settled = await page.evaluate(() => ({
      state: document.body.dataset.pageHydration,
      skeletonVisible: [...document.querySelectorAll('[data-orders-hydration-skeleton], [data-orders-hydration-count-skeleton]')]
        .some((node) => !node.hidden && getComputedStyle(node).display !== 'none'),
      states: window.__transitionStates,
      hydrationStates: window.__hydrationStates,
      documentPreloaderReplay: window.__documentPreloaderReplay,
      destinationSkeletonSeen: window.__destinationSkeletonSeen,
      loadCount: window.__loadCount
    }));
    expect(['ready', 'empty']).toContain(settled.state);
    expect(settled.states).toContain('direct-commit');
    expect(settled.states).not.toContain('skeleton-commit');
    expect(settled.hydrationStates).toContain('hydrating');
    expect(settled.hydrationStates.some((state) => state === 'ready' || state === 'empty')).toBe(true);
    expect(settled.documentPreloaderReplay).toBe(false);
    expect(settled.destinationSkeletonSeen).toBe(false);
    expect(settled.skeletonVisible).toBe(false);
    expect(settled.loadCount).toBe(1);
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
