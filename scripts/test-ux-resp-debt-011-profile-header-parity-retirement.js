'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = path.resolve(__dirname, '..');
const retired = 'assets/css/components/navigation/profile-header-index-parity.css';
const needle = 'profile-header-index-parity.css';
const profileFoundationPath = 'assets/css/pages/profile-foundation.css';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

assert.ok(!fs.existsSync(path.join(root, retired)), 'retired profile header parity shim must not exist');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const cssFiles = walk(path.join(root, 'assets', 'css')).filter((file) => file.endsWith('.css'));
const staleReferences = cssFiles
  .filter((file) => fs.readFileSync(file, 'utf8').includes(needle))
  .map((file) => path.relative(root, file).replaceAll(path.sep, '/'));
assert.deepStrictEqual(staleReferences, [], 'no CSS source may reference the retired profile parity shim');

for (const page of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
  const assets = getLoadedCssAssets(read(page), root);
  assert.ok(!assets.includes(retired), `${page} must not resolve the retired profile parity shim`);
}

const profileFoundation = read(profileFoundationPath);
assert.ok(!profileFoundation.includes(needle), 'profile foundation must not import the retired parity shim');
assert.ok(profileFoundation.includes('@import url("../layout/header.css'), 'profile foundation must retain canonical header authority');

const topbar = read('assets/css/core/layout/topbar.css');
const profileDropdownBlock = topbar.match(/\.profile-dropdown\s*\{([\s\S]*?)\}/);
assert.ok(profileDropdownBlock, 'shared .profile-dropdown authority must exist');
assert.match(profileDropdownBlock[1], /z-index:\s*80\s*;/, 'shared profile dropdown authority must remain z-index 80');

const legacyReportPath = path.join(root, 'reports', 'generated', 'active-legacy-structures-report.json');
if (fs.existsSync(legacyReportPath)) {
  const report = JSON.parse(fs.readFileSync(legacyReportPath, 'utf8'));
  assert.strictEqual(report.totals.activeLegacyCss, 0, 'active legacy CSS must be reduced to zero');
  assert.strictEqual(report.totals.activeLegacyJs, 1, 'independent community legacy JS debt must remain untouched');
  assert.strictEqual(report.totals.cssFiles, 533, 'exactly one physical CSS file must be retired');
  assert.strictEqual(report.totals.activeOrImportedCss, 401, 'exactly one active/imported CSS file must be retired');
}

const responsiveReportPath = path.join(root, 'reports', 'responsive-contract-test-report.json');
if (fs.existsSync(responsiveReportPath)) {
  const report = JSON.parse(fs.readFileSync(responsiveReportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 893, 'responsive contract must preserve exactly 893 checks');
  assert.strictEqual(report.summary.failures, 0, 'responsive contract must preserve zero failures');
  assert.strictEqual(report.summary.skips, 277, 'responsive contract must preserve exactly 277 skips');
  assert.deepStrictEqual(report.summary.failuresByPage, {}, 'no responsive page failures may be introduced');
  assert.deepStrictEqual(report.summary.failuresByComponent, {}, 'no responsive component failures may be introduced');
}

console.log('[ux-resp-debt-011] obsolete profile header parity shim retirement proof passed');
