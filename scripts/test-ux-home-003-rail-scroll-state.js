#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const modulePath = require.resolve('../assets/js/pages/home/rail-scroll-state.js');
delete require.cache[modulePath];
global.window = { Doke: {} };
require(modulePath);

const api = global.window.Doke.homeRailScrollState;
assert(api, 'Home rail scroll state authority must be published.');

const { states } = api;

let snapshot = api.deriveOverflowState({ scrollLeft: 0, scrollWidth: 600, clientWidth: 600 });
assert.equal(snapshot.state, states.READY_FITS);
assert.equal(snapshot.hasOverflow, false);
assert.equal(snapshot.canScrollPrevious, false);
assert.equal(snapshot.canScrollNext, false);

snapshot = api.deriveOverflowState({ scrollLeft: 0, scrollWidth: 1000, clientWidth: 600 });
assert.equal(snapshot.state, states.READY_OVERFLOW_START);
assert.equal(snapshot.canScrollPrevious, false);
assert.equal(snapshot.canScrollNext, true);

snapshot = api.deriveOverflowState({ scrollLeft: 160, scrollWidth: 1000, clientWidth: 600 });
assert.equal(snapshot.state, states.READY_OVERFLOW_MIDDLE);
assert.equal(snapshot.canScrollPrevious, true);
assert.equal(snapshot.canScrollNext, true);

snapshot = api.deriveOverflowState({ scrollLeft: 399.4, scrollWidth: 1000, clientWidth: 600, epsilon: 1 });
assert.equal(snapshot.state, states.READY_OVERFLOW_END, 'Subpixel remainder within epsilon must count as the end boundary.');
assert.equal(snapshot.canScrollPrevious, true);
assert.equal(snapshot.canScrollNext, false);

snapshot = api.deriveOverflowState({ scrollLeft: -30, scrollWidth: 1000, clientWidth: 600 });
assert.equal(snapshot.metrics.scrollLeft, 0, 'Negative elastic scroll must clamp to the start boundary.');

snapshot = api.deriveOverflowState({ scrollLeft: 900, scrollWidth: 1000, clientWidth: 600 });
assert.equal(snapshot.metrics.scrollLeft, 400, 'Elastic overscroll must clamp to maxScroll.');
assert.equal(snapshot.state, states.READY_OVERFLOW_END);

snapshot = api.deriveOverflowState({ scrollLeft: 0, scrollWidth: 600.7, clientWidth: 600, epsilon: 1 });
assert.equal(snapshot.state, states.READY_FITS, 'Subpixel width noise within epsilon must not fabricate overflow.');

assert.equal(api.deriveItemStep({ firstOffset: 10, secondOffset: 226, itemWidth: 200, gap: 16 }), 216, 'Adjacent item offsets are the preferred complete-card step.');
assert.equal(api.deriveItemStep({ firstOffset: 10, secondOffset: 10, itemWidth: 200, gap: 16 }), 216, 'Item width + gap is the deterministic fallback when adjacent offsets are unavailable.');
assert.equal(api.deriveItemStep({ itemWidth: 0, gap: 16, fallbackStep: 180 }), 180, 'A positive explicit fallback is used only when item geometry is unavailable.');

assert.equal(api.resolveScrollBehavior(false), 'smooth');
assert.equal(api.resolveScrollBehavior(true), 'auto');

assert(Object.isFrozen(snapshot), 'Derived snapshots must be immutable.');
assert(Object.isFrozen(snapshot.metrics), 'Normalized metric snapshots must be immutable.');
assert(Object.isFrozen(api.states), 'State registry must be immutable.');

delete require.cache[modulePath];
delete global.window;

console.log('ux-home-003-rail-scroll-state: ok');
console.log('- overflow boundaries, subpixel epsilon, complete-card step and reduced motion validated');
