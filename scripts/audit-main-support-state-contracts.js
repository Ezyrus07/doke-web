const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-137-main-support-state-contracts-report.json');
const PAGES = {
  'configuracoes.html': 'configuracoes',
  'notificacoes.html': 'notificacoes',
  'comunidade.html': 'comunidade'
};

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function missingTokens(content, scope) {
  const tokens = [
    `data-state-boundary="${scope}"`,
    `data-state-scope="${scope}"`,
    'data-view-state="ready"',
    'aria-busy="false"',
    'data-state-region',
    'data-state-loading',
    'data-state-empty',
    'data-state-error',
    'assets/js/state/state-contracts.js'
  ];
  return tokens.filter((token) => !content.includes(token));
}

const pages = Object.entries(PAGES).map(([file, scope]) => {
  const content = read(file);
  const missing = missingTokens(content, scope);
  return {
    file,
    scope,
    status: missing.length ? 'failed' : 'passed',
    visualContract: 'provisional-layout-preserved',
    missing
  };
});

const failed = pages.filter((page) => page.status !== 'passed');
const report = {
  cycle: 137,
  scope: 'main-support-state-contracts',
  status: failed.length ? 'failed' : 'passed',
  checkedPages: pages.length,
  failedPages: failed.length,
  pages
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:main-support-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:main-support-state-contracts] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages }, null, 2));
