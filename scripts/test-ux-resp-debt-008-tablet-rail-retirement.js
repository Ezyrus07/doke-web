'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = path.resolve(__dirname, '..');
const target = 'assets/css/components/shell/tablet-internal-rail-contract.css';
const targetPath = path.join(root, target);

function normalize(file) {
  return file.replace(/\\/g, '/').replace(/^\.\//, '').split('?')[0];
}

function listFiles(dir, extension) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const out = [];
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = normalize(path.join(dir, entry.name));
    if (entry.isDirectory()) out.push(...listFiles(relative, extension));
    else if (entry.isFile() && entry.name.endsWith(extension)) out.push(relative);
  }
  return out;
}

assert.ok(fs.existsSync(targetPath), 'retired tablet rail path must remain as a tombstone');
const source = fs.readFileSync(targetPath, 'utf8');
const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').trim();
assert.strictEqual(withoutComments, '', 'retired tablet rail tombstone must not contain active CSS');
assert.strictEqual((source.match(/!important/g) || []).length, 0, 'retired tablet rail tombstone must contain zero !important declarations');
assert.ok(source.includes('retired tablet internal rail contract'), 'tombstone must declare the retired contract explicitly');
assert.ok(source.includes('desktop-page-rail-authority.css'), 'tombstone must point to canonical rail authority');
assert.ok(source.includes('shared-page-width-contract.css'), 'tombstone must point to shared width authority');
assert.ok(source.includes('assets/css/layout/header.css'), 'tombstone must point to canonical header authority');

const rootHtml = fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
const loadedCss = new Set();
for (const page of rootHtml) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  for (const asset of getLoadedCssAssets(html, root)) loadedCss.add(normalize(asset));
}
assert.ok(!loadedCss.has(target), 'retired tablet rail path must remain outside the active CSS graph');

for (const file of listFiles('assets/js', '.js')) {
  const js = fs.readFileSync(path.join(root, file), 'utf8');
  assert.ok(!js.includes(target), `runtime JS must not reference retired tablet rail path: ${file}`);
}
for (const page of rootHtml) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.ok(!html.includes(target), `active root HTML must not reference retired tablet rail path: ${page}`);
}

const deprecatedDoc = fs.readFileSync(path.join(root, 'docs/DEPRECATED-CSS.md'), 'utf8');
assert.ok(deprecatedDoc.includes(target), 'retired tablet rail path must remain documented in DEPRECATED-CSS');

const register = JSON.parse(fs.readFileSync(path.join(root, 'config/important-debt-register.json'), 'utf8'));
const item = (register.items || []).find((entry) => normalize(entry.file) === target);
assert.ok(item, 'historical important-debt entry must remain until a separate registry reconciliation lot');
assert.strictEqual(item.status, 'registered', 'historical debt entry must not be silently reclassified in this lot');
assert.ok(Number(item.maxAllowed) >= 428, 'historical debt budget must preserve the pre-retirement ceiling for traceability');

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 893, 'responsive contract must preserve exactly 893 valid checks');
  assert.strictEqual(report.summary.failures, 0, 'responsive contract must preserve zero failures');
  assert.strictEqual(report.summary.skips, 277, 'responsive contract must preserve exactly 277 informative skips');
  assert.deepStrictEqual(report.summary.failuresByPage, {}, 'no responsive page failures may appear');
  assert.deepStrictEqual(report.summary.failuresByComponent, {}, 'no responsive component failures may appear');
}

console.log('[ux-resp-debt-008] dormant tablet rail retirement proof passed');
