#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  AUTH_IDENTITY_ENDPOINTS,
  createAuthIdentityCanaryLocalServer
} = require('../backend/shared/testing/auth-identity-canary-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const DEFAULT_REPORT_PATH = 'reports/generated/auth-identity-canary-local-runtime-report.json';
const CHILD_REPORT_PATH = 'reports/generated/auth-identity-canary-local-network-report.json';

const report = {
  name: 'auth-identity-canary-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Run the real auth/identity canary validator against a local HTTP canary server before using external staging credentials.',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    enableNetworkRequests: true
  },
  expectedEndpoints: AUTH_IDENTITY_ENDPOINTS.slice(),
  results: [],
  failures: [],
  child: null,
  server: null
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  maybeWriteReport();
  printResult();
  process.exit(1);
});

async function main() {
  assertRequiredFiles();
  const server = createAuthIdentityCanaryLocalServer({ roles: ['client', 'professional'] });
  try {
    const started = await server.start();
    record('local_server.started', `port=${started.port}`);
    const child = await runNetworkCanary(started.baseUrl);
    report.child = summarizeChild(child);
    if (child.status !== 0) {
      report.failures.push(`validate-auth-identity-canary.js exited with status ${child.status}.`);
    }
    report.server = server.getReport();
    assertServerTraffic(report.server);
  } finally {
    await server.stop();
  }

  maybeWriteReport();
  printResult();
  if (report.failures.length) process.exit(1);
}

function assertRequiredFiles() {
  const requiredFiles = [
    'scripts/validate-auth-identity-canary.js',
    'backend/shared/testing/auth-identity-canary-local-server.js',
    'backend/shared/testing/staging-e2e-scenarios.js',
    'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md'
  ];
  requiredFiles.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) {
      report.failures.push(`Missing required local canary asset: ${file}`);
    }
  });
  if (report.failures.length) throw new Error('Required local canary assets are missing.');
  record('required_files.present');
}

function runNetworkCanary(baseUrl) {
  const env = Object.assign({}, process.env, {
    DOKE_ENVIRONMENT: 'local',
    DOKE_AUTH_IDENTITY_CANARY_API_URL: baseUrl,
    DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK: '1',
    DOKE_AUTH_IDENTITY_CANARY_MARKER: 'local',
    DOKE_AUTH_IDENTITY_CANARY_ROLES: 'client,professional',
    DOKE_AUTH_IDENTITY_CANARY_REPORT_PATH: CHILD_REPORT_PATH
  });
  const childArgs = ['scripts/validate-auth-identity-canary.js'];
  if (writeReport) childArgs.push('--write-report');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: root,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
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
      resolve({ status: 1, signal: null, stdout, stderr });
    });
    child.on('close', (status, signal) => {
      record('network_canary.executed', `status=${status}`);
      resolve({ status, signal, stdout, stderr });
    });
  });
}

function assertServerTraffic(serverReport) {
  if (!serverReport) {
    report.failures.push('Local canary server report is missing.');
    return;
  }
  if (serverReport.unexpectedRequests.length) {
    report.failures.push(`Local canary server received unexpected endpoints: ${serverReport.unexpectedRequests.map((entry) => entry.route).join(', ')}.`);
  }

  const hitRoutes = serverReport.requests.map((entry) => entry.route);
  for (const route of AUTH_IDENTITY_ENDPOINTS) {
    if (!hitRoutes.includes(route)) report.failures.push(`Local canary server did not receive required endpoint: ${route}.`);
  }

  const forbiddenDomainHits = hitRoutes.filter((route) => /\/(orders|conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/.test(route));
  if (forbiddenDomainHits.length) {
    report.failures.push(`Auth/identity local canary leaked into domain API endpoints: ${forbiddenDomainHits.join(', ')}.`);
  }
  if (!report.failures.length) record('server_traffic.auth_identity_only');
}

function summarizeChild(child) {
  return {
    status: child.status,
    signal: child.signal || null,
    stdoutTail: tail(child.stdout),
    stderrTail: tail(child.stderr)
  };
}

function tail(value) {
  return String(value || '').split('\n').filter(Boolean).slice(-12);
}

function record(name, detail) {
  report.results.push({ name, status: 'passed', detail: detail || '' });
}

function maybeWriteReport() {
  if (!writeReport) return;
  const reportPath = process.env.DOKE_AUTH_IDENTITY_CANARY_LOCAL_RUNTIME_REPORT_PATH || DEFAULT_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Auth/identity local runtime report written to ${reportPath}`);
}

function printResult() {
  if (report.failures.length) {
    console.error('Auth/identity canary local runtime validation failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    return;
  }
  console.log('Auth/identity canary local runtime validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}
