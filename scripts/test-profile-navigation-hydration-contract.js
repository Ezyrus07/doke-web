#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const profiles = Object.freeze([
  {
    file: 'assets/js/pages/owner-profile-experience.js',
    route: '/meu-perfil.html',
    maxDuration: 8000,
    mediaPattern: /return Promise\.resolve\(render\(latestProfile\)\)\.then\(function \(\) \{\s*return \{ profile: latestProfile, source: 'profile-service' \};/s
  },
  {
    file: 'assets/js/pages/client-profile-experience.js',
    route: '/perfil-cliente.html',
    maxDuration: 8000,
    mediaPattern: /return Promise\.resolve\(render\(profile\)\)\.then\(function \(\) \{\s*return \{ profile: profile \|\| null \};/s
  },
  {
    file: 'assets/js/pages/professional-profile-experience.js',
    route: '/perfil-profissional.html',
    maxDuration: 9000
  }
]);

const router = read('assets/js/core/stable-shell-router.js');
for (const profile of profiles) {
  assert(router.includes(`'${profile.route}'`), `${profile.route}: route is missing from stable-shell hydration barriers`);
  const source = read(profile.file);
  assert(source.includes('DokePageHydration.create({'), `${profile.file}: hydration authority missing`);
  assert.equal((source.match(/skeletonMode:\s*'hard-load'/g) || []).length, 1, `${profile.file}: hard-load policy must appear exactly once`);
  assert.equal((source.match(/preserveReadyDuringHydration:\s*true/g) || []).length, 1, `${profile.file}: ready preservation must appear exactly once`);
  assert.equal((source.match(/minDuration:\s*0/g) || []).length, 1, `${profile.file}: artificial minimum latency must be zero`);
  assert(source.includes(`maxDuration: ${profile.maxDuration}`), `${profile.file}: watchdog budget changed unexpectedly`);
  assert(!source.includes("skeletonMode: 'route-and-document'"), `${profile.file}: route-and-document skeleton policy remains`);
  assert(!source.includes('preserveReadyDuringHydration: false'), `${profile.file}: destructive revalidation policy remains`);
  assert(!/minDuration:\s*(?:[1-9]\d*)/.test(source), `${profile.file}: non-zero artificial latency remains`);
  assert(source.includes("readyPolicy: 'after-skeleton'"), `${profile.file}: hard-load reveal ordering changed unexpectedly`);
  if (profile.mediaPattern) {
    assert.match(source, profile.mediaPattern, `${profile.file}: surface must resolve only after profile media readiness`);
  }
}

const professional = read('assets/js/pages/professional-profile-experience.js');
const professionalInit = professional.indexOf('window.DokeInitProfessionalProfile');
const professionalMedia = professional.indexOf('Promise.resolve(renderProfessionalProfile(payload))', professionalInit);
const professionalReady = professional.indexOf('hydration?.ready({ hasItems: true })', professionalMedia);
assert(professionalInit >= 0, 'professional profile: initialization entry point is missing');
assert(professionalMedia > professionalInit, 'professional profile: media readiness is not awaited during initialization');
assert(professionalReady > professionalMedia, 'professional profile: hydration ready precedes media readiness');

function loadHydrationCore({ internal = false, restore = false, navigationType = 'navigate', routeVisualMode = '' } = {}) {
  const documentElement = { dataset: {} };
  const body = { dataset: {} };
  if (routeVisualMode) {
    documentElement.dataset.dokeRouteVisualMode = routeVisualMode;
    body.dataset.dokeRouteVisualMode = routeVisualMode;
  }
  const document = {
    documentElement,
    body,
    querySelector: () => null,
    querySelectorAll: () => [],
    dispatchEvent: () => true
  };
  const lifecycle = {
    entry: {
      get: () => ({ navigationType }),
      isInternal: () => internal,
      isRestore: () => restore
    }
  };
  const window = {
    DokeNavigationLifecycle: lifecycle,
    Doke: {},
    location: { href: 'https://doke.test/meu-perfil.html' },
    sessionStorage: { getItem: () => null },
    setTimeout,
    clearTimeout
  };
  const context = {
    window,
    document,
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    URL,
    CustomEvent: function CustomEvent(type, options) { this.type = type; this.detail = options?.detail; },
    console,
    Promise,
    Map,
    Set,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Error
  };
  vm.createContext(context);
  vm.runInContext(read('assets/js/core/page-hydration.js'), context, { filename: 'page-hydration.js' });
  return { hydration: window.DokePageHydration, document };
}

const hardLoad = loadHydrationCore({ navigationType: 'reload' }).hydration.getPolicy({ skeletonMode: 'hard-load' });
assert.equal(hardLoad.hardLoad, true, 'reload must be classified as a hard load');
assert.equal(hardLoad.shouldShowSkeleton, true, 'hard load must show the structural profile skeleton');

const internalDirect = loadHydrationCore({ internal: true, routeVisualMode: 'direct' }).hydration.getPolicy({ skeletonMode: 'hard-load' });
assert.equal(internalDirect.internalNavigation, true, 'stable-shell navigation must be classified as internal');
assert.equal(internalDirect.shouldShowSkeleton, false, 'direct internal navigation must not replay the hard-load skeleton');

const bfcacheRestore = loadHydrationCore({ restore: true, routeVisualMode: 'direct' }).hydration.getPolicy({ skeletonMode: 'hard-load' });
assert.equal(bfcacheRestore.internalNavigation, true, 'BFCache restore must use the internal navigation policy');
assert.equal(bfcacheRestore.shouldShowSkeleton, false, 'BFCache restore must not replay the hard-load skeleton');

const routedSkeleton = loadHydrationCore({ internal: true, routeVisualMode: 'skeleton' }).hydration.getPolicy({ skeletonMode: 'hard-load' });
assert.equal(routedSkeleton.shouldShowSkeleton, true, 'router-requested structural fallback must remain available');

function node() {
  return {
    hidden: false,
    dataset: {},
    isConnected: true,
    setAttribute() {},
    closest: () => null,
    querySelector: () => null
  };
}

async function verifyStateMachine() {
  const { hydration } = loadHydrationCore({ navigationType: 'reload' });
  const skeleton = node();
  const ready = node();
  const rootNode = node();
  rootNode.querySelectorAll = (selector) => {
    if (selector === '[data-profile-skeleton]') return [skeleton];
    if (selector === '[data-profile-ready]') return [ready];
    return [];
  };
  const controller = hydration.create({
    page: 'profile-state-machine',
    root: rootNode,
    skeletonSelectors: '[data-profile-skeleton]',
    readySelectors: '[data-profile-ready]',
    errorSelectors: [],
    skeletonMode: 'hard-load',
    readyPolicy: 'after-skeleton',
    preserveReadyDuringHydration: true,
    minDuration: 0,
    maxDuration: 100,
    hasItems: () => true
  });
  controller.start();
  assert.equal(controller.getState(), 'hydrating');
  assert.equal(skeleton.hidden, false, 'hard-load skeleton must be visible while hydrating');
  assert.equal(ready.hidden, true, 'ready profile must remain hidden during the first hard load');
  controller.ready({ hasItems: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(controller.getState(), 'ready');
  assert.equal(skeleton.hidden, true, 'skeleton must be removed before ready is published');
  assert.equal(ready.hidden, false, 'profile must be visible after readiness');
  controller.start();
  assert.equal(controller.getState(), 'ready', 'revalidation on the same boundary must not restart hydration');
  assert.equal(ready.hidden, false, 'known profile content must remain visible during same-boundary revalidation');

  const timeoutRoot = node();
  timeoutRoot.querySelectorAll = () => [];
  const timeoutController = hydration.create({
    page: 'profile-timeout',
    root: timeoutRoot,
    skeletonSelectors: [],
    readySelectors: [],
    errorSelectors: [],
    skeletonMode: 'hard-load',
    preserveReadyDuringHydration: true,
    minDuration: 0,
    maxDuration: 5,
    hasItems: () => true
  });
  timeoutController.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(timeoutController.getState(), 'error', 'watchdog must terminate a stalled profile hydration');
}

verifyStateMachine().then(() => {
  console.log('profile-navigation-hydration-contract: ok');
  console.log('- hard load, stable-shell direct, BFCache, route fallback, media ordering, idempotent revalidation and watchdog validated');
}).catch((error) => {
  console.error('profile-navigation-hydration-contract: failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
});
