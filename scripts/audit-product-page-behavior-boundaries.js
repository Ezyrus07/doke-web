#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-93-product-page-behavior-boundaries-report.json';

const pages = [
  {
    page: 'pagamento-profissional.html',
    pageScript: 'assets/js/pages/pagamento-profissional.js',
    controller: 'assets/js/pages/pagamento-profissional.js',
    pageSignals: ['data-payment-method', 'data-payment-submit', 'DokeInitPaymentPage'],
    controllerSignals: ['Doke.paymentController', 'visualContract', 'provisional-layout-preserved']
  },
  {
    page: 'avaliacao.html',
    pageScript: 'assets/js/pages/avaliacao.js',
    controller: 'assets/js/controllers/avaliacao-controller.js',
    pageSignals: ['data-review-star', 'data-review-submit', 'DokeInitReviewPage'],
    controllerSignals: ['Doke.reviewController', 'visualContract', 'provisional-layout-preserved']
  }
];

const read = (file) => fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';

const results = pages.map((entry) => {
  const html = read(entry.page);
  const pageScriptText = entry.pageScript ? read(entry.pageScript) : '';
  const controllerText = read(entry.controller);
  const pageScriptImported = entry.pageScript ? html.includes(entry.pageScript) : false;
  const controllerImported = html.includes(entry.controller);
  const pageSignalMatches = entry.pageSignals.filter((signal) => html.includes(signal) || pageScriptText.includes(signal));
  const controllerSignalMatches = entry.controllerSignals.filter((signal) => controllerText.includes(signal));
  const hasSeparateBehaviorLayer = entry.pageScript ? pageScriptImported && pageSignalMatches.length > 0 : true;
  const hasControllerBoundary = controllerImported && controllerSignalMatches.length > 0;
  return {
    page: entry.page,
    pageScript: entry.pageScript,
    controller: entry.controller,
    pageScriptImported,
    controllerImported,
    pageSignalMatches,
    controllerSignalMatches,
    hasSeparateBehaviorLayer,
    hasControllerBoundary,
    visualContract: controllerText.includes('provisional-layout-preserved') ? 'provisional-layout-preserved' : 'unknown',
    decision: hasControllerBoundary && hasSeparateBehaviorLayer ? 'keep-split-behavior-and-data-boundary' : 'review-boundary',
    removalAllowed: false
  };
});

const summary = {
  pageCount: results.length,
  splitBoundariesPassing: results.filter((item) => item.decision === 'keep-split-behavior-and-data-boundary').length,
  reviewCount: results.filter((item) => item.decision !== 'keep-split-behavior-and-data-boundary').length,
  removalAllowedNow: 0,
  visualChanges: false,
  jsRemovalPerformed: false
};

const report = {
  cycle: 93,
  name: 'product-page-behavior-boundaries',
  generatedAt: new Date().toISOString(),
  scope: {
    purpose: 'Validate page behavior scripts remain separate from data-boundary controllers while layouts are provisional.',
    removalPerformed: false
  },
  summary,
  results
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.reviewCount > 0 || summary.removalAllowedNow > 0) {
  console.error(`[cycle-93] Page behavior boundary review required: ${summary.reviewCount}`);
  process.exit(1);
}

console.log(`[cycle-93] Page behavior boundaries passed (${summary.splitBoundariesPassing}/${summary.pageCount}).`);
