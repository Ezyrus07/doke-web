#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.setContent(`<!doctype html><html><body data-page="home" class="home-index-shell">
      <main>
        <div class="shell-home__workspace" data-state-boundary="index" data-view-state="loading" aria-busy="true">
          <div data-home-hydration-skeleton></div>
          <section data-home-hydration-ready hidden>Conteúdo inicial</section>
        </div>
      </main>
    </body></html>`, { waitUntil: 'domcontentloaded' });

    await page.addScriptTag({ content: read('assets/js/core/page-hydration.js') });
    await page.addScriptTag({ content: read('assets/js/pages/index-data-controller.js') });
    await page.waitForTimeout(30);

    const firstReady = await page.locator('[data-home-hydration-ready]').evaluate((node) => !node.hidden);
    if (!firstReady) throw new Error('initial home hydration did not reveal ready content');

    await page.evaluate(() => {
      const current = document.querySelector('[data-state-boundary="index"]');
      const replacement = current.cloneNode(true);
      replacement.dataset.viewState = 'loading';
      replacement.setAttribute('aria-busy', 'true');
      replacement.querySelector('[data-home-hydration-skeleton]').hidden = true;
      replacement.querySelector('[data-home-hydration-ready]').hidden = true;
      replacement.querySelector('[data-home-hydration-ready]').textContent = 'Conteúdo após retorno';
      current.replaceWith(replacement);
    });

    await page.evaluate(() => window.Doke.indexDataController.boot());
    await page.waitForTimeout(30);

    const result = await page.locator('[data-state-boundary="index"]').evaluate((root) => ({
      readyHidden: root.querySelector('[data-home-hydration-ready]').hidden,
      skeletonHidden: root.querySelector('[data-home-hydration-skeleton]').hidden,
      state: root.dataset.pageHydration || ''
    }));

    if (result.readyHidden) throw new Error('home content remained hidden after internal return');
    if (!result.skeletonHidden) throw new Error('home skeleton remained visible after internal return');
    if (!['ready', 'empty'].includes(result.state)) throw new Error(`unexpected hydration state after return: ${result.state}`);

    console.log('[index-return-hydration-contract] ok');
    console.log('- replacing the home DOM creates a fresh hydration lifecycle');
    console.log('- ready content is revealed after returning to index');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[index-return-hydration-contract] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
