const { test, expect } = require('@playwright/test');

const clientSession = Object.freeze({
  provider: 'mock',
  sessionStatus: 'active',
  accountStatus: 'active',
  remember: false,
  user: Object.freeze({
    id: 'user_ci_client',
    name: 'Cliente CI',
    email: 'cliente-ci@example.test',
    role: 'client',
    type: 'client',
    initials: 'CC',
    accountStatus: 'active',
  }),
});

async function installRuntime(page, role = 'anonymous') {
  await page.addInitScript(({ session, selectedRole }) => {
    localStorage.setItem('doke.dataProvider', 'mock');
    localStorage.removeItem('doke.auth.session.v1');
    if (selectedRole === 'client') {
      localStorage.setItem('doke.auth.session.v1', JSON.stringify(session));
    }
  }, { session: clientSession, selectedRole: role });
}

async function expectHealthyPage(page, pagePath, expectedDataPage, role = 'anonymous') {
  await installRuntime(page, role);
  await page.goto(
    `${pagePath}${pagePath.includes('?') ? '&' : '?'}dokeDataProvider=mock`,
    { waitUntil: 'domcontentloaded' },
  );
  await expect(page.locator('body')).toHaveAttribute('data-page', expectedDataPage);
  const health = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth || 0,
    ),
  }));
  expect(health.scrollWidth).toBeLessThanOrEqual(health.width + 1);
}

test.describe('CI core navigation contracts', () => {
  const publicPages = [
    ['/index.html', 'home'],
    ['/resultados.html', 'resultados'],
    ['/detalhe-anuncio.html', 'detalhe-anuncio'],
  ];

  for (const [pagePath, pageName] of publicPages) {
    test(`${pageName} loads in deterministic public mode`, async ({ page }) => {
      await expectHealthyPage(page, pagePath, pageName);
    });
  }

  const clientPages = [
    ['/pedidos.html', 'pedidos'],
    ['/mensagens.html', 'mensagens'],
    ['/carteira.html', 'carteira'],
    ['/notificacoes.html', 'notificacoes'],
    ['/configuracoes.html', 'configuracoes'],
    ['/orcamento.html', 'orcamento'],
    ['/pagamento-profissional.html', 'pagamento-profissional'],
  ];

  for (const [pagePath, pageName] of clientPages) {
    test(`${pageName} loads with deterministic client identity`, async ({ page }) => {
      await expectHealthyPage(page, pagePath, pageName, 'client');
    });
  }
});
