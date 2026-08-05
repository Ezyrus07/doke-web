#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const modulePath = path.join(rootDir, 'assets/js/pages/search-filter-presentation.js');
const cssPath = path.join(rootDir, 'assets/css/pages/search-filter-presentation.css');
const htmlPath = path.join(rootDir, 'resultados.html');
const moduleSource = fs.readFileSync(modulePath, 'utf8');
const cssSource = fs.readFileSync(cssPath, 'utf8');
const htmlSource = fs.readFileSync(htmlPath, 'utf8');

function normalize(value = {}) {
  const searchType = ['services', 'users', 'workers', 'before-after'].includes(value.searchType)
    ? value.searchType
    : 'services';
  const categories = Object.freeze((Array.isArray(value.categories) ? value.categories : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean));
  return Object.freeze({
    searchType,
    categories,
    state: String(value.state || '').trim(),
    city: String(value.city || '').trim(),
    neighborhood: String(value.neighborhood || '').trim(),
    minRating: Number(value.minRating || 0) || 0,
    guaranteed: Boolean(value.guaranteed),
    emergency: Boolean(value.emergency),
    online: Boolean(value.online),
    availableToday: Boolean(value.availableToday)
  });
}

global.window = {
  Doke: {
    searchFilterState: Object.freeze({ normalize })
  }
};

delete require.cache[require.resolve(modulePath)];
require(modulePath);

const api = global.window.Doke.searchFilterPresentation;
assert(api, 'Doke.searchFilterPresentation must be published.');
assert.strictEqual(api.version, '20260805-ux-filters-002-v1');
assert.strictEqual(api.contract, 'search-filter-presentation-v1');
assert(Object.isFrozen(api));
assert(Object.isFrozen(api.groups));
assert(Object.isFrozen(api.labels));

const applied = normalize({
  searchType: 'services',
  categories: ['Limpeza', 'Pintura'],
  state: 'MG',
  city: 'Belo Horizonte',
  neighborhood: 'Centro',
  minRating: 4.8,
  guaranteed: true,
  emergency: true,
  online: true,
  availableToday: true
});

const presentation = api.buildPresentation(applied);
assert.strictEqual(presentation.total, 10);
assert.strictEqual(presentation.groupCount, 4);
assert.deepStrictEqual(
  Array.from(presentation.groups, (group) => group.id),
  ['category', 'location', 'quality', 'availability']
);
assert.strictEqual(presentation.chips.some((chip) => chip.key === 'searchType'), false);
assert.strictEqual(presentation.chips.find((chip) => chip.key === 'minRating').label, 'Nota mínima 4,8');
assert.strictEqual(presentation.groups.find((group) => group.id === 'category').count, 2);
assert(Object.isFrozen(presentation));
assert(Object.isFrozen(presentation.groups));
assert(Object.isFrozen(presentation.chips));

const oneCategoryRemoved = api.removeFromSnapshot(applied, 'categories', 'limpeza');
assert.deepStrictEqual(Array.from(oneCategoryRemoved.categories), ['Pintura']);
assert.strictEqual(oneCategoryRemoved.city, 'Belo Horizonte');

const stateRemoved = api.removeFromSnapshot(applied, 'state', 'MG');
assert.strictEqual(stateRemoved.state, '');
assert.strictEqual(stateRemoved.city, '');
assert.strictEqual(stateRemoved.neighborhood, '');

const cityRemoved = api.removeFromSnapshot(applied, 'city', 'Belo Horizonte');
assert.strictEqual(cityRemoved.state, 'MG');
assert.strictEqual(cityRemoved.city, '');
assert.strictEqual(cityRemoved.neighborhood, '');

const neighborhoodRemoved = api.removeFromSnapshot(applied, 'neighborhood', 'Centro');
assert.strictEqual(neighborhoodRemoved.state, 'MG');
assert.strictEqual(neighborhoodRemoved.city, 'Belo Horizonte');
assert.strictEqual(neighborhoodRemoved.neighborhood, '');

const ratingRemoved = api.removeFromSnapshot(applied, 'minRating', '4.8');
assert.strictEqual(ratingRemoved.minRating, 0);

const booleanRemoved = api.removeFromSnapshot(applied, 'online', '1');
assert.strictEqual(booleanRemoved.online, false);
assert.strictEqual(booleanRemoved.guaranteed, true);

assert(moduleSource.includes('state.commit()'), 'Chip removal must use the approved explicit commit authority.');
assert.strictEqual((moduleSource.match(/state\.commit\(\)/g) || []).length, 1, 'One chip removal path must produce one commit.');
assert(moduleSource.includes('if (snapshot.dirty') && moduleSource.includes('state.cancel()'), 'Pending drafts must be cancelled before external chip removal.');
assert(moduleSource.includes('MutationObserver') && moduleSource.includes('PRESENTATION_MARKER'), 'Presentation must recover after the legacy renderer rewrites the chip container.');
assert(moduleSource.includes("source: 'applied-chip'"));
assert(!moduleSource.includes("createElement('script')"));
assert(!moduleSource.includes('eval('));
assert(!moduleSource.includes('new Function'));
assert(!moduleSource.includes('locationValue'), 'Sanitized events must not publish raw location values.');

const cssLink = 'assets/css/pages/search-filter-presentation.css';
const scriptSrc = 'assets/js/pages/search-filter-presentation.js';
const searchDataSrc = 'assets/js/pages/search-data.js';
const searchResultsSrc = 'assets/js/pages/search-results.js';
assert(htmlSource.includes(cssLink), 'Resultados must load the static chip stylesheet.');
assert(htmlSource.includes(scriptSrc), 'Resultados must load the static chip authority.');
assert(htmlSource.indexOf(searchDataSrc) < htmlSource.indexOf(scriptSrc));
assert(htmlSource.indexOf(scriptSrc) < htmlSource.indexOf(searchResultsSrc));
assert(!cssSource.includes('!important'));
assert(!cssSource.includes('overflow-x: hidden'));
assert(cssSource.includes(':focus-visible'));
assert(cssSource.includes('forced-colors'));
assert(cssSource.includes('prefers-reduced-motion'));

console.log('UX-FILTERS-002 removable chip presentation contracts passed.');
