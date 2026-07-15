const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
});

const waitForTerminalState = async (page, expected = ['ready', 'empty', 'error']) => {
  await expect.poll(async () => expected.includes(
    await page.evaluate(() => document.body.dataset.pageHydration || 'missing'),
  ), { timeout: 30_000 }).toBe(true);
};

const readState = (page) => page.evaluate(() => {
  const visible = (node) => {
    if (!node || node.hidden) return false;
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const box = node.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const readyNodes = [...document.querySelectorAll('[data-results-hydration-ready]')];
  const grid = document.querySelector('[data-results-grid]');
  const inlineEmpty = document.querySelector('[data-results-inline-empty]');
  const primary = {
    loading: visible(document.querySelector('[data-results-hydration-skeleton]'))
      || visible(document.querySelector('[data-state-loading]')),
    ready: readyNodes.some(visible),
    error: visible(document.querySelector('[data-state-error]')),
  };

  return {
    hydration: document.body.dataset.pageHydration || '',
    boundaryState: document.querySelector('[data-state-boundary="resultados"]')?.dataset.viewState || '',
    repositoryState: window.Doke?.resultadosDataController?.getRoot?.()?.dataset.resultsRepositoryState || '',
    resultsState: document.querySelector('[data-results-layout]')?.dataset.resultsState || '',
    primary,
    primaryVisibleCount: Object.values(primary).filter(Boolean).length,
    inlineEmptyVisible: visible(inlineEmpty),
    gridVisible: visible(grid),
    gridItemCount: grid?.children.length || 0,
    retryVisible: visible(document.querySelector('[data-page-hydration-retry]')),
  };
});

const expectReadyResults = async (page) => {
  await waitForTerminalState(page);
  const state = await readState(page);
  expect(state.hydration).toBe('ready');
  expect(state.primaryVisibleCount).toBe(1);
  expect(state.primary).toEqual({ loading: false, ready: true, error: false });
  expect(state.inlineEmptyVisible).toBe(false);
  expect(state.gridVisible).toBe(true);
  expect(state.gridItemCount).toBeGreaterThan(0);
};

const expectReadyEmpty = async (page) => {
  await waitForTerminalState(page);
  const state = await readState(page);
  expect(state.hydration).toBe('ready');
  expect(state.primaryVisibleCount).toBe(1);
  expect(state.primary).toEqual({ loading: false, ready: true, error: false });
  expect(state.resultsState).toBe('empty');
  expect(state.inlineEmptyVisible).toBe(true);
  expect(state.gridItemCount).toBe(0);
};

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('direct URL, F5 and DokeNavigate settle one results surface', async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.goto('/resultados.html?q=limpeza&type=services');
      await expectReadyResults(page);

      await testInfo.attach(`results-ready-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      await page.reload();
      await expectReadyResults(page);

      await page.goto('/index.html');
      await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
      await page.evaluate(() => window.DokeNavigate('/resultados.html?q=limpeza&type=services'));
      await expectReadyResults(page);

      await page.evaluate(() => {
        window.DokeInitSearchResults();
        window.DokeInitSearchResults();
      });
      await expectReadyResults(page);

      await page.evaluate(() => window.DokeNavigate('/resultados.html?q=__sem_resultado__&type=users', { force: true }));
      await expectReadyEmpty(page);

      await testInfo.attach(`results-empty-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  });
}

test.describe('results failure states', () => {
  test.use({ viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false });

  test('renderer failure publishes one recoverable error surface', async ({ page }, testInfo) => {
    await page.route('**/assets/js/pages/search-data.js*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `window.DokeSearchData = {
        normalize: (value = '') => String(value).toLowerCase(),
        servicePool: [], userPool: [], shortVideoPool: [], beforeAfterPool: [],
        recommendations: [], categories: [], locationOptions: {},
        getServiceMatches: () => { throw new Error('renderer failure'); },
        getUserMatches: () => [], getShortVideoMatches: () => [], getBeforeAfterMatches: () => []
      };`,
    }));

    await page.goto('/resultados.html?q=falha&type=services');
    await waitForTerminalState(page, ['error']);
    const state = await readState(page);
    expect(state.hydration).toBe('error');
    expect(state.primaryVisibleCount).toBe(1);
    expect(state.primary).toEqual({ loading: false, ready: false, error: true });
    expect(state.retryVisible).toBe(true);

    await testInfo.attach('results-renderer-error-desktop-1366', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('repository failure remains non-visual and cannot restore loading', async ({ page }) => {
    await page.route('**/assets/js/services/page-data-orchestrator.js*', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: `window.Doke = window.Doke || {};
        window.Doke.pageDataOrchestrator = {
          peekPageData: () => null,
          getPageData: () => Promise.reject(new Error('repository failure'))
        };`,
    }));

    await page.goto('/resultados.html?q=limpeza&type=services');
    await expectReadyResults(page);
    await page.evaluate(() => window.Doke.resultadosDataController.load(
      window.Doke.resultadosDataController.getRoot(),
    ));
    await expect.poll(
      () => page.evaluate(() => window.Doke.resultadosDataController.getRoot()?.dataset.resultsRepositoryState),
      { timeout: 30_000 },
    ).toBe('error');
    const state = await readState(page);
    expect(state.primaryVisibleCount).toBe(1);
    expect(state.primary).toEqual({ loading: false, ready: true, error: false });
    expect(state.repositoryState).toBe('error');
  });
});
