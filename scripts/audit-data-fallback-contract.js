#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-129-data-fallback-contract-report.json');
const DOC = 'docs/DATA-FALLBACK-STRATEGY.md';
const JS = 'assets/js/services/data-fallback-contract.js';
const REQUIRED_DOC_TERMS = ['Backend/repository real', 'Repository boundary', 'Mock data service', 'empty', 'error', 'loading', 'ready'];
const REQUIRED_JS_TERMS = ['normalizeResult', 'fromError', 'ready', 'empty', 'error'];

function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }

const docText = exists(DOC) ? read(DOC) : '';
const jsText = exists(JS) ? read(JS) : '';
const missingDocTerms = REQUIRED_DOC_TERMS.filter((term) => !docText.includes(term));
const missingJsTerms = REQUIRED_JS_TERMS.filter((term) => !jsText.includes(term));
const jsHasSensitiveCardStorage = /cvv|cardNumber|numeroCartao|número completo/i.test(jsText);
const jsUsesInlineStyle = /\.style\.|setAttribute\(['"]style['"]/i.test(jsText);

const checks = {
  strategyDocExists: exists(DOC),
  runtimeContractExists: exists(JS),
  strategyDocComplete: missingDocTerms.length === 0,
  runtimeContractComplete: missingJsTerms.length === 0,
  noSensitiveCardStorage: !jsHasSensitiveCardStorage,
  noInlineStyleMutation: !jsUsesInlineStyle
};
const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  cycle: 129,
  title: 'Data fallback contract audit',
  generatedAt: new Date().toISOString(),
  files: { strategy: DOC, runtimeContract: JS },
  missingDocTerms,
  missingJsTerms,
  checks,
  status: failed.length === 0 ? 'passed' : 'failed',
  failed
};
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (failed.length) {
  console.error(`[cycle 129] failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('[cycle 129] data fallback contract passed');
