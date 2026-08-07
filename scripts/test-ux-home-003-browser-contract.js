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
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`<!doctype html><html><head><style>
      [data-catégory-track] {
        display: flex;
        width: 260px;
        gap: 16px;
        overflow-x: auto;
        padding: 0;
        margin: 0;
      }
      [data-catégory-track] > article {
        flex: 0 0 100px;
        width: 100px;
        height: 40px;
      }
    </style></head><body>
      <button type="button" data-catégory-arrow="prev" aria-label="Categorias anteriores">Anterior</button>
      <div data-catégory-track>
        <article>1</article><article>2</article><article>3</article><article>4</article><article>5</article>
      </div>
      <button type="button" data-catégory-arrow="next" aria-label="Próximas categorias">Próxima</button>
    </body></html>`, { waitUntil: 'domcontentloaded' });

    await page.addScriptTag({ content: read('assets/js/pages/home/rail-scroll-state.js') });
    await page.addScriptTag({ content: read('assets/js/pages/home/rail-scroll-controller.js') });
    await page.evaluate(() => {
      window.__railRoute = new AbortController();
      window.__railCleanup = window.DokeHomeRailScroll.create({ signal: window.__railRoute.signal })();
    });

    const track = page.locator('[data-catégory-track]');
    const previous = page.locator('[data-catégory-arrow="prev"]');
    const next = page.locator('[data-catégory-arrow="next"]');
    const snapshot = () => page.evaluate(() => {
      const rail = document.querySelector('[data-catégory-track]');
      const prev = document.querySelector('[data-catégory-arrow="prev"]');
      const after = document.querySelector('[data-catégory-arrow="next"]');
      return {
        state: rail.dataset.railScrollState,
        overflow: rail.dataset.railScrollOverflow,
        scrollLeft: rail.scrollLeft,
        clientWidth: rail.clientWidth,
        scrollWidth: rail.scrollWidth,
        previousDisabled: prev.disabled,
        nextDisabled: after.disabled,
        activeDirection: document.activeElement?.getAttribute?.('data-catégory-arrow') || ''
      };
    });

    await page.waitForFunction(() => document.querySelector('[data-catégory-track]')?.dataset.railScrollState === 'ready-overflow-start');
    let state = await snapshot();
    assert.equal(state.overflow, 'true');
    assert.equal(state.previousDisabled, true);
    assert.equal(state.nextDisabled, false);
    assert.equal(state.scrollWidth - state.clientWidth, 314);

    await next.focus();
    await next.click();
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').scrollLeft >= 115);
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollState === 'ready-overflow-middle');
    state = await snapshot();
    assert(Math.abs(state.scrollLeft - 116) <= 1, `Expected one complete 116px item step, received ${state.scrollLeft}.`);
    assert.equal(state.previousDisabled, false);
    assert.equal(state.nextDisabled, false);
    assert.equal(state.activeDirection, 'next', 'Arrow navigation must preserve focus on the initiating control.');

    await page.evaluate(() => {
      const rail = document.querySelector('[data-catégory-track]');
      rail.scrollLeft = rail.scrollWidth;
      rail.dispatchEvent(new Event('scroll'));
    });
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollState === 'ready-overflow-end');
    state = await snapshot();
    assert.equal(state.previousDisabled, false);
    assert.equal(state.nextDisabled, true);

    await track.evaluate((rail) => { rail.style.width = '700px'; });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollState === 'ready-fits');
    state = await snapshot();
    assert.equal(state.previousDisabled, true);
    assert.equal(state.nextDisabled, true, 'A fully fitting rail must expose no actionable arrow.');

    await track.evaluate((rail) => {
      for (let index = 6; index <= 7; index += 1) {
        const card = document.createElement('article');
        card.textContent = String(index);
        rail.appendChild(card);
      }
    });
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollState === 'ready-overflow-start');
    state = await snapshot();
    assert.equal(state.nextDisabled, false, 'Content mutation must resynchronize overflow without route reload.');

    const beforeAbort = state.scrollLeft;
    await page.evaluate(() => window.__railRoute.abort());
    await next.click();
    await page.waitForTimeout(30);
    state = await snapshot();
    assert.equal(state.scrollLeft, beforeAbort, 'Aborted route bindings must not react to arrow clicks.');

    await page.evaluate(() => {
      window.__railRoute2 = new AbortController();
      window.__railCleanup2 = window.DokeHomeRailScroll.create({ signal: window.__railRoute2.signal })();
    });
    await next.click();
    await page.waitForFunction((before) => document.querySelector('[data-catégory-track]').scrollLeft > before, beforeAbort);
    state = await snapshot();
    assert(Math.abs(state.scrollLeft - (beforeAbort + 116)) <= 1, 'Route re-entry must install exactly one fresh arrow authority.');

    await page.setViewportSize({ width: 390, height: 844 });
    await track.evaluate((rail) => { rail.style.width = '320px'; rail.scrollLeft = 0; });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForFunction(() => document.querySelector('[data-catégory-track]').dataset.railScrollState === 'ready-overflow-start');
    state = await snapshot();
    assert.equal(state.previousDisabled, true);
    assert.equal(state.nextDisabled, false, 'Narrow breakpoint geometry must re-derive boundary state.');

    await page.evaluate(() => window.__railRoute2.abort());

    console.log('[ux-home-003-browser-contract] ok');
    console.log('- real Chromium boundaries, complete-card step, focus, resize, mutation, reduced motion and route re-entry validated');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('[ux-home-003-browser-contract] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
