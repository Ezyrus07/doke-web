#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const checks = [
  ['first paint', 'scripts/test-first-paint-loading-contract.js'],
  ['document preloader contract', 'scripts/test-global-document-preloader-contract.js'],
  ['document preloader visual', 'scripts/test-global-document-preloader-visual.js'],
  ['shared hydration contract', 'scripts/test-shared-page-hydration-contract.js'],
  ['shared hydration visual', 'scripts/test-shared-page-hydration-visual.js'],
  ['index return hydration', 'scripts/test-index-return-hydration-contract.js'],
  ['profile persistence', 'scripts/test-profile-write-contract.js'],
  ['auth and onboarding', 'scripts/test-auth-username-onboarding-contract.js']
];

function runCheck(label, file) {
  const result = spawnSync(process.execPath, [path.join(ROOT, file)], {
    cwd: ROOT,
    env: {
      ...process.env,
      PLAYWRIGHT_CHROMIUM_EXECUTABLE: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : '')
    },
    encoding: 'utf8'
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert(result.status === 0, `${label} failed with exit code ${result.status}`);
}

function verifyRouterContract() {
  const router = read('assets/js/core/stable-shell-router.js');
  const priorityRoutes = [
    '/index.html',
    '/meu-perfil.html',
    '/perfil-cliente.html',
    '/configuracoes.html',
    '/tornar-profissional.html',
    '/verificacao-profissional.html',
    '/pedidos.html',
    '/mensagens.html',
    '/carteira.html'
  ];

  priorityRoutes.forEach((route) => {
    assert(router.includes(`'${route}'`), `stable shell does not register priority route ${route}`);
  });

  assert(
    /window\.addEventListener\('popstate',[\s\S]*?navigate\(window\.location\.href,\s*\{\s*replace:\s*true\s*\}\)/.test(router),
    'stable shell does not rehydrate on browser history navigation'
  );
  assert(router.includes("'/index.html': ['DokeInitHome']"), 'home initializer is not registered');
  assert(router.includes("'/meu-perfil.html': ['DokeInitOwnerProfile']"), 'owner profile initializer is not registered');
  assert(router.includes("'/configuracoes.html': ['DokeInitSettings']"), 'settings initializer is not registered');
  assert(router.includes("'/tornar-profissional.html': ['DokeInitBecomePro']"), 'become-professional initializer is not registered');
  assert(router.includes("'/verificacao-profissional.html': ['DokeInitProfessionalVerification']"), 'professional verification initializer is not registered');
}

function verifyPageBoundaries() {
  const pages = [
    ['index.html', 'data-state-boundary="index"', 'data-home-hydration-skeleton'],
    ['meu-perfil.html', 'data-state-boundary="meu-perfil"', 'data-profile-hydration-skeleton'],
    ['perfil-cliente.html', 'data-state-boundary="perfil-cliente"', 'data-profile-hydration-skeleton'],
    ['configuracoes.html', 'data-state-boundary="configuracoes"', 'data-settings-hydration-skeleton'],
    ['tornar-profissional.html', 'data-state-boundary="tornar-profissional"', 'data-professional-onboarding-hydration-skeleton'],
    ['verificacao-profissional.html', 'data-state-boundary="verificacao-profissional"', 'data-professional-verification-hydration-skeleton']
  ];

  pages.forEach(([file, boundary, skeleton]) => {
    const html = read(file);
    assert(html.includes(boundary), `${file} is missing its replaceable hydration boundary`);
    assert(html.includes(skeleton), `${file} is missing its canonical skeleton`);
    assert(html.includes('data-doke-document-preloader'), `${file} is missing the global document preloader`);
  });
}

function verifyNoDirectPageStorage() {
  const controllers = [
    'assets/js/pages/index-data-controller.js',
    'assets/js/pages/owner-profile-experience.js',
    'assets/js/pages/client-profile-experience.js',
    'assets/js/pages/configuracoes.js',
    'assets/js/pages/tornar-profissional.js',
    'assets/js/pages/verificacao-profissional.js'
  ];
  controllers.forEach((file) => {
    const source = read(file);
    assert(!/\blocalStorage\b/.test(source), `${file} accesses localStorage directly`);
  });
}

function main() {
  checks.forEach(([label, file]) => runCheck(label, file));
  verifyRouterContract();
  verifyPageBoundaries();
  verifyNoDirectPageStorage();

  console.log('[transition-system-freeze] ok');
  console.log(`- executable gates passed: ${checks.length}`);
  console.log('- priority route registry, history re-entry and page boundaries verified');
  console.log('- profile/onboarding persistence contracts included');
  console.log('- direct localStorage access in priority page controllers: 0');
}

try {
  main();
} catch (error) {
  console.error('[transition-system-freeze] failed');
  console.error(error.stack || error.message || error);
  process.exit(1);
}
