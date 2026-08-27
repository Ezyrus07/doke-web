const fs = require('fs');
const path = require('path');

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

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function inspectCompletion(completion) {
  if (!completion || !completion.path || !Array.isArray(completion.tokens) || !completion.tokens.length) {
    return { canonical: false, evidence: null, missing: ['canonical-completion-evidence'] };
  }
  const source = read(completion.path);
  const missing = completion.tokens.filter((token) => !source.includes(token));
  return {
    canonical: missing.length === 0,
    evidence: {
      type: completion.type || 'source-contract',
      path: completion.path,
      tokens: completion.tokens
    },
    missing: missing.map((token) => `completion:${completion.path}:${token}`)
  };
}

function inspectPage(spec) {
  const content = read(spec.file);
  const missing = [];
  const required = [
    `data-state-boundary="${spec.scope}"`,
    `data-state-scope="${spec.scope}"`,
    'data-state-region',
    'data-state-loading',
    'data-state-empty',
    'data-state-error',
    'assets/js/state/state-contracts.js',
    'assets/js/core/page-hydration.js',
    spec.loadingSurface,
    spec.readySurface
  ];
  required.forEach((token) => {
    if (!content.includes(token)) missing.push(token);
  });

  const startsReady = content.includes('data-view-state="ready"') && content.includes('aria-busy="false"');
  const startsLoading = content.includes('data-view-state="loading"') && content.includes('aria-busy="true"');
  if (!startsReady && !startsLoading) missing.push('valid-initial-state/busy-pair');

  let completionResult = {
    canonical: startsReady,
    evidence: startsReady ? { type: 'static-ready' } : null,
    missing: []
  };
  if (startsLoading) {
    completionResult = inspectCompletion(spec.completion);
    missing.push(...completionResult.missing);
  }

  return {
    file: spec.file,
    scope: spec.scope,
    status: missing.length === 0 && completionResult.canonical ? 'passed' : 'failed',
    visualContract: 'provisional-layout-preserved',
    lifecycleContract: 'ready/false OR loading/true with canonical completion',
    initialState: startsReady ? 'ready' : startsLoading ? 'loading' : 'unknown',
    initialBusy: startsReady ? false : startsLoading ? true : null,
    finalState: completionResult.canonical ? 'ready' : 'unknown',
    completionCanonical: completionResult.canonical,
    completionEvidence: completionResult.evidence,
    missing
  };
}

const pages = PAGES.map(inspectPage);
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
