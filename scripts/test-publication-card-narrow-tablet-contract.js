#!/usr/bin/env node
/* Contract: publication-card anatomy on narrow tablets must be owned by the component.
   Page/pattern CSS may control rail width/gap/overflow only. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const publication = read('assets/css/components/cards/publication-card.css');
const homeTablet = read('assets/css/pages/home/tablet-responsive-layout.css');
const marketplace = read('assets/css/patterns/marketplace-responsive-stack.css');
const mobileDistribution = read('assets/css/components/cards/mobile-card-distribution-contract.css');

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(
  publication.includes('--doke-publication-media-height-narrow-tablet'),
  'publication-card.css must define a narrow-tablet media-height token.'
);
expect(
  publication.includes('@media (min-width: 561px) and (max-width: 760px)') &&
    publication.includes('--doke-publication-padding-narrow-tablet'),
  'publication-card.css must own the 561px-760px publication anatomy contract.'
);
expect(
  homeTablet.includes('--doke-home-publication-card-width-narrow-tablet') &&
    homeTablet.includes('grid-auto-columns: var(--doke-home-publication-card-width-narrow-tablet)'),
  'home tablet publication rail must use a dedicated narrow-tablet publication rail width token in its page composition owner.'
);
expect(
  !/\.publication-card\s*\{[^}]*min-block-size:\s*330px\s*!important/s.test(marketplace),
  'marketplace-responsive-stack.css must not force publication-card min-block-size:330px.'
);
expect(
  !/\.publication-card\s+\.publication-card__media\s*\{[^}]*block-size:\s*164px\s*!important/s.test(marketplace),
  'marketplace-responsive-stack.css must not force publication media height with !important.'
);
expect(
  !/body\.home-index-shell\s+\.publication-card[^{}]*:is\(\.publication-card__media,\s*\.publication-card__comparison\)[^{}]*\{[^}]*150px\s*!important/s.test(mobileDistribution),
  'mobile-card-distribution-contract.css must not hardcode publication media at 150px.'
);
expect(
  !/body\.home-index-shell\s+\.publication-card\s+:is\(\.publication-card__content,\s*\.publication-card__body\)[^{}]*\{[^}]*padding:\s*15px\s+13px\s+14px\s*!important/s.test(mobileDistribution),
  'mobile-card-distribution-contract.css must not hardcode publication content padding.'
);

if (failures.length) {
  console.error('Publication card narrow-tablet contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Publication card narrow-tablet contract passed.');
