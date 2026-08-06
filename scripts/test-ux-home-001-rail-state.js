#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/pages/home/rail-state.js'), 'utf8');
const events = [];
const appliedListStates = [];

const document = {
  dispatchEvent(event) {
    events.push(event);
    return true;
  }
};

const window = {
  Doke: {
    listState: {
      setListState(region, state) {
        appliedListStates.push(state);
        region.dataset.state = state;
        return state;
      }
    }
  }
};

const context = {
  window,
  document,
  CustomEvent: function CustomEvent(type, options) {
    this.type = type;
    this.detail = options && options.detail;
  },
  Map,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Error,
  Math
};

vm.createContext(context);
vm.runInContext(source, context, { filename: 'rail-state.js' });

const api = window.Doke.homeRailState;
assert(api, 'home rail state authority must be published');
assert.equal(api.contract, 'home-rail-state-v1');
assert(Object.isFrozen(api));
assert(Object.isFrozen(api.rails));
assert(Object.isFrozen(api.dataStates));

const emptyCollections = api.deriveServiceCollections([]);
assert.equal(emptyCollections.totalCount, 0);
assert.equal(emptyCollections.featuredCount, 0);
assert.equal(emptyCollections.moreCount, 0);

const sixCollections = api.deriveServiceCollections([1, 2, 3, 4, 5, 6]);
assert.equal(sixCollections.featuredCount, 6);
assert.equal(sixCollections.moreCount, 0);
assert.deepEqual(Array.from(sixCollections.more), []);

const sevenCollections = api.deriveServiceCollections([1, 2, 3, 4, 5, 6, 7]);
assert.equal(sevenCollections.featuredCount, 6);
assert.equal(sevenCollections.moreCount, 1);
assert.deepEqual(Array.from(sevenCollections.more), [7]);

assert.throws(
  () => api.createSnapshot({ id: 'featured-services', dataState: 'empty', errorCode: 'NETWORK' }),
  (error) => error && error.code === 'DOKE_HOME_RAIL_ERROR_AS_EMPTY',
  'technical failure must never be represented as empty'
);

assert.throws(
  () => api.createSnapshot({ id: 'featured-services', dataState: 'empty', itemCount: 1 }),
  (error) => error && error.code === 'DOKE_HOME_RAIL_EMPTY_WITH_ITEMS',
  'non-empty rail must never publish empty'
);

const controller = api.createController();
assert.equal(controller.favoritesVisibility(false), 'hidden-anonymous');
assert.equal(controller.favoritesVisibility(true), 'visible');

const first = controller.begin('featured-services');
assert.equal(controller.get('featured-services').dataState, 'loading');
const accepted = controller.commit(first, { itemCount: 6 });
assert.equal(accepted.dataState, 'ready');
assert.equal(accepted.freshnessState, 'fresh');
assert.equal(accepted.itemCount, 6);
assert(Object.isFrozen(accepted));

const refresh = controller.begin('featured-services');
const refreshing = controller.get('featured-services');
assert.equal(refreshing.dataState, 'ready');
assert.equal(refreshing.freshnessState, 'refreshing');
assert.equal(refreshing.itemCount, 6);
assert.equal(refreshing.preserveContent, true);

const stale = controller.fail(refresh, 'transport message with private detail', { preserveContent: true });
assert.equal(stale.dataState, 'ready');
assert.equal(stale.freshnessState, 'stale');
assert.equal(stale.itemCount, 6);
assert.equal(stale.errorCode, 'TRANSPORTMESSAGEWITHPRIVATEDETAIL');

const oldReceipt = controller.begin('more-services');
const currentReceipt = controller.begin('more-services');
assert.equal(controller.commit(oldReceipt, { itemCount: 4 }), null, 'stale generation must be rejected');
const current = controller.commit(currentReceipt, {
  itemCount: 0,
  dataState: 'empty',
  visibilityState: 'hidden-insufficient-items'
});
assert.equal(current.visibilityState, 'hidden-insufficient-items');

const editorialReceipt = controller.begin('workers');
const editorial = controller.commit(editorialReceipt, { itemCount: 6 });
assert.equal(editorial.authority, 'editorial-local');
assert.equal(editorial.dataState, 'ready');

const favoriteHidden = controller.hide('favorites', 'hidden-anonymous');
assert.equal(favoriteHidden.authority, 'personalized-remote');
assert.equal(favoriteHidden.visibilityState, 'hidden-anonymous');

const region = {
  dataset: {},
  hidden: false,
  attributes: new Map(),
  setAttribute(name, value) { this.attributes.set(name, String(value)); },
  removeAttribute(name) { this.attributes.delete(name); }
};
controller.apply(region, stale);
assert.equal(region.dataset.homeRail, 'featured-services');
assert.equal(region.dataset.homeRailAuthority, 'canonical-remote');
assert.equal(region.dataset.homeRailFreshnessState, 'stale');
assert.equal(region.dataset.homeRailItemCount, '6');
assert.equal(region.attributes.get('aria-busy'), 'false');
assert.equal(appliedListStates.at(-1), 'ready', 'stale content must remain visible');

const hiddenRegion = {
  dataset: {},
  hidden: false,
  attributes: new Map(),
  setAttribute(name, value) { this.attributes.set(name, String(value)); },
  removeAttribute(name) { this.attributes.delete(name); }
};
controller.apply(hiddenRegion, favoriteHidden);
assert.equal(hiddenRegion.hidden, true);
assert.equal(hiddenRegion.attributes.get('aria-hidden'), 'true');

const stateEvents = events.filter((event) => event.type === 'doke:home-rail-state-change');
assert(stateEvents.length >= 1, 'state transitions must emit sanitized diagnostics');
for (const event of stateEvents) {
  const keys = Object.keys(event.detail).sort();
  assert.deepEqual(keys, [
    'authority',
    'contract',
    'dataState',
    'errorCode',
    'freshnessState',
    'generation',
    'id',
    'itemCount',
    'visibilityState'
  ]);
  assert(!Object.hasOwn(event.detail, 'favoriteIds'));
  assert(!Object.hasOwn(event.detail, 'error'));
  assert(!Object.hasOwn(event.detail, 'message'));
}

console.log('ux-home-001-rail-state: ok');
console.log('- immutable snapshots, independent counts, stale preservation, latest-generation and sanitized events validated');
