const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, 'reports');
const BEFORE_PATH = path.join(REPORT_DIR, 'responsive-rails-containers-before.json');
const AFTER_PATH = path.join(REPORT_DIR, 'responsive-rails-containers-after.json');
const SUMMARY_JSON = path.join(REPORT_DIR, 'responsive-rails-containers-before-after.json');
const SUMMARY_CSV = path.join(REPORT_DIR, 'responsive-rails-containers-before-after.csv');
const SUMMARY_MD = path.join(REPORT_DIR, 'responsive-rails-containers-before-after.md');

const pages = [
  'index.html',
  'detalhe-anuncio.html',
  'perfil.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'configuracoes.html',
  'carteira.html',
];

const breakpoints = [
  ['390x844', 390, 844],
  ['608x926', 608, 926],
  ['810x1080', 810, 1080],
  ['1024x768', 1024, 768],
  ['1280x800', 1280, 800],
];

const selectors = {
  'index.html': {
    main: '.page__content-inner.container.shell-home__workspace',
    first: '.home-search-hero, .featured-services, .home-publications',
  },
  'detalhe-anuncio.html': {
    main: '.ad-detail-shell',
    first: '.ad-detail-hero, .detail-section',
  },
  'perfil.html': {
    main: '.profile-shell-content',
    first: '.profile-header, .profile-hero, .profile-content',
  },
  'resultados.html': {
    main: '.search-results-workspace',
    first: '.results-searchbar, .results-layout, .results-related',
  },
  'pedidos.html': {
    main: '.orders-shell-content',
    first: '.orders-page-header, .orders-list',
  },
  'mensagens.html': {
    main: '.messages-shell-content',
    first: '.messages-app, .messages-block',
  },
  'notificacoes.html': {
    main: '.page__content-inner.orders-shell-content',
    first: '.notifications-page, .notifications-page-header, .notifications-list',
  },
  'comunidade.html': {
    main: '.page__content-inner.orders-shell-content',
    first: '.communities-v2-shell, .communities-v2-section',
  },
  'configuracoes.html': {
    main: '.settings-page-frame, .settings-content',
    first: '.settings-layout, .settings-content, .settings-card',
  },
  'carteira.html': {
    main: '.wallet-shell-content',
    first: '.wallet-balance-card, .wallet-section, .wallet-summary',
  },
};

const railSelectors = [
  '.doke-scroll-rail',
  '.home-media-rail',
  '.content-rail',
  '.service-grid',
  '.publication-grid',
  '.doke-grid',
  '.results-grid',
  '.results-users-grid',
  '.results-videos-grid',
  '.communities-v2-grid',
  '.communities-v2-continue-grid',
  '.detail-related-grid',
  '.detail-related-media-rail',
].join(', ');

const cssCache = new Map();

function readCss(rel, seen = new Set()) {
  const clean = rel.split('?')[0].replace(/^\//, '');
  const abs = path.join(ROOT, clean);
  if (cssCache.has(abs)) return cssCache.get(abs);
  if (seen.has(abs) || !fs.existsSync(abs)) return '';
  seen.add(abs);
  const dir = path.dirname(clean);
  let css = fs.readFileSync(abs, 'utf8');
  css = css.replace(/@import\s+url\(["']?([^"')]+)["']?\)\s*;/g, (_match, url) => {
    if (/^https?:/i.test(url)) return '';
    const resolved = path.normalize(path.join(dir, url.split('?')[0])).replace(/\\/g, '/');
    return readCss(resolved, seen);
  });
  cssCache.set(abs, css);
  return css;
}

function htmlWithInlineCss(file) {
  let html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  let styles = '';
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi, (tag) => {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || /^https?:/i.test(href)) return '';
    styles += `\n<style data-inlined-from="${href}">\n${readCss(href)}\n</style>`;
    return '';
  });
  html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  return html.replace('</head>', `${styles}\n</head>`);
}

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

async function collect(page, file, breakpoint) {
  return page.evaluate(({ file, breakpoint, selectors, railSelectors }) => {
    const round = (n) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
    const box = (el, selector) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        selector,
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
        paddingLeft: cs.paddingLeft,
        paddingRight: cs.paddingRight,
        gap: cs.gap,
        rowGap: cs.rowGap,
        columnGap: cs.columnGap,
      };
    };

    const overflowX = document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1;
    const pageSelectors = selectors[file];
    const mainEl = document.querySelector(pageSelectors.main);
    const firstEl = document.querySelector(pageSelectors.first);
    const railEl = [...document.querySelectorAll(railSelectors)].find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 60 && rect.height > 10;
    });
    return {
      page: file,
      breakpoint,
      main: box(mainEl, pageSelectors.main),
      first: box(firstEl, pageSelectors.first),
      rail: box(railEl, railEl ? railSelectors : null),
      overflowX,
    };
  }, { file, breakpoint, selectors, railSelectors });
}

async function run() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    || process.env.CHROMIUM_PATH
    || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const rows = [];
  for (const [breakpoint, width, height] of breakpoints) {
    for (const file of pages) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.setContent(htmlWithInlineCss(file), { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(80);
      rows.push(await collect(page, file, breakpoint));
      await page.close();
    }
  }
  await browser.close();

  const mode = process.argv.includes('--before') ? 'before' : 'after';
  fs.writeFileSync(mode === 'before' ? BEFORE_PATH : AFTER_PATH, JSON.stringify(rows, null, 2));

  const before = fs.existsSync(BEFORE_PATH) ? JSON.parse(fs.readFileSync(BEFORE_PATH, 'utf8')) : null;
  const after = fs.existsSync(AFTER_PATH) ? JSON.parse(fs.readFileSync(AFTER_PATH, 'utf8')) : rows;
  if (before && after) {
    const summary = [];
    const baselineAfter = new Map(after.filter((r) => r.page === 'index.html').map((r) => [r.breakpoint, r]));
    for (const next of after) {
      const prev = before.find((r) => r.page === next.page && r.breakpoint === next.breakpoint) || null;
      const base = baselineAfter.get(next.breakpoint);
      const expectedWidth = base?.main?.width ?? null;
      const expectedX = base?.main?.x ?? null;
      const widthDiffAfter = next.main && expectedWidth != null ? round(next.main.width - expectedWidth) : null;
      const xDiffAfter = next.main && expectedX != null ? round(next.main.x - expectedX) : null;
      summary.push({
        page: next.page,
        breakpoint: next.breakpoint,
        beforeMainX: prev?.main?.x ?? null,
        afterMainX: next.main?.x ?? null,
        expectedMainX: expectedX,
        xDiffAfter,
        beforeMainWidth: prev?.main?.width ?? null,
        afterMainWidth: next.main?.width ?? null,
        expectedMainWidth: expectedWidth,
        widthDiffAfter,
        beforeFirstTop: prev?.first?.y ?? null,
        afterFirstTop: next.first?.y ?? null,
        beforeOverflowX: prev?.overflowX ?? null,
        afterOverflowX: next.overflowX,
        status: Math.abs(widthDiffAfter ?? 9999) <= 2 && Math.abs(xDiffAfter ?? 9999) <= 2 && !next.overflowX ? 'OK' : 'OUT_OF_CONTRACT',
      });
    }
    fs.writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2));
    const header = Object.keys(summary[0]);
    fs.writeFileSync(SUMMARY_CSV, [header.join(','), ...summary.map((row) => header.map((key) => csvEscape(row[key])).join(','))].join('\n'));
    const out = summary.filter((row) => row.status !== 'OK');
    const md = [
      '# Responsive rails/containers before-after audit',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      `Rows: ${summary.length}`,
      `Out of contract: ${out.length}`,
      '',
      '| Página | Breakpoint | X antes → depois / esperado | Width antes → depois / esperado | Top útil antes → depois | Overflow depois | Status |',
      '|---|---:|---:|---:|---:|---:|---|',
      ...summary.map((r) => `| ${r.page} | ${r.breakpoint} | ${r.beforeMainX} → ${r.afterMainX} / ${r.expectedMainX} | ${r.beforeMainWidth} → ${r.afterMainWidth} / ${r.expectedMainWidth} | ${r.beforeFirstTop} → ${r.afterFirstTop} | ${r.afterOverflowX} | ${r.status} |`),
      '',
      '## Páginas ainda fora do contrato',
      '',
      ...(out.length ? out.map((r) => `- ${r.page} @ ${r.breakpoint}: xDiff=${r.xDiffAfter}, widthDiff=${r.widthDiffAfter}, overflow=${r.afterOverflowX}`) : ['Nenhuma.']),
    ].join('\n');
    fs.writeFileSync(SUMMARY_MD, md);
  }

  console.log(`Responsive rails/container audit complete: ${mode}`);
}

function round(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
