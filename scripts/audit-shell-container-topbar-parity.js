#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const htmlFiles = fs.readdirSync(root)
  .filter((file) => file.endsWith('.html'))
  .sort();

const stablePages = new Set([
  'index.html',
  'resultados.html',
  'perfil.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'notificacoes.html',
]);

const evolvingPages = new Set([
  'carteira.html',
  'detalhe-anuncio.html',
  'finalizar-pedido.html',
  'pagamento.html',
  'configuracoes.html',
  'comunidade-interna.html',
  'avaliacao.html',
  'adicionar-cartao.html',
]);

const excludedPages = new Set([
  'teste.html',
]);

function hasClass(html, className) {
  const body = html.match(/<body\b[^>]*class=["']([^"']*)["']/i);
  if (!body) return false;
  return body[1].split(/\s+/).includes(className);
}

function hasAny(html, patterns) {
  return patterns.some((pattern) => pattern.test(html));
}

function countPattern(html, pattern) {
  const matches = html.match(pattern);
  return matches ? matches.length : 0;
}

function classifyPage(file) {
  if (stablePages.has(file)) return 'stable';
  if (evolvingPages.has(file)) return 'evolving';
  if (file.startsWith('auth/')) return 'auth';
  if (file.startsWith('docs/') || file.startsWith('tools/') || excludedPages.has(file)) return 'auxiliary';
  return 'unclassified';
}

const allHtmlFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) allHtmlFiles.push(path.relative(root, full).replace(/\\/g, '/'));
  }
}
walk(root);
allHtmlFiles.sort();

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    html: allHtmlFiles.length,
    stable: 0,
    evolving: 0,
    auth: 0,
    auxiliary: 0,
    unclassified: 0,
    stableIssues: 0,
    evolvingFindings: 0,
  },
  pages: [],
};

for (const file of allHtmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const css = getLoadedCssAssets(html, root);
  const category = classifyPage(file);
  report.totals[category] = (report.totals[category] || 0) + 1;

  const signals = {
    bodyDokeAppShellPage: hasClass(html, 'doke-app-shell-page'),
    bodyAppShellPage: hasClass(html, 'app-shell-page'),
    hasAppShell: /class=["'][^"']*\bapp-shell\b/.test(html),
    hasPage: /class=["'][^"']*\bpage\b/.test(html),
    hasPageContent: /class=["'][^"']*\bpage__content\b/.test(html),
    hasPageContentInner: /class=["'][^"']*\bpage__content-inner\b/.test(html),
    hasTopbar: hasAny(html, [/\btopbar\b/, /\binternal-page-topbar\b/, /\bhome-index-topbar\b/]),
    topbarCount: countPattern(html, /\b(?:topbar|internal-page-topbar|home-index-topbar)\b/g),
    hasSidebar: hasAny(html, [/\bsidebar\b/, /data-shell-sidebar/]),
    loadsPageContainerContract: css.includes('assets/css/components/shell/page-container-contract.css'),
    loadsResponsiveBoundary: css.includes('assets/css/components/shell/responsive-boundary.css'),
    loadsDesktopBaseStability: css.includes('assets/css/components/shell/desktop-base-stability.css'),
    loadsDesktopShell: css.includes('assets/css/components/shell/desktop-shell.css') || css.includes('assets/css/components/shell/doke-shell-contract.css'),
  };

  const issues = [];
  const findings = [];

  if (category === 'stable') {
    if (!signals.bodyDokeAppShellPage) issues.push('stable page should carry body.doke-app-shell-page');
    if (!signals.bodyAppShellPage) issues.push('stable page should carry body.app-shell-page');
    if (!signals.hasAppShell) issues.push('stable page should use .app-shell');
    if (!signals.hasPageContentInner) issues.push('stable page should use .page__content-inner for width parity');
    if (!signals.hasTopbar) issues.push('stable page should expose a desktop topbar contract');
    if (!signals.hasSidebar) issues.push('stable page should expose the sidebar shell');
    if (!signals.loadsResponsiveBoundary) issues.push('stable page should load responsive-boundary.css through its CSS graph');
    if (!signals.loadsDesktopBaseStability) issues.push('stable page should load desktop-base-stability.css through its CSS graph');
    if (!signals.loadsDesktopShell) issues.push('stable page should load a desktop shell contract through its CSS graph');
    report.totals.stableIssues += issues.length;
  }

  if (category === 'evolving') {
    if (!signals.bodyDokeAppShellPage) findings.push('evolving page is not yet on body.doke-app-shell-page');
    if (!signals.hasPageContentInner) findings.push('evolving page does not yet use .page__content-inner consistently');
    if (!signals.loadsResponsiveBoundary) findings.push('evolving page does not load responsive-boundary.css through its CSS graph');
    if (!signals.loadsDesktopBaseStability) findings.push('evolving page does not load desktop-base-stability.css through its CSS graph');
    report.totals.evolvingFindings += findings.length;
  }

  report.pages.push({
    file,
    category,
    cssCount: css.length,
    signals,
    issues,
    findings,
  });
}

const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(
  path.join(validationDir, 'global-cycle-16-shell-container-topbar-parity-report.json'),
  JSON.stringify(report, null, 2)
);

const stableWithIssues = report.pages.filter((page) => page.category === 'stable' && page.issues.length);
if (stableWithIssues.length) {
  console.error('Shell/container/topbar parity audit found stable-page issues:');
  for (const page of stableWithIssues) {
    console.error(`- ${page.file}`);
    for (const issue of page.issues) console.error(`  • ${issue}`);
  }
  process.exit(1);
}

console.log('Shell/container/topbar parity audit passed.');
console.log(`Stable pages checked: ${report.totals.stable}. Evolving findings recorded: ${report.totals.evolvingFindings}.`);
