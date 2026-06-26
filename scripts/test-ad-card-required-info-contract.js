#!/usr/bin/env node
/*
 * Ad-card required information contract.
 * The service/ad card must not lose category, rating, tags, location, price or CTA
 * after late home/tablet CSS loads. Pages/patterns may own rails and gaps only.
 */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const adCard = read('assets/css/components/cards/ad-card.css');
const marketplace = read('assets/css/components/cards/marketplace-card-contract.css');
const stack = read('assets/css/patterns/marketplace-responsive-stack.css');
const mobileDistribution = read('assets/css/components/cards/mobile-card-distribution-contract.css');
const tabletSafari = read('assets/css/pages/home/tablet-safari-layout.css');
const home = read('assets/css/pages/home.css');
const homeRuntime = read('assets/css/pages/home-runtime.css');
const coreComponents = read('assets/css/core/components.css');
const indexHtml = read('index.html');
const homeFoundation = read('assets/css/pages/home-foundation.css');

assert(
  adCard.includes('Narrow tablet mandatory ad-card information contract'),
  'ad-card.css must document the narrow tablet required-information contract.'
);
assert(
  /@media \(min-width:\s*561px\) and \(max-width:\s*760px\)\s*{[\s\S]*?--doke-ad-card-min-height:\s*336px;[\s\S]*?--doke-ad-media-height-mobile:\s*124px;[\s\S]*?--doke-ad-body-min-height:\s*212px;/.test(adCard),
  'ad-card.css must set marketplace-card variables for the 561px-760px range so later !important contracts consume the same anatomy instead of changing it after first paint.'
);
assert(
  /\.doke-ad-card \.doke-ad-card__category\s*{[\s\S]*?display:\s*block;/.test(adCard),
  'The narrow tablet card must keep the category visible.'
);
assert(
  /\.doke-ad-card \.doke-ad-card__rating\s*{[\s\S]*?display:\s*inline-flex;/.test(adCard),
  'The narrow tablet card must keep the rating visible.'
);
assert(
  /\.doke-ad-card \.doke-ad-card__tags\s*{[\s\S]*?display:\s*flex;/.test(adCard),
  'The narrow tablet card must keep tags visible instead of hiding them to fake density.'
);

for (const [file, css] of [
  ['assets/css/components/cards/mobile-card-distribution-contract.css', mobileDistribution],
  ['assets/css/patterns/marketplace-responsive-stack.css', stack]
]) {
  assert(
    !/home-index-shell[\s\S]{0,260}doke-ad-card__tags[\s\S]{0,180}display:\s*none\s*!important/.test(css) && !/html body :is\(\.doke-ad-card[\s\S]{0,180}doke-ad-card__tags[\s\S]{0,180}display:\s*none\s*!important/.test(css),
    `${file} must not hide ad-card tags; tags are mandatory information owned by the component.`
  );
}

assert(
  tabletSafari.includes('--doke-ad-card-min-height: 336px;') && tabletSafari.includes('--doke-ad-body-min-height: 212px;'),
  'tablet-safari-layout.css must feed the same minimum card/body heights into the shared marketplace contract on real iPad Safari.'
);
assert(
  marketplace.includes('height: var(--doke-ad-body-height, auto)') && marketplace.includes('overflow: var(--doke-ad-body-overflow, visible)'),
  'marketplace-card-contract.css must keep consuming variables instead of hardcoding a hidden/clipped body.'
);
assert(
  /ad-card\.css\?v=[^\"')]+/.test(coreComponents) &&
  /ad-card\.css\?v=[^\"')]+/.test(homeRuntime) &&
  /home-runtime\.css\?v=[^\"')]+/.test(home) &&
  /home\.css\?v=[^\"')]+/.test(homeFoundation) &&
  /home-foundation\.css\?v=[^\"']+/.test(indexHtml),
  'index/home/core must reference cache-busted card/home contracts without blocking newer card contracts.'
);

if (failures.length) {
  console.error('Ad-card required information contract failed:\n');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Ad-card required information contract passed.');
