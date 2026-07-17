#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const shared = read('assets/css/components/states/component-loading-contract.css');
if (!/html\s+\.doke-page-hydration-skeleton\[hidden\]\s*\{\s*display:\s*none;\s*\}/m.test(shared)) {
  failures.push('Shared hydration skeleton hidden rule must have enough specificity to beat page-local display declarations.');
}
if (/:where\(\.doke-page-hydration-skeleton\)\[hidden\]/.test(shared)) {
  failures.push('Zero-specificity hidden rule remains active for shared hydration skeletons.');
}

const results = read('assets/css/pages/results/page-hydration-states.css');
if (!/\.results-hydration-skeleton:not\(\[hidden\]\)\s*\{[^}]*display:\s*grid;/s.test(results)) {
  failures.push('Results root skeleton must only opt into grid while it is not hidden.');
}
if (/\.results-hydration-skeleton\s*\{[^}]*display:\s*grid;/s.test(results)) {
  failures.push('Results contains an unconditional root skeleton display rule.');
}

const community = read('assets/css/pages/comunidade-foundation.css');
if (!/\[data-community-hydration-skeleton\]:not\(\[hidden\]\)\s*\{\s*display:\s*grid;/s.test(community)) {
  failures.push('Community mobile skeleton must respect the native hidden attribute.');
}

const protectedFiles = [
  'assets/css/pages/carteira.css',
  'assets/css/pages/pagamento-profissional.css',
  'assets/css/pages/detalhe-anuncio/page-hydration-states.css'
];
for (const file of protectedFiles) {
  const css = read(file);
  const rootDisplay = css.match(/(?:^|\n)[^\n{]*(?:wallet|payment|detail)-hydration-skeleton(?!__)[^\{]*\{[^}]*display:\s*grid;/g) || [];
  if (rootDisplay.some((rule) => !rule.includes(':not([hidden])'))) {
    failures.push(`${file} contains an unconditional root hydration skeleton display rule.`);
  }
}

if (failures.length) {
  console.error('Loader visibility safety contract: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Loader visibility safety contract: PASS');
console.log('- shared hidden authority is cascade-safe');
console.log('- results, community, wallet, payment and detail root skeletons respect hidden');
