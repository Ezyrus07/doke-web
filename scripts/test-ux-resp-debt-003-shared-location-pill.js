#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const headerPath = path.join(rootDir, 'assets/css/layout/header.css');
const reportPath = path.join(rootDir, 'reports/responsive-contract-test-report.json');

assert.ok(fs.existsSync(headerPath), 'shared header authority must exist');
assert.ok(fs.existsSync(reportPath), 'responsive contract report must exist before UX-RESP-DEBT-003 validation');

const header = fs.readFileSync(headerPath, 'utf8');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const mediaStart = '@media (min-width: 561px) and (max-width: 760px) {';
const mediaEnd = '/* Tablet drawer trigger boundary.';
const start = header.indexOf(mediaStart);
const end = header.indexOf(mediaEnd, start);

assert.ok(start >= 0, '561–760 shared header media boundary must exist');
assert.ok(end > start, 'tablet drawer boundary must follow the 561–760 header authority');

const tabletBlock = header.slice(start, end);
assert.match(
  tabletBlock,
  /body\[data-page\]\.has-global-header\s*\{[^}]*--doke-header-location-width-tablet:\s*min\(176px,\s*34vw\);/,
  'location width token must be shared by all global-header pages at 561–760',
);
assert.match(
  tabletBlock,
  /body\[data-page\]\.has-global-header\s+\.app-header\s+\.home-side-meta__location\s*\{[^}]*inline-size:\s*var\(--doke-header-location-width-tablet\);[^}]*width:\s*var\(--doke-header-location-width-tablet\);[^}]*min-inline-size:\s*var\(--doke-header-location-width-tablet\);[^}]*max-inline-size:\s*var\(--doke-header-location-width-tablet\);[^}]*flex:\s*0\s+1\s+var\(--doke-header-location-width-tablet\);/,
  'shared location pill must own width/min/max/flex geometry at 561–760',
);
assert.doesNotMatch(
  tabletBlock,
  /body\[data-page="home"\]\.has-global-header\s*\{[^}]*--doke-header-location-width-tablet:/,
  'home-only frame tokens must no longer own the shared location width token',
);
assert.match(
  tabletBlock,
  /body\[data-page="home"\]\.has-global-header\s*\{[^}]*--doke-header-height:\s*66px;[^}]*--doke-header-control-size:\s*42px;[^}]*--doke-header-profile-height:\s*46px;[^}]*--doke-header-avatar-size:\s*36px;/,
  'home-only frame geometry must remain scoped to home',
);
assert.match(
  tabletBlock,
  /body\[data-page="home"\]\.has-global-header\s+\.app-header\s+\.home-side-meta__location\s*\{[^}]*display:\s*inline-flex;[^}]*justify-content:\s*center;[^}]*overflow:\s*hidden;/,
  'home-only presentation behavior must remain scoped to home',
);
assert.doesNotMatch(
  tabletBlock,
  /body\[data-page\]\.has-global-header\s+\.app-header\s+\.home-side-meta__location\s*\{[^}]*(?:display:\s*none|visibility:\s*hidden)/,
  'shared width promotion must not change location visibility',
);

assert.equal(report.summary.checks, 897, 'responsive check count must stay identical to certified #118');
assert.equal(report.summary.failures, 72, 'UX-RESP-DEBT-003 must reduce repository failures from 75 to exactly 72');
assert.equal(report.summary.skips, 276, 'responsive skip count must stay identical to certified #118');

const expectedByPage = {
  'detalhe-anuncio.html': 15,
  'perfil.html': 12,
  'resultados.html': 12,
  'pedidos.html': 7,
  'mensagens.html': 2,
  'notificacoes.html': 7,
  'comunidade.html': 10,
  'carteira.html': 7,
};
assert.deepStrictEqual(
  report.summary.failuresByPage,
  expectedByPage,
  'only Ajuda, Perfil and Resultados may lose the three proven location-width failures',
);

const expectedByComponent = {
  'search/back equivalent button': 19,
  'app-header': 15,
  'app-header__inner': 15,
  'home-side-meta__profile': 16,
  'home-side-meta__location': 4,
  'avatar': 3,
};
assert.deepStrictEqual(
  report.summary.failuresByComponent,
  expectedByComponent,
  'location component debt must reduce from seven to exactly four failures',
);

const byBreakpoint = {};
for (const failure of report.failures) {
  byBreakpoint[failure.breakpoint] = (byBreakpoint[failure.breakpoint] || 0) + 1;
}
assert.deepStrictEqual(
  byBreakpoint,
  { '1366x768': 1, '1280x802': 1, '820x1180': 19, '608x926': 51 },
  'breakpoint debt must match the proven shared-location authority reduction',
);

const helpFailures = report.failures.filter(failure => failure.page === 'ajuda.html');
assert.equal(helpFailures.length, 0, 'Ajuda must have zero remaining responsive failures after shared authority promotion');

console.log('[ux-resp-debt-003] shared tablet location pill authority contract passed');
console.log(JSON.stringify({
  checks: report.summary.checks,
  failures: report.summary.failures,
  skips: report.summary.skips,
  helpFailures: helpFailures.length,
  locationFailures: report.summary.failuresByComponent['home-side-meta__location'],
}));
