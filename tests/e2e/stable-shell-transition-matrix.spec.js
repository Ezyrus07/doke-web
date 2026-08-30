const { test, expect } = require('@playwright/test');

const pages = [
  ['index.html', 'home'],
  ['perfil.html', 'perfil'],
  ['pedidos.html', 'pedidos'],
  ['mensagens.html', 'mensagens'],
  ['notificacoes.html', 'notificacoes'],
  ['comunidade.html', 'comunidade'],
  ['resultados.html', 'resultados'],
  ['detalhe-anuncio.html', 'detalhe-anuncio'],
  ['ajuda.html', 'ajuda']
];

const viewports = [
  ['desktop', 1366, 768],
  ['tablet', 820, 1180],
  ['mobile', 390, 844]
];

async function installAuthenticatedSession(page) {
  await page.goto('/index.html');
  await expect.poll(() => page.evaluate(
    () => typeof window.Doke?.session?.setCurrentUser
  )).toBe('function');

  await page.evaluate(() => {
    window.Doke.session.setCurrentUser({
      id: 'stable-shell-client',
      role: 'client',
      name: 'Cliente Stable Shell',
      email: 'stable-shell@example.test',
      accountStatus: 'active',
    });
  });

  await expect.poll(() => page.evaluate(
    () => window.Doke?.session?.isAuthenticated?.() === true
  )).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await installAuthenticatedSession(page);
});

const readState = () => {
  const root = document.documentElement;
  const body = document.body;
  const scrollable = root.scrollHeight > root.clientHeight + 8;
  return {
    page: body.dataset.page,
    hydration: body.dataset.pageHydration || '',
    overflow: root.scrollWidth - root.clientWidth,
    hasShell: Boolean(document.querySelector('.app-shell')),
    hasHeader: Boolean(document.querySelector('[data-app-header]')),
    hasSidebar: Boolean(document.querySelector('[data-shell-sidebar], .sidebar')),
    skeletonVisible: [...document.querySelectorAll(
      '[data-orders-hydration-skeleton], [data-messages-hydration-skeleton], [data-notifications-hydration-skeleton]'
    )].some((node) => !node.hidden),
    scrollable
  };
};

for (const [name, width, height] of viewports) {
  test(`${name}: direct and DokeNavigate converge across priority pages`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const directStates = new Map();

    for (const [file, pageKey] of pages) {
      await page.goto(`/${file}`);
      await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');
      await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
      if (['pedidos', 'mensagens', 'notificacoes'].includes(pageKey)) {
        await expect.poll(() => page.evaluate(() => document.body.dataset.pageHydration))
          .toMatch(/^(ready|empty)$/);
      }
      const state = await page.evaluate(readState);
      expect(state.page).toBe(pageKey);
      expect(state.overflow).toBeLessThanOrEqual(1);
      expect(state.hasShell).toBe(true);
      expect(state.hasHeader).toBe(true);
      expect(state.hasSidebar).toBe(true);
      expect(state.skeletonVisible).toBe(false);
      directStates.set(file, state);
    }

    await page.goto('/index.html');
    await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
    await page.evaluate(() => {
      window.__matrixLoadCount = 1;
      window.addEventListener('load', () => { window.__matrixLoadCount += 1; });
      window.__matrixHeader = document.querySelector('[data-app-header]');
    });

    for (const [file, pageKey] of pages) {
      await page.evaluate((href) => window.DokeNavigate(`/${href}`), file);
      const state = await page.evaluate(readState);
      const direct = directStates.get(file);
      expect(state.page).toBe(pageKey);
      expect(state.page).toBe(direct.page);
      expect(state.overflow).toBeLessThanOrEqual(1);
      expect(state.hasShell).toBe(direct.hasShell);
      expect(state.hasHeader).toBe(direct.hasHeader);
      expect(state.hasSidebar).toBe(direct.hasSidebar);
      expect(state.skeletonVisible).toBe(false);

      if (state.scrollable) {
        await page.evaluate(() => window.scrollTo(0, 500));
        await page.waitForTimeout(50);
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      }
    }

    const shellState = await page.evaluate(() => ({
      loadCount: window.__matrixLoadCount,
      sameHeader: window.__matrixHeader === document.querySelector('[data-app-header]')
    }));
    expect(shellState.loadCount).toBe(1);
    expect(shellState.sameHeader).toBe(true);
  });
}
