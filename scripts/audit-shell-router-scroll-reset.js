const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mainPages = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento.html',
  'finalizar-pedido.html',
  'avaliacao.html',
  'adicionar-cartao.html',
  'configuracoes.html',
  'notificacoes.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade-interna.html'
];
const expectedVersion = 'assets/js/core/app.js?v=20260512-shell-router-scroll-reset-v167';
const appPath = path.join(root, 'assets/js/core/app.js');
const appSource = fs.readFileSync(appPath, 'utf8');

const checks = {
  hasScrollResetFunction: appSource.includes('const resetRouteScrollState = () =>'),
  swapsAppShellScope: appSource.includes('replaceAppShellFromDocument(nextDoc)'),
  doesNotOnlyReplacePage: !appSource.includes('currentPage.replaceWith(nextPageNode)'),
  callsScrollResetOnNavigation: appSource.includes('resetRouteScrollState();'),
  keepsInstantNavigationFlagged: appSource.includes('shouldBypassShellSwap') && appSource.includes('swapView(href, options)')
};

const pageReports = mainPages.map((page) => {
  const htmlPath = path.join(root, page);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const appScriptMatches = html.match(/<script[^>]+assets\/js\/core\/app\.js[^>]*><\/script>/g) || [];
  return {
    page,
    appScriptCount: appScriptMatches.length,
    hasExpectedVersion: html.includes(expectedVersion),
    appScriptIsDeferred: appScriptMatches.every((tag) => /\sdefer(\s|>|$)/.test(tag)),
    hasMalformedDeferText: />\s*defer\s*<\/script>/i.test(html),
    usesOldDrawer: html.includes('assets/js/pages/home/drawer.js')
  };
});

const failures = [];
Object.entries(checks).forEach(([name, passed]) => {
  if (!passed) failures.push(`app.js check failed: ${name}`);
});
pageReports.forEach((report) => {
  if (report.appScriptCount !== 1) failures.push(`${report.page}: expected one app.js script, found ${report.appScriptCount}`);
  if (!report.hasExpectedVersion) failures.push(`${report.page}: app.js cache version not updated`);
  if (!report.appScriptIsDeferred) failures.push(`${report.page}: app.js is not defer`);
  if (report.hasMalformedDeferText) failures.push(`${report.page}: malformed > defer script tag remains`);
  if (report.usesOldDrawer) failures.push(`${report.page}: old drawer path remains`);
});

const report = {
  status: failures.length ? 'failed' : 'passed',
  expectedVersion,
  checks,
  pageReports,
  failures
};

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-167-shell-router-scroll-reset-report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Shell router scroll reset audit passed.');
