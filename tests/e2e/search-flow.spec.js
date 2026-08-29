const { test, expect } = require('@playwright/test');

test.describe('Search flow shell contract', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('home mobile search shell accepts typing and submits canonical query', async ({ page }) => {
    await page.goto('/index.html');
    const shells = page.locator('[data-doke-mobile-shell]');
    await expect(shells).toHaveCount(1);

    const searchForm = shells.locator('form.doke-mobile-shell__search');
    await expect(searchForm).toBeVisible();
    const search = searchForm.locator('input[type="search"]').first();
    await search.fill('pintor');
    await expect(search).toHaveValue('pintor');

    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith('/resultados.html') && url.searchParams.get('q') === 'pintor'),
      searchForm.evaluate((form) => form.requestSubmit()),
    ]);

    await expect(page.locator('[data-doke-mobile-shell]')).toHaveCount(1);
    await expect(page.locator('.doke-mobile-shell__search input[type="search"]').first()).toHaveValue('pintor');
  });

  test('results page keeps one mobile search shell bound to canonical query', async ({ page }) => {
    await page.goto('/resultados.html?q=pintor');
    const shells = page.locator('[data-doke-mobile-shell]');
    await expect(shells).toHaveCount(1);
    const searchForm = shells.locator('form.doke-mobile-shell__search');
    await expect(searchForm).toBeVisible();
    await expect(searchForm.locator('input[type="search"]').first()).toHaveValue('pintor');
    expect(new URL(page.url()).searchParams.get('q')).toBe('pintor');
  });
});
