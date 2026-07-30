#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const FILES = Object.freeze({
  executor: 'scripts/execute-ord-001-a06-visual-settlement-playwright.js',
  docs: 'docs/ORD-001-A06-PLAYWRIGHT-EXECUTOR.md',
  evidence: 'docs/validation/ORD-001-A06-PLAYWRIGHT-EXECUTOR.json',
  cleanupEvidence: 'docs/validation/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.json',
  cleanupMigration: 'supabase/migrations/20260730004500_ord_a06_cleanup_explicit_role_precedence.sql',
  workflow: '.github/workflows/ord-001-a06-playwright-executor.yml',
  package: 'package.json'
});

const failures = [];
const checks = [];

main();

function main() {
  assertFiles();
  if (failures.length) finish();

  const executor = read(FILES.executor);
  const docs = read(FILES.docs);
  const evidence = JSON.parse(read(FILES.evidence));
  const cleanupEvidence = JSON.parse(read(FILES.cleanupEvidence));
  const cleanupMigration = read(FILES.cleanupMigration);
  const workflow = read(FILES.workflow);
  const pkg = JSON.parse(read(FILES.package));

  assertExecutorContract(executor);
  assertNoDefaults(executor);
  assertBrowserIsolation(executor);
  assertRunScope(executor);
  assertConflictAndQuote(executor);
  assertCleanupAuthority(executor, cleanupEvidence, cleanupMigration);
  assertNoServiceRoleBrowserExposure(executor);
  assertDocsAndEvidence(docs, evidence);
  assertPackageScripts(pkg);
  assertWorkflow(workflow);
  finish();
}

function assertFiles() {
  Object.values(FILES).forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) failures.push(`Missing ORD-A06 Playwright asset: ${file}`);
  });
  if (!failures.length) pass('required_files.present');
}

function assertExecutorContract(source) {
  requireAll('executor.fail_closed_flags', source, [
    "authorizationAck: 'DOKE_ORD_A06_AUTHORIZATION_ACK'",
    "allowNetwork: 'DOKE_ORD_A06_ALLOW_NETWORK'",
    "allowMutations: 'DOKE_ORD_A06_ALLOW_MUTATIONS'",
    "allowExecute: 'DOKE_ORD_A06_EXECUTE'",
    "AUTHORIZATION_ACK = 'I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS'",
    "requireExact(environment, 'staging'",
    'requireFlag(ENV.allowNetwork)',
    'requireFlag(ENV.allowMutations)',
    'requireFlag(ENV.allowExecute)',
    "if (!execute || process.env[ENV.allowExecute] !== '1')",
    "if (dryRun)",
    "if (checkEnvOnly)"
  ]);

  requireAll('executor.target_safety', source, [
    'PRODUCTION_HOSTS',
    "doke.com.br",
    'DOKE_ORD_A06_TARGET_MARKER',
    'isSafeTarget',
    "target is production-like or does not contain the explicit staging marker"
  ]);

  requireAll('executor.report_safety', source, [
    'credentialsRecorded: false',
    'serviceRoleExposedToBrowser: false',
    'hasServiceRoleKey',
    'hasClientCredentials',
    'hasProfessionalCredentials'
  ]);
}

function assertNoDefaults(source) {
  const historical = [
    ['cliente', 'doke.local'],
    ['profissional', 'doke.local'],
    ['suporte', 'doke.local'],
    ['admin', 'doke.local']
  ].map(([local, domain]) => `${local}@${domain}`);

  historical.forEach((value) => {
    if (source.includes(value)) failures.push(`Executor contains forbidden historical account literal: ${value}`);
  });

  const forbiddenAssignments = [
    /clientEmail\s*:\s*['"][^'"]+@[^'"]+['"]/,
    /professionalEmail\s*:\s*['"][^'"]+@[^'"]+['"]/,
    /serviceRoleKey\s*:\s*['"](?:ey|sb_|sk_|service_role)[^'"]*['"]/i
  ];
  forbiddenAssignments.forEach((pattern) => {
    if (pattern.test(source)) failures.push(`Executor contains a credential-like default matching ${pattern}.`);
  });
  if (!failures.some((item) => item.includes('historical account') || item.includes('credential-like'))) pass('executor.credential_defaults.absent');
}

function assertBrowserIsolation(source) {
  requireAll('executor.two_isolated_contexts', source, [
    'browser.newContext',
    'const clientContext = await browser.newContext',
    'const professionalContext = await browser.newContext',
    'const clientPage = await clientContext.newPage',
    'const professionalPage = await professionalContext.newPage'
  ]);

  requireAll('executor.ui_login', source, [
    '/auth/login.html?next=../pedidos.html',
    "page.locator('#email-login').fill(email)",
    "page.locator('#senha-login').fill(password)",
    "page.locator('[data-auth-submit]').click()",
    'window.Doke.session.getCurrentUser'
  ]);

  requireAll('executor.provider_split_preserved', source, [
    'configureOrdersWriteCanary',
    "status.ordersReadProvider !== 'supabase-read'",
    'rollbackOrdersWriteCanary'
  ]);
}

function assertRunScope(source) {
  requireAll('executor.run_id_scope', source, [
    'RUN_ID_PATTERN',
    '^ord-a06-',
    'canaryDomain',
    "canarySublot: 'ORD-A06'",
    "canaryScope: 'visual-settlement'",
    'canaryRunId',
    'externalId: `${browserRunId}:order`',
    'idempotencyKey: `${browserRunId}:create`',
    '`${browserRunId}:accept-a`',
    '`${browserRunId}:accept-b`',
    'idempotencyKey: `${browserRunId}:quote`'
  ]);
}

function assertConflictAndQuote(source) {
  requireAll('executor.optimistic_conflict', source, [
    'Promise.allSettled(tasks)',
    "fulfilled.length !== 1",
    "rejected.length !== 1",
    'optimisticConflict',
    "entry.httpStatus === 409",
    "entry.code === 'DOKE_ORDER_CONFLICT'"
  ]);

  requireAll('executor.quote_brl_123_45', source, [
    "amount: '123,45'",
    'amountCents: 12345',
    "currency: 'BRL'",
    "record('professional.quote', 'passed', 'R$ 123,45')"
  ]);

  requireAll('executor.visual_evidence', source, [
    'professional-requested',
    'client-accepted',
    'client-quoted',
    'card.screenshot'
  ]);
}

function assertCleanupAuthority(source, cleanupEvidence, cleanupMigration) {
  requireAll('executor.cleanup_called_outside_browser', source, [
    '/rest/v1/rpc/cleanup_order_canary_run',
    'Authorization: `Bearer ${key}`',
    "report.cleanup.first.status !== 'cleaned'",
    "report.cleanup.second.status !== 'already_clean'",
    'if (!cleanupAttempted',
    'await cleanupRunId'
  ]);

  equal(cleanupEvidence.authority && cleanupEvidence.authority.execute && cleanupEvidence.authority.execute.authenticated, false, 'cleanup.authenticated_denied');
  equal(cleanupEvidence.authority && cleanupEvidence.authority.execute && cleanupEvidence.authority.execute.service_role, true, 'cleanup.service_role_only');
  equal(cleanupEvidence.scope && cleanupEvidence.scope.doubleMarkerRequired, true, 'cleanup.double_marker');
  equal(cleanupEvidence.cleanup && cleanupEvidence.cleanup.idempotentSecondCall, true, 'cleanup.idempotent_second_call');

  requireAll('cleanup.migration_authority', cleanupMigration, [
    'security definer',
    "v_jwt_role <> 'service_role'",
    'DOKE_ORDER_CANARY_CLEANUP_SERVICE_ROLE_REQUIRED',
    'DOKE_ORDER_CANARY_MARKER_MISMATCH',
    "grant execute on function public.cleanup_order_canary_run(text) to service_role"
  ]);
}

function assertNoServiceRoleBrowserExposure(source) {
  const pageEvaluateBlocks = source.match(/\.evaluate\([\s\S]*?\}\s*,\s*\{[\s\S]*?\}\);/g) || [];
  pageEvaluateBlocks.forEach((block, index) => {
    if (/serviceRoleKey|SERVICE_ROLE_KEY|service_role/i.test(block)) {
      failures.push(`Browser evaluate block ${index + 1} references service-role material.`);
    }
  });
  if (!pageEvaluateBlocks.some((block) => /serviceRoleKey|SERVICE_ROLE_KEY|service_role/i.test(block))) pass('executor.service_role_not_exposed_to_browser');
}

function assertDocsAndEvidence(docs, evidence) {
  requireAll('docs.fail_closed_contract', docs, [
    'Executor Playwright fail-closed',
    'I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS',
    'Não existem e-mails, senhas, URLs ou service refs padrão',
    'dois `BrowserContext` independentes',
    'R$ 123,45',
    'public.cleanup_order_canary_run',
    'A execução continua bloqueada'
  ]);

  equal(evidence.status, 'executor_complete_real_execution_blocked', 'evidence.status');
  equal(evidence.executor && evidence.executor.defaultCredentials, false, 'evidence.no_default_credentials');
  equal(evidence.executor && evidence.executor.realExecutionAllowed, false, 'evidence.real_execution_blocked');
  equal(evidence.executor && evidence.executor.serviceRoleExposedToBrowser, false, 'evidence.service_role_not_in_browser');
  equal(evidence.browserContract && evidence.browserContract.contexts, 2, 'evidence.two_contexts');
  equal(evidence.currentExecution && evidence.currentExecution.accountsUsed, 0, 'evidence.no_accounts_used');
  equal(evidence.currentExecution && evidence.currentExecution.networkRequestsPerformed, false, 'evidence.no_network');
  equal(evidence.currentExecution && evidence.currentExecution.mutationsPerformed, false, 'evidence.no_mutations');
}

function assertPackageScripts(pkg) {
  const scripts = pkg.scripts || {};
  const expected = {
    'audit:ord-001-a06-playwright-executor': 'node scripts/audit-ord-001-a06-playwright-executor.js',
    'execute:ord-001-a06-playwright:dry-run': 'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --dry-run',
    'execute:ord-001-a06-playwright:check-env': 'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --check-env',
    'execute:ord-001-a06-playwright': 'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --execute',
    'execute:ord-001-a06-playwright:report': 'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --execute --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => equal(scripts[name], command, `package.${name}`));
}

function assertWorkflow(source) {
  requireAll('workflow.static_only', source, [
    'Doke ORD-A06 Playwright Executor',
    'node scripts/audit-ord-001-a06-playwright-executor.js',
    'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --dry-run',
    'node scripts/audit-ord-001-a06-cleanup-boundary.js',
    'node scripts/audit-ord-001-a06-visual-settlement.js',
    'node scripts/test-order-visual-settlement-runtime.js',
    'node scripts/audit-domain-completion-matrix.js'
  ]);
  forbidden('workflow.no_real_execution', source, [
    '--execute',
    'DOKE_ORD_A06_SERVICE_ROLE_KEY',
    'DOKE_ORD_A06_CLIENT_PASSWORD',
    'DOKE_ORD_A06_PROFESSIONAL_PASSWORD',
    'playwright install'
  ]);
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function requireAll(name, source, snippets) {
  const missing = snippets.filter((snippet) => !source.includes(snippet));
  if (missing.length) failures.push(`${name} missing: ${missing.join(', ')}`);
  else pass(name);
}

function forbidden(name, source, snippets) {
  const found = snippets.filter((snippet) => source.includes(snippet));
  if (found.length) failures.push(`${name} contains forbidden snippets: ${found.join(', ')}`);
  else pass(name);
}

function equal(actual, expected, name) {
  if (actual !== expected) failures.push(`${name}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  else pass(name);
}

function pass(name) {
  checks.push(name);
}

function finish() {
  if (failures.length) {
    console.error('ORD-A06 Playwright executor audit failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('ORD-A06 Playwright executor audit passed.');
  checks.forEach((check) => console.log(`- passed: ${check}`));
}
