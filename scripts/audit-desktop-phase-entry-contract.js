#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-107-desktop-phase-entry-contract-report.json';
const CONTRACT = 'docs/DESKTOP-PHASE-ENTRY-CONTRACT.md';
const HANDOFF = 'docs/GLOBAL-CYCLES-CLOSURE-HANDOFF.md';
const REQUIRED_PHRASES = [
  'desktop-first HTML/CSS reform',
  'Responsive implementation starts only after the desktop version',
  'Do not introduce inline styles',
  'Do not duplicate reusable CSS/JS',
  'Marketplace',
  'Operational',
  'Communication',
];
const REQUIRED_PAGES = [
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
  'comunidade.html',
];

const contractExists = fs.existsSync(path.join(ROOT, CONTRACT));
const handoffExists = fs.existsSync(path.join(ROOT, HANDOFF));
const content = contractExists ? fs.readFileSync(path.join(ROOT, CONTRACT), 'utf8') : '';
const missingPhrases = REQUIRED_PHRASES.filter((phrase) => !content.includes(phrase));
const pageChecks = REQUIRED_PAGES.map((page) => ({
  page,
  exists: fs.existsSync(path.join(ROOT, page)),
  listedInContract: content.includes(page),
}));

const failedPageChecks = pageChecks.filter((check) => !check.exists || !check.listedInContract);
const report = {
  cycle: 107,
  title: 'Desktop phase entry contract',
  goal: 'Define the next phase as desktop-first and explicitly defer responsive work.',
  scope: {
    visualChanges: false,
    responsiveWork: false,
    cssChanges: false,
    htmlLayoutChanges: false,
  },
  checks: {
    contractExists,
    handoffExists,
    requiredPhrasesPresent: missingPhrases.length === 0,
    allTargetPagesExistAndListed: failedPageChecks.length === 0,
  },
  missingPhrases,
  pageChecks,
  summary: {
    targetPageCount: REQUIRED_PAGES.length,
    failedPageCheckCount: failedPageChecks.length,
    nextPhase: 'desktop-first-page-reform',
    responsiveStatus: 'deferred-until-desktop-approval',
  },
};
const failed = Object.entries(report.checks).filter(([, value]) => !value).map(([name]) => name);
report.status = failed.length === 0 ? 'passed' : 'failed';
report.failedChecks = failed;

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);

console.log(`[global-cycle-107] desktop phase entry contract: ${report.status}`);
if (report.status !== 'passed') process.exit(1);
