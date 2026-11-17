const { test, expect } = require('@playwright/test');

const READY_QUERY = '__qa_ready__';
const EMPTY_QUERY = '__qa_empty__';

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const installCanonicalSearchHarness = async (page) => {
  await page.route('**/assets/js/repositories/search-repository.js*', async (route) => {
    const response = await route.fetch();
    const originalBody = await response.text();
    const harness = `
;(function () {
  var Doke = window.Doke || (window.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var original = repositories.search;
  if (!original || original.__qaResultsLifecycleHarness === true) return;
  var emptyFallbackPending = false;
  var item = Object.freeze({
    id: 'qa-service-001',
    remoteId: 'qa-service-001',
    serviceId: 'qa-service-001',
    title: 'QA deterministic service',
    description: 'Synthetic browser-only contract fixture.',
    category: 'qa-contract',
    providerName: 'QA Provider',
    providerHandle: '@qa-provider',
    city: 'Sao Paulo',
    state: 'SP',
    location: 'Sao Paulo, SP',
    rating: 5,
    reviews: '1 avaliação',
    reviewsCount: 1,
    tags: ['qa', 'contract'],
    priceValue: 100,
    price: 100,
    updatedAt: '2026-08-28T00:00:00.000Z'
  });
  function responseFor(request, items) {
    var contract = original.getContract();
    return {
      authority: contract.expectedAuthority,
      contractVersion: contract.version,
      request: Object.assign({}, request || {}),
      items: items.slice(),
      page: {
        pageSize: Number(request && request.pageSize || 12),
        hasNext: false,
        nextCursor: null
      }
    };
  }
  repositories.search = Object.freeze({
    __qaResultsLifecycleHarness: true,
    queryPage: function (request) {
      request = request || {};
      // Opt-in deterministic UX-RESULTS-002 fixture. Previous lifecycle
      // scenarios retain their original READY/EMPTY responses.
      var cacheQa = window.__qaResultsCacheState;
      if (cacheQa && request.query === '') {
        cacheQa.calls.push({
          query: request.query,
          cursor: request.cursor || '',
          availableToday: Boolean(request.availableToday)
        });
        var isNextPage = Boolean(request.cursor);
        var nextPageItem = Object.assign({}, item, {
          id: 'qa-service-002',
          remoteId: 'qa-service-002',
          serviceId: 'qa-service-002',
          title: 'QA deterministic second page'
        });
        var response = responseFor(request, isNextPage ? [nextPageItem] : [item]);
        if (cacheQa.paginated && !isNextPage) {
          response.page.hasNext = true;
          response.page.nextCursor = 'qa-next-page';
        }
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(response); }, cacheQa.delayMs || 0);
        });
      }
      if (request.query === '${READY_QUERY}') {
        emptyFallbackPending = false;
        return Promise.resolve(responseFor(request, [item]));
      }
      if (request.query === '${EMPTY_QUERY}') {
        emptyFallbackPending = true;
        return Promise.resolve(responseFor(request, []));
      }
      if (emptyFallbackPending && request.query === '') {
        emptyFallbackPending = false;
        return Promise.resolve(responseFor(request, []));
      }
      emptyFallbackPending = false;
      return original.queryPage(request);
    },
    normalizeRequest: function (request) { return original.normalizeRequest(request); },
    getLastError: function () { return original.getLastError(); },
    getContract: function () { return original.getContract(); }
  });
}());`;
    await route.fulfill({ response, body: `${originalBody}\n${harness}` });
  });
};

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort();
  });
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await installCanonicalSearchHarness(page);
});

const waitForRouteHydration = async (page, expected = ['ready', 'error']) => {
  const accepted = Array.isArray(expected) ? expected : [expected];
  await expect.poll(async () => accepted.includes(
    await page.evaluate(() => document.body.dataset.pageHydration || 'missing'),
  ), { timeout: 30_000 }).toBe(true);
};

const waitForResultsState = async (page, expected) => {
  const accepted = Array.isArray(expected) ? expected : [expected];
  await expect.poll(async () => accepted.includes(
    await page.evaluate(() => document.querySelector('[data-results-layout]')?.dataset.resultsState || 'missing'),
  ), { timeout: 30_000 }).toBe(true);
};

const waitForRepositoryObserverState = async (page, expected) => {
  const accepted = Array.isArray(expected) ? expected : [expected];
  await expect.poll(async () => accepted.includes(
    await page.evaluate(() => window.Doke?.resultadosDataController?.getRoot?.()?.dataset.resultsRepositoryState || 'missing'),
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
  const errorNodes = [...document.querySelectorAll('[data-state-error]')].filter(visible);
  const primary = {
    loading: visible(document.querySelector('[data-results-hydration-skeleton]'))
      || visible(document.querySelector('[data-state-loading]')),
    ready: readyNodes.some(visible),
    error: errorNodes.length > 0,
  };
  return {
    hydration: document.body.dataset.pageHydration || '',
    boundaryState: document.querySelector('[data-state-boundary="resultados"]')?.dataset.viewState || '',
    repositoryState: window.Doke?.resultadosDataController?.getRoot?.()?.dataset.resultsRepositoryState || '',
    resultsState: document.querySelector('[data-results-layout]')?.dataset.resultsState || '',
    serverState: window.Doke?.searchResultsServerSurface?.getSnapshot?.()?.controller?.state || '',
    primary,
    primaryVisibleCount: Object.values(primary).filter(Boolean).length,
    inlineEmptyVisible: visible(inlineEmpty),
    gridVisible: visible(grid),
    gridItemCount: grid?.children.length || 0,
    pageRetryVisible: visible(document.querySelector('[data-page-hydration-retry]')),
    searchRetryVisible: visible(document.querySelector('[data-search-retry]')),
    errorSurfaceCount: errorNodes.length,
  };
});

const expectReadyResults = async (page) => {
  await waitForRouteHydration(page, 'ready');
  await waitForResultsState(page, 'ready');
  const state = await readState(page);
  expect(state.hydration).toBe('ready');
  expect(state.resultsState).toBe('ready');
  expect(state.serverState).toBe('ready');
  expect(state.primaryVisibleCount).toBe(1);
  expect(state.primary).toEqual({ loading: false, ready: true, error: false });
  expect(state.inlineEmptyVisible).toBe(false);
  expect(state.gridVisible).toBe(true);
  expect(state.gridItemCount).toBeGreaterThan(0);
};

const expectReadyEmpty = async (page) => {
  await waitForRouteHydration(page, 'ready');
  await waitForResultsState(page, 'empty');
  const state = await readState(page);
  expect(state.hydration).toBe('ready');
  expect(state.resultsState).toBe('empty');
  expect(state.serverState).toBe('empty');
  expect(state.primaryVisibleCount).toBe(1);
  expect(state.primary).toEqual({ loading: false, ready: true, error: false });
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
      const readyUrl = `/resultados.html?q=${READY_QUERY}&type=services`;
      await page.goto(readyUrl);
      await expectReadyResults(page);

      await testInfo.attach(`results-ready-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });

      await page.reload();
      await expectReadyResults(page);

      await page.goto('/index.html');
      await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
      await page.evaluate((url) => window.DokeNavigate(url), readyUrl);
      await expectReadyResults(page);

      await page.evaluate(() => {
        window.DokeInitSearchResults();
        window.DokeInitSearchResults();
      });
      await expectReadyResults(page);

      await page.evaluate((url) => window.DokeNavigate(url, { force: true }), `/resultados.html?q=${EMPTY_QUERY}&type=services`);
      await expectReadyEmpty(page);

      await testInfo.attach(`results-empty-${viewport.name}`, {
        body: await page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    });
  });
}

for (const width of [390, 820, 960]) {
  test.describe(`touch filters keyboard lifecycle ${width}`, () => {
    test.use({ viewport: { width, height: width === 390 ? 844 : 1180 }, hasTouch: true });

    test('excludes the closed sheet and restores the actual opener on every close path', async ({ page }) => {
      await page.goto(`/resultados.html?q=${READY_QUERY}&type=services`);
      await waitForResultsState(page, 'ready');
      const opener = page.locator(width === 390 ? '[data-shell-filter]:visible' : '[data-results-filters-open]:visible').first();
      const panel = page.locator('[data-results-pane="filters"]');
      await expect(panel).toHaveAttribute('inert', '');
      await expect(opener).toHaveAttribute('aria-expanded', 'false');
      await expect(opener).toHaveAttribute('aria-controls', 'results-filters-panel');
      await opener.focus();
      for (let step = 0; step < 30; step += 1) {
        await page.keyboard.press('Tab');
        expect(await panel.evaluate((node) => node.contains(document.activeElement))).toBe(false);
      }
      for (const method of ['button', 'backdrop', 'escape']) {
        await opener.click();
        await expect(page.locator('[data-results-filters-close]')).toBeFocused();
        await expect(opener).toHaveAttribute('aria-expanded', 'true');
        expect(await page.evaluate(() => window.Doke.overlayExperience.getSnapshot().depth)).toBe(1);
        await expect(page.locator('.app-shell')).toHaveAttribute('inert', '');
        if (method === 'button') await page.locator('[data-results-filters-close]').click();
        else if (method === 'backdrop') await page.locator('[data-results-filters-backdrop]').click({ position: { x: 5, y: 80 } });
        else await page.keyboard.press('Escape');
        await expect(opener).toBeFocused();
        await expect(opener).toHaveAttribute('aria-expanded', 'false');
        await expect(panel).toHaveAttribute('inert', '');
        await expect(page.locator('[data-results-filters-overlay]')).toHaveCount(0);
      }
      if (width === 390) {
        await opener.evaluate((node) => { document.activeElement.blur(); node.click(); });
        await expect(page.locator('[data-results-filters-close]')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(opener).toBeFocused();
      }
    });
  });
}

test.describe('results failure states', () => {
  test.use({ viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false });

  test('renderer failure publishes one recoverable error surface', async ({ page }, testInfo) => {
    await page.route('**/assets/js/components/public-service-card.js*', async (route) => {
      const response = await route.fetch();
      const originalBody = await response.text();
      const harness = `
;(function () {
  var Doke = window.Doke || (window.Doke = {});
  var original = Doke.publicServiceCard || {};
  Doke.publicServiceCard = Object.freeze(Object.assign({}, original, {
    create: function () {
      var error = new Error('renderer failure');
      error.code = 'DOKE_QA_RENDERER_FAILURE';
      throw error;
    }
  }));
}());`;
      await route.fulfill({ response, body: `${originalBody}\n${harness}` });
    });

    await page.goto(`/resultados.html?q=${READY_QUERY}&type=services`);
    await waitForResultsState(page, 'error');
    await waitForRouteHydration(page, 'error');
    const state = await readState(page);
    expect(state.hydration).toBe('error');
    expect(state.resultsState).toBe('error');
    expect(state.serverState).toBe('ready');
    expect(state.primaryVisibleCount).toBe(1);
    expect(state.primary).toEqual({ loading: false, ready: false, error: true });
    expect(state.errorSurfaceCount).toBe(1);
    expect(state.pageRetryVisible || state.searchRetryVisible).toBe(true);

    const searchRetry = page.locator('[data-search-retry]:visible');
    if (await searchRetry.count()) {
      await searchRetry.click();
      await waitForResultsState(page, 'error');
      const retried = await readState(page);
      expect(retried.errorSurfaceCount).toBe(1);
      expect(retried.pageRetryVisible || retried.searchRetryVisible).toBe(true);
    }

    await testInfo.attach('results-renderer-error-desktop-1366', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  });

  test('repository observer failure remains non-visual and cannot restore loading', async ({ page }) => {
    await page.goto(`/resultados.html?q=${READY_QUERY}&type=services`);
    await expectReadyResults(page);
    const before = await readState(page);

    await expect.poll(() => page.evaluate(() => Boolean(
      window.Doke?.resultadosDataController?.getRoot?.()
      && typeof window.Doke?.resultadosDataController?.load === 'function'
    ))).toBe(true);

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('doke:search-server-error', {
        detail: {
          append: false,
          code: 'DOKE_QA_REPOSITORY_OBSERVER_FAILURE',
          error: 'repository observer failure',
          authority: 'fixture-memory.search_public_services_v1',
          transport: 'fixture-memory',
          fallbackUsed: false,
          retryAvailable: false,
        },
      }));
    });

    await waitForRepositoryObserverState(page, 'error');
    await page.waitForTimeout(100);
    const state = await readState(page);
    expect(state.hydration).toBe('ready');
    expect(state.repositoryState).toBe('error');
    expect(state.resultsState).toBe('ready');
    expect(state.serverState).toBe('ready');
    expect(state.primaryVisibleCount).toBe(1);
    expect(state.primary).toEqual({ loading: false, ready: true, error: false });
    expect(state.errorSurfaceCount).toBe(0);
    expect(state.gridVisible).toBe(true);
    expect(state.gridItemCount).toBe(before.gridItemCount);
    expect(state.gridItemCount).toBeGreaterThan(0);
  });
});


// UX-RESULTS-002: extend the canonical repository harness, rather than
// duplicating repository implementation or altering production fixtures.
const enableResultsCacheFixture = async (page, { paginated = false } = {}) => {
  await page.addInitScript(({ paginated: enablePagination }) => {
    window.__qaResultsCacheState = {
      calls: [],
      delayMs: 0,
      paginated: enablePagination,
    };
  }, { paginated });
};

const selectResultsMode = async (page, mode) => {
  await page.evaluate((value) => {
    const input = document.querySelector('input[name="searchType"][value="' + value + '"]');
    if (!input) throw new Error('Missing search mode radio: ' + value);
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, mode);
};

const readCacheCalls = (page) => page.evaluate(() => window.__qaResultsCacheState?.calls || []);

for (const viewport of [viewports[0], viewports[2]]) {
  test.describe('UX-RESULTS-002 cache and tab ownership ' + viewport.name, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('reuses recent An?ncios and never shows Workers cards during a delayed refetch', async ({ page }) => {
      await enableResultsCacheFixture(page);
      await page.goto('/resultados.html?type=services');
      await waitForResultsState(page, 'ready');
      expect((await readCacheCalls(page))).toHaveLength(1);

      await selectResultsMode(page, 'workers');
      await expect.poll(() => page.evaluate(() => (
        document.querySelector('[data-results-layout]')?.dataset.resultsMode === 'workers'
        && document.querySelector('[data-results-grid]')?.children.length === 4
      ))).toBe(true);

      await selectResultsMode(page, 'services');
      await expect.poll(() => page.evaluate(() => (
        document.querySelector('[data-results-layout]')?.dataset.resultsMode === 'services'
        && document.querySelector('[data-results-layout]')?.dataset.resultsState === 'ready'
      ))).toBe(true);
      expect((await readCacheCalls(page))).toHaveLength(1);
      await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(1);

      await selectResultsMode(page, 'workers');
      await page.evaluate(() => {
        window.__qaResultsCacheState.delayMs = 800;
        document.dispatchEvent(new Event('doke:service-updated'));
      });
      await selectResultsMode(page, 'services');
      await waitForResultsState(page, 'loading');
      expect(await page.evaluate(() => document.querySelector('[data-results-grid]').hidden)).toBe(true);
      expect(await page.locator('[data-results-count]').textContent()).toBe('0');
      await waitForResultsState(page, 'ready');
      expect((await readCacheCalls(page))).toHaveLength(2);
      await expect(page.locator('[data-results-grid] .doke-ad-card')).toHaveCount(1);
    });

    test('applied filters never reuse an unfiltered response', async ({ page }) => {
      await enableResultsCacheFixture(page);
      await page.goto('/resultados.html?type=services');
      await waitForResultsState(page, 'ready');
      await selectResultsMode(page, 'workers');
      await page.evaluate(() => {
        const form = document.querySelector('[data-results-filters-form]');
        const checkbox = form.querySelector('[name="availableToday"]');
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        form.requestSubmit(form.querySelector('button[type="submit"]'));
      });
      await expect.poll(() => page.evaluate(() => (
        document.querySelector('[data-results-filters-form] [name="availableToday"]')?.checked
        && location.search.includes('availableToday=1')
      ))).toBe(true);

      await selectResultsMode(page, 'services');
      await expect.poll(async () => (await readCacheCalls(page)).length).toBe(2);
      const calls = await readCacheCalls(page);
      expect(calls[0].availableToday).toBe(false);
      expect(calls[1].availableToday).toBe(true);
      await waitForResultsState(page, 'ready');

      await selectResultsMode(page, 'workers');
      await selectResultsMode(page, 'services');
      await waitForResultsState(page, 'ready');
      expect((await readCacheCalls(page))).toHaveLength(2);
    });
  });
}

test.describe('UX-RESULTS-002 cache lifetime and pagination', () => {
  test.use({ viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false });

  test('expires 15-second cache based on fetch time, not the last tab visit', async ({ page }) => {
    await enableResultsCacheFixture(page);
    await page.goto('/resultados.html?type=services');
    await waitForResultsState(page, 'ready');
    await page.evaluate(() => {
      window.__qaNow = Date.now() + 10_000;
      Date.now = () => window.__qaNow;
    });
    await selectResultsMode(page, 'workers');
    await selectResultsMode(page, 'services');
    await waitForResultsState(page, 'ready');
    expect((await readCacheCalls(page))).toHaveLength(1);

    await page.evaluate(() => { window.__qaNow += 8_000; });
    await selectResultsMode(page, 'workers');
    await selectResultsMode(page, 'services');
    await expect.poll(async () => (await readCacheCalls(page)).length).toBe(2);
    await waitForResultsState(page, 'ready');
  });

  test('restores paginated An?ncios without refetching either page', async ({ page }) => {
    await enableResultsCacheFixture(page, { paginated: true });
    await page.goto('/resultados.html?type=services');
    await waitForResultsState(page, 'ready');
    expect((await readCacheCalls(page))).toHaveLength(1);
    await expect(page.locator('[data-results-load-more]')).toBeVisible();
    await page.locator('[data-results-load-more]').click();
    await expect.poll(() => page.locator('[data-results-grid]').locator(':scope > *').count()).toBe(2);
    expect((await readCacheCalls(page))).toHaveLength(2);

    await selectResultsMode(page, 'workers');
    await selectResultsMode(page, 'services');
    await expect.poll(() => page.locator('[data-results-grid]').locator(':scope > *').count()).toBe(2);
    await waitForResultsState(page, 'ready');
    expect((await readCacheCalls(page))).toHaveLength(2);
  });
});
