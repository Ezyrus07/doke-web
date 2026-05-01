const { test, expect } = require('@playwright/test');
const manifest = require('../../docs/visual-baseline/visual-qa-manifest.json');

const pages = manifest.pages.map((entry) => entry.path);

async function waitForStablePage(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

test.describe('Stage 28 visual QA baseline - mobile', () => {
  test.use({ viewport: { width: 380, height: 844 }, isMobile: true, hasTouch: true });

  for (const pagePath of pages) {
    test(`${pagePath} mobile viewport baseline`, async ({ page }) => {
      await page.goto(`/${pagePath}`);
      await waitForStablePage(page);

      const mobileShell = page.locator('.doke-mobile-app-shell');
      await expect(mobileShell, `${pagePath} deve ter App Shell mobile`).toBeVisible();

      await expect(page).toHaveScreenshot(`${pagePath.replace('.html', '')}-iphone-13.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});

test.describe('Stage 28 visual QA baseline - desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  for (const pagePath of pages) {
    test(`${pagePath} desktop viewport baseline`, async ({ page }) => {
      await page.goto(`/${pagePath}`);
      await waitForStablePage(page);

      const sidebar = page.locator('.desktop-sidebar, .sidebar, aside').first();
      await expect(sidebar, `${pagePath} deve manter sidebar/estrutura desktop`).toBeVisible();

      await expect(page).toHaveScreenshot(`${pagePath.replace('.html', '')}-desktop-1440.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
