#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const outJson = path.join(reportsDir, 'professional-responsive-polish-audit.json');
const outMd = path.join(reportsDir, 'professional-responsive-polish-audit.md');

const pages = [
  'index.html',
  'detalhe-anuncio.html',
  'perfil.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'carteira.html',
];
const breakpoints = [
  { name: '390x844', width: 390, height: 844 },
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
];

function loadHtml(pageFile) {
  let html = fs.readFileSync(path.join(rootDir, pageFile), 'utf8');
  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(href)) return '';
    const cssPath = path.join(rootDir, href);
    return fs.existsSync(cssPath) ? `<style data-source-css="${href}">\n${fs.readFileSync(cssPath, 'utf8')}\n</style>` : '';
  });
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '<!-- script disabled for audit -->');
  const base = `file://${rootDir.replace(/\\/g, '/')}/`;
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`);
}

function round(n) { return Math.round(Number(n) * 100) / 100; }

(async () => {
  fs.mkdirSync(reportsDir, { recursive: true });
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const rows = [];
  try {
    for (const bp of breakpoints) {
      for (const pageFile of pages) {
        const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height }, deviceScaleFactor: 1, javaScriptEnabled: false });
        await page.setContent(loadHtml(pageFile), { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(25);
        const metrics = await page.evaluate(() => {
          const visible = (el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
          };
          const rectOf = (selector) => {
            const el = Array.from(document.querySelectorAll(selector)).find(visible);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const media = el.querySelector('.doke-ad-card__media,.publication-card__media,.video-card__media,.service-card__media,[class*="__media"],img,video,picture');
            const mr = media && visible(media) ? media.getBoundingClientRect() : null;
            return { x: r.x, y: r.y, width: r.width, height: r.height, mediaHeight: mr ? mr.height : null };
          };
          return {
            viewportWidth: innerWidth,
            htmlScrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
            hiddenOverlayVisible: Array.from(document.querySelectorAll('[data-before-after-preview][hidden], [data-worker-preview][hidden], .before-after-preview[hidden], .worker-preview[hidden]')).filter(visible).length,
            header: rectOf('.app-header'),
            headerInner: rectOf('.app-header__inner'),
            dokeAdCard: rectOf('.doke-ad-card'),
            publicationCard: rectOf('.publication-card'),
            workerCard: rectOf('.video-card[data-worker-trigger], .video-card.doke-worker-card, .doke-worker-card'),
          };
        });
        rows.push({ page: pageFile, breakpoint: bp.name, ...JSON.parse(JSON.stringify(metrics, (k, v) => typeof v === 'number' ? round(v) : v)) });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const summary = {
    pages: pages.length,
    breakpoints: breakpoints.length,
    measurements: rows.length,
    bodyOverflowFailures: rows.filter(r => r.overflowX > 1).length,
    hiddenOverlayVisibleFailures: rows.filter(r => r.hiddenOverlayVisible > 0).length,
  };
  const report = { generatedAt: new Date().toISOString(), summary, rows };
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n');
  const md = [
    '# Professional responsive polish audit',
    '',
    `Gerado em: ${report.generatedAt}`,
    '',
    '## Resumo',
    '',
    `- Páginas: ${summary.pages}`,
    `- Breakpoints: ${breakpoints.map(b => b.name).join(', ')}`,
    `- Medições: ${summary.measurements}`,
    `- Falhas de overflow horizontal: ${summary.bodyOverflowFailures}`,
    `- Overlays ocultos renderizando layout: ${summary.hiddenOverlayVisibleFailures}`,
    '',
    '## Medições principais',
    '',
    '| página | breakpoint | overflowX | overlays ocultos visíveis | header w/h | ad-card w/h/media | publication w/h/media | worker w/h/media |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...rows.map(r => `| ${r.page} | ${r.breakpoint} | ${r.overflowX} | ${r.hiddenOverlayVisible} | ${r.header ? `${r.header.width}/${r.header.height}` : '—'} | ${r.dokeAdCard ? `${r.dokeAdCard.width}/${r.dokeAdCard.height}/${r.dokeAdCard.mediaHeight ?? '—'}` : '—'} | ${r.publicationCard ? `${r.publicationCard.width}/${r.publicationCard.height}/${r.publicationCard.mediaHeight ?? '—'}` : '—'} | ${r.workerCard ? `${r.workerCard.width}/${r.workerCard.height}/${r.workerCard.mediaHeight ?? '—'}` : '—'} |`),
  ];
  fs.writeFileSync(outMd, md.join('\n') + '\n');
  console.log(`Professional responsive polish audit complete: ${summary.measurements} measurements`);
  console.log(`Body overflow failures: ${summary.bodyOverflowFailures}`);
  console.log(`Hidden overlay layout failures: ${summary.hiddenOverlayVisibleFailures}`);
  console.log(`Report: ${path.relative(rootDir, outMd)}`);
  if (summary.bodyOverflowFailures || summary.hiddenOverlayVisibleFailures) process.exitCode = 1;
})();
