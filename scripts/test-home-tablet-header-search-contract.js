#!/usr/bin/env node
const fs = require('fs');

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function fail(message) {
  console.error(`Home tablet header/search contract: FAIL\n- ${message}`);
  process.exit(1);
}

function mediaBlock(css, query) {
  const start = css.indexOf(query);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  return '';
}

const responsive = read('assets/css/pages/home-refresh/responsive.css');
const searchChrome = read('assets/css/pages/home-search-chrome.css');
const searchBar = read('assets/css/components/search/search-bar.css');
const header = read('assets/css/layout/header.css');
const legacyNavigationSearch = read('assets/css/components/navigation/search-bar.css');
const mobileAlignment = read('assets/css/pages/home/mobile-alignment.css');

const compactTablet = mediaBlock(responsive, '@media (min-width: 561px) and (max-width: 760px)');
if (!compactTablet) fail('compact-tablet media block is missing from home-refresh/responsive.css.');
if (/body\.home-index-shell\s+\.home-side-meta\s*,/.test(compactTablet) || /body\.home-index-shell\s+\.home-side-meta\s*\{\s*display:\s*none/.test(compactTablet)) {
  fail('compact-tablet block must not hide the active global header (.home-side-meta).');
}
if (/body\.home-index-shell\s+\.home-search-hero__button\s*,/.test(compactTablet) || /body\.home-index-shell\s+\.home-search-hero__button\s*\{\s*display:\s*none/.test(compactTablet)) {
  fail('compact-tablet block must keep the shared search submit button visible.');
}
if (!/padding-top:\s*8px;/.test(compactTablet)) {
  fail('compact-tablet content must not reserve a fake mobile header offset.');
}
if (!/--doke-compact-tablet-rail:\s*min\(560px,\s*calc\(100vw - 40px\)\);/.test(compactTablet)) {
  fail('compact-tablet rail must be capped at 560px with 20px minimum viewport gutters.');
}
if (!/--doke-page-rail:\s*var\(--doke-compact-tablet-rail\);/.test(compactTablet) || !/--doke-header-rail:\s*var\(--doke-compact-tablet-rail\);/.test(compactTablet)) {
  fail('compact-tablet header and content must share the same compact rail token.');
}
if (!/padding-inline:\s*0;/.test(compactTablet) || !/width:\s*var\(--doke-page-rail\)/.test(compactTablet)) {
  fail('compact-tablet content must share the same canonical rail as the header.');
}
if (!/home-search-hero__field\.doke-search-pill__field[\s\S]*padding:\s*var\(--doke-search-pill-padding-y\)/.test(compactTablet)) {
  fail('compact-tablet search field must consume the shared doke-search-pill toolbar anatomy.');
}
if (!/#short-videos-track\.short-videos__track[\s\S]*display:\s*flex/.test(compactTablet) || !/#short-videos-track\.short-videos__track[\s\S]*flex-flow:\s*row nowrap/.test(compactTablet)) {
  fail('compact-tablet workers must stay as a horizontal tablet rail, not the mobile 2x2 grid.');
}
if (!/#short-videos-track\.short-videos__track\s*>\s*\.doke-worker-card[\s\S]*flex:\s*0 0 clamp\(132px,\s*24vw,\s*150px\)/.test(compactTablet)) {
  fail('compact-tablet workers must use compact fixed-width media cards in the rail.');
}
if (!/home-search-hero__audio-button,[\s\S]*home-search-hero__filter-button[\s\S]*display:\s*none/.test(compactTablet)) {
  fail('compact-tablet search must not expose mobile-only audio/filter controls.');
}

if (!/@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*?--doke-search-pill-min-height/.test(searchChrome)) {
  fail('home-search-chrome mobile search anatomy must be scoped to max-width: 560px.');
}
if (!/@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*body\.home-index-shell\s+\.home-search-hero__form/.test(legacyNavigationSearch)) {
  fail('legacy navigation search contract must not apply mobile anatomy above 560px.');
}
if (/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*body\.home-index-shell\s+\.home-search-hero__form/.test(legacyNavigationSearch)) {
  fail('legacy navigation search contract still applies mobile anatomy to compact tablet.');
}
if (!/@media\s*\(min-width:\s*561px\)\s*\{\s*\.doke-search-pill--toolbar/.test(searchBar)) {
  fail('shared toolbar search pill must apply from 561px upward.');
}
if (!/\.app-header\s+\.home-side-meta__tablet-menu\s+svg/.test(header)) {
  fail('layout/header.css must style the tablet menu SVG icon.');
}
if (/@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*#short-videos-track[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(mobileAlignment)) {
  fail('mobile alignment must not force compact tablet workers into the mobile 2x2 grid.');
}
if (!/@media\s*\(max-width:\s*560px\)\s*\{[\s\S]*#short-videos-track[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(mobileAlignment)) {
  fail('mobile alignment must preserve the 2x2 workers grid only up to 560px.');
}
if (!/@media\s*\(min-width:\s*561px\)\s*and\s*\(max-width:\s*760px\)[\s\S]*body\[data-page="home"\]\.has-global-header\s+\.app-header\s+\.home-side-meta__location[\s\S]*display:\s*inline-flex/.test(header)) {
  fail('home compact-tablet header must show the location pill.');
}

console.log('Home tablet header/search contract: PASS');
