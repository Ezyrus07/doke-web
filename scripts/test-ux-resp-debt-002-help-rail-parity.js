#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const contractPath = path.join(rootDir, 'assets/css/pages/ajuda/responsive-rail-contract.css');
const manifestPath = path.join(rootDir, 'assets/css/pages/ajuda-foundation.css');
const reportPath = path.join(rootDir, 'reports/responsive-contract-test-report.json');

assert.ok(fs.existsSync(contractPath), 'Ajuda responsive rail contract must exist');
assert.ok(fs.existsSync(manifestPath), 'Ajuda foundation manifest must exist');
assert.ok(fs.existsSync(reportPath), 'responsive contract report must exist before UX-RESP-DEBT-002 validation');

const contract = fs.readFileSync(contractPath, 'utf8');
const manifest = fs.readFileSync(manifestPath, 'utf8');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const executableCss = contract.replace(/\/\*[\s\S]*?\*\//g, '');

assert.match(
  executableCss,
  /:root:has\(body\[data-page="ajuda"\]\)\s*\{[^}]*scrollbar-gutter:\s*auto;/,
  'Ajuda must neutralize the flow-only stable viewport gutter',
);
assert.match(
  executableCss,
  /@media\s*\(min-width:\s*561px\)\s*and\s*\(max-width:\s*760px\)/,
  'Ajuda rail variant must be scoped to the proven 561–760 boundary',
);
assert.match(
  executableCss,
  /body\[data-page="ajuda"\]\.internal-shell-page\.has-global-header\s*\{[^}]*--doke-rail-max:\s*var\(--doke-visual-rail-max,\s*1360px\);[^}]*--doke-header-height:\s*64px;/,
  'Ajuda must select the canonical rail/header variant with tokens only',
);
assert.doesNotMatch(
  executableCss,
  /\.(?:app-header|home-side-meta|detail-standard-topbar|topbar-profile)(?:\b|__|--)/,
  'Ajuda composition CSS must not take ownership of shared header component anatomy',
);

const importNeedle = '@import url("ajuda/responsive-rail-contract.css?v=20260810-ux-resp-debt-002-v1");';
assert.equal(manifest.split(importNeedle).length - 1, 1, 'Ajuda manifest must import the rail contract exactly once');
assert.ok(
  manifest.indexOf('@import url("../layout/header.css?v=20260715-control-elevation-scope-v1");') < manifest.indexOf(importNeedle),
  'Ajuda composition contract must load after the shared header authority without replacing it',
);

assert.equal(report.summary.checks, 897, 'responsive check count must stay identical to certified #116');
assert.equal(report.summary.failures, 75, 'UX-RESP-DEBT-002 must reduce repository failures from 98 to exactly 75');
assert.equal(report.summary.skips, 276, 'responsive skip count must stay identical to certified #116');

const expectedByPage = {
  'detalhe-anuncio.html': 15,
  'perfil.html': 13,
  'resultados.html': 13,
  'pedidos.html': 7,
  'mensagens.html': 2,
  'notificacoes.html': 7,
  'comunidade.html': 10,
  'carteira.html': 7,
  'ajuda.html': 1,
};
assert.deepStrictEqual(report.summary.failuresByPage, expectedByPage, 'only the proven 23 Ajuda failures may disappear');

const expectedByComponent = {
  'search/back equivalent button': 19,
  'app-header': 15,
  'app-header__inner': 15,
  'home-side-meta__profile': 16,
  'home-side-meta__location': 7,
  'avatar': 3,
};
assert.deepStrictEqual(report.summary.failuresByComponent, expectedByComponent, 'component debt must reduce only by the Ajuda rail/gutter cluster');

const byBreakpoint = {};
for (const failure of report.failures) {
  byBreakpoint[failure.breakpoint] = (byBreakpoint[failure.breakpoint] || 0) + 1;
}
assert.deepStrictEqual(
  byBreakpoint,
  { '1366x768': 1, '1280x802': 1, '820x1180': 19, '608x926': 54 },
  'breakpoint debt must match the proven UX-RESP-DEBT-002 reduction',
);

const helpFailures = report.failures.filter(failure => failure.page === 'ajuda.html');
assert.equal(helpFailures.length, 1, 'Ajuda must retain exactly one explicitly out-of-scope failure');
const residual = helpFailures[0];
assert.equal(residual.breakpoint, '608x926', 'Ajuda residual must remain isolated to 608x926');
assert.equal(residual.component, 'home-side-meta__location', 'Ajuda residual must remain the shared location pill authority gap');
assert.equal(residual.property, 'box.width', 'Ajuda residual must be the location pill width mismatch');
assert.equal(residual.expected, 176, 'Ajuda residual baseline width must remain 176px');
assert.ok(residual.actual > 178, 'Ajuda residual actual width must stay above the proven lower bound');
assert.ok(residual.actual < 179.5, 'Ajuda residual actual width must stay below the proven upper bound');

console.log('[ux-resp-debt-002] help viewport gutter and rail parity contract passed');
console.log(JSON.stringify({
  checks: report.summary.checks,
  failures: report.summary.failures,
  skips: report.summary.skips,
  helpFailures: helpFailures.length,
  residual: {
    breakpoint: residual.breakpoint,
    component: residual.component,
    property: residual.property,
    expected: residual.expected,
    actual: residual.actual,
  },
}));
