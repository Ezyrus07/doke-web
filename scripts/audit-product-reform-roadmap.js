#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-100-product-reform-roadmap-report.json';
const READINESS = 'docs/validation/global-cycle-99-responsive-reform-readiness-report.json';
const SUITE = 'docs/validation/global-cycle-95-product-pages-suite-report.json';
const DRAWER = 'docs/validation/global-cycle-98-product-drawer-loading-report.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

const readiness = readJson(READINESS);
const suite = fs.existsSync(path.join(ROOT, SUITE)) ? readJson(SUITE) : null;
const drawer = readJson(DRAWER);

const pageOrder = [
  { page: 'index.html', phase: 'visual-responsive-priority-1', reason: 'homepage/marketplace entry; baseline-sensitive' },
  { page: 'resultados.html', phase: 'visual-responsive-priority-1', reason: 'search/results conversion path' },
  { page: 'perfil.html', phase: 'visual-responsive-priority-1', reason: 'high visual complexity; must use baseline before changes' },
  { page: 'detalhe-anuncio.html', phase: 'visual-responsive-priority-2', reason: 'detail/conversion page; provisional visual' },
  { page: 'mensagens.html', phase: 'visual-responsive-priority-2', reason: 'communication core; already data-ready enough for reform prep' },
  { page: 'comunidade-interna.html', phase: 'visual-responsive-priority-2', reason: 'community conversation area; provisional visual' },
  { page: 'pagamento.html', phase: 'visual-responsive-priority-3', reason: 'transactional; data boundary exists, visual provisional' },
  { page: 'finalizar-pedido.html', phase: 'visual-responsive-priority-3', reason: 'transactional; data boundary exists, visual provisional' },
  { page: 'adicionar-cartao.html', phase: 'visual-responsive-priority-3', reason: 'sensitive transactional page; card data boundary exists' },
  { page: 'avaliacao.html', phase: 'visual-responsive-priority-3', reason: 'post-order flow; controller exists' },
  { page: 'pedidos.html', phase: 'visual-responsive-priority-4', reason: 'operational dashboard; check existing baseline first' },
  { page: 'carteira.html', phase: 'visual-responsive-priority-4', reason: 'wallet/finance area; provisional visual' },
  { page: 'configuracoes.html', phase: 'visual-responsive-priority-4', reason: 'settings; provisional visual' },
  { page: 'notificacoes.html', phase: 'visual-responsive-priority-4', reason: 'secondary operational page' },
  { page: 'comunidade.html', phase: 'visual-responsive-priority-4', reason: 'community discovery; already has approved simplified direction' }
];

const pagesByName = Object.fromEntries(readiness.pages.map((page) => [page.page, page]));
const roadmap = pageOrder.map((item) => ({
  ...item,
  readinessStatus: pagesByName[item.page]?.status || 'unknown',
  visualStatus: pagesByName[item.page]?.visualStatus || 'unknown',
  issues: pagesByName[item.page]?.issues || []
}));

const report = {
  cycle: 100,
  name: 'product-reform-roadmap',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'roadmap gate after product structure cycles',
    visualChanges: false,
    cssChanges: false,
    purpose: 'Define when to begin visual/responsive reform without invalidating data-ready work.'
  },
  summary: {
    productPagesSuiteStatus: suite?.summary?.status || 'unknown',
    drawerLoadingStatus: drawer?.summary?.status || 'unknown',
    responsiveReadyCount: readiness.summary.readyCount,
    responsiveNeedsPrepCount: readiness.summary.needsPrepCount,
    recommendedStart: 'Start visual/responsive reform now, but page-by-page with baseline screenshots and without changing global shell for local issues.',
    estimatedRemainingStructuralCyclesBeforeVisualReform: '0-2',
    estimatedResponsiveVisualReformCycles: '12-20 page/component cycles',
    estimatedFullProfessionalizationRemaining: '25-40 focused cycles depending on redesign depth and backend integration scope'
  },
  roadmap,
  rules: [
    'Do not treat provisional HTML/CSS as final contract.',
    'Take baseline before each visual/responsive page cycle.',
    'Change components/patterns when a UI element appears in more than one page.',
    'Avoid shell/sidebar/header/body/wrapper changes for page-local problems.',
    'Do not remove JS unless runtime validation proves it safe.'
  ]
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
console.log('[cycle-100] Product reform roadmap generated.');
console.log(`[cycle-100] Recommended start: ${report.summary.recommendedStart}`);
