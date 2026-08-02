#!/usr/bin/env node
'use strict';

const fs = require('fs');

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected 1 occurrence, found ${count}`);
  return source.replace(before, after);
}

const testPath = 'scripts/test-sched-001-c01d-authenticated-browser-bootstrap-runtime.js';
let test = fs.readFileSync(testPath, 'utf8');
test = replaceOnce(
  test,
  "  \"checkpoint('orders_navigation_goto_commit')\",",
  "  \"checkpoint('orders_navigation_goto_commit')\",\n  \"checkpoint('orders_navigation_reused_login_target')\",\n  \"checkpoint('orders_domcontentloaded_before_navigation_check')\",\n  'await installOrdersBootstrapRoutes(page)',\n  \"waitUntil: 'domcontentloaded'\",\n  'encodeURIComponent(ordersPath)',\n  'return route.fallback()',\n  'isCanonicalOrdersUrl(page.url(), url)',\n  \"document.readyState !== 'loading'\",",
  'test fragments'
);
test = replaceOnce(
  test,
  "assert(!source.includes('body: localSupabaseSource'));",
  "assert(!source.includes('body: localSupabaseSource'));\nassert(!source.includes(\"next=../pedidos.html%3FdokeTarget%3Dstaging\"));\nassert(!source.includes('if (ALLOWED_AFTER_LOGIN.has(method)) return route.continue()'));\nassert(source.indexOf('await installOrdersBootstrapRoutes(page)') < source.indexOf('await login(page, email, password, persona)'));\nassert.strictEqual((source.match(/page\\.goto\\(url/g) || []).length, 1, 'Only the guarded fallback orders navigation may remain.');",
  'test assertions'
);
fs.writeFileSync(testPath, test);

const configPath = 'config/sched-001-c01d-authenticated-browser-canary-readiness.json';
const evidencePath = 'docs/validation/SCHED-001-C01D-AUTHENTICATED-BROWSER-CANARY-READINESS.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
Object.assign(config.canonicalRuntime, {
  loginTargetsCanonicalOrdersUrl: true,
  duplicateOrdersNavigationForbidden: true,
  bootstrapRoutesInstalledBeforeLoginRedirect: true,
  allowedReadRoutesUseFallback: true
});
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
fs.writeFileSync(evidencePath, JSON.stringify(config, null, 2) + '\n');

const docsPath = 'docs/SCHED-001-C01D-AUTHENTICATED-BROWSER-CANARY-READINESS.md';
let docs = fs.readFileSync(docsPath, 'utf8');
if (!docs.includes('## Single-navigation bootstrap correction')) {
  docs += `\n## Single-navigation bootstrap correction\n\nAuthorized run 30761292305 proved that authentication and session materialization succeeded, but the executor immediately started a second navigation to the same orders document. That navigation canceled the first document's 71 deferred scripts and left DOMContentLoaded unavailable.\n\nThe login target now includes the complete staging read-provider query. Supabase and font routes are installed before the redirect, allowed read requests use Playwright route fallback so the pinned Supabase fulfillment remains reachable, and navigateOrders reuses the already loaded canonical document. A guarded fallback navigation remains only for unexpected target drift.\n\nThis correction is repository-only. Any remote validation still requires a fresh independent C01E and C01D authorization pair.\n`;
}
fs.writeFileSync(docsPath, docs);

const auditPath = 'scripts/audit-sched-001-c01d-authenticated-browser-canary-readiness.js';
let audit = fs.readFileSync(auditPath, 'utf8');
audit = replaceOnce(
  audit,
  "console.log('SCHED-C01D authenticated browser read-only canary readiness audit passed.');",
  "assert.strictEqual(config.canonicalRuntime.loginTargetsCanonicalOrdersUrl, true);\nassert.strictEqual(config.canonicalRuntime.duplicateOrdersNavigationForbidden, true);\nassert.strictEqual(config.canonicalRuntime.bootstrapRoutesInstalledBeforeLoginRedirect, true);\nassert.strictEqual(config.canonicalRuntime.allowedReadRoutesUseFallback, true);\nassert(executor.includes('await installOrdersBootstrapRoutes(page)'));\nassert(executor.includes(\"waitUntil: 'domcontentloaded'\"));\nassert(executor.includes('encodeURIComponent(ordersPath)'));\nassert(executor.includes('return route.fallback()'));\nassert(executor.includes(\"checkpoint('orders_navigation_reused_login_target')\"));\nassert(!executor.includes(\"next=../pedidos.html%3FdokeTarget%3Dstaging\"));\nassert(!executor.includes('if (ALLOWED_AFTER_LOGIN.has(method)) return route.continue()'));\n\nconsole.log('SCHED-C01D authenticated browser read-only canary readiness audit passed.');",
  'audit assertions'
);
fs.writeFileSync(auditPath, audit);

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
if (!sched) throw new Error('SCHED-001 missing from matrix');
const evidence = 'Authorized run 30761292305 failed closed after authentication because a second orders navigation canceled 71 deferred scripts before DOMContentLoaded; cleanup independently verified zero residue across all 13 fixture groups. The repository-only correction now targets the canonical orders URL during login and reuses that document instead of navigating twice.';
if (!sched.evidence.includes(evidence)) sched.evidence.push(evidence);
const action = 'Validate the C01D single-navigation bootstrap package repository-only; any new C01E plus C01D staging canary still requires a fresh exact authorization pair for one immutable head.';
if (!sched.nextActions.includes(action)) sched.nextActions.unshift(action);
const parts = String(matrix.version).split('.').map(Number);
if (parts.length !== 3 || parts.some(Number.isNaN)) throw new Error('Invalid matrix version');
parts[2] += 1;
matrix.version = parts.join('.');
matrix.updatedAt = '2026-08-02T15:26:00-03:00';
fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

console.log('C01D single-navigation governance patch applied.');
