'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const legacyContract = 'assets/css/components/shell/tablet-internal-rail-contract.css';
const legacyImport = '@import url("../components/shell/tablet-internal-rail-contract.css?v=20260710-tablet-rail-authority-v1") screen and (max-width: 760px);';

const manifests = [
  'assets/css/pages/pedidos-runtime-page.css',
  'assets/css/pages/notificacoes-foundation.css',
  'assets/css/pages/carteira-runtime-page.css',
];

for (const manifest of manifests) {
  assert.ok(!read(manifest).includes(legacyImport), `${manifest} must not import the legacy tablet rail contract`);
}

assert.ok(fs.existsSync(path.join(root, legacyContract)), 'legacy tablet rail contract must remain physically present for other consumers');

const toolbar = read('assets/css/components/internal/list-page-toolbar.css');
const canonicalMobileHide = `@media (max-width: 560px) {
  body.orders-page-shell .home-side-meta,
  body.notifications-page-shell .home-side-meta,
  body.wallet-page-shell .home-side-meta {
    display: none;
  }
}`;
const staleSharedHide = `@media (max-width: 760px) {
  body.orders-page-shell .home-side-meta,
  body.notifications-page-shell .home-side-meta,
  body.wallet-page-shell .home-side-meta {
    display: none;
  }`;
assert.ok(toolbar.includes(canonicalMobileHide), 'whole-header suppression must be limited to the <=560px Mobile App Shell ownership range');
assert.ok(!toolbar.includes(staleSharedHide), 'shared toolbar must not suppress the canonical app header through 760px');
assert.ok(toolbar.includes('@media (max-width: 760px) {\n  .home-side-meta__search-form {'), 'compact search-form behavior must remain active through 760px');

const pedidos = read('assets/css/pages/pedidos.css');
assert.ok(!pedidos.includes('  body.orders-page-shell .home-side-meta {\n    display: none;\n  }\n\n'), 'pedidos must not keep a page-local whole-header suppressor through 760px');

const notificationsLayout = read('assets/css/pages/notificacoes/pedidos-notification-layout.css');
assert.ok(!notificationsLayout.includes('\n  body.notifications-page-shell .home-side-meta {\n    display: none;\n  }'), 'notifications must not keep a page-local whole-header suppressor through 760px');
assert.ok(notificationsLayout.includes('body.notifications-page-shell .orders-page-header__hero {\n    display: grid;\n  }'), 'notifications mobile hero behavior must remain intact');

for (const page of ['pedidos.html', 'notificacoes.html', 'carteira.html']) {
  const assets = getLoadedCssAssets(read(page), root);
  assert.strictEqual(
    assets.filter((asset) => asset === legacyContract).length,
    0,
    `${page} must not load the legacy tablet rail contract`,
  );
}

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 893, 'responsive contract must preserve exactly 893 checks');
  assert.strictEqual(report.summary.failures, 0, 'responsive contract must preserve zero failures');
  assert.strictEqual(report.summary.skips, 277, 'responsive contract must preserve exactly 277 skips');
  assert.deepStrictEqual(report.summary.failuresByPage, {}, 'no responsive page failures may be introduced');
  assert.deepStrictEqual(report.summary.failuresByComponent, {}, 'no responsive component failures may be introduced');
}

console.log('[ux-resp-debt-009] small-tablet app-header ownership proof passed');
