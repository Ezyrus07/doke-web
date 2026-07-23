#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  normalizeAction,
  normalizeLimit,
  normalizeModerationError,
  normalizeText,
  statusForModerationError,
} from '../supabase/functions/service-moderation-operations/operations.mjs';

assert.equal(normalizeAction(' APPROVE '), 'approve');
assert.equal(normalizeAction('request_changes'), 'request_changes');
assert.equal(normalizeAction('unknown'), 'list');
assert.equal(normalizeText('  texto   com   espaços  ', 18), 'texto com espaços');
assert.equal(normalizeLimit('250'), 100);
assert.equal(normalizeLimit('-10'), 1);
assert.equal(normalizeLimit('invalid'), 20);

assert.equal(
  normalizeModerationError({ message: 'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED' }),
  'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED'
);
assert.equal(normalizeModerationError({ code: 'SERVICE_VERSION_NOT_FOUND' }), 'SERVICE_VERSION_NOT_FOUND');
assert.equal(normalizeModerationError(new Error('unexpected')), 'DOKE_SERVICE_MODERATION_OPERATION_FAILED');
assert.equal(statusForModerationError('DOKE_SERVICE_MODERATION_AUTH_REQUIRED'), 401);
assert.equal(statusForModerationError('DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED'), 403);
assert.equal(statusForModerationError('SERVICE_VERSION_NOT_FOUND'), 404);
assert.equal(statusForModerationError('SERVICE_VERSION_NOT_PENDING'), 409);
assert.equal(statusForModerationError('REVIEW_REASON_INVALID'), 400);
assert.equal(statusForModerationError('DOKE_SERVICE_MODERATION_OPERATION_FAILED'), 500);

console.log('Service moderation operations runtime: PASS');
