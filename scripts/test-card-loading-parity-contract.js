#!/usr/bin/env node
'use strict';
/*
 * Shared advertisement-card loading and anatomy contract.
 * Static guards protect ownership and media states; browser regression tests
 * separately verify pixel geometry and interactions at responsive widths.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => { if (!condition) failures.push(message); };

const adCardCss = read('assets/css/components/cards/ad-card.css');
const cardContractCss = read('assets/css/components/cards/marketplace-card-contract.css');
const adCardJs = read('assets/js/components/ad-card-interactions.js');
const renderer = read('assets/js/components/public-service-card.js');
const indexHtml = read('index.html');
const homeRuntime = read('assets/css/pages/home-runtime.css');
const homeRuntimeComponents = read('assets/css/pages/home-runtime-components.css');
const coreComponents = read('assets/css/core/components.css');

assert(
  /\.doke-ad-card--results\s*\{[^}]*--doke-ad-context-height:\s*71px;/.test(adCardCss),
  'results card must retain its shared identity/context anatomy'
);
assert(
  /@media\s*\(max-width:\s*760px\)\s*\{\s*\.doke-ad-card--results\s*\{[^}]*--doke-ad-media-margin:\s*0\s+9px\s+0\s*;/.test(adCardCss),
  'results media must stay within the compact card through the narrow-tablet breakpoint'
);
assert(
  /\.doke-ad-card__media\s*\{[^}]*overflow:\s*hidden;/.test(adCardCss) &&
  /\.doke-ad-card__media-note\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*7px;/.test(adCardCss),
  'media and empty-image note must retain their shared containment and positioning contracts'
);
assert(
  /--doke-ad-media-min-height:\s*max\(var\(--doke-ad-results-media-min-height/.test(adCardCss) &&
  /margin:\s*var\(--doke-ad-media-margin,\s*0\);/.test(cardContractCss) &&
  /min-height:\s*var\(--doke-ad-media-min-height/.test(cardContractCss),
  'the marketplace card contract must consume the media dimensions owned by the shared component'
);
const skeletonRule = adCardCss.match(/\.doke-ad-card\.is-media-skeleton\s+\.doke-ad-card__media::before\s*\{([^}]*)\}/);
assert(
  Boolean(skeletonRule) &&
  /content:\s*["']{2}\s*;/.test(skeletonRule[1]) &&
  /position:\s*absolute;/.test(skeletonRule[1]) &&
  /inset:\s*0;/.test(skeletonRule[1]) &&
  /pointer-events:\s*none;/.test(skeletonRule[1]),
  'media skeleton must be explicit, overlay-only, and must not intercept interactions'
);
assert(
  Boolean(skeletonRule) && !/(?:width|height|min-height|padding|margin|grid-template|flex-basis)\s*:/.test(skeletonRule[1]),
  'opt-in media skeleton must not change the media/card geometry'
);
assert(
  !/\.doke-ad-card:not\(\.is-media-ready\)\s+\.doke-ad-card__media::before/.test(adCardCss) &&
  !/\.doke-ad-card\.is-media-loading\s+\.doke-ad-card__media::before/.test(adCardCss),
  'background media must not receive an implicit loading overlay'
);
assert(
  adCardJs.includes('const hydrateAdCardMedia') && adCardJs.includes('static-background') &&
  adCardJs.includes('hydrateAdCardMedia(card);'),
  'ad-card hydration must retain its static media hook'
);
assert(
  !adCardJs.includes('new Image()') &&
  !/classList\.(?:add|toggle)\(\s*['"]is-media-loading/.test(adCardJs) &&
  !/classList\.(?:add|toggle)\(\s*['"]is-media-ready/.test(adCardJs),
  'card hydration must not preload static media or flip visual loading state after first paint'
);
assert(
  ['doke-ad-card__media', 'doke-ad-card__body', 'doke-ad-card__location',
    'doke-ad-card__footer', 'doke-ad-card__price', 'doke-ad-card__cta',
    'doke-ad-card__media-note'].every((cls) => renderer.includes(cls)) &&
  renderer.includes('doke-btn--success'),
  'canonical renderer must retain media, identity, location, footer, CTA and empty-media note'
);
assert(
  /ad-card-interactions\.js\?v=[^"']+/.test(indexHtml),
  'index.html must reference the cache-busted card interaction controller'
);
assert(
  /home-runtime-components\.css\?v=[^"')]+/.test(homeRuntime) &&
  /components\/cards\/ad-card\.css\?v=[^"')]+/.test(homeRuntimeComponents) &&
  /components\/cards\/ad-card\.css\?v=[^"')]+/.test(coreComponents),
  'home and core must load the cache-busted shared card through their current import chain'
);
for (const file of [
  'assets/css/pages/home.css',
  'assets/css/pages/home/mobile-hero-feed.css',
  'assets/css/patterns/marketplace-responsive-stack.css'
]) {
  const css = read(file);
  assert(
    !css.includes('is-media-loading') && !css.includes('is-media-ready') && !css.includes('is-media-skeleton'),
    file + ' must not own shared ad-card loading anatomy'
  );
}
if (failures.length) {
  console.error('Card loading parity contract failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Card loading parity contract passed.');
