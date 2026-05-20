const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

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

function count(html, token) {
  return (html.match(new RegExp(token, 'g')) || []).length;
}

for (const page of pages) {
  const file = path.join(root, page);
  const html = fs.readFileSync(file, 'utf8');

  if (!html.includes('assets/css/components/layout/doke-layout-system.css')) {
    errors.push(`${page}: não carrega doke-layout-system.css`);
  } else {
    stats.pagesWithLayoutCss += 1;
  }

  if (!/<main[^>]+class=["'][^"']*\bdoke-page\b/.test(html)) {
    errors.push(`${page}: <main> sem contrato .doke-page`);
  }

  if (!/\bdoke-page-shell\b/.test(html)) {
    errors.push(`${page}: nenhum wrapper .doke-page-shell encontrado`);
  }

  if (!/\bdoke-page-section\b/.test(html)) {
    errors.push(`${page}: nenhuma seção .doke-page-section encontrada`);
  }

  stats.dokePage += count(html, '\\bdoke-page\\b');
  stats.dokePageShell += count(html, '\\bdoke-page-shell\\b');
  stats.dokePageSection += count(html, '\\bdoke-page-section\\b');
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
