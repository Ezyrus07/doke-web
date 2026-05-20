#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-88-product-controller-api-smoke-report.json';
const controllers = {
  'pagamento-profissional.html': {
    file: 'assets/js/pages/pagamento-profissional.js',
    api: ['Doke.paymentController', 'getLatest'],
    stateKey: 'pagamento'
  },
  'avaliacao.html': {
    file: 'assets/js/controllers/avaliacao-controller.js',
    api: ['Doke.reviewController', 'getLatest'],
    stateKey: 'avaliacao'
  }
};

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));

const results = Object.entries(controllers).map(([page, contract]) => {
  const html = exists(page) ? read(page) : '';
  const js = exists(contract.file) ? read(contract.file) : '';
  const imported = html.includes(contract.file);
  const apiPresent = contract.api.filter((api) => js.includes(api));
  const statePresent = js.includes(contract.stateKey);
  const domReadySafe = /DOMContentLoaded|document\.readyState|Doke\.controllers\)\s*Doke\.controllers\.register/.test(js);
  const exposesGetLatest = js.includes('getLatest');
  const noSensitiveCardStorage = contract.file.includes('adicionar-cartao')
    ? js.includes('sensitiveDataPolicy') && js.includes('do-not-store-full-card-number-or-cvv-in-state') && !/Doke\.state\.merge\([^)]*(cvvDigits|numberDigits)/s.test(js)
    : true;

  const failures = [];
  if (!exists(contract.file)) failures.push('missing-controller-file');
  if (!imported) failures.push('controller-not-imported-by-page');
  if (apiPresent.length !== contract.api.length) failures.push('missing-public-api-token');
  if (!statePresent) failures.push('missing-state-key');
  if (!domReadySafe) failures.push('missing-dom-ready-safety');
  if (!exposesGetLatest) failures.push('missing-getLatest');
  if (!noSensitiveCardStorage) failures.push('sensitive-card-data-storage-risk');

  return {
    page,
    controller: contract.file,
    imported,
    apiRequired: contract.api,
    apiPresent,
    stateKey: contract.stateKey,
    statePresent,
    domReadySafe,
    exposesGetLatest,
    noSensitiveCardStorage,
    status: failures.length === 0 ? 'passed' : 'failed',
    failures
  };
});

const summary = {
  controllerCount: results.length,
  passedControllers: results.filter((item) => item.status === 'passed').length,
  failedControllers: results.filter((item) => item.status !== 'passed').length,
  sensitiveCardStorageRisks: results.filter((item) => item.failures.includes('sensitive-card-data-storage-risk')).length
};

const report = {
  cycle: 88,
  name: 'product-controller-api-smoke',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'static controller public API smoke test',
    visualChanges: false
  },
  summary,
  results
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.failedControllers > 0) {
  console.error(`[cycle-88] Controller API smoke failed for ${summary.failedControllers} controller(s).`);
  process.exit(1);
}

console.log(`[cycle-88] Controller API smoke passed for ${summary.passedControllers}/${summary.controllerCount} controllers.`);
