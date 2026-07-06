#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnvOnly = args.has('--check-env');
const writeReport = args.has('--write-report');
const requireReady = process.env.DOKE_ORDERS_WRITE_CANARY_REQUIRE_STAGING_PREFLIGHT_READY === '1';

const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-canary-staging-preflight-gate-report.json';
const DEFAULT_AUTH_PROMOTION_REPORT_PATH = 'reports/generated/auth-identity-canary-promotion-gate-report.json';
const DEFAULT_READONLY_PROMOTION_REPORT_PATH = 'reports/generated/orders-readonly-canary-promotion-gate-report.json';
const DEFAULT_WRITE_PLANNING_REPORT_PATH = 'reports/generated/orders-write-canary-planning-gate-report.json';
const DEFAULT_WRITE_LOCAL_RUNTIME_REPORT_PATH = 'reports/generated/orders-write-canary-local-runtime-report.json';

const ENV = Object.freeze({
  reportPath: 'DOKE_ORDERS_WRITE_CANARY_STAGING_PREFLIGHT_REPORT_PATH',
  apiUrl: 'DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL',
  allowNetwork: 'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK',
  allowMutations: 'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS',
  environment: 'DOKE_ENVIRONMENT',
  targetMarker: 'DOKE_ORDERS_WRITE_CANARY_TARGET_MARKER',
  requireReady: 'DOKE_ORDERS_WRITE_CANARY_REQUIRE_STAGING_PREFLIGHT_READY',
  authPromotionReportPath: 'DOKE_ORDERS_WRITE_CANARY_AUTH_PROMOTION_REPORT_PATH',
  readonlyPromotionReportPath: 'DOKE_ORDERS_WRITE_CANARY_READONLY_PROMOTION_REPORT_PATH',
  writePlanningReportPath: 'DOKE_ORDERS_WRITE_CANARY_PLANNING_REPORT_PATH',
  writeLocalRuntimeReportPath: 'DOKE_ORDERS_WRITE_CANARY_LOCAL_RUNTIME_REPORT_PATH'
});

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-orders-write-canary-staging-preflight-gate.js',
  'scripts/audit-orders-write-canary-staging-preflight-gate.js',
  'scripts/validate-orders-write-canary-local-runtime.js',
  'scripts/audit-orders-write-canary-local-runtime.js',
  'scripts/validate-orders-write-canary-planning-gate.js',
  'scripts/audit-orders-write-canary-planning-gate.js',
  'scripts/validate-orders-readonly-canary-promotion-gate.js',
  'scripts/audit-orders-readonly-canary-promotion-gate.js',
  'scripts/validate-auth-identity-canary-promotion-gate.js',
  'scripts/audit-auth-identity-canary-promotion-gate.js',
  'scripts/audit-runtime-idempotency-audit.js',
  'scripts/audit-data-provider-flag-contract.js',
  'docs/ORDERS-WRITE-STAGING-PREFLIGHT-RUNBOOK.md',
  'docs/ORDERS-WRITE-CANARY-RUNBOOK.md',
  'docs/ORDERS-READONLY-CANARY-RUNBOOK.md',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md',
  'docs/VALIDATION.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/DATA-READY-CONTRACTS.md',
  'backend/README.md',
  'package.json'
]);

const PREFLIGHT_COMMANDS = Object.freeze([
  { name: 'audit:orders-write-canary-local-runtime', command: 'npm run audit:orders-write-canary-local-runtime', scriptPath: 'scripts/audit-orders-write-canary-local-runtime.js' },
  { name: 'validate:orders-write-canary:local-runtime', command: 'npm run validate:orders-write-canary:local-runtime', scriptPath: 'scripts/validate-orders-write-canary-local-runtime.js' },
  { name: 'audit:orders-write-canary-planning-gate', command: 'npm run audit:orders-write-canary-planning-gate', scriptPath: 'scripts/audit-orders-write-canary-planning-gate.js' },
  { name: 'validate:orders-write-canary:planning-gate:dry-run', command: 'npm run validate:orders-write-canary:planning-gate:dry-run', scriptPath: 'scripts/validate-orders-write-canary-planning-gate.js', args: ['--dry-run'] },
  { name: 'audit:orders-readonly-canary-promotion-gate', command: 'npm run audit:orders-readonly-canary-promotion-gate', scriptPath: 'scripts/audit-orders-readonly-canary-promotion-gate.js' },
  { name: 'validate:orders-readonly-canary:promotion-gate:dry-run', command: 'npm run validate:orders-readonly-canary:promotion-gate:dry-run', scriptPath: 'scripts/validate-orders-readonly-canary-promotion-gate.js', args: ['--dry-run'] },
  { name: 'audit:auth-identity-canary-promotion-gate', command: 'npm run audit:auth-identity-canary-promotion-gate', scriptPath: 'scripts/audit-auth-identity-canary-promotion-gate.js' },
  { name: 'validate:auth-identity-canary:promotion-gate:dry-run', command: 'npm run validate:auth-identity-canary:promotion-gate:dry-run', scriptPath: 'scripts/validate-auth-identity-canary-promotion-gate.js', args: ['--dry-run'] },
  { name: 'audit:data-provider-flags', command: 'npm run audit:data-provider-flags', scriptPath: 'scripts/audit-data-provider-flag-contract.js' },
  { name: 'audit:runtime-idempotency-audit', command: 'npm run audit:runtime-idempotency-audit', scriptPath: 'scripts/audit-runtime-idempotency-audit.js' }
]);

const REPORT_SPECS = Object.freeze([
  {
    key: 'authPromotion',
    env: ENV.authPromotionReportPath,
    defaultPath: DEFAULT_AUTH_PROMOTION_REPORT_PATH,
    expectedName: 'auth-identity-canary-promotion-gate',
    expectedStatusKey: 'promotionStatus',
    expectedStatus: 'auth_identity_canary_ready_for_manual_staging_rollout'
  },
  {
    key: 'readonlyPromotion',
    env: ENV.readonlyPromotionReportPath,
    defaultPath: DEFAULT_READONLY_PROMOTION_REPORT_PATH,
    expectedName: 'orders-readonly-canary-promotion-gate',
    expectedStatusKey: 'promotionStatus',
    expectedStatus: 'orders_readonly_canary_ready_for_manual_write_canary_planning'
  },
  {
    key: 'writePlanning',
    env: ENV.writePlanningReportPath,
    defaultPath: DEFAULT_WRITE_PLANNING_REPORT_PATH,
    expectedName: 'orders-write-canary-planning-gate',
    expectedStatusKey: 'planningStatus',
    expectedStatus: 'orders_write_canary_ready_for_manual_contract_design'
  },
  {
    key: 'writeLocalRuntime',
    env: ENV.writeLocalRuntimeReportPath,
    defaultPath: DEFAULT_WRITE_LOCAL_RUNTIME_REPORT_PATH,
    expectedName: 'orders-write-canary-local-runtime',
    expectedStatusKey: 'status',
    expectedStatus: 'orders_write_canary_local_runtime_validated'
  }
]);

const BLOCKED_STATUS = 'blocked_until_orders_write_staging_preflight_prerequisites';
const READY_STATUS = 'orders_write_canary_ready_for_manual_staging_execution';
const UNSAFE_STATUS = 'blocked_unsafe_orders_write_staging_target';
const DRY_STATUS = 'dry_run_plan_only';
const CHECK_ENV_STATUS = 'check_env_only';

const MUTATION_ENDPOINTS = Object.freeze([
  'POST /orders',
  'POST /orders/:id/accept',
  'POST /orders/:id/decline',
  'POST /orders/:id/quote',
  'POST /orders/:id/charge',
  'POST /orders/:id/start',
  'POST /orders/:id/complete',
  'POST /orders/:id/status'
]);

const REQUIRED_STAGING_SAFEGUARDS = Object.freeze([
  'DOKE_ENVIRONMENT=local_or_staging',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL_required',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1',
  'safe_local_or_staging_target_marker_required',
  'auth_identity_real_promotion_report_required',
  'orders_readonly_real_promotion_report_required',
  'orders_write_planning_report_required',
  'orders_write_local_runtime_report_required',
  'idempotency_key_required_for_every_mutation',
  'rollback_to_dataProvider_mock_before_and_after_staging_run',
  'manual_execution_only_no_frontend_default_activation'
]);

const report = {
  name: 'orders-write-canary-staging-preflight-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  checkEnvOnly,
  requireReady,
  objective: 'Prepare a non-mutating preflight gate before any real orders write canary execution in local/staging.',
  writeActivation: false,
  performsNetworkRequest: false,
  performsMutation: false,
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-write-canary-staging-preflight',
    enableNetworkRequests: true
  },
  mutationEndpointsPreparedForManualStaging: MUTATION_ENDPOINTS.slice(),
  requiredSafeguards: REQUIRED_STAGING_SAFEGUARDS.slice(),
  requiredFiles: REQUIRED_FILES.slice(),
  preflightCommands: PREFLIGHT_COMMANDS.map(({ name, command }) => ({ name, command })),
  reportPaths: Object.fromEntries(REPORT_SPECS.map((spec) => [spec.key, process.env[spec.env] || spec.defaultPath])),
  environment: {
    DOKE_ENVIRONMENT: process.env[ENV.environment] || '',
    hasApiUrl: Boolean(process.env[ENV.apiUrl]),
    allowNetwork: process.env[ENV.allowNetwork] === '1',
    allowMutations: process.env[ENV.allowMutations] === '1',
    targetMarker: process.env[ENV.targetMarker] || ''
  },
  preflightStatus: 'not_evaluated',
  nextAllowedStep: null,
  results: [],
  warnings: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  maybeWriteReport();
  printReport();
  process.exit(1);
});

async function main() {
  assertRequiredFiles();
  assertPackageScripts();
  assertPreflightContract();

  if (dryRun) {
    report.preflightStatus = DRY_STATUS;
    report.nextAllowedStep = 'Generate real upstream reports, set explicit local/staging env vars, then rerun the preflight gate without --dry-run.';
    record('staging_preflight.plan_printed', 'passed', 'No network request and no mutation were executed.');
    maybeWriteReport();
    printPlan();
    failIfNeeded();
    return;
  }

  if (!checkEnvOnly) {
    for (const entry of PREFLIGHT_COMMANDS) {
      await runCommand(entry);
      if (report.failures.length) break;
    }
  } else {
    record('preflight_commands.skipped', 'passed', '--check-env does not run upstream commands.');
  }

  if (!report.failures.length) {
    evaluateEnvironment();
    evaluateReports();
    finalizeStatus();
  }

  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required orders write staging preflight asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  } catch (error) {
    report.failures.push(`package.json is invalid JSON: ${error.message}`);
    return;
  }

  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-staging-preflight-gate': 'node scripts/audit-orders-write-canary-staging-preflight-gate.js',
    'validate:orders-write-canary:staging-preflight-gate:dry-run': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --dry-run',
    'validate:orders-write-canary:staging-preflight-gate:check-env': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --check-env',
    'validate:orders-write-canary:staging-preflight-gate': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js',
    'validate:orders-write-canary:staging-preflight-gate:report': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --write-report'
  };

  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });

  PREFLIGHT_COMMANDS.forEach((entry) => {
    if (!scripts[entry.name]) report.failures.push(`package.json missing required upstream script: ${entry.name}`);
  });

  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function assertPreflightContract() {
  if (report.writeActivation !== false) report.failures.push('Staging preflight must keep writeActivation=false.');
  if (report.performsNetworkRequest !== false) report.failures.push('Staging preflight must not perform network requests.');
  if (report.performsMutation !== false) report.failures.push('Staging preflight must not execute mutations.');
  if (report.expectedFrontendProviders.dataProvider !== 'mock') report.failures.push('Staging preflight must preserve dataProvider=mock.');
  if (report.expectedFrontendProviders.ordersProvider !== 'api-write-canary-staging-preflight') report.failures.push('Staging preflight must remain a preflight marker.');
  if (!MUTATION_ENDPOINTS.every((endpoint) => /^POST \/orders/.test(endpoint))) report.failures.push('Every prepared mutation endpoint must remain scoped to /orders.');
  if (!REQUIRED_STAGING_SAFEGUARDS.includes('idempotency_key_required_for_every_mutation')) report.failures.push('Staging preflight must require idempotency for every mutation.');
  if (!report.failures.length) record('preflight_contract.safe', 'passed', 'Non-mutating preflight; orders-only; manual staging execution only.');
}

async function runCommand(entry) {
  const result = await spawnNodeScript(entry.scriptPath, entry.args || []);
  record(entry.name, result.status === 0 ? 'passed' : 'failed', `exit=${result.status}`);
  if (result.status !== 0) {
    report.failures.push(`${entry.command} failed with exit ${result.status}.`);
    if (result.stderrTail.length) report.failures.push(`${entry.name} stderr: ${result.stderrTail.join(' | ')}`);
  }
}

function spawnNodeScript(scriptPath, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const value = chunk.toString();
      stdout += value;
      process.stdout.write(value);
    });
    child.stderr.on('data', (chunk) => {
      const value = chunk.toString();
      stderr += value;
      process.stderr.write(value);
    });
    child.on('error', (error) => {
      stderr += `${error.message}\n`;
      resolve({ status: 1, signal: null, stdoutTail: tail(stdout), stderrTail: tail(stderr) });
    });
    child.on('close', (status, signal) => {
      resolve({ status, signal, stdoutTail: tail(stdout), stderrTail: tail(stderr) });
    });
  });
}

function evaluateEnvironment() {
  const environment = process.env[ENV.environment] || '';
  const apiUrl = process.env[ENV.apiUrl] || '';
  const targetMarker = process.env[ENV.targetMarker] || '';
  const allowNetwork = process.env[ENV.allowNetwork] === '1';
  const allowMutations = process.env[ENV.allowMutations] === '1';

  if (!['local', 'staging'].includes(environment)) {
    addPreflightBlock(`${ENV.environment} must be local or staging. Current value: ${environment || '<missing>'}`, 'env.environment');
  } else {
    record('env.environment', 'passed', environment);
  }

  if (!apiUrl) {
    addPreflightBlock(`${ENV.apiUrl} is required before manual staging write execution.`, 'env.api_url');
  } else {
    const safety = evaluateTargetSafety(apiUrl, targetMarker);
    if (!safety.safe) {
      report.preflightStatus = UNSAFE_STATUS;
      addPreflightBlock(safety.reason, 'env.api_url');
    } else {
      record('env.api_url.safe', 'passed', safety.detail);
    }
  }

  if (!allowNetwork) addPreflightBlock(`${ENV.allowNetwork}=1 is required for a real manual staging run.`, 'env.allow_network');
  else record('env.allow_network', 'passed');

  if (!allowMutations) addPreflightBlock(`${ENV.allowMutations}=1 is required for a real manual staging write run.`, 'env.allow_mutations');
  else record('env.allow_mutations', 'passed');
}

function evaluateTargetSafety(apiUrl, targetMarker) {
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch (error) {
    return { safe: false, reason: `${ENV.apiUrl} must be a valid URL: ${error.message}` };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return { safe: false, reason: `${ENV.apiUrl} must use http or https.` };
  const target = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  const marker = targetMarker.toLowerCase().trim();
  if (marker && /(prod|production)/.test(marker)) return { safe: false, reason: `${ENV.targetMarker} cannot be prod/production.` };
  if (/(^|[.-])(prod|production)([.-]|$)/.test(parsed.hostname.toLowerCase())) return { safe: false, reason: `${ENV.apiUrl} appears to target production: ${redactUrl(apiUrl)}` };

  const builtInSafeMarkers = ['localhost', '127.0.0.1', '0.0.0.0', 'local', 'staging', 'stage', 'stg', 'preview', 'sandbox', 'dev', 'test'];
  const hasBuiltInMarker = builtInSafeMarkers.some((safeMarker) => target.includes(safeMarker));
  const hasExplicitMarker = marker ? target.includes(marker) : false;
  if (!hasBuiltInMarker && !hasExplicitMarker) {
    return { safe: false, reason: `${ENV.apiUrl} must include a local/staging marker or ${ENV.targetMarker}. Target: ${redactUrl(apiUrl)}` };
  }

  return { safe: true, detail: redactUrl(apiUrl) };
}

function evaluateReports() {
  REPORT_SPECS.forEach((spec) => {
    const reportPath = path.join(root, process.env[spec.env] || spec.defaultPath);
    if (!fs.existsSync(reportPath)) {
      addPreflightBlock(`Missing required upstream real report: ${path.relative(root, reportPath)}`, `report.${spec.key}`);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    } catch (error) {
      addPreflightBlock(`Invalid JSON report ${path.relative(root, reportPath)}: ${error.message}`, `report.${spec.key}`);
      return;
    }

    const failures = validateReport(spec, parsed);
    if (failures.length) {
      failures.forEach((failure) => addPreflightBlock(`${path.relative(root, reportPath)}: ${failure}`, `report.${spec.key}`));
      return;
    }

    record(`report.${spec.key}.valid`, 'passed', path.relative(root, reportPath));
  });
}

function validateReport(spec, candidate) {
  const failures = [];
  if (candidate.name !== spec.expectedName) failures.push(`expected name ${spec.expectedName}, got ${candidate.name || '<missing>'}.`);
  if (candidate.dryRun === true) failures.push('report cannot be dryRun=true.');
  if (candidate[spec.expectedStatusKey] !== spec.expectedStatus) failures.push(`expected ${spec.expectedStatusKey}=${spec.expectedStatus}, got ${candidate[spec.expectedStatusKey] || '<missing>'}.`);
  if (Array.isArray(candidate.failures) && candidate.failures.length) failures.push(`report has failures: ${candidate.failures.join(' | ')}`);

  const providers = candidate.expectedFrontendProviders || {};
  if (providers.dataProvider && providers.dataProvider !== 'mock') failures.push('report must preserve dataProvider=mock.');
  if (spec.key === 'writeLocalRuntime') {
    if (candidate.writeActivation !== false) failures.push('write local runtime report must have writeActivation=false.');
    const hits = Array.isArray(candidate.endpointHits) ? candidate.endpointHits : [];
    const hitSignatures = new Set(hits.map((hit) => `${hit.method} ${hit.path}`));
    MUTATION_ENDPOINTS.forEach((endpoint) => {
      if (!hitSignatures.has(endpoint)) failures.push(`local runtime report did not exercise ${endpoint}.`);
    });
    const conflictChecks = Array.isArray(candidate.idempotencyConflictChecks) ? candidate.idempotencyConflictChecks : [];
    if (!conflictChecks.some((entry) => entry.status === 409 && entry.code === 'DOKE_IDEMPOTENCY_CONFLICT')) {
      failures.push('local runtime report must include a validated HTTP 409 DOKE_IDEMPOTENCY_CONFLICT check.');
    }
  }
  return failures;
}

function finalizeStatus() {
  const hasBlocks = report.results.some((entry) => entry.status === 'blocked') || report.warnings.length;
  if (report.preflightStatus === UNSAFE_STATUS) {
    report.nextAllowedStep = 'Do not run orders write canary. Replace the target with an explicit local/staging URL and rerun this preflight.';
    return;
  }
  if (hasBlocks) {
    report.preflightStatus = checkEnvOnly ? CHECK_ENV_STATUS : BLOCKED_STATUS;
    report.nextAllowedStep = 'Keep orders write disabled. Generate all real upstream reports and set explicit local/staging env flags before manual staging execution.';
    return;
  }
  report.preflightStatus = READY_STATUS;
  report.nextAllowedStep = 'Manual staging execution may be prepared by an operator, but this preflight did not run network requests or mutations.';
  record('staging_preflight.ready_for_manual_execution', 'passed');
}

function addPreflightBlock(message, resultName) {
  const status = requireReady ? 'failed' : 'blocked';
  record(resultName || 'preflight.block', status, message);
  if (requireReady) report.failures.push(message);
  else report.warnings.push(message);
}

function maybeWriteReport() {
  if (!writeReport) return;
  const reportPath = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printPlan() {
  console.log(JSON.stringify({
    name: report.name,
    dryRun: report.dryRun,
    preflightStatus: report.preflightStatus,
    performsNetworkRequest: report.performsNetworkRequest,
    performsMutation: report.performsMutation,
    writeActivation: report.writeActivation,
    expectedFrontendProviders: report.expectedFrontendProviders,
    mutationEndpointsPreparedForManualStaging: report.mutationEndpointsPreparedForManualStaging,
    requiredSafeguards: report.requiredSafeguards,
    requiredEnvironment: ENV,
    requiredReports: REPORT_SPECS.map((spec) => ({ key: spec.key, path: process.env[spec.env] || spec.defaultPath, expectedStatus: spec.expectedStatus })),
    preflightCommands: report.preflightCommands,
    nextAllowedStep: report.nextAllowedStep,
    warnings: report.warnings,
    failures: report.failures
  }, null, 2));
}

function printReport() {
  console.log(JSON.stringify({
    name: report.name,
    dryRun: report.dryRun,
    checkEnvOnly: report.checkEnvOnly,
    requireReady: report.requireReady,
    preflightStatus: report.preflightStatus,
    performsNetworkRequest: report.performsNetworkRequest,
    performsMutation: report.performsMutation,
    writeActivation: report.writeActivation,
    expectedFrontendProviders: report.expectedFrontendProviders,
    mutationEndpointsPreparedForManualStaging: report.mutationEndpointsPreparedForManualStaging,
    results: report.results,
    warnings: report.warnings,
    failures: report.failures,
    nextAllowedStep: report.nextAllowedStep
  }, null, 2));
}

function failIfNeeded() {
  if (report.failures.length) process.exit(1);
}

function record(name, status, detail) {
  report.results.push({ name, status, detail: detail || '' });
}

function tail(value) {
  return value.split(/\r?\n/).filter(Boolean).slice(-8);
}

function redactUrl(value) {
  try {
    const parsed = new URL(value);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch (error) {
    return '<invalid-url>';
  }
}
