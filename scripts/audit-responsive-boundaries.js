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
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const contractPath = 'assets/css/components/shell/responsive-boundary.css';
const contract = fs.readFileSync(path.join(root, contractPath), 'utf8');
const requiredSnippets = [
  '@media (max-width: 760px)',
  '@media (min-width: 761px)',
  '--doke-breakpoint-mobile-max',
  '--doke-breakpoint-desktop-min',
  'body.doke-mobile-shell-mounted .sidebar',
  '.doke-mobile-shell',
  '.doke-mobile-bottom-nav',
];

const errors = [];

for (const snippet of requiredSnippets) {
  if (!contract.includes(snippet)) {
    errors.push(`Contrato responsivo não contém: ${snippet}`);
  }
}

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    errors.push(`Página ausente: ${page}`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  if (!getLoadedCssAssets(html, root).includes(contractPath)) {
    errors.push(`${page} não carrega ${contractPath}`);
  }
}

const reportDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(reportDir, { recursive: true });
const report = [
  '# Stage 34 — Responsive boundary audit',
  '',
  `Pages checked: ${pages.length}`,
  `Contract: ${contractPath}`,
  `Errors: ${errors.length}`,
  '',
  ...(errors.length ? errors.map((error) => `- ${error}`) : ['Responsive boundary audit passed.']),
  '',
].join('\n');
fs.writeFileSync(path.join(reportDir, 'stage34-responsive-boundary-report.md'), report);

if (errors.length) {
  console.error(report);
  process.exit(1);
}

console.log('Responsive boundary audit passed.');
console.log(`Pages checked: ${pages.length}`);
