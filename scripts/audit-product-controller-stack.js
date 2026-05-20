#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-78-product-controller-stack-report.json';
const TARGETS = [
  { page: 'mensagens.html', controller: 'assets/js/controllers/mensagens-controller.js' },
  { page: 'pagamento-profissional.html', controller: 'assets/js/pages/pagamento-profissional.js' },
  { page: 'avaliacao.html', controller: 'assets/js/controllers/avaliacao-controller.js' }
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function cleanSrc(src) {
  return String(src || '').split('?')[0].split('#')[0];
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi), match => cleanSrc(match[1]));
}

function indexOf(scripts, src) {
  return scripts.indexOf(src);
}

function after(order, left, right) {
  return order[left] >= 0 && order[right] >= 0 && order[left] < order[right];
}

function auditTarget(target) {
  const html = read(target.page);
  const scripts = scriptSrcs(html);
  const required = {
    domainDataService: 'assets/js/services/domain-data-service.js',
    controllerData: 'assets/js/controllers/controller-data.js',
    pageControllerRegistry: 'assets/js/controllers/page-controller-registry.js',
    pageController: target.controller,
    controllerBootstrap: 'assets/js/controllers/controller-bootstrap.js'
  };
  const order = Object.fromEntries(Object.entries(required).map(([key, src]) => [key, indexOf(scripts, src)]));
  const missing = Object.entries(order).filter(([, index]) => index === -1).map(([key]) => ({ key, src: required[key] }));
  const controllerFileExists = fs.existsSync(path.join(ROOT, target.controller));
  const orderChecks = {
    domainBeforeControllerData: after(order, 'domainDataService', 'controllerData'),
    controllerDataBeforeRegistry: after(order, 'controllerData', 'pageControllerRegistry'),
    registryBeforePageController: after(order, 'pageControllerRegistry', 'pageController'),
    pageControllerBeforeBootstrap: after(order, 'pageController', 'controllerBootstrap')
  };
  const failures = [];
  if (!controllerFileExists) failures.push('missing-controller-file');
  for (const item of missing) failures.push(`missing-script:${item.key}`);
  for (const [name, ok] of Object.entries(orderChecks)) {
    if (!ok) failures.push(`invalid-order:${name}`);
  }
  return {
    page: target.page,
    expectedController: target.controller,
    controllerFileExists,
    scriptCount: scripts.length,
    order,
    orderChecks,
    failures
  };
}

const pages = TARGETS.map(auditTarget);
const failures = pages.flatMap((page) => page.failures.map((failure) => ({ page: page.page, failure })));
const report = {
  cycle: 78,
  name: 'product-controller-stack',
  generatedAt: new Date().toISOString(),
  scope: {
    targetPages: TARGETS.map((target) => target.page),
    visualProductFilesChanged: false,
    scriptOrderChanged: false,
    importsRemoved: false
  },
  summary: {
    pageCount: pages.length,
    pagesWithFailures: pages.filter((page) => page.failures.length).length,
    failureCount: failures.length
  },
  pages,
  failures
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');

console.log('[cycle-78] Product controller stack audit generated.');
console.log(`[cycle-78] Failures: ${report.summary.failureCount}`);
console.log(`[cycle-78] Output: ${OUTPUT}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
