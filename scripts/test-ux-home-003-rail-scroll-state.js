#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const events = [];
const documentStub = {
  dispatchEvent(event) {
    events.push(event);
    return true;
  }
};

class CustomEventStub {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

global.window = {
  Doke: {},
  document: documentStub,
  CustomEvent: CustomEventStub
};
global.document = documentStub;
global.CustomEvent = CustomEventStub;

const modulePath = require.resolve('../assets/js/pages/home/rail-scroll-state.js');
delete require.cache[modulePath];
require(modulePath);

const api = global.window.Doke.homeRailScrollState;
assert(api, 'rail scroll state authority must be published');
assert.equal(api.contract, 'home-rail-scroll-state-v1');

let snapshot = api.derive({ scrollLeft: 0, clientWidth: 600, scrollWidth: 600 });
assert.equal(snapshot.overflow, false);
assert.equal(snapshot.atStart, true);
assert.equal(snapshot.atEnd, true);
assert.equal(snapshot.canPrevious, false);
assert.equal(snapshot.canNext, false);
assert.equal(snapshot.maxScroll, 0);

snapshot = api.derive({ scrollLeft: 0, clientWidth: 600, scrollWidth: 1400 });
assert.equal(snapshot.overflow, true);
assert.equal(snapshot.atStart, true);
assert.equal(snapshot.atEnd, false);
assert.equal(snapshot.canPrevious, false);
assert.equal(snapshot.canNext, true);
assert.equal(snapshot.maxScroll, 800);

snapshot = api.derive({ scrollLeft: 310, clientWidth: 600, scrollWidth: 1400 });
assert.equal(snapshot.atStart, false);
assert.equal(snapshot.atEnd, false);
assert.equal(snapshot.canPrevious, true);
assert.equal(snapshot.canNext, true);

snapshot = api.derive({ scrollLeft: 799, clientWidth: 600, scrollWidth: 1400, tolerance: 2 });
assert.equal(snapshot.atEnd, true, 'end tolerance must absorb subpixel scroll offsets');
assert.equal(snapshot.canNext, false);
assert.equal(snapshot.canPrevious, true);

snapshot = api.derive({ scrollLeft: -50, clientWidth: -1, scrollWidth: -2 });
assert.equal(snapshot.scrollLeft, 0);
assert.equal(snapshot.clientWidth, 0);
assert.equal(snapshot.scrollWidth, 0);
assert.equal(snapshot.maxScroll, 0);

assert.equal(api.resolveStep({ clientWidth: 200, amountFactor: 0.5 }), 220, 'minimum step must protect narrow rails');
assert.equal(api.resolveStep({ clientWidth: 1000, amountFactor: 0.82 }), 820);

let target = api.resolveTarget({
  scrollLeft: 0,
  clientWidth: 600,
  scrollWidth: 1400,
  direction: 'next',
  amountFactor: 0.82
});
assert.equal(target.step, 492);
assert.equal(target.target, 492);
assert.equal(target.delta, 492);

target = api.resolveTarget({
  scrollLeft: 700,
  clientWidth: 600,
  scrollWidth: 1400,
  direction: 'next',
  amountFactor: 0.82
});
assert.equal(target.target, 800, 'next target must clamp to max scroll');
assert.equal(target.delta, 100);

target = api.resolveTarget({
  scrollLeft: 100,
  clientWidth: 600,
  scrollWidth: 1400,
  direction: 'previous',
  amountFactor: 0.82
});
assert.equal(target.target, 0, 'previous target must clamp to zero');
assert.equal(target.delta, -100);

target = api.resolveTarget({
  scrollLeft: 300,
  clientWidth: 500,
  scrollWidth: 500,
  direction: 'next'
});
assert.equal(target.target, 0);
assert.equal(target.delta, 0);

for (const key of ['window', 'document', 'CustomEvent']) delete global[key];
delete require.cache[modulePath];

console.log('ux-home-003-rail-scroll-state: ok');
console.log('- zero overflow, start/middle/end, tolerance, proportional step and target clamps validated');
