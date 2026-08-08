#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    await page.setContent(`<!doctype html><html><head><style>
      .shell-home__workspace { width: 900px; }
      [data-catégory-track] { width: 400px; overflow-x: auto; display: flex; gap: 0; scroll-behavior: auto; }
      [data-catégory-track] > span { flex: 0 0 220px; height: 20px; }
    </style></head><body data-page="home">
      <main>
        <div class="shell-home__workspace" data-state-boundary="index">
          <section class="home-catégories">
            <div class="home-catégories__rail">
              <button type="button" data-catégory-arrow="prev" aria-label="Ver catégorias anteriores">Anterior</button>
              <div data-catégory-track role="list">
                <span></span><span></span><span></span><span></span>
              </div>
              <button type="button" data-catégory-arrow="next" aria-label="Ver próximas catégorias">Próxima</button>
            </div>
          </section>
        </div>
      </main>
    </body></html>`, { waitUntil: 'domcontentloaded' });

    await page.addScriptTag({ content: read('assets/js/pages/home/rail-scroll-state.js') });
    await page.addScriptTag({ content: read('assets/js/pages/home/rail-scroll-surface.js') });

    await page.evaluate(() => {
      window.__railBinding = window.Doke.homeRailScrollSurface.bind();
    });

    const previous = page.locator('[data-catégory-arrow="prev"]');
    const next = page.locator('[data-catégory-arrow="next"]');
    const track = page.locator('[data-catégory-track]');

    assert.equal(await previous.isDisabled(), true, 'previous arrow must start disabled at the left boundary');
    assert.equal(await previous.getAttribute('aria-disabled'), 'true');
    assert.equal(await next.isDisabled(), false, 'next arrow must start enabled when overflow exists');
    assert.equal(await next.getAttribute('aria-disabled'), 'false');
    assert.equal(await track.getAttribute('data-rail-scroll-state'), 'start');

    await next.click();
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').scrollLeft > 0);
    let snapshot = await page.evaluate(() => window.Doke.homeRailScrollSurface.getSnapshot('categories'));
    assert(snapshot.scrollLeft > 0, 'next click must move the real browser track');
    assert.equal(snapshot.canPrevious, true);

    await page.evaluate(() => {
      const rail = document.querySelector('[data-catégory-track]');
      rail.scrollLeft = rail.scrollWidth;
      rail.dispatchEvent(new Event('scroll'));
    });
    await page.waitForFunction(() => document.querySelector('[data-catégory-arrow="next"]').disabled === true);
    snapshot = await page.evaluate(() => window.Doke.homeRailScrollSurface.getSnapshot('categories'));
    assert.equal(snapshot.atEnd, true, 'manual/touch-style scroll must synchronize the right boundary');
    assert.equal(await next.isDisabled(), true);
    assert.equal(await previous.isDisabled(), false);

    await page.evaluate(() => {
      const rail = document.querySelector('[data-catégory-track]');
      rail.scrollLeft = 0;
      rail.dispatchEvent(new Event('scroll'));
    });
    await page.waitForFunction(() => document.querySelector('[data-catégory-arrow="prev"]').disabled === true);
    assert.equal(await next.isDisabled(), false);

    await track.evaluate((rail) => { rail.style.width = '1000px'; });
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollOverflow === 'false');
    assert.equal(await previous.isDisabled(), true, 'resize without overflow must disable previous');
    assert.equal(await next.isDisabled(), true, 'resize without overflow must disable next');
    assert.equal(await track.getAttribute('data-rail-scroll-state'), 'static');

    await track.evaluate((rail) => { rail.style.width = '400px'; });
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollOverflow === 'true');
    assert.equal(await next.isDisabled(), false, 'shrinking the viewport must restore next navigation');

    await page.evaluate(() => {
      const rail = document.querySelector('[data-catégory-track]');
      while (rail.children.length > 1) rail.lastElementChild.remove();
    });
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollOverflow === 'false');
    assert.equal(await next.isDisabled(), true, 'content mutation must update boundaries');

    const lifecycle = await page.evaluate(() => {
      const first = window.__railBinding;
      const second = window.Doke.homeRailScrollSurface.bind();
      const firstAborted = first.controller.signal.aborted;
      const route = new AbortController();
      const third = window.Doke.homeRailScrollSurface.bind({ signal: route.signal });
      const secondAborted = second.controller.signal.aborted;
      route.abort();
      return {
        firstAborted,
        secondAborted,
        thirdAborted: third.controller.signal.aborted,
        bindingReleased: window.DokeHomeRailScrollSurfaceBinding === undefined
      };
    });

    assert.equal(lifecycle.firstAborted, true, 'rebind must abort the previous browser binding');
    assert.equal(lifecycle.secondAborted, true, 'second binding must be replaced cleanly');
    assert.equal(lifecycle.thirdAborted, true, 'route abort must destroy the active binding');
    assert.equal(lifecycle.bindingReleased, true, 'route cleanup must release the global binding slot');

    console.log('[ux-home-003-browser-contract] ok');
    console.log('- real-browser boundaries, click, manual scroll, resize, mutation and stable-shell cleanup validated');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[ux-home-003-browser-contract] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
