'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PAGES = {
  'pagamento-profissional.html': {
    scope: 'pagamento',
    hydration: {
      skeleton: 'data-payment-hydration-skeleton',
      ready: 'data-payment-hydration-ready'
    }
  },
  'pedidos.html': {
    scope: 'pedidos',
    hydration: {
      skeleton: 'data-orders-hydration-skeleton',
      ready: 'data-orders-hydration-ready'
    }
  },
  'carteira.html': { scope: 'carteira' },
  'mensagens.html': {
    scope: 'mensagens',
    hydration: {
      skeleton: 'data-messages-hydration-skeleton',
      ready: 'data-messages-hydration-ready'
    }
  }
};
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-131-135-critical-state-contracts-report.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function hasAll(content, tokens) {
  return tokens.filter((token) => !content.includes(token));
}

function hasReadyInitialState(content) {
  return /data-view-state=["']ready["']/.test(content)
    && /aria-busy=["']false["']/.test(content);
}

function hasHydratingInitialState(content, hydration) {
  if (!hydration) return false;
  const skeletonPattern = new RegExp(`${hydration.skeleton}(?![^>]*\\shidden(?:\\s|=|>))`);
  const readyPattern = new RegExp(`${hydration.ready}[^>]*\\shidden(?:\\s|=|>)`);
  return /data-view-state=["']loading["']/.test(content)
    && /aria-busy=["']true["']/.test(content)
    && skeletonPattern.test(content)
    && readyPattern.test(content);
}

const results = Object.entries(PAGES).map(([file, config]) => {
  const content = read(file);
  const { scope, hydration } = config;
  const required = [
    `data-state-boundary="${scope}"`,
    `data-state-scope="${scope}"`,
    'data-state-loading',
    'data-state-empty',
    'data-state-error',
    'assets/js/state/state-contracts.js'
  ];
  const missing = hasAll(content, required);
  const initialState = hasHydratingInitialState(content, hydration)
    ? 'loading'
    : hasReadyInitialState(content)
      ? 'ready'
      : 'invalid';
  if (initialState === 'invalid') {
    missing.push('valid initial state: ready/idle or loading/busy with visible skeleton and hidden ready content');
  }
  return {
    file,
    scope,
    initialState,
    status: missing.length ? 'failed' : 'passed',
    missing
  };
});

const stateScriptExists = fs.existsSync(path.join(ROOT, 'assets/js/state/state-contracts.js'));
const failed = results.filter((result) => result.status !== 'passed');
const report = {
  cycle: '131-135',
  scope: 'critical-page-state-contracts',
  status: failed.length || !stateScriptExists ? 'failed' : 'passed',
  stateScriptExists,
  checkedPages: results.length,
  failedPages: failed.length,
  pages: results
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (report.status !== 'passed') {
  console.error('[audit:critical-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:critical-state-contracts] passed');
console.log(JSON.stringify({ checkedPages: report.checkedPages, failedPages: report.failedPages }, null, 2));
