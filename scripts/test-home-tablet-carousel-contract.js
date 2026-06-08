#!/usr/bin/env node
/*
 * Doke home tablet carousel contract guard.
 * Scope: index/home tablet composition only. The home tablet rail may define
 * carousel density/preview, but must not compress ad/publication cards into
 * four tiny columns or leave professional section headings outside the shared
 * section-title contract.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const tabletCssPath = path.join(root, 'assets/css/pages/home/tablet-responsive-layout.css');
const homeCssPath = path.join(root, 'assets/css/pages/home.css');
const tabletCss = fs.readFileSync(tabletCssPath, 'utf8');
const homeCss = fs.readFileSync(homeCssPath, 'utf8');

const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

function rejectPattern(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

requireIncludes(
  tabletCss,
  '--featured-tablet-card-preview',
  'Featured services tablet rail must reserve a visible next-card preview.'
);
requireIncludes(
  tabletCss,
  '--home-publication-tablet-preview',
  'Home publications tablet rail must reserve a visible next-card preview.'
);
requireIncludes(
  tabletCss,
  'section.professional-showcase',
  'Professional showcase must be part of the shared tablet section heading contract.'
);
requireIncludes(
  homeCss,
  '--doke-home-publication-card-width-tablet: clamp(248px',
  'Publication tablet width must keep a readable minimum instead of falling back to mobile/oversized variants.'
);

rejectPattern(
  tabletCss,
  /#featured-services-track\.service-grid[\s\S]{0,420}grid-auto-columns:\s*calc\(\(100%\s*-\s*var\(--featured-tablet-card-gap\)\)\s*\/\s*2\)\s*!important/,
  'Featured tablet rail must not use exact two-column width without preview reserve.'
);
rejectPattern(
  tabletCss,
  /#home-publications-track\.publication-grid[\s\S]{0,420}grid-auto-columns:\s*clamp\(272px,\s*43vw,\s*350px\)\s*!important/,
  'Publication tablet rail must not use the old 272px/43vw contract that removes preview consistency.'
);
rejectPattern(
  homeCss,
  /grid-auto-columns:\s*minmax\(248px,\s*78%\)/,
  'Home small-tablet carousel must not fall back to a single oversized 78% card.'
);
rejectPattern(
  homeCss,
  /grid-auto-columns:\s*minmax\(280px,\s*42%\)/,
  'Home tablet carousel must not use the old 42% card contract.'
);

if (failures.length) {
  console.error('Home tablet carousel contract failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Home tablet carousel contract passed.');
