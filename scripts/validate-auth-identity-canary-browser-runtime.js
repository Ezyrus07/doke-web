#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const DEFAULT_REPORT_PATH = 'reports/generated/auth-identity-canary-browser-runtime-report.json';

const REQUIRED_FILES = Object.freeze([
  'assets/js/core/runtime-config.js',
  'assets/js/services/auth-service.js',
  'assets/js/core/session.js',
  'assets/js/contracts/auth-domain-contract.js',
  'assets/js/contracts/identity-profile-contract.js',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md'
]);

const REQUIRED_SNIPPETS = Object.freeze([
  ['assets/js/core/runtime-config.js', ['authProvider', 'dataProvider', 'enableNetworkRequests']],
  ['assets/js/services/auth-service.js', ['/auth/login', '/auth/session']],
  ['assets/js/contracts/auth-domain-contract.js', ['authProvider', 'api']],
  ['assets/js/contracts/identity-profile-contract.js', ['currentProfile']]
]);

const report = {
  name: 'auth-identity-canary-browser-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate that browser auth/identity runtime assets remain present before auth/identity canary promotion. This check does not call external staging.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    enableNetworkRequests: true
  },
  results: [],
  warnings: [],
  failures: []
};

main();

function main() {
  assertRequiredFiles();
  assertRequiredSnippets();
  report.status = report.failures.length ? 'failed' : 'auth_identity_canary_browser_runtime_validated';
  maybeWriteReport();
  printResult();
  if (report.failures.length) process.exit(1);
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required browser runtime asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertRequiredSnippets() {
  REQUIRED_SNIPPETS.forEach(([file, snippets]) => {
    const filePath = path.join(root, file);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    snippets.forEach((snippet) => {
      if (!content.includes(snippet)) report.failures.push(`${file} missing snippet: ${snippet}`);
    });
  });
  if (!report.failures.length) record('browser_runtime.contract_snippets.present', 'passed');
}

function record(name, status, detail = '') {
  report.results.push({ name, status, detail });
}

function maybeWriteReport() {
  if (!writeReport) return;
  const outputPath = path.join(root, process.env.DOKE_AUTH_IDENTITY_CANARY_BROWSER_RUNTIME_REPORT_PATH || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Auth/identity browser runtime report written to ${path.relative(root, outputPath)}`);
}

function printResult() {
  if (report.failures.length) {
    console.error('Auth/identity browser runtime validation failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    return;
  }
  console.log('Auth/identity browser runtime validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}
