#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs', 'validation', 'global-cycle-124-css-import-consolidation-candidates-report.json');
const TARGET_PAGES = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento-profissional.html',
  'configuracoes.html',
  'notificacoes.html',
  'mensagens.html',
  'comunidade.html',
].filter((page) => fs.existsSync(path.join(ROOT, page)));

function classify(href) {
  const h = href.toLowerCase();
  if (h.includes('/core/')) return 'core';
  if (h.includes('/layout/')) return 'layout';
  if (h.includes('/components/')) return 'components';
  if (h.includes('/patterns/')) return 'patterns';
  if (h.includes('/pages/')) return 'pages';
  if (h.includes('/utilities/') || h.includes('/utils/')) return 'utilities';
  if (/^https?:\/\//.test(h) || h.includes('cdnjs') || h.includes('fonts.googleapis')) return 'external';
  return 'other';
}

function stripQuery(href) {
  return href.split('?')[0];
}

const linkRe = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
const byCss = new Map();
const pageSummaries = [];

for (const page of TARGET_PAGES) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  const refs = [];
  let match;
  while ((match = linkRe.exec(html))) {
    const href = stripQuery(match[1]);
    refs.push({ href, layer: classify(href) });
    if (!byCss.has(href)) byCss.set(href, { href, layer: classify(href), pages: [] });
    byCss.get(href).pages.push(page);
  }
  const layers = refs.reduce((acc, ref) => {
    acc[ref.layer] = (acc[ref.layer] || 0) + 1;
    return acc;
  }, {});
  pageSummaries.push({ page, cssImportCount: refs.length, layers });
}

const repeated = Array.from(byCss.values())
  .filter((item) => item.pages.length >= 3)
  .sort((a, b) => b.pages.length - a.pages.length || a.href.localeCompare(b.href));

const consolidationCandidates = repeated.map((item) => ({
  ...item,
  recommendation: item.layer === 'pages'
    ? 'review-page-css-before-consolidating'
    : item.layer === 'components' || item.layer === 'patterns'
      ? 'candidate-for-shared-bundle-review'
      : 'keep-in-layer-and-review-import-order',
  moveNow: false,
}));

const report = {
  cycle: 124,
  name: 'css-import-consolidation-candidates',
  status: 'passed',
  policy: {
    importsMoved: false,
    visualChangeIntent: false,
    note: 'This cycle maps consolidation candidates only. It does not move CSS or change import order.',
  },
  summary: {
    pageCount: TARGET_PAGES.length,
    uniqueCssImports: byCss.size,
    repeatedImportCount: repeated.length,
    consolidationCandidateCount: consolidationCandidates.length,
  },
  pages: pageSummaries,
  consolidationCandidates,
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-124] CSS consolidation candidates mapped: ${consolidationCandidates.length}.`);
