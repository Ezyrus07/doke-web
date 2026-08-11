'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = path.resolve(__dirname, '..');
const legacyContract = 'assets/css/components/shell/tablet-internal-rail-contract.css';
const legacyNeedle = 'tablet-internal-rail-contract.css';
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

assert.ok(!fs.existsSync(path.join(root, legacyContract)), 'retired tablet rail contract must not exist');

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
  .filter((file) => fs.readFileSync(file, 'utf8').includes(legacyNeedle))
  .map((file) => path.relative(root, file).replaceAll(path.sep, '/'));
assert.deepStrictEqual(staleReferences, [], 'no CSS source may reference the retired tablet rail contract');

for (const page of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
  const assets = getLoadedCssAssets(read(page), root);
  assert.ok(!assets.includes(legacyContract), `${page} must not resolve the retired tablet rail contract`);
}

const messages = read('assets/css/pages/mensagens/tablet-portrait-thread-contract.css');
assert.ok(!messages.includes(legacyNeedle), 'Messages documentation must not point to the retired authority');
assert.ok(messages.includes('layout/page-rail-authority.css'), 'Messages must document canonical rail authority');
assert.ok(messages.includes('layout/header.css'), 'Messages must document canonical app-header authority');

const internalFoundation = read('assets/css/pages/internal-foundation.css');
assert.ok(internalFoundation.includes('@import url("../layout/page-rail-authority.css'), 'internal foundation must load canonical page rail authority');
assert.ok(internalFoundation.includes('@import url("../layout/header.css'), 'internal foundation must load canonical header authority');

const reportPath = path.join(root, 'reports', 'responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 893, 'responsive contract must preserve exactly 893 checks');
  assert.strictEqual(report.summary.failures, 0, 'responsive contract must preserve zero failures');
  assert.strictEqual(report.summary.skips, 277, 'responsive contract must preserve exactly 277 skips');
  assert.deepStrictEqual(report.summary.failuresByPage, {}, 'no responsive page failures may be introduced');
  assert.deepStrictEqual(report.summary.failuresByComponent, {}, 'no responsive component failures may be introduced');
}

console.log('[ux-resp-debt-010] dormant tablet rail retirement proof passed');
