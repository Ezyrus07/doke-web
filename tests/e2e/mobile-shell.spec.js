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
  { path: 'orcamento.html', leading: 'back', actions: 0, bottomNav: true },
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

  test('resultados uses the canonical second search region and preserves the existing results controller', async ({ page }) => {
    await page.goto('/resultados.html?q=limpeza&type=services');

    const shell = page.locator('.doke-mobile-shell');
    const topbar = shell.locator('.doke-mobile-shell__topbar');
    const actions = shell.locator('[data-shell-context-actions]');
    const search = actions.locator('[data-shell-search-trigger]');
    const filters = actions.locator('[data-shell-filter]');
    const inlineSearch = shell.locator('[data-shell-inline-search][data-shell-inline-search-mode="results"]');
    const inlineInput = inlineSearch.locator('input');
    const pageSearch = page.locator('[data-results-search-input]').first();

    await expect(shell.locator('[data-shell-profile]')).toBeVisible();
    await expect(shell.locator('[data-shell-title]')).toHaveText('Resultados');
    await expect(search).toHaveCount(1);
    await expect(filters).toHaveCount(1);
    await expect(actions.locator('[data-shell-location]')).toHaveCount(0);
    await expect(actions.locator('a[href="notificacoes.html"]')).toHaveCount(0);
    await expect(shell.locator('[data-shell-search]')).toHaveCount(0);
    await expect(inlineSearch).toBeHidden();

    await search.click();
    await expect(inlineSearch).toBeVisible();
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expect(inlineInput).toBeFocused();
    await expect(inlineInput).toHaveValue('limpeza');

    const topbarBox = await topbar.boundingBox();
    const searchBox = await inlineSearch.boundingBox();
    expect(topbarBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(searchBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
    expect(Math.abs(searchBox.width - topbarBox.width)).toBeLessThanOrEqual(1);

    await inlineInput.fill('pintura residencial');
    await inlineInput.press('Enter');
    await expect(pageSearch).toHaveValue('pintura residencial');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('pintura residencial');\n    await expect.poll(() => new URL(page.url()).searchParams.get('type')).toBe('services');

    await inlineInput.press('Escape');
    await expect(inlineSearch).toBeHidden();
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(search).toBeFocused();

    await filters.click();
    await expect(page.locator('body')).toHaveClass(/results-filters-open/);

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
    await expect(page.locator('.doke-mobile-bottom-nav')).toBeVisible();
  });

  test('notificacoes removes the self-referential notification action', async ({ page }) => {
    await page.goto('/notificacoes.html');
    const actions = page.locator('.doke-mobile-shell [data-shell-context-actions]');
    await expect(actions.locator('a[href="notificacoes.html"]')).toHaveCount(0);
    await expect(actions.locator('[data-shell-search-trigger]')).toHaveCount(1);
    await expect(actions.locator('[data-shell-filter]')).toHaveCount(1);
  });

  test('notificacoes search stays local in the canonical second shell region', async ({ page }) => {
    await page.goto('/notificacoes.html');

    const shell = page.locator('.doke-mobile-shell');
    const trigger = shell.locator('[data-shell-search-trigger]');
    const region = shell.locator('[data-shell-inline-search][data-shell-inline-search-mode="notifications"]');
    const shellInput = region.locator('input');
    const pageInput = page.locator('[data-notifications-search]').first();

    await expect(region).toBeHidden();
    await trigger.click();
    await expect(region).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await shellInput.fill('pedido');
    await expect(pageInput).toHaveValue('pedido');
    await expect(page).toHaveURL(/\/notificacoes\.html(?:[?#].*)?$/);
  });

  test('compact search opens as a full-width second shell region and restores focus on Escape', async ({ page }) => {
    await page.goto('/ajuda.html');
    const shell = page.locator('.doke-mobile-shell');
    const topbar = shell.locator('.doke-mobile-shell__topbar');
    const trigger = shell.locator('[data-shell-search-trigger]');
    const search = shell.locator('[data-shell-inline-search]');

    await expect(search).toBeHidden();
    await trigger.click();
    await expect(search).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const topbarBox = await topbar.boundingBox();
    const searchBox = await search.boundingBox();
    expect(topbarBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    expect(searchBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height);
    expect(Math.abs(searchBox.width - topbarBox.width)).toBeLessThanOrEqual(1);

    await search.locator('input').press('Escape');
    await expect(search).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('long titles stay on one line without pushing actions out of the topbar', async ({ page }) => {
    await page.goto('/configuracoes.html');
    const title = page.locator('.doke-mobile-shell [data-shell-title]');
    await title.evaluate((node) => {
      node.textContent = 'Verificação profissional e configurações avançadas';
    });
    const style = await title.evaluate((node) => {
      const computed = getComputedStyle(node);
      return {
        whiteSpace: computed.whiteSpace,
        overflow: computed.overflow,
        textOverflow: computed.textOverflow,
      };
    });
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.overflow).toBe('hidden');
    expect(style.textOverflow).toBe('ellipsis');
  });
});

test.describe('PD-SHELL-001 tablet boundary', () => {
  for (const viewport of [
    { width: 608, height: 926 },
    { width: 820, height: 1180 },
  ]) {
    for (const path of ['configuracoes.html', 'resultados.html?q=limpeza&type=services']) {
      test(`${viewport.width}x${viewport.height} keeps phone shell disabled on ${path}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(`/${path}`);
        await expect(page.locator('.doke-mobile-shell')).toHaveCount(0);
        await expect(page.locator('.doke-mobile-bottom-nav')).toHaveCount(0);
        const state = await page.evaluate(() => ({
          mounted: document.body.classList.contains('doke-mobile-shell-mounted'),
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        }));
        expect(state.mounted).toBe(false);
        expect(state.overflow).toBe(false);
      });
    }
  }
});

test.describe('PD-SHELL-001 desktop regression boundary', () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  for (const path of ['index.html', 'resultados.html?q=limpeza&type=services']) {
    test(`desktop does not mount the phone shell on ${path}`, async ({ page }) => {
      await page.goto(`/${path}`);
      await expect(page.locator('.doke-mobile-shell')).toHaveCount(0);
      await expect(page.locator('.doke-mobile-bottom-nav')).toHaveCount(0);
      await expect(page.locator('.app-header')).toBeVisible();
    });
  }
});
