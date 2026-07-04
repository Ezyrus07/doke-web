'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BETA_LAUNCH_FRONTEND_RUNTIME_REPORT_PATH || 'reports/generated/beta-launch-frontend-runtime-report.json';

const report = {
  name: 'beta-launch-frontend-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate controlled frontend activation for beta launch domains without enabling production or changing visual surfaces.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  status: 'not_evaluated',
  results: [],
  fetchCalls: [],
  failures: []
};

main().catch((error) => fail(error.stack || error.message || String(error)));

async function main() {
  assertFile('assets/js/core/runtime-config.js');
  assertFile('assets/js/services/beta-launch-frontend-service.js');
  const context = createBrowserContext();
  runScript(context, 'assets/js/core/runtime-config.js');
  runScript(context, 'assets/js/services/beta-launch-frontend-service.js');

  const service = context.window.Doke.services.betaLaunch;
  assert(service, 'Doke.services.betaLaunch must be registered.');
  const initial = service.getBetaLaunchCanaryStatus();
  assert(initial.active === false, 'Beta launch frontend canary must be inactive by default.');
  assert(initial.dataProvider === 'mock', 'Default beta launch frontend canary dataProvider must be mock.');
  pass('default_state.mock_inactive');

  assertThrows(() => service.configureBetaLaunchCanary({ apiBaseUrl: 'https://api.doke.com', domains: ['payments'] }), 'production-like target must be blocked');
  pass('unsafe_target.blocked');

  const activated = service.configureBetaLaunchCanary({
    apiBaseUrl: 'http://127.0.0.1:4100',
    targetMarker: 'local',
    domains: ['payments', 'kyc', 'support', 'security', 'media', 'moderation', 'search', 'pricing']
  });
  assert(activated.active === true, 'Beta launch frontend canary must activate for local target.');
  assert(activated.provider === 'api-beta-launch-frontend-activation', 'Beta launch provider must be activation canary provider.');
  assert(activated.dataProvider === 'mock', 'Data provider must remain mock during beta launch frontend canary.');
  pass('safe_activation.validated');

  await service.request('/checkout/sessions', {
    method: 'POST',
    body: { orderId: 'order_1', amountCents: 12000 },
    idempotencyKey: 'checkout-front-001'
  });
  await service.request('/search', { method: 'GET' });
  await assertRejects(() => service.request('/checkout/sessions', { method: 'POST', body: { orderId: 'order_1' } }), 'mutation without idempotencyKey must be blocked');
  await assertRejects(() => service.request('/wallet', { method: 'GET' }), 'non-enabled domain endpoint must be blocked');
  pass('requests.restricted_to_enabled_domains');

  const rollback = service.rollbackBetaLaunchCanary();
  assert(rollback.active === false, 'Rollback must deactivate beta launch frontend canary.');
  assert(context.window.localStorage.getItem('doke.canary.betaLaunch.enabled') === null, 'Rollback must clear beta launch enabled flag.');
  pass('rollback.deactivates_and_restores_storage');

  report.fetchCalls = context.__fetchCalls;
  const postCall = report.fetchCalls.find((call) => call.path === '/checkout/sessions');
  assert(postCall && postCall.headers['x-idempotency-key'] === 'checkout-front-001', 'POST call must include x-idempotency-key.');
  report.status = report.failures.length ? 'failed' : 'beta_launch_frontend_runtime_validated';
  finish();
}

function createBrowserContext() {
  const storage = new Map();
  const fetchCalls = [];
  const window = {
    location: { hostname: 'localhost', search: '' },
    DOKE_RUNTIME_CONFIG: {},
    Doke: {},
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    fetch(url, options = {}) {
      const parsed = new URL(url);
      const headers = options.headers || {};
      fetchCalls.push({ url, path: parsed.pathname, method: options.method || 'GET', headers });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true, path: parsed.pathname }) });
    }
  };
  window.window = window;
  window.URL = URL;
  window.URLSearchParams = URLSearchParams;
  return vm.createContext({ window, URL, URLSearchParams, console, Promise, Object, Array, String, Boolean, JSON, Date, RegExp, Error, __fetchCalls: fetchCalls });
}

function runScript(context, file) {
  const absolute = path.join(root, file);
  vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: file });
}
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function assert(condition, message) { if (!condition) report.failures.push(message); }
function assertThrows(fn, message) { try { fn(); report.failures.push(message); } catch (error) { return true; } }
async function assertRejects(fn, message) { try { await fn(); report.failures.push(message); } catch (error) { return true; } }
function fail(message) { report.status = 'failed'; report.failures.push(String(message)); finish(1); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}
