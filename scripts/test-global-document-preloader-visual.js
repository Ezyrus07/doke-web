#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = process.cwd();
const pages = ['index.html', 'meu-perfil.html', 'configuracoes.html', 'pedidos.html', 'auth/cadastro.html'];
const viewports = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'mobile', width: 390, height: 844 }
];
const responsivePages = new Set(pages);

function assert(value, message) {
  if (!value) throw new Error(message);
}

function extractPreloader(file) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const match = text.match(/<section\b[^>]*data-doke-document-preloader[^>]*>[\s\S]*?<\/section>/i);
  if (!match) throw new Error(`${file}: preloader markup not found`);
  return match[0].replace(/src=(['"])[^'"]+\1/i, 'src=""');
}

async function inspect(page) {
  return page.evaluate(() => {
    const node = document.querySelector('[data-doke-document-preloader]');
    const mark = node && node.querySelector(':scope > div');
    const rect = node && node.getBoundingClientRect();
    const markRect = mark && mark.getBoundingClientRect();
    const style = node && getComputedStyle(node);
    return {
      hidden: Boolean(node && node.hidden),
      visible: Boolean(node && !node.hidden && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0),
      position: style && style.position,
      width: rect && rect.width,
      height: rect && rect.height,
      centerX: markRect && Math.abs((markRect.left + markRect.width / 2) - innerWidth / 2),
      centerY: markRect && Math.abs((markRect.top + markRect.height / 2) - innerHeight / 2),
      boot: document.documentElement.dataset.dokeDocumentBoot || ''
    };
  });
}

async function main() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/components/feedback/document-preloader.css'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'assets/js/core/document-preloader.js'), 'utf8');
  let scenarios = 0;
  try {
    for (const file of pages) {
      const preloader = extractPreloader(file);
      const pageViewports = responsivePages.has(file) ? viewports : [viewports[0]];
      for (const viewport of pageViewports) {
        const page = await browser.newPage({ viewport });
        await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${preloader}<main>Conteúdo</main></body></html>`);
        await page.addScriptTag({ content: runtime });
        await page.waitForTimeout(60);
        const loading = await inspect(page);
        assert(loading.visible, `${file} ${viewport.name}: boot surface is not visible on document load`);
        assert(loading.position === 'fixed', `${file} ${viewport.name}: boot surface is not fixed`);
        assert(Math.abs(loading.width - viewport.width) <= 1, `${file} ${viewport.name}: boot width mismatch`);
        assert(Math.abs(loading.height - viewport.height) <= 1, `${file} ${viewport.name}: boot height mismatch`);
        assert(loading.centerX <= 2 && loading.centerY <= 2, `${file} ${viewport.name}: Doke mark is not centered`);
        await page.waitForTimeout(700);
        const ready = await inspect(page);
        assert(ready.hidden || !ready.visible, `${file} ${viewport.name}: boot surface did not release`);
        assert(ready.boot === 'ready', `${file} ${viewport.name}: document boot state did not settle`);
        scenarios += 1;
        await page.close();
      }
    }

    const page = await browser.newPage({ viewport: viewports[0] });
    const preloader = extractPreloader('index.html');
    await page.setContent(`<!doctype html><html data-doke-navigation-mode="stable-shell"><head><style>${css}</style></head><body>${preloader}</body></html>`);
    await page.addScriptTag({ content: runtime });
    await page.waitForTimeout(30);
    const internal = await inspect(page);
    assert(internal.hidden && !internal.visible, 'stable-shell navigation replayed the document boot surface');
    await page.close();
  } finally {
    await browser.close();
  }

  console.log('[global-document-preloader-visual] ok');
  console.log(`- scenarios: ${scenarios}`);
  console.log('- full viewport coverage, centered mark, release and internal-navigation suppression validated');
}

main().catch((error) => {
  console.error('[global-document-preloader-visual] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
