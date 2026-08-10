'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const source = read('assets/css/components/shell/tablet-internal-rail-contract.css');
const startMarker = '@media (min-width: 561px) and (max-width: 760px) {';
const endMarker = '/*\n * Internal app header — global tablet portrait contract.';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
assert.ok(start >= 0, 'small-tablet authority start must exist');
assert.ok(end > start, 'small-tablet authority end must follow its start');
const segment = source.slice(start, end);

assert.strictEqual((segment.match(/margin-block:\s*0 28px !important;/g) || []).length, 1, 'small-tablet header must use zero external top margin exactly once');
assert.strictEqual((segment.match(/padding:\s*11px 0 !important;/g) || []).length, 1, 'small-tablet header must use the canonical 11px internal vertical inset exactly once');
assert.strictEqual((segment.match(/margin-block:\s*24px 28px !important;/g) || []).length, 0, 'legacy 24px external top margin must be absent from the small-tablet authority');

const manifests = [
  'assets/css/pages/pedidos-runtime-page.css',
  'assets/css/pages/notificacoes-foundation.css',
  'assets/css/pages/carteira-runtime-page.css',
];
for (const file of manifests) {
  const css = read(file);
  const scoped = css.match(/@import url\("\.\.\/components\/shell\/tablet-internal-rail-contract\.css\?[^"]+"\) screen and \(max-width: 760px\);/g) || [];
  const unscoped = css.match(/@import url\("\.\.\/components\/shell\/tablet-internal-rail-contract\.css\?[^"]+"\);/g) || [];
  assert.strictEqual(scoped.length, 1, `${file} must keep the quarantined contract scoped to <=760px exactly once`);
  assert.strictEqual(unscoped.length, 0, `${file} must not restore an unscoped quarantined import`);
}

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 897, 'responsive checks must remain exactly 897');
  assert.strictEqual(report.summary.failures, 4, 'responsive failures must reduce exactly 7 -> 4');
  assert.strictEqual(report.summary.skips, 276, 'responsive skips must remain exactly 276');
  assert.deepStrictEqual(report.summary.failuresByPage, { 'detalhe-anuncio.html': 4 }, 'only the four Detail residuals may remain');
  const failures = report.failures || [];
  assert.strictEqual(failures.length, 4, 'exactly four residual failure rows must remain');
  const breakpoints = [];
  for (const failure of failures) {
    assert.strictEqual(failure.page, 'detalhe-anuncio.html', 'every residual must belong to Detail');
    assert.strictEqual(failure.component, 'search/back equivalent button', 'every residual must be the Detail back/search-equivalent control');
    assert.strictEqual(failure.property, 'box.x', 'every residual must be the proven horizontal offset');
    breakpoints.push(failure.breakpoint);
  }
  breakpoints.sort();
  assert.deepStrictEqual(breakpoints, ['1280x802', '1366x768', '608x926', '820x1180'], 'Detail residual breakpoints must remain exactly the proven four');
  for (const page of ['pedidos.html', 'notificacoes.html', 'carteira.html']) {
    const pageFailures = failures.filter((failure) => failure.page === page);
    assert.strictEqual(pageFailures.length, 0, `${page} must have zero residual failures`);
  }
}

console.log('[ux-resp-debt-006] small-tablet internal header inset parity proof passed');
