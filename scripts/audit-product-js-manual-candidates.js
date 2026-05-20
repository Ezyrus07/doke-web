#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-91-product-js-manual-candidates-report.json';
const READINESS = 'docs/validation/global-cycle-89-product-js-reduction-readiness-report.json';

const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const readText = (file) => fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
const stripQuery = (src) => String(src || '').split('?')[0];

const readiness = readJson(READINESS);
const manual = (readiness.decisions || []).filter((item) => item.decision === 'manual-review');

const targetPages = [
  'mensagens.html',
  'comunidade-interna.html',
  'finalizar-pedido.html',
  'pagamento-profissional.html',
  'adicionar-cartao.html',
  'avaliacao.html'
];

const scriptSignals = {
  'assets/js/pages/finalizar-pedido.js': {
    publicApis: ['DokeInitOrderFinalize'],
    domSignals: ['data-order-finalize-page', 'data-finalize-submit', 'data-finalize-image-input', 'data-finalize-preview'],
    pageBoundary: 'page-local-behavior',
    decision: 'keep-as-page-behavior',
    reason: 'The file owns local UI interactions for finalizar-pedido.html, while the controller owns data boundary only.'
  },
  'assets/js/services/auth-service.js': {
    publicApis: ['window.DokeAuth', 'DokeAuth.service', 'requireAuth', 'getCurrentUser'],
    consumers: ['assets/js/core/app.js'],
    pageBoundary: 'shared-auth-facade',
    decision: 'keep-as-shared-service',
    reason: 'Authentication/session facade is consumed by core runtime and cannot be removed from communication pages without runtime verification.'
  },
  'assets/js/services/message-service.js': {
    publicApis: ['Doke.services.messages', 'listConversations', 'unreadCount'],
    consumers: ['assets/js/services/domain-data-service.js'],
    pageBoundary: 'domain-service',
    decision: 'keep-as-domain-service',
    reason: 'Domain data service can delegate message loading to this service for communication pages.'
  },
  'assets/js/services/notification-service.js': {
    publicApis: ['Doke.services.notifications', 'list', 'unreadCount'],
    consumers: ['assets/js/services/domain-data-service.js'],
    pageBoundary: 'domain-service',
    decision: 'keep-as-domain-service',
    reason: 'Domain data service can delegate notification loading/counts to this service.'
  },
  'assets/js/services/search-service.js': {
    publicApis: ['Doke.services.search', 'featured', 'fromLocationSearch', 'getById'],
    consumers: ['assets/js/services/domain-data-service.js'],
    pageBoundary: 'domain-service',
    decision: 'keep-as-domain-service',
    reason: 'Domain data service uses search helpers for shared service lists and should not lose this service in a broad JS cleanup.'
  }
};

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  return (haystack.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

const results = manual.map((item) => {
  const src = stripQuery(item.src);
  const scriptText = readText(src);
  const signals = scriptSignals[src] || {};
  const loadedPages = item.loadedPages || [];
  const pages = targetPages.filter((page) => loadedPages.includes(page)).map((page) => {
    const html = readText(page);
    return {
      page,
      loaded: html.includes(src),
      domSignalMatches: (signals.domSignals || []).filter((signal) => html.includes(signal))
    };
  });
  const publicApiMatches = (signals.publicApis || []).filter((api) => scriptText.includes(api));
  const consumerMatches = (signals.consumers || []).map((consumer) => {
    const text = readText(consumer);
    return {
      consumer,
      matchedApis: (signals.publicApis || []).filter((api) => countOccurrences(text, api) > 0)
    };
  }).filter((consumer) => consumer.matchedApis.length > 0 || src.includes('/services/'));

  const evidenceScore = publicApiMatches.length + consumerMatches.length + pages.reduce((sum, page) => sum + page.domSignalMatches.length, 0);

  return {
    src,
    loadedPages,
    fileExists: fs.existsSync(path.join(ROOT, src)),
    pageBoundary: signals.pageBoundary || 'manual-review',
    publicApiMatches,
    consumerMatches,
    pageEvidence: pages,
    decision: signals.decision || 'manual-review-required',
    removalAllowed: false,
    evidenceScore,
    reason: signals.reason || 'No automated removal rule is available for this script.'
  };
});

const summary = {
  manualCandidateCount: results.length,
  keepAsSharedService: results.filter((item) => item.decision === 'keep-as-shared-service').length,
  keepAsDomainService: results.filter((item) => item.decision === 'keep-as-domain-service').length,
  keepAsPageBehavior: results.filter((item) => item.decision === 'keep-as-page-behavior').length,
  removalAllowedNow: results.filter((item) => item.removalAllowed).length,
  missingFiles: results.filter((item) => !item.fileExists).length,
  visualChanges: false,
  jsRemovalPerformed: false
};

const report = {
  cycle: 91,
  name: 'product-js-manual-candidates',
  generatedAt: new Date().toISOString(),
  scope: {
    sourceReport: READINESS,
    purpose: 'Manual-review candidate classification before any JS removal.',
    removalPerformed: false
  },
  summary,
  results
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.missingFiles > 0 || summary.removalAllowedNow > 0) {
  console.error(`[cycle-91] Manual candidate gate failed: missingFiles=${summary.missingFiles}, removalAllowedNow=${summary.removalAllowedNow}`);
  process.exit(1);
}

console.log(`[cycle-91] Manual JS candidates classified (${summary.manualCandidateCount}); no removals allowed.`);
