#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  REQUIRED_SQL_TESTS,
  RELEASE_GATES,
  STATIC_GATE_COMMANDS,
  SQL_PREFLIGHT_TESTS,
  SQL_POSTCONDITION_TESTS,
  buildExecutionPlan,
  listRequiredFiles
} = require('../backend/shared/testing/supabase-execution-gate');

const root = process.cwd();

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  dbUrl: 'DOKE_SUPABASE_DB_URL',
  fallbackDbUrl: 'SUPABASE_DB_URL',
  stagingApiUrl: 'DOKE_STAGING_API_URL',
  generalMutationConsent: 'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
  sqlMutationConsent: 'DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS',
  e2eMutationConsent: 'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  validationMarker: 'DOKE_STAGING_VALIDATION_MARKER',
  reportPath: 'DOKE_SUPABASE_VALIDATION_REPORT'
});

const MODES = Object.freeze([
  'dry-run',
  'check-env',
  'print-plan',
  'run-sql-tests',
  'run-e2e',
  'full'
]);

const DEFAULT_REPORT_PATH = path.join('reports', 'generated', 'staging-validation-report.json');

// Required SQL visibility for static audits:
// supabase/tests/001_rls_matrix_validation.sql
// supabase/tests/002_idempotency_and_audit_validation.sql
// supabase/tests/003_policy_negative_cases.sql
// supabase/tests/004_runtime_e2e_postconditions.sql
// supabase/tests/005_runtime_idempotency_audit_replay_validation.sql

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = createReport(options);

  assertRequiredFiles(report);

  if (options.mode === 'dry-run' || options.mode === 'print-plan') {
    printPlan(report, options);
    maybeWriteReport(report, options);
    finish(report, options.mode);
    return;
  }

  validateExecutionEnvironment(report, options);

  if (options.mode === 'check-env') {
    printEnvironmentCheck(report);
    maybeWriteReport(report, options);
    finish(report, options.mode);
    return;
  }

  if (report.failures.length) finish(report, options.mode);

  runMode(report, options);
  maybeWriteReport(report, Object.assign({}, options, { writeReport: true }));
  finish(report, options.mode);
}

function parseArgs(args) {
  const parsed = {
    mode: 'dry-run',
    localReset: false,
    writeReport: false
  };

  args.forEach((arg) => {
    if (arg === '--dry-run') parsed.mode = 'dry-run';
    else if (arg === '--check-env') parsed.mode = 'check-env';
    else if (arg === '--print-plan') parsed.mode = 'print-plan';
    else if (arg === '--run-sql-tests') parsed.mode = 'run-sql-tests';
    else if (arg === '--run-e2e') parsed.mode = 'run-e2e';
    else if (arg === '--full') parsed.mode = 'full';
    else if (arg.startsWith('--mode=')) parsed.mode = arg.slice('--mode='.length);
    else if (arg === '--local-reset') parsed.localReset = true;
    else if (arg === '--write-report') parsed.writeReport = true;
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  });

  if (!MODES.includes(parsed.mode)) {
    throw new Error(`Invalid mode: ${parsed.mode}. Expected one of: ${MODES.join(', ')}`);
  }

  return parsed;
}

function createReport(options) {
  const plan = buildExecutionPlan({ includeLocalReset: options.localReset });
  return {
    name: 'supabase-staging-validation',
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    localReset: options.localReset,
    environment: describeEnvironment(),
    releaseGates: RELEASE_GATES.map(copy),
    requiredFiles: listRequiredFiles().slice(),
    requiredSqlTests: REQUIRED_SQL_TESTS.slice(),
    commands: plan.map((entry) => ({
      name: entry.name,
      group: entry.group,
      command: formatCommand(entry.bin, entry.args),
      status: commandAppliesToMode(entry, options.mode) ? 'planned' : 'skipped',
      file: entry.file || null
    })),
    failures: [],
    warnings: []
  };
}

function describeEnvironment() {
  const dbSource = process.env[ENV.dbUrl] ? ENV.dbUrl : process.env[ENV.fallbackDbUrl] ? ENV.fallbackDbUrl : null;
  return {
    requiredNames: Object.values(ENV),
    dokeEnvironment: process.env[ENV.environment] || '',
    dbUrlSource: dbSource,
    hasDbUrl: Boolean(resolveDbUrl()),
    hasStagingApiUrl: Boolean(process.env[ENV.stagingApiUrl]),
    hasGeneralMutationConsent: process.env[ENV.generalMutationConsent] === '1',
    hasSqlMutationConsent: process.env[ENV.sqlMutationConsent] === '1',
    hasE2eMutationConsent: process.env[ENV.e2eMutationConsent] === '1',
    validationMarker: process.env[ENV.validationMarker] || ''
  };
}

function assertRequiredFiles(report) {
  report.requiredFiles.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) {
      report.failures.push(`Missing required validation asset: ${file}`);
    }
  });
}

function validateExecutionEnvironment(report, options) {
  const environment = process.env[ENV.environment];
  const dbUrl = resolveDbUrl();
  const apiUrl = process.env[ENV.stagingApiUrl];

  if (!['local', 'staging'].includes(environment)) {
    report.failures.push(`${ENV.environment} must be exactly "local" or "staging" for any real validation mode.`);
  }

  if (options.localReset && environment !== 'local') {
    report.failures.push('--local-reset is allowed only with DOKE_ENVIRONMENT=local.');
  }

  if (requiresSql(options.mode)) {
    if (!dbUrl) report.failures.push(`Missing ${ENV.dbUrl} or ${ENV.fallbackDbUrl}.`);
    if (process.env[ENV.generalMutationConsent] !== '1') {
      report.failures.push(`${ENV.generalMutationConsent}=1 is required before SQL validation can mutate local/staging data.`);
    }
    if (process.env[ENV.sqlMutationConsent] !== '1') {
      report.failures.push(`${ENV.sqlMutationConsent}=1 is required before SQL tests 001-005 can run.`);
    }
    assertSafeTarget(report, 'database', dbUrl, environment);
  }

  if (requiresE2e(options.mode)) {
    if (!apiUrl) report.failures.push(`Missing ${ENV.stagingApiUrl}.`);
    if (process.env[ENV.e2eMutationConsent] !== '1') {
      report.failures.push(`${ENV.e2eMutationConsent}=1 is required before staging E2E can mutate runtime data.`);
    }
    assertSafeTarget(report, 'API', apiUrl, environment);
  }
}

function assertSafeTarget(report, label, rawValue, environment) {
  if (!rawValue) return;
  const target = describeTarget(rawValue);
  const marker = String(process.env[ENV.validationMarker] || '').toLowerCase();
  const haystack = `${target.protocol} ${target.host} ${target.pathname}`.toLowerCase();

  if (/\b(prod|production|live)\b/.test(haystack) || haystack.includes('prod-') || haystack.includes('-prod')) {
    report.failures.push(`${label} target looks production-like and was blocked: ${redact(rawValue)}.`);
  }

  const hasLocalMarker = /(^|[.\-:/])(?:localhost|127\.0\.0\.1|0\.0\.0\.0|local)([.\-:/]|$)/.test(haystack);
  const hasStagingMarker = /(^|[.\-:/])(?:staging|stage|stg|preview)([.\-:/]|$)/.test(haystack);
  const hasExplicitMarker = marker === environment || marker === 'local' || marker === 'staging';

  if (environment === 'local' && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`${label} target is missing a local marker. Use localhost/127.0.0.1/local or set ${ENV.validationMarker}=local.`);
  }

  if (environment === 'staging' && !hasStagingMarker && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`${label} target is missing a staging/local marker. Use a staging URL or set ${ENV.validationMarker}=staging.`);
  }
}

function runMode(report, options) {
  if (options.mode === 'run-sql-tests') {
    runSqlTests(report);
    return;
  }
  if (options.mode === 'run-e2e') {
    runE2e(report);
    return;
  }
  if (options.mode === 'full') {
    runFull(report, options);
  }
}

function runFull(report, options) {
  const commands = [];
  if (options.localReset) {
    commands.push({ name: 'supabase.start', bin: 'supabase', args: ['start'] });
    commands.push({ name: 'supabase.db.reset', bin: 'supabase', args: ['db', 'reset'] });
  }

  STATIC_GATE_COMMANDS.forEach((entry) => commands.push(entry));
  SQL_PREFLIGHT_TESTS.forEach((file, index) => commands.push(sqlCommand(`sql.preflight.${index + 1}`, file)));
  commands.push({ name: 'validate:staging-e2e', bin: 'npm', args: ['run', 'validate:staging-e2e'] });
  SQL_POSTCONDITION_TESTS.forEach((file, index) => commands.push(sqlCommand(`sql.postcondition.${index + 1}`, file)));

  runCommands(report, commands);
}

function runSqlTests(report) {
  runCommands(report, REQUIRED_SQL_TESTS.map((file, index) => sqlCommand(`sql.${index + 1}`, file)));
}

function runE2e(report) {
  runCommands(report, [
    { name: 'audit:staging-e2e-validation', bin: 'npm', args: ['run', 'audit:staging-e2e-validation'] },
    { name: 'validate:staging-e2e', bin: 'npm', args: ['run', 'validate:staging-e2e'] }
  ]);
}

function runCommands(report, commands) {
  for (const entry of commands) {
    const commandReport = findOrCreateCommandReport(report, entry);
    commandReport.status = 'running';
    const result = spawnSync(entry.bin, entry.args, {
      cwd: root,
      env: buildChildEnv(),
      encoding: 'utf8',
      shell: process.platform === 'win32'
    });

    commandReport.exitCode = result.status;
    commandReport.stdout = trimOutput(result.stdout);
    commandReport.stderr = trimOutput(result.stderr);
    commandReport.status = result.status === 0 ? 'passed' : 'failed';

    if (result.status !== 0) {
      report.failures.push(`${entry.name} failed with exit code ${result.status}.`);
      return;
    }
  }
}

function sqlCommand(name, file) {
  return {
    name,
    bin: 'psql',
    args: [resolveDbUrl(), '-v', 'ON_ERROR_STOP=1', '-f', file],
    group: 'sql_validation',
    file
  };
}

function buildChildEnv() {
  const env = Object.assign({}, process.env);
  if (!env.SUPABASE_DB_URL && env[ENV.dbUrl]) env.SUPABASE_DB_URL = env[ENV.dbUrl];
  return env;
}

function findOrCreateCommandReport(report, entry) {
  const name = entry.name;
  let found = report.commands.find((item) => item.name === name || item.file === entry.file);
  if (!found) {
    found = {
      name,
      group: entry.group || 'runtime',
      command: formatCommand(entry.bin, entry.args),
      status: 'planned',
      file: entry.file || null
    };
    report.commands.push(found);
  }
  return found;
}

function commandAppliesToMode(entry, mode) {
  if (mode === 'full' || mode === 'dry-run' || mode === 'print-plan' || mode === 'check-env') return true;
  if (mode === 'run-e2e') return entry.name === 'validate:staging-e2e' || entry.name === 'audit:staging-e2e-validation';
  if (mode === 'run-sql-tests') return Boolean(entry.file);
  return false;
}

function requiresSql(mode) {
  return mode === 'check-env' || mode === 'run-sql-tests' || mode === 'full';
}

function requiresE2e(mode) {
  return mode === 'check-env' || mode === 'run-e2e' || mode === 'full';
}

function resolveDbUrl() {
  return process.env[ENV.dbUrl] || process.env[ENV.fallbackDbUrl] || '';
}

function describeTarget(value) {
  try {
    const url = new URL(value);
    return { protocol: url.protocol, host: url.host, pathname: url.pathname };
  } catch (error) {
    return { protocol: '', host: value, pathname: '' };
  }
}

function redact(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch (error) {
    return String(value || '').replace(/:[^:@/]+@/g, ':***@');
  }
}

function printPlan(report, options) {
  console.log(`validate:supabase-staging ${options.mode}`);
  console.log('Modes: dry-run, check-env, print-plan, run-sql-tests, run-e2e, full');
  console.log('Required files:');
  report.requiredFiles.forEach((file) => console.log(`- ${file}`));
  console.log('SQL tests 001-005:');
  report.requiredSqlTests.forEach((file) => console.log(`- ${file}`));
  console.log('Release gates:');
  report.releaseGates.forEach((entry) => console.log(`- ${entry.name}: ${entry.description}`));
  console.log('Execution plan:');
  report.commands.forEach((entry) => console.log(`- [${entry.status}] ${entry.command}`));
  console.log('Frontend remains on mock providers until all gates pass.');
}

function printEnvironmentCheck(report) {
  if (report.failures.length) {
    console.error('Environment check failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    return;
  }
  console.log('Environment check passed for local/staging validation.');
  console.log(`- ${ENV.environment}: ${process.env[ENV.environment]}`);
  console.log(`- database URL source: ${report.environment.dbUrlSource}`);
  console.log(`- ${ENV.stagingApiUrl}: ${redact(process.env[ENV.stagingApiUrl] || '')}`);
}

function maybeWriteReport(report, options) {
  if (!options.writeReport) return;
  const target = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${path.relative(root, target)}`);
}

function finish(report, mode) {
  if (report.failures.length) {
    console.error(`validate:supabase-staging ${mode} failed:`);
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`validate:supabase-staging ${mode} passed`);
}

function printUsage() {
  console.log(`Usage: node scripts/run-supabase-staging-validation.js [mode] [options]\n\nModes:\n  --dry-run        Print required files, SQL tests, gates and plan without env checks.\n  --check-env      Validate local/staging env and safety markers without running commands.\n  --print-plan     Print the full plan without env checks.\n  --run-sql-tests  Run SQL tests 001-005 with explicit mutation consent.\n  --run-e2e        Run staging E2E audit and real mutating smoke.\n  --full           Run the complete gate.\n\nOptions:\n  --local-reset    Include supabase start/db reset; only valid with DOKE_ENVIRONMENT=local.\n  --write-report   Write reports/generated/staging-validation-report.json or DOKE_SUPABASE_VALIDATION_REPORT.`);
}

function formatCommand(bin, args) {
  return [bin].concat(args || []).map((part) => {
    const value = String(part || '');
    if (value === resolveDbUrl() && value) return '$SUPABASE_DB_URL';
    return /\s/.test(value) ? JSON.stringify(value) : value;
  }).join(' ');
}

function trimOutput(value) {
  const text = String(value || '');
  return text.length > 6000 ? `${text.slice(0, 6000)}\n…[truncated]` : text;
}

function copy(value) {
  return Object.assign({}, value);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
