#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  ORDERS_READONLY_CANARY_ENDPOINTS,
  createOrdersReadonlyCanaryLocalServer
} = require('../backend/shared/testing/orders-readonly-canary-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const DEFAULT_REPORT_PATH = 'reports/generated/orders-readonly-canary-local-runtime-report.json';
const CHILD_REPORT_PATH = 'reports/generated/orders-readonly-canary-local-network-report.json';

const report = {
  name: 'orders-readonly-canary-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Run the orders read-only canary validator against a local HTTP server before external staging is used.',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-readonly',
    enableNetworkRequests: true
  },
  expectedEndpoints: ORDERS_READONLY_CANARY_ENDPOINTS.slice(),
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
  const server = createOrdersReadonlyCanaryLocalServer({ roles: ['client', 'professional'] });
  try {
    const started = await server.start();
    record('local_server.started', `port=${started.port}`);
    const child = await runNetworkCanary(started.baseUrl);
    report.child = summarizeChild(child);
    if (child.status !== 0) {
      report.failures.push(`validate-orders-readonly-canary.js exited with status ${child.status}.`);
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
    'scripts/validate-orders-readonly-canary.js',
    'backend/shared/testing/orders-readonly-canary-local-server.js',
    'backend/shared/testing/staging-e2e-scenarios.js',
    'docs/ORDERS-READONLY-CANARY-RUNBOOK.md',
    'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md'
  ];
  requiredFiles.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) {
      report.failures.push(`Missing required orders read-only local canary asset: ${file}`);
    }
  });
  if (report.failures.length) throw new Error('Required orders read-only local canary assets are missing.');
  record('required_files.present');
}

function runNetworkCanary(baseUrl) {
  const env = Object.assign({}, process.env, {
    DOKE_ENVIRONMENT: 'local',
    DOKE_ORDERS_READONLY_CANARY_API_URL: baseUrl,
    DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK: '1',
    DOKE_ORDERS_READONLY_CANARY_MARKER: 'local',
    DOKE_ORDERS_READONLY_CANARY_ROLES: 'client,professional',
    DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE: 'local-runtime',
    DOKE_ORDERS_READONLY_CANARY_REPORT_PATH: CHILD_REPORT_PATH
  });
  const childArgs = ['scripts/validate-orders-readonly-canary.js'];
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
    report.failures.push('Orders read-only local canary server report is missing.');
    return;
  }
  if (serverReport.unexpectedRequests.length) {
    report.failures.push(`Orders read-only local canary server received unexpected endpoints: ${serverReport.unexpectedRequests.map((entry) => entry.route).join(', ')}.`);
  }
  if (serverReport.forbiddenRequests.length) {
    report.failures.push(`Orders read-only local canary server received forbidden endpoints: ${serverReport.forbiddenRequests.map((entry) => entry.route).join(', ')}.`);
  }

  const hitRoutes = serverReport.requests.map((entry) => entry.route);
  for (const route of ORDERS_READONLY_CANARY_ENDPOINTS) {
    if (!hitRoutes.includes(route)) report.failures.push(`Orders read-only local canary server did not receive required endpoint: ${route}.`);
  }

  const writeHits = hitRoutes.filter((route) => /^(POST|PATCH|PUT|DELETE) \/orders(\/|$)/.test(route));
  if (writeHits.length) {
    report.failures.push(`Orders read-only local canary leaked into write endpoints: ${writeHits.join(', ')}.`);
  }

  const forbiddenDomainHits = hitRoutes.filter((route) => /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/.test(route));
  if (forbiddenDomainHits.length) {
    report.failures.push(`Orders read-only local canary leaked into forbidden domains: ${forbiddenDomainHits.join(', ')}.`);
  }

  if (!report.failures.length) record('server_traffic.orders_readonly_only');
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
  const reportPath = process.env.DOKE_ORDERS_READONLY_CANARY_LOCAL_RUNTIME_REPORT_PATH || DEFAULT_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Orders read-only local runtime report written to ${reportPath}`);
}

function printResult() {
  if (report.failures.length) {
    console.error('Orders read-only canary local runtime validation failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    return;
  }
  console.log('Orders read-only canary local runtime validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}
