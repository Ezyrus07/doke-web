const { test, expect } = require('@playwright/test');
const manifest = require('./visual-regression.manifest.json');

const TRANSIENT_RESOURCE_RE = /(?:favicon\.ico|chrome-extension:|data:|blob:)/i;
const ALLOWED_CONSOLE_RE = /(?:favicon|ResizeObserver loop completed|Failed to load resource:.*favicon)/i;

function safeName(value) {
  return String(value)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
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

async function assertShellPresence(page, pagePath, viewport) {
  if (viewport.kind === 'desktop') {
    const desktopShell = page.locator('.desktop-sidebar, .doke-desktop-sidebar, .sidebar, aside').first();
    await expect(desktopShell, `${pagePath} deve manter sidebar/shell desktop`).toBeVisible();
    return;
  }

  if (viewport.kind === 'mobile') {
    const mobileShell = page
      .locator('.doke-mobile-app-shell, .mobile-bottom-nav, .doke-bottom-nav, .doke-mobile-bottom-nav')
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

        await assertShellPresence(page, pageEntry.path, viewport);

        expect(consoleErrors, `${pageEntry.path} não pode emitir console.error`).toEqual([]);
        expect(failedRequests, `${pageEntry.path} não pode ter request failed`).toEqual([]);
        expect(badResponses, `${pageEntry.path} não pode carregar recursos 4xx/5xx`).toEqual([]);

        await expect(page).toHaveScreenshot(`${safeName(pageEntry.key)}-${safeName(viewport.name)}.png`, {
          fullPage: false,
          animations: 'disabled',
          maxDiffPixelRatio: 0.01,
          threshold: 0.2,
        });
      });
    }
  });
}
