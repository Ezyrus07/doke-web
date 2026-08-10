'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const manifests = [
  'assets/css/pages/pedidos-runtime-page.css',
  'assets/css/pages/notificacoes-foundation.css',
  'assets/css/pages/carteira-runtime-page.css',
];

for (const file of manifests) {
  const css = read(file);
  const scoped = css.match(/@import url\("\.\.\/components\/shell\/tablet-internal-rail-contract\.css\?[^\"]+"\) screen and \(max-width: 760px\);/g) || [];
  const unscoped = css.match(/@import url\("\.\.\/components\/shell\/tablet-internal-rail-contract\.css\?[^\"]+"\);/g) || [];
  assert.strictEqual(scoped.length, 1, `${file} must scope the quarantined tablet contract to <=760px exactly once`);
  assert.strictEqual(unscoped.length, 0, `${file} must not load the quarantined tablet contract without a media scope`);
}

const header = read('assets/css/layout/header.css');
const marker = '/* UX-RESP-DEBT-005 — contextual portrait tablet visibility authority. */';
assert.ok(header.includes(marker), 'canonical header authority marker must exist');
const bridgeStart = header.indexOf(marker);
assert.ok(bridgeStart >= 0, 'contextual tablet bridge must have a start');
const bridge = header.slice(bridgeStart);
assert.ok(bridge.includes('@media (min-width: 768px) and (max-width: 899px) and (orientation: portrait)'), 'contextual bridge must be limited to 768-899 portrait');
assert.ok(bridge.includes('.orders-page-shell, .notifications-page-shell, .wallet-page-shell'), 'contextual bridge must cover the three proven page families');
assert.ok(bridge.includes('display: flex;'), 'contextual header must remain measurable at tablet portrait');
assert.ok(bridge.includes('visibility: visible;'), 'contextual header visibility must be explicit');
assert.ok(!bridge.includes('96px'), 'canonical visibility bridge must not reintroduce the legacy 96px geometry');
assert.ok(!bridge.includes('!important'), 'canonical visibility bridge must not depend on forced priority');

const wallet = read('assets/css/pages/carteira/responsive-contract.css');
const obsoleteWalletHeader = /body\[data-page="carteira"\]\.has-global-header\s*>\s*\.app-shell\s*>\s*\.page\s*>\s*\.app-header\.app-header--wallet\s*\{[^}]*height:\s*96px;[^}]*padding:\s*20px 0 10px;[^}]*\}/s;
assert.ok(!obsoleteWalletHeader.test(wallet), 'wallet must not retain the obsolete 96px outer tablet header block');

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
if (fs.existsSync(reportPath)) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.checks, 897, 'responsive checks must remain exactly 897');
  assert.strictEqual(report.summary.failures, 7, 'responsive residual must remain exactly 7');
  assert.strictEqual(report.summary.skips, 276, 'responsive skips must remain exactly 276');

  const expected = new Map([
    ['detalhe-anuncio.html', 4],
    ['pedidos.html', 1],
    ['notificacoes.html', 1],
    ['carteira.html', 1],
  ]);
  const actual = new Map();
  for (const failure of report.failures || []) {
    actual.set(failure.page, (actual.get(failure.page) || 0) + 1);
    if (['pedidos.html', 'notificacoes.html', 'carteira.html'].includes(failure.page)) {
      assert.strictEqual(failure.breakpoint, '608x926', `${failure.page} may retain only the proven 608 residual`);
      assert.strictEqual(failure.component, 'home-side-meta__profile', `${failure.page} residual component drifted`);
      assert.strictEqual(failure.property, 'box.y', `${failure.page} residual property drifted`);
    }
  }
  assert.deepStrictEqual([...actual.entries()].sort(), [...expected.entries()].sort(), 'responsive residual distribution drifted');
}

console.log('[ux-resp-debt-005] contextual tablet header authority proof passed');
