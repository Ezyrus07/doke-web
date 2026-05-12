#!/usr/bin/env node
/**
 * Global Cycle 72 — pagamento data boundary audit.
 *
 * Purpose:
 * - Ensure pagamento.html has a minimal controller/data boundary.
 * - Preserve provisional visual structure while preparing transactional data hooks.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-72-pagamento-boundary-report.json');

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
  const pageFile = 'pagamento.html';
  const controllerFile = 'assets/js/controllers/pagamento-controller.js';
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
    'data-payment-page',
    'data-payment-method',
    'data-payment-panel',
    'data-payment-form',
    'data-payment-submit',
    'data-payment-overlay',
    'data-payment-title',
    'data-payment-professional',
    'data-payment-avatar',
    'data-payment-amount',
    'data-payment-installments',
    'data-payment-description',
    'data-payment-points-toggle',
    'data-payment-points-input',
    'data-payment-points-summary'
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
    'assets/js/services/wallet-service.js',
    'assets/js/services/domain-data-service.js',
    'assets/js/controllers/controller-data.js',
    'assets/js/controllers/page-controller-registry.js',
    'assets/js/controllers/pagamento-controller.js',
    'assets/js/controllers/controller-bootstrap.js'
  ];

  for (const script of requiredScripts) {
    assert(html.includes(script), `Missing data/controller script in ${pageFile}: ${script}`, failures);
  }

  assert(/data-page="pagamento"/.test(html), 'Body must keep data-page="pagamento".', failures);
  assert(!/style\s*=/.test(html), 'Cycle 72 must not introduce inline style attributes.', failures);
  assert(!/\son[a-z]+\s*=/.test(html), 'Cycle 72 must not introduce inline event handlers.', failures);
  assert(/Doke\.controllers\.register\(PAGE_NAME/.test(controller), 'Controller must register itself in Doke.controllers.', failures);
  assert(/PAGE_NAME\s*=\s*'pagamento'/.test(controller), 'Controller PAGE_NAME must be pagamento.', failures);
  assert(/readPageContext/.test(controller), 'Controller must expose/read a payment page context boundary.', failures);
  assert(/visualContract:\s*'provisional-layout-preserved'/.test(controller), 'Controller must mark the visual contract as provisional/preserved.', failures);
  assert(/pagamento:\s*\['orders',\s*'wallet'\]/.test(controllerData), 'controller-data must map pagamento to orders and wallet.', failures);
  assert(/case 'pagamento':/.test(domainData), 'domain-data-service must handle pagamento.', failures);
  assert(/paymentOrderId/.test(domainData), 'domain-data-service must read payment orderId safely.', failures);

  const report = {
    cycle: 'Global Cycle 72',
    name: 'Pagamento data boundary',
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
      controllerDataResources: ['orders', 'wallet'],
      domainDataCase: 'pagamento'
    },
    result: failures.length ? 'fail' : 'pass',
    failures
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error('[cycle-72] Pagamento boundary audit failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('[cycle-72] Pagamento boundary audit passed.');
  console.log(`[cycle-72] Output: ${path.relative(ROOT, OUTPUT)}`);
}

main();
