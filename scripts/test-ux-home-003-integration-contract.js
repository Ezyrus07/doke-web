#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const html = read('index.html');
const home = read('assets/js/pages/home.js');

const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1].split(/[?#]/, 1)[0]);
const count = (value) => scripts.filter((script) => script === value).length;

const statePath = 'assets/js/pages/home/rail-scroll-state.js';
const surfacePath = 'assets/js/pages/home/rail-scroll-surface.js';
const homePath = 'assets/js/pages/home.js';

assert.equal(count(statePath), 1, 'rail scroll state must load exactly once');
assert.equal(count(surfacePath), 1, 'rail scroll surface must load exactly once');
assert.equal(count(homePath), 1, 'home.js must load exactly once');
assert(scripts.indexOf(statePath) < scripts.indexOf(surfacePath), 'state authority must load before surface');
assert(scripts.indexOf(surfacePath) < scripts.indexOf(homePath), 'surface must load before DokeInitHome binds it');

assert.match(home, /homeRailScrollSurface\?\.bind\?\.\(\{ signal \}\);/, 'DokeInitHome must bind the rail surface to the route signal');
assert.equal(home.includes('const bindScrollRail'), false, 'legacy click-only rail authority must be removed');
assert.equal(home.includes('const catégoryArrows = document.querySelectorAll("[data-catégory-arrow]")'), false, 'home.js must not retain category arrow ownership');
assert.equal(home.includes('const railArrows = document.querySelectorAll("[data-rail-arrow]")'), false, 'home.js must not retain generic rail arrow ownership');

assert.equal((html.match(/data-catégory-track/g) || []).length, 1, 'Home must retain one canonical category track');
assert.equal((html.match(/data-catégory-arrow="prev"/g) || []).length, 1, 'Home must retain one previous category arrow');
assert.equal((html.match(/data-catégory-arrow="next"/g) || []).length, 1, 'Home must retain one next category arrow');

console.log('ux-home-003-integration-contract: ok');
console.log('- canonical script order, DokeInitHome binding and legacy authority removal validated');
