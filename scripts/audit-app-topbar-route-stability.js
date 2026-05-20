#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
  'index.html','resultados.html','perfil.html','pedidos.html','carteira.html','pagamento-profissional.html',
  'avaliacao.html','configuracoes.html','notificacoes.html','comunidade.html','comunidade.html'
];

const report = {
  cycle: 'global-cycle-163-app-topbar-route-stability',
  status: 'passed',
  pages: [],
  checks: {},
  failures: []
};

function fail(message) {
  report.status = 'failed';
  report.failures.push(message);
}

for (const page of pages) {
  const htmlPath = path.join(root, page);
  const html = fs.readFileSync(htmlPath, 'utf8');
  const stylesheetHrefs = [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /rel=["']stylesheet["']/i.test(tag))
    .map((tag) => {
      const href = tag.match(/href=["']([^"']+)["']/i);
      return href ? href[1] : '';
    })
    .filter(Boolean);
  const hasTopbar = /data-app-topbar|data-shell-topbar|class=["'][^"']*\btopbar\b/i.test(html);
  const topbarLinks = stylesheetHrefs.filter(href => href.startsWith('assets/css/patterns/app-topbar.css'));
  const lastStylesheet = stylesheetHrefs[stylesheetHrefs.length - 1] || '';
  const pageReport = { page, hasTopbar, topbarLinks, lastStylesheet, finalTopbarContractLast: !hasTopbar || lastStylesheet.startsWith('assets/css/patterns/app-topbar.css') };
  report.pages.push(pageReport);
  if (hasTopbar && !pageReport.finalTopbarContractLast) fail(`${page}: app-topbar.css must be the final stylesheet for desktop topbar geometry.`);
}

const appJs = fs.readFileSync(path.join(root, 'assets/js/core/app.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets/js/core/runtime-config.js'), 'utf8');
const flags = fs.readFileSync(path.join(root, 'assets/js/core/feature-flags.js'), 'utf8');
const appTopbarCss = fs.readFileSync(path.join(root, 'assets/css/patterns/app-topbar.css'), 'utf8');

report.checks.instantShellFlagDefault = /instantShellNavigation:\s*true/.test(runtime);
report.checks.instantShellFlagAliases = ['instantNavigation','shellNavigation','routeSwap'].every(alias => flags.includes(`${alias}: 'instantShellNavigation'`));
report.checks.routeSwapCanBeDisabled = /if \(!isInstantShellNavigationEnabled\(\)\) return true;/.test(appJs);
report.checks.syncShellCalledBeforePageReplace = /syncBodyClassesFromDocument\(nextDoc\);\s*syncShellFromDocument\(nextDoc\);\s*syncStandaloneUiFromDocument\(nextDoc\);\s*currentPage\.replaceWith/.test(appJs);
report.checks.fullTopbarReplace = /currentTopbar\.replaceWith\(nextTopbar\.cloneNode\(true\)\)/.test(appJs);
report.checks.oldDrawerHintRemoved = !appJs.includes('assets/js/pages/home/drawer.js');
report.checks.finalTopbarCssLock = /Global Cycle 163/.test(appTopbarCss) && /data-topbar-contract="desktop-app-topbar"/.test(appTopbarCss);

for (const [name, ok] of Object.entries(report.checks)) {
  if (!ok) fail(`check failed: ${name}`);
}

const out = path.join(root, 'docs/validation/global-cycle-163-app-topbar-route-stability-report.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`[audit:app-topbar-route-stability] ${report.status}`);
if (report.failures.length) {
  console.error(report.failures.join('\n'));
  process.exit(1);
}
