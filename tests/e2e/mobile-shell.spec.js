const { test, expect } = require('@playwright/test');

const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade-interna.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

test.describe('Mobile App Shell', () => {
  for (const pagePath of pages) {
    test(`${pagePath} renders canonical mobile shell`, async ({ page }) => {
      await page.goto(`/${pagePath}`);
      await expect(page.locator('.doke-mobile-app-shell')).toBeVisible();
      await expect(page.locator('.doke-mobile-shell__topbar')).toBeVisible();
      await expect(page.locator('.doke-mobile-shell__bottom-nav')).toBeVisible();
    });
  }
});
