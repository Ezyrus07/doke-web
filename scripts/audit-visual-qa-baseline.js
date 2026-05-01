#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'docs/visual-baseline/README.md',
  'docs/visual-baseline/visual-qa-manifest.json',
  'tests/visual/stage28-page-baseline.spec.js',
  'tests/e2e/stage28-regression-guards.spec.js',
  'playwright.config.js',
];

let failed = false;
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`Missing required visual QA file: ${file}`);
    failed = true;
  }
}

const manifestPath = path.join(root, 'docs/visual-baseline/visual-qa-manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest.pages) || manifest.pages.length < 10) {
    console.error('Visual QA manifest must include the 10 principal pages.');
    failed = true;
  }
  if (!Array.isArray(manifest.viewports) || manifest.viewports.length < 4) {
    console.error('Visual QA manifest must include mobile and desktop viewports.');
    failed = true;
  }
  for (const entry of manifest.pages || []) {
    if (!entry.path || !fs.existsSync(path.join(root, entry.path))) {
      console.error(`Manifest page not found: ${entry.path}`);
      failed = true;
    }
  }
}

const pkgPath = path.join(root, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = pkg.scripts || {};
  for (const scriptName of ['visual:baseline', 'visual:qa', 'audit:visual-baseline']) {
    if (!scripts[scriptName]) {
      console.error(`Missing package script: ${scriptName}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('Visual QA baseline audit passed.');
