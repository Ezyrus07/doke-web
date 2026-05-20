const { test, expect } = require('@playwright/test');

const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

test.describe('Stage 28 regression guards', () => {
  test.describe('mobile shell boundary', () => {
    test.use({ viewport: { width: 380, height: 844 }, isMobile: true, hasTouch: true });

    for (const pagePath of pages) {
      test(`${pagePath} keeps mobile-only shell and hides desktop search`, async ({ page }) => {
        await page.goto(`/${pagePath}`);
        await page.waitForLoadState('domcontentloaded');

        await expect(page.locator('.doke-mobile-app-shell')).toBeVisible();
        await expect(page.locator('.doke-mobile-shell__search')).toBeVisible();

        const desktopSearch = page.locator('.doke-desktop-search-panel, .home-search-hero__desktop-search');
        if (await desktopSearch.count()) {
          await expect(desktopSearch.first()).toBeHidden();
        }
      });
    }
  });

  test.describe('desktop shell boundary', () => {
    test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

    test('index keeps desktop search visible', async ({ page }) => {
      await page.goto('/index.html');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('.doke-desktop-search-panel, .home-search-hero__desktop-search').first()).toBeVisible();
    });

    for (const pagePath of pages) {
      test(`${pagePath} does not expose mobile shell on desktop`, async ({ page }) => {
        await page.goto(`/${pagePath}`);
        await page.waitForLoadState('domcontentloaded');
        const mobileShell = page.locator('.doke-mobile-app-shell');
        if (await mobileShell.count()) {
          await expect(mobileShell.first()).toBeHidden();
        }
      });
    }
  });
});
