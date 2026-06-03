#!/usr/bin/env node
/**
 * Focused responsive parity audit: perfil.html and detalhe-anuncio.html against index.html.
 * Breakpoints: 608x926 and 810x1080.
 * The audit compares only equivalent component anatomy and rail geometry; page content order/copy is not normalized.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const REPORTS = path.join(ROOT, 'reports');
const OUT_JSON = path.join(REPORTS, 'focused-index-parity-before-after.json');
const OUT_CSV = path.join(REPORTS, 'focused-index-parity-before-after.csv');
const OUT_MD = path.join(REPORTS, 'focused-index-parity-before-after.md');
const TOL = 2;
const BREAKPOINTS = [
  { name: '608x926', width: 608, height: 926 },
  { name: '810x1080', width: 810, height: 1080 },
];

const TARGET_PAGES = ['detalhe-anuncio.html', 'perfil.html'];

const COMPONENTS = [
  { page: '*', key: 'header/app-header', base: '.app-header', target: '.app-header', metrics: ['box.x','box.y','box.width','box.height','padding.top','padding.right','padding.bottom','padding.left','gap','radius','fontSize','lineHeight'], compare: 'absolute' },
  { page: '*', key: 'header/app-header__inner', base: '.app-header__inner', target: '.app-header__inner', metrics: ['box.x','box.y','box.width','box.height','padding.left','padding.right','gap','radius'], compare: 'absolute' },
  { page: '*', key: 'header/location-pill', base: '.home-side-meta__location', target: '.home-side-meta__location', metrics: ['box.x','box.y','box.width','box.height','padding.left','padding.right','radius','fontSize','lineHeight'], compare: 'absolute' },
  { page: '*', key: 'header/profile-pill', base: '.home-side-meta__profile', target: '.home-side-meta__profile', metrics: ['box.x','box.y','box.width','box.height','padding.left','padding.right','radius','fontSize','lineHeight'], compare: 'absolute' },
  { page: 'detalhe-anuncio.html', key: 'container/ad-detail-shell', base: '.shell-home__workspace', target: '.ad-detail-shell', metrics: ['box.x','box.width','padding.left','padding.right'], compare: 'first' },
  { page: 'perfil.html', key: 'container/profile-shell-content', base: '.shell-home__workspace', target: '.profile-shell-content', metrics: ['box.x','box.width','padding.left','padding.right'], compare: 'first' },
  { page: 'detalhe-anuncio.html', key: 'section-header/workers-relacionados', base: '.short-videos > .section-heading', target: '.detail-section--ad-workers > .detail-section__header', metrics: ['box.x','box.width','box.height','gap','padding.left','padding.right','fontSize','lineHeight','radius'], compare: 'absolute' },
  { page: 'detalhe-anuncio.html', key: 'section-header/publicacoes-anuncio', base: '.home-publications > .section-heading', target: '.detail-section--ad-publications > .detail-section__header', metrics: ['box.x','box.width','box.height','gap','padding.left','padding.right','fontSize','lineHeight','radius'], compare: 'absolute' },
  { page: 'detalhe-anuncio.html', key: 'section-header/anuncios-semelhantes', base: '.featured-services .section-heading', target: '.detail-section--similar-ads > .detail-section__header', metrics: ['box.x','box.width','box.height','gap','padding.left','padding.right','fontSize','lineHeight','radius'], compare: 'absolute' },
  { page: 'detalhe-anuncio.html', key: 'doke-ad-card/similar', base: '.featured-services article.doke-ad-card, .featured-services .doke-ad-card', target: '[data-similar-ads-grid] > article.doke-ad-card', metrics: ['rel.x','box.width','box.height','media.height','media.aspectRatio','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight'], compare: 'list' },
  { page: 'detalhe-anuncio.html', key: 'publication-card/relacionada', base: '.home-publications .publication-card', target: '[data-related-publications-list] > .publication-card', metrics: ['rel.x','box.width','box.height','media.height','media.aspectRatio','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight'], compare: 'list' },
  { page: 'detalhe-anuncio.html', key: 'worker-video-card/relacionado', base: '.short-videos .video-card, .short-videos .doke-worker-card', target: '[data-related-workers-list] > .video-card.doke-worker-card', metrics: ['rel.x','box.width','box.height','media.height','media.aspectRatio','padding.top','padding.right','padding.bottom','padding.left','radius','fontSize','lineHeight'], compare: 'list' },
  { page: 'perfil.html', key: 'review-card/profile', base: null, target: '.doke-reviews-panel, .doke-review-item', metrics: [], compare: 'no-index-baseline' },
  { page: 'detalhe-anuncio.html', key: 'review-card/detail', base: null, target: '.doke-reviews-panel, .doke-review-item', metrics: [], compare: 'no-index-baseline' },
];

function ensureReports() { fs.mkdirSync(REPORTS, { recursive: true }); }
function round(n) { return Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : null; }
function numeric(v) { if (typeof v === 'number') return v; if (typeof v === 'string') { const n = parseFloat(v); return Number.isFinite(n) ? n : null; } return null; }
function get(obj, dotted) { return dotted.split('.').reduce((a,k) => (a == null ? null : a[k]), obj); }
function csv(v) { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }

function loadHtml(file, mode) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  html = html.replace(/<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi, (tag) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1].split('?')[0];
    if (/^(https?:)?\/\//i.test(href)) return '';
    const cssPath = path.join(ROOT, href);
    if (!fs.existsSync(cssPath)) return '';
    return `<style data-source-css="${href}">\n${fs.readFileSync(cssPath, 'utf8')}\n</style>`;
  });
  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, '<!-- script disabled for deterministic audit -->');
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="file://${ROOT.replace(/\\/g, '/')}/">`);
}

async function setPage(page, file, mode) {
  await page.setContent(loadHtml(file, mode), { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(150);
}

async function measure(page, selector) {
  if (!selector) return [];
  return page.evaluate((selector) => {
    const R = (n) => Number.isFinite(Number(n)) ? Math.round(Number(n) * 100) / 100 : null;
    const px = (v) => {
      if (!v || v === 'normal' || v === 'auto') return null;
      const n = parseFloat(v);
      return Number.isFinite(n) ? R(n) : null;
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
    };
    const container = (el) => el.closest('[data-similar-ads-grid],[data-related-publications-list],[data-related-workers-list],.featured-services,.home-publications,.short-videos,.detail-related-media-rail,.detail-section,.profile-shell-content,.ad-detail-shell,.shell-home__workspace,main') || el.parentElement;
    const mediaOf = (el) => {
      const m = el.querySelector('img,video,picture,.doke-ad-card__media,.publication-card__media,.video-card__media,[class*="__media"]');
      if (!m || !visible(m)) return null;
      const r = m.getBoundingClientRect();
      return { width: R(r.width), height: R(r.height), aspectRatio: r.height ? R(r.width / r.height) : null };
    };
    return Array.from(document.querySelectorAll(selector)).filter(visible).slice(0, 6).map((el, index) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const c = container(el);
      const cr = c ? c.getBoundingClientRect() : { x: 0, y: 0 };
      return {
        index,
        text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        box: { x: R(r.x), y: R(r.y), width: R(r.width), height: R(r.height) },
        rel: { x: R(r.x - cr.x), y: R(r.y - cr.y) },
        gap: px(cs.gap) ?? px(cs.columnGap) ?? 0,
        padding: { top: px(cs.paddingTop) ?? 0, right: px(cs.paddingRight) ?? 0, bottom: px(cs.paddingBottom) ?? 0, left: px(cs.paddingLeft) ?? 0 },
        radius: px(cs.borderTopLeftRadius) ?? 0,
        fontSize: px(cs.fontSize) ?? 0,
        lineHeight: px(cs.lineHeight) ?? 0,
        media: mediaOf(el),
      };
    });
  }, selector);
}

function compareRows({ mode, page, bp, component, baselineItems, actualItems, metrics }) {
  const rows = [];
  if (!baselineItems.length || !actualItems.length) return rows;
  actualItems.forEach((actual, index) => {
    if (index >= baselineItems.length) return;
    const expected = baselineItems[index];
    metrics.forEach((metric) => {
      const exp = get(expected, metric);
      const act = get(actual, metric);
      if (exp == null || act == null) return;
      const en = numeric(exp), an = numeric(act);
      let different = false, difference = null;
      if (en != null && an != null) {
        difference = round(an - en);
        different = Math.abs(difference) > TOL;
      } else {
        different = String(exp) !== String(act);
        difference = different ? 'style' : null;
      }
      if (different) rows.push({ mode, page, breakpoint: bp.name, component, itemIndex: index, property: metric, expected: exp, actual: act, difference });
    });
  });
  return rows;
}

function probableCss(component, page) {
  if (component.startsWith('header')) return 'assets/css/components/shell/app-header-canonical-contract.css';
  if (component.startsWith('container')) return 'assets/css/components/shell/shared-page-width-contract.css';
  if (component.startsWith('section-header')) return 'assets/css/components/sections/section-header-canonical-contract.css';
  if (component.includes('doke-ad')) return 'assets/css/components/cards/ad-card.css';
  if (component.includes('publication')) return 'assets/css/components/cards/publication-card.css';
  if (component.includes('worker')) return 'assets/css/components/cards/worker-card.css';
  return page.includes('detalhe') ? 'assets/css/pages/detalhe-anuncio.css' : 'assets/css/pages/perfil/*.css';
}

async function runMode(browser, mode) {
  const deviations = [];
  const measurements = [];
  const skips = [];
  for (const bp of BREAKPOINTS) {
    const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });
    const indexPage = await context.newPage();
    await setPage(indexPage, 'index.html', mode);
    const baselineBySelector = new Map();
    for (const comp of COMPONENTS.filter(c => c.base)) {
      if (!baselineBySelector.has(comp.base)) baselineBySelector.set(comp.base, await measure(indexPage, comp.base));
    }
    await indexPage.close();

    for (const targetPage of TARGET_PAGES) {
      const page = await context.newPage();
      await setPage(page, targetPage, mode);
      for (const comp of COMPONENTS.filter(c => c.page === '*' || c.page === targetPage)) {
        const actual = await measure(page, comp.target);
        measurements.push({ mode, page: targetPage, breakpoint: bp.name, component: comp.key, count: actual.length, first: actual[0] || null });
        if (comp.compare === 'no-index-baseline') {
          skips.push({ mode, page: targetPage, breakpoint: bp.name, component: comp.key, reason: 'index.html não possui review card equivalente; medido, mas não comparado contra baseline index' });
          continue;
        }
        const baseline = baselineBySelector.get(comp.base) || [];
        const rows = compareRows({ mode, page: targetPage, bp, component: comp.key, baselineItems: baseline, actualItems: actual, metrics: comp.metrics });
        rows.forEach(r => { r.probableCss = probableCss(r.component, r.page); });
        deviations.push(...rows);
      }
      await page.close();
    }
    await context.close();
  }
  return { mode, measurements, deviations, skips };
}

function summarize(deviations) {
  const byPage = {}, byComponent = {}, byBreakpoint = {};
  for (const r of deviations) {
    byPage[r.page] = (byPage[r.page] || 0) + 1;
    byComponent[r.component] = (byComponent[r.component] || 0) + 1;
    byBreakpoint[r.breakpoint] = (byBreakpoint[r.breakpoint] || 0) + 1;
  }
  return { total: deviations.length, byPage, byComponent, byBreakpoint };
}

function mdTable(rows, limit = 60) {
  const header = '| página | breakpoint | componente | propriedade | esperado | antes | depois | Δ antes | Δ depois | CSS provável |\n|---|---|---|---|---:|---:|---:|---:|---:|---|';
  const lines = rows.slice(0, limit).map(r => `| ${r.page} | ${r.breakpoint} | ${r.component} | ${r.property} | ${r.expected} | ${r.beforeActual ?? ''} | ${r.afterActual ?? ''} | ${r.beforeDiff ?? ''} | ${r.afterDiff ?? ''} | ${r.probableCss} |`);
  return [header, ...lines].join('\n');
}

(async () => {
  ensureReports();
  const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const before = await runMode(browser, 'before');
  const after = await runMode(browser, 'after');
  await browser.close();

  const afterKey = (r) => [r.page,r.breakpoint,r.component,r.itemIndex,r.property].join('|');
  const afterMap = new Map(after.deviations.map(r => [afterKey(r), r]));
  const fixedRows = before.deviations.map(b => {
    const a = afterMap.get(afterKey(b));
    return {
      page: b.page,
      breakpoint: b.breakpoint,
      component: b.component,
      itemIndex: b.itemIndex,
      property: b.property,
      expected: b.expected,
      beforeActual: b.actual,
      afterActual: a ? a.actual : b.expected,
      beforeDiff: b.difference,
      afterDiff: a ? a.difference : 0,
      probableCss: b.probableCss,
      status: a ? 'remaining' : 'fixed',
    };
  });
  for (const a of after.deviations) {
    if (!before.deviations.find(b => afterKey(b) === afterKey(a))) {
      fixedRows.push({ page:a.page, breakpoint:a.breakpoint, component:a.component, itemIndex:a.itemIndex, property:a.property, expected:a.expected, beforeActual:'', afterActual:a.actual, beforeDiff:'', afterDiff:a.difference, probableCss:a.probableCss, status:'new-or-remaining' });
    }
  }

  const report = { generatedAt: new Date().toISOString(), tolerancePx: TOL, breakpoints: BREAKPOINTS, pages: TARGET_PAGES, before: summarize(before.deviations), after: summarize(after.deviations), fixedRows, measurements: { before: before.measurements, after: after.measurements }, skips: after.skips };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  const csvLines = ['page,breakpoint,component,itemIndex,property,expected,beforeActual,afterActual,beforeDiff,afterDiff,status,probableCss', ...fixedRows.map(r => [r.page,r.breakpoint,r.component,r.itemIndex,r.property,r.expected,r.beforeActual,r.afterActual,r.beforeDiff,r.afterDiff,r.status,r.probableCss].map(csv).join(','))];
  fs.writeFileSync(OUT_CSV, csvLines.join('\n'));
  const md = `# Focused index parity audit — perfil.html e detalhe-anuncio.html\n\nGerado em: ${report.generatedAt}\n\nTolerância: ${TOL}px.\n\n## Resumo\n\n| Métrica | Antes | Depois | Diferença |\n|---|---:|---:|---:|\n| Divergências > 2px | ${report.before.total} | ${report.after.total} | ${report.after.total - report.before.total} |\n\n## Por página\n\n| Página | Antes | Depois |\n|---|---:|---:|\n${TARGET_PAGES.map(p => `| ${p} | ${report.before.byPage[p] || 0} | ${report.after.byPage[p] || 0} |`).join('\n')}\n\n## Por breakpoint\n\n| Breakpoint | Antes | Depois |\n|---|---:|---:|\n${BREAKPOINTS.map(bp => `| ${bp.name} | ${report.before.byBreakpoint[bp.name] || 0} | ${report.after.byBreakpoint[bp.name] || 0} |`).join('\n')}\n\n## Antes/depois por propriedade\n\n${mdTable(fixedRows)}\n\n## Itens não comparados contra index\n\n- Review cards foram medidos, mas o index.html não possui componente de review equivalente. Mantive como skip documentado, sem forçar review para publication-card.\n`;
  fs.writeFileSync(OUT_MD, md);
  console.log(`Focused index parity audit: before=${report.before.total} after=${report.after.total}`);
  console.log(`Reports: ${path.relative(ROOT, OUT_MD)}, ${path.relative(ROOT, OUT_CSV)}, ${path.relative(ROOT, OUT_JSON)}`);
  process.exit(report.after.total > 0 ? 1 : 0);
})().catch((err) => { console.error(err); process.exit(1); });
