#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-127-state-container-contracts-report.json');
const CONTRACT_DOC = 'docs/STATE-CONTRACTS.md';
const CONTRACT_JS = 'assets/js/state/state-contracts.js';
const CORE_FILES = ['assets/js/core/view-state.js', 'assets/js/core/list-state.js', CONTRACT_JS];
const REQUIRED_TERMS = ['idle', 'loading', 'empty', 'error', 'ready', 'data-list-region', 'aria-busy', 'aria-live'];

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const docText = exists(CONTRACT_DOC) ? read(CONTRACT_DOC) : '';
const jsText = exists(CONTRACT_JS) ? read(CONTRACT_JS) : '';
const missingTerms = REQUIRED_TERMS.filter((term) => !docText.includes(term));
const missingCoreFiles = CORE_FILES.filter((file) => !exists(file));
const jsMissingStates = ['idle', 'loading', 'empty', 'error', 'ready'].filter((term) => !jsText.includes(term));
const jsHasInlineStyle = /\.style\.|setAttribute\(['"]style['"]/i.test(jsText);
const jsHasImportant = /!important/i.test(jsText);

const checks = {
  contractDocExists: exists(CONTRACT_DOC),
  contractJsExists: exists(CONTRACT_JS),
  coreStateFilesExist: missingCoreFiles.length === 0,
  contractDocHasRequiredTerms: missingTerms.length === 0,
  contractJsHasRequiredStates: jsMissingStates.length === 0,
  noInlineStyleMutation: !jsHasInlineStyle,
  noImportantUsage: !jsHasImportant
};

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  cycle: 127,
  title: 'State container contract audit',
  generatedAt: new Date().toISOString(),
  contractFiles: { document: CONTRACT_DOC, runtimeContract: CONTRACT_JS, coreFiles: CORE_FILES },
  requiredTerms: REQUIRED_TERMS,
  missingTerms,
  missingCoreFiles,
  jsMissingStates,
  checks,
  status: failed.length === 0 ? 'passed' : 'failed',
  failed
};

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (failed.length) {
  console.error(`[cycle 127] failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('[cycle 127] state container contracts passed');
