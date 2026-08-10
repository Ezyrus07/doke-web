#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const { loadHtmlWithLocalCss } = require('./lib/responsive-html-loader');

const rootDir = path.resolve(__dirname, '..');

function collectRuleText() {
  return `(() => {
    const el = document.querySelector('.home-side-meta__location');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const rules = [];
    function walk(list, media = null) {
      if (!list) return;
      for (const rule of list) {
        if (rule.type === CSSRule.MEDIA_RULE) {
          if (matchMedia(rule.conditionText).matches) walk(rule.cssRules, rule.conditionText);
          continue;
        }
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        try {
          if (el.matches(rule.selectorText) && /(?:width|inline-size|max-inline-size|min-inline-size|padding)/.test(rule.cssText)) {
            rules.push({ selector: rule.selectorText, media, cssText: rule.cssText });
          }
        } catch (_) {}
      }
    }
    for (const sheet of document.styleSheets) {
      try { walk(sheet.cssRules); } catch (_) {}
    }
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computed: {
        width: style.width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
      },
      rules,
    };
  })()`;
}

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || process.env.CHROMIUM_PATH
    || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    const context = await browser.newContext({ viewport: { width: 608, height: 926 }, deviceScaleFactor: 1, javaScriptEnabled: false });
    for (const file of ['index.html', 'ajuda.html']) {
      const page = await context.newPage();
      await page.setContent(loadHtmlWithLocalCss(file, rootDir, { modeLabel: 'help location diagnostic' }), { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(120);
      const result = await page.evaluate(collectRuleText());
      console.log(`[diag-location] ${file}`);
      console.log(JSON.stringify(result));
      await page.close();
    }
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
