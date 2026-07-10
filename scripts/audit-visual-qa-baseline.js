#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'tests/visual/visual-regression.manifest.json',
  'tests/visual/doke-visual-regression.spec.js',
  'tests/e2e/stage28-regression-guards.spec.js',
  'scripts/serve-static-site.js',
  'playwright.config.js',
];

const requiredScripts = [
  'audit:visual-baseline',
  'visual:baseline',
  'visual:qa',
  'validate:visual',
];

const requiredPages = [
  'index.html',
  'perfil.html',
  'pedidos.html',
  'mensagens.html',
  'notificacoes.html',
  'comunidade.html',
  'resultados.html',
  'detalhe-anuncio.html',
  'ajuda.html',
];

const requiredViewports = new Set([
  'desktop-1366x768',
  'tablet-820x1180',
  'mobile-390x844',
]);

let failed = false;
function fail(message) {
  console.error(message);
  failed = true;
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`Missing required visual QA file: ${file}`);
  }
}

const manifestPath = path.join(root, 'tests/visual/visual-regression.manifest.json');
if (fs.existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`Visual QA manifest is not valid JSON: ${error.message}`);
  }

  if (manifest) {
    const pages = manifest.pages || [];
    const viewports = manifest.viewports || [];
    const pagePaths = new Set(pages.map((entry) => entry.path));
    const viewportNames = new Set(viewports.map((entry) => entry.name));

    if (pages.length < requiredPages.length) {
      fail(`Visual QA manifest must include at least ${requiredPages.length} principal pages.`);
    }

    for (const pagePath of requiredPages) {
      if (!pagePaths.has(pagePath)) {
        fail(`Visual QA manifest is missing page: ${pagePath}`);
      }
      if (!fs.existsSync(path.join(root, pagePath))) {
        fail(`Manifest page not found on disk: ${pagePath}`);
      }
    }

    for (const pageEntry of pages) {
      if (!pageEntry.expectedDataPage) {
        fail(`Manifest page needs expectedDataPage: ${pageEntry.path || '<unknown>'}`);
      }
    }

    const viewportDimensions = new Set(viewports.map((entry) => `${entry.width}x${entry.height}`));
    for (const viewportName of requiredViewports) {
      const expectedDimensions = viewportName.replace(/^[^-]+-/, '');
      if (!viewportNames.has(viewportName) && !viewportDimensions.has(expectedDimensions)) {
        fail(`Visual QA manifest is missing viewport: ${viewportName}`);
      }
    }
  }
}

const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  for (const scriptName of requiredScripts) {
    if (!scripts[scriptName]) {
      fail(`Missing package script: ${scriptName}`);
    }
  }
}

if (failed) process.exit(1);
console.log('Visual QA baseline audit passed.');
