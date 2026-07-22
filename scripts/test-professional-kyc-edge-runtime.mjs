#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  normalizeAction,
  normalizeKycError,
  normalizeLimit,
  normalizeText,
  statusForKycError,
} from '../supabase/functions/professional-verification-operations/operations.mjs';

assert.equal(normalizeAction('DETAIL'), 'detail');
assert.equal(normalizeAction('PREPARE_UPLOADS'), 'prepare_uploads');
assert.equal(normalizeAction('submit'), 'submit');
assert.equal(normalizeAction('unknown'), 'list');
assert.equal(normalizeLimit('999'), 200);
assert.equal(normalizeLimit('0'), 1);
assert.equal(normalizeLimit('bad'), 100);
assert.equal(normalizeText('  análise   segura  ', 30), 'análise segura');

assert.equal(normalizeKycError({ message: 'DOKE_KYC_REVIEWER_REQUIRED' }), 'DOKE_KYC_REVIEWER_REQUIRED');
assert.equal(normalizeKycError({ message: 'DOKE_KYC_UPLOAD_INTENT_EXPIRED' }), 'DOKE_KYC_UPLOAD_INTENT_EXPIRED');
assert.equal(normalizeKycError({ details: 'DOKE_KYC_ALREADY_CLAIMED' }), 'DOKE_KYC_ALREADY_CLAIMED');
assert.equal(normalizeKycError({ message: 'unknown database failure' }), 'DOKE_KYC_OPERATION_FAILED');

assert.equal(statusForKycError('DOKE_KYC_REVIEWER_AUTH_REQUIRED'), 401);
assert.equal(statusForKycError('DOKE_KYC_APPLICANT_AUTH_REQUIRED'), 401);
assert.equal(statusForKycError('DOKE_KYC_REVIEWER_REQUIRED'), 403);
assert.equal(statusForKycError('DOKE_KYC_VERIFICATION_NOT_FOUND'), 404);
assert.equal(statusForKycError('DOKE_KYC_ALREADY_CLAIMED'), 409);
assert.equal(statusForKycError('DOKE_KYC_UPLOAD_INTENT_EXPIRED'), 409);
assert.equal(statusForKycError('DOKE_KYC_DECISION_INVALID'), 400);
assert.equal(statusForKycError('DOKE_KYC_OPERATION_FAILED'), 500);

console.log('Professional KYC Edge runtime contract passed.');
