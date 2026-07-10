const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const ROOT = path.resolve(__dirname, '..');
const pages = [
  { file: 'index.html', flow: 'doke-search-flow' },
  { file: 'resultados.html', flow: 'doke-search-flow' },
  { file: 'pedidos.html', flow: 'doke-order-flow' },
  { file: 'mensagens.html', flow: 'doke-message-flow' },
  { file: 'comunidade.html', flow: 'doke-community-flow' },
  { file: 'comunidade.html', flow: 'doke-community-flow' },
  { file: 'perfil.html', flow: 'doke-profile-flow' },
  { file: 'carteira.html', flow: 'doke-wallet-flow' },
  { file: 'notificacoes.html', flow: 'doke-settings-flow' },
  { file: 'configuracoes.html', flow: 'doke-settings-flow' },
];

const requiredAssets = [
  'assets/js/components/mobile-app-shell.js',
  'assets/css/components/shell/mobile-app-shell.css',
  'assets/css/components/ui/doke-ui-system.css',
  'assets/css/components/domain/doke-domain-cards.css',
  'assets/css/components/layout/doke-layout-system.css',
  'assets/css/components/flows/doke-product-flows.css',
];

const issues = [];

for (const { file, flow } of pages) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    issues.push(`${file}: arquivo não encontrado`);
    continue;
  }
  const html = fs.readFileSync(full, 'utf8');
  const loadedCssAssets = new Set(getLoadedCssAssets(html, ROOT));
  for (const asset of requiredAssets) {
    const isCss = asset.endsWith('.css');
    const isLoaded = isCss ? loadedCssAssets.has(asset) : html.includes(asset);
    if (!isLoaded) issues.push(`${file}: não carrega ${asset}`);
  }
  if (!html.includes(flow)) issues.push(`${file}: não declara fluxo ${flow}`);
}

const mapPath = path.join(ROOT, 'docs/PAGE-ROUTE-MAP.md');
if (!fs.existsSync(mapPath)) {
  issues.push('docs/PAGE-ROUTE-MAP.md não encontrado');
} else {
  const map = fs.readFileSync(mapPath, 'utf8');
  for (const { file } of pages) {
    if (!map.includes(`\`${file}\``)) issues.push(`PAGE-ROUTE-MAP não lista ${file}`);
  }
}

if (issues.length) {
  console.error('Page route map audit failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Page route map audit passed. Pages checked: ${pages.length}`);
