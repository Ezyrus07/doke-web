const fs = require('fs');
const path = require('path');

function read(root, file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function inspectCompletion(root, completion) {
  if (!completion || !completion.path || !Array.isArray(completion.tokens) || !completion.tokens.length) {
    return {
      canonical: false,
      evidence: null,
      missing: ['canonical-completion-evidence']
    };
  }

  const source = read(root, completion.path);
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

function inspectCanonicalStatePage({
  root,
  file,
  scope,
  loadingSurface,
  readySurface,
  completion
}) {
  const content = read(root, file);
  const missing = [];
  const required = [
    `data-state-boundary="${scope}"`,
    `data-state-scope="${scope}"`,
    'data-state-region',
    'data-state-loading',
    'data-state-empty',
    'data-state-error',
    'assets/js/state/state-contracts.js',
    'assets/js/core/page-hydration.js',
    loadingSurface,
    readySurface
  ];

  required.forEach((token) => {
    if (!content.includes(token)) missing.push(token);
  });

  const hasReady = content.includes('data-view-state="ready"');
  const hasLoading = content.includes('data-view-state="loading"');
  const hasBusyFalse = content.includes('aria-busy="false"');
  const hasBusyTrue = content.includes('aria-busy="true"');
  const startsReady = hasReady && hasBusyFalse;
  const startsLoading = hasLoading && hasBusyTrue;

  if (!startsReady && !startsLoading) {
    missing.push('valid-initial-state/busy-pair');
  }

  let completionResult = {
    canonical: startsReady,
    evidence: startsReady ? { type: 'static-ready' } : null,
    missing: []
  };

  if (startsLoading) {
    completionResult = inspectCompletion(root, completion);
    missing.push(...completionResult.missing);
  }

  const status = missing.length === 0 && completionResult.canonical ? 'passed' : 'failed';
  return {
    file,
    scope,
    status,
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

module.exports = {
  inspectCanonicalStatePage
};
