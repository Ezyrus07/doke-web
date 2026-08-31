#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const lifecycle = read('assets/js/core/navigation-lifecycle.js');
const preloader = read('assets/js/core/document-preloader.js');
const hydration = read('assets/js/core/page-hydration.js');
const router = read('assets/js/core/stable-shell-router.js');
const audit = read('scripts/audit-navigation-lifecycle-contract.js');
const contract = JSON.parse(read('config/navigation-lifecycle-contract.json'));

assert(lifecycle.includes("VISUAL_MINIMUMS = Object.freeze({ document: 0, route: 0, page: 0, guard: 0 })"), 'lifecycle: shared timing policy missing');
assert(lifecycle.includes('timing: Object.freeze'), 'lifecycle: timing API missing');
assert(lifecycle.includes('back: back'), 'lifecycle: canonical back helper missing');
assert(preloader.includes("lifecycle.timing.wait('document'"), 'preloader: minimum must delegate to shared timing');
assert(hydration.includes("lifecycle.timing.wait('page'"), 'hydration: minimum must delegate to shared timing');
assert(router.includes("lifecycle.timing.wait('route'"), 'router: visual threshold must delegate to shared timing');
assert(!/\bMIN_VISIBLE_MS\b/.test(preloader), 'preloader: independent minimum authority remains');
assert(!/\bROUTE_VISUAL_THRESHOLD_MS\b/.test(router), 'router: independent route threshold remains');
assert(!/splashDuration|syncSplash|document-boot/.test(hydration), 'hydration: document splash ownership remains');
assert(audit.includes('lifecycleTimingCentralized'), 'audit: shared timing verification missing');
assert(contract.stage === '09-guarded-form-pending-surfaces', 'config: stage 09 not declared');
assert(contract.stage08?.directInternalLocationMutations === 0, 'config: direct navigation debt not closed');
assert(contract.stage08?.pageHydrationOwnsDocumentSplash === false, 'config: document splash ownership not closed');

const directFiles = [
  'assets/js/components/mobile-app-shell.js',
  'assets/js/pages/anunciar-servico.js',
  'assets/js/pages/auth.js',
  'assets/js/pages/tornar-profissional.js'
];
for (const file of directFiles) {
  const source = read(file);
  assert(!/(?:window\.)?location\.(?:href\s*=|assign\s*\(|replace\s*\()\s*['"`](?:\.\.\/)?[^'"`]*\.html/.test(source), `${file}: direct internal document mutation remains`);
}

for (const file of ['auth/login.html', 'auth/cadastro.html']) {
  const html = read(file);
  const lifecycleIndex = html.indexOf('../assets/js/core/navigation-lifecycle.js');
  const authIndex = html.indexOf('../assets/js/pages/auth.js');
  assert(lifecycleIndex >= 0 && authIndex >= 0 && lifecycleIndex < authIndex, `${file}: lifecycle must load before auth controller`);
}

{
  const file = 'auth/esqueci-senha.html';
  const html = read(file);
  const lifecycleIndex = html.indexOf('../assets/js/core/navigation-lifecycle.js');
  const dedicatedAuthIndex = html.indexOf('../assets/js/pages/auth-password-pages.js');
  const legacyAuthIndex = html.indexOf('../assets/js/pages/auth.js');
  assert(lifecycleIndex >= 0 && dedicatedAuthIndex >= 0 && lifecycleIndex < dedicatedAuthIndex, `${file}: lifecycle must load before dedicated password controller`);
  assert(legacyAuthIndex < 0, `${file}: legacy auth controller must remain absent`);
}

for (const file of [
  'assets/js/pages/pedidos.js',
  'assets/js/pages/mensagens.js',
  'assets/js/pages/notificacoes.js',
  'assets/js/pages/pagamento-profissional.js',
  'assets/js/pages/professional-profile-experience.js'
]) {
  assert(!/splashDuration|splashSelectors?/.test(read(file)), `${file}: legacy page-owned document splash option remains`);
}

if (failures.length) {
  console.error('[navigation-lifecycle-finalization-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[navigation-lifecycle-finalization-contract] ok');
console.log('- direct internal navigation debt: 0');
console.log('- document, route and page timing share one visual cycle');
console.log('- document preloader is the sole global boot-surface owner');
console.log('- canonical back fallback and auth script ordering are enforced');
