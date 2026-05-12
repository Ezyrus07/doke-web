const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-139-main-state-runtime-coverage-report.json');
const PAGES = [
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

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const runtimePath = 'assets/js/state/state-contracts.js';
const runtimeExists = fs.existsSync(path.join(ROOT, runtimePath));
const runtimeContent = runtimeExists ? read(runtimePath) : '';
const runtimeApiTokens = [
  'Doke.stateContracts',
  'setBoundaryState',
  'setActionState',
  'init: initializeBoundaries'
];
const missingRuntimeApi = runtimeApiTokens.filter((token) => !runtimeContent.includes(token));

const pages = PAGES.map((file) => {
  const content = read(file);
  const hasRuntime = content.includes(runtimePath);
  const hasBoundary = content.includes('data-state-boundary=');
  const hasRegion = content.includes('data-state-region');
  return {
    file,
    hasRuntime,
    hasBoundary,
    hasRegion,
    status: hasRuntime && hasBoundary && hasRegion ? 'passed' : 'failed'
  };
});

const failed = pages.filter((page) => page.status !== 'passed');
const report = {
  cycle: 139,
  scope: 'main-state-runtime-coverage',
  status: runtimeExists && !missingRuntimeApi.length && !failed.length ? 'passed' : 'failed',
  runtimePath,
  runtimeExists,
  missingRuntimeApi,
  checkedPages: pages.length,
  failedPages: failed.length,
  pages
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:main-state-runtime-coverage] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:main-state-runtime-coverage] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages, failedPages: report.failedPages }, null, 2));
