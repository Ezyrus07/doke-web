const { test, expect } = require('@playwright/test');

const pages = [
  { path: 'index.html', pageKey: 'home', kind: 'home' },
  { path: 'perfil.html', pageKey: 'perfil', kind: 'internal' },
  { path: 'pedidos.html', pageKey: 'pedidos', kind: 'internal' },
  { path: 'mensagens.html', pageKey: 'mensagens', kind: 'internal' },
  { path: 'notificacoes.html', pageKey: 'notificacoes', kind: 'internal' },
  { path: 'comunidade.html', pageKey: 'comunidade', kind: 'internal' },
  { path: 'resultados.html', pageKey: 'resultados', kind: 'internal' },
  { path: 'detalhe-anuncio.html', pageKey: 'detalhe-anuncio', kind: 'internal' },
  { path: 'ajuda.html', pageKey: 'ajuda', kind: 'internal' },
];

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const navigationFlow = [
  'pedidos.html',
  'mensagens.html',
  'resultados.html',
  'notificacoes.html',
];

const authenticatedSession = {
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  user: {
    id: 'global-layout-client',
    role: 'client',
    name: 'Cliente Layout',
    email: 'layout@example.test',
    accountStatus: 'active',
  },
};

const installAuthenticatedSession = (page) => page.addInitScript((session) => {
  localStorage.setItem('doke.auth.session.v1', JSON.stringify(session));
}, authenticatedSession);

const installDeterministicExternalAssets = async (page) => {
  await page.route('https://unpkg.com/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
};

async function waitForLayoutStable(page) {
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
  await page.waitForTimeout(250);
}

async function getLayoutMetrics(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    const firstVisible = (selectors) => {
      for (const selector of selectors) {
        const candidates = Array.from(document.querySelectorAll(selector));
        const found = candidates.find(isVisible);
        if (found) return found;
      }
      return null;
    };

    const rectFor = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
      };
    };

    const root = document.documentElement;
    const body = document.body;
    const header = firstVisible([
      '.app-header__inner',
      '.app-header',
      '.internal-page-topbar',
      '.topbar',
    ]);
    const content = firstVisible([
      '.page__content-inner',
      '.search-results-workspace',
      '.detalhe-anuncio-layout',
      '.page__content',
      'main',
    ]);
    const sidebar = firstVisible([
      '.sidebar',
      '.desktop-sidebar',
      '[data-shell-sidebar]',
      'aside[aria-label]',
      'aside',
    ]);

    const rootStyle = window.getComputedStyle(root);

    return {
      bodyPage: body ? body.getAttribute('data-page') : null,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      htmlOverflowX: rootStyle.overflowX,
      bodyOverflowX: body ? window.getComputedStyle(body).overflowX : null,
      header: rectFor(header),
      content: rectFor(content),
      sidebar: rectFor(sidebar),
      sidebarWidthToken: rootStyle.getPropertyValue('--doke-sidebar-width').trim()
        || rootStyle.getPropertyValue('--doke-app-sidebar-width').trim(),
    };
  });
}

function parseCssPx(value) {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)px/);
  return match ? Number(match[1]) : null;
}

test.describe('Global layout contract', () => {
  test.beforeEach(async ({ page }) => {
    await installDeterministicExternalAssets(page);
    await installAuthenticatedSession(page);
  });

  for (const viewport of viewports) {
    test.describe(`${viewport.name}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      for (const pageEntry of pages) {
        test(`${pageEntry.path} keeps structural layout contract`, async ({ page }) => {
          await page.goto(`/${pageEntry.path}`);
          await waitForLayoutStable(page);

          const metrics = await getLayoutMetrics(page);

          expect(metrics.bodyPage, `${pageEntry.path} deve manter body[data-page] correto`).toBe(pageEntry.pageKey);

          expect(
            metrics.scrollWidth,
            `${pageEntry.path} não pode gerar overflow horizontal em ${viewport.name}`,
          ).toBeLessThanOrEqual(metrics.clientWidth + 1);

          expect(
            ['visible', 'auto', 'clip', 'hidden'].includes(metrics.htmlOverflowX),
            `${pageEntry.path} deve ter overflow-x explícito e previsível no html`,
          ).toBeTruthy();

          if (viewport.name === 'desktop-1366' && pageEntry.kind === 'internal') {
            expect(metrics.header, `${pageEntry.path} deve ter header visível no desktop`).not.toBeNull();
            expect(metrics.content, `${pageEntry.path} deve ter conteúdo mensurável no desktop`).not.toBeNull();

            const leftDelta = Math.abs(metrics.header.left - metrics.content.left);
            const rightDelta = Math.abs(metrics.header.right - metrics.content.right);
            const widthDelta = Math.abs(metrics.header.width - metrics.content.width);
            const maxRailDelta = 32;

            expect(
              Math.min(leftDelta, rightDelta, widthDelta),
              `${pageEntry.path} deve manter header e conteúdo em trilhos compatíveis no desktop. header=${JSON.stringify(metrics.header)} content=${JSON.stringify(metrics.content)}`,
            ).toBeLessThanOrEqual(maxRailDelta);
          }

          if (viewport.name === 'desktop-1366' && metrics.sidebar) {
            const sidebarWidthToken = parseCssPx(metrics.sidebarWidthToken);
            if (sidebarWidthToken) {
              expect(
                Math.abs(metrics.sidebar.width - sidebarWidthToken),
                `${pageEntry.path} deve manter largura da sidebar próxima ao token global`,
              ).toBeLessThanOrEqual(24);
            } else {
              expect(metrics.sidebar.width, `${pageEntry.path} deve manter sidebar desktop em faixa consistente`).toBeGreaterThanOrEqual(220);
              expect(metrics.sidebar.width, `${pageEntry.path} deve manter sidebar desktop em faixa consistente`).toBeLessThanOrEqual(340);
            }
          }
        });
      }
    });
  }

  test.describe('DokeNavigate no-reload flow', () => {
    test.use({ viewport: { width: 1366, height: 768 }, isMobile: false, hasTouch: false });

    test('index -> pedidos -> mensagens -> resultados -> notificacoes preserves shell and history', async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto('/index.html');
      await waitForLayoutStable(page);

      await expect.poll(
        () => page.evaluate(() => typeof window.DokeNavigate),
        { message: 'window.DokeNavigate precisa estar disponível para navegação interna' },
      ).toBe('function');

      await page.evaluate(() => {
        window.__dokeNoReloadMarker = `marker-${Date.now()}`;
        window.__dokeInitialDocumentNavigationCount = performance.getEntriesByType('navigation').length;
        window.__dokeStableShellNodes = {
          header: document.querySelector('[data-app-header]'),
          sidebar: document.querySelector('.sidebar'),
          bottomNavigation: document.querySelector('[data-doke-mobile-bottom-nav], [data-bottom-nav], .bottom-nav, .doke-bottom-nav'),
        };
      });

      const initialMarker = await page.evaluate(() => window.__dokeNoReloadMarker);
      const adapters = await page.evaluate(() => window.DokeNavigationLifecycle?.navigation?.getAdapters?.() || []);
      expect(adapters).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'stable-shell', priority: 100 }),
        expect.objectContaining({ name: 'legacy-shell', priority: 20 }),
      ]));

      const readNavigationState = () => page.evaluate(() => ({
        marker: window.__dokeNoReloadMarker,
        documentNavigationCount: performance.getEntriesByType('navigation').length,
        initialDocumentNavigationCount: window.__dokeInitialDocumentNavigationCount,
        adapter: document.body.dataset.dokeNavigationAdapter,
        headerPreserved: window.__dokeStableShellNodes.header === document.querySelector('[data-app-header]'),
        sidebarPreserved: window.__dokeStableShellNodes.sidebar === document.querySelector('.sidebar'),
        bottomNavigationPreserved: window.__dokeStableShellNodes.bottomNavigation === document.querySelector('[data-doke-mobile-bottom-nav], [data-bottom-nav], .bottom-nav, .doke-bottom-nav'),
      }));

      const assertStableContext = async (label) => {
        const state = await readNavigationState();
        expect(state.marker, `${label} deve preservar o contexto JavaScript`).toBe(initialMarker);
        expect(state.documentNavigationCount, `${label} não pode criar nova navegação documental`).toBe(state.initialDocumentNavigationCount);
        expect(state.adapter, `${label} deve usar o adapter stable-shell`).toBe('stable-shell');
        expect(state.headerPreserved, `${label} deve manter o header montado`).toBe(true);
        expect(state.sidebarPreserved, `${label} deve manter a sidebar montada`).toBe(true);
        expect(state.bottomNavigationPreserved, `${label} deve manter a bottom navigation montada`).toBe(true);
      };

      for (const target of navigationFlow) {
        await page.evaluate(async (route) => {
          const result = window.DokeNavigate(`/${route}`);
          if (result && typeof result.then === 'function') {
            await result;
          }
        }, target);

        await expect(page).toHaveURL(new RegExp(`/${target.replace('.', '\\.')}(?:$|[?#])`));
        await waitForLayoutStable(page);

        await assertStableContext(target);

        const metrics = await getLayoutMetrics(page);
        const expected = pages.find((entry) => entry.path === target);
        expect(metrics.bodyPage, `${target} deve sincronizar body[data-page] após DokeNavigate`).toBe(expected.pageKey);
        expect(metrics.scrollWidth, `${target} não pode gerar overflow horizontal após DokeNavigate`).toBeLessThanOrEqual(metrics.clientWidth + 1);
      }

      const backwardRoutes = ['resultados.html', 'mensagens.html', 'pedidos.html', 'index.html'];
      for (const target of backwardRoutes) {
        await page.goBack({ waitUntil: 'commit' });
        await expect(page).toHaveURL(new RegExp(`/${target.replace('.', '\\.')}(?:$|[?#])`));
        await waitForLayoutStable(page);
        await assertStableContext(`back para ${target}`);
      }

      for (const target of [...navigationFlow]) {
        await page.goForward({ waitUntil: 'commit' });
        await expect(page).toHaveURL(new RegExp(`/${target.replace('.', '\\.')}(?:$|[?#])`));
        await waitForLayoutStable(page);
        await assertStableContext(`forward para ${target}`);
      }
    });
  });
});
