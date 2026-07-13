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
    skeleton: 'data-home-hydration-skeleton',
    ready: 'data-home-hydration-ready',
    controller: 'assets/js/pages/index-data-controller.js'
  },
  {
    path: '/meu-perfil.html',
    file: 'meu-perfil.html',
    boundary: 'meu-perfil',
    skeleton: 'data-profile-hydration-skeleton',
    ready: 'data-profile-hydration-ready',
    controller: 'assets/js/pages/owner-profile-experience.js'
  },
  {
    path: '/perfil-cliente.html',
    file: 'perfil-cliente.html',
    boundary: 'perfil-cliente',
    skeleton: 'data-profile-hydration-skeleton',
    ready: 'data-profile-hydration-ready',
    controller: 'assets/js/pages/client-profile-experience.js'
  },
  {
    path: '/configuracoes.html',
    file: 'configuracoes.html',
    boundary: 'configuracoes',
    skeleton: 'data-settings-hydration-skeleton',
    ready: 'data-settings-hydration-ready',
    controller: 'assets/js/pages/configuracoes.js'
  },
  {
    path: '/tornar-profissional.html',
    file: 'tornar-profissional.html',
    boundary: 'tornar-profissional',
    skeleton: 'data-professional-onboarding-hydration-skeleton',
    ready: 'data-professional-onboarding-hydration-ready',
    controller: 'assets/js/pages/tornar-profissional.js'
  }
];

const hydrationCore = read('assets/js/core/page-hydration.js');
const router = read('assets/js/core/stable-shell-router.js');
const loadingCss = read('assets/css/components/states/component-loading-contract.css');

routes.forEach((route) => {
  const html = read(route.file);
  const controller = read(route.controller);

  assert(hydrationCore.includes(`'${route.path}': Object.freeze({`), `${route.path}: missing route skeleton contract`);
  assert(router.includes(`'${route.path}'`), `${route.path}: missing hydration barrier route`);
  assert(html.includes(`data-state-boundary="${route.boundary}"`), `${route.file}: missing state boundary`);
  assert(html.includes('data-view-state="loading"'), `${route.file}: initial state must be loading`);
  assert(html.includes('aria-busy="true"'), `${route.file}: initial boundary must be busy`);
  assert(html.includes(route.skeleton), `${route.file}: missing skeleton markup`);
  assert(html.includes(route.ready), `${route.file}: missing ready boundary markup`);
  assert(html.includes('assets/js/core/page-hydration.js'), `${route.file}: page hydration core missing for direct URL`);

  const hydrationIndex = html.indexOf('assets/js/core/page-hydration.js');
  const routerIndex = html.indexOf('assets/js/core/stable-shell-router.js');
  assert(hydrationIndex >= 0 && routerIndex >= 0 && hydrationIndex < routerIndex, `${route.file}: hydration core must load before router`);
  assert(controller.includes('DokePageHydration'), `${route.controller}: controller does not delegate to hydration authority`);
  assert(controller.includes('.start()') || controller.includes('?.start()'), `${route.controller}: hydration start missing`);
  assert(controller.includes('.ready(') || controller.includes('?.ready('), `${route.controller}: hydration ready missing`);
});

const indexController = read('assets/js/pages/index-data-controller.js');
const indexBoundaryRoot = indexController.indexOf('data-state-boundary=\"index\"');
const preservedBodyRoot = indexController.indexOf('data-page=\"home\"');
assert(indexBoundaryRoot >= 0, 'index controller: hydration must be rooted in the replaceable index boundary');
assert(preservedBodyRoot < 0 || indexBoundaryRoot < preservedBodyRoot, 'index controller: preserved body cannot be the primary hydration root');

assert(hydrationCore.includes('toDatasetKey'), 'page hydration core: route names with hyphens must use a valid dataset key');
assert(!hydrationCore.includes('dataset[`${page}Hydration`]'), 'page hydration core: invalid raw route dataset key remains');
assert(loadingCss.includes('.doke-page-hydration-skeleton'), 'shared loading CSS: page skeleton authority missing');
assert(loadingCss.includes('prefers-reduced-motion'), 'shared loading CSS: reduced-motion contract missing');
assert(!loadingCss.includes('!important'), 'shared loading CSS: !important is forbidden');

['index.html', 'meu-perfil.html', 'perfil-cliente.html', 'configuracoes.html', 'tornar-profissional.html'].forEach((file) => {
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
console.log('- direct load starts with skeleton and stable-shell routes wait for settlement');
console.log('- controllers delegate loading/ready transitions to DokePageHydration');
