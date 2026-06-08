const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const adCard = read('assets/css/components/cards/ad-card.css');
const index = read('index.html');
const coreComponents = read('assets/css/core/components.css');
const homeRuntime = read('assets/css/pages/home-runtime.css');

function expect(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

expect(adCard, /@media\s*\(min-width:\s*561px\)\s*and\s*\(max-width:\s*760px\)[\s\S]*section\.featured-services[\s\S]*--doke-ad-card-height:\s*302px/, 'Missing narrow-tablet first-paint card geometry in ad-card.css.');
expect(adCard, /\.doke-ad-card__media-image[\s\S]*position:\s*absolute[\s\S]*object-fit:\s*cover/, 'Missing canonical media image rule for first-paint card media.');
expect(adCard, /section\.featured-services[\s\S]*\.doke-ad-card__tags[\s\S]*display:\s*none/, 'Missing first-paint tag density parity for narrow tablet featured cards.');
expect(index, /rel="preload"\s+as="image"[\s\S]*photo-1562259949-e8e7689d7828/, 'Missing preload for first above-fold featured ad image.');
expect(index, /class="doke-ad-card__media-image"[\s\S]*loading="eager"[\s\S]*fetchpriority="high"/, 'Missing eager media image for above-fold featured ad cards.');
expect(coreComponents, /ad-card\.css\?v=20260608-card-first-paint-parity-v4/, 'core/components.css must import the current ad-card contract version.');
expect(homeRuntime, /ad-card\.css\?v=20260608-card-first-paint-parity-v4/, 'home-runtime.css must import the current ad-card contract version.');

const adCardJs = read('assets/js/components/ad-card-interactions.js');
if (/classList\.add\([^)]*is-media-(?:loading|ready)/.test(adCardJs)) {
  failures.push('ad-card-interactions.js must not add post-paint media loading classes.');
}

if (failures.length) {
  console.error('Card first-paint parity contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Card first-paint parity contract passed.');
