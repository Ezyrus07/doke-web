#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = [
  { file: 'index.html', page: 'home', flow: 'doke-search-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css', 'desktop-search.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'resultados.html', page: 'resultados', flow: 'doke-search-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css', 'desktop-search.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'pedidos.html', page: 'pedidos', flow: 'doke-order-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'mensagens.html', page: 'mensagens', flow: 'doke-message-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'comunidade.html', page: 'comunidade', flow: 'doke-community-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'comunidade-interna.html', page: 'comunidade-interna', flow: 'doke-community-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'perfil.html', page: 'perfil', flow: 'doke-profile-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'carteira.html', page: 'carteira', flow: 'doke-wallet-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'notificacoes.html', page: 'notificacoes', flow: 'doke-settings-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] },
  { file: 'configuracoes.html', page: 'configuracoes', flow: 'doke-settings-flow', desktop: ['desktop-shell.css', 'desktop-sidebar.css', 'desktop-topbar.css'], mobile: ['mobile-app-shell.css'] }
];

const requiredSharedCss = [
  'assets/css/components/ui/doke-ui-system.css',
  'assets/css/components/domain/doke-domain-cards.css',
  'assets/css/components/layout/doke-layout-system.css',
  'assets/css/components/flows/doke-product-flows.css'
];

const requiredSharedJs = [
  'assets/js/core/runtime-config.js',
  'assets/js/core/feature-flags.js',
  'assets/js/core/rollout-guard.js',
  'assets/js/components/mobile-app-shell.js',
  'assets/js/controllers/controller-bootstrap.js'
];

const forbiddenLegacyCss = [
  'mobile-chrome-lock.css',
  'app-mobile-topbar.css',
  'app-mobile-search.css',
  'mobile-search-header-shared.css',
  'mobile-page-rhythm-contract.css',
  'doke-legacy-bridge.css',
  'desktop-app-shell-recovery.css'
];

const inventory = [];
const failures = [];
const warnings = [];

function containsAny(html, needles) {
  return needles.filter((needle) => html.includes(needle));
}

function countMatches(html, regex) {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

for (const page of pages) {
  const filePath = path.join(root, page.file);
  if (!fs.existsSync(filePath)) {
    failures.push(`${page.file}: arquivo não encontrado.`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const bodyTag = (html.match(/<body[\s\S]*?>/i) || [''])[0];
  const cssLinks = [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)].map((m) => m[1]);
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+\.js[^"']*)["'][^>]*>/gi)].map((m) => m[1]);
  const missingSharedCss = requiredSharedCss.filter((href) => !html.includes(href));
  const missingDesktopCss = page.desktop.filter((name) => !html.includes(name));
  const missingMobileCss = page.mobile.filter((name) => !html.includes(name));
  const missingSharedJs = requiredSharedJs.filter((src) => !html.includes(src));
  const forbiddenLoaded = containsAny(html, forbiddenLegacyCss);

  if (!bodyTag.includes(`data-page="${page.page}"`)) {
    failures.push(`${page.file}: data-page esperado "${page.page}" não encontrado no body.`);
  }
  if (!bodyTag.includes(page.flow)) {
    failures.push(`${page.file}: classe de fluxo esperada "${page.flow}" não encontrada no body.`);
  }
  if (missingSharedCss.length) failures.push(`${page.file}: CSS compartilhado ausente: ${missingSharedCss.join(', ')}`);
  if (missingDesktopCss.length) failures.push(`${page.file}: contratos desktop ausentes: ${missingDesktopCss.join(', ')}`);
  if (missingMobileCss.length) failures.push(`${page.file}: contrato mobile ausente: ${missingMobileCss.join(', ')}`);
  if (missingSharedJs.length) failures.push(`${page.file}: JS base ausente: ${missingSharedJs.join(', ')}`);
  if (forbiddenLoaded.length) failures.push(`${page.file}: CSS legado proibido carregado: ${forbiddenLoaded.join(', ')}`);

  const dokePageCount = countMatches(html, /class=["'][^"']*\bdoke-page\b/gi);
  const sectionCount = countMatches(html, /\bdoke-page-section\b/g);
  const gridCount = countMatches(html, /\bdoke-grid\b/g);
  const listCount = countMatches(html, /\bdoke-list\b/g);
  const cardCount = countMatches(html, /\bdoke-card\b/g);
  const inputCount = countMatches(html, /\bdoke-input\b/g);
  const desktopSearchMarkers = countMatches(html, /doke-desktop-search|home-search-hero__desktop-search/g);
  const mobileShellMountMarkers = countMatches(html, /data-doke-mobile-shell|mobile-app-shell/g);

  if (dokePageCount === 0) warnings.push(`${page.file}: não encontrei .doke-page no HTML; verifique se o page shell está explícito ou montado por JS.`);
  if (sectionCount === 0) warnings.push(`${page.file}: nenhuma .doke-page-section detectada; revisar na etapa de grids/espaçamentos.`);

  inventory.push({
    file: page.file,
    page: page.page,
    flow: page.flow,
    cssLinks: cssLinks.length,
    scripts: scripts.length,
    dokePageCount,
    sectionCount,
    gridCount,
    listCount,
    cardCount,
    inputCount,
    desktopSearchMarkers,
    mobileShellMountMarkers,
    status: 'mapped'
  });
}

const reportDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(reportDir, { recursive: true });
const reportPath = path.join(reportDir, 'stage33-responsive-inventory-report.md');
const jsonPath = path.join(reportDir, 'stage33-responsive-inventory.json');

const rows = inventory.map((item) => `| ${item.file} | ${item.page} | ${item.flow} | ${item.sectionCount} | ${item.gridCount} | ${item.listCount} | ${item.cardCount} | ${item.inputCount} |`).join('\n');
const report = `# Stage 33 — Responsive Visual Inventory Report\n\nGenerated by \`scripts/audit-responsive-inventory.js\`.\n\n## Scope\n\nThis audit maps the current responsive/visual structure for the ten main HTML pages before further desktop/mobile corrections. It does not approve the design visually; it only verifies that each page is wired to the expected structural contracts.\n\n## Inventory\n\n| Page | data-page | Product flow | Sections | Grids | Lists | Cards | Inputs |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${rows}\n\n## Failures\n\n${failures.length ? failures.map((x) => `- ❌ ${x}`).join('\n') : '- ✅ No critical structural failures detected.'}\n\n## Warnings\n\n${warnings.length ? warnings.map((x) => `- ⚠️ ${x}`).join('\n') : '- ✅ No warnings detected.'}\n\n## Next use\n\nUse this inventory as the baseline for Stage 34–39. Critical visual regressions should be fixed immediately. Cosmetic choices should wait until the responsive structure is stable.\n`;

fs.writeFileSync(reportPath, report);
fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), inventory, failures, warnings }, null, 2));

if (failures.length) {
  console.error(report);
  process.exit(1);
}
console.log('Responsive inventory audit passed.');
console.log(`Pages mapped: ${inventory.length}`);
console.log(`Warnings: ${warnings.length}`);
