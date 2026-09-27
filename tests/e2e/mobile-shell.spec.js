const { test, expect } = require('@playwright/test');

const pages = [
  { path: 'index.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'resultados.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'pedidos.html', leading: 'profile', actions: 1, bottomNav: true },
  { path: 'mensagens.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'comunidade.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'comunidade-interna.html', leading: 'back', actions: 1, bottomNav: true },
  { path: 'perfil.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'detalhe-anuncio.html', leading: 'back', actions: 0, bottomNav: true },
  { path: 'carteira.html', leading: 'profile', actions: 2, bottomNav: true },
  { path: 'notificacoes.html', leading: 'profile', actions: 2, bottomNav: false },
  { path: 'configuracoes.html', leading: 'profile', actions: 1, bottomNav: true },
  { path: 'anunciar-servico.html', leading: 'back', actions: 0, bottomNav: true },
];

test.describe('PD-SHELL-001 mobile app shell', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  for (const pageEntry of pages) {
    test(`${pageEntry.path} keeps the canonical shell on one mobile row`, async ({ page }) => {
      await page.goto(`/${pageEntry.path}`);

      const shell = page.locator('.doke-mobile-shell');
      const topbar = shell.locator('.doke-mobile-shell__topbar');
      await expect(shell).toBeVisible();
      await expect(topbar).toBeVisible();
      await expect(shell.locator('[data-shell-title]')).toBeVisible();

      if (pageEntry.leading === 'back') {
        await expect(shell.locator('.doke-mobile-shell__back')).toBeVisible();
        await expect(shell.locator('[data-shell-profile]')).toHaveCount(0);
      } else {
        await expect(shell.locator('[data-shell-profile]')).toBeVisible();
        await expect(shell.locator('.doke-mobile-shell__back')).toHaveCount(0);
      }

      const actions = shell.locator(
        '[data-shell-context-actions] > :is(.doke-mobile-shell__quick-action, .doke-mobile-shell__notification, .doke-mobile-shell__location)'
      );
      await expect(actions).toHaveCount(pageEntry.actions);
      expect(pageEntry.actions).toBeLessThanOrEqual(2);

      const topbarBox = await topbar.boundingBox();
      expect(topbarBox).not.toBeNull();
      for (let index = 0; index < pageEntry.actions; index += 1) {
        const actionBox = await actions.nth(index).boundingBox();
        expect(actionBox).not.toBeNull();
        expect(actionBox.y).toBeGreaterThanOrEqual(topbarBox.y - 1);
        expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(topbarBox.y + topbarBox.height + 1);
        expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(topbarBox.x + topbarBox.width + 1);
      }

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);

      const bottomNav = page.locator('.doke-mobile-bottom-nav');
      if (pageEntry.bottomNav) {
        await expect(bottomNav).toBeVisible();
      } else {
        await expect(bottomNav).toHaveCount(0);
      }
    });
  }

  test('notificacoes removes the self-referential notification action', async ({ page }) => {
    await page.goto('/notificacoes.html');
    const actions = page.locator('.doke-mobile-shell [data-shell-context-actions]');
    await expect(actions.locator('a[href="notificacoes.html"]')).toHaveCount(0);
    await expect(actions.locator('[data-shell-search-trigger]')).toHaveCount(1);
    await expect(actions.locator('[data-shell-filter]')).toHaveCount(1);
  });
});
