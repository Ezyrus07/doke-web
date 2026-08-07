#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const html = read('index.html');
const home = read('assets/js/pages/home.js');

const stateScript = 'assets/js/pages/home/rail-scroll-state.js?v=20260807-ux-home-003-v1';
const controllerScript = 'assets/js/pages/home/rail-scroll-controller.js?v=20260807-ux-home-003-v1';
const homeScript = 'assets/js/pages/home.js?v=20260719-onboarding-no-flash-v1';

assert.equal((html.match(/data-catégory-track/g) || []).length, 1, 'Home must preserve exactly one Category scroll track.');
assert.equal((html.match(/data-catégory-arrow="prev"/g) || []).length, 1, 'Home must preserve one previous Category arrow.');
assert.equal((html.match(/data-catégory-arrow="next"/g) || []).length, 1, 'Home must preserve one next Category arrow.');
assert.equal((html.match(/data-rail-arrow/g) || []).length, 0, 'UX-HOME-003 must not invent generic rail arrows.');

assert.equal((html.match(new RegExp(stateScript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1);
assert.equal((html.match(new RegExp(controllerScript.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1);

const stateIndex = html.indexOf(stateScript);
const controllerIndex = html.indexOf(controllerScript);
const homeIndex = html.indexOf(homeScript);
assert(stateIndex >= 0, 'Pure rail state script must be present.');
assert(controllerIndex >= 0, 'Rail DOM controller script must be present.');
assert(homeIndex >= 0, 'Home runtime script must be present.');
assert(stateIndex < controllerIndex, 'Pure rail state must load before the DOM controller.');
assert(controllerIndex < homeIndex, 'Rail controller must load before home.js consumes it.');

assert.equal((home.match(/DokeHomeRailScroll\?\.create\(\{ signal \}\)/g) || []).length, 1, 'Home must compose exactly one route-scoped rail controller.');
assert.equal((home.match(/initHomeRailScroll\(\);/g) || []).length, 1, 'Home must initialize the rail controller exactly once per route lifecycle.');

for (const legacy of ['bindScrollRail', '[data-rail-arrow]', 'catégoryTrack', 'catégoryArrows', 'railArrows']) {
  assert.equal(home.includes(legacy), false, `Legacy rail authority must be removed from home.js: ${legacy}`);
}

assert.equal(home.includes('track.clientWidth * amountFactor'), false, 'Viewport-percentage scrolling must no longer be a Home authority.');

console.log('ux-home-003-integration-contract: ok');
console.log('- canonical script order, Category-only arrows, route lifecycle and legacy authority removal validated');
