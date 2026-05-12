#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'assets/css/components/cards/service-card.css');
const reportPath = path.join(root, 'docs/validation/global-cycle-21-service-card-avatar-ownership-report.json');

function fail(message, details = {}) {
  console.error(message);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exit(1);
}

if (!fs.existsSync(cssPath)) {
  fail('Missing assets/css/components/cards/service-card.css');
}

const css = fs.readFileSync(cssPath, 'utf8');
const match = css.match(/:is\(\.service-card,\s*\.service-card--feed,\s*\.service-card--result\)\s+\.service-card__avatar\s*\{([\s\S]*?)\}/);
if (!match) {
  fail('Missing compact service-card avatar ownership block.');
}

const block = match[1];
const required = [
  '--doke-service-card-avatar-size',
  'width: var(--doke-service-card-avatar-size)',
  'height: var(--doke-service-card-avatar-size)',
  'min-width: var(--doke-service-card-avatar-size)',
  'min-height: var(--doke-service-card-avatar-size)',
  'max-width: var(--doke-service-card-avatar-size)',
  'max-height: var(--doke-service-card-avatar-size)',
  'flex: 0 0 var(--doke-service-card-avatar-size)',
  'aspect-ratio: 1 / 1',
  'border-radius: 50%',
  'clip-path: circle(50% at 50% 50%)'
];

const missing = required.filter((needle) => !block.includes(needle));
const blockImportantCount = (block.match(/!important/g) || []).length;
const totalImportantCount = (css.match(/!important/g) || []).length;

if (blockImportantCount > 0) {
  fail('Compact service-card avatar block still uses !important.', { blockImportantCount, totalImportantCount });
}

if (missing.length) {
  fail('Compact service-card avatar block is missing required ownership declarations.', { missing, totalImportantCount });
}

const report = {
  ok: true,
  file: 'assets/css/components/cards/service-card.css',
  compactAvatarBlockImportantCount: blockImportantCount,
  totalImportantCount,
  notes: [
    'Avatar sizing for compact service-card contexts is now tokenized by --doke-service-card-avatar-size.',
    'The compact avatar selector keeps higher specificity than legacy .service-card__avatar rules without relying on !important.',
    'No shell, header, sidebar or page-level CSS is involved in this check.'
  ]
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('Service-card avatar ownership audit passed.');
