const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-115-operational-data-boundary-report.json');
const PAGES = [
  { page: 'pedidos.html', key: 'pedidos', controller: 'pedidos-controller.js', resources: ['orders'] },
  { page: 'carteira.html', key: 'carteira', controller: 'wallet-controller.js', resources: ['wallet'] },
  { page: 'configuracoes.html', key: 'configuracoes', controller: 'configuracoes-controller.js', resources: ['users'] },
  { page: 'notificacoes.html', key: 'notificacoes', controller: 'notificacoes-controller.js', resources: ['notifications'] },
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function scriptSrcs(html) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)]
    .map((m) => m[1].split('?')[0].replace(/^\.\//, ''));
}

function dataHooks(html) {
  return [...new Set([...html.matchAll(/\s(data-[a-z0-9_-]+)(?:=|\s|>)/gi)].map((m) => m[1]))].sort();
}

function objectHasKey(source, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:['"]${escaped}['"]|${escaped})\\s*:`, 'm').test(source);
}

function domainHasCase(source, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`case\\s+['"]${escaped}['"]\\s*:`, 'm').test(source);
}

const controllerData = read(path.join(ROOT, 'assets/js/controllers/controller-data.js'));
const domainDataService = read(path.join(ROOT, 'assets/js/services/domain-data-service.js'));

const pages = PAGES.map((entry) => {
  const html = read(path.join(ROOT, entry.page));
  const scripts = scriptSrcs(html);
  const hooks = dataHooks(html);
  const controllerPath = `assets/js/controllers/${entry.controller}`;
  const risks = [];
  const hasDataPage = new RegExp(`data-page=["']${entry.key}["']`).test(html);
  const hasControllerFile = fs.existsSync(path.join(ROOT, controllerPath));
  const importsController = scripts.includes(controllerPath);
  const registeredInControllerData = objectHasKey(controllerData, entry.key);
  const referencedInDomainService = domainHasCase(domainDataService, entry.key);
  const hasExpectedResources = entry.resources.every((resource) => controllerData.includes(resource) || domainDataService.includes(resource));

  if (!hasDataPage) risks.push('missing-body-data-page');
  if (!hasControllerFile) risks.push('missing-controller-file');
  if (!importsController) risks.push('controller-not-imported');
  if (!registeredInControllerData) risks.push('not-registered-in-controller-data');
  if (!referencedInDomainService) risks.push('missing-domain-data-case');
  if (!hasExpectedResources) risks.push('expected-resource-not-visible');
  if (hooks.length < 8) risks.push('weak-data-hook-surface');

  return {
    ...entry,
    controllerPath,
    hasDataPage,
    hasControllerFile,
    importsController,
    registeredInControllerData,
    referencedInDomainService,
    hasExpectedResources,
    dataHookCount: hooks.length,
    risks,
    visualContract: 'provisional-layout-preserved',
  };
});

const risks = pages.flatMap((page) => page.risks.map((risk) => ({ page: page.page, risk })));
const report = {
  cycle: 115,
  name: 'operational data boundary',
  status: risks.length ? 'review' : 'passed',
  policy: {
    visualChanges: false,
    provisionalLayoutsPreserved: true,
    noHtmlRedesign: true,
  },
  summary: {
    pageCount: pages.length,
    pagesWithoutRisks: pages.filter((page) => page.risks.length === 0).length,
    riskCount: risks.length,
  },
  pages,
  risks,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (risks.length) {
  console.log(`[global-cycle-115] operational data boundary: review (${risks.length} risks)`);
} else {
  console.log(`[global-cycle-115] operational data boundary: passed (${pages.length} pages)`);
}
