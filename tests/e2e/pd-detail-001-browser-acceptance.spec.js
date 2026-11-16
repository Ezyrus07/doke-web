const { test, expect } = require('@playwright/test');

const viewports = [
  { name: 'desktop', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: 'tablet-820', width: 820, height: 1180, isMobile: false, hasTouch: true },
  { name: 'tablet-608', width: 608, height: 926, isMobile: false, hasTouch: true },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

test.beforeEach(async ({ page }) => {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: '',
  }));
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
  await page.route('https://*.supabase.co/**', (route) => route.abort());
});

const baseService = {
  id: 'pd-detail-fixture',
  title: 'Reforma completa de banheiro residencial com acabamento premium',
  detailTitle: 'Reforma completa de banheiro residencial com acabamento premium e projeto sob medida',
  category: 'Reforma residencial',
  providerId: 'provider-pd-detail',
  providerName: 'Renato Acabamentos e Projetos',
  verified: true,
  price: 600,
  paymentLabel: 'Valor final após orçamento',
  rating: 4.9,
  reviewsCount: 42,
  responseTime: 'em ~35 min',
  guarantee: '12 meses',
  status: 'active',
  quoteMode: 'default',
  location: 'Belo Horizonte, MG',
  description: 'Planejamento, execução e acabamento para reforma residencial com escopo definido.',
  checklist: ['Planejamento', 'Execução', 'Acabamento'],
  images: ['assets/img/community/covers/renovation-photo.jpg'],
};

async function bootDetail(page, { owner = false, budgetOnly = false } = {}) {
  await page.goto('/detalhe-anuncio.html?id=pd-detail-fixture');

  await expect.poll(() => page.evaluate(() => {
    const root = document.querySelector('[data-detail-page-root]');
    return Boolean(root && root.__dokeDetailBootComplete && typeof window.DokeHydrateDetailAd === 'function');
  }), { timeout: 30_000 }).toBe(true);

  await page.evaluate(({ serviceSeed, owner, budgetOnly }) => {
    const root = document.querySelector('[data-detail-page-root]');
    const user = {
      id: 'pd-detail-owner',
      providerProfileId: 'pd-detail-provider-profile',
      profile: { id: 'pd-detail-provider-profile', userId: 'pd-detail-owner' },
      profiles: [],
    };
    const service = { ...serviceSeed };

    window.Doke = window.Doke || {};
    window.Doke.session = {
      ...(window.Doke.session || {}),
      getCurrentUser: () => owner ? user : null,
    };

    if (owner) {
      service.professionalId = user.id;
      service.providerId = user.providerProfileId;
    }

    if (budgetOnly) {
      delete service.price;
      delete service.startingPrice;
      delete service.responseTime;
      delete service.guarantee;
      service.priceMode = 'budget';
      service.rating = null;
      service.reviewsCount = 0;
      service.specs = {};
    }

    root.dataset.dataState = 'ready';
    root.dataset.viewState = 'ready';
    root.dataset.detailLayoutState = 'service-view';
    root.setAttribute('aria-busy', 'false');

    root.querySelectorAll('[data-state-loading], [data-state-empty], [data-state-error], [data-detail-hydration-skeleton]')
      .forEach((node) => { node.hidden = true; });

    const ready = root.querySelector('[data-detail-hydration-ready]');
    if (ready) ready.hidden = false;

    window.DokeHydrateDetailAd({
      data: { service },
      workers: [],
      publications: [],
      reviews: [],
    });

    root.dataset.dataState = 'ready';
    root.dataset.viewState = 'ready';
    root.dataset.detailLayoutState = 'service-view';
    if (ready) ready.hidden = false;
  }, { serviceSeed: baseService, owner, budgetOnly });

  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function readLayout(page) {
  return page.evaluate(() => {
    const visible = (node) => Boolean(node)
      && !node.hidden
      && getComputedStyle(node).display !== 'none'
      && getComputedStyle(node).visibility !== 'hidden';

    const summary = document.querySelector('[data-detail-decision-summary]');
    const description = document.querySelector('.detail-section--description');
    const actionCard = document.querySelector('.ad-action-card');
    const stats = document.querySelector('.ad-detail-stats');
    const sidebar = document.querySelector('.ad-detail-sidebar');
    const ownerDashboard = document.querySelector('[data-detail-owner-dashboard]');
    const ownerActions = document.querySelector('[data-detail-owner-actions]');
    const summaryBox = summary?.getBoundingClientRect();
    const descriptionBox = description?.getBoundingClientRect();
    const mainBox = document.querySelector('.ad-detail-main')?.getBoundingClientRect();
    const sidebarBox = sidebar?.getBoundingClientRect();

    return {
      viewerRelation: document.querySelector('[data-detail-page-root]')?.dataset.viewerRelation || '',
      summaryVisible: visible(summary),
      summaryHiddenAttr: summary?.hidden ?? true,
      statsVisible: visible(stats),
      actionCardVisible: visible(actionCard),
      sidebarVisible: visible(sidebar),
      ownerDashboardVisible: visible(ownerDashboard),
      ownerActionsVisible: visible(ownerActions),
      decisionBeforeDescription: Boolean(summaryBox && descriptionBox && summaryBox.bottom <= descriptionBox.top + 1),
      desktopColumns: Boolean(mainBox && sidebarBox && sidebarBox.left >= mainBox.right - 2),
      price: document.querySelector('[data-detail-decision-price]')?.textContent?.trim() || '',
      rating: document.querySelector('[data-detail-decision-rating]')?.textContent?.trim() || '',
      reviews: document.querySelector('[data-detail-decision-reviews]')?.textContent?.trim() || '',
      response: document.querySelector('[data-detail-decision-response]')?.textContent?.trim() || '',
      guarantee: document.querySelector('[data-detail-decision-guarantee]')?.textContent?.trim() || '',
      budgetVisible: visible(document.querySelector('[data-detail-decision-budget-cta]')),
      messageVisible: visible(document.querySelector('[data-detail-decision-message-cta]')),
      overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    };
  });
}

for (const viewport of viewports) {
  test.describe(`PD-DETAIL-001 ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('keeps canonical decision evidence before long-form content without duplicate conversion authority', async ({ page }) => {
      test.setTimeout(60_000);
      await bootDetail(page);
      const state = await readLayout(page);

      expect(state.viewerRelation).toBe('visitor');
      expect(state.overflow).toBeLessThanOrEqual(1);

      if (viewport.width <= 980) {
        expect(state.summaryVisible).toBe(true);
        expect(state.decisionBeforeDescription).toBe(true);
        expect(state.statsVisible).toBe(false);
        expect(state.actionCardVisible).toBe(false);
        expect(state.budgetVisible).toBe(true);
        expect(state.messageVisible).toBe(true);
        expect(state.price).toContain('600');
        expect(state.rating).toContain('4,9');
        expect(state.reviews).toContain('42');
        expect(state.response).toBe('em ~35 min');
        expect(state.guarantee).toBe('12 meses');
      } else {
        expect(state.summaryVisible).toBe(false);
        expect(state.actionCardVisible).toBe(true);
        expect(state.sidebarVisible).toBe(true);
        expect(state.desktopColumns).toBe(true);
      }
    });
  });
}

test.describe('PD-DETAIL-001 data integrity and owner boundary', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('uses neutral fallbacks instead of inventing trust evidence', async ({ page }) => {
    await bootDetail(page, { budgetOnly: true });
    const state = await readLayout(page);

    expect(state.summaryVisible).toBe(true);
    expect(state.price).toBe('Sob orçamento');
    expect(state.rating).toBe('Novo');
    expect(state.reviews).toBe('0 avaliações');
    expect(state.response).toBe('Não informado');
    expect(state.guarantee).toBe('Não informada');
    expect(state.overflow).toBeLessThanOrEqual(1);
  });

  test('keeps visitor conversion actions out of owner mode while preserving owner management', async ({ page }) => {
    await bootDetail(page, { owner: true });
    const state = await readLayout(page);

    expect(state.viewerRelation).toBe('owner');
    expect(state.summaryVisible).toBe(false);
    expect(state.summaryHiddenAttr).toBe(true);
    expect(state.sidebarVisible).toBe(true);
    expect(state.ownerDashboardVisible).toBe(true);
    expect(state.ownerActionsVisible).toBe(true);
    expect(state.budgetVisible).toBe(false);
    expect(state.messageVisible).toBe(false);
    expect(state.overflow).toBeLessThanOrEqual(1);
  });
});
