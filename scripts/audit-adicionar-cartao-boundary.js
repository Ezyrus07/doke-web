#!/usr/bin/env node
/**
 * Global Cycle 73 — adicionar-cartao data boundary audit.
 *
 * Purpose:
 * - Ensure adicionar-cartao.html has a minimal controller/data boundary.
 * - Preserve provisional visual structure while preparing payment method persistence.
 * - Prevent card sensitive data from being stored in frontend global state.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, 'docs/validation/global-cycle-73-adicionar-cartao-boundary-report.json');

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
  const pageFile = 'adicionar-cartao.html';
  const controllerFile = 'assets/js/controllers/adicionar-cartao-controller.js';
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
    'data-card-add-page',
    'data-card-add-card',
    'data-card-add-fields',
    'data-card-add-holder-name',
    'data-card-add-number',
    'data-card-add-expiry',
    'data-card-add-cvv',
    'data-card-add-actions',
    'data-card-add-submit',
    'data-card-add-cancel',
    'data-card-add-back'
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
    'assets/js/services/wallet-service.js',
    'assets/js/services/domain-data-service.js',
    'assets/js/controllers/controller-data.js',
    'assets/js/controllers/page-controller-registry.js',
    'assets/js/controllers/adicionar-cartao-controller.js',
    'assets/js/controllers/controller-bootstrap.js'
  ];

  for (const script of requiredScripts) {
    assert(html.includes(script), `Missing data/controller script in ${pageFile}: ${script}`, failures);
  }

  assert(/data-page="adicionar-cartao"/.test(html), 'Body must keep data-page="adicionar-cartao".', failures);
  assert(!/style\s*=/.test(html), 'Cycle 73 must not introduce inline style attributes.', failures);
  assert(!/\son[a-z]+\s*=/.test(html), 'Cycle 73 must not introduce inline event handlers.', failures);
  assert(/Doke\.controllers\.register\(PAGE_NAME/.test(controller), 'Controller must register itself in Doke.controllers.', failures);
  assert(/PAGE_NAME\s*=\s*'adicionar-cartao'/.test(controller), 'Controller PAGE_NAME must be adicionar-cartao.', failures);
  assert(/readPageContext/.test(controller), 'Controller must expose/read a card page context boundary.', failures);
  assert(/visualContract:\s*'provisional-layout-preserved'/.test(controller), 'Controller must mark the visual contract as provisional/preserved.', failures);
  assert(/sensitiveDataPolicy:\s*'do-not-store-full-card-number-or-cvv-in-state'/.test(controller), 'Controller must document the no-sensitive-card-data state policy.', failures);
  assert(!/cardNumber:\s*numberDigits/.test(controller), 'Controller must not store full cardNumber in state or context.', failures);
  assert(!/cvv:\s*cvvDigits/.test(controller), 'Controller must not store CVV in state or context.', failures);
  assert(/cardNumberLast4/.test(controller), 'Controller should store only card last4 preview, not full number.', failures);
  assert(/'adicionar-cartao':\s*\['wallet'\]/.test(controllerData), 'controller-data must map adicionar-cartao to wallet.', failures);
  assert(/case 'adicionar-cartao':/.test(domainData), 'domain-data-service must handle adicionar-cartao.', failures);
  assert(/paymentMethods/.test(domainData), 'domain-data-service must expose a paymentMethods boundary for adicionar-cartao.', failures);

  const report = {
    cycle: 'Global Cycle 73',
    name: 'Adicionar cartao data boundary',
    generatedAt: new Date().toISOString(),
    scope: {
      page: pageFile,
      type: 'product data-ready boundary',
      visualProductFilesChanged: false,
      cssFilesChanged: false,
      provisionalVisualPreserved: true,
      sensitivePaymentDataStoredInState: false
    },
    checks: {
      requiredHooks,
      requiredScripts,
      controllerFile,
      controllerDataResources: ['wallet'],
      domainDataCase: 'adicionar-cartao',
      sensitiveDataPolicy: 'store only non-sensitive preview metadata until backend tokenization exists'
    },
    result: failures.length ? 'fail' : 'pass',
    failures
  };

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

  if (failures.length) {
    console.error('[cycle-73] Adicionar cartao boundary audit failed:');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('[cycle-73] Adicionar cartao boundary audit passed.');
  console.log(`[cycle-73] Output: ${path.relative(ROOT, OUTPUT)}`);
}

main();
