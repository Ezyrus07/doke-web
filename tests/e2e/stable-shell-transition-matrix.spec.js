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

const stableShellPages = pages.filter(([file]) => file !== 'perfil.html');

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

async function waitForRouteTerminality(page, file, pageKey) {
  await expect.poll(() => page.evaluate(({ file: expectedFile, pageKey: expectedPage }) => {
    const snapshot = window.Doke?.navigationLifecycle?.getSnapshot?.();
    const route = snapshot?.route || {};
    const expectedPath = `/${expectedFile}`;
    const routeSettled = route.to === expectedPath
      && ['ready', 'empty', 'error'].includes(route.state);
    const routerIdle = window.Doke?.stableShellRouter?.isNavigating?.() === false;
    const pageSettled = document.body?.dataset.page === expectedPage;
    const routingIdle = !document.documentElement.classList.contains('is-stable-shell-routing')
      && !document.body?.classList.contains('is-stable-shell-routing');
    return routeSettled && routerIdle && pageSettled && routingIdle;
  }, { file, pageKey })).toBe(true);

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

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

    for (const [file, pageKey] of stableShellPages) {
      await page.evaluate((href) => window.DokeNavigate(`/${href}`), file);
      await waitForRouteTerminality(page, file, pageKey);
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
        await expect.poll(() => page.evaluate(() => {
          window.scrollTo(0, 500);
          return window.scrollY;
        })).toBeGreaterThan(0);
      }
    }

    const shellState = await page.evaluate(() => ({
      loadCount: window.__matrixLoadCount,
      sameHeader: window.__matrixHeader === document.querySelector('[data-app-header]')
    }));
    expect(shellState.loadCount).toBe(1);
    expect(shellState.sameHeader).toBe(true);
  });

  test(`${name}: perfil.html remains native-only under DokeNavigate`, async ({ page }) => {
    await page.setViewportSize({ width, height });

    await page.goto('/perfil.html');
    await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');
    const direct = await page.evaluate(readState);
    expect(direct.page).toBe('perfil');
    expect(direct.overflow).toBeLessThanOrEqual(1);
    expect(direct.hasShell).toBe(true);
    expect(direct.hasHeader).toBe(true);
    expect(direct.hasSidebar).toBe(true);
    expect(direct.skeletonVisible).toBe(false);

    await page.goto('/index.html');
    await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');
    await page.evaluate(() => {
      window.__matrixNativeOnlyProfileProbe = 'same-document-only';
      window.setTimeout(() => window.DokeNavigate('/perfil.html'), 0);
    });
    await expect(page).toHaveURL(/\/perfil\.html(?:$|[?#])/);
    await expect.poll(() => page.evaluate(() => document.readyState)).toBe('complete');

    const navigated = await page.evaluate(readState);
    const probe = await page.evaluate(() => window.__matrixNativeOnlyProfileProbe || null);
    expect(probe, 'DokeNavigate para perfil.html deve trocar o documento por política native-only').toBeNull();
    expect(navigated.page).toBe(direct.page);
    expect(navigated.overflow).toBeLessThanOrEqual(1);
    expect(navigated.hasShell).toBe(direct.hasShell);
    expect(navigated.hasHeader).toBe(direct.hasHeader);
    expect(navigated.hasSidebar).toBe(direct.hasSidebar);
    expect(navigated.skeletonVisible).toBe(false);

    if (navigated.scrollable) {
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(50);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    }
  });
}
