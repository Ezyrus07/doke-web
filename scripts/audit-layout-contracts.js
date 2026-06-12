const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = path.resolve(__dirname, '..');
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

const layoutContractCss = 'assets/css/components/layout/doke-layout-system.css';
const errors = [];
const stats = {
  pagesWithLayoutCss: 0,
  dokePage: 0,
  dokePageShell: 0,
  dokePageSection: 0,
  dokeGrid: 0,
  dokeList: 0,
  dokeState: 0,
};
const pageReports = [];

function count(html, token) {
  return (html.match(new RegExp(token, 'g')) || []).length;
}

function summarizePageCssAssets(assets) {
  return assets
    .filter((asset) => asset.startsWith('assets/css/pages/'))
    .slice(0, 8);
}

function formatStatus(value) {
  return value ? 'yes' : 'no';
}

for (const page of pages) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8');

  const loadedCssAssets = getLoadedCssAssets(html, root);
  const hasLayoutContractCss = loadedCssAssets.includes(layoutContractCss);
  const hasDokePageMain = /<main[^>]+class=["'][^"']*\bdoke-page\b/.test(html);
  const dokePageShellCount = count(html, '\\bdoke-page-shell\\b');
  const dokePageSectionCount = count(html, '\\bdoke-page-section\\b');
  const pageCssAssets = summarizePageCssAssets(loadedCssAssets);

  if (!hasLayoutContractCss) {
    errors.push(`${page}: não carrega doke-layout-system.css`);
  } else {
    stats.pagesWithLayoutCss += 1;
  }

  if (!hasDokePageMain) {
    errors.push(`${page}: <main> sem contrato .doke-page`);
  }

  if (!dokePageShellCount) {
    errors.push(`${page}: nenhum wrapper .doke-page-shell encontrado`);
  }

  if (!dokePageSectionCount) {
    errors.push(`${page}: nenhuma seção .doke-page-section encontrada`);
  }

  pageReports.push({
    page,
    hasLayoutContractCss,
    hasDokePageMain,
    dokePageShellCount,
    dokePageSectionCount,
    pageCssAssets,
  });

  stats.dokePage += count(html, '\\bdoke-page\\b');
  stats.dokePageShell += dokePageShellCount;
  stats.dokePageSection += dokePageSectionCount;
  stats.dokeGrid += count(html, '\\bdoke-grid\\b');
  stats.dokeList += count(html, '\\bdoke-list\\b');
  stats.dokeState += count(html, '\\bdoke-(?:empty|loading|error)-state\\b');
}

const report = [
  '# Layout Contract Audit',
  '',
  `Pages checked: ${pages.length}`,
  `Pages loading layout contract: ${stats.pagesWithLayoutCss}`,
  '',
  '## Coverage',
  '',
  `- dokePage: ${stats.dokePage}`,
  `- dokePageShell: ${stats.dokePageShell}`,
  `- dokePageSection: ${stats.dokePageSection}`,
  `- dokeGrid: ${stats.dokeGrid}`,
  `- dokeList: ${stats.dokeList}`,
  `- dokeState: ${stats.dokeState}`,
  '',
  '## Per-page contract map',
  '',
  '| Page | Layout CSS | `<main.doke-page>` | Shell wrappers | Sections | Page CSS assets |',
  '| --- | --- | --- | ---: | ---: | --- |',
  ...pageReports.map((item) => `| ${item.page} | ${formatStatus(item.hasLayoutContractCss)} | ${formatStatus(item.hasDokePageMain)} | ${item.dokePageShellCount} | ${item.dokePageSectionCount} | ${item.pageCssAssets.length ? item.pageCssAssets.join('<br>') : '-'} |`),
  '',
  '## Result',
  '',
  errors.length ? errors.map((e) => `- ❌ ${e}`).join('\n') : '✅ Layout contracts passed.',
  '',
].join('\n');

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'layout-contract-audit-report.md'), report);

if (errors.length) {
  console.error(report);
  process.exit(1);
}

console.log(`Layout contracts passed. Sections: ${stats.dokePageSection}, grids: ${stats.dokeGrid}, lists: ${stats.dokeList}.`);
