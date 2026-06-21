#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-141-global-contract-integrity-report.json');

const requiredFiles = [
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/STATE-CONTRACTS.md',
  'docs/DATA-FALLBACK-STRATEGY.md',
  'docs/DESKTOP-PHASE-ENTRY-CONTRACT.md',
  'docs/GLOBAL-CYCLES-CLOSURE-HANDOFF.md',
  'docs/SHARED-MOBILE-DRAWER-MIGRATION-PLAN.md',
  'assets/js/state/state-contracts.js',
  'assets/js/services/data-fallback-contract.js',
  'assets/js/ui/mobile-drawer.js'
];

const requiredPackageScripts = [
  'audit:product-pages',
  'audit:global-structural-debt',
  'audit:global-css-design-system',
  'audit:global-data-ready-states',
  'audit:global-state-completion',
  'audit:global-completion'
];

const mainPages = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento-profissional.html',
  'configuracoes.html',
  'notificacoes.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html'
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

const packageJson = JSON.parse(read('package.json'));
const missingFiles = requiredFiles.filter((file) => !exists(file));
const missingScripts = requiredPackageScripts.filter((script) => !packageJson.scripts || !packageJson.scripts[script]);

const pageContracts = mainPages.map((page) => {
  const html = exists(page) ? read(page) : '';
  return {
    page,
    exists: exists(page),
    hasStateBoundary: html.includes('data-state-boundary'),
    hasStateRuntime: html.includes('assets/js/state/state-contracts.js'),
    hasDeferredStateRuntime: Array.from(html.matchAll(/<script\b[^>]*src=[\"']([^\"']+)[\"'][^>]*>/g)).some((match) => match[1].split('?')[0] === 'assets/js/state/state-contracts.js' && /\sdefer(\s|>|=)/i.test(match[0])),
  };
});

const pageFailures = pageContracts.filter((item) => !item.exists || !item.hasStateBoundary || !item.hasStateRuntime || !item.hasDeferredStateRuntime);

const report = {
  cycle: 141,
  name: 'global contract integrity',
  generatedAt: new Date().toISOString(),
  requiredFilesCount: requiredFiles.length,
  missingFiles,
  requiredPackageScriptsCount: requiredPackageScripts.length,
  missingScripts,
  checkedPages: pageContracts.length,
  pageFailures,
  status: missingFiles.length || missingScripts.length || pageFailures.length ? 'failed' : 'passed',
  note: 'Validates that global structural contracts created during the global cycles are present and that main pages include the state runtime contract. It does not assert that visual desktop work is complete.'
};

ensureDir(REPORT_PATH);
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[global-contract-integrity] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[global-contract-integrity] passed');
