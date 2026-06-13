#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'assets/css/pages/home/mobile-layout.css',
  'assets/css/pages/home/mobile-composition.css',
  'assets/css/pages/home/mobile-alignment.css',
  'assets/css/pages/home/mobile/base.css',
];

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const layout = read(files[0]);
const composition = read(files[1]);
const alignment = read(files[2]);
const base = read(files[3]);

for (const [label, css] of [['mobile-layout', layout], ['mobile-composition', composition]]) {
  assert(/#?short-videos-track[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css) || /\.short-videos\s+\.short-videos__track[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css), `${label}: Workers mobile track must use a 2-column grid.`);
  assert(!/short-videos(?:[^{}]|\{[^{}]*\})*?short-videos__track\s*\{[^}]*display:\s*flex\s*!important/i.test(css), `${label}: Workers mobile track must not be forced into a horizontal flex rail.`);
  assert(!/short-videos(?:[^{}]|\{[^{}]*\})*?short-videos__track\s*\{[^}]*width:\s*max-content\s*!important/i.test(css), `${label}: Workers mobile track must not use max-content width.`);
  assert(/short-videos-track[^{}]*>\s*\.doke-worker-card:nth-child\(n \+ 5\)\s*\{[^}]*display:\s*none/i.test(css) || /short-videos[^{}]*short-videos__track[^{}]*>\s*\.doke-worker-card:nth-child\(n \+ 5\)\s*\{[^}]*display:\s*none/i.test(css), `${label}: Workers mobile must hide cards after the fourth item.`);
}

assert(/#short-videos-track\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(alignment), 'mobile-alignment: Workers axis contract must preserve the 2x2 grid.');
assert(/\.page__content\s*\{[\s\S]*?padding-bottom:\s*calc\(88px \+ env\(safe-area-inset-bottom, 0px\)\)/.test(base), 'mobile/base: page content must reserve bottom-nav safe area.');

if (failures.length) {
  console.error('Home mobile workers contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Home mobile workers contract: PASS');
