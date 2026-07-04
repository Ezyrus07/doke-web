const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const manifest = require('./visual-regression.manifest.json');

const root = path.resolve(__dirname, '../..');
const evidenceRoot = process.env.DOKE_VISUAL_EVIDENCE_OUTPUT_DIR || path.join(root, 'reports/generated/visual-evidence');

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
        animation-duration: 0.001s;
        animation-delay: 0s;
        transition-duration: 0.001s;
        transition-delay: 0s;
        scroll-behavior: auto;
        caret-color: transparent;
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

for (const viewport of manifest.viewports) {
  test.describe(`Doke visual evidence capture - ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.isMobile),
      hasTouch: Boolean(viewport.hasTouch),
      deviceScaleFactor: 1,
    });

    for (const pageEntry of manifest.pages) {
      test(`${pageEntry.key} captura evidência visual em ${viewport.name}`, async ({ page }, testInfo) => {
        if (pageEntry.authenticated) {
          await page.addInitScript(() => {
            localStorage.setItem('doke.auth.session.v1', JSON.stringify({
              provider: 'visual-evidence',
              token: 'visual-evidence-session',
              remember: false,
              user: {
                id: 'visual-evidence-user',
                name: 'Usuário de evidência',
                email: 'visual-evidence@example.test',
                role: 'client',
                type: 'client',
                initials: 'UE'
              },
              issuedAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }));
          });
        }

        await page.goto(`/${pageEntry.path}`);
        await waitForStablePage(page);

        const layoutHealth = await getLayoutHealth(page);
        expect(layoutHealth.dataPage, `${pageEntry.path} deve manter body[data-page]`).toBe(pageEntry.expectedDataPage);
        expect(layoutHealth.horizontalOverflow, `${pageEntry.path} não pode ter overflow horizontal`).toBe(false);
        expect(layoutHealth.verticalOverflowLocked, `${pageEntry.path} não pode travar scroll vertical`).toBe(false);

        const pageName = safeName(pageEntry.key);
        const viewportName = safeName(viewport.name);
        const outputDir = path.join(evidenceRoot, viewportName);
        fs.mkdirSync(outputDir, { recursive: true });

        const screenshotPath = path.join(outputDir, `${pageName}.png`);
        const layoutPath = path.join(outputDir, `${pageName}.layout.json`);
        await page.screenshot({ path: screenshotPath, fullPage: false, animations: 'disabled' });
        fs.writeFileSync(layoutPath, `${JSON.stringify({ page: pageEntry.path, viewport, layoutHealth }, null, 2)}\n`);

        await testInfo.attach('visual-evidence-layout', {
          body: JSON.stringify(layoutHealth, null, 2),
          contentType: 'application/json',
        });
      });
    }
  });
}
