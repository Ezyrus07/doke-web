#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const routes = [
  {
    path: '/index.html',
    file: 'index.html',
    boundary: 'index',
    mode: 'skeleton',
    surface: 'data-home-hydration-skeleton',
    ready: 'data-home-hydration-ready',
    controller: 'assets/js/pages/index-data-controller.js'
  },
  {
    path: '/meu-perfil.html',
    file: 'meu-perfil.html',
    boundary: 'meu-perfil',
    mode: 'skeleton',
    surface: 'data-profile-hydration-skeleton',
    ready: 'data-profile-hydration-ready',
    controller: 'assets/js/pages/owner-profile-experience.js'
  },
  {
    path: '/perfil-cliente.html',
    file: 'perfil-cliente.html',
    boundary: 'perfil-cliente',
    mode: 'skeleton',
    surface: 'data-profile-hydration-skeleton',
    ready: 'data-profile-hydration-ready',
    controller: 'assets/js/pages/client-profile-experience.js'
  },
  {
    path: '/configuracoes.html',
    file: 'configuracoes.html',
    boundary: 'configuracoes',
    mode: 'pending',
    surface: 'data-settings-hydration-pending',
    removedSkeleton: 'data-settings-hydration-skeleton',
    ready: 'data-settings-hydration-ready',
    controller: 'assets/js/pages/configuracoes.js'
  },
  {
    path: '/tornar-profissional.html',
    file: 'tornar-profissional.html',
    boundary: 'tornar-profissional',
    mode: 'pending',
    surface: 'data-professional-onboarding-hydration-pending',
    removedSkeleton: 'data-professional-onboarding-hydration-skeleton',
    ready: 'data-professional-onboarding-hydration-ready',
    controller: 'assets/js/pages/tornar-profissional.js'
  },
  {
    path: '/verificacao-profissional.html',
    file: 'verificacao-profissional.html',
    boundary: 'verificacao-profissional',
    mode: 'pending',
    surface: 'data-professional-verification-hydration-pending',
    removedSkeleton: 'data-professional-verification-hydration-skeleton',
    ready: 'data-professional-verification-hydration-ready',
    controller: 'assets/js/pages/verificacao-profissional.js'
  }
];

const hydrationCore = read('assets/js/core/page-hydration.js');
const router = read('assets/js/core/stable-shell-router.js');
const loadingCss = read('assets/css/components/states/component-loading-contract.css');

routes.forEach((route) => {
  const html = read(route.file);
  const controller = read(route.controller);
  const routeStart = hydrationCore.indexOf(`'${route.path}': Object.freeze({`);
  const routeEnd = hydrationCore.indexOf('}),', routeStart);
  const routeBlock = routeStart >= 0 && routeEnd >= 0 ? hydrationCore.slice(routeStart, routeEnd + 3) : '';

  assert(routeStart >= 0, `${route.path}: missing route lifecycle contract`);
  assert(router.includes(`'${route.path}'`), `${route.path}: missing hydration barrier route`);
  assert(html.includes(`data-state-boundary="${route.boundary}"`), `${route.file}: missing state boundary`);
  assert(html.includes('data-view-state="loading"'), `${route.file}: initial state must be loading`);
  assert(html.includes('aria-busy="true"'), `${route.file}: initial boundary must be busy`);
  assert(html.includes(route.surface), `${route.file}: missing initial lifecycle surface`);
  assert(html.includes(route.ready), `${route.file}: missing ready boundary markup`);
  assert(html.includes('assets/js/core/page-hydration.js'), `${route.file}: page hydration core missing for direct URL`);

  const hydrationIndex = html.indexOf('assets/js/core/page-hydration.js');
  const routerIndex = html.indexOf('assets/js/core/stable-shell-router.js');
  assert(hydrationIndex >= 0 && routerIndex >= 0 && hydrationIndex < routerIndex, `${route.file}: hydration core must load before router`);
  assert(controller.includes('DokePageHydration'), `${route.controller}: controller does not delegate to hydration authority`);
  assert(controller.includes('.start()') || controller.includes('?.start()'), `${route.controller}: hydration start missing`);
  assert(controller.includes('.ready(') || controller.includes('?.ready('), `${route.controller}: hydration ready missing`);

  if (route.mode === 'pending') {
    assert(!html.includes(route.removedSkeleton), `${route.file}: generic bootstrap skeleton must be removed`);
    assert(routeBlock.includes('pending:'), `${route.path}: route contract must expose a pending surface`);
    assert(!routeBlock.includes('skeleton:'), `${route.path}: route contract must not expose a skeleton`);
    assert(controller.includes('pendingSelectors'), `${route.controller}: pending selector missing`);
    assert(controller.includes("skeletonMode: 'never'"), `${route.controller}: skeleton must be disabled`);
  } else {
    assert(routeBlock.includes('skeleton:'), `${route.path}: data-driven skeleton contract missing`);
  }
});

const indexController = read('assets/js/pages/index-data-controller.js');
const indexBoundaryRoot = indexController.indexOf('data-state-boundary="index"');
const preservedBodyRoot = indexController.indexOf('data-page="home"');
assert(indexBoundaryRoot >= 0, 'index controller: hydration must be rooted in the replaceable index boundary');
assert(preservedBodyRoot < 0 || indexBoundaryRoot < preservedBodyRoot, 'index controller: preserved body cannot be the primary hydration root');

assert(hydrationCore.includes('pendingSelectors'), 'page hydration core: pending surfaces must have a dedicated selector contract');
assert(hydrationCore.includes('syncPending'), 'page hydration core: pending visibility must be centrally coordinated');
assert(hydrationCore.includes('toDatasetKey'), 'page hydration core: route names with hyphens must use a valid dataset key');
assert(!hydrationCore.includes('dataset[`${page}Hydration`]'), 'page hydration core: invalid raw route dataset key remains');
assert(loadingCss.includes('.doke-page-hydration-skeleton'), 'shared loading CSS: page skeleton authority missing for real data routes');
assert(loadingCss.includes('prefers-reduced-motion'), 'shared loading CSS: reduced-motion contract missing');
assert(!loadingCss.includes('!important'), 'shared loading CSS: !important is forbidden');

['index.html', 'meu-perfil.html', 'perfil-cliente.html', 'configuracoes.html', 'tornar-profissional.html', 'verificacao-profissional.html'].forEach((file) => {
  const html = read(file);
  assert(!/style\s*=/.test(html), `${file}: inline style introduced`);
});

if (failures.length) {
  console.error('[shared-page-hydration-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[shared-page-hydration-contract] ok');
console.log(`- routes covered: ${routes.length}`);
console.log('- data routes keep structural skeletons; guarded form routes use explicit pending surfaces');
console.log('- controllers delegate pending/ready/error transitions to DokePageHydration');
