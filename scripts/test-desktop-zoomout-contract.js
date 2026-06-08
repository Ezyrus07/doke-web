#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const shared = read('assets/css/components/shell/shared-page-width-contract.css');
const rail = read('assets/css/components/shell/desktop-page-rail-authority.css');
const results = read('assets/css/pages/search-results.css');
const components = read('assets/css/core/components.css');

expect(
  !/width:\s*calc\(100vw\s*-\s*280px\s*-\s*96px\)\s*!important/.test(shared),
  'shared-page-width-contract.css must not use unbounded 1180px+ literal desktop rails.'
);
expect(
  !/max-width:\s*calc\(100vw\s*-\s*280px\s*-\s*96px\)\s*!important/.test(shared),
  'shared-page-width-contract.css must not use unbounded 1180px+ max rails.'
);
expect(
  !/width:\s*calc\(100vw\s*-\s*280px\s*-\s*clamp\(24px, 3vw, 48px\)\s*-\s*clamp\(24px, 3vw, 48px\)\)\s*!important/.test(shared),
  'shared-page-width-contract.css must not use unbounded 761px-1179px literal rails.'
);
expect(
  shared.includes('var(--doke-page-family-max') && shared.includes('min(calc(100vw - 280px - 96px), var(--doke-page-family-max'),
  'shared-page-width-contract.css must cap legacy literal fallbacks with --doke-page-family-max.'
);
expect(
  /body\[data-page="notificacoes"\]\s*\{\s*--doke-page-family-max:\s*1040px;\s*\}/s.test(shared),
  'notifications must have a bounded reading rail at zoom-out.'
);
expect(
  /body\[data-page="notificacoes"\]\s*\{\s*--doke-rail-max:\s*1040px;\s*\}/s.test(rail),
  'desktop rail authority must mirror notifications zoom-out cap.'
);
expect(
  /body:is\([\s\S]*\[data-page="home"\][\s\S]*\[data-page="resultados"\][\s\S]*\)\s*\{\s*--doke-rail-max:\s*1180px;/s.test(rail),
  'home/results/detail/profile desktop rail max must be bounded to the index-family zoom-out scale.'
);
expect(
  /@media \(min-width: 1180px\)[\s\S]*results-layout\[data-results-mode="services"\][\s\S]*repeat\(auto-fit, minmax\(min\(100%, var\(--doke-results-card-min\)\), 1fr\)\)/s.test(results),
  'search-results.css must use auto-fit services grid at zoom-out instead of stretched desktop columns.'
);
expect(
  components.includes('shared-page-width-contract.css?v=20260608-zoomout-contract-v1'),
  'core/components.css must import the zoom-out shared rail contract version.'
);
expect(
  components.includes('desktop-page-rail-authority.css?v=20260608-zoomout-contract-v1'),
  'core/components.css must import the zoom-out desktop rail authority version.'
);

if (failures.length) {
  console.error('Desktop zoom-out contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Desktop zoom-out contract OK');
