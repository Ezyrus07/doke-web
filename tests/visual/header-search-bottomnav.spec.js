const { test, expect } = require('@playwright/test');

const comparablePages = ['index.html', 'resultados.html', 'pedidos.html', 'mensagens.html'];

test.describe('Visual guardrails: header/search/bottom nav', () => {
  for (const pagePath of comparablePages) {
    test(`${pagePath} mobile chrome screenshot`, async ({ page }) => {
      await page.goto(`/${pagePath}`);
      await expect(page.locator('.doke-mobile-app-shell')).toBeVisible();
      await expect(page).toHaveScreenshot(`${pagePath.replace('.html', '')}-mobile-chrome.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
