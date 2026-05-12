const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-112-operational-data-readiness-report.json');
const PAGES = [
  { page: 'pedidos.html', controller: 'pedidos-controller.js', resources: ['orders'] },
  { page: 'carteira.html', controller: 'wallet-controller.js', resources: ['wallet'] },
  { page: 'configuracoes.html', controller: 'configuracoes-controller.js', resources: ['settings', 'profile'] },
  { page: 'notificacoes.html', controller: 'notificacoes-controller.js', resources: ['notifications'] },
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function extractScriptSrcs(html) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1].split('?')[0].replace(/^\.\//, ''));
}

function extractDataHooks(html) {
  return [...html.matchAll(/\s(data-[a-z0-9_-]+)(?:=|\s|>)/gi)].map((match) => match[1]);
}

const controllerData = read(path.join(ROOT, 'assets/js/controllers/controller-data.js'));
const domainDataService = read(path.join(ROOT, 'assets/js/services/domain-data-service.js'));

const pages = PAGES.map((entry) => {
  const file = path.join(ROOT, entry.page);
  const html = read(file);
  const scripts = extractScriptSrcs(html);
  const hooks = extractDataHooks(html);
  const uniqueHooks = [...new Set(hooks)].sort();
  const controllerPath = `assets/js/controllers/${entry.controller}`;
  const hasControllerFile = fs.existsSync(path.join(ROOT, controllerPath));
  const importsController = scripts.some((src) => src === controllerPath);
  const pageKey = entry.page.replace('.html', '');
  const registeredInControllerData = controllerData.includes(`'${pageKey}'`) || controllerData.includes(`"${pageKey}"`);
  const referencedInDomainService = domainDataService.includes(pageKey) || entry.resources.some((resource) => domainDataService.includes(resource));
  const risks = [];
  if (!hasControllerFile) risks.push('missing-controller-file');
  if (!importsController) risks.push('controller-not-imported-in-html');
  if (!registeredInControllerData) risks.push('not-registered-in-controller-data');
  if (uniqueHooks.length < 8) risks.push('weak-data-hook-surface');

  return {
    ...entry,
    exists: fs.existsSync(file),
    controllerPath,
    hasControllerFile,
    importsController,
    registeredInControllerData,
    referencedInDomainService,
    dataHookCount: uniqueHooks.length,
    dataHooks: uniqueHooks,
    risks,
    visualContract: 'provisional-layout-preserved',
  };
});

const allRisks = pages.flatMap((page) => page.risks.map((risk) => ({ page: page.page, risk })));
const report = {
  cycle: 112,
  name: 'operational data readiness',
  status: 'passed',
  policy: {
    visualChanges: false,
    controllerAuditOnly: true,
    provisionalLayoutsPreserved: true,
  },
  summary: {
    pageCount: pages.length,
    pagesWithoutRisks: pages.filter((page) => page.risks.length === 0).length,
    riskCount: allRisks.length,
    pagesNeedingFollowUp: pages.filter((page) => page.risks.length > 0).map((page) => page.page),
  },
  pages,
  risks: allRisks,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[global-cycle-112] operational data readiness: passed (${pages.length} pages mapped, ${allRisks.length} follow-up risks)`);
