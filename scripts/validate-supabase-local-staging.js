#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  SUPABASE_EXECUTION_ENVIRONMENT,
  RELEASE_GATES,
  buildExecutionPlan,
  listRequiredFiles
} = require('../backend/shared/testing/supabase-execution-gate');

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const includeLocalReset = args.has('--local-reset');
const writeReport = args.has('--write-report') || execute;
const root = process.cwd();
const reportPath = process.env[SUPABASE_EXECUTION_ENVIRONMENT.reportPath]
  || path.join('reports', 'generated', 'supabase-local-staging-execution-report.json');
const allowMutations = process.env[SUPABASE_EXECUTION_ENVIRONMENT.allowMutations] === '1' || args.has('--allow-mutations');

// Required env names kept explicit for static audit visibility:
// DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS, DOKE_STAGING_E2E_ALLOW_MUTATIONS, validate:staging-e2e.

function main() {
  const report = createReport();
  assertRequiredFiles(report);

  if (!execute) {
    printDryRun(report);
    if (writeReport) writeExecutionReport(report);
    return;
  }

  requireExecutionEnvironment();
  runPlan(report);
  writeExecutionReport(report);
  assertReportPassed(report);
}

function createReport() {
  return {
    name: 'supabase-local-staging-execution',
    generatedAt: new Date().toISOString(),
    mode: execute ? 'execute' : 'dry-run',
    includeLocalReset,
    environment: Object.assign({}, SUPABASE_EXECUTION_ENVIRONMENT),
    gates: RELEASE_GATES.map((entry) => Object.assign({}, entry)),
    requiredFiles: listRequiredFiles(),
    commands: buildExecutionPlan({ includeLocalReset }).map((entry) => ({
      name: entry.name,
      group: entry.group,
      command: formatCommand(entry),
      status: 'planned'
    })),
    failures: []
  };
}

function assertRequiredFiles(report) {
  report.requiredFiles.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) {
      report.failures.push(`Missing required validation asset: ${file}`);
    }
  });
}

function printDryRun(report) {
  console.log('validate:supabase-local-staging dry run');
  console.log('Required environment:');
  Object.entries(SUPABASE_EXECUTION_ENVIRONMENT).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  console.log('Release gates:');
  RELEASE_GATES.forEach((entry) => console.log(`- ${entry.name}: ${entry.description}`));
  console.log('Required files:');
  report.requiredFiles.forEach((file) => console.log(`- ${file}`));
  console.log('Execution plan:');
  report.commands.forEach((entry) => console.log(`- [${entry.group}] ${entry.command}`));
  console.log('Run with --execute only after local/staging Supabase is prepared and mutation consent is explicit.');
}

function requireExecutionEnvironment() {
  if (!allowMutations) {
    throw usageError(`Set ${SUPABASE_EXECUTION_ENVIRONMENT.allowMutations}=1 or pass --allow-mutations. This command mutates local/staging data.`);
  }
  if (!process.env[SUPABASE_EXECUTION_ENVIRONMENT.dbUrl]) {
    throw usageError(`Missing ${SUPABASE_EXECUTION_ENVIRONMENT.dbUrl}.`);
  }
  if (!process.env[SUPABASE_EXECUTION_ENVIRONMENT.stagingApiUrl]) {
    throw usageError(`Missing ${SUPABASE_EXECUTION_ENVIRONMENT.stagingApiUrl}.`);
  }
  if (process.env[SUPABASE_EXECUTION_ENVIRONMENT.stagingAllowMutations] !== '1') {
    throw usageError(`Set ${SUPABASE_EXECUTION_ENVIRONMENT.stagingAllowMutations}=1 for the runtime E2E mutation pass.`);
  }
}

function runPlan(report) {
  const plan = buildExecutionPlan({ includeLocalReset });
  for (const entry of plan) {
    const commandReport = report.commands.find((item) => item.name === entry.name);
    const result = spawnSync(entry.bin, interpolateArgs(entry.args), {
      cwd: root,
      env: process.env,
      encoding: 'utf8',
      shell: process.platform === 'win32'
    });
    commandReport.status = result.status === 0 ? 'passed' : 'failed';
    commandReport.exitCode = result.status;
    commandReport.stdout = trimOutput(result.stdout);
    commandReport.stderr = trimOutput(result.stderr);
    if (result.status !== 0) {
      report.failures.push(`${entry.name} failed with exit code ${result.status}.`);
      break;
    }
  }
}

function assertReportPassed(report) {
  if (!report.failures.length) {
    console.log('validate:supabase-local-staging passed');
    report.commands.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}`));
    return;
  }
  console.error('validate:supabase-local-staging failed:');
  report.failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

function writeExecutionReport(report) {
  const target = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${reportPath}`);
}

function interpolateArgs(args) {
  return args.map((value) => String(value).replace('${SUPABASE_DB_URL}', process.env[SUPABASE_EXECUTION_ENVIRONMENT.dbUrl] || ''));
}

function formatCommand(entry) {
  const parts = [entry.bin].concat(entry.args).map((part) => {
    const value = String(part);
    return /\s/.test(value) ? JSON.stringify(value) : value;
  });
  return parts.join(' ');
}

function trimOutput(value) {
  const text = String(value || '');
  return text.length > 6000 ? `${text.slice(0, 6000)}\n…[truncated]` : text;
}

function usageError(message) {
  const error = new Error(message);
  error.name = 'UsageError';
  return error;
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
