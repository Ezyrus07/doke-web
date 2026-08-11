#!/usr/bin/env node
'use strict';

const path = require('path');
const { chromium } = require('@playwright/test');
const { loadHtmlWithLocalCss } = require('./lib/responsive-html-loader');

const rootDir = path.resolve(__dirname, '..');
const pages = ['pedidos.html', 'notificacoes.html'];

function loadHtml(pageFile) {
  return loadHtmlWithLocalCss(pageFile, rootDir, { modeLabel: 'UX-RESP-DEBT-009 CSSOM diagnostic' });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 608, height: 926 },
    });
    const page = await context.newPage();

    for (const pageFile of pages) {
      await page.setContent(loadHtml(pageFile), { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(120);

      const trace = await page.evaluate(() => {
        const properties = [
          'display', 'visibility', 'opacity',
          'width', 'min-width', 'max-width',
          'height', 'min-height', 'max-height',
          'flex', 'flex-basis', 'overflow', 'pointer-events',
        ];

        function activeRulesFor(element) {
          const out = [];
          const walk = (rules, mediaStack, source) => {
            for (let i = 0; i < rules.length; i += 1) {
              const rule = rules[i];
              if (rule.type === CSSRule.MEDIA_RULE) {
                const active = matchMedia(rule.conditionText).matches;
                if (active) walk(rule.cssRules, [...mediaStack, rule.conditionText], source);
                continue;
              }
              if (rule.type === CSSRule.SUPPORTS_RULE) {
                let active = true;
                try { active = CSS.supports(rule.conditionText); } catch (_) {}
                if (active) walk(rule.cssRules, [...mediaStack, `supports ${rule.conditionText}`], source);
                continue;
              }
              if (rule.type !== CSSRule.STYLE_RULE) continue;
              let matches = false;
              try { matches = element.matches(rule.selectorText); } catch (_) {}
              if (!matches) continue;
              const declarations = {};
              for (const property of properties) {
                const value = rule.style.getPropertyValue(property);
                if (!value) continue;
                declarations[property] = {
                  value: value.trim(),
                  priority: rule.style.getPropertyPriority(property) || '',
                };
              }
              if (Object.keys(declarations).length) {
                out.push({ source, media: mediaStack, selector: rule.selectorText, declarations });
              }
            }
          };

          for (const sheet of document.styleSheets) {
            let rules;
            try { rules = sheet.cssRules; } catch (_) { continue; }
            const owner = sheet.ownerNode;
            const source = owner && owner.dataset && owner.dataset.sourceCss
              ? owner.dataset.sourceCss
              : (sheet.href || '<inline>');
            walk(rules, [], source);
          }
          return out;
        }

        function describe(element) {
          if (!element) return null;
          const cs = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id || null,
            className: String(element.className || ''),
            computed: {
              display: cs.display,
              visibility: cs.visibility,
              opacity: cs.opacity,
              width: cs.width,
              minWidth: cs.minWidth,
              maxWidth: cs.maxWidth,
              height: cs.height,
              minHeight: cs.minHeight,
              maxHeight: cs.maxHeight,
              flex: cs.flex,
              overflow: cs.overflow,
              pointerEvents: cs.pointerEvents,
            },
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            matchedRules: activeRulesFor(element),
          };
        }

        const profile = document.querySelector('.home-side-meta__profile');
        const wrap = document.querySelector('.home-side-meta__profile-wrap');
        const avatar = document.querySelector('.home-side-meta__profile img, .home-side-meta__profile .doke-avatar, .home-side-meta__profile .avatar');
        const header = document.querySelector('.app-header.home-side-meta, .app-header');
        const secondary = document.querySelector('.home-side-meta__group--secondary, .app-header__group--secondary');

        return {
          htmlClass: document.documentElement.className,
          bodyClass: document.body.className,
          header: describe(header),
          secondary: describe(secondary),
          profileWrap: describe(wrap),
          profile: describe(profile),
          avatar: describe(avatar),
        };
      });

      console.log(`CSSOM_TRACE_START ${pageFile}`);
      console.log(JSON.stringify(trace, null, 2));
      console.log(`CSSOM_TRACE_END ${pageFile}`);
    }

    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
