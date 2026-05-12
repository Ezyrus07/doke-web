#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'assets/css/components/cards/service-card.css');
const reportPath = path.join(root, 'docs/validation/global-cycle-22-service-card-overflow-ownership-report.json');

function fail(message, details = {}) {
  console.error(`Service-card overflow ownership audit failed: ${message}`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ ok: false, message, details }, null, 2));
  process.exit(1);
}

if (!fs.existsSync(target)) {
  fail('Missing service-card.css', { target });
}

const css = fs.readFileSync(target, 'utf8');
const importantOverflow = /:is\(\.service-card,\s*\.service-card--feed,\s*\.service-card--result\)\s*\{[^}]*overflow\s*:\s*hidden\s*!important/i;

if (importantOverflow.test(css)) {
  fail('The compact service-card overflow rule must not use !important.');
}

const hasBaseOverflow = /\.service-card\s*\{[^}]*overflow\s*:\s*hidden\s*;/i.test(css);
const hasCompactOverflow = /:is\(\.service-card,\s*\.service-card--feed,\s*\.service-card--result\)\s*\{[^}]*overflow\s*:\s*hidden\s*;/i.test(css);

if (!hasBaseOverflow || !hasCompactOverflow) {
  fail('Expected overflow hidden to remain in both base and compact service-card contracts.', {
    hasBaseOverflow,
    hasCompactOverflow,
  });
}

const importantCount = (css.match(/!important/g) || []).length;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
  ok: true,
  target: 'assets/css/components/cards/service-card.css',
  importantCount,
  removedRule: ':is(.service-card, .service-card--feed, .service-card--result) overflow: hidden !important',
  preservedRules: [
    '.service-card { overflow: hidden; }',
    ':is(.service-card, .service-card--feed, .service-card--result) { overflow: hidden; }'
  ]
}, null, 2));
console.log('Service-card overflow ownership audit passed.');
