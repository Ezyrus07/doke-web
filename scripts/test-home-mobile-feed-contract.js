#!/usr/bin/env node
const fs = require('fs');

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(file, 'utf8');

const horizontalRail = read('assets/css/patterns/horizontal-rail.css');
const homeSections = read('assets/css/pages/home-sections.css');
const mobileBase = read('assets/css/pages/home/mobile/base.css');
const mobileHeroFeed = read('assets/css/pages/home/mobile-hero-feed.css');
const adCard = read('assets/css/components/cards/ad-card.css');
const indexHtml = read('index.html');

assert(
  !/body\.home-index-shell\s+:is\([^)]*\.service-grid[^)]*#home-publications-track[^)]*\)\s*\{[\s\S]*?grid-auto-flow:\s*column/i.test(horizontalRail),
  'patterns/horizontal-rail.css must not turn every home .service-grid into a horizontal mobile rail.'
);

assert(
  /body\.home-index-shell\s+:is\(#featured-services-track,\s*#home-publications-track\)\s*\{[\s\S]*?grid-auto-flow:\s*column/i.test(horizontalRail),
  'patterns/horizontal-rail.css must scope the mobile horizontal rail to featured services and publications only.'
);

assert(
  /body\.home-index-shell \[data-more-services-grid\][\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/i.test(homeSections),
  'home-sections.css must keep the desktop more-services grid contract as the base owner.'
);


assert(
  /\.doke-ad-card:not\(\[hidden\]\)[\s\S]*?--doke-ad-card-mobile-width:\s*256px[\s\S]*?width:\s*var\(--doke-ad-card-mobile-width\)/i.test(adCard),
  'components/cards/ad-card.css must expose a mobile width token instead of hard-coding mobile card width.'
);

assert(
  /\.doke-ad-card__media\s*\{[\s\S]*?height:\s*var\(--doke-ad-media-height-mobile,\s*96px\)/i.test(adCard),
  'components/cards/ad-card.css must expose the mobile media height token for page feed density.'
);

assert(
  /section\.more-services \.service-grid\.service-grid--compact\[data-more-services-grid\][\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/i.test(mobileHeroFeed),
  'home/mobile-hero-feed.css must keep Mais anúncios as a one-column mobile list.'
);

assert(
  /section\.more-services \.doke-ad-card[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*clamp\(118px,\s*33vw,\s*132px\)\s*minmax\(0,\s*1fr\)[\s\S]*?section\.more-services \.doke-ad-card__avatar[\s\S]*?display:\s*none[\s\S]*?section\.more-services \.doke-ad-card__cta[\s\S]*?min-width:\s*116px/i.test(adCard),
  'components/cards/ad-card.css must own the horizontal mobile anatomy for Mais anúncios cards.'
);

assert(
  /\.doke-ad-card\.doke-ad-card--mobile-grid[\s\S]*?--doke-ad-media-height-mobile:\s*clamp\(82px,\s*23vw,\s*100px\)[\s\S]*?--doke-ad-title-font-size-mobile:\s*0\.74rem[\s\S]*?--doke-ad-cta-height:\s*27px/i.test(adCard),
  'components/cards/ad-card.css must own the compact 2-column mobile-grid density modifier for doke-ad-card.'
);

assert(
  /<section class="more-services[\s\S]*?<article class="doke-ad-card doke-ad-card--featured doke-ad-card--results"/i.test(indexHtml),
  'index.html more-services cards must opt into the shared results-card anatomy.'
);

assert(
  /\.page__content\s*\{[\s\S]*?padding-bottom:\s*0/i.test(mobileBase),
  'home mobile base must leave fixed bottom-nav clearance to the shell owner.'
);

if (failures.length) {
  console.error('Home mobile feed contract: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Home mobile feed contract: PASS');
