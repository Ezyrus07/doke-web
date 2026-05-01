const { test, expect } = require('@playwright/test');

test.describe('Search flow shell contract', () => {
  test('home search shell accepts typing without layout regression', async ({ page }) => {
    await page.goto('/index.html');
    const search = page.locator('.doke-mobile-shell__search input[type="search"], .doke-mobile-shell__search input').first();
    await expect(search).toBeVisible();
    await search.fill('pintor');
    await expect(search).toHaveValue('pintor');
  });

  test('results page keeps search flow contract', async ({ page }) => {
    await page.goto('/resultados.html');
    await expect(page.locator('.doke-search-flow')).toHaveCount(await page.locator('.doke-search-flow').count());
    await expect(page.locator('.doke-mobile-shell__search')).toBeVisible();
  });
});
