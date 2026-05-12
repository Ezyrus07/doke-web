#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const htmlPath = path.join(ROOT, 'comunidade.html');
const controllerPath = path.join(ROOT, 'assets/js/pages/comunidade-data-controller.js');
const reportPath = path.join(ROOT, 'docs/validation/global-cycle-40-comunidade-data-controller-report.json');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
const html = read(htmlPath);
const controller = read(controllerPath);

assert(html.includes('data-page-key="comunidade"'), 'comunidade.html precisa declarar data-page-key="comunidade".', failures);
assert(html.includes('data-communities-page-root'), 'comunidade.html precisa de raiz data-communities-page-root.', failures);
assert(html.includes('data-community-continue-list'), 'comunidade.html precisa de hook para lista de comunidades continuadas.', failures);
assert(html.includes('data-community-grid'), 'comunidade.html precisa manter hook data-community-grid.', failures);
assert(html.includes('data-community-ranking'), 'comunidade.html precisa de hook para ranking de comunidades.', failures);
assert(html.includes('comunidade-data-controller.js'), 'comunidade.html precisa carregar comunidade-data-controller.js.', failures);
assert((html.match(/data-card-kind="community"/g) || []).length >= 6, 'cards de comunidade precisam de data-card-kind="community".', failures);
assert((html.match(/data-community-id="/g) || []).length >= 6, 'cards de comunidade precisam de data-community-id.', failures);

assert(controller.includes('Doke.communitiesDataController'), 'controller deve expor Doke.communitiesDataController.', failures);
assert(controller.includes('doke:communities-data-ready'), 'controller deve disparar doke:communities-data-ready.', failures);
assert(controller.includes('doke:communities-data-error'), 'controller deve disparar doke:communities-data-error.', failures);
assert(!/fetch\s*\(/.test(controller), 'controller não deve chamar fetch diretamente.', failures);
assert(!/localStorage|sessionStorage|firebase|supabase/i.test(controller), 'controller não deve acessar storage/backend diretamente.', failures);
assert(!/\.style\s*=|setAttribute\(\s*['"]style['"]/.test(controller), 'controller não deve aplicar estilo inline.', failures);

const report = {
  cycle: 'global-cycle-40-comunidade-data-controller',
  html: 'comunidade.html',
  controller: 'assets/js/pages/comunidade-data-controller.js',
  failures,
  passed: failures.length === 0,
  checkedAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

if (failures.length) {
  console.error('Comunidade data controller audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Comunidade data controller audit passed.');
