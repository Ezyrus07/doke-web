#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { loadHtmlWithLocalCss } = require('./lib/responsive-html-loader');

const rootDir = path.resolve(__dirname, '..');

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || process.env.CHROMIUM_PATH
    || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.setContent(
      loadHtmlWithLocalCss('detalhe-anuncio.html', rootDir, { modeLabel: 'responsive runtime proof' }),
      { waitUntil: 'domcontentloaded', timeout: 30_000 },
    );
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      function countMatchingRules(element) {
        function walk(rules) {
          let count = 0;
          if (!rules) return count;
          for (const rule of rules) {
            if (rule.type === CSSRule.MEDIA_RULE) {
              if (matchMedia(rule.conditionText).matches) count += walk(rule.cssRules);
              continue;
            }
            if (rule.type !== CSSRule.STYLE_RULE) continue;
            try {
              if (element.matches(rule.selectorText)) count += 1;
            } catch (_) {}
          }
          return count;
        }

        let total = 0;
        for (const sheet of document.styleSheets) {
          try {
            total += walk(sheet.cssRules);
          } catch (_) {}
        }
        return total;
      }

      const header = document.querySelector('.app-header.app-header--detail');
      const inner = document.querySelector('.app-header.app-header--detail > .app-header__inner');
      const back = document.querySelector('.app-header.app-header--detail .detail-standard-topbar__back');
      if (!header || !inner || !back) return null;

      const headerStyle = getComputedStyle(header);
      const backStyle = getComputedStyle(back);
      const headerRect = header.getBoundingClientRect();
      const backRect = back.getBoundingClientRect();
      return {
        header: {
          display: headerStyle.display,
          width: headerRect.width,
          height: headerRect.height,
          matchedRules: countMatchingRules(header),
        },
        inner: {
          matchedRules: countMatchingRules(inner),
        },
        back: {
          display: backStyle.display,
          width: backRect.width,
          height: backRect.height,
          matchedRules: countMatchingRules(back),
        },
      };
    });

    assert.ok(result, 'detail header runtime targets must exist');
    assert.equal(result.header.display, 'flex', 'active layout/header.css must control app-header display');
    assert.ok(result.header.matchedRules > 0, 'app-header must match real CSS rules');
    assert.ok(result.inner.matchedRules > 0, 'app-header__inner must match real CSS rules');
    assert.ok(result.back.matchedRules > 0, 'back control must match real CSS rules');
    assert.ok(result.header.width > 800, 'header must be wider than the minimum application rail');
    assert.ok(result.header.width < 1366, 'header must remain constrained below raw viewport width');
    assert.ok(result.header.height < 200, 'header must not collapse into the previous default-style 1400px geometry');
    assert.notEqual(result.back.display, 'inline', 'back control must no longer use the browser default inline layout');
    assert.ok(result.back.width >= 40, 'back control width must meet the minimum header control size');
    assert.ok(result.back.width <= 60, 'back control width must remain within the header control size ceiling');
    assert.ok(result.back.height >= 40, 'back control height must meet the minimum header control size');
    assert.ok(result.back.height <= 60, 'back control height must remain within the header control size ceiling');

    console.log('[ux-resp-debt-001] responsive runtime manifest proof passed');
    console.log(JSON.stringify(result));
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
