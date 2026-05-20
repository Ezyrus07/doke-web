#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade-interna.html',
  'pagamento-profissional.html',
  'avaliacao.html'
];
const SOURCE_REPORT = 'docs/validation/global-cycle-83-product-script-reduction-candidates-report.json';
const OUT = 'docs/validation/global-cycle-86-product-runtime-validation-matrix-report.json';

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(ROOT, file));
const stripQuery = (src) => String(src || '').split('?')[0].split('#')[0];
const scriptRegex = /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)><\/script>/gi;

const selectorContracts = {
  'assets/js/components/media-lightbox.js': ['data-media-lightbox', 'data-lightbox', 'data-gallery', 'data-community-image-preview', 'data-messages-image-input'],
  'assets/js/components/mobile-app-shell.js': ['doke-mobile-shell-pending', 'data-mobile-home-menu-open', 'data-mobile-shell', 'doke-mobile-page-header'],
  'assets/js/pages/home/drawer.js': ['data-mobile-home-drawer', 'data-mobile-home-menu-open', 'data-home-profile-menu-toggle'],
  'assets/js/pages/avaliacao.js': ['data-review-page', 'data-review-star', 'data-review-submit'],
  'assets/js/pages/comunidade-interna.js': ['data-community-room', 'data-community-room-messages', 'data-community-room-form'],
  'assets/js/pages/mensagens.js': ['data-messages-page', 'data-thread-body', 'data-messages-composer'],
  'assets/js/pages/pagamento-profissional.js': ['data-payment-page', 'data-payment-method', 'data-payment-submit'],
  'assets/js/services/community-service.js': ['data-community', 'data-community-room', 'data-community-feed'],
  'assets/js/services/conversation-service.js': ['data-messages-page', 'data-conversation', 'data-thread-body'],
  'assets/js/services/order-service.js': ['data-order', 'data-finalizar-pedido-page', 'data-payment-page', 'data-review-page'],
  'assets/js/services/profile-service.js': ['data-profile', 'data-profile-card', 'data-user-profile'],
  'assets/js/services/review-service.js': ['data-review-page', 'data-review-star', 'data-competency'],
  'assets/js/services/search-service.js': ['data-search', 'data-search-input', 'data-results-page'],
  'assets/js/services/user-service.js': ['data-user', 'data-profile', 'data-card-add-page'],
  'assets/js/services/wallet-service.js': ['data-wallet', 'data-payment-page', 'data-card-add-page']
};

const pageHtml = Object.fromEntries(TARGET_PAGES.map((page) => [page, exists(page) ? read(page) : '']));
const pageScripts = Object.fromEntries(TARGET_PAGES.map((page) => {
  const scripts = [];
  const html = pageHtml[page];
  let match;
  while ((match = scriptRegex.exec(html))) scripts.push(stripQuery(match[2]));
  return [page, scripts];
}));

const source = JSON.parse(read(SOURCE_REPORT));
const candidates = source.candidates || [];

const results = candidates.map((candidate) => {
  const src = stripQuery(candidate.src);
  const fileExists = exists(src);
  const scriptContent = fileExists ? read(src) : '';
  const selectors = selectorContracts[src] || [];
  const pages = (candidate.pages || []).filter((page) => TARGET_PAGES.includes(page));
  const pageChecks = pages.map((page) => {
    const html = pageHtml[page] || '';
    const loaded = (pageScripts[page] || []).includes(src);
    const matchingSelectors = selectors.filter((selector) => html.includes(selector));
    const optionalRuntimeApi = /\?\.|typeof\s+window|window\./.test(scriptContent);
    const hasPrerequisiteSurface = matchingSelectors.length > 0;
    let runtimeDecision = 'keep-until-runtime-tested';
    if (!loaded) runtimeDecision = 'not-loaded-on-page';
    else if (hasPrerequisiteSurface) runtimeDecision = 'runtime-surface-present';
    else if (optionalRuntimeApi) runtimeDecision = 'inert-or-optional-but-verify-manually';

    return {
      page,
      loaded,
      selectorContract: selectors,
      matchingSelectors,
      hasPrerequisiteSurface,
      optionalRuntimeApi,
      runtimeDecision
    };
  });

  return {
    src,
    candidateType: candidate.candidateType,
    removalRisk: candidate.removalRisk,
    fileExists,
    pageChecks,
    decision: pageChecks.some((check) => check.hasPrerequisiteSurface)
      ? 'keep-runtime-surface-present'
      : 'manual-runtime-validation-required',
    automaticRemovalAllowed: false
  };
});

const summary = {
  candidateCount: results.length,
  missingScriptFiles: results.filter((item) => !item.fileExists).length,
  keepRuntimeSurfacePresent: results.filter((item) => item.decision === 'keep-runtime-surface-present').length,
  manualRuntimeValidationRequired: results.filter((item) => item.decision === 'manual-runtime-validation-required').length,
  automaticRemovalAllowed: 0
};

const report = {
  cycle: 86,
  name: 'product-runtime-validation-matrix',
  generatedAt: new Date().toISOString(),
  scope: {
    targetPages: TARGET_PAGES,
    sourceReport: SOURCE_REPORT,
    removalPerformed: false,
    purpose: 'Static runtime-prerequisite matrix before any JS removal.'
  },
  summary,
  results
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.missingScriptFiles > 0) {
  console.error(`[cycle-86] Missing candidate script files: ${summary.missingScriptFiles}`);
  process.exit(1);
}

console.log(`[cycle-86] Runtime validation matrix passed. Candidates=${summary.candidateCount}; autoRemove=${summary.automaticRemovalAllowed}.`);
