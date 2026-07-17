#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const expect = (value, message) => { if (!value) failures.push(message); };

const index = read('index.html');
const lifecycle = read('assets/js/core/navigation-lifecycle.js');
const preloader = read('assets/js/core/document-preloader.js');
const loadingCss = read('assets/css/components/states/component-loading-contract.css');
const router = read('assets/js/core/stable-shell-router.js');

expect(/home-search-hero doke-page-section" aria-label="Buscar serviços"/.test(index), 'Home search must be immediate.');
expect(/home-catégories doke-page-section" aria-label="Categorias"/.test(index), 'Home categories must be immediate.');
expect(!/home-search-hero[^>]*data-home-hydration-ready/.test(index), 'Home search must not depend on data hydration.');
expect(/aria-label="Carregando conteúdo recomendado"/.test(index), 'Home skeleton must describe remote content.');
expect(/html \.doke-page-hydration-skeleton\[hidden\]\s*\{\s*display:\s*none/.test(loadingCss), 'Shared hidden authority must be cascade-safe.');
expect(!/:where\(\.doke-page-hydration-skeleton\)\[hidden\]/.test(loadingCss), 'Zero-specificity hidden authority is forbidden.');
expect(/document:\s*0/.test(lifecycle) && /route:\s*0/.test(lifecycle), 'Navigation minimum durations must remain zero.');
expect(/MIN_VISIBLE_MS\s*=\s*0/.test(preloader), 'Document preloader minimum duration must remain zero.');

[
  '/index.html', '/mensagens.html', '/notificacoes.html', '/pedidos.html',
  '/carteira.html', '/resultados.html', '/detalhe-anuncio.html',
  '/pagamento-profissional.html', '/meu-perfil.html', '/perfil-cliente.html',
  '/perfil-profissional.html', '/comunidade.html'
].forEach((route) => expect(router.includes(`'${route}'`), `Stable shell direct hydration route missing: ${route}`));

const hardLoadControllers = [
  'assets/js/pages/mensagens.js', 'assets/js/pages/notificacoes.js',
  'assets/js/pages/pedidos.js', 'assets/js/pages/carteira.js',
  'assets/js/pages/search-results.js', 'assets/js/pages/detalhe-anuncio-data-controller.js',
  'assets/js/pages/pagamento-profissional.js', 'assets/js/pages/owner-profile-experience.js',
  'assets/js/pages/client-profile-experience.js', 'assets/js/pages/professional-profile-experience.js'
];
hardLoadControllers.forEach((file) => {
  const source = read(file);
  expect(/skeletonMode:\s*'hard-load'/.test(source), `${file} must use hard-load skeleton policy.`);
  expect(/preserveReadyDuringHydration:\s*true/.test(source), `${file} must preserve ready content during hydration.`);
});

if (failures.length) {
  console.error('[final-loading-baseline] FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[final-loading-baseline] PASS');
console.log(`- hard-load controllers validated: ${hardLoadControllers.length}`);
console.log('- static Home controls, zero artificial latency, hidden authority and stable-shell route policy locked');
