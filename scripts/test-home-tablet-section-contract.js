#!/usr/bin/env node
/*
 * Guards the tablet home section density contract.
 * This is a static ownership test: component files may own card anatomy, while
 * home page CSS may own only carousel density, peek and section action layout.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function expectIncludes(file, needle, message) {
  const content = read(file);
  if (!content.includes(needle)) failures.push(`${file}: ${message}`);
}

expectIncludes(
  'assets/css/pages/home/tablet-responsive-layout.css',
  '--featured-tablet-card-preview',
  'featured tablet carousel must reserve a next-card preview.'
);
expectIncludes(
  'assets/css/pages/home/tablet-responsive-layout.css',
  '100% - var(--featured-tablet-card-gap) - var(--featured-tablet-card-preview)',
  'featured tablet card width must not consume exactly two full columns without peek.'
);
expectIncludes(
  'assets/css/pages/home.css',
  '--doke-home-publication-card-preview-tablet: clamp(52px, 8vw, 68px);',
  'publication tablet carousel must expose a readable next-card preview.'
);
expectIncludes(
  'assets/css/pages/home.css',
  'body.home-index-shell .more-services__load {\n  display: flex;\n  justify-content: center;\n  inline-size: 100%;',
  'more-services load action must center inside a full-width section footer.'
);
expectIncludes(
  'assets/css/components/cards/ad-card.css',
  'Canonical tablet density for announcement cards',
  'announcement card tablet density must live in the card component.'
);
expectIncludes(
  'assets/css/components/cards/ad-card.css',
  '@media (min-width: 561px) and (max-width: 1024px) {\n  .doke-ad-card {\n    flex: initial;',
  'tablet announcement cards must undo the mobile fixed-width contract from 561px upward.'
);
expectIncludes(
  'assets/css/components/cards/publication-card.css',
  'Canonical tablet density for publication cards',
  'publication card tablet density must live in the publication component.'
);
expectIncludes(
  'assets/css/components/cards/publication-card.css',
  '@media (min-width: 561px) and (max-width: 1024px) {\n  .publication-card {\n    min-height: 0;',
  'tablet publication cards must undo the mobile min-height from 561px upward.'
);
expectIncludes(
  'assets/css/components/cards/professional-showcase-card.css',
  '.professional-showcase .home-section-title',
  'professional section title must share the home title scale.'
);
expectIncludes(
  'assets/css/components/cards/professional-showcase-card.css',
  '--professional-showcase-card-size: clamp(218px, 41vw, 244px);',
  'professional carousel must keep two cards plus preview on tablet.'
);

if (failures.length) {
  console.error('Home tablet section contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Home tablet section contract passed.');
