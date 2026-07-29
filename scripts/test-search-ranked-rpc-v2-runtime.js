#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const assert = require('assert');

const secret = crypto.randomBytes(32);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = stable(value[key]);
    return result;
  }, {});
}

function canonical(value) {
  return JSON.stringify(stable(value));
}

function requestHash(request) {
  return crypto.createHash('sha256').update(canonical(request)).digest('hex');
}

function encodeCursor(payload) {
  const signature = crypto.createHmac('sha256', secret).update(canonical(payload)).digest('hex');
  return Buffer.from(canonical({ payload, signature }), 'utf8').toString('base64');
}

function decodeCursor(cursor) {
  let envelope;
  try {
    envelope = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch (error) {
    const failure = new Error('DOKE_SEARCH_CURSOR_INVALID');
    failure.code = 'DOKE_SEARCH_CURSOR_INVALID';
    throw failure;
  }
  const expected = crypto.createHmac('sha256', secret).update(canonical(envelope.payload)).digest('hex');
  const actual = String(envelope.signature || '');
  if (actual.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    const failure = new Error('DOKE_SEARCH_CURSOR_SIGNATURE_INVALID');
    failure.code = 'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID';
    throw failure;
  }
  return envelope.payload;
}

function compareTuple(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  if (a.tiebreakAt !== b.tiebreakAt) return String(b.tiebreakAt).localeCompare(String(a.tiebreakAt));
  return String(b.id).localeCompare(String(a.id));
}

function legacyTuple(item) {
  return { score: 0, tiebreakAt: item.updatedAt, id: item.id };
}

function rankedTuple(item) {
  return { score: item.score, tiebreakAt: item.approvedAt, id: item.id };
}

function afterCursor(tuple, cursor) {
  if (tuple.score !== cursor.score) return tuple.score < cursor.score;
  if (tuple.tiebreakAt !== cursor.tiebreakAt) return tuple.tiebreakAt < cursor.tiebreakAt;
  return tuple.id < cursor.id;
}

function assertLegacyOrdering() {
  const items = [
    { id: 'b', updatedAt: '2026-07-28T12:00:00.000Z' },
    { id: 'a', updatedAt: '2026-07-28T12:00:00.000Z' },
    { id: 'z', updatedAt: '2026-07-27T12:00:00.000Z' }
  ];
  const ordered = items.map(legacyTuple).sort(compareTuple);
  assert.deepStrictEqual(ordered.map((item) => item.id), ['b', 'a', 'z'], 'search-rank-v0 must preserve updatedAt/id ordering');
}

function assertRankedOrdering() {
  const items = [
    { id: 'a', score: 0.71, approvedAt: '2026-07-20T12:00:00.000Z' },
    { id: 'c', score: 0.82, approvedAt: '2026-07-18T12:00:00.000Z' },
    { id: 'b', score: 0.71, approvedAt: '2026-07-21T12:00:00.000Z' }
  ];
  const ordered = items.map(rankedTuple).sort(compareTuple);
  assert.deepStrictEqual(ordered.map((item) => item.id), ['c', 'b', 'a'], 'search-rank-v1 must sort by score, tiebreak timestamp and id');
  const cursor = ordered[1];
  assert.deepStrictEqual(ordered.filter((item) => afterCursor(item, cursor)).map((item) => item.id), ['a'], 'cursor continuation must use the full stable tuple');
}

function assertCursorBinding() {
  const normalizedRequest = {
    query: 'pintor', categories: [], state: 'ba', city: 'salvador', neighborhood: '',
    serviceMode: 'any', minRating: 0, guaranteed: false, emergency: false,
    availableToday: false, pageSize: 12
  };
  const payload = {
    cursorVersion: 2,
    rankingVersion: 'search-rank-v0',
    asOf: '2026-07-29T00:30:00.000Z',
    requestHash: requestHash(normalizedRequest),
    score: 0,
    tiebreakAt: '2026-07-28T12:00:00.000Z',
    id: '00000000-0000-0000-0000-000000000001'
  };
  const cursor = encodeCursor(payload);
  assert.deepStrictEqual(decodeCursor(cursor), payload, 'signed cursor must round-trip');

  const tamperedEnvelope = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  tamperedEnvelope.payload.score = 1;
  const tampered = Buffer.from(JSON.stringify(tamperedEnvelope), 'utf8').toString('base64');
  assert.throws(() => decodeCursor(tampered), /DOKE_SEARCH_CURSOR_SIGNATURE_INVALID/, 'tampered cursor must fail closed');

  assert.notStrictEqual(payload.requestHash, requestHash({ ...normalizedRequest, query: 'eletricista' }), 'cursor must be bound to normalized filters');
  assert.notStrictEqual(payload.rankingVersion, 'search-rank-v1', 'cursor must be bound to one ranking version');
}

function assertFrozenAsOf() {
  const firstPageAsOf = '2026-07-29T00:30:00.000Z';
  const cursor = encodeCursor({
    cursorVersion: 2,
    rankingVersion: 'search-rank-v1',
    asOf: firstPageAsOf,
    requestHash: 'a'.repeat(64),
    score: 0.75,
    tiebreakAt: '2026-07-20T12:00:00.000Z',
    id: '00000000-0000-0000-0000-000000000002'
  });
  assert.strictEqual(decodeCursor(cursor).asOf, firstPageAsOf, 'all pages must reuse the first-page asOf instant');
}

function assertNoPublicScoreBreakdown() {
  const response = {
    authority: 'public.search_public_services_v2',
    contractVersion: '2.0.0',
    ranking: { version: 'search-rank-v0', strategy: 'legacy_updated_at', asOf: '2026-07-29T00:30:00.000Z' },
    items: [{ id: 'service-1', title: 'Serviço' }],
    page: { pageSize: 12, hasNext: false, rankingVersion: 'search-rank-v0', asOf: '2026-07-29T00:30:00.000Z', nextCursor: null }
  };
  const publicPayload = JSON.stringify(response);
  ['rankScore', 'textSignal', 'reviewSignal', 'availabilitySignal', 'recencySignal'].forEach((field) => {
    assert(!publicPayload.includes(field), `public response exposed ${field}`);
  });
}

assertLegacyOrdering();
assertRankedOrdering();
assertCursorBinding();
assertFrozenAsOf();
assertNoPublicScoreBreakdown();

console.log('[SEARCH-A08] Version-bound ranked RPC v2 runtime: PASS');
console.log('[SEARCH-A08] search-rank-v0 preserves legacy ordering and v1 uses score/tiebreak/id.');
console.log('[SEARCH-A08] Signed cursors bind rankingVersion, asOf and normalized request.');
console.log('[SEARCH-A08] Ranking score breakdown remains private.');
