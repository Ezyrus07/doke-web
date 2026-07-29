#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-frontend-activation-runtime-report.json';

const RUNTIME_FILES = Object.freeze([
  'assets/js/core/runtime-config.js',
  'assets/js/services/orders-service.js'
]);

const report = {
  name: 'orders-write-frontend-activation-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate manual frontend orders write activation while canonical reads remain on supabase-read, submitted writes stay disabled by default, and the canary preserves idempotency and domain isolation without external network.',
  performsNetworkRequest: false,
  performsMutation: false,
  files: RUNTIME_FILES.slice(),
  activationStatus: 'not_evaluated',
  results: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  finish();
});

async function main() {
  assertFilesExist();
  validateDefaultState();
  validateUnsafeTargetBlock();
  await validateManualActivationAndOrderMutation();
  report.activationStatus = report.failures.length ? 'failed' : 'orders_write_frontend_activation_runtime_validated';
  finish();
}

function assertFilesExist() {
  for (const file of RUNTIME_FILES) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing browser runtime file: ${file}`);
  }
  record('required_files.present');
}

function validateDefaultState() {
  const browser = createBrowserRuntime();
  loadRuntime(browser);
  const config = browser.window.Doke.runtimeConfig;
  assertEqual(config.dataProvider, 'mock', 'Default dataProvider must remain mock.');
  assertEqual(config.ordersProvider, 'supabase-read', 'Default ordersProvider must preserve ORD-A04 canonical remote reads.');
  assertEqual(config.orderWriteActivation, false, 'Default orderWriteActivation must remain false.');

  const status = browser.window.Doke.services.orders.getOrdersWriteCanaryStatus();
  assertEqual(status.active, false, 'Orders write canary must be inactive by default.');
  assert(status.blockers.includes('ordersWriteCanary is not enabled.'), 'Inactive canary must explain missing enabled flag.');
  record('default_state.remote_read_write_locked');
}

function validateUnsafeTargetBlock() {
  const browser = createBrowserRuntime({ fetch: createOrdersFetch() });
  loadRuntime(browser);
  let blocked = false;
  try {
    browser.window.Doke.services.orders.configureOrdersWriteCanary({
      apiBaseUrl: 'https://api.doke-production.example'
    });
  } catch (error) {
    blocked = /production-like|local\/staging/.test(error.message);
  }
  assert(blocked, 'Production-like orders write target must be blocked.');
  assertEqual(browser.window.localStorage.getItem('doke.canary.ordersWrite.enabled'), null, 'Blocked target must not persist enabled canary state.');
  record('target_safety.production_like_blocked');
}

async function validateManualActivationAndOrderMutation() {
  const browser = createBrowserRuntime({
    storage: {
      'doke.dataProvider': 'api',
      'doke.ordersProvider': 'supabase-read',
      'doke.orderWriteActivation': 'false',
      'doke.flag.enableNetworkRequests': 'false'
    },
    fetch: createOrdersFetch()
  });
  loadRuntime(browser);

  const activated = browser.window.Doke.services.orders.configureOrdersWriteCanary({
    apiBaseUrl: 'https://staging-api.doke.example'
  });

  assertEqual(activated.active, true, 'Manual activation must become active for a safe staging target.');
  assertEqual(activated.dataProvider, 'mock', 'Orders write canary must force dataProvider mock.');
  assertEqual(activated.ordersProvider, 'api-write-canary-frontend-activation', 'Orders provider must be activation canary only.');
  assertEqual(activated.orderWriteActivation, true, 'orderWriteActivation must be true only after explicit activation.');
  record('canary.manual_activation_safe');

  let missingIdempotencyBlocked = false;
  try {
    await browser.window.Doke.services.orders.create(createOrderPayload());
  } catch (error) {
    missingIdempotencyBlocked = /idempotencyKey/.test(error.message);
  }
  assert(missingIdempotencyBlocked, 'Orders write canary must reject create without idempotencyKey.');
  assertEqual(browser.fetchCalls.length, 0, 'Missing idempotency must be rejected before fetch.');
  record('idempotency.required_before_fetch');

  const created = await browser.window.Doke.services.orders.create(Object.assign(createOrderPayload(), {
    idempotencyKey: 'front-create-001'
  }));
  assertEqual(created.id, 'order_api_1', 'Created order must normalize API response.');

  const accepted = await browser.window.Doke.services.orders.accept('order_api_1', {
    idempotencyKey: 'front-accept-001'
  });
  assertEqual(accepted.status, 'accepted', 'Accepted order must normalize API action response.');

  const calledPaths = browser.fetchCalls.map((entry) => entry.path);
  assertDeepEqual(calledPaths, ['/orders', '/orders/order_api_1/accept'], 'Frontend activation canary must call only expected orders endpoints.');
  assert(browser.fetchCalls.every((entry) => entry.headers['x-idempotency-key']), 'Every mutation must include x-idempotency-key.');
  assert(browser.fetchCalls.every((entry) => /^\/orders(\/|$)/.test(entry.path)), 'Every activation call must remain inside /orders.');
  record('orders_write.calls_are_order_domain_only');
  record('orders_write.idempotency_header_present');

  report.performsNetworkRequest = true;
  report.performsMutation = true;
}

function createOrderPayload() {
  return {
    serviceId: 'service_painting',
    professionalId: 'pro_renato',
    title: 'Pintura residencial',
    description: 'Canary controlado de escrita no frontend.',
    address: { city: 'Salvador', state: 'BA' }
  };
}

function createOrdersFetch() {
  return async function fetchStub(url, options = {}) {
    const parsed = new URL(url);
    const pathName = parsed.pathname;
    const body = options.body ? JSON.parse(options.body) : null;
    const headers = normalizeHeaders(options.headers || {});

    this.fetchCalls.push({
      method: options.method || 'GET',
      path: pathName,
      body,
      headers
    });

    if (!/^\/orders(\/|$)/.test(pathName)) return jsonResponse({ error: 'Forbidden test endpoint' }, { ok: false, status: 404 });
    if (!headers['x-idempotency-key']) return jsonResponse({ code: 'DOKE_IDEMPOTENCY_REQUIRED' }, { ok: false, status: 400 });

    if (pathName === '/orders') {
      return jsonResponse({
        order: Object.assign({}, body, {
          id: 'order_api_1',
          clientId: 'user_client_1',
          status: 'pending',
          statusLabel: 'Aguardando resposta'
        })
      }, { status: 201 });
    }

    if (pathName === '/orders/order_api_1/accept') {
      return jsonResponse({
        order: {
          id: 'order_api_1',
          clientId: 'user_client_1',
          professionalId: 'pro_renato',
          status: 'accepted',
          statusLabel: 'Pedido aceito'
        }
      });
    }

    return jsonResponse({ error: 'Unexpected endpoint' }, { ok: false, status: 404 });
  };
}

function normalizeHeaders(headers) {
  const output = {};
  Object.entries(headers).forEach(([key, value]) => { output[String(key).toLowerCase()] = String(value); });
  return output;
}

function jsonResponse(payload, options = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    async json() { return payload; }
  };
}

function createBrowserRuntime(options = {}) {
  const storageMap = new Map(Object.entries(options.storage || {}).map(([key, value]) => [key, String(value)]));
  const eventListeners = new Map();
  const fetchCalls = [];

  const documentElementAttributes = {};
  const document = {
    readyState: 'complete',
    documentElement: {
      dataset: {},
      setAttribute(key, value) { documentElementAttributes[key] = String(value); },
      getAttribute(key) { return documentElementAttributes[key] || null; }
    },
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

  const location = new URL(options.url || 'https://staging.doke.example/pedidos.html');
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
    location,
    document,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    navigator: { userAgent: 'doke-orders-write-frontend-runtime' },
    Doke: {
      services: {},
      session: {
        getCurrentUser() {
          return { id: 'user_client_1', role: 'client', name: 'Cliente Canary', email: 'cliente@staging.example' };
        },
        getSession() {
          return { token: 'token-client', user: this.getCurrentUser() };
        }
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
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
}

function record(name, detail = '') { report.results.push({ name, status: 'passed', detail }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`);
}
function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) throw new Error(`${message} Expected ${expectedJson}, received ${actualJson}.`);
}

function finish() {
  if (writeReport) {
    const target = path.join(root, process.env.DOKE_ORDERS_WRITE_FRONTEND_ACTIVATION_RUNTIME_REPORT_PATH || DEFAULT_REPORT_PATH);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report written to ${path.relative(root, target)}`);
  }
  if (report.failures.length) {
    console.error('Orders write frontend activation runtime validation failed:');
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('Orders write frontend activation runtime validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}
