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

const profileFixture = {
  id: 'pd-profile-fixture',
  userId: 'pd-profile-fixture',
  role: 'professional',
  type: 'professional',
  name: 'André Ferreira',
  displayName: 'André Ferreira',
  handle: 'andre.ferreira',
  username: 'andre.ferreira',
  city: 'Salvador',
  state: 'BA',
  bio: 'Profissional focado em serviços residenciais.',
};

const serviceFixture = {
  id: 'pd-profile-service',
  title: 'Pintura residencial completa',
  category: 'Pintura',
  status: 'active',
  providerId: 'pd-profile-fixture',
  providerName: 'André Ferreira',
  price: 600,
  location: 'Salvador, BA',
  shortDescription: 'Preparação, pintura e acabamento para ambientes residenciais.',
  tags: ['pintura', 'residencial'],
  images: [],
  updatedAt: '2026-10-01T12:00:00.000Z',
};

async function bootProfile(page, { verified = true, withServices = true } = {}) {
  await page.goto('/perfil.html?id=pd-profile-fixture');

  await expect.poll(() => page.evaluate(() => (
    typeof window.DokeInitProfile === 'function'
    && Boolean(window.Doke && window.Doke.services && window.Doke.repositories)
  )), { timeout: 30_000 }).toBe(true);

  await page.evaluate(async ({ profileSeed, serviceSeed, verified, withServices }) => {
    const Doke = window.Doke || (window.Doke = {});
    Doke.services = Doke.services || {};
    Doke.repositories = Doke.repositories || {};

    Doke.services.profile = {
      ...(Doke.services.profile || {}),
      getById: () => Promise.resolve({ ...profileSeed }),
    };

    Doke.repositories.professionalProfiles = {
      ...(Doke.repositories.professionalProfiles || {}),
      getByUserId: () => Promise.resolve({
        userId: profileSeed.id,
        status: 'active',
        verificationStatus: verified ? 'verified' : 'pending',
        payload: {
          shortBio: profileSeed.bio,
        },
      }),
    };

    Doke.services.services = {
      ...(Doke.services.services || {}),
      listByProfessional: () => Promise.resolve(withServices ? [{ ...serviceSeed }] : []),
    };

    await window.DokeInitProfile();
  }, {
    profileSeed: profileFixture,
    serviceSeed: serviceFixture,
    verified,
    withServices,
  });

  await expect(page.locator('[data-profile-hydration-ready]').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-profile-primary-action]')).toBeVisible();

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

    const tabs = Array.from(document.querySelectorAll('.profile-tabs__item')).map((node) => node.textContent.trim());
    const decisionLinks = Array.from(document.querySelectorAll('.profile-decision-links__item')).map((node) => node.textContent.trim());
    const primary = document.querySelector('[data-profile-primary-action]');
    const social = document.querySelector('[data-profile-social-action]');
    const services = document.querySelector('#profile-ads');
    const workers = document.querySelector('#profile-workers');
    const posts = document.querySelector('#profile-posts');

    return {
      contract: document.body.dataset.pdProfileContract || '',
      eyebrow: document.querySelector('.profile-heading__eyebrow')?.textContent?.trim() || '',
      guidance: document.querySelector('[data-profile-decision-guidance]')?.textContent?.trim() || '',
      tabs,
      decisionLinks,
      primaryVisible: visible(primary),
      socialVisible: visible(social),
      verifiedVisible: visible(document.querySelector('[data-public-professional-verified-badge]')),
      servicesVisible: visible(services),
      workersVisible: visible(workers),
      postsVisible: visible(posts),
      serviceCardCount: document.querySelectorAll('[data-professional-services-list] .doke-ad-card').length,
      emptyVisible: visible(document.querySelector('[data-professional-services-empty]')),
      staticFollowers: Boolean(document.querySelector('[data-public-professional-followers]')),
      staticFollowing: Boolean(document.querySelector('[data-public-professional-following]')),
      staticJobs: Boolean(document.querySelector('[data-public-professional-jobs]')),
      overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    };
  });
}

for (const viewport of viewports) {
  test.describe(`PD-PROFILE-001 ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });

    test('keeps hiring and services ahead of social depth without overflow', async ({ page }) => {
      test.setTimeout(60_000);
      await bootProfile(page);
      const state = await readLayout(page);

      expect(state.contract).toBe('decision-v1');
      expect(state.eyebrow).toBe('Perfil profissional');
      expect(state.guidance).toContain('serviços');
      expect(state.primaryVisible).toBe(true);
      expect(state.socialVisible).toBe(true);
      expect(state.verifiedVisible).toBe(true);
      expect(state.decisionLinks).toEqual(['Ver serviços', 'Ler avaliações', 'Conhecer profissional']);
      expect(state.tabs.slice(0, 3)).toEqual(['Serviços', 'Avaliações', 'Sobre']);
      expect(state.tabs.slice(-2)).toEqual(['Workers', 'Publicações']);
      expect(state.servicesVisible).toBe(true);
      expect(state.workersVisible).toBe(false);
      expect(state.postsVisible).toBe(false);
      expect(state.serviceCardCount).toBe(1);
      expect(state.staticFollowers).toBe(false);
      expect(state.staticFollowing).toBe(false);
      expect(state.staticJobs).toBe(false);
      expect(state.overflow).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('PD-PROFILE-001 evidence integrity', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('omits unavailable trust evidence instead of inventing it', async ({ page }) => {
    await bootProfile(page, { verified: false, withServices: false });
    const state = await readLayout(page);

    expect(state.eyebrow).toBe('Perfil profissional');
    expect(state.verifiedVisible).toBe(false);
    expect(state.serviceCardCount).toBe(0);
    expect(state.emptyVisible).toBe(true);
    expect(state.staticFollowers).toBe(false);
    expect(state.staticFollowing).toBe(false);
    expect(state.staticJobs).toBe(false);
    expect(state.overflow).toBeLessThanOrEqual(1);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('Profissional verificado');
    expect(bodyText).not.toContain('Top profissional');
    expect(bodyText).not.toContain('97%');
  });
});
