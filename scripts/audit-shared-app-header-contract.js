#!/usr/bin/env node
/*
 * Guard for the shared app-header markup contract.
 * Pages choose actions and contextual content; layout/header.css owns shared anatomy.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HEADER_IMPORT_VERSION = 'layout/header.css?v=20260701-index-profile-contract-v1';
const pageContracts = {
  'admin.html': { variant: 'contextual', context: true },
  'admin-verificacao.html': { variant: 'contextual', context: true },
  'ajuda.html': { variant: 'standard', context: false },
  'anunciar-servico.html': { variant: 'standard', context: false },
  'avaliacao-profissional.html': { variant: 'contextual', context: true },
  'carteira.html': { variant: 'contextual', context: true },
  'comunidade.html': { variant: 'contextual', context: true },
  'comunidade-interna.html': { variant: 'contextual', context: true },
  'configuracoes.html': { variant: 'standard', context: false },
  'detalhe-anuncio.html': { variant: 'contextual', context: true },
  'index.html': { variant: 'standard', context: false },
  'mensagens.html': { variant: 'contextual', context: true },
  'notificacoes.html': { variant: 'contextual', context: true },
  'meu-perfil.html': { variant: 'standard', context: false },
  'novidades.html': { variant: 'standard', context: false },
  'orcamento.html': { variant: 'standard', context: false },
  'pagamento-profissional.html': { variant: 'contextual', context: false },
  'perfil.html': { variant: 'standard', context: false },
  'perfil-cliente.html': { variant: 'standard', context: false },
  'perfil-profissional.html': { variant: 'standard', context: false },
  'pedidos.html': { variant: 'contextual', context: true },
  'resultados.html': { variant: 'standard', context: false },
  'tornar-profissional.html': { variant: 'standard', context: false },
  'verificacao-profissional.html': { variant: 'standard', context: false },
};
const failures = [];
const approvedWorkspaceExceptions = {
  'comunidade-interna.html': 'full-height conversation workspace with its own thread headers',
};

function fail(file, check) {
  failures.push({ file, check });
}

const activeHtmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const discoveredAppHeaderPages = activeHtmlFiles.filter((file) => {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return /<header\b[^>]*\bclass=["'][^"']*\bapp-header\b/i.test(html);
});
const discoveredAppShellPages = activeHtmlFiles.filter((file) => {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return /<body\b[^>]*\b(?:doke-app-shell-page|app-shell-page)\b/i.test(html);
});

for (const file of discoveredAppHeaderPages) {
  if (!pageContracts[file]) fail(file, 'app-header page is missing from the declared contract matrix');
}
for (const file of Object.keys(pageContracts)) {
  if (!discoveredAppHeaderPages.includes(file)) fail(file, 'declared contract page no longer exposes an app-header');
}
for (const file of discoveredAppShellPages) {
  if (!discoveredAppHeaderPages.includes(file) && !approvedWorkspaceExceptions[file]) {
    fail(file, 'app-shell page must expose app-header or declare an approved workspace exception');
  }
}

for (const [file, expected] of Object.entries(pageContracts)) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const headers = html.match(/<header\b[^>]*\bdata-app-header\b[^>]*>/gi) || [];
  if (headers.length !== 1) {
    fail(file, `expected exactly one data-app-header, found ${headers.length}`);
    continue;
  }

  const header = headers[0];
  if (!/\bclass=["'][^"']*\bapp-header\b/i.test(header)) fail(file, 'data-app-header must keep the app-header class');
  if (!/\bdata-header-contract=["']app-header["']/i.test(header)) fail(file, 'missing data-header-contract="app-header"');
  if (!new RegExp(`\\bdata-header-variant=["']${expected.variant}["']`, 'i').test(header)) {
    fail(file, `expected data-header-variant="${expected.variant}"`);
  }
  if ((html.match(/\bdata-header-inner\b/gi) || []).length !== 1) fail(file, 'expected exactly one data-header-inner');
  if ((html.match(/\bdata-header-slot=["']primary["']/gi) || []).length !== 1) fail(file, 'expected exactly one primary header slot');
  if ((html.match(/\bdata-header-slot=["']actions["']/gi) || []).length !== 1) fail(file, 'expected exactly one actions header slot');

  const contextCount = (html.match(/\bdata-header-context\b/gi) || []).length;
  if (expected.context && contextCount !== 1) fail(file, 'contextual variant must expose exactly one data-header-context');
  if (!expected.context && contextCount !== 0) fail(file, 'standard variant must not expose data-header-context');
  if (!/\bclass=["'][^"']*\bhome-side-meta__search\b/i.test(html)) {
    fail(file, 'app-header must expose the shared search control');
  }
  const hasLocation = /\bclass=["'][^"']*\bhome-side-meta__location\b/i.test(html);
  if (expected.variant === 'standard' && !hasLocation) {
    fail(file, 'standard app-header must expose the shared location control');
  }
  if (expected.variant === 'contextual' && hasLocation) {
    fail(file, 'contextual app-header must not expose the standard location control');
  }
  if (expected.variant === 'standard' && (!/\bdata-topbar-location-value\b/i.test(html) || !/\bdata-location-fallback=["']Belo Horizonte, MG["']/i.test(html))) {
    fail(file, 'standard app-header location must use the shared Belo Horizonte fallback contract');
  }

  const contextTag = (html.match(/<[^>]+\bdata-header-context\b[^>]*>/i) || [])[0] || '';
  const contextContainsSharedActions = contextTag
    && /<[^>]+\bclass=["'][^"']*\bpage-header-context__action\b/i.test(html);
  if (contextContainsSharedActions && !/\bclass=["'][^"']*\bpage-header-context\b/i.test(contextTag)) {
    fail(file, 'header context with shared action pills must keep the page-header-context container class');
  }

  if (/<header\b[^>]*\b(?:internal-page-topbar|data-app-topbar)\b/i.test(html)) {
    fail(file, 'competing topbar contract found');
  }
}

const headerCss = fs.readFileSync(path.join(ROOT, 'assets/css/layout/header.css'), 'utf8');
for (const hook of ['[data-header-slot]', '[data-header-slot="primary"]', '[data-header-slot="actions"]', '[data-header-context]']) {
  if (!headerCss.includes(hook)) fail('assets/css/layout/header.css', `missing canonical selector ${hook}`);
}

const cssFiles = [];
function collectCss(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collectCss(file);
    else if (entry.isFile() && entry.name.endsWith('.css')) cssFiles.push(file);
  }
}
collectCss(path.join(ROOT, 'assets/css'));
for (const file of cssFiles) {
  const css = fs.readFileSync(file, 'utf8');
  if (!/layout\/header\.css\?v=/.test(css)) continue;
  if (!css.includes(HEADER_IMPORT_VERSION)) {
    fail(path.relative(ROOT, file).replace(/\\/g, '/'), `must load the index profile contract through ${HEADER_IMPORT_VERSION}`);
  }
}

for (const file of ['assets/css/pages/home-foundation.css', 'assets/css/pages/profile-foundation.css', 'assets/css/pages/pedidos-foundation.css']) {
  const css = fs.readFileSync(path.join(ROOT, file), 'utf8');
  if (!/layout\/header\.css/.test(css) && file !== 'assets/css/pages/home-foundation.css') {
    fail(file, 'must import layout/header.css');
  }
  if (/app-header-canonical-contract\.css|patterns\/app-topbar\.css/.test(css)) {
    fail(file, 'must not import a competing shared header contract');
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  discoveredAppHeaderPages,
  approvedWorkspaceExceptions,
  pageContracts,
  failures,
};
const reportPath = path.join(ROOT, 'reports/generated/shared-app-header-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Shared app header contract: ${report.status}`);
console.log(`Failures: ${failures.length}`);
console.log(`Report: ${path.relative(ROOT, reportPath)}`);
if (failures.length) process.exitCode = 1;
