#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildObservation,
  classifySearchError,
  normalizeSearchError,
  observationContainsRawSearchData,
  requestDimensions,
  responseDimensions,
  statusForSearchError,
} from '../supabase/functions/search-public-services-v2/operations.mjs';

const requestId = '00000000-0000-4000-8000-000000000009';

const firstPageRequest = {
  query: 'pintor residencial',
  categories: ['pintura'],
  state: 'BA',
  city: 'Salvador',
  neighborhood: '',
  serviceMode: 'local',
  pageSize: 12,
};

const successResponse = {
  authority: 'public.search_public_services_v2',
  contractVersion: '2.0.0',
  ranking: {
    version: 'search-rank-v0',
    strategy: 'legacy_updated_at',
    asOf: '2026-07-29T01:00:00.000Z',
  },
  items: [{ id: 'service-1', title: 'Pintura residencial' }],
  page: {
    pageSize: 12,
    hasNext: false,
    rankingVersion: 'search-rank-v0',
    asOf: '2026-07-29T01:00:00.000Z',
    nextCursor: null,
  },
};

const dimensions = requestDimensions(firstPageRequest);
assert.deepEqual(dimensions, {
  cursorPresent: false,
  firstPage: true,
  pageSize: 12,
  queryPresent: true,
  categoryCount: 1,
  locationScope: 'city',
  serviceMode: 'local',
});

assert.deepEqual(responseDimensions(successResponse), {
  rankingVersion: 'search-rank-v0',
  rankingStrategy: 'legacy_updated_at',
  itemCount: 1,
  zeroResult: false,
  hasNext: false,
});

const successObservation = buildObservation({
  requestId,
  actorClass: 'anon',
  outcome: 'success',
  latencyMs: 42.1254,
  request: firstPageRequest,
  response: successResponse,
});
assert.equal(successObservation.outcome, 'success');
assert.equal(successObservation.errorClass, 'none');
assert.equal(successObservation.errorCode, null);
assert.equal(successObservation.rankingVersion, 'search-rank-v0');
assert.equal(successObservation.itemCount, 1);
assert.equal(successObservation.zeroResult, false);
assert.equal(observationContainsRawSearchData(successObservation), false, 'observation must not contain raw query, cursor, location, identity, IP or score');
assert.equal(JSON.stringify(successObservation).includes('pintor residencial'), false, 'raw query leaked into observation');
assert.equal(JSON.stringify(successObservation).includes('Salvador'), false, 'raw location leaked into observation');

const emptySuccess = buildObservation({
  requestId: '00000000-0000-4000-8000-000000000010',
  actorClass: 'authenticated',
  outcome: 'success',
  latencyMs: 85,
  request: firstPageRequest,
  response: { ...successResponse, items: [] },
});
assert.equal(emptySuccess.zeroResult, true, 'empty first page must be counted as zero result');

const continuationEmpty = buildObservation({
  requestId: '00000000-0000-4000-8000-000000000011',
  actorClass: 'anon',
  outcome: 'success',
  latencyMs: 65,
  request: { ...firstPageRequest, cursor: 'opaque-signed-cursor' },
  response: { ...successResponse, items: [] },
});
assert.equal(continuationEmpty.firstPage, false);
assert.equal(continuationEmpty.zeroResult, false, 'empty continuation page cannot inflate first-page zero-result rate');
assert.equal(JSON.stringify(continuationEmpty).includes('opaque-signed-cursor'), false, 'raw cursor leaked into observation');

const versionConflict = { message: 'Database error: DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT' };
assert.equal(normalizeSearchError(versionConflict), 'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT');
assert.equal(classifySearchError('DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT'), 'cursor_conflict');
assert.equal(statusForSearchError('DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT'), 409);
assert.equal(classifySearchError('DOKE_SEARCH_CURSOR_SIGNATURE_INVALID'), 'cursor_invalid');
assert.equal(statusForSearchError('DOKE_SEARCH_CURSOR_SIGNATURE_INVALID'), 400);
assert.equal(classifySearchError('DOKE_SEARCH_REQUEST_UNKNOWN_FIELD'), 'client');
assert.equal(statusForSearchError('DOKE_SEARCH_REQUEST_UNKNOWN_FIELD'), 400);
assert.equal(classifySearchError('DOKE_RATE_LIMITED'), 'rate_limit');
assert.equal(statusForSearchError('DOKE_RATE_LIMITED'), 429);
assert.equal(classifySearchError('DOKE_SEARCH_RANKING_STATE_INVALID'), 'server');
assert.equal(statusForSearchError('DOKE_SEARCH_RANKING_STATE_INVALID'), 503);
assert.equal(normalizeSearchError(new Error('unexpected failure')), 'DOKE_SEARCH_INTERNAL_ERROR');
assert.equal(statusForSearchError('DOKE_SEARCH_INTERNAL_ERROR'), 500);

const errorObservation = buildObservation({
  requestId: '00000000-0000-4000-8000-000000000012',
  actorClass: 'anon',
  outcome: 'error',
  latencyMs: 13,
  request: { ...firstPageRequest, cursor: 'tampered-cursor' },
  errorCode: 'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID',
});
assert.equal(errorObservation.errorClass, 'cursor_invalid');
assert.equal(errorObservation.itemCount, null);
assert.equal(errorObservation.zeroResult, false);
assert.equal(observationContainsRawSearchData(errorObservation), false);
assert.equal(JSON.stringify(errorObservation).includes('tampered-cursor'), false);

console.log('[SEARCH-A09] Search observability runtime: PASS');
console.log('[SEARCH-A09] Error classification, HTTP status mapping and zero-result semantics are deterministic.');
console.log('[SEARCH-A09] Observations contain dimensions only; raw query, cursor, location, identity, IP and ranking score are excluded.');
