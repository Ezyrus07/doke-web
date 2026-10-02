'use strict';

const assert = require('assert');

function legacyVisibilityKey(serviceId, before, after, versionId) {
  return ['service', serviceId, 'visibility', before, after, versionId || 'none'].join(':');
}

const serviceId = 'svc-1';
const version1 = 'ver-1';
assert.strictEqual(
  legacyVisibilityKey(serviceId, 'published', 'paused', version1),
  legacyVisibilityKey(serviceId, 'published', 'paused', version1),
  'same-version repeated pause demonstrates legacy key collision'
);
assert.strictEqual(
  legacyVisibilityKey(serviceId, 'paused', 'published', version1),
  legacyVisibilityKey(serviceId, 'paused', 'published', version1),
  'same-version repeated restore demonstrates legacy key collision'
);

function fold(rows, dataThrough) {
  const through = Date.parse(dataThrough);
  assert(Number.isFinite(through), 'dataThrough required');
  const ordered = [...rows].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const seen = new Set();
  let open = null;
  const intervals = [];

  for (const row of ordered) {
    assert(Number.isInteger(row.sequenceNo) && row.sequenceNo > 0, 'positive sequence required');
    assert(!seen.has(row.sequenceNo), 'sequence must be occurrence-unique per service');
    seen.add(row.sequenceNo);
    const at = Date.parse(row.occurredAt);
    assert(Number.isFinite(at), 'server occurrence timestamp required');

    if (!row.eligibleBefore && row.eligibleAfter) {
      assert(open === null, 'cannot open over an existing interval');
      open = { from: at, versionId: row.visibleVersionIdAfter, dimensions: row.dimensionSnapshotAfter || null };
      continue;
    }

    if (row.eligibleBefore && !row.eligibleAfter) {
      assert(open !== null, 'cannot close without open supply');
      intervals.push({ from: open.from, until: at, versionId: open.versionId, dimensions: open.dimensions });
      open = null;
      continue;
    }

    const visibleVersionChanged = row.eligibleBefore && row.eligibleAfter &&
      row.visibleVersionIdBefore !== row.visibleVersionIdAfter;
    const dimensionsChanged = row.eligibleBefore && row.eligibleAfter &&
      JSON.stringify(row.dimensionSnapshotBefore || null) !== JSON.stringify(row.dimensionSnapshotAfter || null);

    if (visibleVersionChanged || dimensionsChanged) {
      assert(open !== null, 'visible split requires open supply');
      intervals.push({ from: open.from, until: at, versionId: open.versionId, dimensions: open.dimensions });
      open = { from: at, versionId: row.visibleVersionIdAfter, dimensions: row.dimensionSnapshotAfter || null };
    }
  }

  if (open && open.from < through) {
    intervals.push({ from: open.from, until: through, versionId: open.versionId, dimensions: open.dimensions });
  }
  return intervals;
}

const rows = [
  { sequenceNo: 1, occurredAt: '2026-09-22T00:00:00Z', eligibleBefore: false, eligibleAfter: true, visibleVersionIdBefore: null, visibleVersionIdAfter: 'ver-1', dimensionSnapshotBefore: null, dimensionSnapshotAfter: { category: 'cat-a', state: 'BA' } },
  { sequenceNo: 2, occurredAt: '2026-09-22T00:10:00Z', eligibleBefore: true, eligibleAfter: false, visibleVersionIdBefore: 'ver-1', visibleVersionIdAfter: 'ver-1', dimensionSnapshotBefore: { category: 'cat-a', state: 'BA' }, dimensionSnapshotAfter: null },
  { sequenceNo: 3, occurredAt: '2026-09-22T00:20:00Z', eligibleBefore: false, eligibleAfter: true, visibleVersionIdBefore: 'ver-1', visibleVersionIdAfter: 'ver-1', dimensionSnapshotBefore: null, dimensionSnapshotAfter: { category: 'cat-a', state: 'BA' } },
  { sequenceNo: 4, occurredAt: '2026-09-22T00:30:00Z', eligibleBefore: true, eligibleAfter: false, visibleVersionIdBefore: 'ver-1', visibleVersionIdAfter: 'ver-1', dimensionSnapshotBefore: { category: 'cat-a', state: 'BA' }, dimensionSnapshotAfter: null },
  { sequenceNo: 5, occurredAt: '2026-09-22T00:40:00Z', eligibleBefore: false, eligibleAfter: true, visibleVersionIdBefore: 'ver-1', visibleVersionIdAfter: 'ver-1', dimensionSnapshotBefore: null, dimensionSnapshotAfter: { category: 'cat-a', state: 'BA' } },
  { sequenceNo: 6, occurredAt: '2026-09-22T00:50:00Z', eligibleBefore: true, eligibleAfter: true, visibleVersionIdBefore: 'ver-1', visibleVersionIdAfter: 'ver-2', dimensionSnapshotBefore: { category: 'cat-a', state: 'BA' }, dimensionSnapshotAfter: { category: 'cat-b', state: 'BA' } }
];

const intervals = fold(rows, '2026-09-22T01:00:00Z');
assert.strictEqual(intervals.length, 4, 'repeated lifecycle occurrences plus visible-version split must all survive replay');
assert.deepStrictEqual(intervals.map((item) => item.versionId), ['ver-1', 'ver-1', 'ver-1', 'ver-2']);
const totalSeconds = intervals.reduce((sum, item) => sum + (item.until - item.from) / 1000, 0);
assert.strictEqual(totalSeconds, 2400, 'expected 40 minutes of active supply');
assert.strictEqual(intervals[3].dimensions.category, 'cat-b', 'approved visible-version split must freeze new dimensions');

assert.throws(() => fold([
  rows[0],
  Object.assign({}, rows[1], { sequenceNo: 1 })
], '2026-09-22T01:00:00Z'), /sequence must be occurrence-unique/);

console.log('[CAT-A06] legacy state-tuple idempotency collision reproduced.');
console.log('[CAT-A06] occurrence-sequenced replay preserves repeated pause/reactivate cycles.');
console.log('[CAT-A06] visible-version changes split dimensions without creating a supply gap.');
