#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');
const requireReady = process.env.DOKE_ORDERS_WRITE_FRONTEND_ROLLBACK_REQUIRE_READY === '1';
const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-frontend-rollback-gate-report.json';

const RUNTIME_FILES = Object.freeze([
  'assets/js/core/runtime-config.js',
  'assets/js/services/orders-service.js'
]);
const READY_STATUS = 'orders_write_frontend_rollback_gate_validated';
const DRY_STATUS = 'dry_run_plan_only';

const report = {
  name: 'orders-write-frontend-rollback-gate',
  generatedAt: new Date().toISOString(),
  dryRun,
  performsNetworkRequest: false,
  performsMutation: false,
  objective: 'Validate rollback and safe degradation for manual orders write frontend activation.',
  rollbackContract: {
    ordersProvider: 'mock',
    dataProvider: 'mock',
    orderWriteActivation: false,
    canaryEnabled: false,
    noOrdersFetchAfterRollback: true
  },
  rollbackStatus: 'not_evaluated',
  results: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  finish();
});

async function main() {
  assertFilesExist();
  assertRequiredPackageScripts();

  if (dryRun) {
    report.rollbackStatus = DRY_STATUS;
    record('plan.printed', 'Rollback gate validates localStorage restore, fetch degradation and mock fallback without external network.');
    finish();
    return;
  }

  await runCommand('validate:orders-write-frontend-activation:runtime', 'npm run validate:orders-write-frontend-activation:runtime');
  validateRollbackRestoresPreviousState();
  validateFetchUnavailableDegradesToBlockedCanary();
  report.rollbackStatus = report.failures.length ? 'failed' : READY_STATUS;
  finish();
}

function assertFilesExist() {
  for (const file of RUNTIME_FILES) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing browser runtime file: ${file}`);
  }
  for (const file of ['docs/ORDERS-WRITE-FRONTEND-ROLLBACK-RUNBOOK.md', 'docs/ORDERS-WRITE-FRONTEND-RUNTIME-RUNBOOK.md', 'package.json']) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing rollback gate asset: ${file}`);
  }
  record('required_files.present');
}

function assertRequiredPackageScripts() {
  const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts || {};
  const expected = {
    'audit:orders-write-frontend-rollback-gate': 'node scripts/audit-orders-write-frontend-rollback-gate.js',
    'validate:orders-write-frontend-rollback:gate:dry-run': 'node scripts/validate-orders-write-frontend-rollback-gate.js --dry-run',
    'validate:orders-write-frontend-rollback:gate': 'node scripts/validate-orders-write-frontend-rollback-gate.js',
    'validate:orders-write-frontend-rollback:gate:report': 'node scripts/validate-orders-write-frontend-rollback-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });
  if (!report.failures.length) record('package_scripts.present');
}

function validateRollbackRestoresPreviousState() {
  const browser = createBrowserRuntime({
    storage: {
      'doke.dataProvider': 'api',
      'doke.ordersProvider': 'mock',
      'doke.orderWriteActivation': 'false',
      'doke.flag.enableNetworkRequests': 'false'
    },
    fetch: createOrdersFetch()
  });
  loadRuntime(browser);

  const activated = browser.window.Doke.services.orders.configureOrdersWriteCanary({
    apiBaseUrl: 'https://staging-api.doke.example'
  });
  assertEqual(activated.active, true, 'Canary must activate before rollback validation.');

  const rollback = browser.window.Doke.services.orders.rollbackOrdersWriteCanary();
  assertEqual(rollback.active, false, 'Rollback must deactivate orders write canary.');
  assertEqual(browser.window.localStorage.getItem('doke.dataProvider'), 'api', 'Rollback must restore previous dataProvider value.');
  assertEqual(browser.window.localStorage.getItem('doke.ordersProvider'), 'mock', 'Rollback must restore previous ordersProvider value.');
  assertEqual(browser.window.localStorage.getItem('doke.orderWriteActivation'), 'false', 'Rollback must restore previous orderWriteActivation value.');
  assertEqual(browser.window.localStorage.getItem('doke.canary.ordersWrite.enabled'), null, 'Rollback must clear canary enabled key when it did not previously exist.');
  record('rollback.restores_previous_storage_state');
}

function validateFetchUnavailableDegradesToBlockedCanary() {
  const browser = createBrowserRuntime({
    storage: {
      'doke.canary.ordersWrite.enabled': 'true',
      'doke.ordersProvider': 'api-write-canary-frontend-activation',
      'doke.orderWriteActivation': 'true',
      'doke.dataProvider': 'mock',
      'doke.apiBaseUrl': 'https://staging-api.doke.example',
      'doke.canary.ordersWrite.apiBaseUrl': 'https://staging-api.doke.example',
      'doke.flag.enableNetworkRequests': 'true'
    }
  });
  loadRuntime(browser);
  const status = browser.window.Doke.services.orders.getOrdersWriteCanaryStatus();
  assertEqual(status.active, false, 'Canary must not be active when fetch is unavailable.');
  assert(status.blockers.includes('window.fetch is not available.'), 'Fetch degradation must be explicit in blockers.');
  record('degradation.fetch_unavailable_blocks_canary');
}

function createOrdersFetch() {
  return async function fetchStub(url, options = {}) {
    const parsed = new URL(url);
    this.fetchCalls.push({ path: parsed.pathname, method: options.method || 'GET' });
    return { ok: true, status: 200, async json() { return { order: { id: 'order_api_1' } }; } };
  };
}

function createBrowserRuntime(options = {}) {
  const storageMap = new Map(Object.entries(options.storage || {}).map(([key, value]) => [key, String(value)]));
  const eventListeners = new Map();
  const fetchCalls = [];
  const document = {
    readyState: 'complete',
    documentElement: { dataset: {}, setAttribute() {}, getAttribute() { return null; } },
    body: { dataset: {} },
    addEventListener(type, listener) {
      const listeners = eventListeners.get(type) || [];
      listeners.push(listener);
      eventListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      const listeners = eventListeners.get(event.type) || [];
      listeners.forEach((listener) => listener(event));
      return true;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { dataset: {}, classList: createClassList(), setAttribute() {}, removeAttribute() {} }; }
  };
  const browser = {
    fetchCalls,
    console,
    URL,
    URLSearchParams,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    Error,
    Set,
    Map,
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Event: class Event { constructor(type) { this.type = type; } },
    setTimeout(callback) { callback(); return 0; },
    clearTimeout() {},
    localStorage: {
      getItem(key) { return storageMap.has(key) ? storageMap.get(key) : null; },
      setItem(key, value) { storageMap.set(key, String(value)); },
      removeItem(key) { storageMap.delete(key); },
      clear() { storageMap.clear(); }
    },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: new URL('https://staging.doke.example/pedidos.html'),
    document,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    navigator: { userAgent: 'doke-orders-write-frontend-rollback-gate' },
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return { id: 'user_client_1', role: 'client', name: 'Cliente Canary' }; },
        getSession() { return { token: 'token-client', user: this.getCurrentUser() }; }
      }
    }
  };
  browser.window = browser;
  browser.globalThis = browser;
  browser.fetch = options.fetch ? options.fetch.bind(browser) : undefined;
  return browser;
}

function createClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach((item) => values.add(item)); },
    remove(...items) { items.forEach((item) => values.delete(item)); },
    contains(item) { return values.has(item); },
    toggle(item, force) {
      if (force === true) values.add(item);
      else if (force === false) values.delete(item);
      else if (values.has(item)) values.delete(item);
      else values.add(item);
      return values.has(item);
    }
  };
}

function loadRuntime(browser) {
  const context = vm.createContext(browser);
  for (const file of RUNTIME_FILES) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
}

function runCommand(name, command) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true, stdio: 'pipe', env: Object.assign({}, process.env) });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('close', (code) => {
      if (code !== 0) report.failures.push(`${name} failed with exit code ${code}: ${stderr.trim()}`);
      else record(name);
      resolve();
    });
  });
}

function record(name, detail = '') { report.results.push({ name, status: 'passed', detail }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
}
function finish() {
  if (writeReport) {
    const target = path.join(root, process.env.DOKE_ORDERS_WRITE_FRONTEND_ROLLBACK_REPORT_PATH || DEFAULT_REPORT_PATH);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report written to ${path.relative(root, target)}`);
  }
  if (report.failures.length || (requireReady && report.rollbackStatus !== READY_STATUS)) {
    console.error('Orders write frontend rollback gate failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}
