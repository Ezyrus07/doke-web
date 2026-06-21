#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-143-essential-asset-imports-report.json');
const pages = [
  'index.html', 'resultados.html', 'perfil.html', 'detalhe-anuncio.html', 'pedidos.html', 'carteira.html',
  'pagamento-profissional.html', 'configuracoes.html',
  'notificacoes.html', 'mensagens.html', 'comunidade.html', 'comunidade.html'
];

function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function normalizeAsset(asset) {
  return asset.split('?')[0].replace(/^\.\//, '');
}
function collect(html, regex) {
  const out = [];
  let match;
  while ((match = regex.exec(html))) out.push(match[1]);
  return out;
}
function isExternal(asset) {
  return /^(https?:)?\/\//.test(asset) || asset.startsWith('data:') || asset.startsWith('#') || asset.startsWith('mailto:') || asset.startsWith('tel:');
}

const pageReports = pages.map((page) => {
  const html = exists(page) ? read(page) : '';
  const css = collect(html, /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g).map(normalizeAsset);
  const js = collect(html, /<script\b[^>]*src=["']([^"']+)["'][^>]*>/g).map(normalizeAsset);
  const localCss = css.filter((asset) => !isExternal(asset));
  const localJs = js.filter((asset) => !isExternal(asset));
  const missingCss = localCss.filter((asset) => !exists(asset));
  const missingJs = localJs.filter((asset) => !exists(asset));
  const nonDeferredJs = localJs.filter((asset) => {
    const raw = js.find((item) => normalizeAsset(item) === asset) || asset;
    const scriptTagPattern = new RegExp(`<script\\b(?=[^>]*src=["']${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])[^>]*>`, 'i');
    const tag = html.match(scriptTagPattern)?.[0] || '';
    return !/\sdefer(\s|>|=)/i.test(tag) && !/type=["']module["']/i.test(tag);
  });
  return { page, exists: exists(page), cssCount: localCss.length, jsCount: localJs.length, missingCss, missingJs, nonDeferredJs };
});

const missingPages = pageReports.filter((r) => !r.exists).map((r) => r.page);
const missingCss = pageReports.flatMap((r) => r.missingCss.map((asset) => ({ page: r.page, asset })));
const missingJs = pageReports.flatMap((r) => r.missingJs.map((asset) => ({ page: r.page, asset })));
const nonDeferredJs = pageReports.flatMap((r) => r.nonDeferredJs.map((asset) => ({ page: r.page, asset })));

const report = {
  cycle: 143,
  name: 'essential asset imports',
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  totalCssImports: pageReports.reduce((sum, r) => sum + r.cssCount, 0),
  totalJsImports: pageReports.reduce((sum, r) => sum + r.jsCount, 0),
  missingPages,
  missingCss,
  missingJs,
  nonDeferredJs,
  nonDeferredJsCount: nonDeferredJs.length,
  status: missingPages.length || missingCss.length || missingJs.length ? 'failed' : 'passed-with-follow-up',
  note: 'Validates that local CSS/JS imports on main pages exist. Non-deferred local scripts are reported as follow-up because changing load order globally can break legacy runtime.'
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
if (report.status === 'failed') {
  console.error('[essential-asset-imports] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(`[essential-asset-imports] ${report.status}`);
