const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const routes = [
  '/pedidos.html',
  '/mensagens.html',
  '/notificacoes.html',
  '/resultados.html',
  '/detalhe-anuncio.html',
  '/ajuda.html',
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

async function waitForStableRoute(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(200);
}

async function seedPaintingConversation(page) {
  await expect.poll(() => page.evaluate(() => (
    document.querySelector('[data-messages-page]')?.dataset.messagesReady || ''
  ))).toBe('true');
  await expect.poll(() => page.evaluate(
    () => typeof window.Doke?.repositories?.messages?.writeLocal
  )).toBe('function');

  await page.evaluate(() => {
    window.Doke.repositories.messages.writeLocal([{
      id: 'painting',
      clientId: 'stable-shell-client',
      professionalId: 'stable-shell-professional',
      participants: ['stable-shell-client', 'stable-shell-professional'],
      professionalName: 'Pintor Stable Shell',
      providerName: 'Pintor Stable Shell',
      group: 'orders',
      status: 'accepted',
      statusLabel: 'Pedido aceito',
      order: {
        id: 'order-stable-shell-painting',
        clientId: 'stable-shell-client',
        professionalId: 'stable-shell-professional',
        providerId: 'stable-shell-professional',
        providerName: 'Pintor Stable Shell',
        title: 'Pintura residencial',
        serviceTitle: 'Pintura residencial',
        status: 'accepted',
        statusLabel: 'Pedido aceito',
        budget: 'R$ 450,00',
      },
      messages: [{
        id: 'message-stable-shell-painting',
        senderId: 'stable-shell-professional',
        author: 'Pintor Stable Shell',
        text: 'Posso iniciar a pintura amanhã.',
        createdAt: '2026-08-30T12:00:00.000Z',
      }],
      createdAt: '2026-08-30T12:00:00.000Z',
      updatedAt: '2026-08-30T12:01:00.000Z',
    }]);

    document.dispatchEvent(new CustomEvent('doke:auth-session-change', {
      detail: { source: 'stable-shell-e2e' },
    }));
  });

  await expect(page.locator('.message-item[data-message-id="painting"]').first()).toBeVisible();
}

async function scrollMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const rootStyle = window.getComputedStyle(root);
    const bodyStyle = window.getComputedStyle(body);
    const shell = document.querySelector('.app-shell');
    const pageNode = document.querySelector('.page');
    const content = document.querySelector('.page__content');

    return {
      url: window.location.pathname,
      bodyPage: body.getAttribute('data-page'),
      scrollHeight: root.scrollHeight,
      clientHeight: root.clientHeight,
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      scrollY: window.scrollY,
      htmlOverflowY: rootStyle.overflowY,
      bodyOverflowY: bodyStyle.overflowY,
      htmlInlineOverflow: root.style.overflow || '',
      bodyInlineOverflow: body.style.overflow || '',
      htmlInlineOverflowY: root.style.overflowY || '',
      bodyInlineOverflowY: body.style.overflowY || '',
      htmlInlineHeight: root.style.height || '',
      bodyInlineHeight: body.style.height || '',
      htmlPosition: rootStyle.position,
      bodyPosition: bodyStyle.position,
      shellOverflowY: shell ? window.getComputedStyle(shell).overflowY : null,
      pageOverflowY: pageNode ? window.getComputedStyle(pageNode).overflowY : null,
      contentOverflowY: content ? window.getComputedStyle(content).overflowY : null,
      blockingClasses: Array.from(body.classList).filter((className) => /open|overlay|modal|drawer|search-active|filter-sheet|sidebar-open/.test(className)),
      messageStylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
        .map((link) => link.getAttribute('href') || '')
        .filter((href) => /assets\/css\/(?:pages\/mensagens|patterns\/chat-screen-fill|components\/internal\/chat-workspace-contract)/.test(href)),
    };
  });
}

async function assertDocumentScrollWorks(page, route, scenario) {
  const before = await scrollMetrics(page);

  expect(before.scrollWidth, `${scenario} ${route}: não pode gerar overflow horizontal`).toBeLessThanOrEqual(before.clientWidth + 1);
  expect(['visible', 'auto', 'scroll'].includes(before.htmlOverflowY), `${scenario} ${route}: html não pode bloquear overflowY`).toBeTruthy();
  expect(['visible', 'auto', 'scroll'].includes(before.bodyOverflowY), `${scenario} ${route}: body não pode bloquear overflowY`).toBeTruthy();
  expect(before.htmlInlineOverflow, `${scenario} ${route}: html não pode manter overflow inline`).toBe('');
  expect(before.bodyInlineOverflow, `${scenario} ${route}: body não pode manter overflow inline`).toBe('');
  expect(before.htmlInlineOverflowY, `${scenario} ${route}: html não pode manter overflow-y inline`).toBe('');
  expect(before.bodyInlineOverflowY, `${scenario} ${route}: body não pode manter overflow-y inline`).toBe('');
  expect(before.blockingClasses, `${scenario} ${route}: classes temporárias de overlay/drawer não podem ficar presas`).toEqual([]);
  if (route !== '/mensagens.html' && route !== '/comunidade-interna.html') {
    expect(before.messageStylesheets, `${scenario} ${route}: CSS de mensagens/chat não pode continuar ativo fora da rota`).toEqual([]);
  }

  const hasScrollableDocument = before.scrollHeight > before.clientHeight + 8;
  if (hasScrollableDocument) {
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(80);
    const after = await scrollMetrics(page);
    expect(after.scrollY, `${scenario} ${route}: window.scrollTo precisa mover o scroll do documento`).toBeGreaterThan(0);
  }
}

test.describe('Stable shell document scroll contract', () => {
  for (const viewport of viewports) {
    test.describe(viewport.name, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      test('/perfil.html keeps direct scroll coverage and remains native-only under DokeNavigate', async ({ page }) => {
        await page.goto('/perfil.html');
        await waitForStableRoute(page);
        await assertDocumentScrollWorks(page, '/perfil.html', 'direct');

        await page.goto('/index.html');
        await waitForStableRoute(page);
        await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

        await page.evaluate(() => {
          window.__dokeNativeOnlyProfileProbe = 'same-document-only';
          window.setTimeout(() => window.DokeNavigate('/perfil.html'), 0);
        });
        await expect(page).toHaveURL(/\/perfil\.html(?:$|[?#])/);
        await waitForStableRoute(page);

        const probe = await page.evaluate(() => window.__dokeNativeOnlyProfileProbe || null);
        expect(probe, 'DokeNavigate para /perfil.html deve trocar o documento por política native-only').toBeNull();
        await assertDocumentScrollWorks(page, '/perfil.html', 'native-only DokeNavigate');
      });

      test('leaving mensagens.html restores document scroll contract for subsequent routes', async ({ page }) => {
        await page.goto('/index.html');
        await waitForStableRoute(page);
        await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

        await page.evaluate(async () => {
          window.__dokeReloadProbe = Math.random();
          window.__dokeLoadCount = 1;
          window.addEventListener('load', () => { window.__dokeLoadCount += 1; });
        });

        for (const route of ['/mensagens.html', '/pedidos.html', '/resultados.html', '/ajuda.html']) {
          await page.evaluate(async (target) => {
            const result = window.DokeNavigate(target);
            if (result && typeof result.then === 'function') await result;
          }, route);
          await expect(page).toHaveURL(new RegExp(`${route.replace('.', '\.')}(?:$|[?#])`));
          await waitForStableRoute(page);
          await assertDocumentScrollWorks(page, route, 'after leaving mensagens sequence');
        }

        const reloadState = await page.evaluate(() => ({ probe: window.__dokeReloadProbe, loadCount: window.__dokeLoadCount }));
        expect(reloadState.probe, 'DokeNavigate não deve perder sentinela de reload').toBeTruthy();
        expect(reloadState.loadCount, 'DokeNavigate não deve disparar reload completo').toBe(1);
      });
      for (const route of routes) {
        test(`${route} keeps scroll via direct URL and DokeNavigate`, async ({ page }) => {
          await page.goto(route);
          await waitForStableRoute(page);
          await assertDocumentScrollWorks(page, route, 'direct');

          await page.goto('/index.html');
          await waitForStableRoute(page);
          await expect.poll(() => page.evaluate(() => typeof window.DokeNavigate)).toBe('function');

          await page.evaluate(async (target) => {
            const result = window.DokeNavigate(target);
            if (result && typeof result.then === 'function') await result;
          }, route);
          await expect(page).toHaveURL(new RegExp(`${route.replace('.', '\\.')}(?:$|[?#])`));
          await waitForStableRoute(page);
          await assertDocumentScrollWorks(page, route, 'DokeNavigate');
        });
      }
    });
  }
});

test.describe('Mensagens mobile thread interaction', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('tap on a conversation opens the thread on phone viewport', async ({ page }) => {
    await page.goto('/mensagens.html');
    await waitForStableRoute(page);
    await seedPaintingConversation(page);

    await page.locator('.message-item[data-message-id="painting"]').first().click();
    await page.waitForTimeout(120);

    const state = await page.evaluate(() => {
      const root = document.querySelector('[data-messages-page]');
      const thread = document.querySelector('[data-messages-thread]');
      const sidebar = document.querySelector('.messages-sidebar');
      const threadRect = thread?.getBoundingClientRect();
      const sidebarRect = sidebar?.getBoundingClientRect();
      const threadStyle = thread ? window.getComputedStyle(thread) : null;
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      return {
        bodyThreadOpen: document.body.classList.contains('messages-thread-is-open'),
        htmlThreadOpen: document.documentElement.classList.contains('messages-thread-is-open'),
        appThreadOpen: root?.classList.contains('messages-app--thread-open') || false,
        messagesMode: root?.dataset.messagesMode || '',
        threadVisible: Boolean(thread && threadRect.width > 0 && threadRect.height > 0 && threadStyle.display !== 'none' && threadStyle.visibility !== 'hidden'),
        sidebarVisible: Boolean(sidebar && sidebarRect.width > 0 && sidebarRect.height > 0 && sidebarStyle.display !== 'none' && sidebarStyle.visibility !== 'hidden'),
      };
    });

    expect(state.bodyThreadOpen, 'body deve receber estado de conversa aberta no mobile').toBe(true);
    expect(state.htmlThreadOpen, 'html deve receber estado de conversa aberta no mobile').toBe(true);
    expect(state.appThreadOpen, 'messages-app deve entrar em modo thread no mobile').toBe(true);
    expect(state.messagesMode, 'data-messages-mode deve indicar thread no mobile').toBe('thread');
    expect(state.threadVisible, 'conversa deve ficar visível após tocar em um item no mobile').toBe(true);
  });
});
