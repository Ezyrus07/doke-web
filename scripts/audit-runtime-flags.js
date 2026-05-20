#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html'
];

const requiredFiles = [
  'assets/js/core/runtime-config.js',
  'assets/js/core/feature-flags.js',
  'assets/js/core/rollout-guard.js'
];

const requiredMarkers = [
  ['assets/js/components/mobile-app-shell.js', 'shouldRun(\'mobileAppShell\')'],
  ['assets/js/controllers/controller-bootstrap.js', 'shouldRun(\'controllerBootstrap\')'],
  ['assets/js/controllers/controller-data.js', 'shouldRun(\'mockDataControllers\')'],
  ['assets/js/core/page-bootstrap.js', 'shouldRun(\'authSessionBootstrap\')']
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing runtime flag file: ${file}`);
}

for (const page of pages) {
  const filePath = path.join(root, page);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing page: ${page}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const runtimeIndex = html.indexOf('assets/js/core/runtime-config.js');
  const flagsIndex = html.indexOf('assets/js/core/feature-flags.js');
  const guardIndex = html.indexOf('assets/js/core/rollout-guard.js');
  const appStateIndex = html.indexOf('assets/js/core/app-state.js');
  if (runtimeIndex === -1) failures.push(`${page}: runtime-config.js is not loaded`);
  if (flagsIndex === -1) failures.push(`${page}: feature-flags.js is not loaded`);
  if (guardIndex === -1) failures.push(`${page}: rollout-guard.js is not loaded`);
  if (appStateIndex === -1) failures.push(`${page}: app-state.js is not loaded`);
  if ([runtimeIndex, flagsIndex, guardIndex, appStateIndex].every((value) => value !== -1)) {
    if (!(runtimeIndex < flagsIndex && flagsIndex < guardIndex && guardIndex < appStateIndex)) {
      failures.push(`${page}: runtime flags must load before app-state.js in the order runtime -> flags -> guard`);
    }
  }
}

for (const [file, marker] of requiredMarkers) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing guarded file: ${file}`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(marker)) failures.push(`${file}: missing rollout guard marker ${marker}`);
}

if (failures.length) {
  console.error('Runtime flag audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Runtime flag audit passed.');
console.log(`Pages checked: ${pages.length}`);
console.log(`Guarded features: ${requiredMarkers.length}`);
