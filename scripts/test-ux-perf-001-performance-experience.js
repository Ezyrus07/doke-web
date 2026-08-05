const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const AUTHORITY = path.join(ROOT, 'assets/js/core/performance-experience.js');
const PILOT = path.join(ROOT, 'assets/js/pages/news-performance-pilot.js');
const BOOTSTRAP = path.join(ROOT, 'assets/js/core/page-bootstrap.js');

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    emit(name, detail) {
      this.dispatchEvent({ type: name, detail });
    }
  };
}

function loadAuthority({ saveData = false } = {}) {
  let clock = 0;
  const documentEvents = createEventTarget();
  const windowEvents = createEventTarget();
  const documentElement = {
    dataset: {},
    setAttribute() {},
    getAttribute() { return null; }
  };
  const body = {
    dataset: { page: 'novidades' },
    getAttribute(name) { return name === 'data-page' ? 'novidades' : null; }
  };
  const document = Object.assign(documentEvents, {
    readyState: 'complete',
    hidden: false,
    documentElement,
    body,
    querySelector() { return null; }
  });
  const navigator = {
    connection: { saveData, effectiveType: '4g' },
    deviceMemory: 8,
    hardwareConcurrency: 8
  };
  const window = Object.assign(windowEvents, {
    Doke: {},
    document,
    navigator,
    location: { pathname: '/novidades.html' },
    performance: { now: () => { clock += 25; return clock; } },
    PerformanceObserver: null,
    requestIdleCallback(callback) { callback({ didTimeout: false, timeRemaining: () => 50 }); return 1; },
    cancelIdleCallback() {},
    setTimeout(callback, delay) { if (delay <= 100) callback(); return 1; },
    clearTimeout() {}
  });
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    navigator,
    location: window.location,
    performance: window.performance,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Map,
    Set,
    Promise,
    Error,
    TypeError,
    console,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout
  });
  vm.runInContext(fs.readFileSync(AUTHORITY, 'utf8'), context, { filename: AUTHORITY });
  return { api: window.Doke.performanceExperience, document, window };
}

async function testRuntime() {
  const { api, document } = loadAuthority();
  assert(api, 'performance authority must be published');
  assert.strictEqual(api.version, '20260804-ux-perf-001-v1');
  assert(Object.isFrozen(api), 'API must be frozen');
  assert(Object.isFrozen(api.states), 'states must be frozen');
  assert(Object.isFrozen(api.priorities), 'priorities must be frozen');
  assert(Object.isFrozen(api.budgets), 'budgets must be frozen');

  const journey = api.startJourney({ id: 'test-ready', route: 'novidades' });
  journey.markShellReady({ source: 'test' });
  journey.markContentReady({ source: 'test' });
  journey.markInteractive({ source: 'test' });
  assert.strictEqual(journey.getState(), api.states.SETTLED, 'ready journey must settle');
  assert.strictEqual(journey.getSnapshot().blockingTasks, 0);

  const blocked = api.startJourney({ id: 'test-blocked', route: 'novidades' });
  const critical = blocked.beginTask({ id: 'critical-data', priority: api.priorities.CRITICAL });
  blocked.markContentReady();
  blocked.markInteractive();
  assert.notStrictEqual(blocked.getState(), api.states.SETTLED, 'critical task must block settlement');
  critical.complete();
  assert.strictEqual(blocked.getState(), api.states.SETTLED, 'completed critical task must release settlement');

  const degraded = api.startJourney({ id: 'test-degraded', route: 'novidades' });
  const failed = degraded.beginTask({ id: 'critical-fail', priority: api.priorities.CRITICAL });
  failed.fail({ code: 'network-failed' });
  assert.strictEqual(degraded.getState(), api.states.DEGRADED, 'critical failure must degrade');

  const optional = api.scheduleOptional({ id: 'optional-work', run: () => 42, timeout: 10 });
  const optionalResult = await optional.promise;
  assert.strictEqual(optionalResult.status, api.taskStates.COMPLETE);
  assert.strictEqual(optionalResult.value, 42);

  const snapshot = api.getSnapshot();
  assert.strictEqual(snapshot.page, 'novidades');
  assert.strictEqual(snapshot.connection.saveData, false);
  assert.strictEqual(document.documentElement.dataset.dokePerformanceState, api.states.DEGRADED);
}

async function testSaveDataSkip() {
  const { api } = loadAuthority({ saveData: true });
  let ran = false;
  const optional = api.scheduleOptional({ id: 'save-data-work', run: () => { ran = true; }, timeout: 10 });
  const result = await optional.promise;
  assert.strictEqual(result.status, api.taskStates.SKIPPED);
  assert.strictEqual(result.code, 'save-data');
  assert.strictEqual(ran, false, 'saveData must prevent optional work by default');
}

function testSourceContracts() {
  const authority = fs.readFileSync(AUTHORITY, 'utf8');
  const pilot = fs.readFileSync(PILOT, 'utf8');
  const bootstrap = fs.readFileSync(BOOTSTRAP, 'utf8');

  assert(authority.includes('Doke.performanceExperience = api'), 'canonical authority must be published');
  assert(authority.includes('firstUsefulContentMs'), 'first useful content budget must exist');
  assert(authority.includes('maxLongTasksBeforeContent'), 'long task budget must exist');
  assert(authority.includes("observe('largest-contentful-paint'"), 'LCP observer must exist');
  assert(authority.includes("observe('layout-shift'"), 'CLS observer must exist');
  assert(authority.includes("observe('longtask'"), 'long task observer must exist');
  assert(authority.includes('scheduleOptional'), 'optional scheduler must exist');
  assert(authority.includes('saveData'), 'saveData policy must exist');
  assert(!authority.includes("observe('resource'"), 'resource timing URLs must not be collected');
  assert(!authority.includes('location.href'), 'full URLs must not be emitted');
  assert(!authority.includes('innerHTML'), 'performance authority must not inspect page content');

  assert(pilot.includes('news-first-useful-content'), 'News pilot must declare its journey');
  assert(pilot.includes('static-editorial-content'), 'static content must be first value');
  assert(pilot.includes("releasePreloader('news-first-useful-content')"), 'preloader may release after useful content');
  assert(pilot.includes('scheduleOptional'), 'post-paint work must be optional');
  assert(pilot.includes('news.post-paint-audit'), 'optional audit must be named');

  assert(bootstrap.includes('PERFORMANCE_EXPERIENCE_VERSION'), 'bootstrap must pin performance authority');
  assert(bootstrap.includes('NEWS_PERFORMANCE_PILOT_VERSION'), 'bootstrap must pin pilot');
  assert(bootstrap.includes('var performanceTask = ensurePerformanceExperience()'), 'performance loading must start in parallel');
  assert(bootstrap.includes('ensurePerformancePilot'), 'bootstrap must load page pilot selectively');
  assert(bootstrap.includes("pageName() !== 'novidades'"), 'pilot must remain scoped to News');
  assert(bootstrap.includes('performanceExperienceReady'), 'readiness must be observable');
  assert(bootstrap.includes('performancePilotReady'), 'pilot readiness must be observable');
}

(async () => {
  await testRuntime();
  await testSaveDataSkip();
  testSourceContracts();
  console.log('[test:ux-perf-001] passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
