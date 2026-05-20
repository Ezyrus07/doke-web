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
  { page: 'index.html', phase: 'desktop-priority-1', reason: 'homepage/marketplace entry; baseline-sensitive' },
  { page: 'resultados.html', phase: 'desktop-priority-1', reason: 'search/results conversion path' },
  { page: 'perfil.html', phase: 'desktop-priority-1', reason: 'high visual complexity; must use baseline before changes' },
  { page: 'detalhe-anuncio.html', phase: 'desktop-priority-2', reason: 'detail/conversion page; provisional visual' },
  { page: 'mensagens.html', phase: 'desktop-priority-2', reason: 'communication core; already data-ready enough for reform prep' },
  { page: 'comunidade-interna.html', phase: 'desktop-priority-2', reason: 'community conversation area; provisional visual' },
  { page: 'pagamento-profissional.html', phase: 'desktop-priority-3', reason: 'transactional; data boundary exists, visual provisional' },
  { page: 'finalizar-pedido.html', phase: 'desktop-priority-3', reason: 'transactional; data boundary exists, visual provisional' },
  { page: 'adicionar-cartao.html', phase: 'desktop-priority-3', reason: 'sensitive transactional page; card data boundary exists' },
  { page: 'avaliacao.html', phase: 'desktop-priority-3', reason: 'post-order flow; controller exists' },
  { page: 'pedidos.html', phase: 'desktop-priority-4', reason: 'operational dashboard; check existing baseline first' },
  { page: 'carteira.html', phase: 'desktop-priority-4', reason: 'wallet/finance area; provisional visual' },
  { page: 'configuracoes.html', phase: 'desktop-priority-4', reason: 'settings; provisional visual' },
  { page: 'notificacoes.html', phase: 'desktop-priority-4', reason: 'secondary operational page' },
  { page: 'comunidade.html', phase: 'desktop-priority-4', reason: 'community discovery; already has approved simplified direction' }
];

const pagesByName = Object.fromEntries(readiness.pages.map((page) => [page.page, page]));
function desktopReadinessStatus(status) {
  if (status === 'ready-for-responsive-review') return 'ready-for-desktop-review';
  return status || 'unknown';
}

const roadmap = pageOrder.map((item) => ({
  ...item,
  readinessStatus: desktopReadinessStatus(pagesByName[item.page]?.status),
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
    purpose: 'Define when to begin desktop-first reform without invalidating data-ready work. Responsive work remains deferred until desktop HTML/CSS is approved.'
  },
  summary: {
    productPagesSuiteStatus: suite?.summary?.status || 'unknown',
    drawerLoadingStatus: drawer?.summary?.status || 'unknown',
    responsiveReadyCount: readiness.summary.readyCount,
    responsiveNeedsPrepCount: readiness.summary.needsPrepCount,
    recommendedStart: 'Start desktop-first page reform only after current global structural debt package is accepted. Responsive work is explicitly deferred until desktop HTML/CSS is approved.',
    estimatedRemainingStructuralCyclesBeforeDesktopReform: 'after current global debt package, reassess before starting desktop phase',
    estimatedResponsiveReformCyclesAfterDesktopApproval: 'deferred; estimate only after desktop phase is closed per page',
    estimatedFullProfessionalizationRemaining: '25-40 focused cycles depending on redesign depth and backend integration scope'
  },
  roadmap,
  rules: [
    'Do not treat provisional HTML/CSS as final contract.',
    'Take baseline before each desktop page cycle.',
    'Change components/patterns when a UI element appears in more than one page.',
    'Avoid shell/sidebar/header/body/wrapper changes for page-local problems.',
    'Do not remove JS unless runtime validation proves it safe.'
  ]
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
console.log('[cycle-100] Product reform roadmap generated.');
console.log(`[cycle-100] Desktop-first recommendation: ${report.summary.recommendedStart}`);
