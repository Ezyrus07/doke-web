#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'playwright.config.js',
  'docs/visual-baseline/critical-pages-baseline.json',
  'tests/visual/critical-pages-baseline.spec.js',
];

let failed = false;
const report = {
  cycle: 'global-cycle-54',
  checkedAt: new Date().toISOString(),
  requiredFiles: [],
  pages: [],
  viewports: [],
  packageScripts: [],
  errors: [],
};

function fail(message) {
  report.errors.push(message);
  console.error(message);
  failed = true;
}

for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(root, file));
  report.requiredFiles.push({ file, exists });
  if (!exists) fail(`Missing required file: ${file}`);
}

const manifestPath = path.join(root, 'docs/visual-baseline/critical-pages-baseline.json');
let manifest = null;
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in critical-pages-baseline.json: ${error.message}`);
  }
}

if (manifest) {
  if (!Array.isArray(manifest.pages) || manifest.pages.length !== 3) {
    fail('Critical visual baseline must include exactly index, resultados and perfil.');
  }

  const expectedPages = ['index.html', 'resultados.html', 'perfil.html'];
  const actualPages = (manifest.pages || []).map((entry) => entry.path);
  for (const expected of expectedPages) {
    if (!actualPages.includes(expected)) fail(`Manifest missing critical page: ${expected}`);
  }

  for (const pageEntry of manifest.pages || []) {
    const exists = Boolean(pageEntry.path && fs.existsSync(path.join(root, pageEntry.path)));
    const hasKey = Boolean(pageEntry.key);
    const hasMustKeep = Array.isArray(pageEntry.mustKeep) && pageEntry.mustKeep.length >= 4;
    report.pages.push({ path: pageEntry.path, key: pageEntry.key, exists, hasMustKeep });
    if (!exists) fail(`Critical page does not exist: ${pageEntry.path}`);
    if (!hasKey) fail(`Critical page missing key: ${pageEntry.path || '(unknown)'}`);
    if (!hasMustKeep) fail(`Critical page needs at least 4 mustKeep baseline notes: ${pageEntry.path}`);
  }

  if (!Array.isArray(manifest.viewports) || manifest.viewports.length < 4) {
    fail('Critical visual baseline must include at least 4 viewports.');
  }

  const viewportKinds = new Set((manifest.viewports || []).map((entry) => entry.kind));
  if (!viewportKinds.has('mobile')) fail('Critical visual baseline needs mobile viewports.');
  if (!viewportKinds.has('desktop')) fail('Critical visual baseline needs desktop viewports.');

  for (const viewport of manifest.viewports || []) {
    const valid = Boolean(viewport.name && viewport.width >= 320 && viewport.height >= 600 && viewport.kind);
    report.viewports.push({ name: viewport.name, width: viewport.width, height: viewport.height, kind: viewport.kind, valid });
    if (!valid) fail(`Invalid viewport entry: ${JSON.stringify(viewport)}`);
  }
}

const specPath = path.join(root, 'tests/visual/critical-pages-baseline.spec.js');
if (fs.existsSync(specPath)) {
  const spec = fs.readFileSync(specPath, 'utf8');
  const requiredSpecTokens = [
    'critical-pages-baseline.json',
    'toHaveScreenshot',
    'maxDiffPixelRatio',
    'waitForStablePage',
  ];
  for (const token of requiredSpecTokens) {
    if (!spec.includes(token)) fail(`Visual baseline spec missing token: ${token}`);
  }
}

const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  const requiredScripts = {
    'audit:critical-visual-baseline': 'node scripts/audit-critical-visual-baseline.js',
    'visual:critical-baseline': 'playwright test tests/visual/critical-pages-baseline.spec.js --update-snapshots',
    'visual:critical-check': 'playwright test tests/visual/critical-pages-baseline.spec.js',
  };

  for (const [name, expectedCommand] of Object.entries(requiredScripts)) {
    const actualCommand = scripts[name];
    report.packageScripts.push({ name, exists: Boolean(actualCommand), command: actualCommand || null });
    if (!actualCommand) fail(`Missing package script: ${name}`);
    if (actualCommand && actualCommand !== expectedCommand) {
      fail(`Package script ${name} has unexpected command: ${actualCommand}`);
    }
  }
}

const validationDir = path.join(root, 'docs/validation');
fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(
  path.join(validationDir, 'global-cycle-54-critical-visual-baseline-report.json'),
  JSON.stringify(report, null, 2)
);

if (failed) process.exit(1);
console.log('Critical visual baseline audit passed.');
