#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function cleanAssetPath(value) {
  return String(value || '').split('?')[0].split('#')[0];
}

function inlineCss(file, stack = new Set()) {
  const absolute = path.resolve(ROOT, file);
  if (!absolute.startsWith(ROOT) || !fs.existsSync(absolute)) return '';
  if (stack.has(absolute)) return '';
  stack.add(absolute);
  let css = fs.readFileSync(absolute, 'utf8');
  const base = path.dirname(absolute);
  css = css.replace(/@import\s+(?:url\()?['"]?([^'"\)\s;]+)['"]?\)?\s*([^;]*);/gi, (statement, href, media) => {
    if (/^(?:https?:|data:|\/\/)/i.test(href)) return '';
    const imported = path.resolve(base, cleanAssetPath(href));
    if (!imported.startsWith(ROOT) || !fs.existsSync(imported)) return '';
    const content = inlineCss(path.relative(ROOT, imported), stack);
    const condition = String(media || '').trim();
    return condition ? `@media ${condition}{${content}}` : content;
  });
  stack.delete(absolute);
  return css;
}

function prepareHtml() {
  let html = fs.readFileSync(path.join(ROOT, 'verificacao-profissional.html'), 'utf8');
  const css = [];
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    if (!/^(?:https?:|\/\/)/i.test(href)) css.push(inlineCss(cleanAssetPath(href)));
    return '';
  });
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace('</head>', `<style>${css.join('\n')}</style></head>`);
  return html;
}

async function inspect(page, viewport) {
  return page.evaluate(({ viewport }) => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const layout = document.querySelector('.professional-verification-layout');
    const form = document.querySelector('.professional-verification-form-card');
    const side = document.querySelector('.professional-verification-side-card');
    const grid = document.querySelector('.professional-verification-grid');
    const uploads = document.querySelector('.professional-verification-upload-grid');
    const steps = document.querySelector('.professional-verification-steps');
    const rect = (node) => node ? node.getBoundingClientRect() : null;
    const layoutRect = rect(layout);
    const formRect = rect(form);
    const sideRect = rect(side);
    return {
      viewport,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      layoutVisible: visible(layout),
      formVisible: visible(form),
      sideVisible: visible(side),
      formWidth: formRect?.width || 0,
      sideWidth: sideRect?.width || 0,
      layoutWidth: layoutRect?.width || 0,
      sideBelowForm: Boolean(formRect && sideRect && sideRect.top >= formRect.bottom - 2),
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      uploadColumns: uploads ? getComputedStyle(uploads).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      stepColumns: steps ? getComputedStyle(steps).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      hiddenOverlayVisible: Array.from(document.querySelectorAll('[hidden]')).some((node) => visible(node))
    };
  }, { viewport: viewport.name });
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const html = prepareHtml();
  const report = [];
  try {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        document.querySelector('[data-doke-document-preloader]')?.setAttribute('hidden', '');
        document.querySelector('[data-professional-verification-hydration-skeleton]')?.setAttribute('hidden', '');
        document.querySelectorAll('[data-professional-verification-hydration-ready]').forEach((node) => { node.hidden = false; });
        const status = document.querySelector('[data-professional-verification-status]');
        if (status) status.hidden = true;
        const layout = document.querySelector('[data-professional-verification-form-layout]');
        if (layout) layout.hidden = false;
        document.querySelectorAll('[data-verification-step-panel]').forEach((panel) => { panel.hidden = false; });
      });
      await page.waitForTimeout(40);
      const metrics = await inspect(page, viewport);
      report.push(metrics);
      assert(metrics.layoutVisible && metrics.formVisible && metrics.sideVisible, `${viewport.name}: verification layout is not visible`);
      assert(metrics.overflowX <= 1, `${viewport.name}: horizontal overflow ${metrics.overflowX}px`);
      assert(!metrics.hiddenOverlayVisible, `${viewport.name}: hidden element is affecting layout`);
      if (viewport.name === 'desktop') {
        assert(!metrics.sideBelowForm, 'desktop: side card should remain beside the form');
        assert(metrics.gridColumns === 2, 'desktop: identity fields should use two columns');
        assert(metrics.uploadColumns === 2, 'desktop: document uploads should use two columns');
        assert(metrics.stepColumns === 3, 'desktop: stepper should use three columns');
      }
      if (viewport.name === 'mobile') {
        assert(metrics.sideBelowForm, 'mobile: side card should stack below the form');
        assert(metrics.gridColumns === 1, 'mobile: identity fields should stack');
        assert(metrics.uploadColumns === 1, 'mobile: document uploads should stack');
        assert(metrics.stepColumns === 1, 'mobile: stepper should stack');
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('[professional-identity-verification-visual] ok');
  console.log(`- scenarios: ${report.length}`);
  console.log('- desktop/tablet/mobile layout, stepper, uploads and overflow validated');
}

main().catch((error) => {
  console.error('[professional-identity-verification-visual] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
