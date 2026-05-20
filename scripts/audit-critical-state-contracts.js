const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PAGES = {
  'finalizar-pedido.html': 'finalizar-pedido',
  'pagamento-profissional.html': 'pagamento',
  'adicionar-cartao.html': 'adicionar-cartao',
  'avaliacao.html': 'avaliacao',
  'pedidos.html': 'pedidos',
  'carteira.html': 'carteira',
  'mensagens.html': 'mensagens',
  'comunidade-interna.html': 'comunidade-interna'
};
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-131-135-critical-state-contracts-report.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function hasAll(content, tokens) {
  return tokens.filter((token) => !content.includes(token));
}

const results = Object.entries(PAGES).map(([file, scope]) => {
  const content = read(file);
  const required = [
    `data-state-boundary="${scope}"`,
    `data-state-scope="${scope}"`,
    'data-view-state="ready"',
    'aria-busy="false"',
    'data-state-loading',
    'data-state-empty',
    'data-state-error',
    'assets/js/state/state-contracts.js'
  ];
  const missing = hasAll(content, required);
  return {
    file,
    scope,
    status: missing.length ? 'failed' : 'passed',
    missing
  };
});

const stateScriptExists = fs.existsSync(path.join(ROOT, 'assets/js/state/state-contracts.js'));
const failed = results.filter((result) => result.status !== 'passed');
const report = {
  cycle: '131-135',
  scope: 'critical-page-state-contracts',
  status: failed.length || !stateScriptExists ? 'failed' : 'passed',
  stateScriptExists,
  checkedPages: results.length,
  failedPages: failed.length,
  pages: results
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:critical-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:critical-state-contracts] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages, failedPages: report.failedPages }, null, 2));
