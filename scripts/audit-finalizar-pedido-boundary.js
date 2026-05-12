#!/usr/bin/env node
/**
 * Global Cycle 71 — finalizar-pedido data boundary audit.
 *
 * Purpose:
 * - Ensure finalizar-pedido.html has a minimal controller/data boundary.
 * - Keep the audit focused on data readiness, not visual structure.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-71-finalizar-pedido-boundary-report.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function has(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function main() {
  const failures = [];
  const pageFile = 'finalizar-pedido.html';
  const controllerFile = 'assets/js/controllers/finalizar-pedido-controller.js';
  const controllerDataFile = 'assets/js/controllers/controller-data.js';
  const domainDataFile = 'assets/js/services/domain-data-service.js';

  assert(has(pageFile), `${pageFile} is missing`, failures);
  assert(has(controllerFile), `${controllerFile} is missing`, failures);
  assert(has(controllerDataFile), `${controllerDataFile} is missing`, failures);
  assert(has(domainDataFile), `${domainDataFile} is missing`, failures);

  const html = has(pageFile) ? read(pageFile) : '';
  const controller = has(controllerFile) ? read(controllerFile) : '';
  const controllerData = has(controllerDataFile) ? read(controllerDataFile) : '';
  const domainData = has(domainDataFile) ? read(domainDataFile) : '';

  const requiredHooks = [
    'data-order-finalize-page',
    'data-finalize-image-input',
    'data-finalize-preview',
    'data-finalize-preview-image',
    'data-finalize-remove-image',
    'data-finalize-note',
    'data-finalize-title',
    'data-finalize-professional',
    'data-finalize-avatar',
    'data-finalize-amount',
    'data-finalize-installments',
    'data-finalize-submit'
  ];

  for (const hook of requiredHooks) {
    assert(html.includes(hook), `Missing required hook in ${pageFile}: ${hook}`, failures);
  }

  const requiredScripts = [
    'assets/js/core/runtime-config.js',
    'assets/js/core/feature-flags.js',
    'assets/js/core/rollout-guard.js',
    'assets/js/core/app-state.js',
    'assets/js/services/mock-data-service.js',
    'assets/js/services/order-service.js',
    'assets/js/services/domain-data-service.js',
    'assets/js/controllers/controller-data.js',
    'assets/js/controllers/page-controller-registry.js',
    'assets/js/controllers/finalizar-pedido-controller.js',
    'assets/js/controllers/controller-bootstrap.js'
  ];

  for (const script of requiredScripts) {
    assert(html.includes(script), `Missing data/controller script in ${pageFile}: ${script}`, failures);
  }

  assert(/data-page="finalizar-pedido"/.test(html), 'Body must keep data-page="finalizar-pedido".', failures);
  assert(!/style\s*=/.test(html), 'Cycle 71 must not introduce inline style attributes.', failures);
  assert(!/\son[a-z]+\s*=/.test(html), 'Cycle 71 must not introduce inline event handlers.', failures);
  assert(/Doke\.controllers\.register\(PAGE_NAME/.test(controller), 'Controller must register itself in Doke.controllers.', failures);
  assert(/PAGE_NAME\s*=\s*'finalizar-pedido'/.test(controller), 'Controller PAGE_NAME must be finalizar-pedido.', failures);
  assert(/readPageContext/.test(controller), 'Controller must expose/read a page context boundary.', failures);
  assert(/visualContract:\s*'provisional-layout-preserved'/.test(controller), 'Controller must mark the visual contract as provisional/preserved.', failures);
  assert(/'finalizar-pedido':\s*\['orders'\]/.test(controllerData), 'controller-data must map finalizar-pedido to orders.', failures);
  assert(/case 'finalizar-pedido':/.test(domainData), 'domain-data-service must handle finalizar-pedido.', failures);

  const report = {
    cycle: 'Global Cycle 71',
    name: 'Finalizar pedido data boundary',
    generatedAt: new Date().toISOString(),
    scope: {
      page: pageFile,
      type: 'product data-ready boundary',
      visualProductFilesChanged: false,
      cssFilesChanged: false,
      provisionalVisualPreserved: true
    },
    checks: {
      requiredHooks,
      requiredScripts,
      controllerFile,
      controllerDataResource: 'orders',
      domainDataCase: 'finalizar-pedido'
    },
    result: failures.length ? 'fail' : 'pass',
    failures
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error('[cycle-71] Finalizar pedido boundary audit failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('[cycle-71] Finalizar pedido boundary audit passed.');
  console.log(`[cycle-71] Output: ${path.relative(ROOT, OUTPUT)}`);
}

main();
