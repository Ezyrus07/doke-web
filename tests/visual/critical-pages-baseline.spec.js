const { test, expect } = require('@playwright/test');
const manifest = require('../../docs/visual-baseline/critical-pages-baseline.json');

async function waitForStablePage(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForTimeout(350);
}

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

for (const viewport of manifest.viewports) {
  test.describe(`Critical visual baseline - ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
      hasTouch: Boolean(viewport.hasTouch),
    });

    for (const pageEntry of manifest.pages) {
      test(`${pageEntry.key} keeps ${viewport.name} baseline`, async ({ page }) => {
        await page.goto(`/${pageEntry.path}`);
        await waitForStablePage(page);

        if (viewport.kind === 'desktop') {
          const desktopShell = page.locator('.desktop-sidebar, .sidebar, aside').first();
          await expect(desktopShell, `${pageEntry.path} deve manter shell/sidebar desktop`).toBeVisible();
        }

        if (viewport.kind === 'mobile') {
          const mobileShell = page.locator('.doke-mobile-app-shell, .mobile-bottom-nav, .doke-bottom-nav').first();
          await expect(mobileShell, `${pageEntry.path} deve manter shell mobile`).toBeVisible();
        }

        await expect(page).toHaveScreenshot(`${safeName(pageEntry.key)}-${safeName(viewport.name)}.png`, {
          fullPage: false,
          maxDiffPixelRatio: 0.02,
        });
      });
    }
  });
}
