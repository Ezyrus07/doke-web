#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const cssPath = 'assets/css/components/shell/desktop-base-stability.css';
const responsiveBoundaryCssPath = 'assets/css/components/shell/responsive-boundary.css';
const css = fs.readFileSync(path.join(root, cssPath), 'utf8');
const failures = [];
const pageReports = [];

function requireText(name, source, value) {
  if (!source.includes(value)) failures.push(`${name} missing: ${value}`);
}

function formatStatus(value) {
  return value ? 'yes' : 'no';
}

requireText(cssPath, css, '@media (min-width: 761px)');
requireText(cssPath, css, '.sidebar[data-shell-sidebar]');
requireText(cssPath, css, '.topbar-search');
requireText(cssPath, css, '.doke-desktop-search-panel');
requireText(cssPath, css, '.doke-grid');
requireText(cssPath, css, '.doke-mobile-shell__bottom-nav');

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const loadedAssets = getLoadedCssAssets(html, root);
  const desktopIndex = loadedAssets.indexOf(cssPath);
  const responsiveBoundaryIndex = loadedAssets.indexOf(responsiveBoundaryCssPath);
  const hasDesktopStability = desktopIndex !== -1;
  const hasResponsiveBoundary = responsiveBoundaryIndex !== -1;
  const hasSidebar = html.includes('data-shell-sidebar');
  const hasDesktopTopbar = html.includes('data-app-header') || html.includes('topbar');

  if (!hasDesktopStability) failures.push(`${page} does not load ${cssPath}`);
  if (!hasResponsiveBoundary) {
    failures.push(`${page} does not load ${responsiveBoundaryCssPath}`);
  } else if (hasDesktopStability && responsiveBoundaryIndex > desktopIndex) {
    failures.push(`${page} loads responsive-boundary.css after desktop-base-stability.css`);
  }
  if (!hasSidebar) failures.push(`${page} missing data-shell-sidebar`);
  if (!hasDesktopTopbar) failures.push(`${page} missing desktop topbar`);

  pageReports.push({
    page,
    hasDesktopStability,
    hasResponsiveBoundary,
    hasSidebar,
    hasDesktopTopbar,
  });
}

const report = [
  '# Desktop Shell Contract Audit',
  '',
  `Pages checked: ${pages.length}`,
  '',
  '## Per-page contract map',
  '',
  '| Page | Desktop stability CSS | Responsive boundary CSS | Sidebar marker | Desktop topbar |',
  '| --- | --- | --- | --- | --- |',
  ...pageReports.map((item) => `| ${item.page} | ${formatStatus(item.hasDesktopStability)} | ${formatStatus(item.hasResponsiveBoundary)} | ${formatStatus(item.hasSidebar)} | ${formatStatus(item.hasDesktopTopbar)} |`),
  '',
  '## Result',
  '',
  failures.length ? failures.map((failure) => `- ❌ ${failure}`).join('\n') : '✅ Desktop base stability audit passed.',
  '',
].join('\n');

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'desktop-shell-contract-audit-report.md'), report);

if (failures.length) {
  console.error(report);
  process.exit(1);
}

console.log('Desktop base stability audit passed.');
console.log(`Pages checked: ${pages.length}`);
