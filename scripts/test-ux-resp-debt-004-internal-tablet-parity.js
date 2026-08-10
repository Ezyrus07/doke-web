#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/css/layout/page-rail-authority.css'), 'utf8');
const anchor = '/* Tablet portrait internal rail authority.';
const start = css.indexOf(anchor);
const end = css.indexOf('@media (min-width: 761px) and (max-width: 1024px)', start);
assert.ok(start >= 0, 'internal tablet authority segment start must exist');
assert.ok(end > start, 'internal tablet authority segment end must follow its start');
const segment = css.slice(start, end);
assert.equal((segment.match(/--doke-rail-max:\s*572px;/g) || []).length, 1, 'internal tablet rail max must be exactly 572px');
assert.equal((segment.match(/--doke-header-height:\s*64px;/g) || []).length, 1, 'internal tablet header height must be exactly 64px');
assert.equal((segment.match(/--doke-rail-max:\s*560px;/g) || []).length, 0, 'legacy 560px rail must not remain in internal tablet segment');
assert.equal((segment.match(/--doke-header-height:\s*70px;/g) || []).length, 0, 'legacy 70px header must not remain in internal tablet segment');

const reportPath = path.join(root, 'reports/responsive-contract-test-report.json');
assert.ok(fs.existsSync(reportPath), 'responsive report must exist');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
assert.equal(report.summary.checks, 897, 'responsive checks must remain stable');
assert.equal(report.summary.failures, 25, 'responsive failures must reduce exactly 72 -> 25');
assert.equal(report.summary.skips, 276, 'responsive skips must remain stable');
assert.deepEqual(report.summary.failuresByPage, {
  'detalhe-anuncio.html': 4,
  'pedidos.html': 7,
  'notificacoes.html': 7,
  'carteira.html': 7,
}, 'only the proven residual page clusters may remain');

const failures = report.failures || [];
for (const page of ['ajuda.html', 'perfil.html', 'resultados.html', 'comunidade.html', 'mensagens.html']) {
  assert.equal(failures.filter(item => item.page === page).length, 0, `${page} must have zero residual failures`);
}
assert.equal(failures.filter(item => item.breakpoint === '608x926').length, 4, '608x926 must reduce exactly 51 -> 4');
assert.equal(failures.filter(item => item.breakpoint === '820x1180').length, 19, '820x1180 debt is out of scope and must remain 19');
console.log('[ux-resp-debt-004] shared internal tablet rail/header parity proof passed');
