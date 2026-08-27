const fs = require('fs');
const path = require('path');
const { inspectCanonicalStatePage } = require('./lib/state-contract-audit');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-136-main-marketplace-state-contracts-report.json');
const PAGES = [
  {
    file: 'index.html',
    scope: 'index',
    loadingSurface: 'data-home-hydration-skeleton',
    readySurface: 'data-home-hydration-ready',
    completion: {
      type: 'shared-route-hydration',
      path: 'assets/js/core/page-hydration.js',
      tokens: [
        "'/index.html'",
        "boundary: '[data-state-boundary=\"index\"]'",
        "skeleton: '[data-home-hydration-skeleton]'",
        "ready: '[data-home-hydration-ready]'"
      ]
    }
  },
  {
    file: 'resultados.html',
    scope: 'resultados',
    loadingSurface: 'data-results-hydration-skeleton',
    readySurface: 'data-results-hydration-ready',
    completion: {
      type: 'shared-route-hydration',
      path: 'assets/js/core/page-hydration.js',
      tokens: [
        "'/resultados.html'",
        "boundary: '[data-state-boundary=\"resultados\"]'",
        "skeleton: '[data-results-hydration-skeleton]'",
        "ready: '[data-results-hydration-ready]'"
      ]
    }
  },
  {
    file: 'perfil.html',
    scope: 'perfil',
    loadingSurface: 'data-profile-hydration-skeleton',
    readySurface: 'data-profile-hydration-ready',
    completion: {
      type: 'page-controller',
      path: 'assets/js/pages/profile-experience.js',
      tokens: [
        "page: 'perfil'",
        'hydration.ready({ hasItems: true })'
      ]
    }
  },
  {
    file: 'detalhe-anuncio.html',
    scope: 'detalhe-anuncio',
    loadingSurface: 'data-detail-hydration-skeleton',
    readySurface: 'data-detail-hydration-ready',
    completion: {
      type: 'shared-route-hydration',
      path: 'assets/js/core/page-hydration.js',
      tokens: [
        "'/detalhe-anuncio.html'",
        "boundary: '[data-state-boundary=\"detalhe-anuncio\"]'",
        "skeleton: '[data-detail-hydration-skeleton]'",
        "ready: '[data-detail-hydration-ready]'"
      ]
    }
  }
];

const pages = PAGES.map((spec) => inspectCanonicalStatePage({ root: ROOT, ...spec }));
const failed = pages.filter((page) => page.status !== 'passed');
const report = {
  cycle: 136,
  scope: 'main-marketplace-state-contracts',
  status: failed.length ? 'failed' : 'passed',
  checkedPages: pages.length,
  failedPages: failed.length,
  contract: 'ready/false OR loading/true with canonical completion',
  pages
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:main-marketplace-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:main-marketplace-state-contracts] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages, failedPages: report.failedPages }, null, 2));
