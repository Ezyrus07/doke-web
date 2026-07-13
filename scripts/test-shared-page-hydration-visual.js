#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const viewports = [
  { width: 1366, height: 768, name: 'desktop' },
  { width: 820, height: 1180, name: 'tablet' },
  { width: 390, height: 844, name: 'mobile' }
];
const routes = [
  { file: 'index.html', page: 'index', root: '[data-state-boundary="index"]', skeleton: '[data-home-hydration-skeleton]', ready: '[data-home-hydration-ready]' },
  { file: 'meu-perfil.html', page: 'meu-perfil', root: '[data-state-boundary="meu-perfil"]', skeleton: '[data-profile-hydration-skeleton]', ready: '[data-profile-hydration-ready]' },
  { file: 'perfil-cliente.html', page: 'perfil-cliente', root: '[data-state-boundary="perfil-cliente"]', skeleton: '[data-profile-hydration-skeleton]', ready: '[data-profile-hydration-ready]' },
  { file: 'configuracoes.html', page: 'configuracoes', root: '[data-state-boundary="configuracoes"]', skeleton: '[data-settings-hydration-skeleton]', ready: '[data-settings-hydration-ready]', readyMode: 'any' },
  { file: 'tornar-profissional.html', page: 'tornar-profissional', root: '[data-state-boundary="tornar-profissional"]', skeleton: '[data-professional-onboarding-hydration-skeleton]', ready: '[data-professional-onboarding-hydration-ready]', readyMode: 'any' },
  { file: 'verificacao-profissional.html', page: 'verificacao-profissional', root: '[data-state-boundary="verificacao-profissional"]', skeleton: '[data-professional-verification-hydration-skeleton]', ready: '[data-professional-verification-hydration-ready]', readyMode: 'any' }
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

function prepareHtml(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const css = [];
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    if (!/^(?:https?:|\/\/)/i.test(href)) css.push(inlineCss(cleanAssetPath(href)));
    return '';
  });
  html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi, (tag, href) => {
    if (!/^(?:https?:|\/\/)/i.test(href)) css.push(inlineCss(cleanAssetPath(href)));
    return '';
  });
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace('</head>', `<style>${css.join('\n')}</style></head>`);
  return html;
}

async function inspect(page, route, phase) {
  return page.evaluate(({ route, phase }) => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return !node.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const root = document.querySelector(route.root);
    const skeleton = document.querySelector(route.skeleton);
    const ready = Array.from(document.querySelectorAll(route.ready));
    const rootRect = root?.getBoundingClientRect();
    return {
      phase,
      state: root?.dataset.pageHydration || root?.dataset.viewState || '',
      skeletonVisible: visible(skeleton),
      readyVisible: ready.filter(visible).length,
      readyCount: ready.length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rootWidth: rootRect?.width || 0,
      rootLeft: rootRect?.left || 0,
      rootRight: rootRect?.right || 0
    };
  }, { route, phase });
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const hydrationSource = fs.readFileSync(path.join(ROOT, 'assets/js/core/page-hydration.js'), 'utf8');
  const report = [];
  try {
    for (const route of routes) {
      const html = prepareHtml(route.file);
      for (const viewport of viewports) {
        const page = await browser.newPage({ viewport });
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await page.addScriptTag({ content: hydrationSource });
        await page.evaluate((route) => {
          const hydration = window.DokePageHydration.create({
            page: route.page,
            root: route.root,
            skeletonSelectors: route.skeleton,
            readySelectors: route.ready,
            skeletonMode: 'hard-load',
            hasItems: () => true
          });
          window.__hydrationUnderTest = hydration;
          hydration.start();
        }, route);
        await page.waitForTimeout(30);
        const loading = await inspect(page, route, 'loading');
        assert(loading.skeletonVisible, `${route.file} ${viewport.name}: skeleton is not visible while loading`);
        assert(loading.readyVisible === 0, `${route.file} ${viewport.name}: ready content leaked during loading`);
        assert(loading.overflow <= 1, `${route.file} ${viewport.name}: skeleton caused horizontal overflow (${loading.overflow}px)`);
        assert(loading.rootWidth > 0, `${route.file} ${viewport.name}: state boundary has no geometry`);

        await page.evaluate(() => window.__hydrationUnderTest.ready({ hasItems: true }));
        await page.waitForTimeout(30);
        const ready = await inspect(page, route, 'ready');
        assert(!ready.skeletonVisible, `${route.file} ${viewport.name}: skeleton remains visible after ready`);
        if (route.readyMode === 'any') {
          assert(ready.readyVisible > 0, `${route.file} ${viewport.name}: no responsive ready surface was revealed`);
        } else {
          assert(ready.readyVisible === ready.readyCount && ready.readyCount > 0, `${route.file} ${viewport.name}: ready content was not fully revealed`);
        }
        assert(ready.overflow <= 1, `${route.file} ${viewport.name}: ready page caused horizontal overflow (${ready.overflow}px)`);
        report.push({ file: route.file, viewport: viewport.name, loading, ready });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log('[shared-page-hydration-visual] ok');
  console.log(`- scenarios: ${report.length}`);
  console.log('- skeleton/ready visibility and horizontal overflow validated without local navigation');
}

main().catch((error) => {
  console.error('[shared-page-hydration-visual] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
