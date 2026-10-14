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

    const resultsShell = page.locator('[data-doke-mobile-shell]');
    await expect(resultsShell).toHaveCount(1);
    const resultsTrigger = resultsShell.locator('[data-shell-search-trigger]');
    const resultsInline = resultsShell.locator('[data-shell-inline-search-mode="results"]');
    await expect(resultsTrigger).toBeVisible();
    await expect(resultsInline).toBeHidden();
    await resultsTrigger.click();
    await expect(resultsInline).toBeVisible();
    await expect(resultsTrigger).toHaveAttribute('aria-expanded', 'true');
    await expect(resultsInline.locator('input').first()).toHaveValue('pintor');
  });

  test('results page keeps one mobile search shell bound to canonical query', async ({ page }) => {
    await page.goto('/resultados.html?q=pintor');
    const shells = page.locator('[data-doke-mobile-shell]');
    await expect(shells).toHaveCount(1);
    const trigger = shells.locator('[data-shell-search-trigger]');
    const inlineForm = shells.locator('[data-shell-inline-search-mode="results"]');
    await expect(trigger).toBeVisible();
    await expect(inlineForm).toBeHidden();
    await trigger.click();
    await expect(inlineForm).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const inlineInput = inlineForm.locator('input').first();
    await expect(inlineInput).toBeFocused();
    await expect(inlineInput).toHaveValue('pintor');
    expect(new URL(page.url()).searchParams.get('q')).toBe('pintor');
    await inlineInput.press('Escape');
    await expect(inlineForm).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });
});
