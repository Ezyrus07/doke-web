'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/components/states/component-loading-contract.css'), 'utf8');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(/<section class="home-search-hero doke-page-section" aria-label="Buscar serviços">/.test(html), 'Home search must render immediately without hydration-ready/hidden.');
expect(/<section class="home-catégories doke-page-section" aria-label="Categorias">/.test(html), 'Home categories must render immediately without hydration-ready/hidden.');
expect(!/<section class="home-search-hero[^>]*data-home-hydration-ready/.test(html), 'Static search must not be controlled by data hydration.');
expect(!/<section class="home-catégories[^>]*data-home-hydration-ready/.test(html), 'Static categories must not be controlled by data hydration.');
expect(/data-home-hydration-skeleton aria-label="Carregando conteúdo recomendado"/.test(html), 'Skeleton must describe remote recommended content, not the whole page.');
expect((html.match(/doke-page-hydration-skeleton__home-ad-card/g) || []).length === 8, 'Home skeleton must reserve four featured and four more-service ad-card slots.');
expect((html.match(/doke-page-hydration-skeleton__home-media-card/g) || []).length === 5, 'Home skeleton must reserve five vertical worker-card slots.');
expect((html.match(/doke-page-hydration-skeleton__home-publication-card/g) || []).length === 4, 'Home skeleton must reserve four publication-card slots.');
expect((html.match(/doke-page-hydration-skeleton__home-professional-card/g) || []).length === 4, 'Home skeleton must reserve four professional-card slots.');
expect((html.match(/doke-page-hydration-skeleton__home-chip(?:\"|\s)/g) || []).length === 5, 'More-services skeleton must reserve the filter-chip rail.');
expect(/data-home-skeleton-region="publications"/.test(html), 'Skeleton must include the publications region.');
expect(/data-home-skeleton-region="more-services"/.test(html), 'Skeleton must include the more-services region.');
expect(/data-home-skeleton-region="professionals"/.test(html), 'Skeleton must include the professionals region.');
expect(!/doke-page-hydration-skeleton__search-pill/.test(html), 'Home skeleton must not imitate the static search surface.');
expect(/home-grid--ads[\s\S]*grid-template-columns: repeat\(4/.test(css), 'Desktop ad skeleton grid must match the four-card rail density.');
expect(/home-media-card[\s\S]*aspect-ratio: 9 \/ 14/.test(css), 'Media skeleton must use the vertical worker-card proportion.');
expect(/home-grid--publications[\s\S]*grid-template-columns: repeat\(4/.test(css), 'Publication skeleton must match the four-card desktop rail.');
expect(/home-professional-card[\s\S]*min-block-size: 276px/.test(css), 'Professional skeleton must reserve the approved profile-card height.');
expect(/@media \(max-width: 760px\)[\s\S]*flex: 0 0 min\(84vw, 310px\)/.test(css), 'Mobile ad skeleton must behave as a horizontal rail, not a two-column grid.');

if (failures.length) {
  console.error('[home-skeleton-fidelity-contract] FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('[home-skeleton-fidelity-contract] OK');
