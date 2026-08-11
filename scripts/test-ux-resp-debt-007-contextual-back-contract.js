'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scripts/test-responsive-contract.js'), 'utf8');

assert.ok(source.includes("key: 'search equivalent button'"), 'search must have its own responsive contract');
assert.ok(source.includes("pageSelector: '.home-side-meta__search'"), 'search contract must select only search');
assert.ok(source.includes("key: 'contextual back control'"), 'contextual back must have its own responsive contract');
assert.ok(source.includes("pageSelector: '.detail-standard-topbar__back[data-header-context]'"), 'back contract must select the contextual Detail back control');
assert.ok(source.includes("metrics: ['box.y', 'box.width', 'box.height', 'visual.borderRadius', 'spacing.padding.left', 'spacing.padding.right']"), 'back contract must preserve vertical/size/shape/padding coverage');

const backStart = source.indexOf("key: 'contextual back control'");
const backEnd = source.indexOf("  },", backStart);
assert.ok(backStart >= 0, 'back contract start must exist');
assert.ok(backEnd > backStart, 'back contract end must follow start');
const backSegment = source.slice(backStart, backEnd);
assert.ok(!backSegment.includes("'box.x'"), 'contextual back contract must not require the search slot horizontal coordinate');

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 893, 'semantic responsive contract must execute exactly 893 valid checks');
  assert.strictEqual(report.summary.failures, 0, 'semantic responsive contract must have zero failures');
  assert.strictEqual(report.summary.skips, 277, 'semantic responsive contract must report exactly 277 informative skips');
  assert.deepStrictEqual(report.summary.failuresByPage, {}, 'no responsive page failures may remain');
  assert.deepStrictEqual(report.summary.failuresByComponent, {}, 'no responsive component failures may remain');
}

console.log('[ux-resp-debt-007] contextual back contract semantics proof passed');
