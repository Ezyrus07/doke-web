#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const pageRail = read('assets/css/layout/page-rail.css');
const railAuthority = read('assets/css/layout/page-rail-authority.css');
const legacyShared = read('assets/css/components/shell/shared-page-width-contract.css');
const legacyDesktop = read('assets/css/components/shell/desktop-page-rail-authority.css');
const results = read('assets/css/pages/search-results.css');
const coreIndex = read('assets/css/core/index.css');
const components = read('assets/css/core/components.css');

expect(
  !/width:\s*calc\(100vw\s*-\s*280px\s*-\s*96px\)\s*!important/.test(pageRail + railAuthority),
  'layout rail files must not use unbounded 1180px+ literal desktop rails.'
);
expect(
  !/max-width:\s*calc\(100vw\s*-\s*280px\s*-\s*96px\)\s*!important/.test(pageRail + railAuthority),
  'layout rail files must not use unbounded 1180px+ max rails.'
);
expect(
  /body\[data-page="notificacoes"\]\s*\{\s*--doke-rail-max:\s*1040px;\s*\}/s.test(railAuthority),
  'layout/page-rail-authority.css must mirror notifications zoom-out cap.'
);
expect(
  /body:is\([\s\S]*\[data-page="detalhe-anuncio"\][\s\S]*\[data-page="perfil"\][\s\S]*\[data-page="resultados"\][\s\S]*\)\s*\{\s*--doke-rail-max:\s*1180px;/s.test(railAuthority),
  'detail/profile/results desktop rail max must remain bounded to the index-family zoom-out scale.'
);
expect(
  /body\[data-page="home"\]\s*\{[\s\S]*--doke-rail-max:\s*1040px;[\s\S]*\}/s.test(railAuthority),
  'home desktop rail max must use the Visual Recovery compact product width.'
);
expect(
  /@media \(min-width: 1180px\)[\s\S]*results-layout\[data-results-mode="services"\][\s\S]*repeat\(auto-fit, minmax\(min\(100%, var\(--doke-results-card-min\)\), 1fr\)\)/s.test(results),
  'search-results.css must use auto-fit services grid at zoom-out instead of stretched desktop columns.'
);
expect(
  coreIndex.includes('../layout/page-rail-authority.css?v=20260610-stage66-layout-rail-authority'),
  'core/index.css must import the canonical layout rail authority after core components.'
);
expect(
  !components.includes('components/shell/shared-page-width-contract.css') &&
    !components.includes('components/shell/desktop-page-rail-authority.css') &&
    !components.includes('components/cards/mobile-card-distribution-contract.css'),
  'core/components.css must not import retired legacy authority paths.'
);
expect(
  /Canonical owner: assets\/css\/layout\/page-rail\.css/.test(legacyShared) &&
    /Canonical owner: assets\/css\/layout\/page-rail-authority\.css/.test(legacyDesktop),
  'retired legacy rail files must remain compatibility shims only.'
);

if (failures.length) {
  console.error('Desktop zoom-out contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Desktop zoom-out contract OK');
