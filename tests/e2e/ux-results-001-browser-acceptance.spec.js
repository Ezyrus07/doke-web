const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
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
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://*.supabase.co/**', (route) => route.abort());
});

async function boot(page) {
  await page.goto('/resultados.html?q=limpeza&type=services');
  await expect.poll(() => page.evaluate(() => Boolean(
    window.Doke?.searchResultsPresentation
    && window.Doke?.searchResultsDomAdapter
    && document.querySelector('[data-results-grid]')
  )), { timeout: 30_000 }).toBe(true);

  await page.evaluate(() => {
    window.DokeSearchResultsCleanup?.();
    const grid = document.querySelector('[data-results-grid]');
    grid.hidden = false;
    grid.textContent = '';
    const installation = window.Doke.searchResultsDomAdapter.install({
      initial: {
        applied: true,
        searchFingerprint: 'browser-initial',
        mode: 'services',
        state: 'idle',
        authority: 'fixture_catalog',
        coverage: 'current_environment',
      },
    });
    const cards = (labels) => {
      grid.textContent = '';
      labels.forEach((label) => {
        const card = document.createElement('article');
        card.className = 'doke-ad-card doke-card';
        card.dataset.acceptanceCard = label;
        card.textContent = label;
        grid.appendChild(card);
      });
      grid.hidden = false;
    };
    const read = () => {
      const layout = document.querySelector('[data-results-layout]');
      const loading = document.querySelector('[data-results-loading]');
      const empty = document.querySelector('[data-results-inline-empty]');
      const loadMore = document.querySelector('[data-results-load-more]');
      return {
        state: layout?.dataset.resultsState || '',
        title: document.querySelector('[data-results-title]')?.textContent || '',
        count: document.querySelector('[data-results-count]')?.textContent || '',
        gridHidden: grid.hidden,
        gridCount: grid.children.length,
        loadingHidden: loading?.hidden ?? true,
        emptyHidden: empty?.hidden ?? true,
        loadMoreHidden: loadMore?.hidden ?? true,
        loadMoreDisabled: loadMore?.disabled ?? false,
        loadMoreAriaDisabled: loadMore?.getAttribute('aria-disabled') || 'false',
        loadMoreText: loadMore?.textContent || '',
        errorHidden: document.querySelector('[data-state-error]')?.hidden ?? true,
        active: document.activeElement === document.querySelector('[data-results-search-input]')
          ? 'search'
          : document.activeElement === loadMore ? 'load-more' : '',
        overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      };
    };
    window.__uxResults = { installation, grid, cards, read };
  });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }));
}

async function seed(page, count = 2, hasNext = true) {
  return page.evaluate(({ count, hasNext }) => {
    const h = window.__uxResults;
    h.cards(Array.from({ length: count }, (_, index) => `accepted-${index + 1}`));
    const ticket = h.installation.begin({
      mode: 'services',
      operation: 'initial',
      query: 'limpeza',
      authority: 'fixture_catalog',
      coverage: 'current_environment',
    });
    const receipt = h.installation.commit(ticket, {
      applied: true,
      state: 'ready',
      query: 'limpeza',
      count,
      hasNext,
      authority: 'fixture_catalog',
      coverage: 'current_environment',
      sections: {
        users: { count: 1, intentFingerprint: ticket.searchFingerprint },
        workers: { count: 1, intentFingerprint: 'stale-owner' },
      },
    });
    return {
      applied: receipt?.applied === true,
      state: h.read(),
      usersVisible: !document.querySelector('[data-results-users]')?.hidden,
      workersVisible: !document.querySelector('[data-results-videos]')?.hidden,
    };
  }, { count, hasNext });
}

for (const viewport of viewports) {
  test.describe(`UX-RESULTS-001 ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('latest-wins has no blocking flicker and empty/fallback remain distinct', async ({ page }) => {
      test.setTimeout(90_000);
      await boot(page);
      const initial = await seed(page);
      expect(initial.applied).toBe(true);
      expect(initial.usersVisible).toBe(true);
      expect(initial.workersVisible).toBe(false);

      const result = await page.evaluate(async () => {
        const h = window.__uxResults;
        document.querySelector('[data-results-search-input]').focus();
        await new Promise(requestAnimationFrame);
        const focusBefore = h.read().active;
        const frames = [];
        const capture = () => frames.push(h.read());

        const oldTicket = h.installation.begin({
          mode: 'services',
          operation: 'initial',
          query: 'telhado',
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });
        capture();
        const currentTicket = h.installation.begin({
          mode: 'services',
          operation: 'initial',
          query: 'pintura',
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });
        capture();
        for (let index = 0; index < 3; index += 1) {
          await new Promise(requestAnimationFrame);
          capture();
        }

        const stale = h.installation.commit(oldTicket, {
          applied: true,
          state: 'ready',
          count: 99,
        });
        capture();
        h.cards(['pintura-1']);
        const accepted = h.installation.commit(currentTicket, {
          applied: true,
          state: 'ready',
          query: 'pintura',
          count: 1,
          hasNext: false,
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });

        h.grid.textContent = '';
        const emptyTicket = h.installation.begin({
          mode: 'services',
          operation: 'initial',
          query: 'sem resultado',
        });
        h.installation.commit(emptyTicket, {
          applied: true,
          state: 'empty',
          query: 'sem resultado',
          count: 0,
        });
        const empty = h.read();

        h.cards(['fallback-1', 'fallback-2']);
        const fallbackTicket = h.installation.begin({
          mode: 'services',
          operation: 'initial',
          query: 'inexistente',
        });
        h.installation.commit(fallbackTicket, {
          applied: true,
          state: 'fallback',
          query: 'inexistente',
          count: 2,
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });

        return {
          frames,
          staleApplied: stale?.applied === true,
          staleReason: stale?.reason,
          acceptedApplied: accepted?.applied === true,
          focusBefore,
          empty,
          fallback: h.read(),
        };
      });

      expect(result.staleApplied).toBe(false);
      expect(result.staleReason).toBe('generation-mismatch');
      expect(result.acceptedApplied).toBe(true);
      expect(result.frames.every((frame) => (
        !frame.gridHidden
        && frame.loadingHidden
        && frame.gridCount === 2
        && frame.active === result.focusBefore
      ))).toBe(true);
      expect(result.empty.state).toBe('empty');
      expect(result.empty.emptyHidden).toBe(false);
      expect(result.empty.title).toBe('Nenhum resultado encontrado');
      expect(result.fallback.state).toBe('fallback');
      expect(result.fallback.emptyHidden).toBe(true);
      expect(result.fallback.gridCount).toBe(2);
      expect(result.fallback.title).toBe('Outros anúncios');
      expect(result.fallback.overflow).toBeLessThanOrEqual(1);
    });
  });
}

test('pagination preserves focus, rollback and retry', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  await seed(page);

  const pagination = await page.evaluate(async () => {
    const h = window.__uxResults;
    const loadMore = document.querySelector('[data-results-load-more]');
    loadMore.focus();

    const rollbackTicket = h.installation.begin({
      mode: 'services',
      operation: 'pagination',
      query: 'limpeza',
      authority: 'fixture_catalog',
      coverage: 'current_environment',
    });
    const during = h.read();
    await new Promise(requestAnimationFrame);
    const afterFrame = h.read();
    h.installation.cancel(rollbackTicket, 'pagination-failed');
    const restored = h.read();

    const appendTicket = h.installation.begin({
      mode: 'services',
      operation: 'pagination',
      query: 'limpeza',
      authority: 'fixture_catalog',
      coverage: 'current_environment',
    });
    const card = document.createElement('article');
    card.textContent = 'accepted-3';
    h.grid.appendChild(card);
    const appended = h.installation.commit(appendTicket, {
      applied: true,
      state: 'ready',
      query: 'limpeza',
      count: 3,
      hasNext: false,
      authority: 'fixture_catalog',
      coverage: 'current_environment',
    });

    return {
      during,
      afterFrame,
      restored,
      appended: appended?.applied === true,
      final: h.read(),
    };
  });

  for (const state of [pagination.during, pagination.afterFrame]) {
    expect(state.state).toBe('paginating');
    expect(state.gridHidden).toBe(false);
    expect(state.loadingHidden).toBe(true);
    expect(state.gridCount).toBe(2);
    expect(state.loadMoreDisabled).toBe(false);
    expect(state.loadMoreAriaDisabled).toBe('true');
    expect(state.loadMoreText).toBe('Carregando mais...');
    expect(state.active).toBe('load-more');
  }
  expect(pagination.restored.state).toBe('ready');
  expect(pagination.restored.count).toBe('2');
  expect(pagination.restored.loadMoreHidden).toBe(false);
  expect(pagination.appended).toBe(true);
  expect(pagination.final.count).toBe('3');
  expect(pagination.final.gridCount).toBe(3);
  expect(pagination.final.loadMoreHidden).toBe(true);

  await page.evaluate(() => {
    window.__retryCalls = 0;
    window.Doke.searchResultsServerSurface = {
      retry() {
        window.__retryCalls += 1;
        document.dispatchEvent(new CustomEvent('doke:search-server-page-rendered'));
        return Promise.resolve([]);
      },
    };
    document.dispatchEvent(new CustomEvent('doke:search-server-error', {
      detail: { retryAvailable: true },
    }));
  });

  const retry = page.locator('[data-search-retry]');
  await expect(retry).toBeVisible();
  await retry.focus();
  await expect(retry).toBeFocused();
  await retry.click();
  await expect.poll(() => page.evaluate(() => window.__retryCalls)).toBe(1);
  await expect(retry).toBeHidden();

  const error = await page.evaluate(() => {
    const h = window.__uxResults;
    const ticket = h.installation.begin({
      mode: 'services',
      operation: 'retry',
      query: 'limpeza',
    });
    const receipt = h.installation.fail(ticket, {
      query: 'limpeza',
      retryAvailable: true,
      errorCode: 'DOKE_SEARCH_FAILED',
      authority: 'fixture_catalog',
      coverage: 'current_environment',
    });
    return { applied: receipt?.applied === true, state: h.read() };
  });
  expect(error.applied).toBe(true);
  expect(error.state.state).toBe('error');
  expect(error.state.title).toBe('Busca indisponível');
  expect(error.state.errorHidden).toBe(false);
});


test.describe('PD-RESULTS-001 exact viewport contract', () => {
  const exactViewports = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet-compact', width: 608, height: 926 },
    { name: 'tablet-wide', width: 820, height: 1180 },
    { name: 'desktop', width: 1366, height: 768 },
  ];

  for (const viewport of exactViewports) {
    test(`${viewport.name} ${viewport.width}x${viewport.height} preserves discovery hierarchy`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await boot(page);

      await page.evaluate(() => {
        const h = window.__uxResults;
        const services = [
          {
            id: 'pd-results-1',
            title: 'Fotografia profissional para marcas e eventos',
            category: 'Fotografia',
            providerName: 'André Foto',
            providerHandle: '@andrefoto',
            rating: 5,
            reviewsCount: 42,
            responseTime: 'em 35 min',
            tags: ['Disponível hoje', 'Verificado'],
            location: 'Barra, Salvador',
            priceLabel: 'R$ 600',
          },
          {
            id: 'pd-results-2',
            title: 'Ensaio profissional com direção de poses',
            category: 'Fotografia',
            providerName: 'Luiza Martins',
            providerHandle: '@luizamartins',
            rating: 4.9,
            reviewsCount: 68,
            responseTime: 'em 50 min',
            tags: ['Amanhã', 'Verificado'],
            location: 'Rio Vermelho, Salvador',
            priceLabel: 'R$ 420',
          },
        ];

        h.grid.textContent = '';
        services.forEach((service) => {
          h.grid.appendChild(window.Doke.publicServiceCard.create(service, { results: true }));
        });
        h.grid.hidden = false;

        const ticket = h.installation.begin({
          mode: 'services',
          operation: 'initial',
          query: 'fotografia',
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });
        h.installation.commit(ticket, {
          applied: true,
          state: 'ready',
          query: 'fotografia',
          count: services.length,
          hasNext: false,
          authority: 'fixture_catalog',
          coverage: 'current_environment',
        });
      });

      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

      const metrics = await page.evaluate(() => {
        const visible = (selector) => {
          const node = document.querySelector(selector);
          if (!node) return false;
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && !node.hidden && rect.width > 0 && rect.height > 0;
        };
        const grid = document.querySelector('[data-results-grid]');
        const cards = Array.from(grid?.querySelectorAll('.doke-ad-card--results') || []);
        const firstCard = cards[0];
        const gridStyle = grid ? getComputedStyle(grid) : null;
        const firstCardStyle = firstCard ? getComputedStyle(firstCard) : null;
        return {
          overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
          shellVisible: visible('.doke-mobile-shell'),
          bottomNavVisible: visible('.doke-mobile-bottom-nav'),
          appHeaderVisible: visible('.app-header'),
          pageSearchVisible: visible('.results-searchbar .doke-results-search__form'),
          filterToggleVisible: visible('.search-scope__filter-toggle'),
          sidebarVisible: visible('[data-shell-sidebar]'),
          cardCount: cards.length,
          gridColumns: gridStyle?.gridTemplateColumns || '',
          cardDisplay: firstCardStyle?.display || '',
          responseVisible: visible('.doke-ad-card__response'),
          locationContextVisible: visible('[data-results-location-context]'),
          summaryTitle: document.querySelector('[data-results-title]')?.textContent || '',
          count: document.querySelector('[data-results-count]')?.textContent || '',
        };
      });

      expect(metrics.overflow).toBeLessThanOrEqual(1);
      expect(metrics.cardCount).toBe(2);
      expect(metrics.responseVisible).toBe(true);
      expect(metrics.summaryTitle).toContain('fotografia');
      expect(metrics.count).toBe('2');

      if (viewport.width <= 560) {
        expect(metrics.shellVisible).toBe(true);
        expect(metrics.bottomNavVisible).toBe(true);
        expect(metrics.pageSearchVisible).toBe(false);
        expect(metrics.cardDisplay).toBe('grid');

        const shell = page.locator('.doke-mobile-shell');
        const actions = shell.locator('[data-shell-context-actions] > *');
        await expect(actions).toHaveCount(2);
        await expect(shell.locator('[data-shell-search-trigger]')).toHaveCount(1);
        await expect(shell.locator('[data-shell-filter]')).toHaveCount(1);

        const trigger = shell.locator('[data-shell-search-trigger]');
        const topbar = shell.locator('.doke-mobile-shell__topbar');
        const inlineSearch = shell.locator('[data-shell-inline-search][data-shell-inline-search-mode="results"]');
        await expect(inlineSearch).toBeHidden();
        await trigger.click();
        await expect(inlineSearch).toBeVisible();
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        const topbarBox = await topbar.boundingBox();
        const searchBox = await inlineSearch.boundingBox();
        expect(topbarBox).not.toBeNull();
        expect(searchBox).not.toBeNull();
        expect(searchBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
        expect(Math.abs(searchBox.width - topbarBox.width)).toBeLessThanOrEqual(1);
        await inlineSearch.locator('input').press('Escape');
        await expect(inlineSearch).toBeHidden();
        await expect(trigger).toBeFocused();

        await expect(shell.locator('[data-shell-filter]')).toHaveCount(1);
      } else {
        expect(metrics.shellVisible).toBe(false);
        expect(metrics.bottomNavVisible).toBe(false);
        expect(metrics.appHeaderVisible).toBe(true);
        expect(metrics.pageSearchVisible).toBe(true);
        expect(metrics.filterToggleVisible).toBe(true);
      }

      if (viewport.width >= 1181) {
        expect(metrics.sidebarVisible).toBe(true);
      }

      await page.screenshot({
        path: testInfo.outputPath(`pd-results-001-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    });
  }


  test('phone shell filter delegates to the live Resultados filter presentation', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/resultados.html?q=fotografia&type=services');

    const shellFilter = page.locator('.doke-mobile-shell [data-shell-filter]');
    const pageFilterTrigger = page.locator('[data-results-filters-open]').first();
    const backdrop = page.locator('[data-results-filters-backdrop]');

    await expect(shellFilter).toBeVisible();
    await expect(pageFilterTrigger).toHaveAttribute('aria-expanded', 'false');
    await shellFilter.click();
    await expect(pageFilterTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(backdrop).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/results-filters-open/);
  });
});
