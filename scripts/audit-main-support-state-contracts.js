const fs = require('fs');
const path = require('path');
const { inspectCanonicalStatePage } = require('./lib/state-contract-audit');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-137-main-support-state-contracts-report.json');
const PAGES = [
  {
    file: 'configuracoes.html',
    scope: 'configuracoes',
    loadingSurface: 'data-settings-hydration-pending',
    readySurface: 'data-settings-hydration-ready',
    completion: {
      type: 'page-controller',
      path: 'assets/js/pages/configuracoes.js',
      tokens: [
        "page: 'configuracoes'",
        'hydration?.ready({ hasItems: true })'
      ]
    }
  },
  {
    file: 'notificacoes.html',
    scope: 'notificacoes',
    loadingSurface: 'data-notifications-hydration-skeleton',
    readySurface: 'data-notifications-hydration-ready',
    completion: {
      type: 'page-controller',
      path: 'assets/js/pages/notificacoes.js',
      tokens: [
        "page: 'notificacoes'",
        "waitFor: ['dom', 'auth', 'local-notifications']",
        "hydration?.mark('local-notifications')"
      ]
    }
  },
  {
    file: 'comunidade.html',
    scope: 'comunidade',
    loadingSurface: 'data-community-hydration-skeleton',
    readySurface: 'data-community-hydration-content',
    completion: {
      type: 'community-controller',
      path: 'assets/js/pages/comunidade.js',
      tokens: [
        "setCommunityPageState('hydrated');",
        "page.dataset.viewState = nextState === 'hydrated' ? 'ready' : nextState;"
      ]
    }
  }
];

const pages = PAGES.map((spec) => inspectCanonicalStatePage({ root: ROOT, ...spec }));
const failed = pages.filter((page) => page.status !== 'passed');
const report = {
  cycle: 137,
  scope: 'main-support-state-contracts',
  status: failed.length ? 'failed' : 'passed',
  checkedPages: pages.length,
  failedPages: failed.length,
  contract: 'ready/false OR loading/true with canonical completion',
  pages
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:main-support-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:main-support-state-contracts] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages, failedPages: report.failedPages }, null, 2));
