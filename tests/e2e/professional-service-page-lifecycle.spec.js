const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const demoFixture = require('../fixtures/professional-demo.cjs');
const marketplaceFixture = require('../fixtures/marketplace-demo.cjs');

const ACCESS_SERVICE_URL = '**/assets/js/services/professional-access-service.js*';
const ANNOUNCE_HTML_URL = '**/anunciar-servico.html*';
const ANNOUNCE_HTML = fs.readFileSync(path.resolve(__dirname, '../../anunciar-servico.html'), 'utf8');
const SERVICE_IMAGE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function accessServiceStub(scenario) {
  const serialized = JSON.stringify(scenario);
  return `
    (() => {
      const scenario = ${serialized};
      const Doke = window.Doke || (window.Doke = {});
      Doke.services = Doke.services || {};
      if (scenario.captureRedirect) {
        Doke.navigation = Doke.navigation || {};
        Doke.navigation.go = (target) => {
          sessionStorage.setItem('doke.test.announce.redirect', String(target || ''));
          return Promise.resolve(true);
        };
      }
      const redirectFor = (result) => {
        if (result?.reason === 'auth_required') {
          return 'auth/login.html?return=' + encodeURIComponent('anunciar-servico.html');
        }
        if (['professional_verification_required', 'professional_verification_pending', 'professional_verification_rejected'].includes(result?.reason)) {
          return 'verificacao-profissional.html';
        }
        return 'meu-perfil.html';
      };
      Doke.services.professionalAccess = Object.freeze({
        ACTIONS: Object.freeze({ PUBLISH_SERVICE: 'publish_service' }),
        can() {
          window.__professionalServiceGuardCalls = (window.__professionalServiceGuardCalls || 0) + 1;
          if (scenario.kind === 'repository-error' && window.__professionalServiceGuardCalls === 1) {
            return Promise.reject(new Error('repository unavailable'));
          }
          if (scenario.kind === 'never') {
            return new Promise(() => {});
          }
          const result = scenario.result || { allowed: true, reason: 'allowed' };
          if (scenario.delay) {
            return new Promise((resolve) => window.setTimeout(() => resolve(result), scenario.delay));
          }
          return Promise.resolve(result);
        },
        redirectFor
      });
    })();
  `;
}

async function installScenario(page, scenario) {
  // Keep the real early authentication guard. Page-guard scenarios start with
  // a coherent synthetic session; the no-session case exercises the real redirect.
  await marketplaceFixture.setup(page);
  await page.addInitScript(({ missing, actor }) => {
    if (missing) localStorage.removeItem('doke.auth.session.v1');
    else localStorage.setItem('doke.auth.session.v1', JSON.stringify({
      provider: 'mock', sessionStatus: 'active', accountStatus: 'active', user: actor
    }));
  }, {
    missing: scenario.result?.reason === 'auth_required',
    actor: scenario.result?.role === 'client' ? marketplaceFixture.client : demoFixture.professional
  });
  await page.addInitScript(() => {
    document.addEventListener('doke:page-hydration-state', (event) => {
      if (event.detail?.page !== 'anunciar-servico') return;
      sessionStorage.setItem('doke.test.announce.lifecycle', String(event.detail.state || ''));
    });
    document.addEventListener('DOMContentLoaded', () => {
      const recordForbiddenReveal = () => {
        const ready = [...document.querySelectorAll('[data-post-service-guard-ready]')];
        if (ready.some((node) => !node.hidden)) {
          sessionStorage.setItem('doke.test.announce.forbiddenReveal', 'true');
        }
      };
      recordForbiddenReveal();
      new MutationObserver(recordForbiddenReveal).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['hidden'],
        subtree: true
      });
    }, { once: true });
  });
  await page.route(ANNOUNCE_HTML_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: ANNOUNCE_HTML
  }));
  await page.route(ACCESS_SERVICE_URL, (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: accessServiceStub(scenario)
  }));
}

async function expectErrorTerminal(page) {
  const root = page.locator('[data-post-service-page]');
  await expect(root).toHaveAttribute('data-page-lifecycle-state', 'error', { timeout: 8_000 });
  await expect(root).toHaveAttribute('data-view-state', 'error');
  await expect(root).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-post-service-guard-hydration-skeleton]')).toBeHidden();
  await expect(page.locator('[data-post-service-guard-error]')).toBeVisible();
  await expect(page.locator('[data-post-service-guard-retry]')).toBeVisible();
}

test.describe('professional service page lifecycle', () => {
  test('active verified professional reaches ready with one mounted form', async ({ page }) => {
    await installScenario(page, {
      result: {
        allowed: true,
        reason: 'allowed',
        role: 'professional',
        professionalProfile: { status: 'active' },
        verification: { status: 'verified' }
      }
    });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });

    const root = page.locator('[data-post-service-page]');
    await expect(root).toHaveAttribute('data-page-lifecycle-state', 'ready');
    await expect(root).toHaveAttribute('data-view-state', 'ready');
    await expect(root).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-post-service-guard-hydration-skeleton]')).toBeHidden();
    await expect(page.locator('[data-post-service-guard-ready]').first()).toBeVisible();
    await expect(page.locator('.post-service-form')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__professionalServiceGuardCalls)).toBe(1);
    expect(pageErrors).toEqual([]);
  });

  test('client is redirected and never sees the protected form', async ({ page }) => {
    await installScenario(page, {
      captureRedirect: true,
      result: { allowed: false, reason: 'professional_role_inactive', role: 'client' }
    });

    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.lifecycle'))).toBe('redirected');
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.redirect'))).toBe('meu-perfil.html');
    expect(await page.evaluate(() => sessionStorage.getItem('doke.test.announce.forbiddenReveal'))).not.toBe('true');
  });

  test('pending verification is redirected to the verification page', async ({ page }) => {
    await installScenario(page, {
      captureRedirect: true,
      result: {
        allowed: false,
        reason: 'professional_verification_pending',
        role: 'professional',
        professionalProfile: { status: 'active' },
        verification: { status: 'under_review' }
      }
    });

    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.lifecycle'))).toBe('redirected');
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.redirect'))).toBe('verificacao-profissional.html');
    expect(await page.evaluate(() => sessionStorage.getItem('doke.test.announce.forbiddenReveal'))).not.toBe('true');
  });

  test('rejected verification is redirected without revealing the form', async ({ page }) => {
    await installScenario(page, {
      captureRedirect: true,
      result: {
        allowed: false,
        reason: 'professional_verification_rejected',
        role: 'professional',
        professionalProfile: { status: 'active' },
        verification: { status: 'rejected' }
      }
    });

    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.lifecycle'))).toBe('redirected');
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('doke.test.announce.redirect'))).toBe('verificacao-profissional.html');
    expect(await page.evaluate(() => sessionStorage.getItem('doke.test.announce.forbiddenReveal'))).not.toBe('true');
  });

  test('missing session is redirected to login without revealing the form', async ({ page }) => {
    await installScenario(page, {
      captureRedirect: true,
      result: { allowed: false, reason: 'auth_required', role: null }
    });

    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await expect(page).toHaveURL(/\/auth\/login\.html\?next=%2Fanunciar-servico\.html/);
    await expect(page.locator('.post-service-form')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('doke.auth.session.v1'))).toBeNull();
    expect(await page.evaluate(() => window.__professionalServiceGuardCalls || 0)).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem('doke.test.announce.forbiddenReveal'))).not.toBe('true');
  });

  test('repository rejection reaches a recoverable error terminal state', async ({ page }) => {
    await installScenario(page, { kind: 'repository-error' });
    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await expectErrorTerminal(page);
    await page.locator('[data-post-service-guard-retry]').click();
    await expect(page.locator('[data-post-service-page]')).toHaveAttribute('data-page-lifecycle-state', 'ready');
    await expect.poll(() => page.evaluate(() => window.__professionalServiceGuardCalls)).toBe(2);
  });

  test('a guard that never resolves times out into a recoverable error', async ({ page }) => {
    await installScenario(page, { kind: 'never' });
    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    // Measure recovery after the guard starts, not during unrelated script loading.
    await page.waitForFunction(() => window.__professionalServiceGuardCalls === 1);
    await expectErrorTerminal(page);
  });

  test('duplicate initialization shares one logical guard operation', async ({ page }) => {
    await installScenario(page, {
      delay: 900,
      result: {
        allowed: true,
        reason: 'allowed',
        role: 'professional',
        professionalProfile: { status: 'active' },
        verification: { status: 'verified' }
      }
    });
    await page.goto('/anunciar-servico.html', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof window.DokeInitPostService === 'function');

    const sharedPromise = await page.evaluate(() => {
      const first = window.DokeInitPostService();
      const second = window.DokeInitPostService();
      return first === second;
    });

    expect(sharedPromise).toBe(true);
    await expect(page.locator('[data-post-service-page]')).toHaveAttribute('data-page-lifecycle-state', 'ready');
    await expect.poll(() => page.evaluate(() => window.__professionalServiceGuardCalls)).toBe(1);
    await expect(page.locator('[data-post-service-guard-hydration-skeleton]')).toBeHidden();
  });

  test('synthetic authenticated professional submits an image service pending review visible only to its owner', async ({ page }, info) => {
    test.setTimeout(120_000);
    const title = 'Serviço P0 lifecycle';
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const demo = await demoFixture.setup(page);
    await page.goto('/index.html');
    await demo.switchActor(demoFixture.professional, '/anunciar-servico.html');

    await expect(page.locator('[data-post-service-page]')).toHaveAttribute('data-page-lifecycle-state', 'ready');
    await page.locator('[name="adTitle"]').fill(title);
    await page.locator('[name="category"]').selectOption('Pintura');
    await page.locator('[name="specialty"]').fill('Pintura interna');
    await page.locator('[name="shortDescription"]').fill('Serviço criado pelo teste real do lifecycle.');
    await page.locator('[name="fullDescription"]').fill('Pintura residencial com preparação e acabamento.');
    await page.locator('[data-step-next]').click();

    await page.locator('[name="initialPrice"]').fill('180,00');
    await page.locator('[name="billingUnit"]').selectOption({ index: 1 });
    await page.locator('[name="serviceRegion"]').fill('Belo Horizonte e região');
    await page.locator('[name="serviceMode"]').selectOption('Presencial');
    await page.locator('[data-availability-day][value="monday"]').check();
    await page.locator('[data-step-next]').click();

    await page.locator('[name="mainImage"]').setInputFiles({
      name: 'servico-p0.png',
      mimeType: 'image/png',
      buffer: SERVICE_IMAGE
    });
    await page.locator('[name="includedItems"]').fill('Mão de obra e proteção básica.');
    await page.locator('[data-step-next]').click();
    await expect(page.locator('[data-step-panel="4"]')).toBeVisible();

    await page.evaluate(() => {
      window.__createdService = null;
      window.addEventListener('doke:service-review-submitted', (event) => {
        window.__createdService = event.detail?.service || null;
      }, { once: true });
    });
    await page.locator('[data-step-next]').click();
    await expect(page.locator('[data-step-panel="5"]')).toBeVisible();
    for (const button of await page.locator('.post-service-confirm [data-post-check]').all()) {
      if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
    }
    await page.locator('[data-step-next]').click();
    await expect(page.locator('[data-submit-state]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__createdService?.title || '')).toBe(title);
    const submitted = await page.evaluate(() => window.__createdService);
    expect(submitted.status).toBe('draft');
    expect(submitted.moderationStatus).toBe('pending_review');
    expect(submitted.ownerId).toBe(demoFixture.professional.id);

    await page.getByRole('link', { name: 'Acompanhar no perfil' }).click();
    await page.waitForURL(/\/perfil-profissional\.html\?panel=services/, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-professional-services-list]')).toContainText(title);
    await expect(page.locator('[data-service-id="' + submitted.id + '"] img').first()).toHaveAttribute('src', /^data:image\/png;base64,/);
    await page.screenshot({ path: info.outputPath('pending-owner-list.png') });
    await demo.switchActor(demoFixture.client, '/resultados.html?q=' + encodeURIComponent(title) + '&type=services');
    expect(await page.evaluate(async id => Doke.repositories.services.getById(id), submitted.id)).toBeNull();
    await expect(page.locator('[data-results-grid]')).not.toContainText(title);
    expect(pageErrors).toEqual([]);
  });
});
