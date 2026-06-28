#!/usr/bin/env node
/*
 * Doke Critical Media First Paint Contract
 * Ensures card/media components do not depend only on CSS background images
 * for visible/static markup and that component CSS preserves the same geometry
 * between placeholder and final media.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const htmlFiles = [
  'index.html',
  'detalhe-anuncio.html'
];

for (const file of htmlFiles) {
  const html = read(file);
  const adMediaBlocks = html.match(/<div class="[^"]*doke-ad-card__media[^"]*">[\s\S]*?<\/div>/g) || [];
  adMediaBlocks.forEach((block, index) => {
    assert(
      block.includes('doke-ad-card__media-image'),
      `${file}: doke-ad-card media block #${index + 1} must include .doke-ad-card__media-image for first-paint media parity.`
    );
  });

  const publicationMediaBlocks = html.match(/<div class="[^"]*publication-card__media[^"]*">[\s\S]*?<\/div>/g) || [];
  publicationMediaBlocks
    .filter((block) => !block.includes('publication-card__comparison'))
    .forEach((block, index) => {
      assert(
        block.includes('publication-card__media-image'),
        `${file}: publication-card media block #${index + 1} must include .publication-card__media-image for first-paint media parity.`
      );
    });
}

const adCss = read('assets/css/components/cards/ad-card.css');
assert(adCss.includes('.doke-ad-card__media-image'), 'ad-card.css must own .doke-ad-card__media-image geometry.');
assert(/\.doke-ad-card__media-image[\s\S]*object-fit:\s*cover/.test(adCss), 'ad-card media images must use object-fit: cover.');
assert(/\.doke-ad-card__media::after[\s\S]*z-index:\s*1/.test(adCss), 'ad-card overlay must stay above image without changing geometry.');

const publicationCss = read('assets/css/components/cards/publication-card.css');
assert(publicationCss.includes('.publication-card__media-image'), 'publication-card.css must own .publication-card__media-image geometry.');
assert(/\.publication-card__media-image[\s\S]*object-fit:\s*cover/.test(publicationCss), 'publication-card media images must use object-fit: cover.');

const workerCss = read('assets/css/components/cards/worker-card.css');
assert(workerCss.includes('video-card__poster.doke-critical-media'), 'worker-card.css must support critical poster images for first paint.');

const serviceCss = read('assets/css/components/cards/service-card.css');
assert(serviceCss.includes('.service-card__media-image'), 'service-card.css must support real media images for rendered service cards.');

const dynamicFiles = [
  'assets/js/pages/search-results.js',
  'assets/js/renderers/service-card-renderer.js',
  'assets/js/pages/perfil.js',
  'assets/js/features/profile/profile-renderer.js'
];

for (const file of dynamicFiles) {
  const source = read(file);
  assert(
    source.includes('doke-critical-media') || source.includes('data-service-image'),
    `${file}: dynamic card renderer must emit a real media image or data-service-image.`
  );
}

if (failures.length) {
  console.error('Critical media first paint contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Critical media first paint contract passed.');
