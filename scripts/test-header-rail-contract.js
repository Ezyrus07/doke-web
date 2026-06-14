#!/usr/bin/env node
/*
 * Runtime guard for Doke header/content rail alignment.
 * Responsibility: detect regressions where a visible shared app header no
 * longer starts and ends on the same horizontal rail as the page workspace.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const outJson = path.join(reportsDir, 'header-rail-contract-report.json');
const outMd = path.join(reportsDir, 'header-rail-contract-report.md');
const TOLERANCE_PX = 2;

const viewports = [
  { name: 'desktop-1366x768', width: 1366, height: 768 },
  { name: 'tablet-820x1180', width: 820, height: 1180 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

const pages = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'detalhe-anuncio.html',
  'ajuda.html',
];

const contentSelectors = {
  'index.html': ['.shell-home__workspace', '.page__content-inner'],
  'resultados.html': ['.search-results-workspace', '.page__content-inner'],
  'perfil.html': ['.profile-shell-content', '.page__content-inner'],
  'pedidos.html': ['.orders-shell-content', '.page__content-inner'],
  'mensagens.html': ['.messages-app', '.messages-shell-content', '.page__content-inner'],
  'notificacoes.html': ['.orders-shell-content', '.notifications-page-shell', '.page__content-inner'],
  'comunidade.html': ['.communities-v2-shell', '.orders-shell-content', '.page__content-inner'],
  'detalhe-anuncio.html': ['.ad-detail-shell', '.page__content-inner'],
  'ajuda.html': ['.page__content-inner', '.app-shell-page__workspace'],
};

function loadHtml(pageFile) {
  let html = fs.readFileSync(path.join(rootDir, pageFile), 'utf8');
  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(href)) return `<!-- external stylesheet skipped: ${hrefMatch[1]} -->`;
    const cssPath = path.join(rootDir, href);
    if (!fs.existsSync(cssPath)) return `<!-- missing stylesheet skipped: ${hrefMatch[1]} -->`;
    return `<style data-source-css="${href}">\n${fs.readFileSync(cssPath, 'utf8')}\n</style>`;
  });
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '<!-- script disabled for deterministic header rail test -->');
  const base = `file://${rootDir.replace(/\\/g, '/')}/`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`)
    : `<base href="${base}">${html}`;
}

function round(value) {
  return Math.round(Number(value) * 100) / 100;
}

async function measure(page, pageFile) {
  return page.evaluate(({ pageFile, contentSelectors }) => {
    const isVisible = (element) => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const toRect = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
      };
    };
    const findContent = () => {
      const selectors = contentSelectors[pageFile] || ['.page__content-inner', '.app-shell-page__workspace'];
      for (const selector of selectors) {
        const found = Array.from(document.querySelectorAll(selector)).find(isVisible);
        if (found) return { element: found, selector };
      }
      return { element: null, selector: selectors.join(', ') };
    };
    const header = document.querySelector('.app-header__inner') || document.querySelector('.app-header');
    const content = findContent();
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    return {
      headerSelector: header ? '.app-header__inner' : null,
      headerVisible: isVisible(header),
      header: isVisible(header) ? toRect(header) : null,
      contentSelector: content.selector,
      contentVisible: isVisible(content.element),
      content: isVisible(content.element) ? toRect(content.element) : null,
      overflow: {
        viewportWidth: window.innerWidth,
        scrollWidth,
        difference: Math.round((scrollWidth - window.innerWidth) * 100) / 100,
      },
    };
  }, { pageFile, contentSelectors });
}

function compare(pageFile, viewport, measurement) {
  const failures = [];
  if (!measurement.headerVisible) return failures;
  if (!measurement.contentVisible) {
    failures.push({ page: pageFile, viewport: viewport.name, property: 'content', expected: 'visible content rail', actual: 'not found', difference: null });
    return failures;
  }
  const checks = [
    ['left', measurement.content.left, measurement.header.left],
    ['right', measurement.content.right, measurement.header.right],
    ['width', measurement.content.width, measurement.header.width],
  ];
  for (const [property, expected, actual] of checks) {
    const difference = round(actual - expected);
    if (Math.abs(difference) > TOLERANCE_PX) {
      failures.push({
        page: pageFile,
        viewport: viewport.name,
        property,
        expected,
        actual,
        difference,
        headerSelector: measurement.headerSelector,
        contentSelector: measurement.contentSelector,
      });
    }
  }
  return failures;
}

function writeReport(report) {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    '# Header rail contract report',
    '',
    `Generated at: ${report.generatedAt}`,
    `Status: **${report.status}**`,
    `Tolerance: ${TOLERANCE_PX}px`,
    '',
    '## Failures',
    '',
    report.failures.length ? '| page | viewport | property | expected | actual | diff | content selector |\n|---|---|---|---:|---:|---:|---|' : 'No failures.',
    ...report.failures.map((failure) => `| ${failure.page} | ${failure.viewport} | ${failure.property} | ${failure.expected} | ${failure.actual} | ${failure.difference} | ${failure.contentSelector || ''} |`),
  ];
  fs.writeFileSync(outMd, `${md.join('\n')}\n`);
}

(async () => {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader'],
  });
  const failures = [];
  const measurements = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, javaScriptEnabled: false });
      for (const pageFile of pages) {
        const page = await context.newPage();
        await page.setContent(loadHtml(pageFile), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
        await page.waitForTimeout(80);
        const measurement = await measure(page, pageFile);
        measurements.push({ page: pageFile, viewport: viewport.name, ...measurement });
        failures.push(...compare(pageFile, viewport, measurement));
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  const report = {
    generatedAt: new Date().toISOString(),
    status: failures.length ? 'FAIL' : 'PASS',
    tolerance: TOLERANCE_PX,
    pages,
    viewports: viewports.map((viewport) => viewport.name),
    failures,
    measurements,
  };
  writeReport(report);
  console.log(`Header rail contract: ${report.status}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Report: ${path.relative(rootDir, outMd)}`);
  if (failures.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
