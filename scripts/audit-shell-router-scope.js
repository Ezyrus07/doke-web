#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appPath = path.join(root, 'assets/js/core/app.js');
const runtimePath = path.join(root, 'assets/js/core/runtime-config.js');
const flagsPath = path.join(root, 'assets/js/core/feature-flags.js');
const reportPath = path.join(root, 'docs/validation/global-cycle-164-shell-router-scope-report.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const app = read(appPath);
const runtime = read(runtimePath);
const flags = read(flagsPath);

const checks = [
  {
    id: 'instant-shell-navigation-enabled',
    passed: /instantShellNavigation:\s*true/.test(runtime),
    detail: 'A navegação interna rápida permanece habilitada por flag explícita.'
  },
  {
    id: 'flag-aliases-present',
    passed: /instantNavigation['"]?\s*:\s*['"]instantShellNavigation/.test(flags) && /shellNavigation['"]?\s*:\s*['"]instantShellNavigation/.test(flags) && /routeSwap['"]?\s*:\s*['"]instantShellNavigation/.test(flags),
    detail: 'Aliases de controle da navegação instantânea existem.'
  },
  {
    id: 'router-checks-app-shell',
    passed: /nextDoc\.querySelector\("\.app-shell"\)/.test(app) && /document\.querySelector\("\.app-shell"\)/.test(app),
    detail: 'O router busca o shell completo do documento atual e do documento de destino.'
  },
  {
    id: 'router-swaps-app-shell',
    passed: /currentShell\.replaceWith\(nextShellNode\)/.test(app),
    detail: 'O router troca o .app-shell completo para manter header e conteúdo sincronizados.'
  },
  {
    id: 'router-preserves-live-sidebar',
    passed: /currentShell\.querySelector\(":scope > \.sidebar"\)/.test(app) && /nextSidebar\.replaceWith\(currentSidebar\)/.test(app),
    detail: 'O router preserva o nó vivo da sidebar para evitar sensação de recarregamento do menu.'
  },
  {
    id: 'router-does-not-page-only-swap',
    passed: !/currentPage\.replaceWith\(nextPageNode\)/.test(app),
    detail: 'O router não faz mais swap isolado de .page.'
  },
  {
    id: 'router-keeps-native-bypass-flag',
    passed: /if \(!isInstantShellNavigationEnabled\(\)\) return true;/.test(app),
    detail: 'A navegação instantânea ainda pode ser desativada via flag para diagnóstico.'
  }
];

const report = {
  cycle: 164,
  name: 'Shell router scope',
  status: checks.every((check) => check.passed) ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  checks
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (report.status !== 'passed') {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`[global-cycle-164] ${report.status}`);
