#!/usr/bin/env node
/*
 * Doke card loading parity contract.
 * CSS-background advertisement cards must keep identical geometry and visible
 * anatomy between first paint and loaded state. A JS overlay must not cover the
 * media after the card has already rendered; explicit renderer skeletons are
 * allowed only through the opt-in is-media-skeleton state.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const failures = [];

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const adCardCss = read('assets/css/components/cards/ad-card.css');
const adCardJs = read('assets/js/components/ad-card-interactions.js');
const indexHtml = read('index.html');
const homeRuntime = read('assets/css/pages/home-runtime.css');
const coreComponents = read('assets/css/core/components.css');

assert(
  adCardCss.includes('Media loading parity for advertisement cards'),
  'ad-card.css must document and own the media loading parity contract.'
);
assert(
  adCardCss.includes('Tablet first-paint parity for advertisement cards'),
  'ad-card.css must document and own the tablet first-paint anatomy contract so late page CSS does not change the card after initial render.'
);
assert(
  adCardCss.includes('Narrow tablet mandatory ad-card information contract') &&
    /@media \(min-width:\s*561px\) and \(max-width:\s*760px\)\s*{[\s\S]*?--doke-ad-body-min-height:\s*212px;[\s\S]*?\.doke-ad-card \.doke-ad-card__tags\s*{[\s\S]*?display:\s*flex;/.test(adCardCss),
  'ad-card.css must keep mandatory category/rating/tags/location/footer visible in the narrow tablet first-paint and loaded state.'
);
assert(
  /\.doke-ad-card__media::before\s*{[\s\S]*position:\s*absolute;[\s\S]*inset:\s*0;[\s\S]*opacity:\s*0;/.test(adCardCss),
  'ad-card.css may keep an internal media placeholder layer, but it must be hidden by default inside the existing media box.'
);
assert(
  /\.doke-ad-card\.is-media-skeleton \.doke-ad-card__media::before\s*{[\s\S]*opacity:\s*1;/.test(adCardCss),
  'ad-card.css must expose skeleton media only through the explicit is-media-skeleton opt-in state.'
);
assert(
  !/\.doke-ad-card:not\(\.is-media-ready\) \.doke-ad-card__media::before/.test(adCardCss),
  'ad-card media must not show a skeleton merely because is-media-ready is absent; that causes the first tablet paint to differ from the loaded card.'
);
assert(
  !/\.doke-ad-card\.is-media-loading \.doke-ad-card__media::before/.test(adCardCss),
  'ad-card media must not use JS-driven is-media-loading as a visual overlay for CSS-background cards.'
);
assert(
  !/\.doke-ad-card(?:\.is-media-loading|:not\(\.is-media-ready\)|\.is-media-skeleton)\s*{[\s\S]*?(?:width|height|min-height|padding|margin|grid-template|flex-basis)\s*:/.test(adCardCss),
  'loading/skeleton classes must not change the outer ad-card geometry.'
);
assert(
  adCardJs.includes('const hydrateAdCardMedia') && adCardJs.includes("static-background"),
  'ad-card-interactions.js must mark CSS-background media as static without creating a visual loading overlay.'
);
assert(
  !adCardJs.includes('new Image()') && !/classList\.(?:add|toggle)\(\s*['\"]is-media-loading/.test(adCardJs) && !/classList\.(?:add|toggle)\(\s*['\"]is-media-ready/.test(adCardJs),
  'ad-card interactions must not preload CSS background images and toggle visual loading classes after first paint.'
);
assert(
  adCardJs.includes('hydrateAdCardMedia(card);'),
  'ad-card hydration must keep a media-state hook for future data-rendered cards.'
);
assert(
  indexHtml.includes('ad-card-interactions.js?v=20260608-card-info-parity-v2'),
  'index.html must reference the cache-busted ad-card interactions controller.'
);
assert(
  homeRuntime.includes('components/cards/ad-card.css?v=20260608-card-info-parity-v2'),
  'home-runtime.css must import the cache-busted canonical ad-card component.'
);
assert(
  coreComponents.includes('components/cards/ad-card.css?v=20260608-card-info-parity-v2'),
  'core/components.css must import the cache-busted canonical ad-card component.'
);

const scannedCss = [
  'assets/css/pages/home.css',
  'assets/css/pages/home/tablet-responsive-layout.css',
  'assets/css/pages/home/mobile-hero-feed.css',
  'assets/css/patterns/marketplace-responsive-stack.css'
];

for (const file of scannedCss) {
  const css = read(file);
  assert(
    !css.includes('is-media-loading') && !css.includes('is-media-ready') && !css.includes('is-media-skeleton'),
    `${file} must not own ad-card loading state anatomy; keep it in components/cards/ad-card.css.`
  );
}

if (failures.length) {
  console.error('Card loading parity contract failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Card loading parity contract passed.');
