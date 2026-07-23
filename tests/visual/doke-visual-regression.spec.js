const { test, expect } = require('@playwright/test');
const fs = require('fs');
const manifest = require('./visual-regression.manifest.json');

const TRANSIENT_RESOURCE_RE = /(?:favicon\.ico|chrome-extension:|data:|blob:)/i;
const ALLOWED_CONSOLE_RE = /(?:favicon|ResizeObserver loop completed|Failed to load resource:.*favicon)/i;
const STRUCTURAL_ONLY = process.env.DOKE_VISUAL_MODE === 'structural';
const authenticatedSession = Object.freeze({
  provider: 'visual-test',
  token: 'visual-test-session',
  remember: false,
  user: Object.freeze({
    id: 'visual-test-user',
    name: 'Usuário de validação',
    email: 'visual@example.test',
    role: 'client',
    type: 'client',
    initials: 'UV',
  }),
  issuedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});
const professionalProfileId = 'professional_profile_visual';
const professionalUserId = 'visual-professional-user';
const visualCommunity = Object.freeze({
  id: 'visual-community',
  title: 'Comunidade Visual',
  name: 'Comunidade Visual',
  category: 'Geral',
  visibility: 'public',
  status: 'active',
  ownerId: 'visual-test-user',
  ownerAccountKey: 'visual-test-user',
  ownerIdentityKeys: ['visual-test-user', 'visual@example.test'],
  members: [
    {
      id: 'visual-test-user',
      userId: 'visual-test-user',
      accountKey: 'visual-test-user',
      email: 'visual@example.test',
      name: 'Usuário de validação',
      role: 'owner',
      identityKeys: ['visual-test-user', 'visual@example.test'],
      joinedAt: '2026-01-01T00:00:00.000Z',
      membershipVersion: 1,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function installDeterministicRuntime(page, pageEntry) {
  if (!pageEntry.authenticated) return;

  const professionalSession = {
    ...authenticatedSession,
    token: 'visual-professional-session',
    user: {
      ...authenticatedSession.user,
      id: professionalUserId,
      email: 'professional.visual@example.test',
      role: 'professional',
      type: 'professional',
      professionalProfileId,
    },
  };

  await page.addInitScript(({ pageKey, session, professionalSessionFixture, community }) => {
    const activeSession = pageKey === 'anunciar-servico' ? professionalSessionFixture : session;
    localStorage.setItem('doke.auth.session.v1', JSON.stringify(activeSession));

    if (pageKey === 'anunciar-servico') {
      const timestamp = '2026-01-01T00:00:00.000Z';
      localStorage.setItem('doke.professionalProfiles.v1', JSON.stringify([{
        id: 'professional_profile_visual',
        userId: 'visual-professional-user',
        status: 'active',
        currentStep: 2,
        payload: {
          mainCategory: 'Serviços gerais',
          specialties: 'Validação visual',
          shortBio: 'Perfil determinístico do contrato visual.',
          serviceRegion: 'Salvador e região',
          experienceYears: '5+',
          truthConfirmed: true,
          termsAccepted: true,
        },
        verificationStatus: 'verified',
        createdAt: timestamp,
        updatedAt: timestamp,
        savedAt: timestamp,
        completedAt: timestamp,
      }]));
      localStorage.setItem('doke.professionalIdentityVerifications.v1', JSON.stringify([{
        id: 'professional_verification_visual',
        userId: 'visual-professional-user',
        professionalProfileId: 'professional_profile_visual',
        status: 'verified',
        currentStep: 3,
        payload: {},
        createdAt: timestamp,
        updatedAt: timestamp,
        savedAt: timestamp,
        submittedAt: timestamp,
        reviewStartedAt: timestamp,
        decidedAt: timestamp,
      }]));
    }

    if (pageKey === 'comunidade-interna') {
      localStorage.setItem('doke.communities.local.v1', JSON.stringify([community]));
      localStorage.setItem('doke.community.selected.v1', JSON.stringify({
        id: community.id,
        title: community.title,
        category: community.category,
        selectedAt: '2026-01-01T00:00:00.000Z',
      }));
    }
  }, {
    pageKey: pageEntry.key,
    session: authenticatedSession,
    professionalSessionFixture: professionalSession,
    community: visualCommunity,
  });
}

async function assertVisualEvidence(page, pageEntry, viewport, testInfo) {
  const snapshotName = `${safeName(pageEntry.key)}-${safeName(viewport.name)}.png`;
  const snapshotPath = testInfo.snapshotPath(snapshotName);
  const baselineExists = fs.existsSync(snapshotPath);

  if (viewport.baselineRequired) {
    expect(baselineExists, `Baseline obrigatória ausente: ${snapshotPath}`).toBe(true);
  }

  if (baselineExists && !STRUCTURAL_ONLY) {
    await expect(page).toHaveScreenshot(snapshotName, {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
    });
    return;
  }

  const screenshot = await page.screenshot({
    fullPage: false,
    animations: 'disabled',
  });
  await testInfo.attach('supplemental-visual-evidence', {
    body: screenshot,
    contentType: 'image/png',
  });
}

async function freezeMotion(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001s !important;
        animation-delay: 0s !important;
        transition-duration: 0.001s !important;
        transition-delay: 0s !important;
        scroll-behavior: auto !important;
        caret-color: transparent !important;
      }
    `,
  });
}

async function waitForStablePage(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await freezeMotion(page);
  await page.waitForTimeout(450);
}

async function getLayoutHealth(page) {
  return page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(documentElement.scrollWidth, body ? body.scrollWidth : 0);
    const clientWidth = documentElement.clientWidth;
    const scrollHeight = Math.max(documentElement.scrollHeight, body ? body.scrollHeight : 0);
    const clientHeight = documentElement.clientHeight;
    const htmlOverflowY = getComputedStyle(documentElement).overflowY;
    const bodyOverflowY = body ? getComputedStyle(body).overflowY : '';
    const dataPage = body ? body.dataset.page || '' : '';

    return {
      dataPage,
      scrollWidth,
      clientWidth,
      scrollHeight,
      clientHeight,
      horizontalOverflow: scrollWidth > clientWidth + 1,
      verticalOverflowLocked: scrollHeight > clientHeight + 1 && htmlOverflowY === 'hidden' && bodyOverflowY === 'hidden',
    };
  });
}

async function assertShellPresence(page, pageEntry, viewport) {
  const pagePath = pageEntry.path;
  const shellContract = pageEntry.shell || {};

  if (viewport.kind === 'desktop' && shellContract.desktop !== false) {
    const desktopShell = page.locator('.desktop-sidebar, .doke-desktop-sidebar, .sidebar, aside').first();
    await expect(desktopShell, `${pagePath} deve manter sidebar/shell desktop`).toBeVisible();
    return;
  }

  if (viewport.kind === 'mobile' && shellContract.mobile !== false) {
    const mobileShell = page
      .locator('.doke-mobile-app-shell:visible, .mobile-bottom-nav:visible, .doke-bottom-nav:visible, .doke-mobile-bottom-nav:visible')
      .first();
    await expect(mobileShell, `${pagePath} deve manter navegação/shell mobile`).toBeVisible();
  }
}

for (const viewport of manifest.viewports) {
  test.describe(`Doke visual regression contract - ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
      hasTouch: Boolean(viewport.hasTouch),
      deviceScaleFactor: 1,
    });

    for (const pageEntry of manifest.pages) {
      test(`${pageEntry.key} mantém contrato visual e estrutural em ${viewport.name}`, async ({ page }, testInfo) => {
        const consoleErrors = [];
        const failedRequests = [];
        const badResponses = [];

        page.on('console', (message) => {
          if (message.type() !== 'error') return;
          const text = message.text();
          if (!ALLOWED_CONSOLE_RE.test(text)) {
            consoleErrors.push(text);
          }
        });

        page.on('requestfailed', (request) => {
          const url = request.url();
          if (!TRANSIENT_RESOURCE_RE.test(url)) {
            failedRequests.push(`${request.method()} ${url} :: ${request.failure()?.errorText || 'request failed'}`);
          }
        });

        page.on('response', (response) => {
          const url = response.url();
          if (response.status() >= 400 && !TRANSIENT_RESOURCE_RE.test(url)) {
            badResponses.push(`${response.status()} ${url}`);
          }
        });

        await installDeterministicRuntime(page, pageEntry);
        await page.goto(`/${pageEntry.path}`);
        await waitForStablePage(page);

        const layoutHealth = await getLayoutHealth(page);
        await testInfo.attach('layout-health', {
          body: JSON.stringify(layoutHealth, null, 2),
          contentType: 'application/json',
        });

        expect(layoutHealth.dataPage, `${pageEntry.path} deve manter body[data-page]`).toBe(pageEntry.expectedDataPage);
        expect(layoutHealth.horizontalOverflow, `${pageEntry.path} não pode ter overflow horizontal`).toBe(false);
        expect(layoutHealth.verticalOverflowLocked, `${pageEntry.path} não pode travar scroll vertical`).toBe(false);

        await assertShellPresence(page, pageEntry, viewport);

        expect(consoleErrors, `${pageEntry.path} não pode emitir console.error`).toEqual([]);
        expect(failedRequests, `${pageEntry.path} não pode ter request failed`).toEqual([]);
        expect(badResponses, `${pageEntry.path} não pode carregar recursos 4xx/5xx`).toEqual([]);

        await assertVisualEvidence(page, pageEntry, viewport, testInfo);
      });
    }
  });
}
